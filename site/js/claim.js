/* Will My Crypto - Heir claim demo (PROTOTYPE). Runs only in this browser tab. No network. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var enc = new TextEncoder(), dec = new TextDecoder();
  function say(id, msg, bad) { var e = $(id); e.textContent = msg; e.className = "status " + (bad ? "bad" : "ok"); }
  function lines(t) { return t.split(/[\s]+/).map(function (s) { return s.trim(); }).filter(function (s) { return /^WMC1\./.test(s); }); }
  function recover() {
    $("out").value = ""; say("status", "");
    var shares = lines($("shares").value);
    if (!shares.length) return say("status", "Paste at least one share (they start with WMC1.).", true);
    var pass;
    try { pass = dec.decode(window.WMCShamir.combine(shares)); } catch (e) { return say("status", e.message, true); }
    var btn = $("go"); btn.disabled = true; btn.textContent = "Working...";
    setTimeout(function () {
      window.WMCCrypto.unlock($("block").value, pass).then(function (txt) {
        $("out").value = txt; say("status", "Recovered. The shares fit together and the letter opened. This text is only on your screen.");
      }).catch(function (e) { say("status", e.message, true); }).then(function () { btn.disabled = false; btn.textContent = "Put the shares together and open the letter"; });
    }, 30);
  }
  function sample() {
    var btn = $("sample"); btn.disabled = true;
    var pass = window.WMCCrypto.randomPassphrase();
    window.WMCCrypto.lock("SAMPLE LETTER (made in your browser just now)\n\nThe hardware wallet is in the grey box in the study closet.\nCall attorney Jane Doe before moving anything.\nTake your time.", pass, 600000).then(function (block) {
      var sh = window.WMCShamir.split(enc.encode(pass), 3, 5);
      $("block").value = block; $("shares").value = [sh[4], sh[0], sh[2]].join("\n");
      say("status", "A sample letter and three of five shares were filled in. Press the button to recover it. Try removing one share to see what happens.");
    }).then(function () { btn.disabled = false; });
  }
  function clearAll() { ["shares", "block", "out"].forEach(function (i) { $(i).value = ""; }); say("status", ""); }
  document.addEventListener("DOMContentLoaded", function () {
    if (!window.crypto || !crypto.subtle) { $("nocrypto").hidden = false; $("app").hidden = true; return; }
    $("go").addEventListener("click", recover); $("sample").addEventListener("click", sample); $("clear").addEventListener("click", clearAll);
    window.addEventListener("pagehide", clearAll);
  });
})();
