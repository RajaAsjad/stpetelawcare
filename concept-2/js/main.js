/* St. Pete Lawncare — Concept 2 interactions */
(function () {
  'use strict';

  var html = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined';
  var hasST = hasGSAP && typeof window.ScrollTrigger !== 'undefined';
  var animate = hasGSAP && !reduced;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var header = $('#site-header');

  /* ---------- Mobile menu ---------- */
  var menuBtn = $('#mobile-menu-btn');
  var menu = $('#mobile-menu');
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (!menu.hidden && !header.contains(e.target)) setMenu(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1180 && !menu.hidden) setMenu(false);
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a[href^="#"]')) setMenu(false);
    });
  }
  $$('.m-acc-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = document.getElementById(btn.getAttribute('data-target'));
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      if (panel) panel.hidden = open;
    });
  });

  /* ---------- Scroll state: header shadow + lead bar ---------- */
  var leadBar = $('#lead-capture-bar');
  var THRESHOLD = 200;
  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 10);
    if (leadBar) leadBar.classList.toggle('is-visible', y > THRESHOLD);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Hero form (Web3Forms) ---------- */
  var heroForm = $('#hero-form');
  if (heroForm) {
    var hBtn = $('#hero-submit-btn'), hText = $('#hero-btn-text'), hLoad = $('#hero-btn-loading');
    var hOk = $('#hero-success'), hErr = $('#hero-error');
    heroForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      hBtn.disabled = true;
      hText.hidden = true;
      hLoad.hidden = false;
      hOk.hidden = true;
      hErr.hidden = true;
      try {
        var data = new FormData(heroForm);
        var res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: data });
        var json = await res.json();
        if (json.success) {
          hOk.hidden = false;
          heroForm.reset();
          hBtn.hidden = true;
        } else {
          hErr.hidden = false;
        }
      } catch (err) {
        hErr.hidden = false;
      } finally {
        hBtn.disabled = false;
        hText.hidden = false;
        hLoad.hidden = true;
      }
    });
  }

  /* ---------- Lead capture form (Web3Forms) ---------- */
  var leadForm = $('#lead-capture-form');
  if (leadForm) {
    var lBtn = $('#lead-submit-btn'), lText = $('#lead-btn-text'), lLoad = $('#lead-btn-loading');
    var lFields = $('#lead-form-fields'), lOk = $('#lead-success');
    leadForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      lBtn.disabled = true;
      lText.hidden = true;
      lLoad.hidden = false;
      try {
        var data = new FormData(leadForm);
        var res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: data });
        var json = await res.json();
        if (json.success) {
          lFields.hidden = true;
          lOk.hidden = false;
          lBtn.hidden = true;
        } else {
          lBtn.disabled = false;
          lText.hidden = false;
          lLoad.hidden = true;
        }
      } catch (err) {
        lBtn.disabled = false;
        lText.hidden = false;
        lLoad.hidden = true;
      }
    });
  }

  /* ---------- Nav hover glider ---------- */
  var nav = $('.main-nav');
  var glider = $('.nav-glider');
  if (nav && glider) {
    var links = $$('.nav-list > li > .nav-link', nav);
    var activeLink = $('.nav-link.is-active', nav) || links[0];
    var moveGlider = function (el, instant) {
      if (!el || !nav.offsetParent) return;
      var nr = nav.getBoundingClientRect();
      var r = el.getBoundingClientRect();
      var props = { x: r.left - nr.left, width: r.width };
      if (hasGSAP) {
        if (instant || reduced) gsap.set(glider, props);
        else gsap.to(glider, Object.assign({ duration: 0.45, ease: 'power3.out', overwrite: true }, props));
      } else {
        glider.style.transform = 'translateX(' + props.x + 'px)';
        glider.style.width = props.width + 'px';
      }
    };
    links.forEach(function (a) {
      a.parentElement.addEventListener('mouseenter', function () {
        glider.classList.add('is-hover');
        moveGlider(a);
      });
      a.addEventListener('focus', function () { moveGlider(a); });
    });
    nav.addEventListener('mouseleave', function () {
      glider.classList.remove('is-hover');
      moveGlider(activeLink);
    });
    var place = function () { moveGlider(activeLink, true); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    window.addEventListener('resize', place);
    window.addEventListener('load', place);
    place();
  }

  /* ---------- Service card 3D tilt ---------- */
  if (!reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.svc-card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ry', ((px - 0.5) * 9).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((0.5 - py) * 7).toFixed(2) + 'deg');
        card.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------- Motion (GSAP) ---------- */
  if (!animate) {
    html.classList.add('anim-ready');
    return;
  }

  if (hasST) gsap.registerPlugin(ScrollTrigger);

  var intro = $$('[data-intro]');
  gsap.set(intro, { autoAlpha: 0 });
  var heroMarks = $$('.hero .hl-mark path');
  var otherMarks = $$('.hl-mark path').filter(function (p) { return heroMarks.indexOf(p) === -1; });
  gsap.set(heroMarks.concat(otherMarks), { strokeDashoffset: 1 });
  html.classList.add('anim-ready');

  /* Intro timeline */
  var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.fromTo('.hero-card', { autoAlpha: 0, scale: 0.955, y: 20 }, { autoAlpha: 1, scale: 1, y: 0, duration: 1.2, ease: 'expo.out', clearProps: 'transform' })
    .fromTo('.nav-pill', { autoAlpha: 0, y: -28 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'back.out(1.6)', clearProps: 'transform' }, 0.1)
    .fromTo('.hero-badge', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.35)
    .set('.hero-title', { autoAlpha: 1 }, 0.4)
    .from('.hero-title .w', { autoAlpha: 0, yPercent: 60, rotate: 4, duration: 0.8, stagger: 0.06, ease: 'back.out(1.5)' }, 0.42)
    .fromTo('.hero-lead', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 0.8)
    .fromTo('.chip', { autoAlpha: 0, y: 14, scale: 0.85 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.08, ease: 'back.out(2)', clearProps: 'transform' }, 0.95)
    .fromTo('.btn-phone', { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.55)', clearProps: 'transform' }, 1.1)
    .fromTo('.form-card', { autoAlpha: 0, x: 60, rotate: 2 }, { autoAlpha: 1, x: 0, rotate: 0, duration: 1, ease: 'expo.out', clearProps: 'transform' }, 0.6)
    .from('.hero-form > *', { autoAlpha: 0, y: 12, duration: 0.45, stagger: 0.05 }, 0.9)
    .to(heroMarks, { strokeDashoffset: 0, duration: 0.8, stagger: 0.25, ease: 'power2.inOut' }, 1.15)
    .fromTo('.scroll-cue', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 1.6);

  if (!hasST) {
    gsap.set(otherMarks, { strokeDashoffset: 0 });
    return;
  }

  /* Hero image parallax */
  gsap.to('.hero-bg', {
    yPercent: 8,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  /* Generic reveals */
  var revealIn = function (batch) {
    gsap.to(batch, { autoAlpha: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out', overwrite: true, clearProps: 'transform' });
  };
  gsap.set('.reveal', { autoAlpha: 0, y: 44, scale: 0.98 });
  ScrollTrigger.batch('.reveal', { start: 'top 90%', once: true, onEnter: revealIn, onLeave: revealIn });

  /* Pop-in badges & city cards */
  var popIn = function (batch) {
    gsap.to(batch, { autoAlpha: 1, scale: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'back.out(1.8)', overwrite: true, clearProps: 'transform' });
  };
  gsap.set('.pop', { autoAlpha: 0, scale: 0.8, y: 16 });
  ScrollTrigger.batch('.pop', { start: 'top 94%', once: true, onEnter: popIn, onLeave: popIn });

  /* Marker underlines outside hero */
  otherMarks.forEach(function (path) {
    gsap.to(path, {
      strokeDashoffset: 0,
      duration: 0.9,
      ease: 'power2.inOut',
      scrollTrigger: { trigger: path.closest('.hl'), start: 'top 82%', once: true }
    });
  });

  /* CTA headline word pop */
  gsap.from('.cta-title .w', {
    autoAlpha: 0,
    yPercent: 70,
    scale: 0.6,
    rotate: -6,
    duration: 0.7,
    stagger: 0.09,
    ease: 'back.out(2)',
    scrollTrigger: { trigger: '.cta-title', start: 'top 85%', once: true }
  });

  /* 500+ counter */
  var counter = $('.counter');
  if (counter) {
    var target = parseInt(counter.getAttribute('data-count'), 10) || 0;
    var obj = { v: 0 };
    counter.textContent = '0';
    gsap.to(obj, {
      v: target,
      duration: 2,
      ease: 'power2.out',
      onUpdate: function () { counter.textContent = Math.round(obj.v); },
      scrollTrigger: { trigger: '.stat-card', start: 'top 85%', once: true }
    });
  }

  /* Blob horizontal parallax */
  [['.blob--a', 30], ['.blob--b', -35], ['.blob--c', -25]].forEach(function (b) {
    gsap.to(b[0], {
      xPercent: b[1],
      ease: 'none',
      scrollTrigger: { trigger: '.why', start: 'top bottom', end: 'bottom top', scrub: 1 }
    });
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
