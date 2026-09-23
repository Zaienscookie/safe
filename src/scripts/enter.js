/* =========================================================================
 * 网络安全社纳新主页 —— 页面交互引擎
 * -------------------------------------------------------------------------
 * 职责：
 *   1. 屏幕切换：进入页 → 授权过场 → 首页 → 各栏目（关于/纳新/方向/活动/互动）
 *   2. 侧边导航绑定、成员轮播、方向交互面板、活动计划、联系方式弹窗
 *   3. 与手势粒子模块（particle.js）协作：进入/离开「互动」栏目时启停摄像头
 *   4. 使用 site-copy.js 统一注入文案，使用 siteConfig 统一管理链接与联系方式
 *
 * 屏幕切换约定：
 *   所有 screen 均为 <section class="xxx-screen">，通过 toggle 它们的
 *   `.is-visible` 类控制显示（CSS 仅过渡 opacity）。aria-hidden 同步维护。
 * ========================================================================= */

/* ========================= 屏幕与核心元素引用 =========================
 * 每个变量对应 index.html 中的一个元素 ID。
 * 各 screen：
 *   enter-screen      进入页（欢迎页）
 *   auth-screen       授权过场（“下一步”按钮）
 *   homepage-screen   首页
 *   headquarters-screen 关于
 *   member-screen     纳新（成员轮播）
 *   department-screen 方向（交互面板）
 *   research-screen   活动（纳新计划）
 *   particle-screen   互动（手势粒子）
 */
const enterScreen = document.getElementById("enter-screen");
const enterButton = document.getElementById("enter-button");
const logoLottieContainer = document.getElementById("logo-lottie");
const logoFallback = document.getElementById("logo-fallback");
const authScreen = document.getElementById("auth-screen");
const authTypeLine = document.getElementById("auth-type-line");
const replayButton = document.getElementById("replay-intro");      // 授权过场上的「下一步」按钮
const homepageScreen = document.getElementById("homepage-screen");
const homepageReplay = document.getElementById("homepage-replay"); // 首页上的「重播开场」按钮
const headquartersScreen = document.getElementById("headquarters-screen");
const headquartersEnter = document.getElementById("headquarters-enter");
const memberScreen = document.getElementById("member-screen");
const departmentScreen = document.getElementById("department-screen");
const researchScreen = document.getElementById("research-screen");
const particleScreen = document.getElementById("particle-screen");

// —— 纳新栏目（member）轮播 ——
const memberCards = Array.from(document.querySelectorAll("[data-card]"));
const memberPrev = document.getElementById("member-prev");
const memberNext = document.getElementById("member-next");

// —— 方向栏目（department）交互面板 ——
const departmentCards = Array.from(document.querySelectorAll(".department-card"));
const departmentPanelMode = document.getElementById("department-panel-mode");
const departmentPanelTitle = document.getElementById("department-panel-title");
const departmentPanelSubtitle = document.getElementById("department-panel-subtitle");
const departmentPanelCopy = document.getElementById("department-panel-copy");
const departmentPanelLink = document.getElementById("department-panel-link");
const departmentPanel = document.querySelector(".department-panel");

// —— 活动栏目（research）—— 
const researchOpen = document.getElementById("research-open");
const researchInfoSwitches = Array.from(document.querySelectorAll("[data-research]"));
const researchProgressGrid = document.getElementById("research-progress-grid");
const researchProgressValue = document.getElementById("research-progress-value");
const researchStatus = document.getElementById("research-status");
const researchTitle = document.getElementById("research-title");
const researchSubtitle = document.getElementById("research-subtitle");
const researchCopy = document.getElementById("research-copy");
const researchLink = document.getElementById("research-link");
const researchInfo = document.getElementById("research-info");

// —— 首页快捷入口按钮与联系方式弹窗 ——
const quickLinkButtons = Array.from(document.querySelectorAll("[data-quick-link]"));
const infoModal = document.getElementById("info-modal");
const infoModalEyebrow = document.getElementById("info-modal-eyebrow");
const infoModalTitle = document.getElementById("info-modal-title");
const infoModalValue = document.getElementById("info-modal-value");
const infoModalCopy = document.getElementById("info-modal-copy");
const infoModalOpen = document.getElementById("info-modal-open");
const infoModalClose = document.getElementById("info-modal-close");
const infoModalBackdrop = document.querySelector("[data-modal-close]");

// —— 每个屏幕自己的侧边导航按钮（顺序：0首页 1关于 2纳新 3方向 4活动 5互动）——
const homepageNavButtons = homepageScreen ? homepageScreen.querySelectorAll(".side-nav__item") : [];
const headquartersNavButtons = headquartersScreen ? headquartersScreen.querySelectorAll(".side-nav__item") : [];
const memberNavButtons = memberScreen ? memberScreen.querySelectorAll(".side-nav__item") : [];
const departmentNavButtons = departmentScreen ? departmentScreen.querySelectorAll(".side-nav__item") : [];
const researchNavButtons = researchScreen ? researchScreen.querySelectorAll(".side-nav__item") : [];
const particleNavButtons = particleScreen ? particleScreen.querySelectorAll(".side-nav__item") : [];

/* ========================= 常量与运行状态 =========================
 * typeTarget        授权过场打字机动画逐字显示的文本
 * authTimer         授权过场「N 秒后自动进首页」的定时器句柄（离开/重置时需清除）
 * memberIndex       纳新轮播当前索引
 * modalValue        弹窗当前展示的值（邮箱/QQ，用于复制）
 * activeResearchIndex 活动栏目当前选中的计划索引
 *
 * 说明：本项目为纯静态、无痕运行——不使用 localStorage / Cookie，
 *       刷新页面即回到进入页，所有状态即时销毁。
 */
