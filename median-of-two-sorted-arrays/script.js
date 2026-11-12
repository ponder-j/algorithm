"use strict";

function parseArray(text, label) {
  const trimmed = text.trim();
  const content = trimmed.startsWith("[") && trimmed.endsWith("]") ? trimmed.slice(1, -1).trim() : trimmed;
  if (!content) return [];
  const parts = content.split(/[\s,，]+/).filter(Boolean);
  if (parts.length > 12) throw new Error(`数组 ${label} 最多展示 12 个元素。`);
  const values = parts.map((part) => {
    if (!/^[+-]?\d+$/.test(part)) throw new Error(`数组 ${label} 需要使用逗号或空格分隔的整数。`);
    const value = Number(part);
    if (!Number.isSafeInteger(value) || value < -1000000 || value > 1000000) {
      throw new Error(`数组 ${label} 的元素需要位于题目范围 [−1000000, 1000000] 内。`);
    }
    return value;
  });
  if (values.some((value, index) => index > 0 && value < values[index - 1])) {
    throw new Error(`数组 ${label} 需要按从小到大排列，允许相等。`);
  }
  return values;
}

// 按用户 Rust 实现中的可行区间，在 nums1 的挡板位置上二分。
function createTrace(a, b) {
  if (a.length + b.length === 0) throw new Error("两个数组中至少需要有一个元素。");
  const m = a.length;
  const n = b.length;
  const mid = Math.ceil((m + n) / 2);
  let l = Math.max(0, mid - n);
  let r = Math.min(m, mid);
  const initialChoices = r - l + 1;
  const frames = [{ phase: "bounds", l, r, i: null, j: null, iteration: 0, values: null }];
  const roundSteps = [];
  let iteration = 0;

  while (l <= r) {
    iteration++;
    const i = Math.floor((l + r) / 2);
    const j = mid - i;
    const values = {
      aLeft: i === 0 ? -Infinity : a[i - 1],
      aRight: i === m ? Infinity : a[i],
      bLeft: j === 0 ? -Infinity : b[j - 1],
      bRight: j === n ? Infinity : b[j]
    };
    const passA = values.aLeft <= values.bRight;
    const passB = values.bLeft <= values.aRight;
    const frame = { l, r, i, j, iteration, values, passA, passB };
    roundSteps.push(frames.length);
    frames.push({ ...frame, phase: "partition" });
    frames.push({ ...frame, phase: "compare" });
    if (passA && passB) {
      const left = Math.max(values.aLeft, values.bLeft);
      const right = Math.min(values.aRight, values.bRight);
      const even = (m + n) % 2 === 0;
      const median = even ? (left + right) / 2 : left;
      frames.push({ ...frame, phase: "found" });
      frames.push({ ...frame, phase: "result", left, right, even, median });
      return { a: a.slice(), b: b.slice(), m, n, mid, initialChoices, frames, roundSteps };
    }
    const oldL = l;
    const oldR = r;
    const direction = !passA ? "left" : "right";
    if (direction === "left") r = i - 1;
    else l = i + 1;
    frames.push({ ...frame, phase: "move", l, r, oldL, oldR, direction });
  }
  throw new Error("找不到合法划分，请检查两个数组的顺序。");
}

const examples = {
  directions: { a: [1, 2, 3, 4, 11, 12], b: [5, 6, 7, 8, 9, 10] },
  odd: { a: [1, 3, 8, 9, 15], b: [7, 11, 18, 19, 21, 25] },
  restricted: { a: [1, 2, 3, 4, 5, 6, 7, 8], b: [9, 10] },
  empty: { a: [], b: [1, 2, 3, 4] },
  duplicates: { a: [1, 2, 2, 2], b: [2, 2, 3, 4] }
};
const elements = {};
for (const element of document.querySelectorAll("[id]")) elements[element.id] = element;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let model;
let frameIndex = 0;
let playing = false;
let timer = null;
let cellWidth = 72;
const leftPadding = 96;
let aCells = [];
let bCells = [];
let gaps = [];

function numberText(value) {
  if (value === null || value === undefined) return "—";
  if (value === -Infinity) return "−∞";
  if (value === Infinity) return "+∞";
  return String(value);
}

function setText(id, text) {
  elements[id].textContent = text;
}

function buildCells(values, containerId, top, name) {
  elements[containerId].replaceChildren();
  return values.map((value, index) => {
    const cell = document.createElement("span");
    cell.className = "array-cell mono";
    cell.textContent = value;
    cell.style.top = `${top}px`;
    cell.setAttribute("aria-label", `${name}[${index}] = ${value}`);
    elements[containerId].append(cell);
    return cell;
  });
}

