const W = 760, H = 760, N = 140, NEAR = 90;
let moths = [], lamp, canopyEl, readoutEl, trails;

function spawn() {
  const side = random() < 0.5 ? -10 : W + 10;
  return { x: side, y: random(H * 0.03, H * 0.85), s: side < 0 ? 1 : -1,
           th: side < 0 ? random(-0.2, 0.2) : PI + random(-0.2, 0.2) };
}

function setup() {
  const c = createCanvas(W, H);
  c.parent('canvas-holder');
  randomSeed(1027);
  lamp = { x: W * 0.5, y: H * 0.42 };
  for (let i = 0; i < N; i++) {
    const m = spawn();
    m.x = random(W); m.y = random(H * 0.03, H * 0.9);
    moths.push(m);
  }
  canopyEl = document.getElementById('canopy');
  readoutEl = document.getElementById('readout');
  // trails fade on their own layer; the light is drawn fresh each frame
  // so it can't pile up into a plate
  trails = createGraphics(W, H);
  trails.noStroke(); trails.fill(10, 9, 14); trails.rect(0, 0, W, H);
}

function canopy() { return parseFloat(canopyEl.value); }

function glow(cv) {
  const g = drawingContext;
  // point lamp: a soft bloom that shrinks as the light is spread out
  const r = 30 + 160 * (1 - cv);
  let grad = g.createRadialGradient(lamp.x, lamp.y, 0, lamp.x, lamp.y, r);
  grad.addColorStop(0, `rgba(255,236,190,${0.5 * (1 - cv)})`);
  grad.addColorStop(0.25, `rgba(255,236,190,${0.10 * (1 - cv)})`);
  grad.addColorStop(1, 'rgba(255,236,190,0)');
  g.fillStyle = grad; g.fillRect(lamp.x - r, lamp.y - r, 2 * r, 2 * r);
  // canopy: the same light bounced off something wide overhead
  grad = g.createLinearGradient(0, 0, 0, H * 0.5);
  grad.addColorStop(0, `rgba(230,220,200,${0.16 * cv})`);
  grad.addColorStop(1, 'rgba(230,220,200,0)');
  g.fillStyle = grad; g.fillRect(0, 0, W, H * 0.5);
}

function draw() {
  const cv = canopy(), dt = 1 / 60;
  trails.noStroke(); trails.fill(10, 9, 14, 12); trails.rect(0, 0, W, H);
  let near = 0, down = 0;
  for (const m of moths) {
    const px = m.x, py = m.y;
    UP.step(m, lamp, cv, dt, randomGaussian(0, 0.9));
    if (m.y > H + 5 || m.x < -40 || m.x > W + 40 || m.y < -40) {
      if (m.y > H + 5) down++;
      Object.assign(m, spawn());
      continue;
    }
    if (dist(m.x, m.y, lamp.x, lamp.y) < NEAR) near++;
    trails.stroke(m.inverted ? color(205, 172, 150, 190) : color(228, 222, 206, 170));
    trails.strokeWeight(1.2);
    trails.line(px, py, m.x, m.y);
  }
  image(trails, 0, 0);
  glow(cv);
  window.__near = near / N;
  if (frameCount % 10 === 0)
    readoutEl.textContent = `${Math.round(100 * near / N)}% held near the lamp`;
}
