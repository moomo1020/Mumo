(function () {
  const deck = document.getElementById('deck');
  if (!deck) return;

  const slides = Array.from(deck.querySelectorAll('.slide'));
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const indicator = document.getElementById('slideIndicator');
  const flowerNav = document.getElementById('flowerNav');

  let current = 0;
  let animating = false;
  let articleObserver = null;
  let scrollSnapCleanup = null;
  let glideToPanelFn = null;

  const SLIDE_NAMES = [
    '首頁', '小鎮居民', '昕', '曚', '暮', '鈴', '朶', '理', '霏',
    '世界觀', '日暮茶行', '無名花園', '藏書庫'
  ];

  const PAGE_THEMES = {
    3: 'mang',
    4: 'mu',
    5: 'ling',
    6: 'duo',
    7: 'li',
    8: 'fei'
  };

  function applyPageTheme() {
    var theme = PAGE_THEMES[current];
    if (theme) {
      document.body.dataset.theme = theme;
    } else {
      delete document.body.dataset.theme;
    }
  }

  function getCssDurationMs(prop, fallbackMs) {
    var raw = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
    if (!raw) return fallbackMs;
    if (raw.endsWith('ms')) return parseFloat(raw) || fallbackMs;
    if (raw.endsWith('s')) return (parseFloat(raw) || 1) * 1000;
    return fallbackMs;
  }

  function getSlideDurationMs() {
    return getCssDurationMs('--slide-duration', 1200);
  }

  function buildFlowerNav() {
    if (!flowerNav) return;
    flowerNav.innerHTML = '';
    slides.forEach(function (_, i) {
      if (i > 0) {
        const line = document.createElement('span');
        line.className = 'flower-line';
        line.setAttribute('aria-hidden', 'true');
        flowerNav.appendChild(line);
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'flower-dot';
      b.title = SLIDE_NAMES[i] || String(i);
      b.setAttribute('aria-label', SLIDE_NAMES[i] || '第 ' + (i + 1) + ' 頁');
      b.setAttribute('aria-current', i === current ? 'page' : 'false');
      b.addEventListener('click', function () {
        goTo(i, i > current ? 1 : -1);
      });
      flowerNav.appendChild(b);
    });
  }

  function resetPaperParallax() {
    if (parallaxState) {
      parallaxState.currentX = 0;
      parallaxState.currentY = 0;
      parallaxState.targetX = 0;
      parallaxState.targetY = 0;
      parallaxState.applyVars(0, 0);
    } else {
      var root = document.documentElement;
      root.style.setProperty('--parallax-chibi-x', '0px');
      root.style.setProperty('--parallax-chibi-y', '0px');
      root.style.setProperty('--parallax-chibi-rotate', '0deg');
    }
  }

  var parallaxState = null;

  function setupMouseParallax() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    var root = document.documentElement;
    var maxBack = 12;
    var state = {
      currentX: 0,
      currentY: 0,
      targetX: 0,
      targetY: 0,
      lastClientX: window.innerWidth / 2,
      lastClientY: window.innerHeight / 2,
      rafId: null
    };
    parallaxState = state;

    state.applyVars = function (x, y) {
      root.style.setProperty('--parallax-paper-back-x', x.toFixed(1) + 'px');
      root.style.setProperty('--parallax-paper-back-y', y.toFixed(1) + 'px');
      root.style.setProperty('--parallax-paper-front-x', (x * 0.5).toFixed(1) + 'px');
      root.style.setProperty('--parallax-paper-front-y', (y * 0.5).toFixed(1) + 'px');
      root.style.setProperty('--parallax-stack-x', (x * 0.3).toFixed(1) + 'px');
      root.style.setProperty('--parallax-stack-y', (y * 0.3).toFixed(1) + 'px');
      root.style.setProperty('--parallax-chibi-x', (x * 1.45).toFixed(1) + 'px');
      root.style.setProperty('--parallax-chibi-y', (y * 1.45).toFixed(1) + 'px');
      root.style.setProperty('--parallax-chibi-rotate', (x * 0.22).toFixed(2) + 'deg');
    };

    state.pointerToTarget = function (clientX, clientY) {
      state.lastClientX = clientX;
      state.lastClientY = clientY;
      state.targetX = (clientX / window.innerWidth - 0.5) * 2 * maxBack;
      state.targetY = (clientY / window.innerHeight - 0.5) * 2 * maxBack;
    };

    function tick() {
      if (animating) {
        state.rafId = null;
        return;
      }
      state.currentX += (state.targetX - state.currentX) * 0.11;
      state.currentY += (state.targetY - state.currentY) * 0.11;
      state.applyVars(state.currentX, state.currentY);

      if (Math.abs(state.targetX - state.currentX) > 0.03 || Math.abs(state.targetY - state.currentY) > 0.03) {
        state.rafId = requestAnimationFrame(tick);
      } else {
        state.currentX = state.targetX;
        state.currentY = state.targetY;
        state.applyVars(state.currentX, state.currentY);
        state.rafId = null;
      }
    }

    state.scheduleTick = function () {
      if (animating) return;
      if (state.rafId) return;
      state.rafId = requestAnimationFrame(tick);
    };

    document.addEventListener('mousemove', function (e) {
      state.pointerToTarget(e.clientX, e.clientY);
      if (!animating) state.scheduleTick();
    }, { passive: true });

    document.addEventListener('mouseleave', function () {
      state.targetX = 0;
      state.targetY = 0;
      if (!animating) state.scheduleTick();
    });
  }

  function syncParallaxToPointer() {
    if (!parallaxState || animating) return;
    parallaxState.pointerToTarget(parallaxState.lastClientX, parallaxState.lastClientY);
    parallaxState.scheduleTick();
  }

  function endDeckTransition() {
    document.body.classList.remove('deck-animating', 'deck-forward', 'deck-back');
    applyPageTheme();
    syncParallaxToPointer();
  }

  function playActiveHeadAnimation(fromTransition) {
    slides.forEach(function (s) {
      if (s !== slides[current]) {
        s.classList.remove('page-play', 'page-head-ready', 'home-play', 'home-head-ready');
      }
    });

    var active = slides[current];
    if (!active) return;

    if (active.classList.contains('slide-home')) {
      if (!fromTransition) {
        active.classList.remove('home-play', 'home-head-ready');
        void active.offsetWidth;
      }
      active.classList.add('home-play');
      window.setTimeout(function () {
        if (slides[current] === active) active.classList.add('home-head-ready');
      }, fromTransition ? 320 : 520);
    } else if (active.classList.contains('slide-page')) {
      if (!fromTransition) {
        active.classList.remove('page-play', 'page-head-ready');
        void active.offsetWidth;
      }
      active.classList.add('page-play');
      window.setTimeout(function () {
        if (slides[current] === active) active.classList.add('page-head-ready');
      }, fromTransition ? 320 : 520);
    }
  }

  function triggerHeadAnimations() {
    playActiveHeadAnimation(false);
  }

  function resetArticleSections(slide) {
    slide.querySelectorAll('.page-body-articles section, .id-card-wrap').forEach(function (section) {
      section.classList.remove('is-revealed');
    });
  }

  function setupArticleReveal(slide) {
    if (articleObserver) {
      articleObserver.disconnect();
      articleObserver = null;
    }

    var scroll = slide.querySelector('.page-scroll') || slide.querySelector('.home-scroll');
    var sections = slide.querySelectorAll('.page-body-articles section, .id-card-wrap');
    if (!scroll || !sections.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sections.forEach(function (section) {
        section.classList.add('is-revealed');
      });
      return;
    }

    articleObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        articleObserver.unobserve(entry.target);
      });
    }, {
      root: scroll,
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.15
    });

    sections.forEach(function (section) {
      articleObserver.observe(section);
    });
  }

  function setupSlideScrollSnap(slide) {
    if (scrollSnapCleanup) {
      scrollSnapCleanup();
      scrollSnapCleanup = null;
    }
    glideToPanelFn = null;

    var isHome = slide.classList.contains('slide-home');
    var isId = slide.classList.contains('slide-id-page');
    if (!isHome && !isId) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var scroll = isHome ? slide.querySelector('.home-scroll') : slide.querySelector('.page-scroll');
    var hero = isHome ? slide.querySelector('.home-hero') : slide.querySelector('.page-hero');
    var panel = isHome ? slide.querySelector('.home-author-panel') : slide.querySelector('.id-card-page');
    var articles = isId ? slide.querySelector('.page-body-articles') : null;
    if (!scroll || !hero || !panel) return;

    var snapping = false;
    var rafId = null;

    function scrollOffset(el) {
      return el.getBoundingClientRect().top - scroll.getBoundingClientRect().top + scroll.scrollTop;
    }

    function getSnapPositions() {
      var heroY = scrollOffset(hero);
      var panelTop = scrollOffset(panel);
      var panelH = panel.offsetHeight;
      var panelY = isHome
        ? panelTop - scroll.clientHeight * 0.08
        : panelTop - Math.max(0, (scroll.clientHeight - panelH) * 0.5);
      var freeY = articles
        ? scrollOffset(articles) - scroll.clientHeight * 0.08
        : panelTop + panelH * 0.35;
      return {
        heroY: heroY,
        panelY: Math.max(heroY, panelY),
        freeY: Math.max(panelTop, freeY)
      };
    }

    function smoothScrollTo(target, duration) {
      var start = scroll.scrollTop;
      var distance = target - start;
      if (Math.abs(distance) < 6) return;

      snapping = true;
      if (rafId) cancelAnimationFrame(rafId);

      var startTime = null;
      function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
      }

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min(1, (timestamp - startTime) / duration);
        scroll.scrollTop = start + distance * easeOutCubic(progress);
        if (progress < 1) {
          rafId = requestAnimationFrame(step);
        } else {
          snapping = false;
          rafId = null;
          if (isHome) {
            var authorSection = panel.querySelector('.home-author-section');
            if (authorSection) authorSection.classList.add('is-revealed');
          }
        }
      }

      rafId = requestAnimationFrame(step);
    }

    function cancelSnap() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      snapping = false;
    }

    function glideToPanel() {
      var st = scroll.scrollTop;
      var snaps = getSnapPositions();
      if (st >= snaps.panelY - 48) return;
      if (st >= snaps.freeY) return;
      smoothScrollTo(snaps.panelY, 720);
    }

    glideToPanelFn = glideToPanel;

    function onWheel(e) {
      if (e.deltaY < 0) {
        cancelSnap();
        return;
      }

      if (e.deltaY === 0) return;

      if (snapping) {
        e.preventDefault();
        return;
      }

      var st = scroll.scrollTop;
      var snaps = getSnapPositions();
      if (st >= snaps.panelY - 48) return;
      if (st >= snaps.freeY) return;

      e.preventDefault();
      glideToPanel();
    }

    scroll.addEventListener('wheel', onWheel, { passive: false });

    scrollSnapCleanup = function () {
      if (rafId) cancelAnimationFrame(rafId);
      scroll.removeEventListener('wheel', onWheel);
      glideToPanelFn = null;
    };
  }

  function updateSlideClasses() {
    slides.forEach(function (s, i) {
      s.classList.remove('is-active', 'is-prev', 'is-next', 'is-stack-paper');
      if (i === current) {
        s.classList.add('is-active');
      } else if (i === current - 1) {
        s.classList.add('is-stack-paper');
      } else if (i > current) {
        s.classList.add('is-next');
      }
    });
  }

  function updateChrome() {
    if (btnPrev) btnPrev.disabled = current === 0;
    if (btnNext) btnNext.disabled = current === slides.length - 1;
    if (indicator) {
      indicator.textContent = (current + 1) + ' / ' + slides.length;
    }
    if (flowerNav) {
      flowerNav.querySelectorAll('.flower-dot').forEach(function (b, i) {
        b.classList.toggle('active', i === current);
        b.classList.toggle('visited', i < current);
        b.setAttribute('aria-current', i === current ? 'page' : 'false');
        if (i === current) {
          b.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      });
    }
    history.replaceState(null, '', '#slide-' + current);
  }

  function updateSlideContent(options) {
    options = options || {};

    var activeSlide = slides[current];
    var activeScroll = activeSlide && (
      activeSlide.querySelector('.page-scroll') ||
      activeSlide.querySelector('.home-scroll')
    );
    if (activeScroll) activeScroll.scrollTop = 0;
    slides.forEach(function (s, i) {
      if (i === current) return;
      var scroll = s.querySelector('.page-scroll') || s.querySelector('.home-scroll');
      if (scroll) scroll.scrollTop = 0;
      resetArticleSections(s);
    });

    if (activeSlide) {
      resetArticleSections(activeSlide);
      setupArticleReveal(activeSlide);
      setupSlideScrollSnap(activeSlide);
    } else if (scrollSnapCleanup) {
      scrollSnapCleanup();
      scrollSnapCleanup = null;
    }

    if (!options.skipHeadAnim) {
      triggerHeadAnimations();
    }
  }

  function updateUI() {
    updateSlideClasses();
    updateChrome();
    updateSlideContent();
  }

  function getHomeScrollEl() {
    var home = slides[0];
    return home ? home.querySelector('.home-scroll') : null;
  }

  function resetHomeAuthorView() {
    var scrollEl = getHomeScrollEl();
    var btn = document.getElementById('btnHomeAuthor');
    if (scrollEl) scrollEl.scrollTop = 0;
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function openHomeAuthor() {
    var btn = document.getElementById('btnHomeAuthor');
    if (btn) btn.setAttribute('aria-expanded', 'true');

    if (current !== 0) return;

    if (glideToPanelFn) {
      glideToPanelFn();
      return;
    }

    var scrollEl = getHomeScrollEl();
    var panel = slides[0] && slides[0].querySelector('.home-author-panel');
    if (!scrollEl || !panel) return;

    var top = panel.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top + scrollEl.scrollTop;
    scrollEl.scrollTo({ top: Math.max(0, top - scrollEl.clientHeight * 0.08), behavior: 'smooth' });
  }

  function setupHomeAuthor() {
    var btn = document.getElementById('btnHomeAuthor');
    var home = slides[0];
    if (!btn || !home) return;

    function onAuthorActivate(e) {
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      if (e.type === 'keydown') e.preventDefault();
      e.stopPropagation();
      if (current !== 0) {
        goTo(0, current > 0 ? -1 : 1);
        window.setTimeout(function () {
          if (current === 0) openHomeAuthor();
        }, getSlideDurationMs() + 80);
        return;
      }
      openHomeAuthor();
    }

    btn.addEventListener('click', onAuthorActivate);
    btn.addEventListener('keydown', onAuthorActivate);
  }

  function finishDeckTransition() {
    endDeckTransition();
    slides.forEach(function (s) {
      s.style.transform = '';
    });
    updateSlideClasses();
    updateSlideContent({ skipHeadAnim: true });
    animating = false;
    requestAnimationFrame(function () {
      playActiveHeadAnimation(true);
    });
  }

  function goTo(index, direction) {
    if (animating || index === current) return;
    if (index < 0 || index >= slides.length) return;

    const dir = direction !== undefined ? direction : (index > current ? 1 : -1);
    animating = true;
    const old = current;
    if (old === 0 && index !== 0) resetHomeAuthorView();
    current = index;

    updateChrome();

    slides.forEach(function (s) {
      s.style.transform = '';
    });

    document.body.classList.add('deck-animating', dir >= 0 ? 'deck-forward' : 'deck-back');

    slides.forEach(function (s) {
      s.classList.remove('is-active', 'is-prev', 'is-next', 'is-stack-paper');
    });

    if (dir >= 0) {
      slides[old].classList.add('is-prev');
      if (old - 1 >= 0) slides[old - 1].classList.add('is-stack-paper');
      slides[current].classList.add('is-next');
      void slides[current].offsetWidth;
      slides[current].classList.remove('is-next');
      slides[current].classList.add('is-active');
    } else {
      slides[old].classList.add('is-next');
      if (current - 1 >= 0) slides[current - 1].classList.add('is-stack-paper');
      slides[current].classList.add('is-prev');
      void slides[current].offsetWidth;
      slides[current].classList.remove('is-prev');
      slides[current].classList.add('is-active');
    }

    var transitionDone = false;
    var transitionEl = dir >= 0 ? slides[current] : slides[old];

    function onTransitionEnd(e) {
      if (e.target !== transitionEl || e.propertyName !== 'transform') return;
      if (transitionDone) return;
      transitionDone = true;
      finishDeckTransition();
    }

    if (transitionEl) {
      transitionEl.addEventListener('transitionend', onTransitionEnd);
    }

    setTimeout(function () {
      if (transitionDone) return;
      transitionDone = true;
      if (transitionEl) {
        transitionEl.removeEventListener('transitionend', onTransitionEnd);
      }
      finishDeckTransition();
    }, getSlideDurationMs() + 80);
  }

  function next() { goTo(current + 1, 1); }
  function prev() { goTo(current - 1, -1); }

  if (btnNext) btnNext.addEventListener('click', next);
  if (btnPrev) btnPrev.addEventListener('click', prev);

  document.querySelectorAll('[data-goto]').forEach(function (el) {
    el.addEventListener('click', function () {
      const idx = parseInt(el.getAttribute('data-goto'), 10);
      if (!isNaN(idx)) goTo(idx, idx > current ? 1 : -1);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prev(); }
  });

  var hash = location.hash.match(/slide-(\d+)/);
  if (hash) {
    var n = parseInt(hash[1], 10);
    if (n >= 0 && n < slides.length) current = n;
  }

  buildFlowerNav();
  setupHomeAuthor();
  setupMouseParallax();
  updateSlideClasses();
  updateChrome();
  applyPageTheme();
  updateSlideContent({ skipHeadAnim: true });
  syncParallaxToPointer();
  requestAnimationFrame(function () {
    requestAnimationFrame(triggerHeadAnimations);
  });
})();