const typeTarget = "MEMBER ACCESS GRANTED";
let typeTimer;
let authTimer = null;
let memberIndex = 0;
let modalValue = "";
let activeResearchIndex = 0;
let logoAnimation;
let researchProgressFrame;
let currentSection = "homepage";
  setThemeColor("#e8e8e8"); // 记录当前所在的栏目，供外部页面“返回原栏目”使用

/* ========================= 全站链接与联系方式 =========================
 * ★ 这里是发布前需要替换的核心配置 ★
 * links：
 *   ctf      → 方向栏目「CTF 靶场入口」的跳转地址
 *   blog     → 首页「报名问卷」入口
 *   github   → 首页「社团仓库」入口
 *   article* → 其余入口的占位链接（暂为 #）
 * contact：
 *   email / qq → 首页邮箱、QQ 群入口弹窗展示的内容
 */
const siteConfig = {
  links: {
    web: "direction.html?d=web",
    rev: "direction.html?d=rev",
    pwn: "direction.html?d=pwn",
    cry: "direction.html?d=cry",
    ops: "direction.html?d=ops",
    ctf: "https://oj.zain-dev.top/",
    range: "http://192.168.89.28:8080/",   // 内网靶场（需探测可达性）
    honor: "honors.html",   // 战绩 · 荣誉殿堂 → 荣誉页
    training: "training.html", // 学习 · 训练 → 培养体系页
    join: "join.html",   // 加入我们 → 加入页（手机号/二维码）
    quiz: "quiz.html",   // 极客问卷 → 技术人格测试（单文件纯前端）
    flag: "flag.html",   // FLAG 题 → 提交 flag 挑战
    blog: "https://example.com/signup",
    github: "notice.html",   // 社团仓库改为内部提示页（仅社团内部使用）
    article2: "notice.html",   // 靶场 · 实验环境 → 内部提示页
    article3: "#",
    article4: "#",
    article5: "#",
  },
  contact: {
    email: "18518184798@163.com",
    qq: "123456789",
  },
};

/* 活动栏目（research）的三项纳新计划，供切换按钮展示
 * （site-copy.js 的 research.items 会在页面加载时覆盖这里的文案）
 */
const researchItems = [
  {
    status: "R-1 / PRIMARY FOCUS",
    title: "纳新宣讲会",
    subtitle: "RECRUITMENT TALK",
    copy: "面向全校同学举办纳新宣讲，介绍社团方向、训练体系与加入方式。",
    link: siteConfig.links.article4,
  },
  {
    status: "R-2 / BASICS BOOTCAMP",
    title: "安全基础训练营",
    subtitle: "LINUX / NETWORK / WEB",
    copy: "从 Linux、网络协议到 Web 基础，带零基础同学完成入门前的完整准备。",
    link: siteConfig.links.article3,
  },
  {
    status: "R-3 / CTF TRAINING",
    title: "CTF 训练与周赛",
    subtitle: "WEB / REV / PWN / CRYPTO",
    copy: "每周训练与周赛，按方向分组带练，为校内外比赛做准备。",
    link: siteConfig.links.article5,
  },
];

/* 首页快捷入口配置（data-quick-link 对应）：
 *   type: 'link'   → 点击直接新开标签页
 *   type: 'modal'  → 点击弹出联系方式弹窗（邮箱/QQ）
 */
const quickLinkConfig = {
  signup: {
    type: "link",
    url: siteConfig.links.quiz,
  },
  github: {
    type: "link",
    url: siteConfig.links.github,
  },
  email: {
    type: "modal",
    eyebrow: "EMAIL",
    title: "PRIMARY CONTACT",
    value: siteConfig.contact.email,
    openLabel: "OPEN MAIL CLIENT",
    openHref: `mailto:${siteConfig.contact.email}`,
  },
  qq: {
    type: "link",
    url: siteConfig.links.join,   // 点击进入纳新页（手机号 / 微信群二维码）
  },
  flag: {
    type: "link",
    url: siteConfig.links.flag,   // FLAG 题 → flag.html
  },
};

// 设置元素纯文本（安全，不解析 HTML）
function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) {
    node.textContent = value;
  }
}

// 设置元素 HTML 内容（用于带样式标签的文案，如加亮字）
function setHtml(selector, value) {
  const node = document.querySelector(selector);
  if (node) {
    node.innerHTML = value;
  }
}

/* 给跳转到外部子页面的链接追加“来源栏目”参数（from=当前栏目）。
 * 外部子页面（direction/honors/training/join/notice）的“返回主站”
 * 会根据这个参数回到进入前所在的栏目，而不是首页。
 * 绝对外链（http/https）不追加，跳到外部域名无法带栏目返回。
 */
