/* =========================================================================
 * homepage-fit.js —— 首页主内容等比缩放以适配矮屏（手机横屏）
 * -------------------------------------------------------------------------
 * 首页「文案 + 装饰图形」组成的 .homepage-screen__stage 在横屏手机上往往比
 * 视口更高，导致底部文字被固定的侧边导航遮挡。这里按可用高度对整块做等比
 * 缩小（zoom），保持宽高比例、不拉伸、不失衡，使其完整地落在底部导航之上。
 *
 * 仅在矮屏（max-height:560px，即横屏手机）生效；桌面端与竖屏保持原样。
 * ========================================================================= */
(function () {
  var screen = document.getElementById("homepage-screen");
  if (!screen) return;
  var stage = screen.querySelector(".homepage-screen__stage");
  if (!stage) return;

  var MARGIN = 12;      // 与底部导航之间预留的间距(px)
  var MIN_SCALE = 0.45; // 缩放下限，避免小到不可读

  function isShortViewport() {
    return window.matchMedia("(max-height: 560px)").matches;
  }

  function fit() {
    stage.style.zoom = ""; // 先还原，量出未缩放的原始高度
    if (!isShortViewport()) return;

    var natural = stage.offsetHeight;
    if (!natural) return;

    // 可用高度 = 视口高度 - 上下内边距（底部内边距已用于让开底部导航）- 余量
    var content = stage.parentElement;
    var cs = window.getComputedStyle(content);
    var padTop = parseFloat(cs.paddingTop) || 0;
    var padBottom = parseFloat(cs.paddingBottom) || 0;
    var avail = window.innerHeight - padTop - padBottom - MARGIN;
    if (avail <= 0) return;

    var scale = avail / natural;
    if (scale >= 1) return; // 放得下就不缩放

    if (scale < MIN_SCALE) scale = MIN_SCALE;
    stage.style.zoom = Math.round(scale * 1000) / 1000;
  }

  var frame = 0;
  function schedule() {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(fit);
  }

  window.addEventListener("resize", schedule);
  window.addEventListener("orientationchange", function () {
    window.setTimeout(fit, 220);
  });
  window.addEventListener("load", function () {
    window.setTimeout(fit, 60);
  });
  fit();
})();
