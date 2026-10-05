/* Will My Crypto - check-in simulator (PROTOTYPE). Time-lapse only. Sends nothing, stores nothing. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var Sim = window.WMCSim;
  function el(tag, attrs, text) { var e = document.createElement(tag); if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; }
  var plan = Sim.normalize({}), heirs = ["your heirs"], k = 3, n = 5;
  var acc = 0, day = 0, lastCheckin = 0, silent = false, released = false, timer = null, perSec = 5, firedIds = {}, checkins = 0;
  try {
    var saved = null;
    if (location.hash.length > 2) { try { saved = JSON.parse(decodeURIComponent(location.hash.slice(1))); } catch (e) { saved = null; } }
    if (!saved) saved = JSON.parse(sessionStorage.getItem("wmc-plan") || "null");
    if (saved && saved.hs) saved.hs = saved.hs.slice(0, 8).map(function (h) { return String(h).slice(0, 60); });
    if (saved) { saved.k = Math.max(2, Math.min(10, +saved.k || 3)); saved.n = Math.max(saved.k, Math.min(10, +saved.n || 5)); }
    if (saved && saved.plan && !Sim.validate(saved.plan)) { plan = Sim.normalize(saved.plan); heirs = saved.hs && saved.hs.length ? saved.hs : heirs; k = saved.k || k; n = saved.n || n; $("fromplan").hidden = false; }
  } catch (e) {}
  var STEP_TEXT = {
    r1: function () { return "Reminder sent to the owner: \u201CTime for your check-in. One tap is enough.\u201D"; },
    r2: function () { return "Second reminder sent by another channel (for example text as well as email)."; },
    tc: function () { return "Trusted contact asked: \u201CCan you confirm the owner is okay?\u201D If they confirm, the owner is marked safe and the clock restarts."; },
    rel: function () { return "RELEASE: the locked letter is sent to " + heirs.join(", ") + ". The passphrase is NOT sent. Heirs still need " + k + " of the " + n + " shares."; }
  };
  function log(cls, msg) {
    var li = el("li", { "class": cls }); li.appendChild(el("span", { "class": "d" }, "Day " + day)); li.appendChild(document.createTextNode(" " + msg));
    var ul = $("log"); ul.insertBefore(li, ul.firstChild);
  }
  function renderSteps() {
    var host = $("steps"); host.textContent = "";
    var st = Sim.steps(plan);
    st.forEach(function (s) {
      var done = !!firedIds[s.id], card = el("div", { "class": "stepcard " + (done ? (s.id === "rel" ? "rel" : "done") : "wait") });
      card.appendChild(el("div", { "class": "t" }, s.label));
      card.appendChild(el("div", { "class": "w" }, s.offset === 0 ? "when a check-in is missed" : (s.offset + " days after a missed check-in")));
      card.appendChild(el("div", { "class": "s" }, done ? (s.id === "rel" ? "Released" : "Done") : "Waiting"));
      host.appendChild(card);
    });
  }
  function renderStatus() {
    var due = Sim.dueDay(plan, lastCheckin), rel = due + plan.graceDays;
    $("day").textContent = String(day);
    var txt;
    if (released) txt = "Letter released on day " + (due + plan.graceDays) + ".";
    else if (!silent) txt = "Owner is active. Next check-in due on day " + due + ".";
    else if (day < due) txt = "Owner has gone quiet. The next check-in is due on day " + due + ".";
    else txt = "Check-in missed on day " + due + ". Release would happen on day " + rel + ".";
    $("state").textContent = txt;
    var total = plan.intervalDays + plan.graceDays, pos = Math.max(0, Math.min(1, (day - lastCheckin) / total));
    $("fill").style.width = (pos * 100) + "%";
    $("fill").className = released ? "fill rel" : (day >= due && silent ? "fill warn" : "fill");
    $("falsebtn").disabled = !silent || released || day < due;
    $("silentbtn").disabled = silent || released;
  }
  function tick(dt) {
    if (released) return;
    acc += dt;
    while (acc >= 1 && !released) {
      acc -= 1; day += 1;
      var due = Sim.dueDay(plan, lastCheckin);
      if (!silent && day === due) { lastCheckin = day; checkins++; log("ok", "Owner checks in on schedule. Clock restarts (next due day " + Sim.dueDay(plan, lastCheckin) + ")."); }
      if (silent) {
        Sim.fired(plan, lastCheckin, day).forEach(function (s) {
          if (!firedIds[s.id]) { firedIds[s.id] = 1; log(s.id === "rel" ? "rel" : "warn", s.label + ": " + STEP_TEXT[s.id]()); if (s.id === "rel") { released = true; $("after").hidden = false; } }
        });
      }
    }
    if (released) stop();
    renderSteps(); renderStatus();
  }
  function run() {
    stop(); $("play").textContent = "Pause"; $("play").setAttribute("data-on", "1");
    timer = setInterval(function () { tick(perSec / 10); }, 100);
  }
  function stop() { if (timer) clearInterval(timer); timer = null; $("play").textContent = "Play"; $("play").removeAttribute("data-on"); }
  function reset() {
    stop(); acc = 0; day = 0; lastCheckin = 0; silent = false; released = false; firedIds = {}; checkins = 0; $("log").textContent = ""; $("after").hidden = true;
    log("ok", "Plan starts. The owner checks in every " + plan.intervalDays + " days.");
    renderSteps(); renderStatus();
  }
  document.addEventListener("DOMContentLoaded", function () {
    $("planline").textContent = "Check-in every " + plan.intervalDays + " days; reminders at day 0 and " + plan.reminder2 + "; trusted contact at day " + plan.trusted + "; release at day " + plan.graceDays + " after a missed check-in. Heirs: " + heirs.join(", ") + ". Threshold: " + k + " of " + n + ".";
    $("play").addEventListener("click", function () { if (timer) stop(); else run(); });
    $("speed").addEventListener("change", function () { perSec = +$("speed").value; if (timer) run(); });
    $("silentbtn").addEventListener("click", function () {
      silent = true; log("warn", "Owner stops checking in (illness, an accident, or just lost interest). The simulator now waits for the due date.");
      if (!timer) run(); renderStatus();
    });
    $("falsebtn").addEventListener("click", function () {
      if (!silent || released) return;
      silent = false; lastCheckin = day; firedIds = {};
      log("ok", "FALSE ALARM: the owner was just traveling. They tap \u201CI'm here\u201D. Everything stops, nothing is released, and the clock restarts (next due day " + Sim.dueDay(plan, lastCheckin) + ").");
      renderSteps(); renderStatus();
    });
    $("reset").addEventListener("click", reset);
    reset(); run();
  });
})();
