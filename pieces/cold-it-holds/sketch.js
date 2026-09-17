// Rendering + DOM wiring. All mesh/mobility/simulation math lives in
// cold-it-holds-logic.js (loaded before this file) and is exercised, not
// reimplemented, here.

let W = 640, H = 640;
const COLS = 14, ROWS = 14;
const JITTER = 0.28;

let originalSites, sites, edges;
let temperature = 20;   // 0..100, "fraction of melting point" x100-ish
let spacing = 40;       // px between grain sites — small = nanocrystalline
let tempSlider, spacingSlider, readoutEl, resetBtn;

function setup() {
  const cnv = createCanvas(W, H);
  cnv.parent('canvasWrap');
  colorMode(HSB, 360, 100, 100, 1);

  tempSlider = document.getElementById('tempSlider');
  spacingSlider = document.getElementById('spacingSlider');
  readoutEl = document.getElementById('readout');
  resetBtn = document.getElementById('resetBtn');
  tempSlider.addEventListener('input', () => { temperature = Number(tempSlider.value); });
  spacingSlider.addEventListener('input', () => { spacing = Number(spacingSlider.value); rebuildLattice(); });
  resetBtn.addEventListener('click', rebuildLattice);
  temperature = Number(tempSlider.value);
  spacing = Number(spacingSlider.value);

  randomSeed(20260916);
  rebuildLattice();
}

function rebuildLattice() {
  const cols = Math.max(3, Math.floor(W / spacing));
  const rows = Math.max(3, Math.floor(H / spacing));
  const offX = (W - (cols - 1) * spacing) / 2;
  const offY = (H - (rows - 1) * spacing) / 2;
  const built = buildLattice(cols, rows, spacing, JITTER, () => random());
  const shift = (arr) => arr.map(s => ({ ...s, x: s.x + offX, y: s.y + offY }));
  originalSites = shift(built.sites);
  sites = originalSites.map(s => ({ ...s }));
  edges = built.edges;
}

function draw() {
  background(220, 20, 8);

  const mobility = computeMobility(temperature, spacing);
  sites = simulateStep(sites, edges, mobility, 0.9);

  // Boundaries: crisp and dark when rigid, thin and pale when mobile —
  // the line quality itself carries the physics, not a separate label.
  for (const e of edges) {
    const a = sites[e.a], b = sites[e.b];
    const rigidity = 1 - mobility;
    stroke(200, 15, 20 + 55 * rigidity, 0.35 + 0.55 * rigidity);
    strokeWeight(0.6 + 2.2 * rigidity);
    line(a.x, a.y, b.x, b.y);
  }

  // Grain sites themselves, small and steady.
  noStroke();
  fill(40, 60, 85, 0.85);
  for (const s of sites) circle(s.x, s.y, 3.2);

  updateReadout(mobility);
}

function updateReadout(mobility) {
  const drift = totalDisplacement(originalSites, sites);
  const regime = mobility > 0.5 ? (temperature > spacing ? 'hot — sliding' : 'fine-grained — sliding')
                : mobility > 0.05 ? 'transitional'
                : 'cold, coarse — holds';
  readoutEl.innerHTML =
    `temperature <span class="val">${temperature}</span> &nbsp; grain spacing <span class="val">${spacing}px</span><br>` +
    `boundary mobility <span class="val">${mobility.toFixed(2)}</span> — ${regime}<br>` +
    `cumulative drift from rest <span class="val">${drift.toFixed(0)}px</span>`;
}
