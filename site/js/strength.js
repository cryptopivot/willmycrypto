/* Will My Crypto - "how hard is it to crack?" maths and passphrase estimate (PROTOTYPE).
   Pure functions, no network. Used by encryption.html, letter.html, plan.html, and the tests.
   All numbers are estimates for education, not guarantees. */
(function (root) {
  "use strict";
  var LOG10_2 = Math.log10(2);
  var YEAR = 365.25 * 24 * 3600;                    // seconds
  var AGE_UNIVERSE_YEARS = 13.8e9;                  // about 13.8 billion years
  var AGE_UNIVERSE_S = AGE_UNIVERSE_YEARS * YEAR;   // about 4.35e17 s
  var SAND_GRAINS = 7.5e18;                         // popular estimate of grains of sand on Earth
  var PBKDF2_GUESSES_PER_GPU = 1e4;                 // rough: ~9 MH/s at 1,000 rounds => ~15 kH/s at 600,000 rounds per top consumer GPU

  function pow2(bits) { return Math.pow(2, bits); }
  function sci(log10v, digits) {
    digits = digits == null ? 2 : digits;
    var e = Math.floor(log10v), m = Math.pow(10, log10v - e);
    if (+m.toFixed(digits) >= 10) { m /= 10; e += 1; }
    return m.toFixed(digits) + " \u00D7 10^" + e;
  }
  function sciHtml(log10v, digits) {
    var s = sci(log10v, digits).split("^"); return s[0] + "<sup>" + s[1] + "</sup>";
  }
  /* average time (half the search space) in log10 seconds */
  function log10Seconds(bits, rate) { return bits * LOG10_2 - Math.log10(rate) - LOG10_2; }
  function num(n) { return n >= 100 ? String(Math.round(n)) : n >= 10 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/, ""); }
  /* plain-words duration from log10 seconds */
  function plain(l) {
    if (l < -3) return "instantly";
    var s = Math.pow(10, l);
    if (s < 1) return "less than a second";
    if (s < 90) return num(s) + (Math.round(s) === 1 ? " second" : " seconds");
    if (s < 5400) return num(s / 60) + " minutes";
    if (s < 129600) return num(s / 3600) + " hours";
    if (s < 86400 * 60) return num(s / 86400) + " days";
    var y = s / YEAR;
    if (y < 1) return num(y * 12) + " months";
    if (y < 1000) return num(y) + (Math.round(y) === 1 ? " year" : " years");
    if (y < 1e6) return num(y / 1e3) + " thousand years";
    if (y < 1e9) return num(y / 1e6) + " million years";
    if (y < 1e12) return num(y / 1e9) + " billion years";
    if (y < 1e15) return num(y / 1e12) + " trillion years";
    return sci(l - Math.log10(YEAR), 1) + " years";
  }
  function universes(l) { return l + 0 - Math.log10(AGE_UNIVERSE_S); } // log10 of (time / age of universe)
  function universeWords(l) {
    var u = universes(l);
    if (u < -3) return "a tiny fraction of the age of the universe";
    if (u < 0) return Math.pow(10, u) < 0.01 ? "under 1% of the age of the universe" : num(Math.pow(10, u) * 100) + "% of the age of the universe";
    if (u < 6) return "about " + num(Math.pow(10, u)) + " times the age of the universe";
    return "about " + sci(u, 1) + " times the age of the universe";
  }
  /* fraction of the whole space an attacker covers in the age of the universe, as a log10 */
  function coverageLog10(bits, rate) { return Math.log10(rate) + Math.log10(AGE_UNIVERSE_S) - bits * LOG10_2; }


  /* ---------- plain-English results (added) ---------- */
  var NAMES = ["", "thousand", "million", "billion", "trillion", "quadrillion", "quintillion", "sextillion", "septillion", "octillion", "nonillion", "decillion", "undecillion", "duodecillion", "tredecillion", "quattuordecillion", "quindecillion", "sexdecillion", "septendecillion", "octodecillion", "novemdecillion", "vigintillion"];
  function group(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  /* a big number in words from its log10, e.g. 17.65 -> "45 quadrillion" */
  function words(l) {
    if (l < 3) return String(Math.max(1, Math.round(Math.pow(10, l))));
    if (l < 6) return group(Math.round(Math.pow(10, l)));
    var k = Math.floor(l / 3);
    if (k >= NAMES.length) return "a 1 followed by " + Math.floor(l) + " zeros";
    var m = Math.pow(10, l - 3 * k), t = m >= 100 ? Math.round(m) : m >= 10 ? Math.round(m) : Math.round(m * 10) / 10;
    if (t >= 1000) { t = Math.round(t / 1000 * 10) / 10; k += 1; if (k >= NAMES.length) return "a 1 followed by " + Math.floor(l) + " zeros"; }
    return String(t).replace(/\.0$/, "") + " " + NAMES[k];
  }
  /* time-needed (log10 seconds) as a human sentence fragment, no scientific notation */
  function yearsWords(l) {
    var y = Math.pow(10, l - Math.log10(YEAR));
    if (y < 1e6) return plain(l);
    return words(Math.log10(y)) + " years";
  }
  function analogy(ly) {   /* ly = log10 of years */
    var y = Math.pow(10, ly);
    if (y < 100) return "";
    if (y < 1e3) return "longer than any person has lived";
    if (y < 1e4) return "on the scale of all recorded history (about 5,000 years so far)";
    if (y < 3e5) return "far longer than recorded history";
    if (y < 6.6e7) return "longer than modern humans have existed (about 300,000 years)";
    if (y < 4.5e9) return "longer than the time since the dinosaurs died out (66 million years)";
    if (y < AGE_UNIVERSE_YEARS) return "longer than the Earth has existed (4.5 billion years)";
    return "";
  }
  function levelOf(l) {
    var ly = l - Math.log10(YEAR);
    return ly < 0 ? 1 : ly < 2 ? 2 : 3;     // under a year / up to 100 years / beyond
  }
  var LEVELS = {
    1: { level: 1, key: "fast", label: "Cracked in seconds", color: "#b4382a" },
    2: { level: 2, key: "years", label: "Cracked in years", color: "#a86a00" },
    3: { level: 3, key: "never", label: "Practically impossible", color: "#0f6a5c" }
  };
  /* Everything the result panel shows, computed from real numbers. who = "this machine" etc. */
  function describe(bits, rate, opt) {
    opt = opt || {};
    var who = opt.who || "this machine", l = log10Seconds(bits, rate), ly = l - Math.log10(YEAR), lvl = levelOf(l);
    var v = {}; for (var k in LEVELS[lvl]) v[k] = LEVELS[lvl][k];
    var sec = Math.pow(10, l), unit = sec < 90 ? "seconds" : sec < 5400 ? "minutes" : sec < 129600 ? "hours" : sec < 86400 * 60 ? "days" : "months";
    if (lvl === 1) v.label = unit === "seconds" ? "Cracked in seconds" : "Cracked in " + unit;
    var space = bits * LOG10_2, lsand = Math.log10(SAND_GRAINS), lguess = Math.log10(rate) + Math.log10(AGE_UNIVERSE_S);
    var earthsAll = space - lsand, earthsChecked = lguess - lsand, headline, extra = "";
    var capWho = who.charAt(0).toUpperCase() + who.slice(1);
    var pl = plain(l), aboutPl = /^\d/.test(pl) ? "about " + pl : pl;
    if (lvl === 1) {
      headline = capWho + " would find it " + (pl === "instantly" ? "instantly" : "in " + aboutPl + ", on average") + ". That is not a safe lock.";
    } else if (lvl === 2) {
      headline = capWho + " would need " + aboutPl + " of non-stop guessing, on average. A huge effort, but within reach of a determined attacker.";
    } else {
      var u = universes(l), an = analogy(ly);
      var timeLine = "On average, guessing non-stop, " + who + " would need about " + yearsWords(l) + (u >= 0 ? ": " + (u < 6 ? "about " + num(Math.pow(10, u)) : words(u)) + " times the age of the universe." : (an ? ", " + an + "." : "."));
      if (lguess < space) {
        headline = "If every possible answer were one grain of sand, you would need all the sand on " + words(earthsAll) + " Earths. In the entire age of the universe, " + who + " could check only the sand of " + words(earthsChecked) + " of them: one Earth's worth out of every " + words(earthsAll - earthsChecked) + ".";
        extra = timeLine;
      } else {
        headline = timeLine;
        if (rate >= 1e21) extra = "Note: this speed is not buildable. It is only here to show that the answer stays enormous even when we are absurdly generous.";
      }
    }
    var cov = coverageLog10(bits, rate);
    var math = [
      "Possibilities: 2^" + bits + " = " + sci(space, 3),
      "Guesses per second: " + sci(Math.log10(rate), 2),
      "Average time to find it (half the search): " + sci(l, 3) + " seconds = " + (ly > 0 ? sci(ly, 3) : (Math.pow(10, ly)).toPrecision(3)) + " years",
      "Age of the universe: about 13.8 billion years (" + sci(Math.log10(AGE_UNIVERSE_S), 2) + " seconds); time needed is " + sci(universes(l), 2) + " times that",
      "Share of all possibilities checked in the age of the universe: " + (cov >= 0 ? "all of it" : sci(cov + 2, 2) + "%"),
      "Sand: about " + sci(lsand, 1) + " grains on Earth (a popular estimate); the possibilities equal " + sci(earthsAll, 2) + " Earths of sand; " + (lguess < space ? "checked: " + sci(earthsChecked, 2) + " Earths" : "all of it could be checked")
    ];
    return { level: lvl, verdict: v, headline: headline, extra: extra, math: math, l: l, ly: ly, log10Earths: earthsAll, log10Checked: earthsChecked };
  }
  /* draw a describe() result into an element (browser only; all text is set as text) */
  var ICONS = {
    1: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.5 20h19z"/><path d="M12 10v4.5M12 17.5h.01"/></svg>',
    2: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/></svg>',
    3: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4.5 6v5.5c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V6z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/></svg>'
  };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function render(box, d, opt) {
    opt = opt || {};
    box.className = (box.className.replace(/\bverdict\b|\bv[123]\b/g, "") + " verdict v" + d.level).replace(/\s+/g, " ").trim();
    while (box.firstChild) box.removeChild(box.firstChild);
    var badge = el("div", "vbadge"); badge.innerHTML = ICONS[d.level]; badge.appendChild(el("b", "", d.verdict.label)); box.appendChild(badge);
    box.appendChild(el("p", "vhead", d.headline));
    if (d.extra && opt.extra !== false) box.appendChild(el("p", "vextra", d.extra));
    if (opt.legend !== false) {
      var ul = el("ul", "vleg"); ul.setAttribute("aria-label", "The three verdicts");
      [["Cracked in seconds", 1], ["Cracked in years", 2], ["Practically impossible", 3]].forEach(function (x) {
        var li = el("li", "l" + x[1] + (x[1] === d.level ? " on" : ""), x[0]); if (x[1] === d.level) li.setAttribute("aria-current", "true"); ul.appendChild(li);
      });
      box.appendChild(ul);
    }
    if (opt.math !== false) {
      var det = el("details", "vmath"), sm = el("summary", "", "Show the math"), m = el("ul"); det.appendChild(sm);
      d.math.forEach(function (t) { var li = el("li"); li.innerHTML = t.replace(/\^(-?\d+)/g, "<sup>$1</sup>"); m.appendChild(li); });
      det.appendChild(m); box.appendChild(det);
    }
  }

  var COMMON = ("password,passw0rd,123456,1234567,12345678,123456789,1234567890,qwerty,qwertyuiop,abc123,letmein,welcome,admin,iloveyou,monkey,dragon,football,baseball,master,sunshine,princess,login,starwars,shadow,superman,trustno1,hello,freedom,whatever,qazwsx,password1,bitcoin,crypto,satoshi,ethereum,hodl,tomoon,wallet,blockchain,passphrase,secret,changeme,default,test,testing,letmein1,mypassword,cryptopassword,ilovecrypto,bitcoin1,family,summer,winter,spring,autumn,soccer,hockey,batman,jordan,michael,jennifer,charlie,thomas,daniel,andrew,joshua,matthew,ashley,nicole,jessica,love,lovely,angel,pass,pass123,welcome1,administrator,correcthorsebatterystaple,thequickbrownfox,opensesame,iloveyou1,zaq12wsx,1q2w3e4r,asdfghjkl,zxcvbnm").split(",");
  var COMMON_SET = {}; COMMON.forEach(function (w) { COMMON_SET[w] = 1; });
  var LEET = { "@": "a", "0": "o", "1": "i", "!": "i", "$": "s", "3": "e", "4": "a", "5": "s", "7": "t" };
  function pool(p) {
    var n = 0;
    if (/[a-z]/.test(p)) n += 26; if (/[A-Z]/.test(p)) n += 26; if (/[0-9]/.test(p)) n += 10;
    if (/[^A-Za-z0-9 ]/.test(p)) n += 33; if (/ /.test(p)) n += 1;
    return n || 1;
  }
  /* estimate bits of guessing work. Returns {bits, why}. Deliberately cautious about human-chosen text. */
  function estimate(p) {
    if (!p) return null;
    if (/^([A-Z2-9]{5}-){4}[A-Z2-9]{5}$/.test(p)) return { bits: 125, why: "Randomly generated (25 characters from a 32-character set)." };
    var low = p.toLowerCase(), flat = low.replace(/[^a-z0-9]/g, "");
    var unleet = low.replace(/[@01!$3457]/g, function (c) { return LEET[c]; }).replace(/[^a-z]/g, "");
    var base = low.replace(/[\d\W_]+$/, "").replace(/[^a-z]/g, "");
    var baseLeet = low.replace(/[\d\W_]+$/, "").replace(/[@01!$3457]/g, function (c) { return LEET[c]; }).replace(/[^a-z]/g, "");
    if (COMMON_SET[flat] || COMMON_SET[unleet] || COMMON_SET[base] || COMMON_SET[baseLeet]) return { bits: 12 + Math.min(6, Math.max(0, p.length - 8)), why: "Close to a very common password or phrase. Attackers try these first." };
    if (/^[a-z]+([ \-_.][a-z]+)*$/.test(p)) {
      var words = p.split(/[ \-_.]+/).filter(Boolean);
      return { bits: words.length * 11, why: "Made of plain lowercase words. We assume about 11 bits per everyday word (a vocabulary of roughly 2,000). Truly random words from a bigger list are better." };
    }
    var n = p.length, i, run;
    // repeated characters
    for (i = 0; i < p.length;) { run = 1; while (p[i + run] === p[i]) run++; if (run >= 3) n -= (run - 1) * 0.9; i += run; }
    // ascending or descending sequences of 3+
    for (i = 0; i < p.length - 2;) {
      var dlt = p.charCodeAt(i + 1) - p.charCodeAt(i), L = 2;
      if (Math.abs(dlt) === 1) { while (i + L < p.length && p.charCodeAt(i + L) - p.charCodeAt(i + L - 1) === dlt) L++; if (L >= 3) { n -= (L - 1) * 0.8; i += L; continue; } }
      i++;
    }
    var bits = Math.max(1, n) * Math.log2(pool(p));
    var why = "Based on length and variety of characters.";
    var core = unleet;
    if (core.length >= 5 && core.length <= 20 && /^[^aeiouy]{0,2}([aeiouy]+[^aeiouy]{1,2})*[aeiouy]*$/.test(core) && (p.replace(/[A-Za-z]/g, "").length <= 4)) {
      var wb = 11 * Math.ceil(core.length / 7) + 8;
      if (wb < bits) { bits = wb; why = "Looks like a word with digits or symbols swapped in. Attackers try those swaps routinely."; }
    }
    if (/(19|20)\d\d$/.test(p)) { bits -= 8; why = "Ends in a year, which is easy to guess."; }
    if (/^[A-Z][a-z]+[0-9!@#$%&*?]{1,3}$/.test(p)) { bits = Math.min(bits, 24); why = "A capitalised word with a number or symbol on the end is a pattern attackers try early."; }
    return { bits: Math.max(1, Math.min(256, bits)), why: why };
  }
  function verdict(bits) {
    if (bits < 28) return { key: "weak", label: "Very weak", color: "#c9604d", pct: 10 };
    if (bits < 45) return { key: "weak2", label: "Weak", color: "#d2823b", pct: 30 };
    if (bits < 64) return { key: "ok", label: "Fair", color: "#d9a400", pct: 55 };
    if (bits < 80) return { key: "good", label: "Strong", color: "#4aa56b", pct: 80 };
    return { key: "great", label: "Very strong", color: "#1db39c", pct: 100 };
  }
  var api = { LOG10_2: LOG10_2, YEAR: YEAR, AGE_UNIVERSE_YEARS: AGE_UNIVERSE_YEARS, AGE_UNIVERSE_S: AGE_UNIVERSE_S, SAND_GRAINS: SAND_GRAINS, PBKDF2_GUESSES_PER_GPU: PBKDF2_GUESSES_PER_GPU,
    sci: sci, sciHtml: sciHtml, log10Seconds: log10Seconds, plain: plain, universes: universes, universeWords: universeWords, coverageLog10: coverageLog10, estimate: estimate, verdict: verdict, pow2: pow2, words: words, yearsWords: yearsWords, describe: describe, render: render, levelOf: levelOf };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.WMCStrength = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
