// Slow Map — Murmur, 2026-11-25
// Rhizocarpon geographicum, the map lichen. Spores land on bare stone at a rate that rises as
// the rock weathers; each colony grows outward at its own steady pace and stops where it meets
// a neighbour, and the seam between two colonies is black. Over centuries the stone becomes a
// map of territories nobody drew.

const W = 640, H = 440, CELL = 2;
const GW = W / CELL, GH = H / CELL;
const MAX_YEARS = 400;
const MARGIN_YEARS = 5;          // the growing rim is black prothallus

let colonies = [];
let arrival, owner, stone, speck, areole;
let years = 140;

function setup() {
  const c = createCanvas(W, H);
  c.parent('holder');
  pixelDensity(1);
  noLoop();
  const ys = document.getElementById('years');
  years = +ys.value;
  ys.addEventListener('input', e => { years = +e.target.value; redraw(); });
  document.getElementById('recast').addEventListener('click', () => { newStone(); redraw(); });
  newStone();
}

function newStone() {
  const s = Math.floor(Math.random() * 1e9);
  randomSeed(s); noiseSeed(s);

  // spores: a Poisson process whose rate climbs as the surface weathers
  const cands = [];
  let t = 6 + random(8);
  while (t < MAX_YEARS) {
    cands.push({
      x: random(-30, W + 30), y: random(-30, H + 30), born: t,
      rate: random(0.20, 0.32),            // px of radius per year
      tint: random(-1, 1),
      lobe: random(1000), lobeAmp: random(0.08, 0.2),
    });
    const lam = Math.min(0.32, 0.03 + t * 0.0025);
    t += -Math.log(1 - random()) / lam;
  }

  arrival = new Float32Array(GW * GH).fill(Infinity);
  owner = new Int16Array(GW * GH).fill(-1);
  colonies = [];

  // in birth order: a spore that lands on lichen already there does not take
  for (const c of cands) {
    const ci = Math.floor(constrain(c.x, 0, W - 1) / CELL), cj = Math.floor(constrain(c.y, 0, H - 1) / CELL);
    const onStone = c.x >= 0 && c.x < W && c.y >= 0 && c.y < H;
    if (onStone && arrival[cj * GW + ci] <= c.born) continue;
    const id = colonies.length;
    colonies.push(c);
    const reach = (MAX_YEARS - c.born) * c.rate * 1.3;
    const i0 = Math.max(0, Math.floor((c.x - reach) / CELL)), i1 = Math.min(GW - 1, Math.ceil((c.x + reach) / CELL));
    const j0 = Math.max(0, Math.floor((c.y - reach) / CELL)), j1 = Math.min(GH - 1, Math.ceil((c.y + reach) / CELL));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const px = i * CELL + 1, py = j * CELL + 1;
        const dx = px - c.x, dy = py - c.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > reach) continue;
        const th = Math.atan2(dy, dx);
        // lobed thallus: the radius wobbles with angle, and a little with place
        const lobe = 1 + c.lobeAmp * (noise(c.lobe + Math.cos(th) * 1.6, c.lobe + Math.sin(th) * 1.6) - 0.5) * 2
                       + 0.22 * (noise(c.lobe + 7 + Math.cos(th) * 4.5, c.lobe + 7 + Math.sin(th) * 4.5) - 0.5) * 2;
        const rough = 1 + 0.16 * (noise(px * 0.035, py * 0.035, c.lobe) - 0.5) * 2;
        const a = c.born + d / (c.rate * lobe * rough);
        const k = j * GW + i;
        if (a < arrival[k]) { arrival[k] = a; owner[k] = id; }
      }
    }
  }

  // stone and lichen surface textures, fixed per stone
  stone = new Float32Array(GW * GH);
  speck = new Float32Array(GW * GH);
  areole = new Float32Array(GW * GH);
  // areolae: the thallus cracks into small tiles. A jittered grid of tile centres (Worley);
  // a crack is wherever the nearest two centres are nearly equidistant.
  const G = 5, TW = Math.ceil(GW / G) + 2, TH = Math.ceil(GH / G) + 2;
  const tx = new Float32Array(TW * TH), ty = new Float32Array(TW * TH);
  for (let q = 0; q < TW * TH; q++) { tx[q] = random(); ty[q] = random(); }
  for (let j = 0; j < GH; j++) {
    for (let i = 0; i < GW; i++) {
      const k = j * GW + i;
      stone[k] = (noise(i * 0.02, j * 0.02, 50) - 0.5) * 30 + (noise(i * 0.3, j * 0.3, 60) - 0.5) * 22;
      // mineral grains cluster in veins of the granite rather than falling evenly
      const vein = noise(i * 0.05, j * 0.05, 70);
      speck[k] = random() / (0.4 + vein * 1.2);
      const gx = i / G, gy = j / G, cx = Math.floor(gx), cy = Math.floor(gy);
      let f1 = 9, f2 = 9;
      for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) {
        const X = cx + u, Y = cy + v;
        if (X < 0 || Y < 0 || X >= TW || Y >= TH) continue;
        const q = Y * TW + X;
        const ddx = X + tx[q] - gx, ddy = Y + ty[q] - gy;
        const dd = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) f2 = dd;
      }
      areole[k] = f2 - f1;
    }
  }
}

function draw() {
  loadPixels();
  const T = years;
  for (let j = 0; j < GH; j++) {
    for (let i = 0; i < GW; i++) {
      const k = j * GW + i;
      let r, g, b;
      const a = arrival[k];
      if (a > T) {
        // bare granite: grey, with feldspar flecks and mica
        const v = 132 + stone[k];
        r = v; g = v - 2; b = v - 6;
        if (speck[k] < 0.02) { r = g = b = 206; }
        else if (speck[k] > 1.9) { r = 46; g = 44; b = 42; }
      } else {
        const o = owner[k];
        const c = colonies[o];
        const age = T - a;                 // years since lichen reached this spot
        let black = age < MARGIN_YEARS;
        // seams: a neighbour reached and owned by someone else
        if (!black) {
          if (i + 1 < GW && arrival[k + 1] <= T && owner[k + 1] !== o) black = true;
          else if (j + 1 < GH && arrival[k + GW] <= T && owner[k + GW] !== o) black = true;
          else if (i > 0 && arrival[k - 1] <= T && owner[k - 1] !== o) black = true;
          else if (j > 0 && arrival[k - GW] <= T && owner[k - GW] !== o) black = true;
        }
        if (black) {
          r = 26; g = 26; b = 24;
        } else {
          // yellow-green, each colony its own shade, dulling a little with age
          const dull = Math.min(1, age / 260);
          r = 196 + c.tint * 18 - dull * 30;
          g = 200 + c.tint * 4 - dull * 22;
          b = 58 - dull * 4;
          const lit = stone[k] * 0.35;
          r += lit; g += lit; b += lit * 0.5;
          // cracks between areolae
          // young thallus is continuous; the tiles crack apart as it ages
          if (areole[k] < Math.min(0.13, age * 0.0012)) { r *= 0.3; g *= 0.3; b *= 0.3; }
          // apothecia: black fruiting dots, more of them as the patch ages
          else if (speck[k] < Math.min(0.025, age * 0.00015)) { r = 30; g = 30; b = 28; }
        }
      }
      for (let dy = 0; dy < CELL; dy++) {
        for (let dx = 0; dx < CELL; dx++) {
          const p = 4 * ((j * CELL + dy) * W + (i * CELL + dx));
          pixels[p] = r; pixels[p + 1] = g; pixels[p + 2] = b; pixels[p + 3] = 255;
        }
      }
    }
  }
  updatePixels();
}
