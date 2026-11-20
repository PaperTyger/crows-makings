// The Surface Is Still In There — Murmur, 2026-11-19
// Corrosion grows both ways from a silver surface: inward it eats the metal,
// outward it swells, so the object gets bigger as it dies. The engraving
// survives as a buried plane. "x-ray" renders density, as a radiograph does:
// metal shows through crust, grooves show as less metal.

const W = 480, H = 560;
let seed = 1119;
let inside, dIn, dOut, dNuc, lump, pore, grooves;
let yearsEl, xrayEl;

function setup() {
  const c = createCanvas(W, H);
  c.parent('holder');
  pixelDensity(1);
  noLoop();
  yearsEl = document.getElementById('years');
  xrayEl = document.getElementById('xray');
  yearsEl.addEventListener('input', () => redraw());
  xrayEl.addEventListener('input', () => redraw());
  document.getElementById('recast').addEventListener('click', () => { seed = floor(random(1e6)); build(); redraw(); });
  build();
}

// ---- geometry -------------------------------------------------------------
function cupMask() {
  const g = createGraphics(W, H);
  g.pixelDensity(1);
  g.background(0);
  g.noStroke(); g.fill(255);
  const cx = W / 2;
  // bowl: flat rim at y=150, rounded belly
  g.beginShape();
  for (let a = 0; a <= PI; a += PI / 90) g.vertex(cx + cos(a) * 118, 150 + sin(a) * 150);
  g.endShape(CLOSE);
  g.rect(cx - 118, 136, 236, 16, 3);          // lip
  g.rect(cx - 16, 290, 32, 90);               // stem
  g.ellipse(cx, 300, 70, 28);                 // knop under bowl
  g.ellipse(cx, 340, 44, 22);                 // knop on stem
  g.ellipse(cx, 392, 170, 34);                // foot
  g.rect(cx - 85, 392, 170, 14);
  // ears: thick rings on each side, holes punched after
  g.noFill(); g.stroke(255); g.strokeWeight(17);
  g.arc(cx - 128, 205, 76, 104, HALF_PI, PI + HALF_PI);
  g.arc(cx + 128, 205, 76, 104, -HALF_PI, HALF_PI);
  g.loadPixels();
  const m = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) m[i] = g.pixels[i * 4] > 127 ? 1 : 0;
  g.remove();
  return m;
}

function engraving(mask) {
  const g = createGraphics(W, H);
  g.pixelDensity(1);
  g.background(0);
  g.noFill(); g.stroke(255);
  const cx = W / 2;
  // ruled band under the lip
  g.strokeWeight(1.3);
  for (let y = 160; y <= 172; y += 4) g.line(cx - 112, y, cx + 112, y);
  for (let x = cx - 108; x < cx + 108; x += 7) g.line(x, 175, x + 4, 183);
  // vine: one stem wandering across the belly with leaves either side
  randomSeed(seed);
  g.strokeWeight(1.8);
  g.beginShape();
  const pts = [];
  for (let x = cx - 100; x <= cx + 100; x += 4) {
    const y = 228 + sin((x - cx) * 0.045) * 22;
    pts.push([x, y]); g.vertex(x, y);
  }
  g.endShape();
  g.strokeWeight(1.3);
  for (let i = 3; i < pts.length - 2; i += 5) {
    const [x, y] = pts[i];
    const up = (i / 5) % 2 < 1 ? -1 : 1;
    const len = 16 + random(8);
    const ang = up * (0.9 + random(0.4));
    const tx = x + cos(ang) * len * 0.6, ty = y + sin(ang) * len;
    g.bezier(x, y, x + 8, y + up * len * 0.2, tx + 6, ty, tx, ty);
    g.bezier(x, y, x - 4, y + up * len * 0.6, tx - 6, ty, tx, ty);
    g.line(x, y, (x + tx) / 2 + 1, (y + ty) / 2);
  }
  // a small rosette low on the belly
  g.strokeWeight(1.4);
  for (let k = 0; k < 8; k++) {
    const a = k * TWO_PI / 8;
    g.ellipse(cx + cos(a) * 9, 268 + sin(a) * 6, 10, 7);
  }
  g.loadPixels();
  const e = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) e[i] = mask[i] ? g.pixels[i * 4] / 255 : 0;
  g.remove();
  return e;
}

// two-pass chamfer distance to the nearest cell where src==target
function chamfer(src, target) {
  const INF = 1e9, d = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) d[i] = src[i] === target ? 0 : INF;
  const a = 1, b = 1.4142;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + a);
    if (y > 0) {
      v = Math.min(v, d[i - W] + a);
      if (x > 0) v = Math.min(v, d[i - W - 1] + b);
      if (x < W - 1) v = Math.min(v, d[i - W + 1] + b);
    }
    d[i] = v;
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x; let v = d[i];
    if (x < W - 1) v = Math.min(v, d[i + 1] + a);
    if (y < H - 1) {
      v = Math.min(v, d[i + W] + a);
      if (x < W - 1) v = Math.min(v, d[i + W + 1] + b);
      if (x > 0) v = Math.min(v, d[i + W - 1] + b);
    }
    d[i] = v;
  }
  return d;
}

