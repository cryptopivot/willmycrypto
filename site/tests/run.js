/* Node tests: node tests/run.js   (Node 18+). No dependencies. */
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const S = require("../js/shamir.js");
const C = require("../js/wmc-crypto.js");
const Sim = require("../js/sim-core.js");
const St = require("../js/strength.js");
global.window = global;
require("../js/guard.js");
const enc = new TextEncoder(), dec = new TextDecoder();
let passed = 0;
async function t(name, fn) { await fn(); passed++; console.log("ok  - " + name); }
function subsets(arr, k) { const out = []; (function rec(s, cur) { if (cur.length === k) return out.push(cur.slice()); for (let i = s; i < arr.length; i++) { cur.push(arr[i]); rec(i + 1, cur); cur.pop(); } })(0, []); return out; }

(async () => {
  await t("Shamir: every k-subset of n rebuilds the secret", () => {
    for (const [k, n] of [[2, 3], [3, 5], [4, 6], [5, 7], [2, 2], [3, 3]]) {
      const secret = enc.encode("pässphrase-ÜÑ-" + k + n + "-ABCDE-12345");
      const shares = S.split(secret, k, n);
      assert.strictEqual(shares.length, n);
      for (const sub of subsets(shares, k)) assert.deepStrictEqual(Array.from(S.combine(sub)), Array.from(secret));
      // extra shares beyond k are fine
      assert.deepStrictEqual(Array.from(S.combine(shares)), Array.from(secret));
    }
  });
  await t("Shamir: fewer than k shares is refused", () => {
    const shares = S.split(enc.encode("hello world secret"), 3, 5);
    assert.throws(() => S.combine(shares.slice(0, 2)), /need 3 different shares/);
    assert.throws(() => S.combine([shares[0], shares[0], shares[1]]), /need 3 different shares/);
  });
  await t("Shamir: k-1 shares do not rebuild the secret (forced past the check)", () => {
    const secret = enc.encode("the-real-secret-value");
    let wrong = 0;
    for (let r = 0; r < 20; r++) {
      const sh = S.split(secret, 3, 5).slice(0, 2).map(S.parse);
      // pretend k=2 by combining 2 shares as if threshold were 2: result must not equal the secret
      const fake = sh.map(s => S.split.length && s); // keep parsed
      const mix = fake.map(s => { const b = ["WMC1", s.setid, 2, s.n, s.x, Buffer.from(s.data).toString("base64url")].join("."); return b + "." + S.crc32(b); });
      const out = S.combine(mix);
      if (Buffer.compare(Buffer.from(out), Buffer.from(secret)) !== 0) wrong++;
    }
    assert.strictEqual(wrong, 20);
  });
  await t("Shamir: shares from different plans and typos are caught", () => {
    const a = S.split(enc.encode("secret one"), 2, 3), b = S.split(enc.encode("secret two"), 2, 3);
    assert.throws(() => S.combine([a[0], b[1]]), /different plans/);
    const bad = a[0].slice(0, -9) + (a[0][a[0].length - 10] === "A" ? "B" : "A") + a[0].slice(-9);
    assert.throws(() => S.combine([bad, a[1]]), /typing error|malformed/);
    assert.throws(() => S.parse("hello"), /does not look like/);
  });
  await t("Shamir: a single share leaks nothing obvious (different each run)", () => {
    const s1 = S.split(enc.encode("same secret"), 3, 5)[0], s2 = S.split(enc.encode("same secret"), 3, 5)[0];
    assert.notStrictEqual(s1, s2);
  });
  await t("Crypto: lock and unlock round trip (unicode)", async () => {
    const block = await C.lock("Gris-gris in the grey box. Appelez Jean. \u2713", "long quiet river stone 4421", 1000);
    assert.ok(block.startsWith(C.BEGIN));
    assert.strictEqual(await C.unlock(block, "long quiet river stone 4421"), "Gris-gris in the grey box. Appelez Jean. \u2713");
  });
  await t("Crypto: wrong passphrase and tampering fail", async () => {
    const block = await C.lock("hello", "right-passphrase-12345", 1000);
    await assert.rejects(C.unlock(block, "wrong-passphrase-12345"), /Could not open/);
    const lines = block.split("\n"); lines[1] = (lines[1][0] === "A" ? "B" : "A") + lines[1].slice(1);
    await assert.rejects(C.unlock(lines.join("\n"), "right-passphrase-12345"));
    await assert.rejects(C.unlock("garbage", "x"), /does not look like/);
  });
  await t("Crypto: opens a letter made by letter.html (fixture)", async () => {
    const fx = fs.readFileSync(path.join(__dirname, "fixture-letter.txt"), "utf8");
    assert.ok((await C.unlock(fx, "correct horse battery staple 99")).includes("Jane Doe"));
  });
  await t("End to end: letter, random passphrase, 3-of-5 shares, claim", async () => {
    const pass = C.randomPassphrase();
    assert.match(pass, /^([A-Z2-9]{5}-){4}[A-Z2-9]{5}$/);
    const block = await C.lock("Wallet in the safe. Call attorney Jane Doe first.", pass, 1000);
    const shares = S.split(enc.encode(pass), 3, 5);
    const picked = [shares[4], shares[1], shares[2]];
    const back = dec.decode(S.combine(picked));
    assert.strictEqual(back, pass);
    assert.strictEqual(await C.unlock(block, back), "Wallet in the safe. Call attorney Jane Doe first.");
    assert.throws(() => S.combine([shares[0], shares[1]]), /need 3/);
  });
  await t("Schedule: validation and escalation order", () => {
    assert.strictEqual(Sim.validate({}), null);
    assert.ok(Sim.validate({ reminder2: 0 }));
    assert.ok(Sim.validate({ trusted: 50, graceDays: 45 }));
    assert.ok(Sim.validate({ intervalDays: 3 }));
    assert.deepStrictEqual(Sim.steps({}).map(s => s.id), ["r1", "r2", "tc", "rel"]);
  });
  await t("Schedule: steps fire at the right days; check-in resets", () => {
    const p = { intervalDays: 90, graceDays: 45, reminder1: 0, reminder2: 7, trusted: 28 };
    const ids = (last, now) => Sim.fired(p, last, now).map(s => s.id).join(",");
    assert.strictEqual(ids(0, 89), "");
    assert.strictEqual(ids(0, 90), "r1");
    assert.strictEqual(ids(0, 96), "r1");
    assert.strictEqual(ids(0, 97), "r1,r2");
    assert.strictEqual(ids(0, 118), "r1,r2,tc");
    assert.strictEqual(ids(0, 134), "r1,r2,tc");
    assert.strictEqual(ids(0, 135), "r1,r2,tc,rel");
    assert.strictEqual(ids(120, 135), "");      // false alarm: checked in on day 120
    assert.strictEqual(Sim.dueDay(p, 120), 210);
  });
  await t("Guard: seed phrase and keys are flagged, normal prose is not", () => {
    const g = window.WMCGuard.looksSensitive;
    assert.ok(g("abandon ability able about above absent absorb abstract absurd abuse access accident"));
    assert.ok(g("0x" + "ab".repeat(32)));
    assert.strictEqual(g("The hardware wallet is in the grey box in the study. Call attorney Jane Doe."), null);
  });
  await t("Strength: exact powers of two and the sand/universe comparisons", () => {
    assert.strictEqual(St.sci(128 * St.LOG10_2), "3.40 \u00D7 10^38");
    assert.strictEqual(St.sci(256 * St.LOG10_2), "1.16 \u00D7 10^77");
    // 2^128 / 7.5e18 sand grains is about 4.5e19 Earths
    assert.strictEqual(St.sci(128 * St.LOG10_2 - Math.log10(St.SAND_GRAINS), 1), "4.5 \u00D7 10^19");
    // 1 trillion guesses a second, average (half the space): about 5.4e18 years, hundreds of millions of universe-ages
    const l = St.log10Seconds(128, 1e12), years = Math.pow(10, l - Math.log10(St.YEAR));
    assert.ok(years > 5.3e18 && years < 5.5e18, "years=" + years);
    assert.ok(St.universeWords(l).includes("10^8"), St.universeWords(l));
    assert.ok(St.log10Seconds(256, 1e12) > St.log10Seconds(128, 1e12) + 38);
    assert.ok(St.coverageLog10(128, 1e12) < -8);
  });
  await t("Strength: plain-words durations", () => {
    assert.strictEqual(St.plain(-5), "instantly");
    assert.strictEqual(St.plain(Math.log10(30)), "30 seconds");
    assert.strictEqual(St.plain(Math.log10(7200)), "2.0 hours".replace(".0", ""));
    assert.ok(/million years/.test(St.plain(Math.log10(3.2e7 * 5e6))));
    assert.ok(/10\^/.test(St.plain(Math.log10(3.2e7 * 1e20))));
  });
  await t("Strength: plain-English results match exact BigInt arithmetic", () => {
    // average seconds = 2^(bits-1) / rate, computed exactly with BigInt, then compared with the JS floating-point result
    const exactSecs = (bits, rate) => Number((2n ** BigInt(bits - 1)) * 10n ** 6n / BigInt(rate)) / 1e6;
    for (const [bits, rate] of [[128, 1e12], [128, 1e9], [256, 1e12], [64, 1e7]]) {
      const want = exactSecs(bits, rate), got = Math.pow(10, St.log10Seconds(bits, rate));
      assert.ok(Math.abs(got / want - 1) < 1e-9, bits + "/" + rate);
    }
    const d = St.describe(128, 1e12);
    assert.strictEqual(d.level, 3); assert.strictEqual(d.verdict.label, "Practically impossible");
    assert.ok(/5\.4 quintillion years/.test(d.extra) && /391 million times the age of the universe/.test(d.extra), d.extra);
    assert.ok(/45 quintillion Earths/.test(d.headline) && /58 billion of them/.test(d.headline), d.headline);
    assert.ok(!/10\^|e\+|%/.test(d.headline + d.extra), "no sci notation or percentages in the headline");
    assert.ok(/10\^/.test(d.math.join(" ")), "exact figures live in the math list");
    // checked Earths = rate * age(s) / 7.5e18, exactly: 1e12 * 13.8e9 * 365.25 * 86400 / 7.5e18
    assert.ok(Math.abs(Math.pow(10, d.log10Checked) / (1e12 * 13.8e9 * 365.25 * 86400 / 7.5e18) - 1) < 1e-9);
    assert.strictEqual(St.words(Math.log10(4.5e19)), "45 quintillion");
    assert.strictEqual(St.words(Math.log10(5800)), "5,800");
  });
  await t("Strength: three verdict levels", () => {
    assert.strictEqual(St.describe(30, 1e7).level, 1);
    assert.strictEqual(St.describe(30, 1e7).verdict.label, "Cracked in seconds");
    assert.strictEqual(St.describe(44, 1e7).level, 1);       // about 10 days
    assert.ok(/days/.test(St.describe(44, 1e7).verdict.label));
    assert.strictEqual(St.describe(52, 1e7).level, 2);       // years
    assert.strictEqual(St.describe(256, 1e12).level, 3);
    assert.strictEqual(St.describe(125, 1e7).level, 3);
  });
  await t("Strength: weak passphrases fall fast, long random ones do not", () => {
    const rate = 1e7, secs = p => Math.pow(10, St.log10Seconds(St.estimate(p).bits, rate));
    for (const weak of ["password", "Password1!", "summer2019", "P@ssw0rd", "Tr0ub4dor&3", "correct horse battery staple 99", "aaaaaaaaaaaa", "abcdef123456"])
      assert.ok(secs(weak) < 3600, weak + " took " + secs(weak) + "s");
    assert.ok(secs("ABCDE-23456-FGHJK-LMNPQ-RSTUV") > St.YEAR * 1e12);          // generated by the Plan demo
    assert.ok(secs("Kj8$mN2#qR5!pL9@") > St.YEAR * 1e3);
    assert.ok(St.estimate("") === null);
    assert.strictEqual(St.verdict(10).label, "Very weak");
    assert.strictEqual(St.verdict(100).label, "Very strong");
  });
  await t("Counter: only the quiz page's script can make network requests; demo pages stay blocked", () => {
    const root = path.join(__dirname, "..");
    for (const f of fs.readdirSync(path.join(root, "js")).filter(n => n.endsWith(".js"))) {
      const src = fs.readFileSync(path.join(root, "js", f), "utf8");
      const net = /fetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/.test(src);
      assert.strictEqual(net, f === "quiz.js", f + (net ? " makes network requests" : " should not"));
      assert.strictEqual(src.includes("count.php"), f === "quiz.js", f + " and count.php");
    }
    for (const f of fs.readdirSync(root).filter(n => n.endsWith(".html"))) {
      const html = fs.readFileSync(path.join(root, f), "utf8");
      assert.ok(!html.includes("count.php"), f + " mentions count.php");
      assert.ok(!/<script[^>]*src="https?:/i.test(html), f + " loads an outside script");
    }
    for (const f of ["letter", "plan", "simulator", "claim", "encryption"]) {
      const html = fs.readFileSync(path.join(root, f + ".html"), "utf8");
      assert.ok(/connect-src 'none'/.test(html) && /form-action 'none'/.test(html), f + ".html must block network connections");
    }
  });
  await t("Counter: quiz sends one bare 'quiz_start' signal on the first answer, nothing else, and honours Do Not Track", () => {
    function run(navExtra) {
      const sent = [], listeners = {};
      function node() {
        const n = { style: {}, children: [], attrs: {}, hidden: false, disabled: false, value: "", checked: false, textContent: "",
          setAttribute(k, v) { n.attrs[k] = v; }, appendChild(c) { n.children.push(c); return c; },
          addEventListener(ev, fn) { (n.handlers = n.handlers || {})[ev] = fn; } };
        return n;
      }
      const nodes = {};
      const ctx = {
        window: { navigator: Object.assign({}, navExtra), scrollTo() {} },
        document: { getElementById: id => nodes[id] || (nodes[id] = node()), createElement: () => node(), createTextNode: () => node(),
          addEventListener(ev, fn) { listeners[ev] = fn; } },
        fetch: (url, opt) => { sent.push({ url, body: String(opt.body), method: opt.method }); return Promise.resolve({ ok: true }); },
        URLSearchParams, location: { reload() {} }, Object
      };
      ctx.window.navigator = ctx.window.navigator; ctx.window.window = ctx.window;
      require("vm").runInNewContext(fs.readFileSync(path.join(__dirname, "..", "js", "quiz.js"), "utf8"), Object.assign(ctx, { navigator: ctx.window.navigator }));
      listeners.DOMContentLoaded();
      const radios = [];
      (function walk(n) { if (n.attrs && n.attrs.type === "radio") radios.push(n); (n.children || []).forEach(walk); })(nodes.questions);
      assert.ok(radios.length >= 10, "found quiz radios");
      radios[0].handlers.change(); radios[1].handlers.change(); radios[5].handlers.change();
      return sent;
    }
    let sent = run({});
    assert.strictEqual(sent.length, 1, "exactly one signal for several answers");
    assert.deepStrictEqual(sent[0], { url: "count.php", body: "e=quiz_start", method: "POST" });
    assert.strictEqual(run({ doNotTrack: "1" }).length, 0, "Do Not Track");
    assert.strictEqual(run({ globalPrivacyControl: true }).length, 0, "Global Privacy Control");
  });
  await t("Counter: privacy page says what is counted", () => {
    const p = fs.readFileSync(path.join(__dirname, "..", "privacy.html"), "utf8");
    for (const w of ["Simple counts", "one number per day", "There is no IP address", "no cookie", "no outside service", "a quiz was started", "Do Not Track", "are not part of any counting"])
      assert.ok(p.includes(w), "privacy.html should say: " + w);
  });
  await t("Error pages: 403, 404, 500, 503 are noindex, self-contained, use root-relative links and link home, quiz and contact", () => {
    const root = path.join(__dirname, "..");
    for (const code of ["403", "404", "500", "503"]) {
      const h = fs.readFileSync(path.join(root, code + ".html"), "utf8");
      assert.ok(h.includes("Error " + code), code + " names its error");
      assert.ok(/<meta name="robots" content="noindex,nofollow">/.test(h), code + " noindex");
      assert.ok(/connect-src 'none'/.test(h) && /form-action 'none'/.test(h), code + " blocks network connections");
      assert.ok(!/(https?:)?\/\/(?!www\.w3\.org|willmycrypto\.com)[a-z0-9.-]+\.[a-z]{2,}/i.test(h.replace(/<meta property="og:[^>]*>/g, "")), code + " mentions an outside host");
      assert.ok(!h.includes("count.php") && !/<form/i.test(h), code + " has no counter or form");
      assert.ok(!h.includes("\u2014") && !h.includes("&mdash;"), code + " has an em dash");
      for (const m of h.matchAll(/\b(?:href|src)="([^"]*)"/g)) assert.ok(/^(\/|#|https?:|mailto:)/.test(m[1]), code + " relative link would break on deep URLs: " + m[1]);
      for (const need of ['href="/index.html"', 'href="/quiz.html"', 'href="/lawyers.html"']) assert.ok(h.includes(need), code + " links " + need);
      assert.ok(!/src="\/js\/(?!fx\.js)/.test(h), code + " loads a script other than fx.js");
    }
  });
  console.log("\n" + passed + " tests passed");
})().catch(e => { console.error("FAIL:", e && e.stack || e); process.exit(1); });
