/* =========================================================================
 * direction.js —— 方向详情页渲染脚本
 * -------------------------------------------------------------------------
 * 使用方式：direction.html?d=web|rev|pwn|cry|ops
 * 从 URL 读取方向 key，在 site-copy.js 的 siteCopy.department 前 5 项中
 * 找到对应方向，渲染它的标语 / 学习路线 / 技能标签 / 招新话术。
 *
 * 亮点：
 *   - 顶部方向切换为「单页内切换」：用 history.pushState 改地址栏，不刷新页面，
 *     内容带淡入动画平滑替换，避免整页重载时的“一跳一跳”。
 *   - 支持浏览器前进 / 后退（popstate）。
 * ========================================================================= */

// 方向顺序与 site-copy.js department 前 5 项一一对应
const DIRECTION_KEYS = ["web", "rev", "pwn", "cry", "ops"];

// 从 URL 获取当前方向 key（缺省为 web）
function getCurrentKey() {
  const params = new URLSearchParams(window.location.search);
  const d = params.get("d");
  return DIRECTION_KEYS.indexOf(d) !== -1 ? d : "web";
}

// 读取数据：siteCopy.department 前 5 项 = 5 个方向
function getDirections() {
  const all = (window.siteCopy && window.siteCopy.department) || [];
  return all.slice(0, DIRECTION_KEYS.length);
}

/* 渲染顶部方向切换导航（右上角胶囊按钮）。
 * 点击某个方向时不刷新页面：preventDefault + pushState + 重新渲染。
 */
function renderNav(keys, activeKey) {
  const nav = document.getElementById("direction-nav");
  if (!nav) return;

  const names = {
    web: "WEB",
    rev: "REV",
    pwn: "PWN",
    cry: "CRY",
    ops: "OPS",
  };

  nav.innerHTML = "";
  keys.forEach((key) => {
    const a = document.createElement("a");
    a.href = "direction.html?d=" + key;
    a.dataset.key = key;
    a.textContent = names[key];
    if (key === activeKey) a.className = "is-active";
    // 拦截默认跳转，改为单页内切换
    a.addEventListener("click", (e) => {
      e.preventDefault();
      navigate(key);
    });
    nav.appendChild(a);
  });
}

// 渲染主卡片内容
function renderDetail(data) {
  document.getElementById("d-mode").textContent = "CAPABILITY MATRIX";
  document.getElementById("d-title").textContent = data.title || "";
  document.getElementById("d-subtitle").textContent = data.subtitle || "";
  document.getElementById("d-slogan").textContent = data.slogan || "";

  // 学习路线列表
  const roadmap = document.getElementById("d-roadmap");
  roadmap.innerHTML = "";
  (data.roadmap || []).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    roadmap.appendChild(li);
  });

  // 技能标签
  const tags = document.getElementById("d-tags");
  tags.innerHTML = "";
  (data.tags || []).forEach((tag) => {
    const span = document.createElement("span");
    span.className = "direction-card__tag";
    span.textContent = tag;
    tags.appendChild(span);
  });

  // 招新话术
  document.getElementById("d-quote").textContent = data.quote || "";
  document.title = (data.title || "方向详情") + " · 网络安全社";
}

/* 应用某个方向：更新导航高亮 + 渲染详情 + 触发内容淡入动画 */
function applyDirection(key) {
  const directions = getDirections();
  const data = directions.find((item) => item.key === key) || directions[0] || {};

  renderNav(DIRECTION_KEYS, key);
  if (data) renderDetail(data);

  // 内容平滑过渡，避免生硬跳变
  const card = document.querySelector(".direction-card");
  if (card) {
    card.classList.remove("is-switching");
    void card.offsetWidth;   // 强制重排，确保动画重新触发
    card.classList.add("is-switching");
  }
}

/* 切换方向：不刷新页面，用 history.pushState 更新地址栏 */
function navigate(key) {
  history.pushState({ d: key }, "", "direction.html?d=" + key);
  applyDirection(key);
}

// 浏览器前进 / 后退时同步内容
window.addEventListener("popstate", () => {
  applyDirection(getCurrentKey());
});

// 入口：初次加载渲染当前方向
applyDirection(getCurrentKey());
