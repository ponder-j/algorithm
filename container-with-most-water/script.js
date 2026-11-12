"use strict";

(() => {
  const { parseHeights, createTrace } = window.containerWater;
  const elements = Object.fromEntries(Array.from(document.querySelectorAll("[id]"), (element) => [element.id, element]));
  const examples = {
    classic: [1, 8, 6, 2, 5, 4, 8, 3, 7],
    increasing: [1, 2, 3, 4, 5, 6, 7, 8],
    equal: [5, 1, 2, 5],
    zeros: [0, 0, 0, 0, 0],
    pair: [1, 1]
  };
  const phaseLabels = { init: "初始化", measure: "计算水量", record: "记录最大值", discard: "排除短边", move: "移动指针", done: "遍历完成" };
  const baseline = 294;
  const plotHeight = 240;
  const padding = 48;
  let model;
  let frameIndex = 0;
  let playing = false;
  let timer = null;
  let pitch = 50;
  let scale = 1;
  let columns = [];
  let historyRows = [];
  let activeTab = "steps";

  const setText = (id, value) => { elements[id].textContent = value; };
  const position = (index) => padding + index * pitch;
  const getFrame = () => model.frames[frameIndex];
  const viewPair = (frame) => frame.phase === "done" ? frame.bestPair : [frame.l, frame.r];

  function buildChart() {
    columns = model.heights.map((height, index) => {
      const column = document.createElement("div");
      column.className = "column";
      const value = document.createElement("span");
      value.className = "height-label mono";
      value.textContent = height;
      const label = document.createElement("span");
      label.className = "index-label mono";
      label.textContent = index;
      column.append(value, label);
      return column;
    });
    elements.columns.replaceChildren(...columns);
    const maxHeight = Math.max(1, ...model.heights);
    const ticks = Array.from(new Set([0, Math.ceil(maxHeight / 2), maxHeight]));
    const grid = ticks.map((value) => {
      const line = document.createElement("div");
      line.className = "grid-line";
      line.style.top = `${baseline - value / maxHeight * plotHeight}px`;
      const label = document.createElement("span");
      label.className = "mono";
      label.textContent = value;
      line.append(label);
      return line;
    });
    elements["grid-lines"].replaceChildren(...grid);

    historyRows = model.rounds.map((round) => {
      const row = document.createElement("tr");
      const first = document.createElement("td");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = round.round;
      button.setAttribute("aria-label", `回看第 ${round.round} 轮`);
      button.addEventListener("click", () => seek(round.measureFrame));
      first.append(button);
      row.append(first);
      for (const value of [`[${round.l}, ${round.r}]`, round.area, round.best]) {
        const cell = document.createElement("td");
        cell.className = "mono";
        cell.textContent = value;
        row.append(cell);
      }
      if (round.improved) {
        row.lastElementChild.classList.add("new-best");
        row.lastElementChild.title = "本轮更新最大值";
      }
      return row;
    });
    elements["history-body"].replaceChildren(...historyRows);
  }

  function resizeChart() {
    if (!model) return;
    const available = elements["chart-viewport"].clientWidth;
    const minimumPitch = Math.max(...model.heights).toString().length >= 4 ? 46 : 28;
    pitch = Math.max(minimumPitch, Math.min(78, (available - padding * 2) / (model.heights.length - 1)));
    const stageWidth = Math.max(available, padding * 2 + (model.heights.length - 1) * pitch);
    elements["chart-stage"].style.width = `${stageWidth}px`;
    scale = plotHeight / Math.max(1, ...model.heights);
    columns.forEach((column, index) => {
      column.style.left = `${position(index)}px`;
      column.style.height = `${Math.max(3, model.heights[index] * scale)}px`;
    });
    elements["scroll-hint"].hidden = stageWidth <= available + 1;
  }

  function setWater(element, l, r) {
    element.style.left = `${position(l)}px`;
    element.style.width = `${position(r) - position(l)}px`;
    element.style.height = `${Math.min(model.heights[l], model.heights[r]) * scale}px`;
  }

  function renderChart(frame) {
    const [l, r] = viewPair(frame);
    const hL = model.heights[l];
    const hR = model.heights[r];
    const done = frame.phase === "done";
    const short = hL <= hR ? l : r;
    const measured = frame.area !== null || done;
    const showTrial = activeTab === "proof" && elements["show-trial"].checked;
    setWater(elements.water, l, r);
    elements.water.style.opacity = measured ? "1" : ".45";
    elements["trial-water"].hidden = !showTrial;
    elements["trial-caption"].hidden = !showTrial;

    columns.forEach((column, index) => {
      column.className = "column";
      if (index < l || index > r) column.classList.add("excluded");
      if (index === l || index === r) column.classList.add("selected");
      if (index === short && !done) column.classList.add("short");
      if (index === short && frame.phase === "discard") column.classList.add("discarding");
      if (done && (index === l || index === r)) column.classList.add("optimal");
    });
    for (const [side, index] of [["left", l], ["right", r]]) {
      const pointer = elements[`pointer-${side}`];
      pointer.style.left = `${position(index)}px`;
      pointer.classList.toggle("is-short", index === short && !done);
      pointer.classList.toggle("is-optimal", done);
      pointer.textContent = `${side === "left" ? "L" : "R"}${done ? "*" : ""}`;
    }
    elements["width-guide"].style.left = `${position(l)}px`;
    elements["width-guide"].style.width = `${position(r) - position(l)}px`;
    setText("width-text", `宽 ${r - l}`);
    const area = (r - l) * Math.min(hL, hR);
    setText("area-equation", measured ? `${r} − ${l} = ${r - l}  ·  min(${hL}, ${hR}) = ${Math.min(hL, hR)}  ·  容量 ${area}` : `宽 ${r - l} × 短边 ${Math.min(hL, hR)}，下一步计算容量`);
    elements["chart-stage"].setAttribute("aria-label", `高度数组 ${model.heights.join("，")}。${done ? "最优" : "当前"}容器端点 ${l} 和 ${r}，宽 ${r - l}，水位 ${Math.min(hL, hR)}，容量 ${area}。`);
    setText("value-l", l);
    setText("value-r", r);
    setText("height-l", hL);
    setText("height-r", hR);
    setText("width-value", r - l);
    setText("level-value", Math.min(hL, hR));
    setText("area-value", measured ? area : "待计算");

    const isLeftShort = hL <= hR;
    const trialL = isLeftShort ? l : l + 1;
    const trialR = isLeftShort ? r - 1 : r;
    const trialArea = (trialR - trialL) * Math.min(model.heights[trialL], model.heights[trialR]);
    setWater(elements["trial-water"], trialL, trialR);
    setText("trial-caption", `试移${isLeftShort ? "右" : "左"}边 → [${trialL}, ${trialR}]：宽 ${trialR - trialL} × 水位 ${Math.min(model.heights[trialL], model.heights[trialR])} = ${trialArea} ≤ 当前 ${area}`);
    setText("trial-description", hL === hR ? "当前两边等高，叠加图试移右边；本轮动画选择移动左边。" : `叠加图只试移较高的${isLeftShort ? "右" : "左"}边，蓝色仍表示原来的容器。`);
    const side = isLeftShort ? "左" : "右";
    const fixed = isLeftShort ? l : r;
    setText("proof-equation", `${side}边 h[${fixed}] = ${Math.min(hL, hR)} ${hL === hR ? "（两边等高）" : "是短边"}\n保留它，任意向内换另一端：\n新水位 ≤ ${Math.min(hL, hR)}，新宽度 < ${r - l}\n新容量 ≤ 当前容量 ${area}`);
  }

  function stepContent(frame) {
    const { l, r, area, best, phase } = frame;
    const hL = model.heights[l];
    const hR = model.heights[r];
    if (phase === "init") return ["两端出发，先取最大宽度", "L 指向最左边，R 指向最右边。容器只由这两根柱子决定，水位取较短的一边；中间柱子的高度不参与本次容量计算。", `L = 0，R = ${r}\n容量 = (R − L) × min(h[L], h[R])`];
    if (phase === "measure") return ["用短边高度计算容量", `当前端点是 ${l} 和 ${r}，宽度为 ${r - l}。两边高度分别为 ${hL} 和 ${hR}，所以只能装到 ${Math.min(hL, hR)} 的水位。`, `${r - l} × min(${hL}, ${hR}) = ${area}`];
    if (phase === "record") return frame.improved
      ? [frame.previousBest === null ? "记录第一个容器" : "找到更大的容量", `把当前容量 ${area} 记为已见最大值，保存端点 [${l}, ${r}]。${hL === hR ? "两边等高，本动画下一步选择移动左边。" : "接下来再决定排除哪一个端点。"}`, `best：${frame.previousBest ?? "尚未记录"} → ${best}\n最优端点 = [${l}, ${r}]`]
      : ["保留已有最大值", `当前容量 ${area} 没有超过已记录的 ${best}，最大值和对应端点保持不变。容量相等时保留更早找到的那一对。`, `best = max(${best}, ${area}) = ${best}`];
    if (phase === "discard") {
      const left = frame.direction === "left";
      const index = left ? l : r;
      const shortHeight = model.heights[index];
      return [hL === hR ? "两边等高，选择移动左边" : `排除${left ? "左" : "右"}边这个端点`, `保留端点 ${index}、只把另一端向内移，水位仍不超过 ${shortHeight}，宽度还会缩小，容量不可能超过已经记录的当前值。排除它后，才有机会提高短边。`, `${left ? "L" : "R"}：${index} → ${index + (left ? 1 : -1)}\nbest = ${best}`];
    }
    if (phase === "move") return ["指针内移，准备下一轮", `剩下的候选端点位于 [${l}, ${r}]。已排除的端点变浅；它们在尚未检查的组合中，也不可能带来更优容量。下一步计算新容器。`, `L = ${l}，R = ${r}\n已记录 best = ${best}`];
    return ["指针相遇，回看最优容器", `两个指针在下标 ${l} 相遇，已没有两根不同柱子可检查。图中回看最优端点 [${frame.bestPair.join(", ")}]，最大容量为 ${best}。`, `共计算 ${model.rounds.length} 个容器\n最大容量 = ${best}`];
  }

  function render() {
    const frame = getFrame();
    renderChart(frame);
    setText("diagram-title", frame.phase === "done" ? "最优容器 · L* 与 R*" : "两端向内，逐轮排除短边");
    setText("round-label", frame.phase === "init" ? `共 ${model.heights.length} 根柱子` : frame.phase === "done" ? "已完成" : `第 ${frame.round} 轮 / ${model.rounds.length}`);
    const [title, description, equation] = stepContent(frame);
    setText("step-title", title);
    setText("step-description", description);
    setText("step-equation", equation);
    document.querySelectorAll("[data-phase]").forEach((item) => {
      if (item.dataset.phase === frame.phase || (frame.phase === "move" && item.dataset.phase === "discard")) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    });
    setText("best-label", frame.phase === "done" ? "最大容量" : "已记录的最大容量");
    setText("best-value", frame.best ?? "—");
    setText("best-pair", frame.bestPair ? `端点 [${frame.bestPair.join(", ")}]` : "尚未记录");
    elements["jump-best"].disabled = frame.bestFrame === null;
    setText("timeline-phase", phaseLabels[frame.phase]);
    setText("timeline-value", `${frameIndex + 1} / ${model.frames.length}`);
    elements.timeline.value = frameIndex;
    elements.previous.disabled = frameIndex === 0;
    elements.next.disabled = frameIndex === model.frames.length - 1;
    elements["next-round"].disabled = frameIndex === model.frames.length - 1;
    elements.play.textContent = playing ? "暂停" : frameIndex === model.frames.length - 1 ? "重播" : "播放";
    let count = 0;
    historyRows.forEach((row, index) => {
      row.hidden = model.rounds[index].recordFrame > frameIndex;
      row.classList.toggle("is-current", model.rounds[index].round === frame.round);
      if (!row.hidden) count++;
    });
    setText("history-count", count);
    elements["history-empty"].hidden = count > 0;
  }

  function pause() {
    clearTimeout(timer);
    timer = null;
    playing = false;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!playing) return;
      frameIndex++;
      if (frameIndex >= model.frames.length - 1) pause();
      render();
      if (playing) schedule();
    }, 1050 / Number(elements.speed.value));
  }

  function seek(index) {
    pause();
    frameIndex = Math.max(0, Math.min(index, model.frames.length - 1));
    render();
  }

  function togglePlay() {
    if (playing) pause();
    else {
      if (frameIndex === model.frames.length - 1) frameIndex = 0;
      playing = true;
      schedule();
    }
    render();
  }

  function load(values) {
    pause();
    model = createTrace(values);
    frameIndex = 0;
    elements.timeline.max = model.frames.length - 1;
    elements["chart-viewport"].scrollLeft = 0;
    buildChart();
    setText("complexity-summary", `当前 ${values.length} 根柱子，双指针只计算 ${values.length - 1} 个容器；枚举所有两根柱子要计算 ${values.length * (values.length - 1) / 2} 个。每轮移动一边，总时间为 O(n)。`);
    elements["chart-stage"].classList.add("is-resetting");
    resizeChart();
    render();
    void elements["chart-stage"].offsetWidth;
    elements["chart-stage"].classList.remove("is-resetting");
  }

  function selectExample(name) {
    const values = examples[name];
    elements.heights.value = values.join(", ");
    elements["input-error"].hidden = true;
    elements.heights.removeAttribute("aria-invalid");
    document.querySelectorAll("[data-example]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.example === name)));
    load(values);
  }

  elements["heights-form"].addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const values = parseHeights(elements.heights.value);
      load(values);
      elements["input-error"].hidden = true;
      elements.heights.removeAttribute("aria-invalid");
      document.querySelectorAll("[data-example]").forEach((button) => button.setAttribute("aria-pressed", String(examples[button.dataset.example].join(",") === values.join(","))));
    } catch (error) {
      pause();
      render();
      setText("input-error", error.message);
      elements["input-error"].hidden = false;
      elements.heights.setAttribute("aria-invalid", "true");
      elements.heights.focus();
    }
  });
  document.querySelectorAll("[data-example]").forEach((button) => button.addEventListener("click", () => selectExample(button.dataset.example)));
  elements.previous.addEventListener("click", () => seek(frameIndex - 1));
  elements.next.addEventListener("click", () => seek(frameIndex + 1));
  elements.play.addEventListener("click", togglePlay);
  elements["next-round"].addEventListener("click", () => seek(model.rounds.find((round) => round.measureFrame > frameIndex)?.measureFrame ?? model.frames.length - 1));
  elements.timeline.addEventListener("input", () => seek(Number(elements.timeline.value)));
  elements.speed.addEventListener("change", () => { if (playing) schedule(); });
  elements["jump-best"].addEventListener("click", () => seek(getFrame().bestFrame));
  elements["show-trial"].addEventListener("change", render);

  const tabs = [elements["tab-steps"], elements["tab-proof"]];
  function selectTab(tab) {
    activeTab = tab.id.slice(4);
    tabs.forEach((item) => {
      const selected = item === tab;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
      elements[item.getAttribute("aria-controls")].hidden = !selected;
    });
    render();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const target = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs.at(-1) : tabs[(index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      selectTab(target);
      target.focus();
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.target.closest("input, select, button, summary, a, [role='tablist'], .algorithm-sidebar") || document.querySelector("main").inert) return;
    if (![" ", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === " ") togglePlay();
    if (event.key === "ArrowLeft") seek(frameIndex - 1);
    if (event.key === "ArrowRight") seek(frameIndex + 1);
    if (event.key === "Home") seek(0);
    if (event.key === "End") seek(model.frames.length - 1);
  });
  window.addEventListener("resize", () => {
    elements["chart-stage"].classList.add("is-resetting");
    resizeChart();
    render();
    void elements["chart-stage"].offsetWidth;
    elements["chart-stage"].classList.remove("is-resetting");
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden && playing) { pause(); render(); } });
  selectExample("classic");
})();
