/* Will My Crypto - visual effects (progressive enhancement). No libraries, no network.
   Everything is skipped or made static when the visitor prefers reduced motion. */
(function () {
  "use strict";
  var d = document, de = d.documentElement;
  var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FINE = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
  de.classList.add("js");
  function $(s, r) { return (r || d).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || d).querySelectorAll(s)); }

  /* header: scrolled state + mobile menu */
  var hdr = $("header.site");
  if (hdr) {
    var onS = function () { hdr.classList.toggle("scrolled", window.scrollY > 8); };
    addEventListener("scroll", onS, { passive: true }); onS();
    var nav = $("nav", hdr), wrap = $(".wrap", hdr);
    if (nav && wrap) {
      var b = d.createElement("button");
      b.className = "navtoggle"; b.type = "button"; b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-controls", "mainnav"); b.textContent = "Menu";
      nav.id = "mainnav"; wrap.insertBefore(b, nav);
      b.addEventListener("click", function () { var o = nav.classList.toggle("open"); b.setAttribute("aria-expanded", o); b.textContent = o ? "Close" : "Menu"; });
      addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("open")) { nav.classList.remove("open"); b.setAttribute("aria-expanded", "false"); b.textContent = "Menu"; b.focus(); } });
    }
  }

  /* split headings into words */
  function splitWords(el, startAt) {
    var i = startAt || 0;
    (function walk(node) {
      [].slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.nodeValue.split(/(\s+)/), frag = d.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(d.createTextNode(" ")); return; }
            var s = d.createElement("span"); s.className = "w"; s.style.setProperty("--i", i++); s.textContent = p; s.setAttribute("aria-hidden", "true"); frag.appendChild(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.classList.contains("proto")) walk(n);
      });
    })(el);
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
  }
  $$(".hero h1, .page h1").forEach(function (h) { var label = h.textContent.replace(/\s+/g, " ").trim(); splitWords(h); h.classList.add("wr", "wl"); h.setAttribute("aria-label", label); });
  var heads = $$("section h2");
  heads.forEach(function (h) { splitWords(h); h.classList.add("wr"); });

  /* reveal on scroll */
  var tool = d.body.classList.contains("tool");
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }) : null;
  function reveal(el, delay) { if (!io || RM) return; el.classList.add("rv"); if (delay) el.style.setProperty("--d", delay + "s"); io.observe(el); }
  $$(".wr:not(.wl)").forEach(function (h) { if (io && !RM) io.observe(h); else h.classList.add("in"); });
  $$("[data-io]").forEach(function (el) { if (io && !RM) io.observe(el); else el.classList.add("in"); });
  if (!tool) {
    $$("main section:not(.hero) .wrap > *, .page .wrap > *").forEach(function (el) {
      if (el.matches("h2, form, [data-io], [hidden], script") || el.querySelector("form")) return;
      if (el.classList.contains("grid") || el.classList.contains("two") || el.classList.contains("hiw")) {
        if (el.classList.contains("hiw")) return;
        $$(":scope > *", el).forEach(function (c, i) { reveal(c, Math.min(i, 5) * 0.08); });
      } else reveal(el, 0);
    });
  }

  /* glow under the cursor + subtle 3D tilt */
  $$(".card").forEach(function (c) { c.classList.add("spot"); });
  if (FINE && !RM) {
    var cur = null, raf = 0, lx = 0, ly = 0;
    d.addEventListener("pointermove", function (e) {
      var c = e.target.closest && e.target.closest(".spot");
      if (!c) { if (cur && cur.classList.contains("tilt")) { cur.style.transform = ""; } cur = null; return; }
      lx = e.clientX; ly = e.clientY;
      if (cur && cur !== c && cur.classList.contains("tilt")) cur.style.transform = "";
      cur = c;
      if (!raf) raf = requestAnimationFrame(function () {
        raf = 0; if (!cur) return;
        var r = cur.getBoundingClientRect(), x = lx - r.left, y = ly - r.top;
        cur.style.setProperty("--mx", x + "px"); cur.style.setProperty("--my", y + "px");
        if (cur.classList.contains("tilt")) {
          var rx = ((y / r.height) - 0.5) * -5, ry = ((x / r.width) - 0.5) * 5;
          cur.style.transform = "perspective(900px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) translateY(-3px)";
        }
      });
    }, { passive: true });
    d.addEventListener("pointerleave", function () { if (cur && cur.classList.contains("tilt")) cur.style.transform = ""; cur = null; });
  }
})();