function withFrom(url) {
  if (!url || typeof url !== "string" || url === "#" || url === "") {
    return url;
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  const sep = url.indexOf("?") >= 0 ? "&" : "?";
  return url + sep + "from=" + encodeURIComponent(currentSection);
}

/* 方向栏目「靶场 · 实验环境」入口：
 * 先探测内网靶场 http://192.168.89.28:8080/ 是否可达——
 *   - 可达（服务器在响应）→ 打开靶场；
 *   - 不可达 / 4 秒超时 → 打开提示页 notice.html（仅社团内部使用）。
 * 探测用 fetch + no-cors + 超时信号，纯前端实现，不影响其它入口。
 */
function openRange() {
  const rangeUrl = siteConfig.links.range;
  const fallback = withFrom(siteConfig.links.article2); // article2 = notice.html
  try {
    fetch(rangeUrl, {
      mode: "no-cors",
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    })
      .then(() => {
        window.open(rangeUrl, "_blank", "noopener,noreferrer");
      })
      .catch(() => {
        window.open(fallback, "_blank", "noopener,noreferrer");
      });
  } catch (e) {
    window.open(fallback, "_blank", "noopener,noreferrer");
  }
}

/* 用 window.siteCopy（site-copy.js 定义）批量覆盖页面文案。
 * 这样改文案只需编辑 site-copy.js，无需改动 HTML。
 * 同时把 site-copy.js 中 department 的数据同步到卡片 data-* 属性，
 * 并把 research 数据合并进 researchItems。
 */
function applyCopyUpdates() {
  const copy = window.siteCopy || {};
  const links = siteConfig.links;

  document.querySelectorAll(".brand-mark__title").forEach((title) => {
    title.textContent = copy.brandTitle || "ZORRO";
  });

  setText(".enter-panel__title", copy.enter?.title || "ENTER ZORRO LAB");
  setText(".enter-panel__copy", copy.enter?.copy || "");
  setText(".enter-panel__hint", copy.enter?.hint || "");
  setText(".auth-screen__subcopy", copy.auth?.subcopy || "");

  if (copy.homepage?.titleHtml) {
    setHtml(".homepage-copy__title", copy.homepage.titleHtml);
  }

  const homepageLines = document.querySelectorAll(".homepage-copy__summary .homepage-copy__line");
  (copy.homepage?.lines || []).forEach((text, index) => {
    if (homepageLines[index]) {
      homepageLines[index].textContent = text;
    }
  });

  if (copy.headquarters?.summaryHtml) {
    setHtml(".headquarters-copy__summary", copy.headquarters.summaryHtml);
  }

  if (copy.headquarters?.statusHtml) {
    setHtml(".headquarters-copy__status-value", copy.headquarters.statusHtml);
  }

  document.querySelectorAll(".member-card__desc").forEach((desc, index) => {
    const text = copy.memberDescriptions?.[index];
    if (text) {
      desc.textContent = text;
    }
  });

  departmentCards.forEach((card, index) => {
    const item = copy.department?.[index];
    if (!item) {
      return;
    }

    card.dataset.panelMode = item.mode || "CAPABILITY MATRIX";
    card.dataset.panelTitle = item.title || "";
    card.dataset.panelSubtitle = item.subtitle || "";
    card.dataset.panelCopy = item.copy || "";
    // 卡片入口链接：点击方向卡片会打开独立详情页 direction.html?d=xxx
    card.dataset.link = item.linkKey && links[item.linkKey] ? links[item.linkKey] : "";
  });

  (copy.research?.items || []).forEach((item, index) => {
    if (!researchItems[index]) {
      return;
    }

    researchItems[index] = {
      ...researchItems[index],
      status: item.status || researchItems[index].status,
      title: item.title || researchItems[index].title,
      subtitle: item.subtitle || researchItems[index].subtitle,
      copy: item.copy || researchItems[index].copy,
      link: item.linkKey && links[item.linkKey] ? links[item.linkKey] : researchItems[index].link,
    };
  });

  setText(".research-panel__title", copy.research?.panelTitle || "");
  setText(".research-progress__label", copy.research?.progressLabel || "");
  setText(".research-panel__quote", copy.research?.quote || "");

  if (copy.contactModal?.emailTitle) {
    quickLinkConfig.email.title = copy.contactModal.emailTitle;
  }

  if (copy.contactModal?.qqTitle) {
    quickLinkConfig.qq.title = copy.contactModal.qqTitle;
  }
}

/* 授权过场打字机动画：逐字符显示 typeTarget，模拟系统校验输出 */
function runTypewriter() {
  if (!authTypeLine) {
    return;
  }

  window.clearTimeout(typeTimer);
  authTypeLine.textContent = "";

  let index = 0;

  const step = () => {
    authTypeLine.textContent = typeTarget.slice(0, index);
    index += 1;

    if (index <= typeTarget.length) {
      typeTimer = window.setTimeout(step, 58); // 每 58ms 增加一个字符
    }
  };

  step();
}

/* 进入授权过场（点击「进入」后 520ms 触发）：
 *   - 显示 auth 屏幕 + 播放打字动画
 *   - 不自动跳转，用户点击「下一步」按钮后才进入首页
 * 纯静态无痕：不使用 localStorage，刷新即回到进入页。
 */
function showAuthScreen() {
  if (!authScreen) {
    return;
  }

  authScreen.classList.add("is-visible");
  authScreen.setAttribute("aria-hidden", "false");
  runTypewriter();
}

/* 显示首页：移除授权过场的可见态，显示首页。
 * 同时调用 hideParticle() 兜底，确保任何入口进来时互动摄像头处于停止状态。
 */
function showHomepage() {
  if (!homepageScreen || !authScreen) {
    return;
  }

  currentSection = "homepage";
  setThemeColor("#e8e8e8");
  authScreen.classList.remove("is-visible");
  authScreen.setAttribute("aria-hidden", "true");
  hideParticle();
  homepageScreen.classList.add("is-visible");
  homepageScreen.setAttribute("aria-hidden", "false");
}

/* ========================= 屏幕切换函数 =========================
 * 统一的切换套路：先把其它屏幕的 .is-visible 移除（隐藏），
 * 再给自己加上 .is-visible（显示）。任何从「互动」离开的路径
 * 都会先调用 hideParticle() 停掉摄像头，避免后台耗电。
 */

// 显示「关于」屏幕
function showHeadquarters() {
  if (!headquartersScreen) {
    return;
  }

  currentSection = "headquarters";
  loadHqBg();
  setThemeColor("#e8e8e8");
  hideParticle();

  if (homepageScreen) {
    homepageScreen.classList.remove("is-visible");
    homepageScreen.setAttribute("aria-hidden", "true");
  }

  if (memberScreen) {
    memberScreen.classList.remove("is-visible");
    memberScreen.setAttribute("aria-hidden", "true");
  }

  if (departmentScreen) {
    departmentScreen.classList.remove("is-visible");
    departmentScreen.setAttribute("aria-hidden", "true");
  }

  headquartersScreen.classList.add("is-visible");
  headquartersScreen.setAttribute("aria-hidden", "false");
}

// 显示「纳新」屏幕（成员轮播），并刷新轮播状态
function showMember() {
  if (!memberScreen) {
    return;
  }

  currentSection = "member";
  setThemeColor("#e8e8e8");
  hideParticle();

  if (homepageScreen) {
    homepageScreen.classList.remove("is-visible");
    homepageScreen.setAttribute("aria-hidden", "true");
  }

  if (headquartersScreen) {
    headquartersScreen.classList.remove("is-visible", "is-transitioning");
    headquartersScreen.setAttribute("aria-hidden", "true");
  }

  if (departmentScreen) {
    departmentScreen.classList.remove("is-visible");
    departmentScreen.setAttribute("aria-hidden", "true");
  }

  memberScreen.classList.add("is-visible");
  memberScreen.setAttribute("aria-hidden", "false");
  updateMemberCarousel();
}

// 显示「方向」屏幕
function showDepartment() {
  if (!departmentScreen) {
    return;
  }

  currentSection = "department";
  setThemeColor("#e8e8e8");
  hideParticle();

  if (homepageScreen) {
    homepageScreen.classList.remove("is-visible");
    homepageScreen.setAttribute("aria-hidden", "true");
  }

  if (headquartersScreen) {
    headquartersScreen.classList.remove("is-visible", "is-transitioning");
    headquartersScreen.setAttribute("aria-hidden", "true");
  }

  if (memberScreen) {
    memberScreen.classList.remove("is-visible");
    memberScreen.setAttribute("aria-hidden", "true");
  }

  departmentScreen.classList.add("is-visible");
  departmentScreen.setAttribute("aria-hidden", "false");
}

// 显示「活动」屏幕，并重播进度动画
function showResearch() {
  if (!researchScreen) {
    return;
  }

  currentSection = "research";
  setThemeColor("#0b0b10");
  hideParticle();

  if (homepageScreen) {
    homepageScreen.classList.remove("is-visible");
    homepageScreen.setAttribute("aria-hidden", "true");
  }

  if (headquartersScreen) {
    headquartersScreen.classList.remove("is-visible", "is-transitioning");
    headquartersScreen.setAttribute("aria-hidden", "true");
  }

  if (memberScreen) {
    memberScreen.classList.remove("is-visible");
    memberScreen.setAttribute("aria-hidden", "true");
  }

  if (departmentScreen) {
    departmentScreen.classList.remove("is-visible");
    departmentScreen.setAttribute("aria-hidden", "true");
  }

  researchScreen.classList.add("is-visible");
  researchScreen.setAttribute("aria-hidden", "false");
  restartResearchProgress();
  playBgVideo();
}

/* 隐藏互动屏幕并停止手势粒子（stop 摄像头+渲染）。
 * window.SecParticles 由 particle.js 模块提供；未加载时静默跳过。
 */
/* 活动栏目的背景视频（约 17MB）：延迟到进入「活动」栏目时才播放，
 * 配合 HTML 的 preload="none"，避免首屏就下载大视频。 */
function loadHqBg() {
  const bg = document.querySelector(".headquarters-screen__bg");
  if (bg && !bg.dataset.bgLoaded) {
    bg.style.backgroundImage = "linear-gradient(90deg, rgba(0,0,0,0.34), rgba(0,0,0,0.06) 42%, rgba(0,0,0,0.22) 100%), url('./assets/images/backgrounds/headquarters_bg.jpg')";
    bg.dataset.bgLoaded = "1";
  }
}
function setThemeColor(c) {
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute("content", c);
}
const researchVideo = document.querySelector(".research-screen__video");
function playBgVideo() {
  if (!researchVideo) {
    return;
  }
  // 移动端兼容：静音 + 内联 + autoplay 属性，尽量触发自动播放（poster 兜底显示封面）
  researchVideo.muted = true;
  researchVideo.setAttribute("playsinline", "");
  researchVideo.setAttribute("webkit-playsinline", "");
  researchVideo.setAttribute("autoplay", "");

  const attempt = () => {
    const p = researchVideo.play();
    if (p && p.catch) {
      p.catch(() => {});
    }
  };

  if (researchVideo.readyState < 2) {
    researchVideo.addEventListener("canplay", attempt, { once: true });
    researchVideo.addEventListener("loadeddata", attempt, { once: true });
    if (researchVideo.readyState === 0) {
      try {
        researchVideo.load();
      } catch (e) {
        /* 忽略 */
      }
    }
  }
  attempt();
}
/* 若自动播放被浏览器拦截：用户首次触摸/点击活动栏目时再尝试播放 */
document.addEventListener("pointerdown", () => {
  if (researchVideo && researchVideo.paused && researchScreen && researchScreen.classList.contains("is-visible")) {
    researchVideo.play().catch(() => {});
  }
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && researchVideo && researchVideo.paused && researchScreen && researchScreen.classList.contains("is-visible")) {
    researchVideo.play().catch(() => {});
  }
});

