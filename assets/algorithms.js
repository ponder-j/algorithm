// 新增动画时在这里登记，首页、侧栏和页面题号会一起更新。
window.algorithmCatalog = [
  {
    id: "manacher",
    name: "马拉车算法",
    path: "manacher/index.html",
    preview: {
      src: "assets/previews/manacher.png",
      alt: "马拉车动画中的已知回文、镜像位置与回文半径"
    },
    problems: [
      {
        number: 5,
        title: "最长回文子串",
        url: "https://leetcode.cn/problems/longest-palindromic-substring/description/"
      }
    ]
  },
  {
    id: "median-of-two-sorted-arrays",
    name: "二分划分求中位数",
    path: "median-of-two-sorted-arrays/index.html",
    preview: {
      src: "assets/previews/median-of-two-sorted-arrays.png",
      alt: "二分划分动画中两个数组的挡板及交叉比较"
    },
    problems: [
      {
        number: 4,
        title: "寻找两个正序数组的中位数",
        url: "https://leetcode.cn/problems/median-of-two-sorted-arrays/description/"
      }
    ]
  }
];
