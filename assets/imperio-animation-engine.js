/**
 * IMPÉRIO SWIPEFILE — UNIVERSAL ANIMATION & INTERACTIVITY ENGINE (v2.5)
 * Drives:
 * 1. 60fps Scroll-Reveal (IntersectionObserver) with staggered child animations
 * 2. Automatic unlocking & re-animation of AOS / Elementor / Framer Motion / Tailwind blocks
 * 3. Interactive FAQ Accordions & Collapsible sections
 * 4. Animated Number Counters on scroll
 * 5. CTA Shimmer & Smooth Anchor Scrolling
 * 6. Floating Império Swipefile HUD + "🔍 Raio-X do Funil" Inspector Drawer (Alt+X)
 */
(function () {
  if (window.__IMPERIO_ANIM_ENGINE_LOADED__) return;
  window.__IMPERIO_ANIM_ENGINE_LOADED__ = true;

  var hiddenOfferNodes = [];
  var hiddenOfferRevealed = true;

  function setupScrollReveal() {
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
      if (el.closest('#imp-swipe-hud') || el.closest('#imp-raiox-drawer')) return;
      if (el.hasAttribute('data-imp-reveal')) return;
      var rect = el.getBoundingClientRect();
      if (rect.height > window.innerHeight * 1.8 || rect.height < 18) return;
      el.setAttribute('data-imp-reveal', 'up');
      var stagger = (idx % 4) * 65;
      el.style.setProperty('--imp-delay', stagger + 'ms');
      candidates.push(el);
    });

    document.querySelectorAll('[style*="opacity: 0"], [style*="opacity:0"]').forEach(function (el) {
      if (el.closest('#imp-swipe-hud') || el.closest('#imp-raiox-drawer')) return;
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
        setTimeout(function () {
          el.classList.add('imp-revealed');
        }, 60);
      } else {
        obs.observe(el);
      }
    });
  }

  function setupCtaAndCards() {
    var btns = document.querySelectorAll('a, button, [role="button"], .elementor-button');
    btns.forEach(function (btn) {
      if (btn.closest('#imp-swipe-hud') || btn.closest('#imp-raiox-drawer')) return;
      var txt = (btn.textContent || '').trim().toLowerCase();
      var isCta =
        txt.length > 3 &&
        txt.length < 70 &&
        /(quero|comprar|garantir|inscrev|acessar|começar|entrar|participar|vaga|desconto|oferta|agora|baixar|aplicar|unlock|join|get|start|buy|order|claim)/i.test(
          txt
        );
      if (isCta) {
        btn.classList.add('imp-cta-animated');
      }
    });

    var cards = document.querySelectorAll(
      '[class*="card"], [class*="Card"], .elementor-column-wrap, [class*="rounded-xl"], [class*="rounded-2xl"]'
    );
    cards.forEach(function (card) {
      if (card.closest('#imp-swipe-hud') || card.closest('#imp-raiox-drawer')) return;
      var r = card.getBoundingClientRect();
      if (r.width > 160 && r.width < 950 && r.height > 80 && r.height < 750) {
        card.classList.add('imp-card-interactive');
      }
    });
  }

  function setupAccordionsAndTabs() {
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

  function formatDelaySeconds(sec) {
    var n = parseInt(sec, 10);
    if (!n || isNaN(n) || n <= 0) return null;
    var mins = Math.floor(n / 60);
    var rem = n % 60;
    return mins + 'm ' + (rem < 10 ? '0' + rem : rem) + 's (' + n + 's)';
  }

  function collectHiddenPitchNodes() {
    var list = [];
    var seen = new Set();
    var selectors = [
      '.esconder',
      '[data-vdelay]',
      '.smartplayer-call-action--hidden',
      '.hidden-offer',
      '.delay-content',
      '[class*="esconder"]',
      '[id*="esconder"]',
      '[id*="cta-hidden"]'
    ];
    document.querySelectorAll(selectors.join(', ')).forEach(function (el) {
      if (el.closest('#imp-swipe-hud') || el.closest('#imp-raiox-drawer')) return;
      if (!seen.has(el)) {
        seen.add(el);
        list.push(el);
      }
    });
    return list;
  }

  function analyzeFunnelDOM() {
    var meta = window.__IMPERIO_SITE_META__ || {};
    var htmlRaw = document.documentElement.innerHTML || '';

    // 1. Pitch Delay (vdelay / SECONDS_TO_DISPLAY)
    var delaySecs = null;
    var vdelayEl = document.querySelector('[data-vdelay]');
    if (vdelayEl && vdelayEl.getAttribute('data-vdelay')) {
      delaySecs = parseInt(vdelayEl.getAttribute('data-vdelay'), 10);
    }
    if (!delaySecs) {
      var mDelay =
        htmlRaw.match(/data-vdelay=["']?(\d{2,5})["']?/i) ||
        htmlRaw.match(/SECONDS_TO_DISPLAY\s*=\s*(\d{2,5})/i) ||
        htmlRaw.match(/delaySeconds\s*[:=]\s*(\d{2,5})/i) ||
        htmlRaw.match(/timeToDisplay\s*[:=]\s*(\d{2,5})/i);
      if (mDelay && mDelay[1]) {
        delaySecs = parseInt(mDelay[1], 10);
      }
    }

    // 2. Video Player Detection (VTurb / ConverteAI / Vidalytics / Panda / Vimeo / YouTube)
    var playerType = 'Nenhum / LP Direta';
    var playerId = '—';
    var vturbEl = document.querySelector('vturb-smartplayer, [id^="vid_"], [id^="vid-"]');
    var converteMatch = htmlRaw.match(/scripts\.converteai\.net\/([^/"']+)\/players\/([a-f0-9]{20,32})/i);
    if (converteMatch) {
      playerType = 'VTurb (ConverteAI)';
      playerId = converteMatch[2];
    } else if (vturbEl) {
      playerType = 'VTurb Smartplayer';
      playerId = vturbEl.id || 'vturb-smartplayer';
    } else if (/vidalytics/i.test(htmlRaw)) {
      playerType = 'Vidalytics VSL';
    } else if (/pandavideo/i.test(htmlRaw)) {
      playerType = 'PandaVideo';
    } else if (document.querySelector('iframe[src*="vimeo"], iframe[src*="youtube"], iframe[src*="wistia"], video')) {
      var vidNode = document.querySelector('iframe[src*="vimeo"], iframe[src*="youtube"], iframe[src*="wistia"], video');
      playerType = vidNode.tagName === 'VIDEO' ? 'HTML5 Video Nativo' : 'Embed (' + (vidNode.src || '').split('/')[2] + ')';
    }

    // 3. Hidden Pitch Nodes (.esconder / data-vdelay)
    hiddenOfferNodes = collectHiddenPitchNodes();

    // 4. Checkout Links & Gateways
    var checkouts = [];
    var gatewayCounts = {};
    var gatewayPatterns = [
      { name: 'BuyGoods', rx: /buygoods\.com/i },
      { name: 'ClickBank', rx: /clickbank\.net|hop\.clickbank/i },
      { name: 'CartPanda', rx: /mycartpanda\.com|cartpanda\.com/i },
      { name: 'Hotmart', rx: /pay\.hotmart\.com|hotmart\.com/i },
      { name: 'Kiwify', rx: /pay\.kiwify\.com\.br|kiwify\.app/i },
      { name: 'Ticto', rx: /ticto\.app|ticto\.com\.br/i },
      { name: 'Digistore24', rx: /digistore24\.com/i },
      { name: 'Payt', rx: /payt\.com\.br/i },
      { name: 'Kirvano', rx: /kirvano\.com/i },
      { name: 'PerfectPay', rx: /perfectpay\.com\.br/i },
      { name: 'Monetizze', rx: /monetizze\.com\.br/i },
      { name: 'Braip', rx: /braip\.com/i },
      { name: 'Stripe', rx: /buy\.stripe\.com|checkout\.stripe\.com/i }
    ];

    var seenHrefs = new Set();
    document.querySelectorAll('a[href], form[action]').forEach(function (node) {
      if (node.closest('#imp-swipe-hud') || node.closest('#imp-raiox-drawer')) return;
      var rawHref = node.getAttribute('href') || node.getAttribute('action') || '';
      if (!rawHref || rawHref === '#' || rawHref.startsWith('javascript:')) return;
      gatewayPatterns.forEach(function (gw) {
        if (gw.rx.test(rawHref)) {
          gatewayCounts[gw.name] = (gatewayCounts[gw.name] || 0) + 1;
          if (!seenHrefs.has(rawHref)) {
            seenHrefs.add(rawHref);
            checkouts.push({
              gateway: gw.name,
              url: rawHref,
              label: (node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50) || gw.name
            });
          }
        }
      });
    });

    // Also include any checkout link if none matched explicit gateways but looks like order/checkout
    if (checkouts.length === 0) {
      document.querySelectorAll('a[href]').forEach(function (node) {
        if (node.closest('#imp-swipe-hud') || node.closest('#imp-raiox-drawer')) return;
        var rawHref = node.getAttribute('href') || '';
        if (/(checkout|order|buy|pay\.|cart|inscricao|garantir)/i.test(rawHref) && !seenHrefs.has(rawHref)) {
          seenHrefs.add(rawHref);
          checkouts.push({
            gateway: 'Checkout Link',
            url: rawHref,
            label: (node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50) || 'CTA Link'
          });
        }
      });
    }

    // 5. Prices detected in visible text
    var bodyText = (document.body ? document.body.innerText : '') || '';
    var priceMatches = bodyText.match(/(?:R\$\s?\d{1,4}(?:[.,]\d{2})?|\$\d{2,4}(?:\.\d{2})?)/g) || [];
    var uniquePrices = [];
    var seenPrice = new Set();
    priceMatches.forEach(function (p) {
      var clean = p.trim();
      if (!seenPrice.has(clean) && uniquePrices.length < 8) {
        seenPrice.add(clean);
        uniquePrices.push(clean);
      }
    });

    // 6. Headline & Typography
    var h1Node = document.querySelector('h1, .elementor-heading-title, header h2, main h2');
    var headline = h1Node ? (h1Node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 140) : document.title;
    var bodyFont = 'System UI';
    try {
      bodyFont = (window.getComputedStyle(document.body).fontFamily || '').split(',')[0].replace(/['"]/g, '').trim();
    } catch (e) {}

    return {
      slug: meta.slug || location.pathname.replace(/^\/|\/$/g, ''),
      title: meta.title || document.title || 'Swipefile Clone',
      originalUrl: meta.originalUrl || '#',
      delaySecs: delaySecs,
      delayFormatted: formatDelaySeconds(delaySecs) || 'Imediato (Sem Delay)',
      playerType: playerType,
      playerId: playerId,
      hiddenCount: hiddenOfferNodes.length,
      gateways: Object.keys(gatewayCounts),
      checkouts: checkouts.slice(0, 6),
      prices: uniquePrices,
      headline: headline || '—',
      bodyFont: bodyFont || 'Sans-serif'
    };
  }

  function toggleHiddenPitchOffer(btnEl) {
    hiddenOfferNodes = collectHiddenPitchNodes();
    if (hiddenOfferNodes.length === 0) {
      // Scroll to first pricing or CTA section
      var firstCta = document.querySelector('.imp-cta-animated, a[href*="checkout"], a[href*="pay"], section:last-of-type');
      if (firstCta) {
        firstCta.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstCta.classList.add('imp-pitch-highlighted');
      }
      return;
    }

    hiddenOfferRevealed = !hiddenOfferRevealed;
    hiddenOfferNodes.forEach(function (el) {
      if (hiddenOfferRevealed) {
        el.style.setProperty('display', 'block', 'important');
        el.style.setProperty('visibility', 'visible', 'important');
        el.style.setProperty('opacity', '1', 'important');
        el.classList.add('imp-pitch-highlighted');
      } else {
        el.style.setProperty('display', 'none', 'important');
        el.classList.remove('imp-pitch-highlighted');
      }
    });

    if (hiddenOfferRevealed && hiddenOfferNodes[0]) {
      hiddenOfferNodes[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (btnEl) {
      btnEl.textContent = hiddenOfferRevealed
        ? '🙈 Ocultar Pitch (' + hiddenOfferNodes.length + ' blocos)'
        : '🔓 Revelar Pitch (' + hiddenOfferNodes.length + ' blocos)';
    }
  }

  function buildRaioXMarkdown(info) {
    var lines = [
      '### 🔍 Raio-X do Funil — ' + info.title,
      '- **Slug no Swipefile**: `/' + info.slug + '/`',
      '- **URL Original**: ' + info.originalUrl,
      '- **Headline Principal**: "' + info.headline + '"',
      '- **Player de VSL**: ' + info.playerType + (info.playerId !== '—' ? ' (`' + info.playerId + '`)' : ''),
      '- **Pitch Delay (`vdelay`)**: ' + info.delayFormatted,
      '- **Blocos de Oferta Ocultos (`.esconder`)**: ' + info.hiddenCount,
      '- **Gateways Detectados**: ' + (info.gateways.length ? info.gateways.join(', ') : 'Checkout Próprio / Direto'),
      '- **Preços na Página**: ' + (info.prices.length ? info.prices.join(' | ') : 'Não listado no DOM inicial'),
      '- **Tipografia Base**: `' + info.bodyFont + '`'
    ];
    if (info.checkouts.length) {
      lines.push('- **Links de Checkout**:');
      info.checkouts.forEach(function (c) {
        lines.push('  - [' + c.gateway + ' — ' + c.label + '](' + c.url + ')');
      });
    }
    return lines.join('\n');
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

    var info = analyzeFunnelDOM();

    var drawer = document.createElement('div');
    drawer.id = 'imp-raiox-drawer';
    var checkoutListHtml = info.checkouts.length
      ? info.checkouts
          .map(function (c) {
            return (
              '<li><strong style="color:#fbbf24">[' +
              c.gateway +
              ']</strong> <a href="' +
              c.url +
              '" target="_blank" rel="noreferrer" style="color:#38bdf8;text-decoration:underline">' +
              c.label +
              ' ↗</a></li>'
            );
          })
          .join('')
      : '<li>Nenhum link de gateway externo explícito (checkout interno ou pré-sell).</li>';

    drawer.innerHTML =
      '<div class="imp-rx-header">' +
      '  <div class="imp-rx-title">🔍 Raio-X do Funil <span style="font-size:10px;color:#94a3b8;font-weight:500">(Alt+X)</span></div>' +
      '  <button type="button" class="imp-rx-close" id="imp-rx-close-btn">✕ Fechar</button>' +
      '</div>' +
      '<div class="imp-rx-grid">' +
      '  <div class="imp-rx-kpi">' +
      '    <div class="imp-rx-kpi-label">⏱️ Pitch Delay (vdelay)</div>' +
      '    <div class="imp-rx-kpi-val" style="color:#fde68a">' +
      info.delayFormatted +
      '</div>' +
      '  </div>' +
      '  <div class="imp-rx-kpi">' +
      '    <div class="imp-rx-kpi-label">🎬 Player / VSL</div>' +
      '    <div class="imp-rx-kpi-val">' +
      info.playerType +
      '</div>' +
      '  </div>' +
      '  <div class="imp-rx-kpi">' +
      '    <div class="imp-rx-kpi-label">💳 Gateways</div>' +
      '    <div class="imp-rx-kpi-val" style="color:#34d399">' +
      (info.gateways.length ? info.gateways.join(', ') : 'Direto / Pré-sell') +
      '</div>' +
      '  </div>' +
      '  <div class="imp-rx-kpi">' +
      '    <div class="imp-rx-kpi-label">💰 Preços no DOM</div>' +
      '    <div class="imp-rx-kpi-val">' +
      (info.prices.length ? info.prices.slice(0, 4).join(' · ') : 'Oculto / VSL') +
      '</div>' +
      '  </div>' +
      '</div>' +
      '<div class="imp-rx-section">' +
      '  <div class="imp-rx-sec-title">🧠 Headline & Tipografia (' +
      info.bodyFont +
      ')</div>' +
      '  <div style="font-size:11px;color:#e2e8f0;font-weight:600">"' +
      info.headline +
      '"</div>' +
      '</div>' +
      '<div class="imp-rx-section">' +
      '  <div class="imp-rx-sec-title">🔗 Links de Checkout / Oferta (' +
      info.checkouts.length +
      ')</div>' +
      '  <ul class="imp-rx-list">' +
      checkoutListHtml +
      '</ul>' +
      '</div>' +
      '<div class="imp-rx-actions">' +
      '  <button type="button" class="imp-rx-action-btn" id="imp-rx-toggle-offer">' +
      (info.hiddenCount > 0
        ? '🎯 Ir p/ Oferta Revelada (' + info.hiddenCount + ')'
        : '🎯 Rolar até CTA Principal') +
      '</button>' +
      '  <button type="button" class="imp-rx-action-btn imp-secondary" id="imp-rx-copy-md">📋 Copiar Raio-X (MD)</button>' +
      '</div>';

    document.body.appendChild(drawer);

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
      '    <button type="button" class="imp-hud-btn imp-hud-btn-raiox" id="imp-hud-raiox" title="Abrir Raio-X do Funil (Delay VSL, Gateways, Preços, Checkout e Oferta Oculta)">🔍 Raio-X' +
      (info.delaySecs ? ' (' + Math.round(info.delaySecs / 60) + 'm)' : '') +
      '</button>' +
      '    <button type="button" class="imp-hud-btn" id="imp-hud-replay" title="Reproduzir todas as animações de entrada e scroll">⚡ Replay</button>' +
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

    var raioxBtn = document.getElementById('imp-hud-raiox');
    var closeRxBtn = document.getElementById('imp-rx-close-btn');
    function toggleDrawer() {
      var isOpen = drawer.classList.toggle('imp-open');
      if (raioxBtn) raioxBtn.classList.toggle('imp-active', isOpen);
    }
    if (raioxBtn) raioxBtn.addEventListener('click', toggleDrawer);
    if (closeRxBtn) closeRxBtn.addEventListener('click', toggleDrawer);

    window.addEventListener('keydown', function (e) {
      if (e.altKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        toggleDrawer();
      }
    });

    var toggleOfferBtn = document.getElementById('imp-rx-toggle-offer');
    if (toggleOfferBtn) {
      toggleOfferBtn.addEventListener('click', function () {
        toggleHiddenPitchOffer(toggleOfferBtn);
      });
    }

    var copyMdBtn = document.getElementById('imp-rx-copy-md');
    if (copyMdBtn) {
      copyMdBtn.addEventListener('click', function () {
        var md = buildRaioXMarkdown(info);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(md).then(function () {
            copyMdBtn.textContent = '✅ Copiado pro Clipboard!';
            setTimeout(function () {
              copyMdBtn.textContent = '📋 Copiar Raio-X (MD)';
            }, 2200);
          });
        }
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
