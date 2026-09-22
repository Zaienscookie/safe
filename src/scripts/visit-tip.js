/* =========================================================================
 * visit-tip.js —— 访问提示弹窗
 * -------------------------------------------------------------------------
 * 进入页面后短暂延时弹出提示：建议电脑访问，移动端请竖屏访问。
 * - 纯前端、零依赖，不使用 localStorage/Cookie（刷新页面会再次弹出）；
 * - 点击「知道了」或弹窗背景即可关闭；
 * - z-index 低于横屏守卫（landscape.js），移动端竖屏被强制横屏遮罩覆盖，
 *   横屏后本弹窗自然可见。
 * ========================================================================= */
(function () {
  /* 电脑端不显示访问提示；仅在移动端（手机/平板 UA）弹出 */
  function isMobileDevice() {
    if (typeof navigator === "undefined") return false;
    var ua = navigator.userAgent || "";
    return /Mobi|Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
  }
  if (!isMobileDevice()) return;

  var GUARD_Z = 90000; // 低于横屏守卫的 99999

  // —— 注入样式 ——
  var style = document.createElement("style");
  style.textContent =
    ".visit-tip-guard{" +
      "position:fixed;inset:0;z-index:" + GUARD_Z + ";" +
      "display:flex;align-items:center;justify-content:center;" +
      "background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);" +
      "opacity:0;pointer-events:none;transition:opacity .3s ease;" +
    "}" +
    ".visit-tip-guard.is-show{opacity:1;pointer-events:auto;}" +
    ".visit-tip-guard .visit-tip__box{" +
      "width:min(24rem,86vw);padding:2.2rem 2rem 1.8rem;" +
      "background:linear-gradient(180deg,rgba(12,12,18,0.97),rgba(20,20,28,0.97));" +
      "border:1px solid rgba(255,140,0,0.3);border-radius:14px;" +
      "color:#e8e6df;text-align:center;font-family:Consolas,'Microsoft YaHei',monospace;" +
      "box-shadow:0 24px 60px rgba(0,0,0,0.5),0 0 40px rgba(255,140,0,0.12);" +
    "}" +
    ".visit-tip-guard .visit-tip__kicker{" +
      "margin:0;font-size:0.72rem;letter-spacing:0.3em;color:#ff8c00;" +
    "}" +
    ".visit-tip-guard .visit-tip__title{" +
      "margin:0.9rem 0 0;font-size:1.5rem;letter-spacing:0.05em;" +
    "}" +
    ".visit-tip-guard .visit-tip__text{" +
      "margin:1.1rem 0 0;font-size:0.95rem;line-height:1.9;color:rgba(232,230,223,0.86);" +
    "}" +
    ".visit-tip-guard .visit-tip__btn{" +
      "margin-top:1.6rem;padding:0.8rem 2rem;border:1px solid rgba(255,140,0,0.45);" +
      "background:linear-gradient(90deg,rgba(255,140,0,0.95),rgba(255,166,44,0.95));" +
      "color:#101010;font-family:inherit;font-size:0.85rem;font-weight:700;" +
      "letter-spacing:0.16em;cursor:pointer;transition:transform .3s,box-shadow .3s;" +
    "}" +
    ".visit-tip-guard .visit-tip__btn:hover{" +
      "transform:translateY(-2px);box-shadow:0 0 24px rgba(255,140,0,0.24);" +
    "}";
  document.head.appendChild(style);

  // —— 创建弹窗 ——
  var overlay = document.createElement("div");
  overlay.className = "visit-tip-guard";
  overlay.innerHTML =
    '<div class="visit-tip__box">' +
      '<p class="visit-tip__kicker">VISIT TIP · 访问建议</p>' +
      '<h2 class="visit-tip__title">访问提示</h2>' +
      '<p class="visit-tip__text">建议电脑访问，移动端请竖屏访问。</p>' +
      '<button class="visit-tip__btn" type="button">知道了</button>' +
    '</div>';

  function close() {
    overlay.classList.remove("is-show");
    window.setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 320);
  }

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay || e.target.closest(".visit-tip__btn")) close();
  });
  document.body.appendChild(overlay);

  // 延迟显示，避免与页面入场动画抢眼
  window.setTimeout(function () {
    overlay.classList.add("is-show");
  }, 500);
})();