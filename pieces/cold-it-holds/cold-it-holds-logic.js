// cold-it-holds-logic.js — pure, DOM-free grain-boundary mesh logic.
// No p5, no window, no DOM. Exported for both the browser sketch and the
// node verify.js test, so the math is checked identically to how it renders.

// Smoothstep, clamped 0..1 between edge0 and edge1.
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Deterministic hash -> [0,1), used to give each edge a stable drift direction
// so sliding reads as coherent shear rather than noise.
function hash01(i) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// Boundary mobility as a function of temperature (0..100, where ~40 is the
// "0.4 of melting point" crossover) and grain spacing in px (small spacing =
// nanocrystalline regime). Two independent weakening mechanisms, taking the
// max — either alone is enough to unlock sliding; the middle (mid temp,
// ordinary spacing) is the one region where boundaries stay strong.
function computeMobility(temperature, spacing) {
  const hot = smoothstep(38, 70, temperature);
  const nano = 1 - smoothstep(9, 16, spacing); // rises as spacing falls below ~16px
  return Math.max(hot, nano);
}

// Build a jittered N x N grid of grain sites plus a simple right/down mesh
// of edges connecting neighbors. Deterministic given a seed function rnd()
// that returns [0,1) (so the browser and node can share the same call shape).
function buildLattice(cols, rows, spacing, jitterFrac, rnd) {
  const sites = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const jx = (rnd() - 0.5) * 2 * jitterFrac * spacing;
      const jy = (rnd() - 0.5) * 2 * jitterFrac * spacing;
      sites.push({ x: c * spacing + jx, y: r * spacing + jy, col: c, row: r });
    }
  }
  const idx = (c, r) => r * cols + c;
  const edges = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols) edges.push({ a: idx(c, r), b: idx(c + 1, r) });
      if (r + 1 < rows) edges.push({ a: idx(c, r), b: idx(c, r + 1) });
    }
  }
  return { sites, edges };
}

// Advance the mesh by one timestep. For each edge whose mobility exceeds a
// small floor, both endpoints drift tangentially along the edge (grain
// boundary sliding) by an amount proportional to mobility * dt. Direction per
// edge is fixed (hash of edge index) so the same boundary always slides the
// same way — coherent shear, not jitter. Mutates and returns a NEW sites
// array; does not mutate the input.
function simulateStep(sites, edges, mobility, dt) {
  const next = sites.map(s => ({ ...s }));
  if (mobility <= 0.02) return next; // frozen: no motion at all, not even small
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    const a = sites[e.a], b = sites[e.b];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const tx = dx / len, ty = dy / len; // unit tangent along the boundary
    const dir = hash01(i) < 0.5 ? 1 : -1;
    const step = mobility * dt * dir;
    next[e.a].x += tx * step;
    next[e.a].y += ty * step;
    next[e.b].x -= tx * step;
    next[e.b].y -= ty * step;
  }
  return next;
}

// Total displacement of every site from its ORIGINAL position (not the
// previous frame) — the cumulative-creep readout. Permanent deformation, the
// way real grain-boundary sliding doesn't spring back when you stop looking.
function totalDisplacement(originalSites, currentSites) {
  let sum = 0;
  for (let i = 0; i < originalSites.length; i++) {
    const dx = currentSites[i].x - originalSites[i].x;
    const dy = currentSites[i].y - originalSites[i].y;
    sum += Math.sqrt(dx * dx + dy * dy);
  }
  return sum;
}

if (typeof module !== 'undefined') {
  module.exports = { smoothstep, hash01, computeMobility, buildLattice, simulateStep, totalDisplacement };
}
