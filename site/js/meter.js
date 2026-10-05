/* Will My Crypto - live passphrase strength meter (PROTOTYPE). Attaches to <div class="meter" data-for="inputId">.
   Runs only in this browser tab. Assumes a patient attacker with 1,000 top consumer GPUs (about 10^7 guesses/s)
   attacking the PBKDF2-SHA256 (600,000 rounds) used for the letter. */
(function () {
  "use strict";
  var S = window.WMCStrength;
  var RATE = 1e7;
  function init(box) {
    var inp = document.getElementById(box.getAttribute("data-for")); if (!inp) return;
    box.innerHTML = '<div class="bar"><i></i></div><div class="txt" aria-live="polite"></div>';
    var bar = box.querySelector("i"), txt = box.querySelector(".txt");
    function upd() {
      var e = S.estimate(inp.value);
      if (!e) { bar.style.width = "0"; txt.textContent = "Strength shows here as you type. Nothing is sent anywhere."; return; }
      var v = S.verdict(e.bits), d = S.describe(e.bits, RATE, { who: "an attacker with 1,000 powerful graphics cards" });
      bar.style.width = v.pct + "%"; bar.style.background = v.color;
      txt.textContent = "";
      var b = document.createElement("b"); b.textContent = v.label + " (about " + Math.round(e.bits) + " bits). "; txt.appendChild(b);
      txt.appendChild(document.createTextNode(e.why + (e.bits < 64 ? " A weak passphrase can be cracked in seconds to days; a long random one cannot." : " A long random passphrase like this is not realistically crackable.")));
      var box = document.createElement("div"); txt.appendChild(box); S.render(box, d, { legend: false });
    }
    inp.addEventListener("input", upd); upd();
  }
  /* <span data-crack="128,1e12,plain|sci|univ|space"> fills in numbers computed from real constants */
  function fill(el) {
    var a = el.getAttribute("data-crack").split(","), bits = +a[0], rate = +a[1], kind = a[2], l = S.log10Seconds(bits, rate);
    if (kind === "plain") el.textContent = S.plain(l);
    else if (kind === "univ") el.textContent = S.universeWords(l);
    else if (kind === "words") el.textContent = "" + S.words(bits * S.LOG10_2);
    else if (kind === "earthswords") el.textContent = S.words(bits * S.LOG10_2 - Math.log10(S.SAND_GRAINS));
    else if (kind === "result") S.render(el, S.describe(bits, rate), {});
    else if (kind === "space") el.innerHTML = S.sciHtml(bits * S.LOG10_2, 1);
    else if (kind === "years") el.innerHTML = S.sciHtml(l - Math.log10(S.YEAR), 1) + " years";
    else if (kind === "earths") el.innerHTML = S.sciHtml(bits * S.LOG10_2 - Math.log10(S.SAND_GRAINS), 1);
  }
  document.addEventListener("DOMContentLoaded", function () {
    [].slice.call(document.querySelectorAll(".meter[data-for]")).forEach(init);
    [].slice.call(document.querySelectorAll("[data-crack]")).forEach(fill);
  });
})();
