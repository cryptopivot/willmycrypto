/* Will My Crypto - "How hard is it to crack?" interactive explainer (PROTOTYPE).
   All numbers come from js/strength.js. Educational estimates, not guarantees. No network. */
(function () {
  "use strict";
  var S = window.WMCStrength, $ = function (id) { return document.getElementById(id); };
  var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 1. sand: one grain among a lot */
  var cv = $("sand");
  if (cv && cv.getContext) {
    var ctx = cv.getContext("2d"), W = 0, H = 0, pts = [], gold = 0, t0 = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    var size = function () {
      var r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(1800, W * H / 90)); pts = [];
      for (var i = 0; i < n; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.1 + 0.4, p: Math.random() * 6.28, s: Math.random() * 1.2 + 0.4 });
      gold = Math.floor(Math.random() * n);
    };
    var draw = function (t) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < pts.length; i++) {
        if (i === gold) continue;
        var q = pts[i], a = RM ? 0.5 : 0.25 + 0.4 * (0.5 + 0.5 * Math.sin(t / 700 * q.s + q.p));
        ctx.fillStyle = "rgba(190,225,230," + a.toFixed(3) + ")"; ctx.fillRect(q.x, q.y, q.r, q.r);
      }
      var g = pts[gold], pulse = RM ? 1 : 1 + 0.5 * Math.sin(t / 260);
      ctx.fillStyle = "rgba(242,179,107,.25)"; ctx.beginPath(); ctx.arc(g.x, g.y, 9 * pulse, 0, 6.28); ctx.fill();
      ctx.fillStyle = "#f2b36b"; ctx.beginPath(); ctx.arc(g.x, g.y, 2.4, 0, 6.28); ctx.fill();
    };
    var running = false, lastMove = 0;
    var frame = function (t) {
      if (!running) return;
      if (t - lastMove > 4500) { lastMove = t; gold = Math.floor(Math.random() * pts.length); }
      draw(t); requestAnimationFrame(frame);
    };
    size(); draw(0);
    if (!RM && "IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { var on = e[0].isIntersecting; if (on && !running) { running = true; requestAnimationFrame(frame); } else if (!on) running = false; }).observe(cv);
    }
    addEventListener("resize", function () { size(); draw(0); });
  }

  /* 2. guess machine */
  var rate = $("rate"); if (!rate) return;
  var bits = 128;
  var NOTES = [
    [0, 8, "That is roughly a powerful home computer, and a generous figure: checking one real wallet candidate takes thousands of operations."],
    [8, 13, "Think of a large data centre working only on this. Even this is far more than a real attacker has aimed at one random seed."],
    [13, 19, "Beyond what any single computer today can do for this kind of work. An exascale machine does about a billion billion simple operations a second, and one guess costs many operations."],
    [19, 28, "This is far beyond anything that exists. We include it only to show that the answer stays huge even when we are absurdly generous."]
  ];
  function render() {
    var e = +rate.value, r = Math.pow(10, e), l = S.log10Seconds(bits, r), ly = l - Math.log10(S.YEAR);
    $("rateval").textContent = S.words(e) + " guesses per second";
    S.render($("result"), S.describe(bits, r), {});
    var note = ""; NOTES.forEach(function (n) { if (e >= n[0] && e < n[1]) note = n[2]; }); $("o-note").textContent = note;
    var AX = 80, wU = Math.max(0, Math.log10(S.AGE_UNIVERSE_YEARS)) / AX * 100, wN = Math.max(1, Math.min(100, ly / AX * 100));
    $("bar-u").style.width = wU + "%"; $("bar-n").style.width = wN + "%";
    $("lab-n").textContent = "(" + S.yearsWords(l) + ")";
    document.querySelectorAll("[data-bits]").forEach(function (b) { b.setAttribute("aria-pressed", +b.getAttribute("data-bits") === bits); });
    rate.setAttribute("aria-valuetext", S.words(e) + " guesses per second");
  }
  rate.addEventListener("input", render);
  document.querySelectorAll("[data-bits]").forEach(function (b) { b.addEventListener("click", function () { bits = +b.getAttribute("data-bits"); render(); }); });
  document.querySelectorAll("[data-exp]").forEach(function (b) { b.addEventListener("click", function () { rate.value = b.getAttribute("data-exp"); render(); }); });
  render();

  /* 3. passphrase tester */
  var tp = $("tp"); if (tp) {
    var EX = { weak: "password123", words: "blue river stone apple", leet: "Tr0ub4dor&3", rnd: "ABCDE-23456-FGHJK-LMNPQ-RSTUV" };
    document.querySelectorAll("[data-ex]").forEach(function (b) { b.addEventListener("click", function () { tp.value = EX[b.getAttribute("data-ex")]; tp.type = "text"; tp.dispatchEvent(new Event("input")); }); });
    var tg = $("tp-show"); if (tg) tg.addEventListener("click", function () { tp.type = tp.type === "password" ? "text" : "password"; });
  }
})();
