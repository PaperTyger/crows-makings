// Six rings of ripples, none at the period you see. Click to strike somewhere else.
const SIZE = 720, P = 150, C = 13;
const LOBE = 0.011;
let cx = SIZE * 0.4, cy = SIZE * 0.57;
let radii = {}, fall, grain, img, ctx;
let strikeAt = 0, delta = 0;
const muted = {};
const LUT = 4096, cosL = new Float32Array(LUT), pal = new Uint8ClampedArray(256 * 3);

function buildPalette() {
  const stops = [[0, 7, 5, 4], [0.5, 34, 24, 16], [0.68, 92, 62, 34], [0.86, 206, 158, 86], [1, 252, 238, 196]];
  for (let i = 0; i < 256; i++) {
    const v = i / 255;
    let j = 0;
    while (j < stops.length - 2 && v > stops[j + 1][0]) j++;
    const a = stops[j], b = stops[j + 1], f = (v - a[0]) / (b[0] - a[0]);
    for (let q = 0; q < 3; q++) pal[i * 3 + q] = a[q + 1] + (b[q + 1] - a[q + 1]) * f;
  }
}

// Each partial's rings bend into their own lobes, the way a bell's modes do, so no two layers quite agree.
function strike(x, y) {
  cx = x; cy = y;
  for (const n of PARTIALS) {
    const arr = radii[n] || (radii[n] = new Float32Array(SIZE * SIZE));
    const m = n + 1, ph = (n * 2.399) % (2 * Math.PI);
    let i = 0;
    for (let py = 0; py < SIZE; py++) for (let px = 0; px < SIZE; px++) {
      const dx = px - x, dy = py - y;
      arr[i++] = Math.hypot(dx, dy) * (1 + LOBE * Math.cos(m * Math.atan2(dy, dx) + ph));
    }
  }
  let i = 0;
  for (let py = 0; py < SIZE; py++) for (let px = 0; px < SIZE; px++) {
    fall[i++] = 1 / (1 + Math.hypot(px - x, py - y) / 1100);
  }
  strikeAt = millis() / 1000;
}

function setup() {
  pixelDensity(1);
  const cnv = createCanvas(SIZE, SIZE);
  cnv.parent("canvas-holder");
  ctx = drawingContext;
  img = ctx.createImageData(SIZE, SIZE);
  fall = new Float32Array(SIZE * SIZE);
  grain = new Float32Array(SIZE * SIZE);
  randomSeed(1104);
  for (let i = 0; i < grain.length; i++) grain[i] = random(-0.018, 0.018);
  for (let i = 0; i < LUT; i++) cosL[i] = Math.cos((2 * Math.PI * i) / LUT);
  buildPalette();
  strike(cx, cy);
  cnv.elt.addEventListener("pointerdown", (e) => {
    const box = cnv.elt.getBoundingClientRect(); // the canvas may be scaled down to fit
    strike(((e.clientX - box.left) / box.width) * SIZE, ((e.clientY - box.top) / box.height) * SIZE);
  });
  for (const n of PARTIALS) {
    const b = document.createElement("button");
    b.textContent = n; b.className = "on";
    b.onclick = () => { muted[n] = !muted[n]; b.className = muted[n] ? "" : "on"; };
    document.getElementById("partials").appendChild(b);
  }
  document.getElementById("mistune").oninput = (e) => { delta = e.target.value / 1000; };
}

function renderField(t, since) {
  const live = [];
  let A = 0;
  for (const n of PARTIALS) {
    const a = envelope(n, since, !!muted[n]);
    if (a > 0.004) { live.push([n, a]); A += a; }
  }
  const data = img.data, N = SIZE * SIZE;
  const acc = renderField.acc || (renderField.acc = new Float32Array(N));
  acc.fill(0);
  for (const [n, a] of live) {
    const k = ((n * (1 + (n === 3 ? delta : 0))) / P) * LUT, off = (((n * C) / P) * t % 1) * LUT;
    const arr = radii[n], mask = LUT - 1;
    for (let i = 0; i < N; i++) acc[i] += a * cosL[((k * arr[i] - off) | 0) & mask];
  }
  const norm = 1 / (A + 0.55);
  for (let i = 0; i < N; i++) {
    let v = 0.5 + 0.5 * acc[i] * norm * fall[i] + grain[i];
    v = v < 0 ? 0 : v > 1 ? 1 : v;
    const q = ((v * 255) | 0) * 3, j = i * 4;
    data[j] = pal[q]; data[j + 1] = pal[q + 1]; data[j + 2] = pal[q + 2]; data[j + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function draw() {
  const t = millis() / 1000;
  let since = t - strikeAt;
  if (since > 15) { strikeAt = t; since = 0; } // left alone, it gets struck again
  renderField(t, since);
}

// For checking from outside: the same numbers the screen shows, without the colours.
window.__note = { P, C, muted, setDelta: (d) => { delta = d; }, renderField, strike, get cx() { return cx; }, get cy() { return cy; } };
