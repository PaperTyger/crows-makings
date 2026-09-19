// Rendering + DOM wiring. All decay/touch/stats math lives in
// kept-by-use-logic.js (loaded before this file) and is exercised, not
// reimplemented, here.
//
// Deliberately fixed-dt: draw() advances the simulation by a constant
// 1/60s per call rather than real deltaTime, so `redraw()`-stepping by hand
// (the verification path when the Browser pane is hidden and
// requestAnimationFrame never fires) produces the exact same trajectory as
// watching it run live. Real elapsed time between synchronous redraw()
// calls is near-zero and would otherwise silently freeze the simulation.

let W = 640, H = 640;
const TOUCH_RADIUS = 20;

let marks = [];
let decaySlider, readoutEl, resetBtn;
let diedTotal = 0;
let startedTotal = 0;

function seedAndPopulate(seed) {
  const rnd = makeRng(seed);
  marks = createMarks(70, W, H, rnd);
  startedTotal = marks.length;
  diedTotal = 0;
}

function setup() {
  const cnv = createCanvas(W, H);
  cnv.parent('canvasWrap');
  colorMode(RGB, 255, 255, 255, 1);

  decaySlider = document.getElementById('decaySlider');
  readoutEl = document.getElementById('readout');
  resetBtn = document.getElementById('resetBtn');
  resetBtn.addEventListener('click', () => seedAndPopulate(Date.now() >>> 0));

  seedAndPopulate(20260918);
}

function draw() {
  background(12, 12, 11);

  const decayPerSecond = Number(decaySlider.value) / 100;
  const before = marks.length;
  marks = decayStep(marks, decayPerSecond, 1 / 60);
  diedTotal += (before - marks.length);

  noStroke();
  for (const m of marks) {
    drawMark(m);
  }

  updateReadout();
}

// A mark's color: near-white when never touched, warming toward the accent
// orange as resilience (built by repeated touching) climbs. Size and alpha
// both track strength directly, so a mark about to die reads as faint and
// small, never as a hard cutoff.
function drawMark(m) {
  const t = Math.min(1, (m.resilience - 1) / (RESILIENCE_CAP - 1));
  const r = lerp(245, 217, t), g = lerp(243, 119, t), b = lerp(240, 87, t);
  const alpha = 0.12 + 0.85 * m.strength;
  const size = 3 + 10 * m.strength;

  push();
  translate(m.x, m.y);
  rotate(m.rot);
  fill(r, g, b, alpha);
  noStroke();

  if (m.shape === 'dot') {
    circle(0, 0, size * 0.7);
  } else if (m.shape === 'dash') {
    rectMode(CENTER);
    rect(0, 0, size * 1.6, size * 0.35, size * 0.2);
  } else if (m.shape === 'tail') {
    circle(0, 0, size * 0.55);
    stroke(r, g, b, alpha);
    strokeWeight(size * 0.28);
    noFill();
    beginShape();
    vertex(size * 0.15, size * 0.25);
    quadraticVertex(size * 0.9, size * 0.9, size * 0.5, size * 1.6);
    endShape();
    noStroke();
  } else { // hook
    stroke(r, g, b, alpha);
    strokeWeight(size * 0.28);
    noFill();
    arc(0, 0, size * 1.3, size * 1.3, -PI * 0.6, PI * 0.3);
    noStroke();
  }
  pop();
}

function mousePressed() {
  if (mouseX < 0 || mouseX > W || mouseY < 0 || mouseY > H) return;
  const idx = findMarkNear(marks, mouseX, mouseY, TOUCH_RADIUS);
  if (idx >= 0) marks = touchMark(marks, idx);
}

function updateReadout() {
  const stats = populationStats(marks);
  readoutEl.innerHTML =
    `population <span class="val">${stats.count}</span> / ${startedTotal} started &nbsp; (<span class="val">${diedTotal}</span> lost)<br>` +
    `mean strength <span class="val">${stats.meanStrength.toFixed(2)}</span><br>` +
    `kept at least once: <span class="val">${stats.everTouchedCount}</span> &nbsp; deepest keep: <span class="val">${stats.maxTouches}</span>× `;
}
