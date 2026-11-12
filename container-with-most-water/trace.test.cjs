"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createTrace, parseHeights } = require("./trace.js");

function bruteForce(heights, start = 0, end = heights.length - 1) {
  let best = 0;
  for (let l = start; l < end; l++) {
    for (let r = l + 1; r <= end; r++) {
      best = Math.max(best, (r - l) * Math.min(heights[l], heights[r]));
    }
  }
  return best;
}

test("经典示例、相等高度、零高度和展示上限", () => {
  for (const [heights, expected] of [
    [[1, 8, 6, 2, 5, 4, 8, 3, 7], 49],
    [[1, 1], 1], [[0, 0], 0], [[5, 1, 2, 5], 15],
    [Array(24).fill(10000), 230000]
  ]) {
    const { frames, rounds } = createTrace(heights);
    const final = frames.at(-1);
    assert.equal(final.best, expected);
    assert.equal(final.l, final.r);
    assert.equal(rounds.length, heights.length - 1);
    assert.equal(frames[final.bestFrame].phase, "record");
    const [l, r] = final.bestPair;
    assert.equal((r - l) * Math.min(heights[l], heights[r]), expected);
  }
});

test("穷举短数组：最终结果正确，每次排除后仍保留答案或已记录答案", () => {
  let count = 0;
  for (let length = 2; length <= 7; length++) {
    for (let mask = 0; mask < 4 ** length; mask++) {
      let remaining = mask;
      const heights = Array.from({ length }, () => {
        const value = remaining % 4;
        remaining = Math.floor(remaining / 4);
        return value;
      });
      const expected = bruteForce(heights);
      const { frames, rounds } = createTrace(heights);
      assert.equal(frames.at(-1).best, expected);
      assert.equal(rounds.length, length - 1);
      for (const frame of frames) {
        // 核心不变量：被排除的组合不会藏着未记录的更好答案。
        assert.equal(Math.max(frame.best ?? 0, bruteForce(heights, frame.l, frame.r)), expected);
        if (frame.phase === "record") {
          const seen = rounds.filter((round) => round.round <= frame.round);
          assert.equal(frame.best, Math.max(...seen.map((round) => round.area)));
        }
      }
      count++;
    }
  }
  assert.equal(count, 21840);
});

test("输入支持方括号和常见分隔符，并拒绝无效高度和长度", () => {
  assert.deepEqual(parseHeights(" [1, 8，6 0] "), [1, 8, 6, 0]);
  assert.deepEqual(parseHeights("0 10000"), [0, 10000]);
  for (const text of ["", "[]", "1", "-1, 2", "1.5, 2", "1e2, 3", "NaN, 1", "10001, 2", "[1,2", "1,2]", Array(25).fill(1).join(",")]) {
    assert.throws(() => parseHeights(text), Error, text);
  }
  assert.throws(() => createTrace([1, Infinity]));
  assert.throws(() => createTrace([1, -1]));
});
