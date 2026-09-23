/* =========================================================================
 * landscape.js —— 手机端「电脑比例」渲染
 * -------------------------------------------------------------------------
 * 目标：不再做手机自适应重排，而是严格按电脑端比例渲染后再整体缩放。
 * 做法：
 *   - 横屏时把 viewport 宽度固定为 DESIGN_W（1920），浏览器会把整页
 *     等比缩放到手机宽度，于是排版与电脑端完全一致（只是整体变小）；
 *   - 竖屏时仍用 device-width 响应式（否则 1920 宽在竖屏会被缩到极小、
 *     完全无法阅读）；
 *   - 首次用户手势时尝试全屏 + 锁定横屏（Android/Chrome/X5 可用），
 *     不弹任何提示。
 * 仅移动端生效，桌面端不受影响。
 * ========================================================================= */
(function () {
  function isMobileDevice() {
    if (typeof navigator === "undefined") return false;
    var ua = navigator.userAgent || "";
    return /Mobi|Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
  }
  if (!isMobileDevice()) return;

  var root = document.documentElement;
  root.classList.add("is-mobile");

  var DESIGN_W = 1920;
  var RESPONSIVE = "width=device-width, initial-scale=1.0, viewport-fit=cover";
  var DESKTOP = "width=" + DESIGN_W + ", initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";

  var meta = document.querySelector('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "viewport");
    document.head.appendChild(meta);
  }

  function isPortrait() {
    return window.innerHeight > window.innerWidth;
  }

  // 横屏 → 电脑比例（缩放）；竖屏 → 响应式
  function applyViewport() {
    meta.setAttribute("content", isPortrait() ? RESPONSIVE : DESKTOP);
  }

  applyViewport();
  window.addEventListener("resize", applyViewport);
  window.addEventListener("orientationchange", function () {
    setTimeout(applyViewport, 200);
  });

  // 首次手势：尝试真正锁定横屏 + 全屏（无提示）
  var tried = false;
  function tryLandscape() {
    if (tried) return;
    tried = true;
    try {
      var el = document.documentElement;
      if (el.requestFullscreen) {
        var p = el.requestFullscreen();
        if (p && p.catch) p.catch(function () {});
      }
      if (window.screen && screen.orientation && screen.orientation.lock) {
        var q = screen.orientation.lock("landscape");
        if (q && q.catch) q.catch(function () {});
      }
    } catch (e) { /* 忽略 */ }
  }
  window.addEventListener("touchend", tryLandscape, { passive: true });
  window.addEventListener("click", tryLandscape, true);
})();
