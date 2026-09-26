// What the Damp Took — pure logic, no p5, no DOM. Runnable under Node for verification.
//
// A floor mosaic: two crows facing a vessel inside a rope border. The loss is NOT
// drawn. Damp enters at a few seeded weak points anywhere on the floor, spreads,
// and a tessera lets go when the damp beneath it passes its own seeded grip.
// A tile with fallen neighbours grips less. Nothing aims the loss at anything.

const GW = 72, GH = 44;           // tesserae across, down

// Regions: 0 ground, 1 border dark, 2 border light, 3 crow body, 4 crow eye/beak, 5 vessel, 6 vessel band
function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return function () {                       // mulberry32
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function inEllipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx, dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function inTri(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

// A crow standing, facing +x, in a local frame where the panel is 72x44.
function crowRegion(x, y) {
  if (inEllipse(x, y, 6.6, 3.6, 0.9, 0.9)) return 4;                  // eye
  if (inTri(x, y, 7.6, 2.6, 7.6, 4.6, 11.2, 3.9)) return 4;           // beak
  if (inEllipse(x, y, 6.0, 4.0, 2.6, 2.4)) return 3;                  // head
  if (inEllipse(x, y, 3.0, 9.5, 6.2, 4.4)) return 3;                  // body
  if (inTri(x, y, -2.0, 8.0, -2.0, 12.5, -8.5, 16.5)) return 3;       // tail
  if (x >= 2.0 && x <= 2.9 && y >= 13.5 && y <= 18.5) return 4;       // legs
  if (x >= 4.8 && x <= 5.7 && y >= 13.5 && y <= 18.5) return 4;
  return -1;
}

function designAt(i, j) {
  // rope border: outer 3 tiles, two-tone twist
  const edge = Math.min(i, j, GW - 1 - i, GH - 1 - j);
  if (edge === 0) return 1;
  if (edge <= 2) {
    const along = (i === edge || i === GW - 1 - edge) ? j : i;
    return ((along + edge) % 4 < 2) ? 2 : 1;
  }
  if (edge === 3) return 0;
  const x = i + 0.5, y = j + 0.5;
  // vessel: a krater in the centre
  const cx = GW / 2;
  if (y >= 14 && y <= 15.5 && Math.abs(x - cx) <= 8) return 6;        // rim
  if (y > 15.5 && y <= 17 && Math.abs(x - cx) <= 4) return 5;         // neck
  if (inEllipse(x, y, cx, 23, 7, 6.5) && y > 17) return (y > 21 && y < 22.5) ? 6 : 5;
  if (y > 29 && y <= 31 && Math.abs(x - cx) <= 1.6 + (y - 29)) return 5; // foot
  // left crow faces right; right crow is its mirror
  const L = crowRegion(x - 17, y - 12);
  if (L >= 0) return L;
  const R = crowRegion((GW - x) - 17, y - 12);
  if (R >= 0) return R;
  return 0;
}

function makeState(seed, sources) {
  const rng = makeRng(seed);
  const n = GW * GH;
  const region = new Int8Array(n), grip = new Float32Array(n), tint = new Float32Array(n);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const k = j * GW + i;
    region[k] = designAt(i, j);
    grip[k] = 0.3 + Math.pow(rng(), 1.6) * 2.2;  // each tessera's own adhesion, wide spread so edges fray
    tint[k] = rng();                          // per-tile colour jitter
  }
  // weak points: anywhere on the floor, chosen by the seed alone
  const src = [];
  for (let s = 0; s < sources; s++) {
    src.push({ k: Math.floor(rng() * GH) * GW + Math.floor(rng() * GW), rate: 0.25 + rng() * 0.5 });
  }
  return { seed, region, grip, tint, src, damp: new Float32Array(n), fallen: new Uint8Array(n), fallStep: new Int16Array(n).fill(-1), step: 0, rng };
}

function stepOnce(st) {
  const { damp, fallen, grip, src } = st;
  const next = new Float32Array(damp.length);
  for (const s of src) damp[s.k] += s.rate;
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const k = j * GW + i;
    let sum = 0, c = 0;
    if (i > 0) { sum += damp[k - 1]; c++; }
    if (i < GW - 1) { sum += damp[k + 1]; c++; }
    if (j > 0) { sum += damp[k - GW]; c++; }
    if (j < GH - 1) { sum += damp[k + GW]; c++; }
    // spreading; a gap lets damp in faster
    const openness = fallen[k] ? 0.35 : 0.2;
    next[k] = damp[k] * (1 - openness) + (sum / c) * openness;
    next[k] *= 0.9995;                       // slow drying
  }
  st.damp = next;
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const k = j * GW + i;
    if (fallen[k]) continue;
    let gone = 0;
    if (i > 0 && fallen[k - 1]) gone++;
    if (i < GW - 1 && fallen[k + 1]) gone++;
    if (j > 0 && fallen[k - GW]) gone++;
    if (j < GH - 1 && fallen[k + GW]) gone++;
    const effGrip = grip[k] * (1 - 0.18 * gone);  // an exposed edge holds less
    if (st.damp[k] > effGrip) { fallen[k] = 1; st.fallStep[k] = st.step; }
  }
  st.step++;
}

function simulate(seed, sources, steps) {
  const st = makeState(seed, sources);
  for (let t = 0; t < steps; t++) stepOnce(st);
  return st;
}

// How much of each thing was taken: the damp does not know what a crow is.
function lossReport(st) {
  const names = ['ground', 'border', 'border', 'crows', 'crows', 'vessel', 'vessel'];
  const tot = {}, lost = {};
  for (let k = 0; k < st.region.length; k++) {
    const nm = names[st.region[k]];
    tot[nm] = (tot[nm] || 0) + 1;
    if (st.fallen[k]) lost[nm] = (lost[nm] || 0) + 1;
  }
  const out = {};
  for (const nm of Object.keys(tot)) out[nm] = (lost[nm] || 0) / tot[nm];
  let all = 0; for (let k = 0; k < st.fallen.length; k++) all += st.fallen[k];
  out.all = all / st.fallen.length;
  return out;
}

const DampLogic = { GW, GH, makeRng, designAt, makeState, stepOnce, simulate, lossReport };
if (typeof module !== 'undefined') module.exports = DampLogic;
if (typeof window !== 'undefined') window.DampLogic = DampLogic;
