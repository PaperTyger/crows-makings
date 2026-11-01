// Ignis Fatuus. Lights over a night marsh that brighten at the edge of
// attention and drift off as you close on them. Drain the marsh and they go.

const W = 720, H = 540, HORIZON = 250, MAX_WISPS = 9;
let wisps = [], reeds = [], drain = 0, seeker = { x: W * 0.5, y: H * 0.8 };
let mouseActive = false, t0 = 0;

function setup() {
  const c = createCanvas(W, H);
  c.parent('canvas-holder');
  c.mouseOver(() => { mouseActive = true; });
  c.mouseOut(() => { mouseActive = false; });
  randomSeed(1031); noiseSeed(1031);
  for (let i = 0; i < MAX_WISPS; i++) {
    wisps.push({ x: random(60, W - 60), y: random(HORIZON + 20, H - 110),
                 ph: random(1000), seed: random(1000) });
  }
  for (let i = 0; i < 70; i++) {
    const x = random(W), base = random(HORIZON + 30, H + 10);
    const blades = [];
    for (let b = 0; b < floor(random(3, 8)); b++) {
      blades.push({ dx: random(-6, 6), h: random(25, 80) * map(base, HORIZON, H, 0.45, 1.3),
                    lean: random(-0.35, 0.35) });
    }
    reeds.push({ x, base, blades });
  }
  reeds.sort((a, b) => a.base - b.base);
  const s = document.getElementById('drain');
  s.addEventListener('input', () => { drain = parseFloat(s.value); });
  drain = parseFloat(s.value);
}

function draw() {
  const t = millis() / 1000;
  if (mouseActive) { seeker.x = mouseX; seeker.y = mouseY; }
  else {
    // With nobody steering, a walker crosses the marsh and the lights keep ahead of it.
    seeker.x = W * 0.5 + W * 0.42 * sin(t * 0.07);
    seeker.y = H * 0.72 + 40 * sin(t * 0.11);
  }
  drawSky();
  drawWater(t);
  updateAndDrawWisps(t);
  drawReeds();
  updateReadout();
}

function drawSky() {
  const g = drawingContext.createLinearGradient(0, 0, 0, HORIZON);
  g.addColorStop(0, '#05070c'); g.addColorStop(1, '#141a22');
  drawingContext.fillStyle = g; drawingContext.fillRect(0, 0, W, HORIZON);
  // far treeline, irregular, not a skyline
  // raw context path: p5 caches its fill and would skip resetting it after a gradient
  const ctx = drawingContext;
  ctx.fillStyle = '#06080a';
  ctx.beginPath(); ctx.moveTo(0, HORIZON + 1);
  for (let x = 0; x <= W; x += 6) ctx.lineTo(x, HORIZON - 8 - 22 * noise(x * 0.012, 7) - 8 * noise(x * 0.08, 3));
  ctx.lineTo(W, HORIZON + 1); ctx.closePath(); ctx.fill();
  const m = drawingContext.createLinearGradient(0, HORIZON, 0, H);
  const dry = drain;
  m.addColorStop(0, `rgb(${18 + 14 * dry},${20 + 10 * dry},${18})`);
  m.addColorStop(1, `rgb(${10 + 16 * dry},${12 + 9 * dry},${9})`);
  drawingContext.fillStyle = m; drawingContext.fillRect(0, HORIZON, W, H - HORIZON);
}

function drawWater(t) {
  const th = poolThreshold(drain);
  strokeWeight(1);
  noStroke();
  for (let y = HORIZON + 6; y < H; y += 2) {
    const persp = map(y, HORIZON, H, 0.004, 0.012);
    for (let x = 0; x < W; x += 4) {
      const n = noise(x * persp, y * 0.02, 11);
      if (n > th) {
        // depth into the pool, so edges feather out instead of stopping square
        const edge = min(1, (n - th) * 8);
        const shimmer = 0.6 + 0.4 * noise(x * 0.05, y * 0.3, t * 0.4);
        fill(60, 80, 96, 34 * edge * shimmer);
        rect(x, y, 4, 2);
      }
    }
  }
}