function buildDiagram() {
  aCells = buildCells(model.a, "cells-a", 110, "nums1");
  bCells = buildCells(model.b, "cells-b", 265, "nums2");
  elements["gap-positions"].replaceChildren();
  gaps = Array.from({ length: model.m + 1 }, (_, index) => {
    const span = document.createElement("span");
    span.className = "gap-position mono";
    span.textContent = index;
    span.setAttribute("aria-label", `A 的切分位置 ${index}`);
    elements["gap-positions"].append(span);
    return span;
  });
  resizeDiagram();
}

function resizeDiagram() {
  if (!model) return;
  const available = elements["arrays-viewport"].clientWidth - 36;
  const longest = Math.max(model.m, model.n);
  const widestNumber = Math.max(...[...model.a, ...model.b].map((value) => String(value).length));
  const minimum = Math.max(54, widestNumber * 8 + 18);
  cellWidth = Math.max(minimum, Math.min(80, Math.floor((available - leftPadding - 20) / (longest + 1))));
  const width = leftPadding + (longest + 1) * cellWidth + 20;
  elements["arrays-stage"].style.width = `${width}px`;
  for (const cells of [aCells, bCells]) {
    cells.forEach((cell, index) => {
      cell.style.left = `${leftPadding + index * cellWidth + 3}px`;
      cell.style.width = `${cellWidth - 6}px`;
    });
  }
  gaps.forEach((gap, index) => { gap.style.left = `${leftPadding + index * cellWidth - 16}px`; });
  elements["scroll-hint"].hidden = width <= available;
}

function markBoundary(element, pass, checked) {
  if (!element) return;
  element.classList.add("boundary");
  if (checked) element.classList.add(pass ? "pass" : "fail");
}

function renderDiagram(frame) {
  elements["allowed-range"].style.left = `${leftPadding + frame.l * cellWidth - 20}px`;
  elements["allowed-range"].style.width = `${(frame.r - frame.l) * cellWidth + 40}px`;
  gaps.forEach((gap, index) => {
    gap.classList.toggle("excluded", index < frame.l || index > frame.r);
    gap.classList.toggle("selected", index === frame.i);
  });
  const hasCuts = frame.i !== null;
  const checked = ["compare", "move", "found", "result"].includes(frame.phase);
  for (const id of ["cut-a", "cut-b", "label-i", "label-j"]) elements[id].hidden = !hasCuts;
  aCells.forEach((cell, index) => { cell.className = `array-cell mono${hasCuts && index < frame.i ? " left-half" : ""}`; });
  bCells.forEach((cell, index) => { cell.className = `array-cell mono${hasCuts && index < frame.j ? " left-half" : ""}`; });
  for (const id of ["a-minus", "a-plus", "b-minus", "b-plus"]) {
    elements[id].hidden = true;
    elements[id].className = "sentinel mono";
  }
  elements["cross-comparisons"].toggleAttribute("hidden", !checked);
  if (!hasCuts) return;

  const aCut = leftPadding + frame.i * cellWidth;
  const bCut = leftPadding + frame.j * cellWidth;
  elements["cut-a"].style.left = `${aCut - 1}px`;
  elements["cut-b"].style.left = `${bCut - 1}px`;
  elements["label-i"].style.left = `${aCut - 37}px`;
  elements["label-j"].style.left = `${bCut - 37}px`;
  setText("label-i", `i = ${frame.i}`);
  setText("label-j", `j = ${frame.j}`);

  const sentinels = [
    { id: "a-minus", show: frame.i === 0, x: leftPadding - cellWidth / 2, y: 114 },
    { id: "a-plus", show: frame.i === model.m, x: leftPadding + (model.m + .5) * cellWidth, y: 114 },
    { id: "b-minus", show: frame.j === 0, x: leftPadding - cellWidth / 2, y: 269 },
    { id: "b-plus", show: frame.j === model.n, x: leftPadding + (model.n + .5) * cellWidth, y: 269 }
  ];
  for (const sentinel of sentinels) {
    const element = elements[sentinel.id];
    element.hidden = !sentinel.show;
    element.style.left = `${sentinel.x - 22}px`;
    element.style.top = `${sentinel.y}px`;
  }
  const aLeft = frame.i === 0 ? elements["a-minus"] : aCells[frame.i - 1];
  const aRight = frame.i === model.m ? elements["a-plus"] : aCells[frame.i];
  const bLeft = frame.j === 0 ? elements["b-minus"] : bCells[frame.j - 1];
  const bRight = frame.j === model.n ? elements["b-plus"] : bCells[frame.j];
  markBoundary(aLeft, frame.passA, checked);
  markBoundary(bRight, frame.passA, checked);
  markBoundary(bLeft, frame.passB, checked);
  markBoundary(aRight, frame.passB, checked);
  if (checked) {
    const xALeft = aCut - cellWidth / 2;
    const xARight = aCut + cellWidth / 2;
    const xBLeft = bCut - cellWidth / 2;
    const xBRight = bCut + cellWidth / 2;
    elements["comparison-a"].setAttribute("d", `M ${xALeft} 153 C ${xALeft} 193 ${xBRight} 222 ${xBRight} 264`);
    elements["comparison-b"].setAttribute("d", `M ${xARight} 153 C ${xARight} 193 ${xBLeft} 222 ${xBLeft} 264`);
    elements["comparison-a"].classList.toggle("fail", !frame.passA);
    elements["comparison-b"].classList.toggle("fail", !frame.passB);
  }
  if (frame.phase === "result") {
    if (frame.values.aLeft === frame.left) aLeft.classList.add("median");
    if (frame.values.bLeft === frame.left) bLeft.classList.add("median");
    if (frame.even && frame.values.aRight === frame.right) aRight.classList.add("median");
    if (frame.even && frame.values.bRight === frame.right) bRight.classList.add("median");
  }
}

