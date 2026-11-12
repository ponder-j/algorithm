# 算法动画

[在线浏览](https://ponder-j.github.io/algorithm/) · [马拉车算法](https://ponder-j.github.io/algorithm/manacher/)

- 马拉车动画对应 LeetCode 5「最长回文子串」，提供逐步播放、镜像推理与比较次数对照。
- 二分划分动画对应 LeetCode 4「寻找两个正序数组的中位数」，展示合法切分区间、两个挡板的联动与交叉比较。每个数组最多展示 12 个元素。[在线浏览](https://ponder-j.github.io/algorithm/median-of-two-sorted-arrays/)
- 双指针盛水动画对应 LeetCode 11「盛最多水的容器」，展示宽度、短边水位、最大容量与逐轮排除过程，支持叠加对比只移动高边的结果。可自定义 2–24 个高度。[在线浏览](https://ponder-j.github.io/algorithm/container-with-most-water/)

## 检查动画模型

运行 `node --test container-with-most-water/trace.test.cjs`，检查容量结果、排除端点的正确性和输入边界。

## 本地浏览

直接打开 `index.html`，或在当前目录运行 `python3 -m http.server 8000` 后访问 `http://localhost:8000`。

## 新增算法

1. 建立独立的算法目录，在其中添加 `index.html`。
2. 在 `assets/algorithms.js` 中登记算法名称、页面路径及对应的 LeetCode 题号、题名和链接。每个算法可以关联多道题，可选用 `preview.src` 和 `preview.alt` 添加首页预览图。
3. 在新页面的 `<head>` 中引入公共资源。

```html
<link rel="stylesheet" href="../assets/base.css">
<link rel="stylesheet" href="../assets/navigation.css">
<script defer src="../assets/algorithms.js"></script>
<script defer src="../assets/navigation.js"></script>
```

4. 给 `<body>` 设置与清单一致的 `data-algorithm`，例如 `data-algorithm="manacher"`。主内容放在 `<main class="shell">` 中，页头可添加 `<div data-algorithm-problems></div>` 显示题目链接。

首页展示从算法清单生成的封面卡片，点击卡片进入对应动画。公共脚本会生成算法侧栏、标记当前页面，并记住桌面端的收起状态。侧栏支持按算法名称、题目名称或 LeetCode 题号实时筛选，点击顶部的“算法动画”可返回封面。

## 发布更新

GitHub Pages 从 `main` 分支的根目录发布。提交修改并运行 `git push` 后，GitHub 会自动更新站点。可以在仓库的 Actions 页面查看部署结果。
