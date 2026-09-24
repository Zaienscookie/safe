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

  // —— 是否移动设备（仅按 UA 判断，桌面触屏笔记本不会被误判）——
  function isMobileDevice() {
    var ua = navigator.userAgent || "";
    return /Mobi|Android|iPhone|iPad|iPod|Mobile|Tablet|HarmonyOS/i.test(ua);
  }

  // —— 当前物理视口是否为竖屏 ——
  function isPortrait() {
    return window.innerHeight > window.innerWidth;
  }

  var frame = null;

  function build() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    if (!vw || !vh) return; // 视口尺寸尚未就绪，等下次 resize 再建

    if (!frame) {
      frame = document.createElement("iframe");
      frame.id = "force-landscape-frame";
      frame.title = "网络安全社";
      frame.setAttribute("scrolling", "no");
      frame.setAttribute("allowfullscreen", "");
      frame.setAttribute(
        "allow",
        "camera; microphone; autoplay; fullscreen; accelerometer; gyroscope; clipboard-write; encrypted-media"
      );
      frame.setAttribute("src", window.location.href);
      (document.body || document.documentElement).appendChild(frame);
      document.documentElement.classList.add("is-force-landscape");
    }

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

  sync();
  window.addEventListener("resize", sync);
  window.addEventListener("orientationchange", function () {
    setTimeout(sync, 200);
  });
})();