function describeFrame(frame) {
  const { mid, m, n } = model;
  if (frame.phase === "bounds") {
    return {
      title: "先限定合法的挡板位置",
      description: `总长 ${m + n}，左侧需要放 ${mid} 个元素。i 在 A 的合法范围内，同时要让 j = mid−i 位于 B 的合法范围。`,
      equation: `mid = ⌈${m + n}/2⌉ = ${mid}\nl = max(0, ${mid}−${n}) = ${frame.l}\nr = min(${m}, ${mid}) = ${frame.r}`
    };
  }
  if (frame.phase === "partition") {
    return {
      title: `第 ${frame.iteration} 轮，放置两个挡板`,
      description: `A 左边取 ${frame.i} 个，B 左边取 ${frame.j} 个，合计 ${mid} 个。蓝色块构成左半部分，读取两个挡板紧邻的四个值。`,
      equation: `i = ⌊(${frame.l}+${frame.r})/2⌋ = ${frame.i}\nj = ${mid}−${frame.i} = ${frame.j}`
    };
  }
  if (frame.phase === "compare") {
    return {
      title: "检查两条交叉关系",
      description: frame.passA && frame.passB
        ? "两条关系同时成立。左右两部分的数量正确，左半部分的所有元素也都小于等于右半部分。"
        : !frame.passA ? "a_left 大于 b_right，A 左侧包含了过大的值。下一步需要减小 i，同时增大 j。" : "b_left 大于 a_right，B 左侧包含了过大的值。下一步需要增大 i，同时减小 j。",
      equation: `${numberText(frame.values.aLeft)} ≤ ${numberText(frame.values.bRight)}  ${frame.passA ? "成立" : "不成立"}\n${numberText(frame.values.bLeft)} ≤ ${numberText(frame.values.aRight)}  ${frame.passB ? "成立" : "不成立"}`
    };
  }
  if (frame.phase === "move") {
    const left = frame.direction === "left";
    return {
      title: left ? "i 偏大，收缩右边界" : "i 偏小，抬高左边界",
      description: left
        ? `排除 i = ${frame.i} 及右侧所有候选位置。下轮在 [${frame.l}, ${frame.r}] 中重选 i，A 挡板左移，B 挡板右移。`
        : `排除 i = ${frame.i} 及左侧所有候选位置。下轮在 [${frame.l}, ${frame.r}] 中重选 i，A 挡板右移，B 挡板左移。`,
      equation: left ? `r = i−1 = ${frame.i}−1 = ${frame.r}\n区间 [${frame.oldL}, ${frame.oldR}] → [${frame.l}, ${frame.r}]` : `l = i+1 = ${frame.i}+1 = ${frame.l}\n区间 [${frame.oldL}, ${frame.oldR}] → [${frame.l}, ${frame.r}]`
    };
  }
  if (frame.phase === "found") {
    return { title: "合法划分已经找到", description: "两条交叉比较都通过了。左半部分的最大值，是两个左边界值的较大者。右半部分的最小值，是两个右边界值的较小者。", equation: `左侧最大 = max(${numberText(frame.values.aLeft)}, ${numberText(frame.values.bLeft)})\n右侧最小 = min(${numberText(frame.values.aRight)}, ${numberText(frame.values.bRight)})` };
  }
  return {
    title: frame.even ? "偶数总长，取中间两值的平均" : "奇数总长，取左侧最大值",
    description: frame.even ? "左右两半等长。左半部分最后一个值和右半部分第一个值，共同决定中位数。深蓝色块标出了这些值。" : "左半部分比右半部分多一个元素，它的最大值就是整个序列的中位数。深蓝色块标出了这个值。",
    equation: frame.even ? `left = ${frame.left}，right = ${frame.right}\n中位数 = (${frame.left}+${frame.right})/2 = ${frame.median}` : `中位数 = max(${numberText(frame.values.aLeft)}, ${numberText(frame.values.bLeft)})\n       = ${frame.median}`
  };
}

