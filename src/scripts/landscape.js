/* =========================================================================
 * landscape.js —— 移动端横屏守卫 + 自动横屏
 * -------------------------------------------------------------------------
 * 需求：移动端（手机/平板）竖屏时不允许使用本站，提示用户横屏观看；
 *       并尽量自动把设备旋转/锁定为横屏。
 * 实现：
 *   - 仅对触屏移动设备生效（桌面端不受影响）；
 *   - 竖屏时动态注入一个全屏遮罩，覆盖所有内容并拦截点击；
 *   - 遮罩内提供「自动横屏」按钮：请求全屏并锁定横屏方向
 *     （Android Chrome 支持；iOS Safari 不支持元素级全屏/方向锁，
 *      此时按钮无效，仍提示用户手动旋转）；
 *   - 横屏时遮罩自动移除，恢复正常使用；
 *   - 监听 resize 与 orientationchange，即时响应方向变化。
 *   - 对外暴露 window.SecRequestLandscape()，供「进入」等用户手势调用。
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

  // —— 国产 X5 内核（QQ/UC/百度/夸克/微信等）——
  // 这些内核对页面级全屏支持不完整，且会把隐藏的 <video> 提升为自家的
  // 全屏播放器：一旦请求全屏，活动视频可能被劫持弹出。故直接跳过全屏。
  function isX5Kernel() {
    if (typeof navigator === "undefined") return false;
    var ua = navigator.userAgent || "";
    return /MQQBrowser|QQBrowser|UCBrowser|UCWEB|Quark|baidubrowser|baiduboxapp|BIDUBrowser|MicroMessenger|XWEB|; wv\)/i.test(ua);
  }

  // —— 请求全屏并锁定横屏（尽量；不支持时静默失败）——
  // 返回 true 表示已尝试全屏；返回 false 表示因内核限制主动放弃。
  function requestLandscape() {
    if (isX5Kernel()) {
      return false;
    }
    var el = document.documentElement;
    var lock = function () {
      try {
        if (window.screen && screen.orientation && typeof screen.orientation.lock === "function") {
          var p = screen.orientation.lock("landscape");
          if (p && typeof p.catch === "function") p.catch(function () {});
        }
      } catch (e) {
        /* 浏览器不支持方向锁，忽略 */
      }
    };
    try {
      if (el.requestFullscreen) {
        el.requestFullscreen().then(lock, lock);
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
        lock();
      } else {
        lock();
      }
      return true;
    } catch (e) {
      lock();
      return true;
    }
  }

  // 暴露给其它脚本（如「进入」按钮）在用户手势中调用
  window.SecRequestLandscape = requestLandscape;

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
        '<button class="lg-btn" type="button">自动横屏</button>' +
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
      "#landscape-guard .lg-btn{margin-top:1.4rem;min-height:2.75rem;padding:0.65rem 1.6rem;" +
        "font-family:inherit;font-size:0.95rem;letter-spacing:0.14em;cursor:pointer;" +
        "color:#0b0b10;background:linear-gradient(135deg,#ff8c00,#ffc98a);" +
        "border:0;border-radius:999px;box-shadow:0 0 22px rgba(255,140,0,0.35);" +
      "}" +
      "#landscape-guard .lg-btn:active{transform:scale(0.97)}" +
      "@keyframes lgSpin{to{transform:rotate(360deg)}}";

    document.head.appendChild(style);
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = "hidden"; // 竖屏时禁止滚动

    var btn = overlay.querySelector(".lg-btn");
    if (btn) {
      btn.addEventListener("click", function () {
        if (!requestLandscape()) {
          // X5 内核：无法自动全屏旋转，退化为引导手动旋转
          btn.textContent = "请手动旋转手机";
          btn.disabled = true;
          btn.style.cursor = "default";
        }
      });
    }
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
