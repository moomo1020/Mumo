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
  let mobileFlowerBtn = null;
  let mobileFlowerSpun = false;
  let mobilePageSheetOpen = false;
  let chibiParallaxCleanup = null;

  const MOBILE_TOC_HINT_KEY = 'mumo-mobile-flower-hint-v4';

  const MOBILE_MQ = window.matchMedia('(max-width: 640px)');

  function isMobileMode() {
    return MOBILE_MQ.matches;
  }

  function syncDeviceMode() {
    document.body.classList.toggle('is-mobile', isMobileMode());
    document.body.classList.toggle('is-desktop', !isMobileMode());
    document.documentElement.classList.toggle('is-mobile', isMobileMode());
    document.documentElement.classList.toggle('is-desktop', !isMobileMode());
    if (!animating) {
      updateSlideClasses();
      buildFlowerNav();
      updateChrome();
      updateSlideContent({ skipHeadAnim: true });
      if (!isMobileMode()) {
        closeMobilePageSheet();
        dismissMobileFlowerHint(false);
      }
    }
  }

  function setupDeviceMode() {
    syncDeviceMode();
    if (typeof MOBILE_MQ.addEventListener === 'function') {
      MOBILE_MQ.addEventListener('change', syncDeviceMode);
    } else if (typeof MOBILE_MQ.addListener === 'function') {
      MOBILE_MQ.addListener(syncDeviceMode);
    }
  }

  function isDeckSwipeBlockedTarget(el) {
    if (!el || !el.closest) return false;
    return !!el.closest(
      'button, a, input, textarea, select, label, [contenteditable], ' +
      '.flower-nav, .deck-controls, .mobile-page-sheet, .mobile-flower-chrome'
    );
  }

  function shouldDeckHorizontalSwipe(dx, dy, threshold) {
    return Math.abs(dx) >= threshold && Math.abs(dx) >= Math.abs(dy) * 1.15;
  }

  function setupDeckSwipe() {
    var SWIPE_THRESHOLD = 56;
    var DRAG_START = 8;

    var touchSwipeStartX = 0;
    var touchSwipeStartY = 0;
    var touchSwipeTracking = false;

    deck.addEventListener('touchstart', function (e) {
      if (!isMobileMode() || animating || e.touches.length !== 1) return;
      if (isDeckSwipeBlockedTarget(e.target)) return;
      var t = e.touches[0];
      touchSwipeStartX = t.clientX;
      touchSwipeStartY = t.clientY;
      touchSwipeTracking = true;
    }, { passive: true });

    deck.addEventListener('touchend', function (e) {
      if (!touchSwipeTracking || !isMobileMode() || animating) return;
      touchSwipeTracking = false;
      var t = e.changedTouches[0];
      if (!t) return;
      var dx = t.clientX - touchSwipeStartX;
      var dy = t.clientY - touchSwipeStartY;
      if (!shouldDeckHorizontalSwipe(dx, dy, SWIPE_THRESHOLD)) return;
      if (dx < 0) next();
      else prev();
    }, { passive: true });

    if (!window.matchMedia('(pointer: fine)').matches) return;

    var dragStartX = 0;
    var dragStartY = 0;
    var dragTracking = false;
    var dragActive = false;
    var dragSlideEl = null;

    function resetDragSlide(slideEl, animate) {
      if (!slideEl) return;
      if (animate) {
        slideEl.style.transition = 'transform 0.32s cubic-bezier(0.33, 0.85, 0.4, 1)';
        slideEl.style.transform = '';
        window.setTimeout(function () {
          slideEl.style.transition = '';
        }, 340);
      } else {
        slideEl.style.transition = '';
        slideEl.style.transform = '';
      }
    }

    function finishDrag(e) {
      if (!dragTracking) return;
      dragTracking = false;
      document.body.classList.remove('deck-dragging');

      if (!dragActive) return;
      dragActive = false;

      var dx = e.clientX - dragStartX;
      var dy = e.clientY - dragStartY;
      var slideEl = dragSlideEl;
      dragSlideEl = null;

      if (shouldDeckHorizontalSwipe(dx, dy, SWIPE_THRESHOLD)) {
        resetDragSlide(slideEl, false);
        if (dx < 0) next();
        else prev();
        return;
      }

      resetDragSlide(slideEl, true);
    }

    deck.addEventListener('mousedown', function (e) {
      if (e.button !== 0 || isMobileMode() || animating) return;
      if (isDeckSwipeBlockedTarget(e.target)) return;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragTracking = true;
      dragActive = false;
      dragSlideEl = slides[current] || null;
    });

    document.addEventListener('mousemove', function (e) {
      if (!dragTracking || isMobileMode() || animating) return;

      var dx = e.clientX - dragStartX;
      var dy = e.clientY - dragStartY;

      if (!dragActive) {
        if (Math.abs(dx) < DRAG_START && Math.abs(dy) < DRAG_START) return;
        if (Math.abs(dy) > Math.abs(dx) * 1.15) {
          dragTracking = false;
          dragSlideEl = null;
          return;
        }
        dragActive = true;
        document.body.classList.add('deck-dragging');
      }

      e.preventDefault();

      if (!dragSlideEl) return;

      var moveX = dx;
      if (current === 0 && moveX > 0) moveX *= 0.35;
      if (current === slides.length - 1 && moveX < 0) moveX *= 0.35;

      var rotate = (moveX / window.innerWidth) * 4;
      dragSlideEl.style.transition = 'none';
      dragSlideEl.style.transform =
        'translate3d(' + moveX + 'px, 0, 0) rotate(' + rotate + 'deg)';
    });

    document.addEventListener('mouseup', finishDrag);
    window.addEventListener('blur', function () {
      if (!dragTracking) return;
      finishDrag({ clientX: dragStartX, clientY: dragStartY });
    });
  }

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
    flowerNav.classList.toggle('flower-nav--single', isMobileMode());
    mobileFlowerBtn = null;

    if (isMobileMode()) {
      var solo = document.createElement('button');
      solo.type = 'button';
      solo.className = 'flower-dot flower-dot--solo active';
      solo.title = SLIDE_NAMES[current] || '';
      solo.setAttribute('aria-label', SLIDE_NAMES[current] || '目前頁面');
      solo.setAttribute('aria-current', 'page');
      flowerNav.appendChild(solo);
      mobileFlowerBtn = solo;
      mobileFlowerBtn.setAttribute('aria-haspopup', 'dialog');
      mobileFlowerBtn.setAttribute('aria-expanded', 'false');
      return;
    }

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

  function isMobileFlowerHintDismissed() {
    try {
      return localStorage.getItem(MOBILE_TOC_HINT_KEY) === '1';
    } catch (err) {
      return false;
    }
  }

  function dismissMobileFlowerHint(persist) {
    var hint = document.getElementById('mobileFlowerHint');
    if (!hint) return;
    hint.classList.remove('is-visible', 'is-animating');
    if (persist) {
      try {
        localStorage.setItem(MOBILE_TOC_HINT_KEY, '1');
      } catch (err) { /* ignore */ }
    }
  }

  function showMobileFlowerHint() {
    var hint = document.getElementById('mobileFlowerHint');
    if (!hint || !isMobileMode() || isMobileFlowerHintDismissed()) {
      dismissMobileFlowerHint(false);
      return;
    }
    if (hint.classList.contains('is-visible')) return;

    window.clearTimeout(scheduleMobileFlowerHint._timer);
    hint.classList.add('is-visible');
    hint.classList.remove('is-animating');
    void hint.offsetWidth;
    hint.classList.add('is-animating');

    window.clearTimeout(showMobileFlowerHint._settleTimer);
    showMobileFlowerHint._settleTimer = window.setTimeout(function () {
      if (!hint || !hint.classList.contains('is-visible')) return;
      hint.classList.remove('is-animating');
    }, 780);
  }

  function scheduleMobileFlowerHint() {
    if (!isMobileMode() || isMobileFlowerHintDismissed()) {
      dismissMobileFlowerHint(false);
      return;
    }
    window.clearTimeout(scheduleMobileFlowerHint._timer);
    scheduleMobileFlowerHint._timer = window.setTimeout(showMobileFlowerHint, 450);
  }

  function openMobileSheetAuthor() {
    closeMobilePageSheet();
    if (current !== 0) {
      goTo(0, current > 0 ? -1 : 1);
      window.setTimeout(function () {
        if (current === 0) openHomeAuthor();
      }, getSlideDurationMs() + 80);
      return;
    }
    openHomeAuthor();
  }

  function setTocCharacterMenuOpen(item, btn, open) {
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (item) item.classList.toggle('is-expanded', open);
  }

  function resetTocCharacterMenus() {
    document.querySelectorAll('.home-toc-item--has-sub').forEach(function (item) {
      var btn = item.querySelector('.home-toc-expand-btn');
      setTocCharacterMenuOpen(item, btn, false);
    });
  }

  function setupTocCharacterMenus() {
    document.querySelectorAll('.home-toc-expand-btn').forEach(function (btn) {
      if (btn.dataset.ready) return;
      btn.dataset.ready = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var item = btn.closest('.home-toc-item--has-sub');
        var isOpen = btn.getAttribute('aria-expanded') === 'true';
        var willOpen = !isOpen;
        if (willOpen) {
          document.querySelectorAll('.home-toc-item--has-sub.is-expanded').forEach(function (other) {
            if (other === item) return;
            setTocCharacterMenuOpen(other, other.querySelector('.home-toc-expand-btn'), false);
          });
        }
        setTocCharacterMenuOpen(item, btn, willOpen);
      });
    });
  }

  function closeMobilePageSheet() {
    var sheet = document.getElementById('mobilePageSheet');
    var panel = sheet && sheet.querySelector('.mobile-page-sheet-panel');
    if (!sheet || !mobilePageSheetOpen) return;

    mobilePageSheetOpen = false;
    sheet.classList.remove('is-open');
    if (panel) void panel.offsetWidth;
    sheet.classList.add('is-closing');
    document.body.classList.remove('mobile-sheet-open');
    if (mobileFlowerBtn) mobileFlowerBtn.setAttribute('aria-expanded', 'false');

    var done = false;
    function finishClose() {
      if (done) return;
      done = true;
      sheet.hidden = true;
      sheet.classList.remove('is-closing');
      sheet.setAttribute('aria-hidden', 'true');
      resetTocCharacterMenus();
      if (panel) panel.removeEventListener('transitionend', onTransitionEnd);
    }

    function onTransitionEnd(e) {
      if (!panel || e.target !== panel || e.propertyName !== 'transform') return;
      finishClose();
    }

    if (panel) panel.addEventListener('transitionend', onTransitionEnd);
    window.setTimeout(finishClose, getSlideDurationMs() + 80);
  }

  function openMobilePageSheet() {
    if (!isMobileMode()) return;
    var sheet = document.getElementById('mobilePageSheet');
    if (!sheet) return;

    dismissMobileFlowerHint(true);

    sheet.hidden = false;
    sheet.classList.remove('is-closing');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('mobile-sheet-open');
    if (mobileFlowerBtn) mobileFlowerBtn.setAttribute('aria-expanded', 'true');
    void sheet.offsetWidth;
    requestAnimationFrame(function () {
      sheet.classList.add('is-open');
    });
    mobilePageSheetOpen = true;
  }

  function setupMobilePageDirectory() {
    var sheet = document.getElementById('mobilePageSheet');
    var list = document.getElementById('mobilePageSheetList');
    var backdrop = document.getElementById('mobilePageSheetBackdrop');
    if (!sheet || !list || !flowerNav) return;

    if (!sheet.dataset.ready) {
      list.querySelectorAll('button[data-goto]').forEach(function (btn) {
        btn.addEventListener('click', closeMobilePageSheet);
      });
      sheet.querySelectorAll('[data-mobile-sheet-author]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          openMobileSheetAuthor();
        });
      });
      sheet.dataset.ready = '1';
    }

    flowerNav.addEventListener('click', function (e) {
      if (!isMobileMode()) return;
      if (!e.target.closest('.flower-dot--solo')) return;
      e.preventDefault();
      if (mobilePageSheetOpen) closeMobilePageSheet();
      else openMobilePageSheet();
    });

    if (backdrop) {
      backdrop.addEventListener('click', closeMobilePageSheet);
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobilePageSheetOpen) {
        e.preventDefault();
        closeMobilePageSheet();
      }
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
      if (animating || document.body.classList.contains('deck-dragging')) {
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

  function resetMobileFlowerSpin() {
    mobileFlowerSpun = false;
    if (mobileFlowerBtn) mobileFlowerBtn.classList.remove('is-spinning');
  }

  function spinMobileFlowerOnTurn() {
    if (!isMobileMode() || !mobileFlowerBtn) return;
    mobileFlowerBtn.classList.remove('is-spinning');
    void mobileFlowerBtn.offsetWidth;
    mobileFlowerBtn.classList.add('is-spinning');
    mobileFlowerSpun = true;
  }

  var MOBILE_CHIBI_LAYOUT = {
    '2': { top: 'clamp(0.95rem, 2.5vh, 1.85rem)', width: 'min(44vw, 10.5rem)', right: 'clamp(0.2rem, 2vw, 1.1rem)' },
    '3': { top: 'clamp(2.45rem, 7vh, 3.85rem)', width: 'min(38vw, 9.25rem)', right: 'clamp(0.15rem, 1.5vw, 0.95rem)' },
    '4': { top: 'clamp(1.85rem, 5.5vh, 3.1rem)', width: 'min(38vw, 9.5rem)', right: 'clamp(0.1rem, 1vw, 0.75rem)' },
    '5': { top: 'clamp(1.85rem, 5vh, 3.1rem)', width: 'min(38vw, 9.5rem)', right: 'clamp(0.1rem, 1.5vw, 0.9rem)' },
  };

  function clearMobileChibiLayout(slide) {
    if (!slide) return;
    var chibi = slide.querySelector('.id-card-chibi');
    if (!chibi) return;
    chibi.style.removeProperty('position');
    chibi.style.removeProperty('top');
    chibi.style.removeProperty('right');
    chibi.style.removeProperty('width');
    chibi.style.removeProperty('transform');
    chibi.style.removeProperty('animation');
    chibi.style.removeProperty('opacity');
    chibi.style.removeProperty('bottom');
    chibi.style.removeProperty('left');
  }

  function applyMobileChibiLayout(slide) {
    if (!isMobileMode() || !slide.classList.contains('slide-id-page')) return;
    var chibi = slide.querySelector('.id-card-chibi');
    if (!chibi) return;
    var preset = MOBILE_CHIBI_LAYOUT[slide.getAttribute('data-slide')];
    if (!preset) return;

    chibi.style.setProperty('position', 'absolute', 'important');
    chibi.style.setProperty('transform', 'none', 'important');
    chibi.style.setProperty('animation', 'none', 'important');
    chibi.style.setProperty('opacity', '0.88', 'important');
    chibi.style.setProperty('bottom', 'auto', 'important');
    chibi.style.setProperty('left', 'auto', 'important');
    chibi.style.setProperty('top', preset.top, 'important');
    chibi.style.setProperty('right', preset.right, 'important');
    chibi.style.setProperty('width', preset.width, 'important');
  }

  function setupMobileChibiParallax(slide) {
    if (chibiParallaxCleanup) {
      chibiParallaxCleanup();
      chibiParallaxCleanup = null;
    }
    if (!isMobileMode()) {
      slides.forEach(clearMobileChibiLayout);
      return;
    }
    if (!slide.classList.contains('slide-id-page')) return;

    var scroll = slide.querySelector('.page-scroll');
    var img = slide.querySelector('.id-card-chibi-img');
    var chibi = slide.querySelector('.id-card-chibi');
    if (!scroll || !img || !chibi) return;

    applyMobileChibiLayout(slide);

    function update() {
      var st = scroll.scrollTop;
      var x = Math.sin(st * 0.011) * 5;
      var y = ((st % 140) - 70) * 0.07;
      img.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + (x * 0.14).toFixed(2) + 'deg)';
    }

    scroll.addEventListener('scroll', update, { passive: true });
    update();
    chibiParallaxCleanup = function () {
      scroll.removeEventListener('scroll', update);
      img.style.transform = '';
      clearMobileChibiLayout(slide);
    };
  }

  function updateSlideClasses() {
    slides.forEach(function (s, i) {
      s.classList.remove('is-active', 'is-prev', 'is-next', 'is-stack-paper');
      if (i === current) {
        s.classList.add('is-active');
      } else if (!isMobileMode() && i === current - 1) {
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
      if (isMobileMode() && mobileFlowerBtn) {
        mobileFlowerBtn.title = SLIDE_NAMES[current] || '';
        mobileFlowerBtn.setAttribute(
          'aria-label',
          (SLIDE_NAMES[current] || '目前頁面') + '，點擊開啟目錄'
        );
      } else {
        flowerNav.querySelectorAll('.flower-dot').forEach(function (b, i) {
          b.classList.toggle('active', i === current);
          b.classList.toggle('visited', i < current);
          b.setAttribute('aria-current', i === current ? 'page' : 'false');
          if (i === current) {
            b.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        });
      }
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
      setupMobileChibiParallax(activeSlide);
      resetMobileFlowerSpin();
    } else {
      if (chibiParallaxCleanup) {
        chibiParallaxCleanup();
        chibiParallaxCleanup = null;
      }
      resetMobileFlowerSpin();
    }

    if (!options.skipHeadAnim) {
      triggerHeadAnimations();
    }

    if (isMobileMode() && !isMobileFlowerHintDismissed()) {
      var hintEl = document.getElementById('mobileFlowerHint');
      if (!hintEl || !hintEl.classList.contains('is-visible')) {
        scheduleMobileFlowerHint();
      }
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

    var scrollEl = getHomeScrollEl();
    var panel = slides[0] && slides[0].querySelector('.home-author-panel');
    if (!scrollEl || !panel) return;

    var top = panel.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top + scrollEl.scrollTop;
    scrollEl.scrollTo({ top: Math.max(0, top - scrollEl.clientHeight * 0.08), behavior: 'smooth' });
  }

  function setupHomeAuthor() {
    var home = slides[0];
    if (!home) return;

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

    var btn = document.getElementById('btnHomeAuthor');
    if (btn) {
      btn.addEventListener('click', onAuthorActivate);
      btn.addEventListener('keydown', onAuthorActivate);
    }

    home.querySelectorAll('[data-home-author]').forEach(function (el) {
      el.addEventListener('click', onAuthorActivate);
    });
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
    closeMobilePageSheet();

    const dir = direction !== undefined ? direction : (index > current ? 1 : -1);
    animating = true;
    const old = current;
    if (old === 0 && index !== 0) resetHomeAuthorView();
    current = index;

    updateChrome();
    spinMobileFlowerOnTurn();

    slides.forEach(function (s) {
      s.style.transform = '';
    });

    document.body.classList.add('deck-animating', dir >= 0 ? 'deck-forward' : 'deck-back');

    slides.forEach(function (s) {
      s.classList.remove('is-active', 'is-prev', 'is-next', 'is-stack-paper');
    });

    if (dir >= 0) {
      slides[old].classList.add('is-prev');
      if (!isMobileMode() && old - 1 >= 0) slides[old - 1].classList.add('is-stack-paper');
      slides[current].classList.add('is-next');
      void slides[current].offsetWidth;
      slides[current].classList.remove('is-next');
      slides[current].classList.add('is-active');
    } else {
      slides[old].classList.add('is-next');
      if (!isMobileMode() && current - 1 >= 0) slides[current - 1].classList.add('is-stack-paper');
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
  setupDeviceMode();
  setupDeckSwipe();
  setupMobilePageDirectory();
  setupTocCharacterMenus();
  setupHomeAuthor();
  setupMouseParallax();
  updateSlideClasses();
  updateChrome();
  applyPageTheme();
  updateSlideContent({ skipHeadAnim: true });
  syncParallaxToPointer();
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      triggerHeadAnimations();
    });
  });
})();