function inWater(x, y) {
  const persp = map(y, HORIZON, H, 0.004, 0.012);
  return noise(x * persp, y * 0.02, 11) > poolThreshold(drain);
}

function updateAndDrawWisps(t) {
  const n = activeCount(MAX_WISPS, drain);
  drawingContext.globalCompositeOperation = 'lighter';
  for (let i = 0; i < wisps.length; i++) {
    const w = wisps[i];
    const wander = 0.35;
    w.x += (noise(w.seed, t * 0.15) - 0.5) * wander * 2;
    w.y += (noise(w.seed + 50, t * 0.15) - 0.5) * wander;
    const f = fleeVector(w.x, w.y, seeker.x, seeker.y, 200, 2.2);
    w.x += f[0]; w.y += f[1];
    if (w.x < -40) w.x = W + 30; if (w.x > W + 40) w.x = -30;
    w.y = constrain(w.y, HORIZON + 15, H - 60);
    if (i >= n) continue;
    const d = dist(w.x, w.y, seeker.x, seeker.y);
    const vis = visibility(d, 50, 260);
    const flick = 0.6 + 0.4 * noise(w.ph, t * 2.3);
    const a = vis * flick;
    if (a < 0.01) continue;
    const depth = map(w.y, HORIZON, H, 0.5, 1.2);
    const lift = 1 + 0.15 * sin(t * 1.7 + w.ph);
    glow(w.x, w.y, 70 * depth, a, lift);
    if (inWater(w.x, w.y + 50 * depth)) reflection(w.x, w.y + 50 * depth, 40 * depth, a * 0.5, t);
  }
  drawingContext.globalCompositeOperation = 'source-over';
}

function glow(x, y, r, a, lift) {
  // a tall, soft-cored flame shape: no hard point, so it can't read as an insect
  const ctx = drawingContext;
  ctx.save();
  ctx.translate(x, y); ctx.scale(0.7, 1.25 * lift);
  const g = ctx.createRadialGradient(0, -r * 0.08, 0, 0, 0, r);
  g.addColorStop(0, `rgba(205,250,225,${0.55 * a})`);
  g.addColorStop(0.18, `rgba(140,225,195,${0.38 * a})`);
  g.addColorStop(0.5, `rgba(70,160,150,${0.12 * a})`);
  g.addColorStop(1, 'rgba(20,60,60,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, 2 * r, 2 * r);
  ctx.restore();
}

function reflection(x, y, r, a, t) {
  // broken horizontal smears, not a mirrored disc
  for (let k = 0; k < 9; k++) {
    const yy = y + k * 3;
    const ww = r * (1 - k / 10) * (0.6 + 0.8 * noise(x * 0.01, k, t));
    const g = drawingContext.createLinearGradient(x - ww, 0, x + ww, 0);
    g.addColorStop(0, 'rgba(120,210,190,0)');
    g.addColorStop(0.5, `rgba(150,230,205,${a * (1 - k / 9)})`);
    g.addColorStop(1, 'rgba(120,210,190,0)');
    drawingContext.fillStyle = g;
    drawingContext.fillRect(x - ww, yy, 2 * ww, 1.5);
  }
}

function drawReeds() {
  noFill();
  for (const r of reeds) {
    const near = map(r.base, HORIZON, H, 0, 1);
    const c = lerpColor(color(24, 34, 24), color(52, 44, 26), drain);
    c.setAlpha(200);
    stroke(c); strokeWeight(0.6 + 1.4 * near);
    for (const b of r.blades) {
      const x0 = r.x + b.dx, y0 = r.base;
      bezier(x0, y0, x0 + b.lean * b.h * 0.2, y0 - b.h * 0.4,
             x0 + b.lean * b.h * 0.6, y0 - b.h * 0.8, x0 + b.lean * b.h, y0 - b.h);
    }
  }
}

function updateReadout() {
  if (frameCount % 15) return;
  const n = activeCount(MAX_WISPS, drain);
  const el = document.getElementById('readout');
  el.textContent = n === 0 ? 'No lights. Nothing left to explain.'
    : n === 1 ? 'One light left on the marsh.' : `${n} lights on the marsh.`;
}
