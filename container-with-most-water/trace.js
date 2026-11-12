"use strict";

// 独立的推演模型：浏览器负责展示，Node 可以直接检查每一帧。
(() => {
  function validateHeights(values) {
    if (!Array.isArray(values) || values.length < 2 || values.length > 24) {
      throw new Error("请填写 2–24 个高度，至少需要两根柱子。");
    }
    if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 10000)) {
      throw new Error("每个高度都需要是 0–10000 之间的整数。");
    }
    return values;
  }

  function parseHeights(text) {
    let content = text.trim();
    if (content.startsWith("[") && content.endsWith("]")) content = content.slice(1, -1).trim();
    if (!content) return validateHeights([]);
    const parts = content.split(/[\s,，]+/).filter(Boolean);
    if (parts.some((part) => !/^\d+$/.test(part))) {
      throw new Error("请用逗号或空格分隔非负整数，例如 1, 8, 6, 2。");
    }
    return validateHeights(parts.map(Number));
  }

  function createTrace(values) {
    const heights = validateHeights(values).slice();
    let l = 0;
    let r = heights.length - 1;
    let best = null;
    let bestPair = null;
    let bestFrame = null;
    let round = 0;
    const frames = [];
    const rounds = [];
    const push = (phase, extra = {}) => frames.push({
      phase, l, r, round, best, bestPair: bestPair?.slice() ?? null, bestFrame, area: null, ...extra
    });
    push("init");

    while (l < r) {
      round++;
      const area = (r - l) * Math.min(heights[l], heights[r]);
      const direction = heights[l] <= heights[r] ? "left" : "right";
      const measureFrame = frames.length;
      push("measure", { area, direction });
      const improved = best === null || area > best;
      const previousBest = best;
      if (improved) {
        best = area;
        bestPair = [l, r];
        bestFrame = frames.length;
      }
      const recordFrame = frames.length;
      push("record", { area, direction, improved, previousBest });
      rounds.push({ round, l, r, area, best, improved, measureFrame, recordFrame });
      push("discard", { area, direction });
      if (direction === "left") l++;
      else r--;
      if (l < r) push("move");
    }
    push("done");
    return { heights, frames, rounds };
  }

  const api = { parseHeights, createTrace };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.containerWater = api;
})();
