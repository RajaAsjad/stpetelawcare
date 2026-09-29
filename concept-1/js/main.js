(function () {
  'use strict';

  var doc = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var hasGSAP = !!(gsap && ScrollTrigger);

  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  /* ---------- Header state + lead bar ---------- */
  var header = document.getElementById('site-header');
  var leadBar = document.getElementById('lead-capture-bar');
  var LEAD_THRESHOLD = 200;
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    header.classList.toggle('is-scrolled', y > 30);
    var showLead = y > LEAD_THRESHOLD;
    leadBar.classList.toggle('is-visible', showLead);
    leadBar.setAttribute('aria-hidden', showLead ? 'false' : 'true');
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.getElementById('mobile-menu-btn');
  var mobileMenu = document.getElementById('mobile-menu');
  menuBtn.addEventListener('click', function () {
    var open = !mobileMenu.classList.contains('is-open');
    mobileMenu.classList.toggle('is-open', open);
    mobileMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    header.classList.toggle('menu-open', open);
  });
  document.querySelectorAll('.m-acc-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      var open = !panel.classList.contains('is-open');
      panel.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 1024 && mobileMenu.classList.contains('is-open')) menuBtn.click();
  });

  /* ---------- Forms (Web3Forms) ---------- */
  var heroForm = document.getElementById('hero-form');
  var heroBtn = document.getElementById('hero-submit-btn');
  var heroBtnText = document.getElementById('hero-btn-text');
  var heroBtnLoading = document.getElementById('hero-btn-loading');
  var heroSuccess = document.getElementById('hero-success');
  var heroError = document.getElementById('hero-error');

  heroForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    heroBtn.disabled = true;
    heroBtnText.classList.add('is-hidden');
    heroBtnLoading.classList.remove('is-hidden');
    heroSuccess.classList.add('is-hidden');
    heroError.classList.add('is-hidden');
    try {
      var data = new FormData(heroForm);
      var res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: data });
      var json = await res.json();
      if (json.success) {
        heroSuccess.classList.remove('is-hidden');
        heroForm.reset();
        heroBtn.classList.add('is-hidden');
      } else {
        heroError.classList.remove('is-hidden');
      }
    } catch (err) {
      heroError.classList.remove('is-hidden');
    } finally {
      heroBtn.disabled = false;
      heroBtnText.classList.remove('is-hidden');
      heroBtnLoading.classList.add('is-hidden');
    }
  });

  var leadForm = document.getElementById('lead-capture-form');
  var leadBtn = document.getElementById('lead-submit-btn');
  var leadBtnText = document.getElementById('lead-btn-text');
  var leadBtnLoading = document.getElementById('lead-btn-loading');
  var leadFields = document.getElementById('lead-form-fields');
  var leadSuccess = document.getElementById('lead-success');

  leadForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    leadBtn.disabled = true;
    leadBtnText.classList.add('is-hidden');
    leadBtnLoading.classList.remove('is-hidden');
    try {
      var data = new FormData(leadForm);
      var res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: data });
      var json = await res.json();
      if (json.success) {
        leadFields.classList.add('is-hidden');
        leadSuccess.classList.remove('is-hidden');
        leadBtn.classList.add('is-hidden');
      }
    } catch (err) {
      leadBtn.disabled = false;
      leadBtnText.classList.remove('is-hidden');
      leadBtnLoading.classList.add('is-hidden');
    }
  });

  /* ---------- Without GSAP (or reduced motion) just show everything ---------- */
  if (!hasGSAP || reduceMotion) {
    window.__introStarted = true;
    doc.classList.remove('js');
    if (!hasGSAP) return;
  }

  /* ---------- Split hero title into masked words ---------- */
  function splitWords(el) {
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span');
          w.className = 'word';
          var inner = document.createElement('span');
          inner.className = 'word-inner';
          inner.textContent = part;
          w.appendChild(inner);
          frag.appendChild(w);
        });
        node.parentNode.replaceChild(frag, node);
      } else if (node.nodeType === 1) {
        splitWords(node);
      }
    });
  }

  if (!reduceMotion) {
    /* ---------- Intro timeline ---------- */
    window.__introStarted = true;
    var title = document.querySelector('.hero__title');
    splitWords(title);

    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from(header, { y: -40, opacity: 0, duration: 0.9 })
      .fromTo('.pill', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7 }, '-=0.5')
      .set(title, { opacity: 1 }, '-=0.4')
      .from('.hero__title .word-inner', { yPercent: 115, rotate: 4, duration: 1.1, stagger: 0.07, ease: 'power4.out' }, '-=0.4')
      .fromTo('.hero__lede', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8 }, '-=0.7')
      .fromTo('.hero__trust', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7 }, '-=0.55')
      .fromTo('.hero__cta', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7 }, '-=0.5')
      .fromTo('.hero__form', { opacity: 0, x: 60, rotationY: -14, transformPerspective: 1200 },
        { opacity: 1, x: 0, rotationY: 0, duration: 1.3, ease: 'expo.out', clearProps: 'transform' }, 0.55);

    /* ---------- Hero parallax ---------- */
    gsap.to('.hero__bg img', {
      yPercent: 10, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to('.hero__inner', {
      y: -60, opacity: 0.4, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'center top+=30%', end: 'bottom top', scrub: true }
    });

    /* ---------- Section reveals ---------- */
    gsap.utils.toArray('[data-reveal]').forEach(function (el) {
      gsap.from(el, {
        y: 50, skewY: 2.5, opacity: 0, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });
    gsap.utils.toArray('[data-reveal-group]').forEach(function (group) {
      gsap.from(group.children, {
        y: 40, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out',
        scrollTrigger: { trigger: group, start: 'top 85%', once: true }
      });
    });

    /* ---------- Service cards: clip-path wipe ---------- */
    gsap.utils.toArray('[data-card]').forEach(function (card) {
      var media = card.querySelector('.service-card__media');
      var img = media.querySelector('img');
      var body = card.querySelector('.service-card__body');
      var tlc = gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 85%', once: true } });
      tlc.fromTo(media, { clipPath: 'inset(100% 0% 0% 0% round 18px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.3, ease: 'power4.inOut' })
        .from(img, { scale: 1.35, duration: 1.6, ease: 'power3.out', clearProps: 'transform' }, 0)
        .from(card.querySelector('.service-card__num'), { yPercent: 60, opacity: 0, duration: 0.9 }, 0.6)
        .from(card.querySelector('.round-arrow'), { scale: 0, duration: 0.7, ease: 'back.out(2)', clearProps: 'transform' }, 0.8)
        .from(body.children, { y: 30, opacity: 0, duration: 0.8, stagger: 0.06, ease: 'power3.out' }, 0.4);
    });

    /* ---------- Stat counter + rating chip ---------- */
    var countEl = document.getElementById('stat-count');
    var counter = { v: 0 };
    gsap.to(counter, {
      v: 500, duration: 2.4, ease: 'power2.out',
      scrollTrigger: { trigger: '.stat', start: 'top 80%', once: true },
      onStart: function () { countEl.textContent = '0+'; },
      onUpdate: function () { countEl.textContent = Math.round(counter.v) + '+'; }
    });
    gsap.from('.rating-chip', {
      y: 40, opacity: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: '.stat', start: 'top 70%', once: true }
    });
    gsap.from('.rating-chip .star', {
      scale: 0, rotate: -60, duration: 0.6, stagger: 0.12, ease: 'back.out(3)', delay: 0.4,
      scrollTrigger: { trigger: '.stat', start: 'top 70%', once: true }
    });

    /* ---------- CTA blobs parallax ---------- */
    [['.blob-wrap--a', -120], ['.blob-wrap--b', 140], ['.blob-wrap--c', -60]].forEach(function (p) {
      gsap.to(p[0], {
        y: p[1], ease: 'none',
        scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    /* ---------- Footer wordmark drift ---------- */
    gsap.from('.footer__wordmark', {
      xPercent: -42, ease: 'none',
      scrollTrigger: { trigger: '.site-footer', start: 'top bottom', end: 'bottom bottom', scrub: true }
    });
  }

  /* ---------- Fine-pointer only interactions ---------- */
  if (finePointer && !reduceMotion) {
    // Magnetic buttons
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      var xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.28);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.38);
      });
      el.addEventListener('mouseleave', function () {
        gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' });
      });
    });

    // Form card 3D tilt
    var tilt = document.getElementById('form-tilt');
    var heroEl = document.getElementById('hero');
    if (tilt && window.innerWidth >= 1024) {
      var rxTo = gsap.quickTo(tilt, 'rotationX', { duration: 0.8, ease: 'power3.out' });
      var ryTo = gsap.quickTo(tilt, 'rotationY', { duration: 0.8, ease: 'power3.out' });
      gsap.set(tilt, { transformPerspective: 1200 });
      heroEl.addEventListener('mousemove', function (e) {
        var r = tilt.getBoundingClientRect();
        var nx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
        var ny = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
        ryTo(nx * 12);
        rxTo(-ny * 9);
      });
      heroEl.addEventListener('mouseleave', function () { rxTo(0); ryTo(0); });
    }

    // Custom cursor
    var cursor = document.createElement('div');
    cursor.className = 'cursor';
    cursor.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursor);
    var cxTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3.out' });
    var cyTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3.out' });
    var hoverSel = 'a, button, input, select, label, [data-magnetic]';
    window.addEventListener('mousemove', function (e) {
      cursor.classList.add('is-on');
      cxTo(e.clientX);
      cyTo(e.clientY);
    }, { passive: true });
    document.addEventListener('mouseover', function (e) {
      cursor.classList.toggle('is-hover', !!(e.target.closest && e.target.closest(hoverSel)));
    });
    document.addEventListener('mouseleave', function () { cursor.classList.remove('is-on'); });
  }

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
