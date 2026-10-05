/* Will My Crypto - Plan demo (PROTOTYPE). Everything stays in this browser tab. No network. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var enc = new TextEncoder();
  var EXTRA = ["Attorney", "Trusted friend", "Safe-deposit box", "Home safe", "Sibling", "Executor", "Second attorney", "Cousin", "Neighbor", "Colleague", "Advisor", "Relative", "Friend", "Holder", "Holder", "Holder"];
  function say(id, msg, bad) { var e = $(id); e.textContent = msg; e.className = "status " + (bad ? "bad" : "ok"); }
  function el(tag, attrs, text) { var e = document.createElement(tag); if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; }
  function heirs() { return $("heirs").value.split(/\n+/).map(function (s) { return s.trim().slice(0, 60); }).filter(Boolean).slice(0, 8); }
  function planFromForm() {
    return { intervalDays: +$("interval").value, graceDays: +$("grace").value, reminder1: 0, reminder2: +$("r2").value, trusted: +$("tc").value };
  }
  function labels(n, hs) {
    var out = [], i; for (i = 0; i < hs.length && out.length < n; i++) out.push("Heir: " + hs[i]);
    var j = 0; while (out.length < n) out.push(EXTRA[j++]);
    return out;
  }
  function renderSummary(plan, hs, k, n) {
    var steps = window.WMCSim.steps(plan), ul = $("summary"); ul.textContent = "";
    ul.appendChild(el("li", null, "Check-in every " + plan.intervalDays + " days. Heirs: " + hs.join(", ") + "."));
    steps.forEach(function (s) {
      var when = s.offset === 0 ? "on the day a check-in is missed" : s.offset + " days after a missed check-in";
      var what = s.id === "rel" ? "the locked letter is released to your heirs (never the passphrase)" : s.id === "tc" ? "a person you trust is asked to confirm you are okay" : "you are reminded and can check in with one tap";
      ul.appendChild(el("li", null, s.label + ": " + when + ": " + what + "."));
    });
    ul.appendChild(el("li", null, "To open the letter, " + k + " of the " + n + " shares must be put together."));
  }
  function renderShares(shares, lab) {
    var host = $("shares"); host.textContent = "";
    shares.forEach(function (s, i) {
      var c = el("div", { "class": "sharebox" });
      c.appendChild(el("strong", null, "Share " + (i + 1) + " of " + shares.length + " (" + lab[i] + ")"));
      var ta = el("textarea", { "class": "mono", readonly: "readonly", rows: "2", "aria-label": "Share " + (i + 1) }); ta.value = s; c.appendChild(ta);
      var b = el("button", { "class": "btn ghost2 mini", type: "button" }, "Copy"); b.addEventListener("click", function () {
        if (navigator.clipboard) navigator.clipboard.writeText(s).then(function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy"; }, 1200); }); else { ta.select(); document.execCommand("copy"); }
      }); c.appendChild(b); host.appendChild(c);
    });
  }
  var last = null;
  function go() {
    say("status", "");
    var hs = heirs(); if (!hs.length) return say("status", "Add at least one heir (one name per line).", true);
    var plan = planFromForm(), err = window.WMCSim.validate(plan); if (err) return say("status", err, true);
    var k = +$("k").value, n = +$("n").value;
    if (!(k >= 2 && n >= k && n <= 10)) return say("status", "Choose a threshold of 2 or more, and no more than the number of shares (up to 10).", true);
    var letter = $("letter").value; if (!letter.trim()) return say("status", "Write your letter first.", true);
    var risk = window.WMCGuard.looksSensitive(letter);
    if (risk) return say("status", "Stopped: your letter seems to contain " + risk + ". Instructions only, never secrets. Describe where things are kept instead.", true);
    var own = $("pm-own").checked, pass;
    if (own) { pass = $("ownpass").value; if (pass.length < 12) return say("status", "Use a passphrase of at least 12 characters, or choose the generated one.", true); if (pass.length > 200) return say("status", "Passphrase is too long (200 characters max).", true); }
    else pass = window.WMCCrypto.randomPassphrase();
    var btn = $("go"); btn.disabled = true; btn.textContent = "Working...";
    setTimeout(function () {
      window.WMCCrypto.lock(letter, pass, 600000).then(function (block) {
        var shares = window.WMCShamir.split(enc.encode(pass), k, n), lab = labels(n, hs);
        last = { block: block, shares: shares, lab: lab, plan: plan, hs: hs, k: k, n: n };
        $("block").value = block; renderShares(shares, lab); renderSummary(plan, hs, k, n);
        $("genpass").value = own ? "" : pass; $("genwrap").hidden = own;
        var settings = JSON.stringify({ plan: plan, hs: hs, k: k, n: n });
        try { sessionStorage.setItem("wmc-plan", settings); } catch (e) {}
        $("simlink").href = "simulator.html#" + encodeURIComponent(settings);
        $("results").hidden = false; say("status", "Done. Your letter is locked and the passphrase has been split into shares. Nothing was sent anywhere.");
        $("results").scrollIntoView({ behavior: "smooth", block: "start" });
      }).catch(function () { say("status", "Encryption failed in this browser.", true); }).then(function () { btn.disabled = false; btn.textContent = "Lock my letter and make shares"; });
    }, 30);
  }
  function dlAll() {
    if (!last) return;
    var t = "WILL MY CRYPTO - PLAN OUTPUT (PROTOTYPE, NOT FOR REAL FUNDS)\n\nThe locked letter is safe to store anywhere. The shares are the key: give each to a different person or place.\nAny " + last.k + " of the " + last.n + " shares open the letter. Never keep them all together.\n\n" + last.block + "\n";
    last.shares.forEach(function (s, i) { t += "\nSHARE " + (i + 1) + " (" + last.lab[i] + ")\n" + s + "\n"; });
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([t], { type: "text/plain" })); a.download = "will-my-crypto-demo-plan.txt";
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function clearAll() {
    ["letter", "ownpass", "block", "genpass", "heirs"].forEach(function (i) { $(i).value = ""; });
    $("shares").textContent = ""; $("results").hidden = true; last = null; say("status", "");
    try { sessionStorage.removeItem("wmc-plan"); } catch (e) {}
  }
  function sync() { $("ownwrap").hidden = !$("pm-own").checked; var n = +$("n").value; $("k").max = n; }
  document.addEventListener("DOMContentLoaded", function () {
    if (!window.crypto || !crypto.subtle) { $("nocrypto").hidden = false; $("app").hidden = true; return; }
    $("go").addEventListener("click", go); $("dl").addEventListener("click", dlAll); $("clear").addEventListener("click", clearAll);
    $("pm-gen").addEventListener("change", sync); $("pm-own").addEventListener("change", sync); $("n").addEventListener("input", sync);
    $("showgen").addEventListener("click", function () { var i = $("genpass"); i.type = i.type === "password" ? "text" : "password"; });
    $("sample").addEventListener("click", function () {
      $("heirs").value = "Anna Example\nBen Example";
      $("letter").value = "If you are reading this, I am not able to act for myself.\n\n1. My hardware wallet is in the grey box in the study closet.\n2. Its PIN is not in this letter. Ask my sister, who holds one share.\n3. Call my attorney, Jane Doe, before moving anything: 555-0100.\n4. Do not rush. Take your time and ask for help.";
    });
    window.addEventListener("pagehide", function () { $("letter").value = ""; $("ownpass").value = ""; });
    sync();
  });
})();