function pauseBgVideo() {
  if (researchVideo) {
    researchVideo.pause();
    // 移除 autoplay 标记：离开活动栏目后不再具备自动播放能力，
    // 避免部分内核（X5）在其它界面把它提升为全屏播放器。
    researchVideo.removeAttribute("autoplay");
  }
}
function hideParticle() {
  pauseBgVideo();
  if (!particleScreen) {
    return;
  }

  particleScreen.classList.remove("is-visible");
  particleScreen.setAttribute("aria-hidden", "true");

  if (window.SecParticles) {
    window.SecParticles.stop();
  }
}

/* 是否移动设备（用于禁止手机端进入手势粒子）。
 * 仅按 UA 判断，与 landscape.js 保持一致：触屏笔记本不会被误判为手机。 */
function isMobileDevice() {
  const ua = navigator.userAgent || "";
  return /Mobi|Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
}

/* 移动端禁止进入手势粒子的提示弹窗（复用 visit-tip.js 注入的样式类） */
function showParticleBlocked() {
  const overlay = document.createElement("div");
  overlay.className = "visit-tip-guard is-show";
  overlay.innerHTML =
    '<div class="visit-tip__box">' +
      '<p class="visit-tip__kicker">NOT SUPPORTED · 暂不支持</p>' +
      '<h2 class="visit-tip__title">手势粒子互动</h2>' +
      '<p class="visit-tip__text">该项目仅支持电脑端访问，请使用电脑端体验手势粒子互动。</p>' +
      '<button class="visit-tip__btn" type="button">知道了</button>' +
    '</div>';

  function close() {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest(".visit-tip__btn")) close();
  });
  document.body.appendChild(overlay);
}

