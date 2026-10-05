/* Will My Crypto - Inheritance Readiness Score. Runs entirely in your browser.
   Answers are never sent anywhere. Only if you choose to enter an email do we send
   your email, score and band (not your answers) to our team.
   One more thing is sent: when the first question is answered, a bare "quiz started" signal
   (the text e=quiz_start and nothing else) so we can count how often the quiz is used.
   It is skipped if your browser sends Do Not Track or Global Privacy Control. */
(function(){
  "use strict";
  var PROFILE = [
    {id:"hold", q:"Where do you mainly hold your crypto?", o:[
      ["hw","In a hardware wallet"],["sw","In a software or mobile wallet"],["ex","On an exchange or custodial account"],["mix","A mix of these"]]},
    {id:"type", q:"How would your holdings be recovered if your device were lost?", o:[
      ["hd","A recovery phrase (12 or 24 words) that restores a whole wallet"],
      ["key","A single private key or keystore file for one account"],
      ["multi","A multisig wallet that needs several keys"],
      ["login","Only an exchange login, with no wallet of my own"],
      ["unsure","I'm not sure"]]}
  ];
  var SCORED = [
    {id:"backup", w:15, q:"Where are the backups of your recovery material (phrase, key, or files)?", o:[
      ["Only on the device itself, or I have no backup",0],["One secure place",0.5],["Two or more separate, secure places",1]],
      act:"Make a durable backup of your recovery material (for example on metal or archival paper) and keep a second copy in a different secure place. Never photograph it or store it in cloud notes or email."},
    {id:"aware", w:12, q:"Does a person you trust know that a plan exists, and where to find it?", o:[
      ["No one knows I hold crypto",0],["Someone knows I hold crypto, but not where the instructions are",0.5],["At least one trusted person knows the plan exists and where to look",1]],
      act:"Tell at least one trusted person that a plan exists and where to find the instructions. They do not need the secrets, only the starting point."},
    {id:"letter", w:13, q:"Do you have written instructions that a non-technical person could follow?", o:[
      ["No",0],["Rough notes only",0.5],["A clear, step-by-step document",1]],
      act:"Write a plain letter of instruction: what you own, which wallets or accounts, where devices and backups are kept, who to call (such as your attorney), and what not to do. Leave out the secrets themselves."},
    {id:"spof", w:12, q:"Could one person, one theft, or one fire take everything or lock everyone out?", o:[
      ["Yes, one place or one person holds everything",0],["Partly spread out",0.5],["No: it's spread so no single person or place can take or lose it all, yet heirs can still recover",1]],
      act:"Reduce single points of failure. Options include splitting a recovery secret into shares (for example 3 of 5, using an established standard such as SLIP-39), a multisig wallet where an heir holds one key, or placing backups with different trusted holders. Test whatever you choose."},
    {id:"legal", w:12, q:"Does your will or trust cover digital assets, without putting secrets in it?", o:[
      ["I have no will or trust",0],["I have one, but it doesn't mention digital assets",0.5],["Yes, an attorney reviewed it for my situation",1]],
      act:"Ask an estate attorney in your state how to cover digital assets in your will or trust. Wills often become public record, so never put a recovery phrase or key in one."},
    {id:"extras", w:8, q:"Do you use extra locks that your heirs would also need (a wallet passphrase, device PIN, or 2-factor authentication)?", o:[
      ["Yes, and no one else knows about them",0],["Yes, and they are documented safely for my heirs",1],["No, I don't use any",0.8]],
      act:"List every extra lock (wallet passphrase, device PIN, 2-factor app, email account that resets exchange logins) and decide how your heirs would learn about each one safely. A hidden passphrase that no one knows can make a recovery phrase useless."},
    {id:"tested", w:14, q:"Have you ever tested recovery?", o:[
      ["No, never",0],["I have read through the steps",0.4],["Yes, I practiced restoring a small amount or a spare device",1]],
      act:"Test recovery once: restore a wallet with a small amount, or onto a spare device, using only your written steps. Then ask your heir to follow the instructions without your help."},
    {id:"review", w:14, q:"When did you last review your plan?", o:[
      ["I don't have one yet",0],["More than two years ago",0.4],["Within the last year",1]],
      act:"Put a yearly review on your calendar. Update holdings, people, devices, and contact details, and review again after any big life change."}
  ];
  var TYPE_TIPS = {
    hd:"A 12 or 24 word recovery phrase restores every account in that wallet, and anyone who has the words controls the funds. Never put it in a will, email, or photo. Check whether you also use an extra passphrase (sometimes called a 25th word), which must be documented separately.",
    key:"A single private key or keystore file controls only one account, so make sure your heirs know about every key and file. A keystore file also needs its password. Keep an inventory so nothing is missed.",
    multi:"With multisig, your heirs need enough keys and also the wallet configuration (the descriptor or the list of co-signer public keys). Keep a copy of that setup information with your instructions.",
    login:"Heirs normally go through the exchange's own process for deceased customers. They need to know which exchange you use and have documents such as a death certificate and proof of authority. Do not leave your login in the open, and check that your email account can be reached.",
    unsure:"Start by writing down every wallet and account you have, without any secrets. If someone helped you set one up, ask them how it is recovered, then answer again."
  };
  var HOLD_TIPS = {
    hw:"Hardware wallet: keep the device and its backups apart, and note the PIN situation.",
    sw:"Software or mobile wallet: the phone or computer may be locked or broken, so the recovery material matters more than the device.",
    ex:"Exchange accounts: keep a list of exchanges and the email address that controls them.",
    mix:"With a mix, list each type separately, because each is recovered differently."
  };
  var answers = {}, $ = function(id){ return document.getElementById(id); };
  var counted = false;
  function countStart(){
    if (counted) return; counted = true;
    var nav = window.navigator || {};
    if (nav.doNotTrack === "1" || nav.globalPrivacyControl) return;
    try {
      var b = new URLSearchParams(); b.set("e", "quiz_start");
      fetch("count.php", {method:"POST", body:b, headers:{"X-Requested-With":"fetch"}, keepalive:true}).catch(function(){});
    } catch (e) {}
  }
  function el(tag, attrs, text){
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function question(def, n, total, scored){
    var fs = el("fieldset", {"class":"qf"});
    var lg = el("legend", null, n + ". " + def.q); fs.appendChild(lg);
    if (!scored) fs.appendChild(el("p", {"class":"qnote"}, "This question tailors your checklist and isn't scored."));
    def.o.forEach(function(o, i){
      var id = def.id + "_" + i;
      var lab = el("label", {"class":"opt", "for":id});
      var inp = el("input", {type:"radio", name:def.id, id:id, value:String(i)});
      inp.addEventListener("change", function(){ countStart(); answers[def.id] = scored ? i : o[0]; progress(); });
      lab.appendChild(inp); lab.appendChild(el("span", null, scored ? o[0] : o[1]));
      fs.appendChild(lab);
    });
    return fs;
  }
  function progress(){
    var done = Object.keys(answers).length, total = PROFILE.length + SCORED.length;
    $("pbar").style.width = (100*done/total) + "%";
    $("ptext").textContent = done + " of " + total + " answered";
    $("see").disabled = done < total;
  }
  function build(){
    var host = $("questions"), n = 1;
    PROFILE.forEach(function(p){ host.appendChild(question(p, n++, 10, false)); });
    SCORED.forEach(function(s){ host.appendChild(question(s, n++, 10, true)); });
    progress();
  }
  function compute(){
    var total = 0, gaps = [];
    SCORED.forEach(function(s){
      var frac = s.o[answers[s.id]][1];
      total += s.w * frac;
      if (frac < 1) gaps.push({s:s, lost:s.w*(1-frac)});
    });
    gaps.sort(function(a,b){ return b.lost - a.lost; });
    return {score:Math.round(total), gaps:gaps};
  }
  function band(sc){
    if (sc < 40) return ["Fragile", "If something happened today, your family would likely struggle to recover anything. The good news is that the first steps are quick."];
    if (sc < 70) return ["Partly prepared", "You have some pieces in place. A few focused steps would close the biggest gaps."];
    return ["Well on your way", "You have most of the basics. Keep testing and reviewing, because plans go stale."];
  }
  function show(){
    var r = compute(), b = band(r.score), out = $("result");
    out.textContent = "";
    var head = el("div", {"class":"scorebox"});
    head.appendChild(el("div", {"class":"num"}, String(r.score)));
    var side = el("div");
    side.appendChild(el("div", {"class":"band"}, b[0]));
    side.appendChild(el("p", null, b[1]));
    head.appendChild(side); out.appendChild(head);
    out.appendChild(el("p", {"class":"qnote"}, "This score is a rough guide to your preparation, out of 100. It is not a guarantee of anything, and it is not legal, tax, or financial advice."));
    out.appendChild(el("h2", null, "Your personal checklist"));
    var ul = el("ul", {"class":"check"});
    r.gaps.forEach(function(g){ ul.appendChild(el("li", null, g.s.act)); });
    if (!r.gaps.length) ul.appendChild(el("li", null, "Keep your yearly review going and re-test recovery after any change."));
    out.appendChild(ul);
    out.appendChild(el("h2", null, "About your setup"));
    var tips = el("ul");
    tips.appendChild(el("li", null, TYPE_TIPS[answers.type]));
    tips.appendChild(el("li", null, HOLD_TIPS[answers.hold]));
    out.appendChild(tips);
    out.appendChild(el("p", {"class":"callout"}, "Seed phrases and private keys do not belong in a will, an email, a photo, or this website. Never type them anywhere you are not 100% sure of."));
    var act = el("p"); var pb = el("button", {"class":"btn", type:"button"}, "Print my checklist");
    pb.addEventListener("click", function(){ window.print(); }); act.appendChild(pb);
    var rb = el("button", {"class":"btn ghost2", type:"button"}, "Start over");
    rb.addEventListener("click", function(){ location.reload(); }); act.appendChild(document.createTextNode(" ")); act.appendChild(rb);
    out.appendChild(act);
    $("quizform").hidden = true; out.hidden = false; $("capture").hidden = false;
    $("f-score").value = String(r.score); $("f-band").value = b[0]; $("f-type").value = answers.type;
    window.scrollTo(0, 0);
  }
  function capture(ev){
    ev.preventDefault();
    var msg = $("cap-msg"), f = $("capform");
    if (!f.email.value || !f.consent.checked) { msg.textContent = "Please enter an email and tick the box."; msg.className = "status bad"; return; }
    var fd = new FormData(f);
    msg.textContent = "Sending..."; msg.className = "status ok";
    fetch("contact.php", {method:"POST", body:fd, headers:{"X-Requested-With":"fetch"}})
      .then(function(r){ return r.text().then(function(t){ return {ok:r.ok, t:t.trim()}; }); })
      .then(function(x){
        if (x.ok && x.t === "ok") { msg.textContent = "Thanks. We'll email you when there is news. You can ask us to remove you any time."; msg.className = "status ok"; f.hidden = true; }
        else { msg.textContent = "That did not send. Please try again later."; msg.className = "status bad"; }
      }).catch(function(){ msg.textContent = "That did not send. Please try again later."; msg.className = "status bad"; });
  }
  document.addEventListener("DOMContentLoaded", function(){
    build();
    $("see").addEventListener("click", show);
    $("capform").addEventListener("submit", capture);
  });
})();
