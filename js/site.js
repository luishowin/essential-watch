/* Essential Watch, shared site behaviour.
   Plain JS, no dependencies. Mobile nav toggle + staggered reveal on scroll. */

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
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  revealables.forEach(function (el) {
    observer.observe(el);
  });
})();
