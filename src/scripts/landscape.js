/* =========================================================================
 * landscape.js —— 移动端「强制横屏」渲染
 * -------------------------------------------------------------------------
 * 需求：手机/平板竖屏握持时，页面也直接以「电脑那样的横屏」呈现，自动铺满
 *       整屏、不做任何缩放提示、也不弹「请横屏」遮罩。
 *
 * 原理：
 *   1. 检测到移动设备且当前为竖屏时，创建一个覆盖整屏的 <iframe>，其内部视口
 *      尺寸设为「物理长边 × 物理短边」，即真正的横屏尺寸——因此 iframe 内部的
 *      CSS 媒体查询、vw/vh 单位、布局都与横屏手机完全一致（与电脑一致）；
 *   2. 再把这个 iframe 旋转 90° 铺满屏幕，于是用户竖着拿手机也能看到横屏内容；
 *   3. iframe 载入的是同一页面（带 recursion 守卫，内部不会再套一层）；
 *   4. 设备真正转到横屏时自动移除 iframe，回到原生横屏页面。
 *
 * 说明：桌面端不做任何处理；本脚本需放在 <body> 开头执行，以便在页面绘制前
 *       就盖好横屏容器，避免先闪一下竖屏排版。
 * ========================================================================= */
(function () {
  // 已经处于被强制横屏的 iframe 内部：直接放行，避免无限嵌套
  if (window.self !== window.top) return;

  // —— 是否移动设备（按 UA 判断；再补一条「小屏 + 多点触控」启发式，
  //      覆盖部分平板/折叠屏 UA 不含 Mobi/Tablet 的情况。桌面触屏笔记本
  //      屏幕足够大，不会被误判）——
  function isMobileDevice() {
    var ua = navigator.userAgent || "";
    if (/Mobi|Android|iPhone|iPad|iPod|Mobile|Tablet|HarmonyOS|Windows Phone|BlackBerry|Kindle|Silk/i.test(ua)) {
      return true;
    }
    var touch = navigator.maxTouchPoints || navigator.msMaxTouchPoints || 0;
    var shortSide = Math.min(screen.width || 0, screen.height || 0);
    if (touch > 1 && shortSide > 0 && shortSide <= 900) return true;
    return false;
  }

  // —— 取当前视口尺寸（多来源兜底，避免某些内核 window.inner* 为 0）——
  function viewportSize() {
    var vv = window.visualViewport;
    var w = window.innerWidth || document.documentElement.clientWidth || (vv && vv.width) || 0;
    var h = window.innerHeight || document.documentElement.clientHeight || (vv && vv.height) || 0;
    return { w: w, h: h };
  }

  // —— 当前物理视口是否为竖屏 ——
  function isPortrait() {
    var s = viewportSize();
    return s.h >= s.w;
  }

  var frame = null;
  var lastW = 0;
  var lastH = 0;

  function build() {
    var s = viewportSize();
    var vw = Math.round(s.w);
    var vh = Math.round(s.h);
    if (!vw || !vh) return; // 视口尺寸尚未就绪，等下次 resize 再建

    if (!frame) {
      frame = document.createElement("iframe");
      frame.id = "force-landscape-frame";
      frame.title = "网络安全社";
      // 注意：不要设置 scrolling="no"，否则横屏后子页面（方向/报名/FLAG 等）
      // 将无法滚动、长内容底部文字点不到。让内部文档自行滚动即可。
      frame.setAttribute("allowfullscreen", "");
      frame.setAttribute(
        "allow",
        "camera; microphone; autoplay; fullscreen; accelerometer; gyroscope; clipboard-write; encrypted-media"
      );
      frame.setAttribute("src", window.location.href);
      (document.body || document.documentElement).appendChild(frame);
      document.documentElement.classList.add("is-force-landscape");
      lastW = 0;
      lastH = 0;
    }

    // 尺寸未变化时不重复写样式，避免 URL 栏收放等引发的无谓重排/跳动
    if (vw === lastW && vh === lastH) return;
    lastW = vw;
    lastH = vh;

    // iframe 内部 = 横屏尺寸（长边作为宽度、短边作为高度），
    // 再整体顺时针旋转 90° 并右移短边宽度，正好铺满整块屏幕。
    frame.style.position = "fixed";
    frame.style.top = "0";
    frame.style.left = "0";
    frame.style.width = vh + "px";
    frame.style.height = vw + "px";
    frame.style.border = "0";
    frame.style.margin = "0";
    frame.style.padding = "0";
    frame.style.background = "#e8e8e8";
    frame.style.zIndex = "2147483647";
    frame.style.transformOrigin = "0 0";
    frame.style.transform = "translateX(" + vw + "px) rotate(90deg)";
  }

  function destroy() {
    if (frame) {
      if (frame.parentNode) frame.parentNode.removeChild(frame);
      frame = null;
    }
    lastW = 0;
    lastH = 0;
    document.documentElement.classList.remove("is-force-landscape");
  }

  function sync() {
    if (!isMobileDevice()) return; // 桌面端不处理
    if (isPortrait()) {
      build();
    } else {
      destroy();
    }
  }

  // —— resize 防抖到下一帧，避免地址栏收放时高频重建造成的抖动 ——
  var rafId = 0;
  function schedule() {
    if (rafId) return;
    rafId = window.requestAnimationFrame(function () {
      rafId = 0;
      sync();
    });
  }

  sync();
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", function () {
    setTimeout(sync, 200);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", schedule, { passive: true });
  }
})();
