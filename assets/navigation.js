"use strict";

(() => {
  const catalog = window.algorithmCatalog;
  const siteRoot = new URL("../", document.currentScript.src);
  const current = catalog.find((algorithm) => algorithm.id === document.body.dataset.algorithm);
  const main = document.querySelector("main");
  const mobile = window.matchMedia("(max-width: 760px)");
  const preferenceKey = "algorithm-navigation-collapsed";

  function preferredCollapsedState() {
    try {
      return localStorage.getItem(preferenceKey) === "true";
    } catch {
      return false;
    }
  }

  let collapsed = mobile.matches || preferredCollapsedState();
  const sidebar = document.createElement("aside");
  sidebar.className = "algorithm-sidebar";
  sidebar.setAttribute("aria-labelledby", "algorithm-sidebar-title");
  sidebar.innerHTML = `
    <div class="algorithm-sidebar-header">
      <h2 class="algorithm-sidebar-title" id="algorithm-sidebar-title"><a>算法动画</a></h2>
      <button class="navigation-toggle" type="button" aria-controls="algorithm-navigation"></button>
    </div>
    <nav id="algorithm-navigation" aria-label="算法选择"><ul class="algorithm-list"></ul></nav>
  `;
  sidebar.querySelector(".algorithm-sidebar-title a").href = new URL("index.html", siteRoot).href;
  const toggle = sidebar.querySelector("button");
  const navigation = sidebar.querySelector("nav");
  const list = sidebar.querySelector("ul");
  const backdrop = document.createElement("button");
  backdrop.className = "navigation-backdrop";
  backdrop.type = "button";
  backdrop.tabIndex = -1;
  backdrop.setAttribute("aria-label", "关闭算法目录");
  backdrop.hidden = true;

  for (const algorithm of catalog) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.className = "algorithm-link";
    link.href = new URL(algorithm.path, siteRoot).href;
    if (algorithm.id === current?.id) link.setAttribute("aria-current", "page");
    const name = document.createElement("span");
    name.className = "algorithm-name";
    name.textContent = algorithm.name;
    link.append(name);
    for (const problem of algorithm.problems) {
      const label = document.createElement("span");
      label.className = "algorithm-problem";
      label.textContent = `LeetCode ${problem.number} · ${problem.title}`;
      link.append(label);
    }
    item.append(link);
    list.append(item);
  }

  const problemContainer = document.querySelector("[data-algorithm-problems]");
  if (current && problemContainer) {
    for (const problem of current.problems) {
      const link = document.createElement("a");
      link.href = problem.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = `LeetCode ${problem.number} · ${problem.title}`;
      problemContainer.append(link);
    }
  }

  function renderNavigation() {
    const modal = mobile.matches && !collapsed;
    document.body.classList.toggle("navigation-collapsed", collapsed);
    navigation.hidden = collapsed;
    toggle.textContent = collapsed ? (mobile.matches ? "算法目录" : "目录") : "收起";
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", collapsed ? "展开算法目录" : "收起算法目录");
    backdrop.hidden = !modal;
    main.inert = modal;
    if (modal) {
      sidebar.setAttribute("role", "dialog");
      sidebar.setAttribute("aria-modal", "true");
    } else {
      sidebar.removeAttribute("role");
      sidebar.removeAttribute("aria-modal");
    }
    // 目录改变可用宽度后，让现有动画重新计算每一格的位置。
    window.dispatchEvent(new Event("resize"));
  }

  function closeNavigation() {
    collapsed = true;
    renderNavigation();
    toggle.focus();
  }

  toggle.addEventListener("click", () => {
    collapsed = !collapsed;
    if (!mobile.matches) {
      try {
        localStorage.setItem(preferenceKey, String(collapsed));
      } catch {
        // 隐私模式或本地文件限制存储时，当前页面仍可正常开合。
      }
    }
    renderNavigation();
  });
  backdrop.addEventListener("click", closeNavigation);
  sidebar.addEventListener("keydown", (event) => {
    if (!mobile.matches || collapsed) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeNavigation();
    }
    if (event.key === "Tab") {
      const controls = sidebar.querySelectorAll("a[href], button");
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  mobile.addEventListener("change", () => {
    collapsed = mobile.matches || preferredCollapsedState();
    renderNavigation();
  });

  document.body.prepend(sidebar, backdrop);
  document.body.classList.add("has-algorithm-navigation");
  renderNavigation();
})();
