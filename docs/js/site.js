/* Essential Watch, shared site behaviour.
   Plain JS, no dependencies. Theme toggle + mobile nav + staggered reveal on scroll.

   The theme is applied before paint by a small inline script in every page head,
   so a dark reload never flashes white. This file only handles the button. */

(function () {
  "use strict";

  /* Progressive enhancement marker: reveal styles only apply when JS runs. */
  document.documentElement.classList.add("js");

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Mobile navigation ---------- */

  var toggle = document.querySelector(".nav-toggle");
  var panel = document.querySelector(".nav-panel");

  if (toggle && panel) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        toggle.setAttribute("aria-expanded", "false");
        panel.hidden = true;
        toggle.focus();
      }
    });
  }

  /* ---------- Theme toggle ---------- */
  /* Follows the system until the first click. After that the stored choice
     wins, on every page and every reload. Runs above the reduced-motion
     early return below, so the button works in every case. */

  var STORAGE_KEY = "ew-theme";
  var root = document.documentElement;
  var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  var themeBtn = document.querySelector(".theme-toggle");

  function storedTheme() {
    try {
      var t = localStorage.getItem(STORAGE_KEY);
      return t === "dark" || t === "light" ? t : null;
    } catch (e) {
      return null;
    }
  }

  function activeTheme() {
    return root.getAttribute("data-theme") || (darkQuery.matches ? "dark" : "light");
  }

  function describe() {
    if (!themeBtn) return;
    var dark = activeTheme() === "dark";
    themeBtn.setAttribute("aria-pressed", String(dark));
    themeBtn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    themeBtn.title = dark ? "Light theme" : "Dark theme";
  }

  if (themeBtn) {
    describe();

    themeBtn.addEventListener("click", function () {
      var next = activeTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (e) {
        /* Private windows refuse storage. The choice still holds for this page. */
      }
      describe();
    });

    /* Keep the label honest when the OS flips and nothing is stored. */
    var onSystemChange = function () {
      if (!storedTheme()) describe();
    };
    if (darkQuery.addEventListener) {
      darkQuery.addEventListener("change", onSystemChange);
    } else if (darkQuery.addListener) {
      darkQuery.addListener(onSystemChange);
    }
  }

  /* ---------- Staggered reveal ---------- */
  /* Elements with .reveal fade up when they enter the viewport.
     A container with data-stagger reveals its .reveal children in sequence. */

  var revealables = document.querySelectorAll(".reveal");

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealables.forEach(function (el) {
      el.classList.add("is-visible");
    });
    return;
  }

  var staggerGroups = document.querySelectorAll("[data-stagger]");

  staggerGroups.forEach(function (group) {
    var children = group.querySelectorAll(".reveal");
    children.forEach(function (child, i) {
      child.style.transitionDelay = Math.min(i * 90, 540) + "ms";
    });
  });

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        /* An element taller than the viewport can never reach a 0.15 ratio,
           so it would stay invisible forever. Those reveal on entry instead. */
        var tallerThanViewport =
          entry.boundingClientRect.height > window.innerHeight * 0.7;

        if (entry.intersectionRatio >= 0.15 || tallerThanViewport) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: [0, 0.15], rootMargin: "0px 0px -40px 0px" }
  );

  revealables.forEach(function (el) {
    observer.observe(el);
  });
})();
