/* =========================================================================
 * landscape.js —— 移动端横屏提示
 * -------------------------------------------------------------------------
 * 需求：移动端（手机/平板）竖屏时提示用户横屏观看；横屏时自动放行。
 * 实现：
 *   - 仅对触屏移动设备生效（桌面端不受影响）；
 *   - 竖屏时动态注入一个全屏遮罩，覆盖所有内容并拦截点击，仅作提示，
 *     不再请求全屏/锁定方向（各厂商浏览器会自动横屏失败并劫持视频）；
 *   - 横屏时遮罩自动移除，恢复正常使用；
 *   - 监听 resize 与 orientationchange，即时响应方向变化。
 * 遮罩样式随脚本内部注入，无需额外 CSS 文件，保持纯前端、零依赖。
 * ========================================================================= */
(function () {
  // —— 判断是否为移动设备（仅按 UA 判断，触屏笔记本不会被误判）——
  function isMobileDevice() {
    if (typeof navigator === "undefined") return false;
    var ua = navigator.userAgent || "";
    return /Mobi|Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
  }

  // —— 当前是否为竖屏 ——
  function isPortrait() {
    return window.innerHeight > window.innerWidth;
  }

  var overlay = null;

  // 注入遮罩（含样式）
  function showOverlay() {
    if (overlay) return;

    overlay = document.createElement("div");
    overlay.id = "landscape-guard";
    overlay.setAttribute("role", "alert");
    overlay.innerHTML =
      '<div class="lg-box">' +
        '<div class="lg-icon">&#10227;</div>' +
        '<p class="lg-text">请将手机横屏观看，<br>以获得最佳体验</p>' +
      '</div>';

    // 内联样式，保证任何页面下表现一致
    var style = document.createElement("style");
    style.textContent =
      "#landscape-guard{" +
        "position:fixed;inset:0;z-index:99999;display:flex;" +
        "align-items:center;justify-content:center;" +
        "background:radial-gradient(circle at 50% 40%,rgba(255,140,0,0.08),transparent 46%),#0b0b10;" +
        "color:#e8e6df;font-family:Consolas,'Microsoft YaHei',monospace;" +
      "}" +
      "#landscape-guard .lg-box{text-align:center;padding:2.2rem 2.6rem;" +
        "border:1px solid rgba(255,140,0,0.3);border-radius:14px;" +
        "background:rgba(18,18,26,0.9);box-shadow:0 0 40px rgba(255,140,0,0.12);" +
      "}" +
      "#landscape-guard .lg-icon{font-size:3rem;color:#ff8c00;display:inline-block;" +
        "animation:lgSpin 1.6s linear infinite;" +
      "}" +
      "#landscape-guard .lg-text{margin-top:1rem;font-size:1.05rem;line-height:1.9;" +
        "letter-spacing:0.12em;color:#ffc98a;" +
      "}" +
      "@keyframes lgSpin{to{transform:rotate(360deg)}}";

    document.head.appendChild(style);
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = "hidden"; // 竖屏时禁止滚动
  }

  function hideOverlay() {
    if (overlay) {
      overlay.remove();
      overlay = null;
      document.documentElement.style.overflow = "";
    }
  }

  function check() {
    if (isMobileDevice()) {
      if (isPortrait()) {
        showOverlay();
      } else {
        hideOverlay();
      }
    }
  }

  // 初始化 + 监听方向变化（resize 作为 orientationchange 的兜底，兼容性最好）
  check();
  window.addEventListener("resize", check);
  window.addEventListener("orientationchange", function () {
    setTimeout(check, 180);
  });
})();
