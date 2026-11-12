"use strict";

const catalogContainer = document.getElementById("home-algorithms");
for (const algorithm of window.algorithmCatalog) {
  const card = document.createElement("a");
  card.className = "cover-card";
  card.href = new URL(algorithm.path, document.baseURI).href;

  if (algorithm.preview) {
    const preview = document.createElement("div");
    preview.className = "cover-preview";
    const image = document.createElement("img");
    image.src = new URL(algorithm.preview.src, document.baseURI).href;
    image.alt = algorithm.preview.alt || `${algorithm.name}动画预览`;
    image.decoding = "async";
    preview.append(image);
    card.append(preview);
  }

  const content = document.createElement("div");
  content.className = "cover-content";
  const title = document.createElement("h2");
  title.textContent = algorithm.name;
  content.append(title);
  for (const problem of algorithm.problems) {
    const label = document.createElement("p");
    label.className = "cover-problems";
    label.textContent = `LeetCode ${problem.number} · ${problem.title}`;
    content.append(label);
  }
  const action = document.createElement("span");
  action.className = "cover-action";
  action.textContent = "打开动画";
  content.append(action);
  card.append(content);
  catalogContainer.append(card);
}
