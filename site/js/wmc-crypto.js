/* Will My Crypto - shared letter crypto (PROTOTYPE). Same format as letter.html:
   AES-256-GCM, key from passphrase via PBKDF2-SHA256, associated data "wmc-letter-v1".
   Everything runs in the browser (or Node for tests). No network. */
(function (root) {
  "use strict";
  var BEGIN = "-----BEGIN WILL MY CRYPTO LETTER (PROTOTYPE)-----", END = "-----END WILL MY CRYPTO LETTER (PROTOTYPE)-----";
  var enc = new TextEncoder(), dec = new TextDecoder(), AAD = enc.encode("wmc-letter-v1");
  function C() { return root.crypto || require("crypto").webcrypto; }
  function b64(buf) { var s = "", b = new Uint8Array(buf); for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }
  function unb64(s) { var r = atob(s), b = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) b[i] = r.charCodeAt(i); return b; }
  function derive(pass, salt, iter) {
    var c = C();
    return c.subtle.importKey("raw", enc.encode(pass.normalize("NFKC")), "PBKDF2", false, ["deriveKey"]).then(function (k) {
      return c.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: salt, iterations: iter }, k, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    });
  }
  function lock(plaintext, passphrase, iter) {
    iter = iter || 600000;
    var c = C(), salt = c.getRandomValues(new Uint8Array(16)), iv = c.getRandomValues(new Uint8Array(12));
    return derive(passphrase, salt, iter).then(function (key) {
      return c.subtle.encrypt({ name: "AES-GCM", iv: iv, additionalData: AAD }, key, enc.encode(plaintext));
    }).then(function (ct) {
      var o = { v: 1, alg: "AES-256-GCM", kdf: "PBKDF2-SHA256", iter: iter, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
      return BEGIN + "\n" + btoa(JSON.stringify(o)).replace(/(.{64})/g, "$1\n") + "\n" + END + "\n";
    });
  }
  function parseBlock(t) {
    var m = String(t).replace(/\r/g, "").match(/-----BEGIN WILL MY CRYPTO LETTER \(PROTOTYPE\)-----([\s\S]*?)-----END WILL MY CRYPTO LETTER \(PROTOTYPE\)-----/);
    var o = JSON.parse(atob((m ? m[1] : t).replace(/\s+/g, "")));
    if (o.v !== 1 || o.kdf !== "PBKDF2-SHA256" || !(o.iter >= 1000 && o.iter <= 20000000)) throw new Error("bad");
    return o;
  }
  function unlock(block, passphrase) {
    var o; try { o = parseBlock(block); } catch (e) { return Promise.reject(new Error("That does not look like a Will My Crypto letter block.")); }
    return derive(passphrase, unb64(o.salt), o.iter).then(function (key) {
      return C().subtle.decrypt({ name: "AES-GCM", iv: unb64(o.iv), additionalData: AAD }, key, unb64(o.ct));
    }).then(function (pt) { return dec.decode(pt); }, function () { throw new Error("Could not open the letter. The shares may be wrong, or the letter was changed."); });
  }
  function randomPassphrase() {
    var A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", b = C().getRandomValues(new Uint8Array(25)), s = "";
    for (var i = 0; i < 25; i++) { s += A[b[i] & 31]; if (i % 5 === 4 && i < 24) s += "-"; }
    return s; // 25 chars x 5 bits = 125 bits
  }
  var api = { lock: lock, unlock: unlock, randomPassphrase: randomPassphrase, BEGIN: BEGIN, END: END };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.WMCCrypto = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
