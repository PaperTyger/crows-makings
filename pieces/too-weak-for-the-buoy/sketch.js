// Renders the field as a lit water surface, one shaded cell per grid point.
const N = 200, CELL = 3;
let atolls, field, t = 0;

function wobble(ang, a) {
  return 2 * (noise(1.6 * Math.cos(ang) + a.y * 0.05, 1.6 * Math.sin(ang) + 3) - 0.5);
}

function setup() {
  const c = createCanvas(N * CELL, N * CELL);
  c.parent('canvas-holder');
  noStroke();
  noiseSeed(1029);
  atolls = BuoyLogic.makeAtolls(N);
  field = new Float32Array(N * N);
  document.getElementById('refl').addEventListener('input', updateReadout);
  updateReadout();
}

function refl() {
  return parseFloat(document.getElementById('refl').value);
}

function updateReadout() {
  document.getElementById('readout').textContent =
    'Reflected swell: ' + Math.round(refl() * 100) + '% of the trade swell.';
}

function draw() {
  const R = refl();
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++)
      field[y * N + x] = BuoyLogic.height(x, y, t, R, atolls)
        + 0.35 * (noise(x * 0.11, y * 0.11, t * 0.03) - 0.5)
        + 0.15 * (noise(x * 0.4, y * 0.4, t * 0.05) - 0.5);

  loadPixels();
  const d = pixelDensity();
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let r, g, b;
      const kind = BuoyLogic.landKind(x, y, atolls, wobble);
      if (kind === 1) {
        const n = noise(x * 0.5, y * 0.5);
        r = 170 + 50 * n; g = 196 + 30 * n; b = 176 + 10 * n;
      } else if (kind === 2) {
        const n = noise(x * 0.2, y * 0.2, t * 0.01);
        r = 40 + 30 * n; g = 150 + 30 * n; b = 150 + 20 * n;
      } else {
        const h = field[y * N + x];
        const hx = field[y * N + Math.min(x + 1, N - 1)] - h;
        const hy = field[Math.min(y + 1, N - 1) * N + x] - h;
        // light from the north-east, low
        const slope = hx * 0.7 - hy * 0.5;
        const l = Math.max(0, Math.min(1, 0.42 + 2.2 * slope + 0.08 * h));
        const glint = Math.max(0, slope - 0.16) * 900;
        r = 10 + 60 * l * l + glint; g = 30 + 95 * l + glint; b = 52 + 110 * l + glint;
      }
      for (let j = 0; j < CELL * d; j++) {
        for (let i = 0; i < CELL * d; i++) {
          const idx = 4 * ((y * CELL * d + j) * width * d + (x * CELL * d + i));
          pixels[idx] = r; pixels[idx + 1] = g; pixels[idx + 2] = b; pixels[idx + 3] = 255;
        }
      }
    }
  }
  updatePixels();
  t += 1;
}
