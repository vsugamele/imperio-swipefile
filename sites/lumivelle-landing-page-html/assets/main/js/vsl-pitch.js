/* vsl-pitch.js — H&W VSL page behaviour, identical on every page.
   Copy this file UNEDITED to the page's assets/main/js/; each page configures
   it through data-attributes (contract in _kit/README.md).

   The offer itself is opened by vturb.min.js (cdn.nlabs.cloud): on
   player:ready it calls displayHiddenElements(data-vdelay, ['.esconder']).
   This file does the rest (styles for 2 and 3 live in vsl-kit.css):
     1. watchdog — the offer opens even if the player never comes up
     2. stage — sound on: top folds, headline shrinks, player grows and pins
     3. at the pitch — body.is-revealed, comments step aside, scroll, stock
     4. "people watching now" counter
     5. the first tap on the player frames the video
     6. today's date and one-line labels */
(function () {
  "use strict";

  var video = document.getElementById("video");
  var player = document.querySelector("vturb-smartplayer");
  var offers = Array.prototype.slice.call(document.querySelectorAll(".esconder"));

  var rand = function (n) {
    return Math.floor(Math.random() * n);
  };

  var lessMotion = function () {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  };

  var isShown = function (el) {
    return window.getComputedStyle(el).display !== "none";
  };

  /* Replays a CSS animation: removing and re-adding the class in one go is
     not enough, the style change has to be flushed in between. */
  var replay = function (el, className) {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  };

  /* [data-fit-line] text shrinks until it fits its box on one line, 11px
     floor; below that it wraps. Each pass costs a forced layout, so the step
     is proportional to the overshoot: two or three reads, not twenty. */
  var shrinkToFit = function (text) {
    var box = text.parentNode;
    text.style.fontSize = "";
    text.style.whiteSpace = "";
    var cs = window.getComputedStyle(box);
    var available = box.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    if (!available || !text.scrollWidth || text.scrollWidth <= available) return;

    var base = parseFloat(window.getComputedStyle(text).fontSize) || 20;
    var size = Math.max(11, Math.floor((base * available) / text.scrollWidth));
    text.style.fontSize = size + "px";
    for (var pass = 0; text.scrollWidth > available && size > 11 && pass < 6; pass++) {
      size = Math.max(11, Math.floor((size * available) / text.scrollWidth));
      text.style.fontSize = size + "px";
    }
    text.style.whiteSpace = text.scrollWidth > available ? "normal" : "";
  };

  var fitLines = function () {
    document.querySelectorAll("[data-fit-line]").forEach(shrinkToFit);
  };

  /* ---- 1. Watchdog ------------------------------------------------------- */

  /* Without the domain on the VTurb allowlist, or with the player script
     blocked, player:ready never fires and the page would run the whole VSL
     with no button and no error. So the offer also opens by wall clock, 5s
     after the pitch time — unless the player comes up: from then on the
     reveal follows video time, which runs behind the clock for anyone who
     paused or tapped play late.

     On player:ready this file asks the player for the reveal itself, the
     same call vturb.min.js makes. Both asking is harmless (they open the
     same elements at the same second), and it keeps the button coming when
     vturb.min.js is blocked or fails to load — the watchdog is already gone
     by then. player:ready fires 3×; both calls are idempotent. Mirrors
     vturb.min.js's ?test=true shortcut so a test run opens at the same
     moment. */
  var delay = video ? Number(video.getAttribute("data-vdelay")) || 0 : 0;
  try {
    if (new URLSearchParams(window.location.search).get("test") === "true") delay = 5;
  } catch (e) {}

  var watchdog = null;
  if (delay && offers.length) {
    watchdog = window.setTimeout(
      function () {
        /* TrackControl's "copy black" mode hides the offer on purpose. */
        if (document.body.classList.contains("banner-hidden")) return;
        offers.forEach(function (el) {
          el.style.display = "block";
        });
      },
      (delay + 5) * 1000,
    );

    if (player) {
      player.addEventListener("player:ready", function () {
        /* the watchdog only stands down once the player took the job */
        try {
          player.displayHiddenElements(delay, [".esconder"], { persist: true });
          window.clearTimeout(watchdog);
        } catch (e) {}
      });
    }
  }

  /* ---- 2. Stage --------------------------------------------------------- */

  /* Opt-in with data-stage on #video. When the viewer turns the sound on the
     page steps out of the player's way: is-stage until the pitch, is-stripped
     for good. If the player never reports a volume change, or the sound
     can't be read, the stage opens data-stage-fallback ms (default 5000)
     after play. Everything stays in flow — no overlay, no fixed
     positioning. */
  var revealed = false;
  var stageActive = false;
  var stageDone = false;

  var measureSticky = function () {
    var pinned = document.querySelector(".vsl-video");
    var height = pinned && document.body.classList.contains("is-stripped") ? pinned.offsetHeight : 0;
    document.body.style.setProperty("--sticky-h", height + "px");
  };

  var enterStage = function () {
    if (stageActive || stageDone || revealed) return;
    stageActive = true;
    /* The stage never makes the player narrower than it is now. The width
       at rest is copied, not worked out from the viewport: that sum misses
       whenever the scrollbar or the gutter differ from what it assumes. */
    if (video) video.style.setProperty("--vsl-rest-w", video.offsetWidth + "px");
    document.body.classList.add("is-stage", "is-stripped");
    window.setTimeout(measureSticky, 600); /* after the transition */
  };

  var exitStage = function () {
    if (!stageActive) return;
    stageActive = false;
    stageDone = true;
    document.body.classList.remove("is-stage");
  };

  if (video && video.hasAttribute("data-stage")) {
    var sawVolume = false;
    var fallback = null;
    var fallbackMs = Number(video.getAttribute("data-stage-fallback")) || 5000;

    /* video:volumechange carries only {volume:N} and never reports mute: the
       player mutes through the <video>'s own .muted and leaves volume at 1.
       Trusting the payload reads "sound on" while the video is silent, so the
       element is the source of truth. Some players keep it in a closed
       shadow root, reachable only through smartplayer.instances.
       true / false = sound on / off; null = can't tell. */
    var readSound = function () {
      var sp = window.smartplayer && window.smartplayer.instances && window.smartplayer.instances[0];
      var v = (player && player.querySelector("video")) || (sp && sp.video) || document.querySelector("video");
      if (!v || typeof v.muted !== "boolean") return null;
      return !v.muted && v.volume > 0;
    };

    if (player) {
      player.addEventListener("video:volumechange", function () {
        var sound = readSound();
        if (sound === null) return; /* leave it to the play fallback */
        sawVolume = true;
        window.clearTimeout(fallback);
        if (sound) enterStage();
      });
      player.addEventListener("video:play", function () {
        if (fallback === null && !sawVolume) fallback = window.setTimeout(enterStage, fallbackMs);
      });
    }

    document.addEventListener("keydown", function (e) {
      if (stageActive && (e.key === "Escape" || e.key === "Esc")) exitStage();
    });
  }

  /* ---- 3. Pitch reveal --------------------------------------------------- */

  /* Stock profiles. Both start moving at the reveal, never on page load, so
     a lead who watched the whole VSL still sees the full number, and both
     crawl near the stall point so the count never runs out during the close.
       steady — 88 → 6: one unit every 2.5–4.5s, stalls below 16
       burst  — 250 → 9: drops in blocks at the top, one by one near 12 */
  var PROFILES = {
    steady: {
      stall: 16,
      delay: function (left, stall) {
        if (left > 30) return 2500;
        if (left > stall) return 4500;
        return 18000 + (stall - left) * 9000;
      },
      step: function (left) {
        return left > 45 && Math.random() < 0.2 ? 2 : 1;
      },
    },
    burst: {
      stall: 12,
      delay: function (left, stall) {
        if (left > 120) return 960;
        if (left > 60) return 1920;
        if (left > stall) return 3600;
        return 25000 + (stall - left) * 7000;
      },
      step: function (left, stall) {
        if (left > 120) return 3 + rand(3);
        if (left > 60) return 2 + rand(2);
        if (left > stall) return 1 + rand(2);
        return 1;
      },
    },
  };

  var startStock = function (offer) {
    var counter = offer.querySelector("[data-stock]");
    if (!counter) return;

    var start = Number(counter.getAttribute("data-stock")) || 88;
    var floor = Number(counter.getAttribute("data-stock-floor")) || 6;
    var key = counter.getAttribute("data-stock-key") || "hw_stock_" + window.location.pathname;
    var profile = PROFILES[counter.getAttribute("data-stock-profile")] || PROFILES.steady;
    var stall = profile.stall;

    var left = start;
    try {
      var stored = parseInt(window.sessionStorage.getItem(key), 10);
      if (stored >= floor && stored <= start) left = stored;
    } catch (e) {}
    counter.textContent = left;

    var next = function () {
      var base = profile.delay(left, stall);
      return base + Math.random() * base * 0.8;
    };

    var tick = function () {
      if (left <= floor) return;
      var step = profile.step(left, stall);
      /* never jump the stall point — the last units have to be seen */
      if (left > stall && left - step < stall) step = left - stall;
      left = Math.max(floor, left - step);
      try {
        window.sessionStorage.setItem(key, left);
      } catch (e) {}
      counter.textContent = left;
      replay(counter, "is-dropping");
      window.setTimeout(tick, next());
    };

    window.setTimeout(tick, next());
  };

  /* data-reveal-scroll on the .esconder:
       top    — back to the top (headline gone, video + CTA fill the screen)
       cta    — CTA at the top of the screen
       center — CTA in the middle of the screen
       fit    — only as much as needed for the CTA to fit on screen
     data-reveal-scroll-delay waits for CSS transitions (ms). */
  var scrollOnReveal = function (offer) {
    var mode = offer.getAttribute("data-reveal-scroll");
    if (!mode) return;
    var behavior = lessMotion() ? "auto" : "smooth";
    var wait = Number(offer.getAttribute("data-reveal-scroll-delay")) || 0;

    window.setTimeout(function () {
      if (mode === "top") {
        window.scrollTo({ top: 0, behavior: behavior });
      } else if (mode === "cta" || mode === "center") {
        offer.scrollIntoView({ behavior: behavior, block: mode === "cta" ? "start" : "center" });
      } else if (mode === "fit") {
        var overflow = offer.getBoundingClientRect().bottom - window.innerHeight;
        if (overflow > 0) window.scrollBy({ top: overflow + 16, behavior: behavior });
      }
    }, wait);
  };

  /* The comments step aside together with the offer, not before: content
     vanishing a minute earlier read as the page breaking. Tied to the offer
     it reads as sequence. Opacity first, then out of the flow. */
  var clearComments = function () {
    if (!document.querySelector(".vsl-comments")) return;
    document.body.classList.add("is-clearing");
    window.setTimeout(
      function () {
        document.body.classList.add("is-cleared");
      },
      lessMotion() ? 0 : 620,
    );
  };

  /* An endless pulse off screen is wasted paint. */
  var pauseWhenOffscreen = function (offer) {
    if (!window.IntersectionObserver) return;
    var target = offer.querySelector(".vsl-cta") || offer;
    new IntersectionObserver(function (entries) {
      document.body.classList.toggle("cta-offscreen", !entries[entries.length - 1].isIntersecting);
    }).observe(target);
  };

  var onReveal = function (offer) {
    if (revealed) return;
    revealed = true;
    window.clearTimeout(watchdog);
    document.body.classList.add("is-revealed");
    exitStage();
    clearComments();
    fitLines();
    pauseWhenOffscreen(offer);
    /* screen readers hear that the button arrived */
    var notice = offer.querySelector("[data-offer-notice]");
    if (notice) notice.textContent = notice.getAttribute("data-offer-notice");
    scrollOnReveal(offer);
    startStock(offer);
  };

  offers.forEach(function (offer) {
    if (isShown(offer)) return onReveal(offer);
    if (!window.MutationObserver) return;
    var observer = new MutationObserver(function () {
      if (!isShown(offer)) return;
      observer.disconnect();
      onReveal(offer);
    });
    observer.observe(offer, { attributes: true, attributeFilter: ["style", "class"] });
  });

  /* ---- 4. Live viewers --------------------------------------------------- */

  var viewers = document.querySelector("[data-live-viewers]");
  if (viewers) {
    var min = Number(viewers.getAttribute("data-live-min")) || 1000;
    var max = Number(viewers.getAttribute("data-live-max")) || 3000;
    var count = min + 20 + rand(500);
    var format = function (value) {
      return new Intl.NumberFormat("en-US").format(value);
    };

    var drift = function () {
      var direction = Math.random() > 0.45 ? 1 : -1;
      count = Math.min(max, Math.max(min, count + direction * (1 + rand(9))));
      viewers.textContent = format(count);
      replay(viewers, "is-changing");
      window.setTimeout(drift, 2200 + Math.random() * 2600);
    };

    viewers.textContent = format(count);
    window.setTimeout(drift, 1800);
  }

  /* ---- 5. First tap frames the video ------------------------------------- */

  /* The 9:16 player is taller than what fits under the headline on a phone,
     so the tap that starts it also scrolls it into frame. Only the first tap;
     later taps are pause/resume.

     The player swallows the tap (stopPropagation), so this listens on the
     document in the capture phase, which runs before the player's handler.
     The scroll waits for the finger to lift: iOS treats a page that moves
     mid-touch as a scroll gesture and doubles up the player toggle (play,
     then pause). The extra 350ms covers the player's thumbnail → video swap. */
  if (video && video.hasAttribute("data-tap-frame")) {
    var framed = false;
    var scroll = function () {
      window.removeEventListener("pointerup", scroll, true);
      window.removeEventListener("touchend", scroll, true);
      window.setTimeout(function () {
        video.scrollIntoView({ behavior: lessMotion() ? "auto" : "smooth", block: "center" });
      }, 350);
    };

    var frame = function (e) {
      if (framed) return;
      var path = e.composedPath ? e.composedPath() : [];
      if (path.indexOf(video) === -1 && !video.contains(e.target)) return;
      framed = true;
      window.addEventListener("pointerup", scroll, true);
      window.addEventListener("touchend", scroll, true);
    };

    document.addEventListener("pointerdown", frame, true);
    document.addEventListener("touchstart", frame, true);
  }

  /* ---- 6. Today's date, one-line labels ---------------------------------- */

  /* [data-today] gets today's date, US Eastern:
       long     — October 6, 2026
       numeric  — 10/06/2026
       datetime — October 6, 2026 / 1:52 PM EDT (EST in winter) */
  document.querySelectorAll("[data-today]").forEach(function (el) {
    var mode = el.getAttribute("data-today");
    var options = { timeZone: "America/New_York", year: "numeric" };
    if (mode === "numeric") {
      options.month = "2-digit";
      options.day = "2-digit";
    } else {
      options.month = "long";
      options.day = "numeric";
    }
    if (mode === "datetime") {
      options.hour = "numeric";
      options.minute = "2-digit";
      options.timeZoneName = "short";
    }
    try {
      el.textContent = new Intl.DateTimeFormat("en-US", options)
        .format(new Date())
        .replace(/(,| at) (\d{1,2}:)/, " / $2");
    } catch (e) {}
  });

  fitLines();
  var lastWidth = window.innerWidth;
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    if (window.innerWidth === lastWidth) return; /* mobile URL bar show/hide */
    lastWidth = window.innerWidth;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      fitLines();
      measureSticky();
    }, 150);
  });
})();
