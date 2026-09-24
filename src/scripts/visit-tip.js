/* =========================================================================
 * visit-tip.js —— 访问提示弹窗
 * -------------------------------------------------------------------------
 * 进入页面后短暂延时弹出提示：建议电脑访问。
 * - 纯前端、零依赖；
 * - 仅在「进入网站」时提示一次：
 *     1) 从子页面返回主站时 URL 会带 from 参数，此时不再弹出；
 *     2) 用 sessionStorage 记住本次会话已提示过（关闭标签页即清除，
 *        不写入 localStorage/Cookie，不跨会话、不追踪）。
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

  /* 从子页面返回（带 from 参数）时属于站内跳转，不再重复提示 */
  var params = new URLSearchParams(window.location.search);
  if (params.has("from")) return;

  /* 本次会话已提示过则跳过（sessionStorage 随标签页关闭而清除） */
  var SEEN_KEY = "sec_visit_tip_seen";
  try {
    if (window.sessionStorage.getItem(SEEN_KEY) === "1") return;
    window.sessionStorage.setItem(SEEN_KEY, "1");
  } catch (e) { /* 隐私模式等禁用存储时忽略，仍按 from 逻辑提示 */ }

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
      '<p class="visit-tip__text">建议使用电脑访问以获得完整的手势互动体验；手机端请横屏观看。</p>' +
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