/* 显示互动屏幕并启动手势粒子（首次进入时懒加载摄像头与模型）。
 * 隐藏其它屏幕后再启动，避免粒子在背后继续运行。
 * 手机端（触屏移动设备）禁止访问：提示仅支持电脑端。
 */
function showParticle() {
  if (!particleScreen) {
    return;
  }

  // 手机端禁止进入手势粒子，并给出提示
  if (isMobileDevice()) {
    showParticleBlocked();
    return;
  }

  currentSection = "particle";
  setThemeColor("#0b0b10");

  if (homepageScreen) {
    homepageScreen.classList.remove("is-visible");
    homepageScreen.setAttribute("aria-hidden", "true");
  }

  if (headquartersScreen) {
    headquartersScreen.classList.remove("is-visible", "is-transitioning");
    headquartersScreen.setAttribute("aria-hidden", "true");
  }

  if (memberScreen) {
    memberScreen.classList.remove("is-visible");
    memberScreen.setAttribute("aria-hidden", "true");
  }

  if (departmentScreen) {
    departmentScreen.classList.remove("is-visible");
    departmentScreen.setAttribute("aria-hidden", "true");
  }

  if (researchScreen) {
    researchScreen.classList.remove("is-visible");
    researchScreen.setAttribute("aria-hidden", "true");
  }

  particleScreen.classList.add("is-visible");
  particleScreen.setAttribute("aria-hidden", "false");

  if (window.SecParticles) {
    window.SecParticles.start();
  }
}

/* 方向栏目：把鼠标悬停/聚焦的卡片信息同步到中央面板。
 * 若卡片带 data-link（入口类），面板显示「进入入口」并可跳转；
 * 否则只展示说明文字（仅信息）。
 */
function updateDepartmentPanel(card) {
  if (!card || !departmentPanelTitle || !departmentPanelSubtitle || !departmentPanelCopy || !departmentPanelLink || !departmentPanelMode) {
    return;
  }

  // 触发一次轻量“刷新”动画（重排后加类再移除）
  if (departmentPanel) {
    departmentPanel.classList.remove("is-refreshing");
    void departmentPanel.offsetWidth;
    departmentPanel.classList.add("is-refreshing");
    window.setTimeout(() => {
      departmentPanel.classList.remove("is-refreshing");
    }, 280);
  }

  // 高亮当前卡片，并把它的 data-* 写入面板
  departmentCards.forEach((item) => item.classList.remove("is-active"));
  card.classList.add("is-active");

  departmentPanelMode.textContent = card.dataset.panelMode || "CAPABILITY MATRIX";
  departmentPanelTitle.textContent = card.dataset.panelTitle || "";
  departmentPanelSubtitle.textContent = card.dataset.panelSubtitle || "";
  departmentPanelCopy.textContent = card.dataset.panelCopy || "";
  departmentPanelCopy.style.display = card.dataset.panelCopy ? "" : "none";

  // 有链接 → 显示入口按钮（点击打开详情页）；否则仅信息
  const link = card.dataset.link;
  if (link) {
    departmentPanelLink.textContent = "查看详情 · OPEN";
    departmentPanelLink.href = withFrom(link);
    departmentPanelLink.setAttribute("aria-disabled", "false");
    departmentPanelLink.classList.add("is-link");
  } else {
    departmentPanelLink.textContent = "仅信息 INFO";
    departmentPanelLink.href = "#";
    departmentPanelLink.setAttribute("aria-disabled", "true");
    departmentPanelLink.classList.remove("is-link");
  }
}

/* 纳新栏目轮播：根据 memberIndex 计算每张卡片的相对位置类。
 * 环形处理（首尾相接），用 diff 的模来判断 active/prev/next 等。
 */
function updateMemberCarousel() {
  if (!memberCards.length) {
    return;
  }

  memberCards.forEach((card, index) => {
    card.classList.remove("is-active", "is-prev", "is-next", "is-far-prev", "is-far-next");

    const total = memberCards.length;
    let diff = index - memberIndex;

    // 环形距离：超过一半则取另一侧
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;

    if (diff === 0) card.classList.add("is-active");
    else if (diff === -1) card.classList.add("is-prev");
    else if (diff === 1) card.classList.add("is-next");
    else if (diff === -2) card.classList.add("is-far-prev");
    else if (diff === 2) card.classList.add("is-far-next");
  });
}

/* 活动栏目：切换到第 index 项计划（标题/说明/链接），并重播进度动画 */
function updateResearch(index) {
  const item = researchItems[index];
  if (!item || !researchStatus || !researchTitle || !researchSubtitle || !researchCopy || !researchLink) {
    return;
  }

  // 内容切换时的刷新动画
  if (researchInfo) {
    researchInfo.classList.remove("is-refreshing");
    void researchInfo.offsetWidth;
    researchInfo.classList.add("is-refreshing");
    window.setTimeout(() => {
      researchInfo.classList.remove("is-refreshing");
    }, 300);
  }

  activeResearchIndex = index;

  researchInfoSwitches.forEach((button, buttonIndex) => {
    button.classList.toggle("is-active", buttonIndex === index);
  });

  researchStatus.textContent = item.status;
  researchTitle.textContent = item.title;
  researchSubtitle.textContent = item.subtitle;
  researchCopy.textContent = item.copy;
  researchLink.href = item.link;
  restartResearchProgress();
}

