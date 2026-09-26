// What the Damp Took — p5 rendering. All behaviour lives in logic.js.
const L = window.DampLogic;
const T = 12;                                  // pixels per tessera
let seed = 20260925, sources = 4, age = 600;
let st = null;

const PAL = [
  [214, 196, 160],  // 0 ground: pale limestone
  [58, 60, 64],     // 1 border dark
  [168, 150, 118],  // 2 border light
  [34, 32, 36],     // 3 crow
  [140, 96, 52],    // 4 eye, beak, legs: ochre
  [150, 84, 58],    // 5 vessel: terracotta
  [60, 58, 62],     // 6 vessel band
];

function rebuild() {
  st = L.simulate(seed, sources, age);
  const r = L.lossReport(st);
  const pct = v => (100 * (v || 0)).toFixed(1) + '%';
  document.getElementById('readout').innerHTML =
    `seed <span class="val">${seed}</span> · ${age} seasons<br>` +
    `floor lost <span class="val">${pct(r.all)}</span><br>` +
    `crows <span class="val">${pct(r.crows)}</span> · vessel <span class="val">${pct(r.vessel)}</span><br>` +
    `border <span class="val">${pct(r.border)}</span> · ground <span class="val">${pct(r.ground)}</span>`;
  redraw();
}

function setup() {
  const c = createCanvas(L.GW * T, L.GH * T);
  c.parent('canvasWrap');
  noLoop();
  const ageS = document.getElementById('ageSlider'), srcS = document.getElementById('srcSlider');
  ageS.addEventListener('input', () => { age = +ageS.value; rebuild(); });
  srcS.addEventListener('input', () => { sources = +srcS.value; rebuild(); });
  document.getElementById('reseed').addEventListener('click', () => {
    seed = Math.floor(Math.random() * 1e9); rebuild();
  });
  rebuild();
}

function draw() {
  background(196, 186, 168);                   // mortar bed
  noStroke();
  const mr = L.makeRng(seed ^ 0x5eed);
  for (let j = 0; j < L.GH; j++) for (let i = 0; i < L.GW; i++) {
    const k = j * L.GW + i, x = i * T, y = j * T;
    if (st.fallen[k]) {
      // bare setting bed: the impression of the tile that was there, and damp staining
      const d = Math.min(1, st.damp[k] / 3);
      fill(188 - 30 * d, 176 - 28 * d, 156 - 22 * d);
      rect(x, y, T, T);
      fill(150 - 20 * d, 140 - 20 * d, 124 - 18 * d, 90);
      rect(x + 2, y + 2, T - 4, T - 4, 1);
      continue;
    }
    const base = PAL[st.region[k]], jt = (st.tint[k] - 0.5) * 22;
    const damp = Math.min(1, st.damp[k] / 2.2);  // wet tiles darken before they go
    const w = 1 - 0.25 * damp;
    fill((base[0] + jt) * w, (base[1] + jt) * w, (base[2] + jt * 0.8) * w);
    const inset = 0.8 + mr() * 0.8;
    rect(x + inset, y + inset, T - 2 * inset, T - 2 * inset, 1.5);
  }
}
