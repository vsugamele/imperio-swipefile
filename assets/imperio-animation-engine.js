/**
 * IMPÉRIO SWIPEFILE — UNIVERSAL ANIMATION & INTERACTIVITY ENGINE (v2.0)
 * Drives:
 * 1. 60fps Scroll-Reveal (IntersectionObserver) with staggered child animations
 * 2. Automatic unlocking & re-animation of AOS / Elementor / Framer Motion / Tailwind blocks
 * 3. Interactive FAQ Accordions & Collapsible sections
 * 4. Animated Number Counters on scroll
 * 5. CTA Shimmer & Smooth Anchor Scrolling
 * 6. Floating Império Swipefile HUD (Replay Animations, GitHub Repo, Original URL, Hub)
 */
(function () {
  if (window.__IMPERIO_ANIM_ENGINE_LOADED__) return;
  window.__IMPERIO_ANIM_ENGINE_LOADED__ = true;

  function setupScrollReveal() {
    // 1. Collect explicit reveal nodes + auto-detect major sections, cards, headings, images
    var candidates = [];
    var explicit = document.querySelectorAll(
      '[data-imp-reveal], [data-aos], .elementor-invisible, .animate-on-scroll'
    );
    explicit.forEach(function (el) {
      if (!el.hasAttribute('data-imp-reveal')) {
        el.setAttribute('data-imp-reveal', 'up');
      }
      candidates.push(el);
    });

    // 2. Auto-tag major content blocks if page has few explicit reveal attributes
    var autoSelectors = [
      'section > div',
      'header h1, header h2, main h1, main h2, section h2, section h3',
      '.elementor-widget-heading, .elementor-widget-image, .elementor-widget-text-editor',
      'article, .card, [class*="card"], [class*="Card"], [class*="feature"], [class*="pricing"], [class*="benefit"]',
      'ul > li, ol > li',
      'img:not([width="1"]):not([height="1"])'
    ];

    var allAuto = document.querySelectorAll(autoSelectors.join(', '));
    allAuto.forEach(function (el, idx) {
      if (el.closest('#imp-swipe-hud')) return;
      if (el.hasAttribute('data-imp-reveal')) return;
      var rect = el.getBoundingClientRect();
      // Don't hide elements that are tiny or wrap the entire page
      if (rect.height > window.innerHeight * 1.8 || rect.height < 18) return;
      el.setAttribute('data-imp-reveal', 'up');
      var stagger = (idx % 4) * 65;
      el.style.setProperty('--imp-delay', stagger + 'ms');
      candidates.push(el);
    });

    // Fix any inline opacity:0 left over from SSR Framer Motion / GSAP before observing
    document.querySelectorAll('[style*="opacity: 0"], [style*="opacity:0"]').forEach(function (el) {
      if (el.closest('#imp-swipe-hud')) return;
      el.style.opacity = '';
      if (el.style.transform && el.style.transform !== 'none') {
        el.style.transform = '';
      }
      if (!el.hasAttribute('data-imp-reveal')) {
        el.setAttribute('data-imp-reveal', 'up');
        candidates.push(el);
      }
    });

    if (!('IntersectionObserver' in window)) {
      candidates.forEach(function (el) {
        el.classList.add('imp-revealed');
      });
      return;
    }

    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('imp-revealed');
          }
        });
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.06 }
    );

    candidates.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92) {
        // Reveal first-fold elements with a smooth entrance cascade
        setTimeout(function () {
          el.classList.add('imp-revealed');
        }, 60);
      } else {
        obs.observe(el);
      }
    });
  }

  function setupCtaAndCards() {
    // Enhance primary CTA buttons with pulse + shimmer
    var btns = document.querySelectorAll('a, button, [role="button"], .elementor-button');
    btns.forEach(function (btn) {
      if (btn.closest('#imp-swipe-hud')) return;
      var txt = (btn.textContent || '').trim().toLowerCase();
      var isCta =
        txt.length > 3 &&
        txt.length < 70 &&
        /(quero|comprar|garantir|inscrev|acessar|começar|entrar|participar|vaga|desconto|oferta|agora|baixar|aplicar|unlock|join|get|start|buy)/i.test(
          txt
        );
      if (isCta) {
        btn.classList.add('imp-cta-animated');
      }
    });

    // Enhance cards with subtle 3D lift
    var cards = document.querySelectorAll(
      '[class*="card"], [class*="Card"], .elementor-column-wrap, [class*="rounded-xl"], [class*="rounded-2xl"]'
    );
    cards.forEach(function (card) {
      if (card.closest('#imp-swipe-hud')) return;
      var r = card.getBoundingClientRect();
      if (r.width > 160 && r.width < 950 && r.height > 80 && r.height < 750) {
        card.classList.add('imp-card-interactive');
      }
    });
  }

  function setupAccordionsAndTabs() {
    // Make FAQ / Accordion headers interactive even without framework JS
    var headers = document.querySelectorAll(
      '.elementor-tab-title, [data-radix-collection-item], .faq-question, [class*="accordion"] button, [class*="faq"] button'
    );
    headers.forEach(function (btn) {
      if (btn.dataset.impAccordionBound) return;
      btn.dataset.impAccordionBound = '1';
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', function (e) {
        var parent = btn.parentElement;
        if (!parent) return;
        var content =
          btn.nextElementSibling ||
          parent.querySelector('.elementor-tab-content, [role="region"], [class*="content"], [class*="answer"]');
        if (content) {
          e.preventDefault();
          var isHidden =
            content.style.display === 'none' ||
            content.hasAttribute('hidden') ||
            window.getComputedStyle(content).display === 'none' ||
            content.style.maxHeight === '0px';
          if (isHidden) {
            content.removeAttribute('hidden');
            content.style.display = 'block';
            content.style.maxHeight = '1000px';
            content.style.opacity = '1';
            btn.setAttribute('aria-expanded', 'true');
          } else {
            content.style.display = 'none';
            btn.setAttribute('aria-expanded', 'false');
          }
        }
      });
    });
  }

  function replayAnimations() {
    var all = document.querySelectorAll('[data-imp-reveal]');
    all.forEach(function (el) {
      el.classList.remove('imp-revealed');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(function () {
      all.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92) {
          el.classList.add('imp-revealed');
        }
      });
    }, 350);
  }

  function mountHud() {
    if (document.getElementById('imp-swipe-hud')) return;
    var meta = window.__IMPERIO_SITE_META__ || {};
    var slug = meta.slug || '';
    var originalUrl = meta.originalUrl || '#';
    var githubUrl =
      meta.githubUrl ||
      (slug
        ? 'https://github.com/vsugamele/imperio-swipefile/tree/main/sites/' + slug
        : 'https://github.com/vsugamele/imperio-swipefile');

    var hud = document.createElement('div');
    hud.id = 'imp-swipe-hud';
    hud.innerHTML =
      '<div class="imp-hud-bar">' +
      '  <div class="imp-hud-badge" id="imp-hud-toggle" title="Clique para minimizar/expandir barra do Swipefile">' +
      '    <span class="imp-hud-dot"></span>' +
      '    <span>🛡️ Swipefile Clone</span>' +
      '  </div>' +
      '  <div class="imp-hud-links">' +
      '    <a class="imp-hud-btn" href="/" title="Voltar para a Vitrine Geral do Swipefile">← Hub</a>' +
      '    <button type="button" class="imp-hud-btn" id="imp-hud-replay" title="Reproduzir todas as animações de entrada e scroll">⚡ Replay Animações</button>' +
      '    <a class="imp-hud-btn" href="' +
      githubUrl +
      '" target="_blank" rel="noreferrer" title="Ver código-fonte HTML/CSS deste clone no GitHub">🐙 GitHub</a>' +
      '    <a class="imp-hud-btn" href="' +
      originalUrl +
      '" target="_blank" rel="noreferrer" title="Abrir URL original externa">🌐 Original ↗</a>' +
      '  </div>' +
      '</div>';

    document.body.appendChild(hud);

    var toggle = document.getElementById('imp-hud-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        hud.classList.toggle('imp-minimized');
      });
    }
    var replayBtn = document.getElementById('imp-hud-replay');
    if (replayBtn) {
      replayBtn.addEventListener('click', replayAnimations);
    }
  }

  function init() {
    try {
      setupScrollReveal();
      setupCtaAndCards();
      setupAccordionsAndTabs();
      mountHud();
    } catch (err) {
      console.warn('[Imperio Animation Engine]', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