function build() {
  randomSeed(seed); noiseSeed(seed);
  inside = cupMask();
  dIn = chamfer(inside, 0);   // inside cells: distance to the outside
  dOut = chamfer(inside, 1);  // outside cells: distance to the metal
  // corrosion nuclei scattered on the face; blooms spread from them
  const nuc = new Uint8Array(W * H);
  let placed = 0;
  while (placed < 26) {
    const x = floor(random(W)), y = floor(random(H));
    if (inside[y * W + x]) { nuc[y * W + x] = 1; placed++; }
  }
  dNuc = chamfer(nuc, 1);
  lump = new Float32Array(W * H); pore = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    lump[i] = noise(x * 0.018, y * 0.018) * 0.7 + noise(x * 0.06, y * 0.06, 9) * 0.3;
    pore[i] = noise(x * 0.21, y * 0.21, 40);
  }
  grooves = engraving(inside);
}

// ---- per-pixel state: what is physically at this point, at age g -----------
// returns [kind, thickness]: kind 0 air, 1 metal, 2 inner dense layer, 3 outer porous crust
function stateAt(i, g) {
  if (inside[i]) {
    const eaten = g * 14 * (0.6 + lump[i]);          // inward growth from the rim
    const face = Math.min(dIn[i], dNuc[i]) + lump[i] * 26;
    const th = g * 120 - face;                        // crust over the face, toward the viewer
    if (th > 0) return [dIn[i] < eaten ? 4 : 3, th];   // 4: outer crust over an eaten band (front sees crust)
    if (dIn[i] < eaten) return [2, th];
    return [1, th];
  }
  const swell = g * 62 * (0.45 + lump[i] * 1.1);     // outward: the object gets bigger
  if (dOut[i] < swell) return [3, swell - dOut[i]];
  return [0, 0];
}

function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

const PAPER = [217, 213, 205], SILVER = [190, 193, 198], SHADE = [118, 121, 128];
const TARNISH = [104, 86, 96], DENSE = [44, 38, 44], PORE_LO = [72, 64, 70], PORE_HI = [150, 140, 136];
const XDARK = [24, 26, 30], XLIGHT = [232, 236, 240];

function draw() {
  const g = yearsEl.value / 100, xr = xrayEl.value / 100;
  const cx = W / 2;
  loadPixels();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const [kind, th] = stateAt(i, g);
    // --- what the eye sees
    let vis;
    if (kind === 0) vis = PAPER;
    else if (kind === 1) {
      const u = (x - cx) / 130;
      const sheen = 0.5 + 0.4 * Math.cos(u * 1.6 - 0.5) + 0.18 * Math.exp(-Math.pow((u + 0.3) / 0.12, 2)) + (pore[i] - 0.5) * 0.12;
      vis = mix(SHADE, SILVER, Math.max(0, Math.min(1, sheen)));
      vis = mix(vis, SHADE, grooves[i] * 0.85);
      const film = Math.min(1, g * 8);
      if (th > -18) vis = mix(vis, TARNISH, (th + 18) / 18 * 0.7 * film);   // tarnish film ahead of the bloom
    } else if (kind === 2) vis = mix(TARNISH, DENSE, Math.min(1, g * 4));
    else {
      const t = Math.min(1, th / 30);
      // relief: light from upper left, slope taken from the lump field
      const xl = x > 1 ? lump[i - 2] : lump[i], xr2 = x < W - 2 ? lump[i + 2] : lump[i];
      const yu = y > 1 ? lump[i - 2 * W] : lump[i], yd = y < H - 2 ? lump[i + 2 * W] : lump[i];
      const relief = Math.max(-1, Math.min(1, ((xl - xr2) + (yu - yd)) * 9 * t));
      vis = mix(TARNISH, mix(PORE_LO, PORE_HI, 0.35 + lump[i] * 0.5 + relief * 0.35), t);
      if (pore[i] > 0.7 + 0.15 * (1 - t)) vis = mix(vis, DENSE, 0.55);  // pores
    }
    // --- what the radiograph sees: density
    let D;
    if (kind === 0) D = 0;
    else if (kind === 3 && !inside[i]) D = 0.22 + pore[i] * 0.1 - (pore[i] > 0.66 ? 0.1 : 0);
    else if (kind === 2 || kind === 4) D = 0.5;
    else D = 1 - grooves[i] * 0.42 - (kind === 3 ? 0.08 : 0);   // metal under its crust still reads as metal
    if (inside[i] && dIn[i] < 1.5 && g > 0) D = Math.min(D, 0.38);  // the original surface: a thin step in density
    const xc = mix(XDARK, XLIGHT, D);
    const c = mix(vis, xc, xr);
    const p = i * 4;
    pixels[p] = c[0]; pixels[p + 1] = c[1]; pixels[p + 2] = c[2]; pixels[p + 3] = 255;
  }
  updatePixels();
}
