/* Will My Crypto - encrypted letter of instruction (PROTOTYPE).
   AES-256-GCM, key from passphrase via PBKDF2-SHA256 (WebCrypto has no Argon2).
   Everything stays in this browser tab. No network requests are made. */
(function(){
  "use strict";
  var enc = new TextEncoder(), dec = new TextDecoder();
  var BEGIN = "-----BEGIN WILL MY CRYPTO LETTER (PROTOTYPE)-----";
  var END = "-----END WILL MY CRYPTO LETTER (PROTOTYPE)-----";
  var AAD = enc.encode("wmc-letter-v1");
  function $(id){ return document.getElementById(id); }
  function b64(buf){ var s="", b=new Uint8Array(buf); for (var i=0;i<b.length;i++) s+=String.fromCharCode(b[i]); return btoa(s); }
  function unb64(s){ var r=atob(s), b=new Uint8Array(r.length); for (var i=0;i<r.length;i++) b[i]=r.charCodeAt(i); return b; }
  function derive(pass, salt, iter){
    return crypto.subtle.importKey("raw", enc.encode(pass.normalize("NFKC")), "PBKDF2", false, ["deriveKey"]).then(function(k){
      return crypto.subtle.deriveKey({name:"PBKDF2", hash:"SHA-256", salt:salt, iterations:iter}, k, {name:"AES-GCM", length:256}, false, ["encrypt","decrypt"]);
    });
  }
  function wrap(str){ return str.replace(/(.{64})/g,"$1\n"); }
  function say(id, msg, bad){ var e=$(id); e.textContent=msg; e.className = "status " + (bad ? "bad" : "ok"); }
  function busy(btn, on){ btn.disabled = on; btn.textContent = on ? "Working..." : btn.getAttribute("data-label"); }
  function passProblem(p){
    if (p.length < 12) return "Use a passphrase of at least 12 characters. Several random words work well.";
    return null;
  }
  function doEncrypt(){
    var out = $("enc-out"), btn = $("enc-go");
    out.value = ""; say("enc-status","");
    var letter = $("letter").value, pass = $("pass1").value;
    if (!letter.trim()) return say("enc-status","Write something first.",true);
    var risk = window.WMCGuard.looksSensitive(letter);
    if (risk) return say("enc-status","Stopped: your letter seems to contain "+risk+". This tool is for instructions, not secrets. Remove it and describe where it is kept instead.",true);
    var pp = passProblem(pass);
    if (pp) return say("enc-status", pp, true);
    if (pass !== $("pass2").value) return say("enc-status","The two passphrases do not match.",true);
    var iter = parseInt($("iter").value,10);
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    busy(btn,true);
    setTimeout(function(){
      derive(pass, salt, iter).then(function(key){
        return crypto.subtle.encrypt({name:"AES-GCM", iv:iv, additionalData:AAD}, key, enc.encode(letter));
      }).then(function(ct){
        var obj = {v:1, alg:"AES-256-GCM", kdf:"PBKDF2-SHA256", iter:iter, salt:b64(salt), iv:b64(iv), ct:b64(ct)};
        out.value = BEGIN + "\n" + wrap(btoa(JSON.stringify(obj))) + "\n" + END + "\n";
        say("enc-status","Locked. Copy or download the block below. Without the passphrase it cannot be opened, by you, by us, or by anyone. Keep the passphrase somewhere your heir can find it separately.");
      }).catch(function(){ say("enc-status","Encryption failed in this browser.",true); }).then(function(){ busy(btn,false); });
    },30);
  }
  function parseBlock(t){
    var m = t.replace(/\r/g,"").match(/-----BEGIN WILL MY CRYPTO LETTER \(PROTOTYPE\)-----([\s\S]*?)-----END WILL MY CRYPTO LETTER \(PROTOTYPE\)-----/);
    var body = (m ? m[1] : t).replace(/\s+/g,"");
    return JSON.parse(atob(body));
  }
  function doDecrypt(){
    var btn = $("dec-go"), out = $("dec-out"); out.value=""; say("dec-status","");
    var o;
    try { o = parseBlock($("dec-in").value); if (o.v!==1 || o.kdf!=="PBKDF2-SHA256" || !(o.iter>=1000 && o.iter<=20000000)) throw 0; }
    catch(e){ return say("dec-status","That does not look like a Will My Crypto letter block.",true); }
    var pass = $("dec-pass").value;
    if (!pass) return say("dec-status","Enter the passphrase.",true);
    busy(btn,true);
    setTimeout(function(){
      derive(pass, unb64(o.salt), o.iter).then(function(key){
        return crypto.subtle.decrypt({name:"AES-GCM", iv:unb64(o.iv), additionalData:AAD}, key, unb64(o.ct));
      }).then(function(pt){ out.value = dec.decode(pt); say("dec-status","Opened. This text is only on your screen."); })
      .catch(function(){ say("dec-status","Could not open it. Wrong passphrase, or the block was changed.",true); })
      .then(function(){ busy(btn,false); });
    },30);
  }
  function download(){
    var v = $("enc-out").value; if (!v) return;
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([v],{type:"text/plain"}));
    a.download = "will-my-crypto-letter.txt"; document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },500);
  }
  function copy(){
    var v = $("enc-out").value; if (!v) return;
    if (navigator.clipboard) navigator.clipboard.writeText(v).then(function(){ say("enc-status","Copied."); });
    else { $("enc-out").select(); document.execCommand("copy"); }
  }
  function clearAll(){
    ["letter","pass1","pass2","enc-out","dec-in","dec-pass","dec-out"].forEach(function(i){ $(i).value=""; });
    say("enc-status",""); say("dec-status","");
  }
  function tab(which){
    ["enc","dec"].forEach(function(t){
      var on = t===which;
      $("tab-"+t).setAttribute("aria-selected", on);
      $("panel-"+t).hidden = !on;
    });
  }
  document.addEventListener("DOMContentLoaded", function(){
    if (!window.crypto || !crypto.subtle) {
      document.getElementById("nocrypto").hidden = false;
      document.getElementById("app").hidden = true; return;
    }
    $("enc-go").setAttribute("data-label",$("enc-go").textContent);
    $("dec-go").setAttribute("data-label",$("dec-go").textContent);
    $("enc-go").addEventListener("click", doEncrypt);
    $("dec-go").addEventListener("click", doDecrypt);
    $("enc-dl").addEventListener("click", download);
    $("enc-cp").addEventListener("click", copy);
    $("clear-all").addEventListener("click", clearAll);
    $("tab-enc").addEventListener("click", function(){ tab("enc"); });
    $("tab-dec").addEventListener("click", function(){ tab("dec"); });
    ["pass1","pass2","dec-pass"].forEach(function(id){
      var el=$(id), b=$(id+"-show");
      if (b) b.addEventListener("click", function(){ el.type = el.type==="password" ? "text" : "password"; });
    });
    window.addEventListener("pagehide", clearAll);
  });
})();