/* 重播活动栏目的“进度点阵 + 百分比”动画（约 1 秒） */
function restartResearchProgress() {
  if (!researchProgressGrid || !researchProgressValue) {
    return;
  }

  researchProgressGrid.classList.remove("is-animating");
  researchProgressValue.textContent = "0%";

  if (researchProgressFrame) {
    cancelAnimationFrame(researchProgressFrame);
  }

  // 强制重排，确保动画从头播放
  void researchProgressGrid.offsetWidth;
  researchProgressGrid.classList.add("is-animating");

  const start = performance.now();
  const duration = 1020;

  function tick(now) {
    const elapsed = Math.min(now - start, duration);
    const progress = elapsed / duration;
    researchProgressValue.textContent = `${Math.round(progress * 100)}%`;

    if (elapsed < duration) {
      researchProgressFrame = requestAnimationFrame(tick);
    }
  }

  researchProgressFrame = requestAnimationFrame(tick);
}

/* 打开联系方式弹窗（邮箱/QQ 等），展示 value 并提供复制/打开 */
function openInfoModal(config) {
  if (!infoModal || !infoModalEyebrow || !infoModalTitle || !infoModalValue || !infoModalCopy || !infoModalOpen) {
    return;
  }

  modalValue = config.value || "";
  infoModalEyebrow.textContent = config.eyebrow || "CONTACT";
  infoModalTitle.textContent = config.title || "";
  infoModalValue.textContent = modalValue;
  infoModalOpen.textContent = config.openLabel || "OPEN";
  infoModalOpen.href = config.openHref || "#";
  infoModal.classList.add("is-visible");
  infoModal.setAttribute("aria-hidden", "false");
}

// 关闭联系方式弹窗
function closeInfoModal() {
  if (!infoModal) {
    return;
  }

  infoModal.classList.remove("is-visible");
  infoModal.setAttribute("aria-hidden", "true");
}

/* 加载进入页 Logo 动画（lottie）。
 * 成功加载则隐藏静态图片兜底；lottie 不可用（如离线且无 CDN）时保留静态图。
 */
function setupLottieLogo() {
  if (!window.lottie || !logoLottieContainer) {
    return;
  }

  try {
    logoAnimation = window.lottie.loadAnimation({
      container: logoLottieContainer,
      renderer: "svg",
      loop: false,
      autoplay: true,
      animationData: window.rhineLogoAnimationData,
      rendererSettings: {
        preserveAspectRatio: "xMidYMid meet",
      },
    });

    logoAnimation.addEventListener("DOMLoaded", () => {
      logoLottieContainer.classList.add("is-ready");
      if (logoFallback) {
        logoFallback.classList.add("is-hidden");
      }
    });
  } catch {
    // lottie 失败：显示静态 logo 图片
    if (logoFallback) {
      logoFallback.classList.remove("is-hidden");
    }
  }
}

/* 重置开场：回到进入页（隐藏所有屏幕、恢复进入页可见）。
 * 会先取消授权过场的自动跳转定时器 authTimer——这很重要：
 * 若不清除，残留的定时器会在稍后“偷偷”跳转，造成乱跳屏。
 */
function resetIntro() {
  if (authTimer) {
    window.clearTimeout(authTimer);
    authTimer = null;
  }

  if (authScreen) {
    authScreen.classList.remove("is-visible");
    authScreen.setAttribute("aria-hidden", "true");
  }

  if (enterScreen) {
    enterScreen.classList.remove("is-transitioning");
  }

  if (enterButton) {
    enterButton.classList.remove("is-activated");
  }

  if (homepageScreen) {
    homepageScreen.classList.remove("is-visible");
    homepageScreen.setAttribute("aria-hidden", "true");
  }

  if (headquartersScreen) {
    headquartersScreen.classList.remove("is-visible", "is-transitioning");
    headquartersScreen.setAttribute("aria-hidden", "true");
  }

  if (memberScreen) {
    memberScreen.classList.remove("is-visible");
    memberScreen.setAttribute("aria-hidden", "true");
  }

  if (departmentScreen) {
    departmentScreen.classList.remove("is-visible");
    departmentScreen.setAttribute("aria-hidden", "true");
  }

  if (researchScreen) {
    researchScreen.classList.remove("is-visible");
    researchScreen.setAttribute("aria-hidden", "true");
  }

  hideParticle();

  if (authTypeLine) {
    authTypeLine.textContent = typeTarget;
  }

  if (logoAnimation) {
    logoAnimation.stop();
    logoAnimation.goToAndPlay(0, true);
  }
}

/* ========================= 事件绑定 ========================= */

// —— 进入页：「进入」按钮 ——
// 点击后按钮高亮 + 进入页淡出，520ms 后显示授权过场
if (enterButton && enterScreen) {
  enterButton.addEventListener("click", () => {
    enterButton.classList.add("is-activated");
    enterScreen.classList.add("is-transitioning");

    window.setTimeout(() => {
      showAuthScreen();
    }, 520);
  });
}

// —— 首页：「重播开场」按钮 —— 回到进入页重播开场
if (homepageReplay) {
  homepageReplay.addEventListener("click", () => {
    resetIntro();
  });
}

// —— 授权过场：「下一步」按钮 —— 取消自动定时器，立即进入首页
if (replayButton) {
  replayButton.addEventListener("click", () => {
    if (authTimer) {
      window.clearTimeout(authTimer);
      authTimer = null;
    }
    showHomepage();
  });
}