function render() {
  const frame = model.frames[frameIndex];
  const description = describeFrame(frame);
  renderDiagram(frame);
  for (const name of ["l", "r", "i", "j"]) setText(`value-${name}`, numberText(frame[name]));
  setText("value-mid", model.mid);
  setText("round-label", frame.iteration ? `第 ${frame.iteration} 轮` : "准备开始");
  setText("size-label", `m = ${model.m}，n = ${model.n}`);
  setText("step-title", description.title);
  setText("step-description", description.description);
  setText("step-equation", description.equation);
  setText("timeline-phase", description.title);
  setText("timeline-value", `${frameIndex + 1} / ${model.frames.length}`);
  elements.timeline.max = model.frames.length - 1;
  elements.timeline.value = frameIndex;
  elements.timeline.setAttribute("aria-valuetext", `第 ${frameIndex + 1} 步，共 ${model.frames.length} 步，${description.title}`);
  elements.previous.disabled = frameIndex === 0;
  elements.next.disabled = frameIndex === model.frames.length - 1;
  elements["next-round"].disabled = !model.roundSteps.some((index) => index > frameIndex);
  setText("play", playing ? "暂停" : frameIndex === model.frames.length - 1 ? "重新播放" : "播放");
  elements.play.setAttribute("aria-pressed", String(playing));
  setText("partition-summary", frame.i === null ? `i 的可行区间 [${frame.l}, ${frame.r}]，共 ${frame.r - frame.l + 1} 个位置`
    : `左侧 ${frame.i} + ${frame.j} = ${model.mid} 个 · 右侧 ${model.m - frame.i} + ${model.n - frame.j} = ${model.m + model.n - model.mid} 个`);
  const checked = ["compare", "move", "found", "result"].includes(frame.phase);
  for (const [id, key] of [["a-left-value", "aLeft"], ["a-right-value", "aRight"], ["b-left-value", "bLeft"], ["b-right-value", "bRight"]]) {
    setText(id, numberText(frame.values?.[key]));
  }
  for (const [name, pass] of [["a", frame.passA], ["b", frame.passB]]) {
    const check = elements[`check-${name}`];
    check.classList.toggle("pass", checked && pass);
    check.classList.toggle("fail", checked && !pass);
    setText(`check-${name}-status`, checked ? (pass ? "成立" : "不成立") : "待检查");
  }
  const phase = frame.phase === "move" ? "compare" : frame.phase === "found" ? "result" : frame.phase;
  document.querySelectorAll("[data-phase]").forEach((item) => {
    if (item.dataset.phase === phase) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });
  setText("median-value", frame.phase === "result" ? frame.median : "待确定");
  setText("median-formula", frame.phase !== "result" ? "" : frame.even ? `(${frame.left} + ${frame.right}) / 2` : `左侧最大值 ${frame.left}`);
}

function ensureCutsVisible() {
  const frame = model.frames[frameIndex];
  if (frame.i === null) return;
  const viewport = elements["arrays-viewport"];
  const x = 18 + leftPadding + frame.i * cellWidth;
  const margin = Math.min(90, viewport.clientWidth / 4);
  if (x < viewport.scrollLeft + margin || x > viewport.scrollLeft + viewport.clientWidth - margin) {
    viewport.scrollTo({ left: Math.max(0, x - viewport.clientWidth / 2), behavior: reducedMotion.matches ? "instant" : "smooth" });
  }
}

function stopPlayback() {
  clearTimeout(timer);
  timer = null;
  playing = false;
}

function goTo(index) {
  stopPlayback();
  frameIndex = Math.max(0, Math.min(model.frames.length - 1, index));
  render();
  ensureCutsVisible();
}

function scheduleFrame() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (!playing) return;
    frameIndex++;
    if (frameIndex >= model.frames.length - 1) { frameIndex = model.frames.length - 1; stopPlayback(); }
    render();
    ensureCutsVisible();
    if (playing) scheduleFrame();
  }, 1300 / Number(elements.speed.value));
}

