/* =========================================================================
 * fit.js —— 移动端「等比缩放适配」
 * -------------------------------------------------------------------------
 * 目的：移动端横屏高度很小（约 320~430px），各栏目内容天然比屏幕高，
 * 若靠滚动会一直上下滑。这里把每个栏目**整体等比缩小**到刚好铺满一屏，
 * 既不需要滚动，也保持比例不变。
 *
 * 做法（仅移动端）：
 *   1. 栏目是 position:fixed; inset:0 的全屏容器；
 *   2. 测量其内容高度 natural 与可用高度 avail；
 *   3. 若 natural > avail，取缩放比 s = avail / natural，
 *      把容器布局尺寸放大到 (100/s)%（内容因此重新排版、更矮），
 *      再用 transform: scale(s) + origin:top left 缩回，正好铺满视口；
 *   4. 内容未超高时不做任何处理（不影响正常布局）。
 * 桌面端完全不受影响。
 * ========================================================================= */
(function () {
  if (typeof navigator === "undefined") return;
  var ua = navigator.userAgent || "";
  var isMobile = /Mobi|Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
  if (!isMobile) return;

  var IDS = [
    "homepage-screen",
    "headquarters-screen",
    "member-screen",
    "department-screen",
    "research-screen",
  ];

  // 竖屏旋转兜底模式下，可视高度取旋转后的宽（landscape.js 的 .force-landscape）
  function availHeight() {
    return document.documentElement.classList.contains("force-landscape")
      ? window.innerWidth
      : window.innerHeight;
  }

  function isShown(sec) {
    return sec.classList.contains("is-visible");
  }

  function reset(sec) {
    sec.style.transform = "";
    sec.style.transformOrigin = "";
    sec.style.width = "";
    sec.style.height = "";
    sec.style.overflowY = "";
    sec.removeAttribute("data-fit-scale");
  }

  function fitOne(sec) {
    if (!sec) return;
    reset(sec);
    if (!isShown(sec)) return;

    var avail = availHeight();
    var natural = sec.scrollHeight;
    if (natural <= avail + 2) return; // 放得下，不处理

    var s = avail / natural;
    sec.style.transformOrigin = "top left";
    sec.style.width = 100 / s + "%";
    sec.style.height = 100 / s + "%";

    // 放大布局后内容会重新排版变矮，复核一次缩放比
    var natural2 = sec.scrollHeight;
    if (natural2 > 0 && natural2 * s > avail + 2) {
      s = avail / natural2;
      sec.style.width = 100 / s + "%";
      sec.style.height = 100 / s + "%";
    }

    sec.style.transform = "scale(" + s + ")";
    sec.style.overflowY = "hidden";
    sec.setAttribute("data-fit-scale", s.toFixed(3));
  }

  function fitAll() {
    for (var i = 0; i < IDS.length; i++) {
      fitOne(document.getElementById(IDS[i]));
    }
  }

  var raf = null;
  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = null;
      fitAll();
    });
  }

  window.addEventListener("resize", schedule);
  window.addEventListener("orientationchange", function () {
    setTimeout(schedule, 220);
  });

  // 栏目切换通过 class="is-visible" 控制，监听 class / aria-hidden 变化
  if (window.MutationObserver) {
    var mo = new MutationObserver(schedule);
    for (var j = 0; j < IDS.length; j++) {
      var el = document.getElementById(IDS[j]);
      if (el) mo.observe(el, { attributes: true, attributeFilter: ["class", "aria-hidden"] });
    }
  }

  // 首次进入：布局稳定与入场动画结束后各校正一次
  schedule();
  window.addEventListener("load", schedule);
  setTimeout(schedule, 700);
  setTimeout(schedule, 1600);
})();