// —— 首页快捷入口：type=link 新开标签页；type=modal 弹联系方式 ——
quickLinkButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.quickLink;
    const config = quickLinkConfig[key];
    if (!config) {
      return;
    }

    if (config.type === "link" && config.url) {
      window.open(withFrom(config.url), "_blank", "noopener,noreferrer");
      return;
    }

    if (config.type === "modal") {
      openInfoModal(config);
    }
  });
});

// —— 首页：「进入互动体验」按钮 —— 直接进入手势粒子栏目
const homepageExperience = document.getElementById("homepage-experience");
if (homepageExperience) {
  homepageExperience.addEventListener("click", showParticle);
}

/* ========================= 侧边导航绑定 =========================
 * 每个屏幕都带一组侧边导航按钮（index.html 里 6 个）：
 *   0 首页 / 1 关于 / 2 纳新 / 3 方向 / 4 活动 / 5 互动
 * 下面为每个屏幕分别绑定。交互规律一致：切到自己时调用对应 show*，
 * 切到别处时直接移除自己的 is-visible 并显示目标屏幕。
 */

// —— 首页导航 ——
if (homepageScreen) {
  const headquartersNavButton = homepageNavButtons[1];
  if (headquartersNavButton) {
    headquartersNavButton.addEventListener("click", showHeadquarters);
  }

  const memberNavButton = homepageNavButtons[2];
  if (memberNavButton) {
    memberNavButton.addEventListener("click", showMember);
  }

  const departmentNavButton = homepageNavButtons[3];
  if (departmentNavButton) {
    departmentNavButton.addEventListener("click", showDepartment);
  }

  const researchNavButton = homepageNavButtons[4];
  if (researchNavButton) {
    researchNavButton.addEventListener("click", showResearch);
  }

  const particleNavButton = homepageNavButtons[5];
  if (particleNavButton) {
    particleNavButton.addEventListener("click", showParticle);
  }
}

if (headquartersScreen) {
  const homepageNavButton = headquartersNavButtons[0];
  if (homepageNavButton) {
    homepageNavButton.addEventListener("click", () => {
      headquartersScreen.classList.remove("is-visible", "is-transitioning");
      headquartersScreen.setAttribute("aria-hidden", "true");
      homepageScreen.classList.add("is-visible");
      homepageScreen.setAttribute("aria-hidden", "false");
    });
  }

  const memberNavButton = headquartersNavButtons[2];
  if (memberNavButton) {
    memberNavButton.addEventListener("click", showMember);
  }

  const departmentNavButton = headquartersNavButtons[3];
  if (departmentNavButton) {
    departmentNavButton.addEventListener("click", showDepartment);
  }

  const researchNavButton = headquartersNavButtons[4];
  if (researchNavButton) {
    researchNavButton.addEventListener("click", showResearch);
  }

  const particleNavButton = headquartersNavButtons[5];
  if (particleNavButton) {
    particleNavButton.addEventListener("click", showParticle);
  }
}

if (memberScreen) {
  const homepageNavButton = memberNavButtons[0];
  if (homepageNavButton) {
    homepageNavButton.addEventListener("click", () => {
      memberScreen.classList.remove("is-visible");
      memberScreen.setAttribute("aria-hidden", "true");
      homepageScreen.classList.add("is-visible");
      homepageScreen.setAttribute("aria-hidden", "false");
    });
  }

  const headquartersNavButton = memberNavButtons[1];
  if (headquartersNavButton) {
    headquartersNavButton.addEventListener("click", () => {
      memberScreen.classList.remove("is-visible");
      memberScreen.setAttribute("aria-hidden", "true");
      headquartersScreen.classList.add("is-visible");
      headquartersScreen.setAttribute("aria-hidden", "false");
    });
  }

  const departmentNavButton = memberNavButtons[3];
  if (departmentNavButton) {
    departmentNavButton.addEventListener("click", showDepartment);
  }

  const researchNavButton = memberNavButtons[4];
  if (researchNavButton) {
    researchNavButton.addEventListener("click", showResearch);
  }

  const particleNavButton = memberNavButtons[5];
  if (particleNavButton) {
    particleNavButton.addEventListener("click", showParticle);
  }
}

if (departmentScreen) {
  const homepageNavButton = departmentNavButtons[0];
  if (homepageNavButton) {
    homepageNavButton.addEventListener("click", () => {
      departmentScreen.classList.remove("is-visible");
      departmentScreen.setAttribute("aria-hidden", "true");
      homepageScreen.classList.add("is-visible");
      homepageScreen.setAttribute("aria-hidden", "false");
    });
  }

  const headquartersNavButton = departmentNavButtons[1];
  if (headquartersNavButton) {
    headquartersNavButton.addEventListener("click", () => {
      departmentScreen.classList.remove("is-visible");
      departmentScreen.setAttribute("aria-hidden", "true");
      headquartersScreen.classList.add("is-visible");
      headquartersScreen.setAttribute("aria-hidden", "false");
    });
  }

  const memberNavButton = departmentNavButtons[2];
  if (memberNavButton) {
    memberNavButton.addEventListener("click", () => {
      departmentScreen.classList.remove("is-visible");
      departmentScreen.setAttribute("aria-hidden", "true");
      memberScreen.classList.add("is-visible");
      memberScreen.setAttribute("aria-hidden", "false");
      updateMemberCarousel();
    });
  }

  const researchNavButton = departmentNavButtons[4];
  if (researchNavButton) {
    researchNavButton.addEventListener("click", showResearch);
  }

  const particleNavButton = departmentNavButtons[5];
  if (particleNavButton) {
    particleNavButton.addEventListener("click", showParticle);
  }
}

