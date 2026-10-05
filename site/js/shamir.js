/* Will My Crypto - Shamir's Secret Sharing over GF(256) (AES field, polynomial 0x11b).
   PROTOTYPE. Not independently audited. Splits a byte string into n shares; any k rebuild it.
   Share text format:  WMC1.<setid>.<k>.<n>.<x>.<data base64url>.<crc32 hex>
   Works in browsers and in Node (for tests). */
(function (root) {
  "use strict";
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      var x2 = x << 1; if (x2 & 0x100) x2 ^= 0x11b;
      x = x2 ^ x; // multiply by generator 3
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();
  function mul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }
  function div(a, b) { if (b === 0) throw new Error("divide by zero"); return a === 0 ? 0 : EXP[LOG[a] + 255 - LOG[b]]; }
  function rnd(n) {
    var c = root.crypto || (typeof require === "function" ? require("crypto").webcrypto : null);
    var a = new Uint8Array(n); c.getRandomValues(a); return a;
  }
  function crc32(str) {
    var c, crc = 0xFFFFFFFF;
    for (var i = 0; i < str.length; i++) {
      c = (crc ^ str.charCodeAt(i)) & 0xFF;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      crc = (crc >>> 8) ^ c;
    }
    return ((crc ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, "0");
  }
  function b64u(bytes) {
    var s = ""; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function unb64u(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "=";
    var r = atob(s), b = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) b[i] = r.charCodeAt(i); return b;
  }
  function hex(bytes) { var s = ""; for (var i = 0; i < bytes.length; i++) s += (bytes[i] < 16 ? "0" : "") + bytes[i].toString(16); return s; }

  /* secret: Uint8Array (1..1024 bytes). Returns array of share strings. */
  function split(secret, k, n) {
    if (!(secret instanceof Uint8Array) || secret.length < 1 || secret.length > 1024) throw new Error("secret must be 1 to 1024 bytes");
    if (!(k >= 2 && n >= k && n <= 16)) throw new Error("need 2 <= k <= n <= 16");
    var setid = hex(rnd(4)), ys = [], x, i, j;
    for (x = 0; x < n; x++) ys.push(new Uint8Array(secret.length));
    for (i = 0; i < secret.length; i++) {
      var coef = rnd(k - 1), full = new Uint8Array(k);
      full[0] = secret[i];
      for (j = 1; j < k; j++) full[j] = coef[j - 1];
      for (x = 1; x <= n; x++) {
        var y = 0; // Horner
        for (j = k - 1; j >= 0; j--) y = mul(y, x) ^ full[j];
        ys[x - 1][i] = y;
      }
    }
    var out = [];
    for (x = 1; x <= n; x++) {
      var body = ["WMC1", setid, k, n, x, b64u(ys[x - 1])].join(".");
      out.push(body + "." + crc32(body));
    }
    return out;
  }
  function parse(text) {
    var t = String(text).trim();
    var p = t.split(".");
    if (p.length !== 7 || p[0] !== "WMC1") throw new Error("That does not look like a Will My Crypto share.");
    var body = p.slice(0, 6).join(".");
    if (crc32(body) !== p[6].toLowerCase()) throw new Error("A share has a typing error (checksum failed): " + t.slice(0, 18) + "...");
    var k = +p[2], n = +p[3], x = +p[4];
    if (!/^[0-9a-f]{8}$/.test(p[1]) || !(k >= 2 && n >= k && n <= 16 && x >= 1 && x <= n)) throw new Error("A share is malformed.");
    var data; try { data = unb64u(p[5]); } catch (e) { throw new Error("A share is malformed."); }
    if (!data.length) throw new Error("A share is malformed.");
    return { setid: p[1], k: k, n: n, x: x, data: data };
  }
  /* shareTexts: array of strings. Returns Uint8Array secret. Throws readable errors. */
  function combine(shareTexts) {
    var shares = shareTexts.map(parse), i, j, seen = {}, uniq = [];
    if (!shares.length) throw new Error("Paste at least one share.");
    for (i = 0; i < shares.length; i++) {
      if (shares[i].setid !== shares[0].setid) throw new Error("These shares come from different plans. Use shares made together.");
      if (shares[i].data.length !== shares[0].data.length || shares[i].k !== shares[0].k) throw new Error("These shares do not match each other.");
      if (!seen[shares[i].x]) { seen[shares[i].x] = 1; uniq.push(shares[i]); }
    }
    var k = shares[0].k;
    if (uniq.length < k) throw new Error("You need " + k + " different shares; you have " + uniq.length + ".");
    var use = uniq.slice(0, k), len = use[0].data.length, out = new Uint8Array(len);
    for (var b = 0; b < len; b++) {
      var s = 0;
      for (i = 0; i < k; i++) {
        var num = 1, den = 1;
        for (j = 0; j < k; j++) if (j !== i) { num = mul(num, use[j].x); den = mul(den, use[i].x ^ use[j].x); }
        s ^= mul(use[i].data[b], div(num, den));
      }
      out[b] = s;
    }
    return out;
  }
  var api = { split: split, combine: combine, parse: parse, crc32: crc32 };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.WMCShamir = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
