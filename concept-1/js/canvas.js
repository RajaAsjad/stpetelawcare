/* Interactive grass field for the hero — blades sway in a wind field and bend away from the pointer. */
(function () {
  'use strict';

  var canvas = document.getElementById('grass-canvas');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var hero = canvas.closest('.hero') || canvas.parentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Back → front. Back layers are cooler/darker to push them into the distance.
  var PALETTES = [
    ['#17311f', '#1b3824', '#203f27', '#16301f'],
    ['#2f5129', '#365c2e', '#3f6833', '#2c4c27'],
    ['#4f783b', '#5a853f', '#6a9640', '#87b244']
  ];
  var LAYER_SPEC = [
    { share: 0.36, hMin: 0.55, hMax: 1.0,  wMin: 3,  wMax: 5.5, flex: 0.55 },
    { share: 0.36, hMin: 0.42, hMax: 0.85, wMin: 4.5, wMax: 7.5, flex: 0.75 },
    { share: 0.28, hMin: 0.30, hMax: 0.66, wMin: 6,  wMax: 11,  flex: 1.0 }
  ];

  var W = 0, H = 0, dpr = 1, grassH = 0;
  var layers = [];   // layers[l][colorIndex] = [blades]
  var motes = [];
  var lastWidth = -1;
  var running = false, inView = true, pageVisible = !document.hidden;
  var rafId = 0, lastTs = 0, time = 0;
  var pointer = { x: -9999, y: -9999, active: false, vx: 0, lastX: 0 };

  function rand(a, b) { return a + Math.random() * (b - a); }

  function buildBlades() {
    var isMobile = W < 640;
    var total = isMobile ? 170 : W < 1024 ? 320 : Math.min(720, Math.round(W * 0.42));
    layers = LAYER_SPEC.map(function (spec, l) {
      var buckets = PALETTES[l].map(function () { return []; });
      var count = Math.round(total * spec.share);
      for (var i = 0; i < count; i++) {
        var ci = (Math.random() * buckets.length) | 0;
        buckets[ci].push({
          x: rand(-20, W + 20),
          hf: rand(spec.hMin, spec.hMax),
          w: rand(spec.wMin, spec.wMax) * (isMobile ? 0.9 : 1),
          lean: rand(-0.18, 0.18),
          flex: spec.flex * rand(0.8, 1.2),
          k: rand(0.05, 0.09),
          phase: rand(0, Math.PI * 2),
          bend: 0,
          v: 0
        });
      }
      return buckets;
    });
  }

  function buildMotes() {
    var n = W < 640 ? 12 : 30;
    motes = [];
    for (var i = 0; i < n; i++) motes.push(newMote(true));
  }

  function newMote(anywhere) {
    return {
      x: rand(0, W),
      y: anywhere ? rand(H * 0.25, H) : rand(H - grassH * 0.6, H),
      r: rand(0.8, 2.4),
      vy: rand(8, 24),
      sway: rand(10, 28),
      phase: rand(0, Math.PI * 2),
      life: anywhere ? rand(0, 1) : 0,
      span: rand(6, 12)
    };
  }

  function resize() {
    var rect = hero.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    grassH = Math.min(H * 0.45, W < 640 ? 300 : 460);
    if (Math.abs(W - lastWidth) > 40 || !layers.length) {
      buildBlades();
      buildMotes();
      lastWidth = W;
    }
    if (!running) draw(0);
  }

  function wind(x, t) {
    var gust = Math.sin(t * 0.33) * 0.22 + Math.sin(t * 0.71 + 1.3) * 0.1 + 0.12;
    return Math.sin(x * 0.0032 + t * 0.9) * 0.45 + Math.sin(x * 0.011 - t * 1.6) * 0.18 + gust;
  }

  function stepBlades(dt) {
    var R = W < 640 ? 110 : 170;
    var R2 = R * R;
    var damping = Math.pow(0.86, dt * 60);
    var steps = dt * 60;
    for (var l = 0; l < layers.length; l++) {
      var buckets = layers[l];
      for (var c = 0; c < buckets.length; c++) {
        var arr = buckets[c];
        for (var i = 0; i < arr.length; i++) {
          var b = arr[i];
          var h = b.hf * grassH;
          var target = b.lean + wind(b.x, time + b.phase * 0.08) * b.flex * 0.55;
          if (pointer.active) {
            var dx = b.x - pointer.x;
            var dy = (H - h * 0.6) - pointer.y;
            var d2 = dx * dx + dy * dy * 0.4;
            if (d2 < R2) {
              var f = 1 - Math.sqrt(d2) / R;
              target += (dx >= 0 ? 1 : -1) * f * f * 1.35 + pointer.vx * 0.0025 * f;
            }
          }
          b.v += (target - b.bend) * b.k * steps;
          b.v *= damping;
          b.bend += b.v * steps;
          if (b.bend > 1.35) b.bend = 1.35; else if (b.bend < -1.35) b.bend = -1.35;
        }
      }
    }
  }

  function drawBlades() {
    var base = H + 2;
    for (var l = 0; l < layers.length; l++) {
      var buckets = layers[l];
      for (var c = 0; c < buckets.length; c++) {
        var arr = buckets[c];
        ctx.fillStyle = PALETTES[l][c];
        ctx.beginPath();
        for (var i = 0; i < arr.length; i++) {
          var b = arr[i];
          var h = b.hf * grassH;
          var a = b.bend;
          var sa = Math.sin(a), ca = Math.cos(a);
          var tipX = b.x + sa * h;
          var tipY = base - ca * h;
          var cx = b.x + Math.sin(a * 0.45) * h * 0.5;
          var cy = base - Math.cos(a * 0.45) * h * 0.58;
          var hw = b.w * 0.5;
          ctx.moveTo(b.x - hw, base);
          ctx.quadraticCurveTo(cx - hw * 0.55, cy, tipX, tipY);
          ctx.quadraticCurveTo(cx + hw * 0.55, cy, b.x + hw, base);
        }
        ctx.fill();
      }
      if (l === 0) {
        // Haze between the back layer and the rest adds depth.
        var haze = ctx.createLinearGradient(0, H - grassH, 0, H);
        haze.addColorStop(0, 'rgba(11,31,56,0)');
        haze.addColorStop(1, 'rgba(11,31,56,0.35)');
        ctx.fillStyle = haze;
        ctx.fillRect(0, H - grassH, W, grassH);
      }
    }
  }

  function drawMotes(dt) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      if (dt) {
        m.life += dt / m.span;
        m.y -= m.vy * dt;
        if (pointer.active) {
          var dx = m.x - pointer.x, dy = m.y - pointer.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < 14400) { var inv = 1 / Math.sqrt(d2 + 1); m.x += dx * inv * 40 * dt; m.y += dy * inv * 40 * dt; }
        }
        if (m.life >= 1 || m.y < H * 0.12) { motes[i] = newMote(false); continue; }
      }
      var x = m.x + Math.sin(time * 0.8 + m.phase) * m.sway;
      var alpha = Math.sin(Math.PI * Math.min(1, Math.max(0, m.life))) * (0.55 + 0.45 * Math.sin(time * 3 + m.phase));
      if (alpha <= 0.01) continue;
      ctx.fillStyle = 'rgba(249,185,30,' + (alpha * 0.16).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x, m.y, m.r * 4.5, 0, 6.2832);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,224,140,' + (alpha * 0.9).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x, m.y, m.r, 0, 6.2832);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawGround() {
    var g = ctx.createLinearGradient(0, H - grassH * 0.35, 0, H);
    g.addColorStop(0, 'rgba(14,38,26,0)');
    g.addColorStop(1, 'rgba(14,38,26,0.95)');
    ctx.fillStyle = g;
    ctx.fillRect(0, H - grassH * 0.35, W, grassH * 0.35);
  }

  function draw(dt) {
    ctx.clearRect(0, 0, W, H);
    if (dt) stepBlades(dt);
    else if (!running) stepStatic();
    drawGround();
    drawBlades();
    drawMotes(dt);
  }

  // Settle blades into their wind pose for a still frame (reduced motion / first paint).
  function stepStatic() {
    for (var l = 0; l < layers.length; l++) {
      layers[l].forEach(function (arr) {
        arr.forEach(function (b) { b.bend = b.lean + wind(b.x, time + b.phase * 0.08) * b.flex * 0.55; });
      });
    }
  }

  function frame(ts) {
    if (!running) return;
    var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
    lastTs = ts;
    time += dt;
    pointer.vx *= 0.9;
    draw(dt);
    rafId = requestAnimationFrame(frame);
  }

  function updateRunning() {
    var should = !reduceMotion && inView && pageVisible;
    if (should && !running) {
      running = true;
      lastTs = 0;
      rafId = requestAnimationFrame(frame);
    } else if (!should && running) {
      running = false;
      cancelAnimationFrame(rafId);
    }
  }

  function onPointerMove(e) {
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left;
    pointer.vx = pointer.active ? x - pointer.lastX : 0;
    pointer.lastX = x;
    pointer.x = x;
    pointer.y = e.clientY - rect.top;
    pointer.active = true;
  }
  function onPointerLeave() { pointer.active = false; }

  hero.addEventListener('pointermove', onPointerMove, { passive: true });
  hero.addEventListener('pointerdown', onPointerMove, { passive: true });
  hero.addEventListener('pointerleave', onPointerLeave);
  hero.addEventListener('pointercancel', onPointerLeave);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      updateRunning();
    }, { threshold: 0 }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () {
    pageVisible = !document.hidden;
    updateRunning();
  });

  if ('ResizeObserver' in window) {
    new ResizeObserver(resize).observe(hero);
  } else {
    window.addEventListener('resize', resize);
  }

  resize();
  updateRunning();
})();