if (researchScreen) {
  const homepageNavButton = researchNavButtons[0];
  if (homepageNavButton) {
    homepageNavButton.addEventListener("click", () => {
      researchScreen.classList.remove("is-visible");
      researchScreen.setAttribute("aria-hidden", "true");
      homepageScreen.classList.add("is-visible");
      homepageScreen.setAttribute("aria-hidden", "false");
    });
  }

  const headquartersNavButton = researchNavButtons[1];
  if (headquartersNavButton) {
    headquartersNavButton.addEventListener("click", showHeadquarters);
  }

  const memberNavButton = researchNavButtons[2];
  if (memberNavButton) {
    memberNavButton.addEventListener("click", showMember);
  }

  const departmentNavButton = researchNavButtons[3];
  if (departmentNavButton) {
    departmentNavButton.addEventListener("click", showDepartment);
  }

  const particleNavButton = researchNavButtons[5];
  if (particleNavButton) {
    particleNavButton.addEventListener("click", showParticle);
  }
}

if (particleScreen) {
  const homepageNavButton = particleNavButtons[0];
  if (homepageNavButton) {
    homepageNavButton.addEventListener("click", showHomepage);
  }

  const headquartersNavButton = particleNavButtons[1];
  if (headquartersNavButton) {
    headquartersNavButton.addEventListener("click", showHeadquarters);
  }

  const memberNavButton = particleNavButtons[2];
  if (memberNavButton) {
    memberNavButton.addEventListener("click", showMember);
  }

  const departmentNavButton = particleNavButtons[3];
  if (departmentNavButton) {
    departmentNavButton.addEventListener("click", showDepartment);
  }

  const researchNavButton = particleNavButtons[4];
  if (researchNavButton) {
    researchNavButton.addEventListener("click", showResearch);
  }
}

if (headquartersEnter && headquartersScreen) {
  headquartersEnter.addEventListener("click", () => {
    headquartersScreen.classList.add("is-transitioning");

    window.setTimeout(() => {
      headquartersScreen.classList.remove("is-transitioning");
      window.open(withFrom(siteConfig.links.join), "_blank", "noopener,noreferrer");
    }, 980);
  });
}

if (memberPrev) {
  memberPrev.addEventListener("click", () => {
    memberIndex = (memberIndex - 1 + memberCards.length) % memberCards.length;
    updateMemberCarousel();
  });
}

if (memberNext) {
  memberNext.addEventListener("click", () => {
    memberIndex = (memberIndex + 1) % memberCards.length;
    updateMemberCarousel();
  });
}

memberCards.forEach((card, index) => {
  card.addEventListener("click", () => {
    memberIndex = index;
    updateMemberCarousel();
  });
});

departmentCards.forEach((card) => {
  card.addEventListener("mouseenter", () => {
    updateDepartmentPanel(card);
  });

  card.addEventListener("focus", () => {
    updateDepartmentPanel(card);
  });

if (card.classList.contains("is-link")) {
  card.addEventListener("click", () => {
    const { link } = card.dataset;
    if (!link) {
      return;
    }
    // 靶场 · 实验环境：先探测内网靶场，可达则进入，否则打开提示页
    if (link === siteConfig.links.range) {
      openRange();
      return;
    }
    window.open(withFrom(link), "_blank", "noopener,noreferrer");
  });
}
});

researchInfoSwitches.forEach((button, index) => {
  button.addEventListener("click", () => updateResearch(index));
});

applyCopyUpdates();
updateMemberCarousel();
if (departmentCards.length) {
  updateDepartmentPanel(departmentCards[0]);
}
updateResearch(0);

if (researchOpen) {
  researchOpen.addEventListener("click", () => {
    // 「查看纳新安排」→ 打开培养体系页 training.html（含三段小标题文案）
    // 移动端浏览器常拦截 window.open：新标签失败时回退为当前页跳转，
    // 保证任何设备都能真正打开页面（training.html 通过 ?from= 支持返回本栏目）。
    const url = withFrom(siteConfig.links.training);
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      window.location.href = url;
    }
  });
}

if (infoModalCopy) {
  infoModalCopy.addEventListener("click", async () => {
    if (!modalValue) {
      return;
    }

    try {
      await navigator.clipboard.writeText(modalValue);
      infoModalCopy.textContent = "COPIED";
      window.setTimeout(() => {
        infoModalCopy.textContent = "COPY";
      }, 1200);
    } catch {
      infoModalCopy.textContent = "FAILED";
      window.setTimeout(() => {
        infoModalCopy.textContent = "COPY";
      }, 1200);
    }
  });
}

if (infoModalClose) {
  infoModalClose.addEventListener("click", closeInfoModal);
}

if (infoModalBackdrop) {
  infoModalBackdrop.addEventListener("click", closeInfoModal);
}

/* ========================= 启动初始化 =========================
 * 纯静态无痕运行：不使用 localStorage。
 *   1. 若 URL 带 from 参数（从子页面“返回原栏目”），直接显示对应栏目；
 *   2. 否则停留在进入页（进入页 → 授权过场 → 首页），
 *      刷新页面即回到进入页，无任何持久化状态；
 *   3. 加载进入页 Logo 动画。
 */
const urlParams = new URLSearchParams(window.location.search);
const fromSection = urlParams.get("from");

function enterSectionByParam(section) {
  // 先隐藏进入页，避免从底部露出欢迎界面
  if (enterScreen) {
    enterScreen.classList.add("is-transitioning");
    enterScreen.setAttribute("aria-hidden", "true");
  }
  if (section === "department") showDepartment();
  else if (section === "headquarters") showHeadquarters();
  else if (section === "member") showMember();
  else if (section === "research") showResearch();
  else if (section === "particle") showParticle();
  else showHomepage();
}

// 仅当从子页面返回时需要自动进入对应栏目；否则由用户在进入页点击进入
if (fromSection) {
  enterSectionByParam(fromSection);
}

setupLottieLogo();
