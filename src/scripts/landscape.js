/* =========================================================================
 * landscape.js —— 移动端自动横屏（无提示）
 * -------------------------------------------------------------------------
 * 需求：移动端不再弹出「请横屏」提示，而是直接进入横屏。
 * 实现：用户首次触摸时请求全屏并锁定横屏（screen.orientation.lock），
 *       把设备真正转到横屏（Android / Chrome / X5 内核可用；需用户手势）。
 *       全程不注入任何提示遮罩；也不做 CSS 旋转兜底（会与响应式断点冲突）。
 * 仅对触屏移动设备生效；桌面端不受影响。
 * 说明：iOS Safari 不支持方向锁定，将保持竖屏（响应式布局，可正常使用）。
 * ========================================================================= */
(function () {
  function isMobileDevice() {
    if (typeof navigator === "undefined") return false;
    var ua = navigator.userAgent || "";
    return /Mobi|Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
  }
  if (!isMobileDevice()) return;

  var triedFullscreen = false;

  function tryLandscape() {
    var canLock = window.screen && screen.orientation && screen.orientation.lock;
    if (!canLock) return; // 不支持则保持竖屏（响应式），不做旋转兜底

    try {
      var el = document.documentElement;
      var fs = null;
      if (!triedFullscreen && el.requestFullscreen) {
        triedFullscreen = true;
        fs = el.requestFullscreen();
      }
      var go = function () {
        try {
          var p = screen.orientation.lock("landscape");
          if (p && p.catch) p.catch(function () {});
        } catch (e) { /* 忽略 */ }
      };
      if (fs && fs.then) {
        fs.then(go).catch(go);
      } else {
        go();
      }
    } catch (e) { /* 忽略 */ }
  }

  // 浏览器要求方向锁定必须由用户手势触发，这里首次触摸/点击时尝试
  window.addEventListener("touchend", tryLandscape, { passive: true });
  window.addEventListener("click", tryLandscape, true);
})();
