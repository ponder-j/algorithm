# 算法动画

[在线浏览](https://ponder-j.github.io/algorithm/) · [马拉车算法](https://ponder-j.github.io/algorithm/manacher/)

马拉车动画对应 LeetCode 5「最长回文子串」，提供逐步播放、镜像推理与比较次数对照。

## 本地浏览

直接打开 `index.html`，或在当前目录运行 `python3 -m http.server 8000` 后访问 `http://localhost:8000`。

## 新增算法

1. 建立独立的算法目录，在其中添加 `index.html`。
2. 在 `assets/algorithms.js` 中登记算法名称、页面路径及对应的 LeetCode 题号、题名和链接。每个算法可以关联多道题。
3. 在新页面的 `<head>` 中引入公共资源。

```html
<link rel="stylesheet" href="../assets/navigation.css">
<script defer src="../assets/algorithms.js"></script>
<script defer src="../assets/navigation.js"></script>
```

4. 给 `<body>` 设置与清单一致的 `data-algorithm`，例如 `data-algorithm="manacher"`。主内容放在 `<main class="shell">` 中，页头可添加 `<div data-algorithm-problems></div>` 显示题目链接。

公共脚本会生成算法侧栏、标记当前页面，并记住桌面端的收起状态。首页默认打开清单中的第一个算法。

## 发布更新

GitHub Pages 从 `main` 分支的根目录发布。提交修改并运行 `git push` 后，GitHub 会自动更新站点。可以在仓库的 Actions 页面查看部署结果。
