/* Will My Crypto - check-in schedule logic (PROTOTYPE). Pure functions, used by the simulator and tests.
   Times are in whole days. A check-in is due every `intervalDays`. When it is missed, "day 0"
   is the due date and each step fires after its offset. Release is always the last step. */
(function (root) {
  "use strict";
  var DEFAULT = { intervalDays: 90, graceDays: 45, reminder1: 0, reminder2: 7, trusted: 28 };
  function normalize(p) {
    p = Object.assign({}, DEFAULT, p || {});
    ["intervalDays", "graceDays", "reminder1", "reminder2", "trusted"].forEach(function (k) { p[k] = Math.round(+p[k]); });
    return p;
  }
  function validate(p) {
    p = normalize(p);
    if (!(p.intervalDays >= 7 && p.intervalDays <= 730)) return "Check-in interval must be 7 to 730 days.";
    if (!(p.graceDays >= 14 && p.graceDays <= 365)) return "Grace period must be 14 to 365 days.";
    if (!(p.reminder1 >= 0 && p.reminder1 < p.reminder2 && p.reminder2 < p.trusted && p.trusted < p.graceDays))
      return "Steps must be in order: reminder, second reminder, trusted-contact notice, then release at the end of the grace period.";
    return null;
  }
  function steps(p) {
    p = normalize(p);
    return [
      { id: "r1", label: "Reminder", offset: p.reminder1 },
      { id: "r2", label: "Second reminder", offset: p.reminder2 },
      { id: "tc", label: "Trusted-contact notice", offset: p.trusted },
      { id: "rel", label: "Release to heirs", offset: p.graceDays }
    ];
  }
  /* Which steps have fired, given the last check-in day and the current day. */
  function fired(p, lastCheckin, now) {
    p = normalize(p);
    var due = lastCheckin + p.intervalDays, since = now - due;
    return steps(p).filter(function (s) { return since >= s.offset; });
  }
  function dueDay(p, lastCheckin) { return lastCheckin + normalize(p).intervalDays; }
  var api = { DEFAULT: DEFAULT, normalize: normalize, validate: validate, steps: steps, fired: fired, dueDay: dueDay };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.WMCSim = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
