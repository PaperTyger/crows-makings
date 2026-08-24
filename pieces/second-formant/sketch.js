// Second Formant — p5 rendering layer. All signal logic lives in
// formant-logic.js so it can be verified without a browser.

let N_COLS = 900;
let N_ROWS = 420;

let utt = null;
let field = null;
let bandwidth = 1.0;
let seed = 20260822;
let playhead = 0;
let gfx = null;
let stats = { energy: 0, base: 0, recov: 0, err: 0 };

function setup() {
  const holder = document.getElementById('canvas-holder');
  const c = createCanvas(N_COLS, N_ROWS);
  c.parent(holder);
  pixelDensity(1);
  gfx = createGraphics(N_COLS, N_ROWS);
  gfx.pixelDensity(1);
  wireControls();
  regenerate();
}

function wireControls() {
  const bwEl = document.getElementById('bandwidth');
  const seedEl = document.getElementById('seed');
  const newEl = document.getElementById('newUtterance');
  if (bwEl) bwEl.addEventListener('input', (e) => {
    bandwidth = parseFloat(e.target.value);
    recompute();
    redraw();
  });
  if (seedEl) seedEl.addEventListener('input', (e) => {
    seed = parseInt(e.target.value, 10) || 1;
    regenerate();
    redraw();
  });
  if (newEl) newEl.addEventListener('click', () => {
    seed = Math.floor(Math.random() * 1e6);
    const s = document.getElementById('seed');
    if (s) s.value = seed;
    regenerate();
    redraw();
  });
}

function regenerate() {
  utt = makeUtterance(seed, N_COLS);
  const full = renderField(utt, N_ROWS, 1.0);
  stats.base = totalEnergy(full);
  recompute();
}

function recompute() {
  field = renderField(utt, N_ROWS, bandwidth);
  stats.energy = totalEnergy(field);
  const r = contourRecovery(utt, field, N_ROWS, N_ROWS * 0.02);
  stats.recov = r.withinFrac;
  stats.err = r.meanErrRows;
  paintField();
  updateReadout();
}

// Warm spectrogram ramp: deep ground -> ember -> near-white.
function rampColor(v) {
  const t = Math.max(0, Math.min(1, v));
  if (t < 0.32) {
    const u = t / 0.32;
    return [12 + 26 * u, 12 + 20 * u, 14 + 34 * u];
  } else if (t < 0.68) {
    const u = (t - 0.32) / 0.36;
    return [38 + 179 * u, 32 + 87 * u, 48 + 39 * u];
  } else {
    const u = (t - 0.68) / 0.32;
    return [217 + 33 * u, 119 + 130 * u, 87 + 155 * u];
  }
}

function paintField() {
  gfx.loadPixels();
  const px = gfx.pixels;
  for (let r = 0; r < N_ROWS; r++) {
    for (let c = 0; c < N_COLS; c++) {
      const v = field[r * N_COLS + c];
      // Compress so the quiet structure stays visible next to the loud bands.
      const col = rampColor(Math.pow(Math.min(1, v / 1.5), 0.62));
      const i = 4 * (r * N_COLS + c);
      px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2]; px[i + 3] = 255;
    }
  }
  gfx.updatePixels();
}

function draw() {
  background(10, 10, 11);
  image(gfx, 0, 0);

  // The whistle band, marked but not labelled over the field.
  const yTop = (1 - WHISTLE_HI / FIELD_HZ) * (N_ROWS - 1);
  const yBot = (1 - WHISTLE_LO / FIELD_HZ) * (N_ROWS - 1);
  noFill();
  stroke(216, 214, 205, 46);
  strokeWeight(1);
  line(0, yTop, N_COLS, yTop);
  line(0, yBot, N_COLS, yBot);

  // Playhead: the utterance is a thing that happens in time.
  playhead = (playhead + 1.6) % N_COLS;
  const c = Math.floor(playhead);
  stroke(250, 249, 245, 120);
  line(c, 0, c, N_ROWS);

  // Brighten the column being sounded.
  noStroke();
  for (let r = 0; r < N_ROWS; r += 1) {
    const v = field[r * N_COLS + c];
    if (v > 0.12) {
      const col = rampColor(Math.min(1, v / 1.1));
      fill(col[0], col[1], col[2], 190);
      rect(c - 1, r, 3, 1);
    }
  }
}

function updateReadout() {
  const set = (id, txt) => { const e = document.getElementById(id); if (e) e.textContent = txt; };
  const pctEnergy = stats.base > 0 ? (100 * stats.energy / stats.base) : 100;
  set('r-bandwidth', bandwidth.toFixed(2));
  set('r-energy', pctEnergy.toFixed(1) + '%');
  set('r-recov', (100 * stats.recov).toFixed(1) + '%');
  set('r-err', stats.err.toFixed(2) + ' rows');
  const g = componentGains(bandwidth);
  const live = [];
  live.push('F2');
  if (g.f1 > 0) live.push('F1');
  if (g.f3 > 0) live.push('F3');
  if (g.harmonics > 0) live.push('harmonics');
  if (g.noise > 0) live.push('noise');
  set('r-components', live.join(' · '));
}