function togglePlayback() {
  if (playing) stopPlayback();
  else {
    if (frameIndex === model.frames.length - 1) frameIndex = 0;
    playing = true;
    scheduleFrame();
  }
  render();
}

function loadArrays(a, b) {
  stopPlayback();
  model = createTrace(a, b);
  frameIndex = 0;
  elements["array-a"].value = a.join(", ");
  elements["array-b"].value = b.join(", ");
  elements["input-error"].hidden = true;
  for (const button of document.querySelectorAll("[data-example]")) {
    const example = examples[button.dataset.example];
    button.setAttribute("aria-pressed", String(JSON.stringify(a) === JSON.stringify(example.a) && JSON.stringify(b) === JSON.stringify(example.b)));
  }
  setText("complexity-summary", `本例初始有 K = ${model.initialChoices} 个候选位置，K ≤ min(m,n)+1 = ${Math.min(model.m, model.n) + 1}。最多进行 ${Math.ceil(Math.log2(model.initialChoices + 1))} 轮二分。`);
  buildDiagram();
  elements["arrays-viewport"].scrollLeft = 0;
  render();
}

function selectTab(name) {
  document.querySelectorAll(".tab").forEach((tab) => {
    const selected = tab.id === `tab-${name}`;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    elements[tab.getAttribute("aria-controls")].hidden = !selected;
  });
}

elements["arrays-form"].addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const a = parseArray(elements["array-a"].value, "A");
    const b = parseArray(elements["array-b"].value, "B");
    if (!a.length && !b.length) throw new Error("两个数组中至少需要有一个元素。");
    loadArrays(a, b);
  } catch (error) {
    setText("input-error", error.message);
    elements["input-error"].hidden = false;
  }
});
for (const id of ["array-a", "array-b"]) elements[id].addEventListener("input", () => { elements["input-error"].hidden = true; });
document.querySelectorAll("[data-example]").forEach((button) => {
  button.addEventListener("click", () => {
    const example = examples[button.dataset.example];
    loadArrays(example.a, example.b);
  });
});
document.querySelectorAll("[data-jump]").forEach((button) => {
  button.addEventListener("click", () => {
    let index = model.frames.findIndex((frame) => frame.phase === "move" && frame.direction === button.dataset.jump);
    if (index < 0) {
      loadArrays(examples.directions.a, examples.directions.b);
      index = model.frames.findIndex((frame) => frame.phase === "move" && frame.direction === button.dataset.jump);
    }
    goTo(index);
    selectTab("steps");
  });
});
elements["show-restricted"].addEventListener("click", () => { loadArrays(examples.restricted.a, examples.restricted.b); selectTab("steps"); });
elements.previous.addEventListener("click", () => goTo(frameIndex - 1));
elements.next.addEventListener("click", () => goTo(frameIndex + 1));
elements.play.addEventListener("click", togglePlayback);
elements["next-round"].addEventListener("click", () => {
  const next = model.roundSteps.find((index) => index > frameIndex);
  if (next !== undefined) goTo(next);
});
elements.timeline.addEventListener("input", () => goTo(Number(elements.timeline.value)));
elements.speed.addEventListener("change", () => { if (playing) scheduleFrame(); });
const tabNames = ["steps", "proof", "rust"];
for (const name of tabNames) {
  elements[`tab-${name}`].addEventListener("click", () => selectTab(name));
  elements[`tab-${name}`].addEventListener("keydown", (event) => {
    let target;
    if (event.key === "ArrowRight") target = tabNames[(tabNames.indexOf(name) + 1) % tabNames.length];
    if (event.key === "ArrowLeft") target = tabNames[(tabNames.indexOf(name) + tabNames.length - 1) % tabNames.length];
    if (event.key === "Home") target = tabNames[0];
    if (event.key === "End") target = tabNames.at(-1);
    if (target) { event.preventDefault(); selectTab(target); elements[`tab-${target}`].focus(); }
  });
}
document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target.closest("input, select, textarea, button, summary, a, [contenteditable]")) return;
  if (event.code === "Space") { event.preventDefault(); togglePlayback(); }
  if (event.key === "ArrowRight") { event.preventDefault(); goTo(frameIndex + 1); }
  if (event.key === "ArrowLeft") { event.preventDefault(); goTo(frameIndex - 1); }
});
window.addEventListener("resize", () => { resizeDiagram(); render(); ensureCutsVisible(); });
document.addEventListener("visibilitychange", () => { if (document.hidden && playing) { stopPlayback(); render(); } });
loadArrays(examples.directions.a, examples.directions.b);
