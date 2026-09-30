/* Hero canvas: sunlight rays + sprinkler water droplets (cursor acts as a sprinkler head) */
(function () {
  'use strict';

  var canvas = document.getElementById('hero-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var host = canvas.parentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0, dpr = 1, small = false;
  var GRAVITY = 900;
  var maxDrops = 420;
  var drops = [];
  var emitters = [];
  var time = 0, last = 0, raf = 0, frames = 0;
  var inView = true, pageVisible = !document.hidden, running = false;
  var pointer = { x: 0, y: 0, px: 0, py: 0, active: false, lastMove: 0 };

  // Pre-rendered glint sprite
  var sprite = document.createElement('canvas');
  sprite.width = sprite.height = 32;
  (function () {
    var s = sprite.getContext('2d');
    var g = s.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(220,245,200,0.9)');
    g.addColorStop(0.6, 'rgba(122,193,69,0.28)');
    g.addColorStop(1, 'rgba(122,193,69,0)');
    s.fillStyle = g;
    s.fillRect(0, 0, 32, 32);
  })();

  function rand(a, b) { return a + Math.random() * (b - a); }

  function resize() {
    var r = host.getBoundingClientRect();
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    small = W < 768;
    dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    maxDrops = small ? 150 : 420;

    emitters = small
      ? [{ x: W * 0.12, base: -1.2, sweep: 0.45, phase: 0, rate: 9 },
         { x: W * 0.9, base: -1.95, sweep: 0.45, phase: 2, rate: 9 }]
      : [{ x: W * 0.05, base: -1.15, sweep: 0.5, phase: 0, rate: 26 },
         { x: W * 0.44, base: -1.57, sweep: 0.75, phase: 1.3, rate: 22 },
         { x: W * 0.97, base: -2.0, sweep: 0.5, phase: 2.6, rate: 26 }];
    emitters.forEach(function (e) { e.acc = 0; });
    autoHead.on = small || !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!running) drawStatic();
  }

  function spawn(x, y, vx, vy, size, life, kind) {
    if (drops.length >= maxDrops) {
      if (kind !== 'splash') drops.shift(); else return;
    }
    drops.push({
      x: x, y: y, vx: vx, vy: vy,
      size: size, life: life, max: life,
      kind: kind,
      ground: H * rand(0.8, 0.99),
      tw: Math.random() * 6.28
    });
  }

  function emitSprinklers(dt) {
    var reach = Math.sqrt(2 * GRAVITY * H * 0.42);
    for (var i = 0; i < emitters.length; i++) {
      var e = emitters[i];
      e.acc += e.rate * dt;
      var angle = e.base + Math.sin(time * 0.7 + e.phase) * e.sweep;
      while (e.acc >= 1) {
        e.acc -= 1;
        var a = angle + rand(-0.07, 0.07);
        var sp = reach * rand(0.7, 1);
        spawn(e.x + rand(-3, 3), H + 2, Math.cos(a) * sp, Math.sin(a) * sp, rand(1, 2.1), rand(2.2, 3), 'arc');
      }
    }
  }

  function emitPointer(x, y, dx, dy) {
    var dist = Math.sqrt(dx * dx + dy * dy);
    var n = Math.min(small ? 4 : 7, 1 + Math.floor(dist / 7));
    for (var i = 0; i < n; i++) {
      var t = i / n;
      spawn(
        x - dx * t + rand(-4, 4),
        y - dy * t + rand(-4, 4),
        dx * 12 + rand(-140, 140),
        dy * 8 + rand(-320, -60),
        rand(1.1, 2.6),
        rand(1.2, 2),
        'mouse'
      );
    }
  }

  function burst(x, y) {
    var n = small ? 16 : 30;
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + rand(-1.3, 1.3);
      var sp = rand(180, 480);
      spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, rand(1.2, 2.8), rand(1.2, 2), 'mouse');
    }
  }

  function splash(d) {
    var n = small ? 2 : 4;
    for (var i = 0; i < n; i++) {
      spawn(d.x, d.ground, rand(-90, 90) + d.vx * 0.08, rand(-190, -70), rand(0.6, 1.2), rand(0.3, 0.5), 'splash');
    }
  }

  // Touch / small screens: a drifting sprinkler head stands in for the cursor
  var autoHead = { on: false, acc: 0, px: 0, py: 0 };
  function updateAutoHead(dt) {
    if (!autoHead.on || performance.now() - pointer.lastMove < 2500) return;
    var zoneH = Math.min(H, window.innerHeight) * 0.7;
    var x = W * (0.5 + 0.38 * Math.sin(time * 0.45));
    var y = zoneH * (0.45 + 0.3 * Math.sin(time * 0.8 + 1));
    autoHead.acc += dt * 24;
    if (autoHead.acc >= 1) {
      autoHead.acc = 0;
      emitPointer(x, y, x - autoHead.px, y - autoHead.py);
    }
    autoHead.px = x; autoHead.py = y;
  }

  function update(dt) {
    emitSprinklers(dt);
    updateAutoHead(dt);
    for (var i = drops.length - 1; i >= 0; i--) {
      var d = drops[i];
      d.vy += GRAVITY * dt;
      d.vx *= 0.995;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.life -= dt;
      var landed = d.vy > 0 && d.y >= d.ground && d.kind !== 'splash';
      if (landed) splash(d);
      if (landed || d.life <= 0 || d.x < -40 || d.x > W + 40 || d.y > H + 40) {
        drops.splice(i, 1);
      }
    }
  }

  function drawRays() {
    var ox = W + 40, oy = -60;
    var len = Math.sqrt(W * W + H * H) * 1.15;

    // sun glow
    var glowR = Math.max(W, H) * 0.55;
    var glow = ctx.createRadialGradient(ox - 40, oy + 40, 0, ox - 40, oy + 40, glowR);
    glow.addColorStop(0, 'rgba(255,180,90,0.5)');
    glow.addColorStop(0.35, 'rgba(241,106,36,0.16)');
    glow.addColorStop(1, 'rgba(241,106,36,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    var grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, len);
    grad.addColorStop(0, 'rgba(255,196,120,0.32)');
    grad.addColorStop(0.45, 'rgba(241,106,36,0.10)');
    grad.addColorStop(1, 'rgba(241,106,36,0)');

    var sets = [
      { n: 16, speed: 0.035, width: 0.055, alpha: 1 },
      { n: 11, speed: -0.022, width: 0.03, alpha: 0.7 }
    ];
    for (var s = 0; s < sets.length; s++) {
      var set = sets[s];
      ctx.globalAlpha = set.alpha;
      ctx.beginPath();
      for (var i = 0; i < set.n; i++) {
        var a = (i / set.n) * Math.PI * 2 + time * set.speed;
        var hw = set.width * (0.7 + 0.3 * Math.sin(time * 0.6 + i * 1.7));
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + Math.cos(a - hw) * len, oy + Math.sin(a - hw) * len);
        ctx.lineTo(ox + Math.cos(a + hw) * len, oy + Math.sin(a + hw) * len);
        ctx.closePath();
      }
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawDrops() {
    ctx.lineCap = 'round';
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      var a = Math.min(1, d.life / (d.max * 0.35));
      if (d.kind === 'arc') a *= 0.75;
      if (a <= 0) continue;

      // streak along velocity
      var tail = d.kind === 'splash' ? 0.012 : 0.022;
      ctx.strokeStyle = 'rgba(210,240,190,' + (a * 0.55).toFixed(3) + ')';
      ctx.lineWidth = d.size;
      ctx.beginPath();
      ctx.moveTo(d.x - d.vx * tail, d.y - d.vy * tail);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();

      // glint head
      var gs = d.size * 4.2;
      ctx.globalAlpha = a;
      ctx.drawImage(sprite, d.x - gs / 2, d.y - gs / 2, gs, gs);

      // sparkle: sun catching the droplet
      var tw = Math.sin(time * 9 + d.tw);
      if (tw > 0.93 && d.kind !== 'splash') {
        var k = (tw - 0.93) / 0.07;
        var r = d.size * 5 * k + 2;
        ctx.strokeStyle = 'rgba(255,250,225,' + (a * k).toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(d.x - r, d.y); ctx.lineTo(d.x + r, d.y);
        ctx.moveTo(d.x, d.y - r); ctx.lineTo(d.x, d.y + r);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    drawRays();
    ctx.globalCompositeOperation = 'source-over';
    drawDrops();
  }

  function drawStatic() { render(); }

  function frame(ts) {
    if (!running) return;
    if (!last) last = ts;
    var dt = Math.min((ts - last) / 1000, 0.05);
    last = ts;
    time += dt;
    update(dt);
    render();
    frames++;
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduced) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }
  function sync() { (inView && pageVisible) ? start() : stop(); }

  // Pointer = sprinkler head
  function localPoint(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  host.addEventListener('pointermove', function (e) {
    if (reduced) return;
    var p = localPoint(e);
    if (!pointer.active) { pointer.px = p.x; pointer.py = p.y; pointer.active = true; }
    pointer.lastMove = performance.now();
    var dx = p.x - pointer.px, dy = p.y - pointer.py;
    if (dx * dx + dy * dy > 4) {
      emitPointer(p.x, p.y, dx, dy);
      pointer.px = p.x; pointer.py = p.y;
    }
  }, { passive: true });
  host.addEventListener('pointerleave', function () { pointer.active = false; }, { passive: true });
  host.addEventListener('pointerdown', function (e) {
    if (reduced || e.target.closest('input, select, button, a, label')) return;
    var p = localPoint(e);
    burst(p.x, p.y);
  }, { passive: true });

  // Lifecycle
  if ('ResizeObserver' in window) {
    new ResizeObserver(resize).observe(host);
  } else {
    window.addEventListener('resize', resize);
  }
  resize();

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      sync();
    }, { threshold: 0 }).observe(host);
  }
  document.addEventListener('visibilitychange', function () {
    pageVisible = !document.hidden;
    sync();
  });

  if (reduced) { drawStatic(); } else { sync(); }

  window.__heroCanvas = {
    get frames() { return frames; },
    get particles() { return drops.length; },
    get running() { return running; }
  };
})();
