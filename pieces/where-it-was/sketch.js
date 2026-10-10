// Where It Was — drawing. The floodplain is a buffer that is never cleared:
// every few steps the channel's position is pressed into it faintly, so the
// ground keeps the scroll of every place the river has been.

let river, plain, oxbows = [], bankSlider, seed = 7;
const W = 900, H = 600, STEPS_PER_FRAME = 4, STAMP_EVERY = 10;
const PAPER = [236, 228, 210], INK = [74, 60, 44], WATER = [96, 116, 120];

function setup() {
  const cnv = createCanvas(W, H);
  cnv.parent('canvas-holder');
  bankSlider = document.getElementById('bank');
  document.getElementById('again').addEventListener('click', () => { seed = (seed * 7919 + 13) >>> 0; begin(); });
  begin();
}

function begin() {
  river = WhereItWas.makeRiver(W, H, seed);
  // let it find its bends before the ground starts keeping records; otherwise
  // the long straight infancy is pressed in hundreds of times as one dark rule
  for (let i = 0; i < 900; i++) WhereItWas.step(river, Number(bankSlider.value) / 100);
  oxbows = [];
  plain = createGraphics(W, H);
  plain.background(PAPER[0], PAPER[1], PAPER[2]);
  // paper tooth, fixed per seed so it doesn't shimmer
  randomSeed(seed);
  plain.noStroke();
  for (let i = 0; i < 9000; i++) {
    plain.fill(INK[0], INK[1], INK[2], random(3, 9));
    plain.rect(random(W), random(H), 1, 1);
  }
}

function polyline(g, pts) {
  g.beginShape();
  for (const p of pts) g.vertex(p.x, p.y);
  g.endShape();
}

function draw() {
  const bank = Number(bankSlider.value) / 100;
  for (let k = 0; k < STEPS_PER_FRAME; k++) {
    const cut = WhereItWas.step(river, bank);
    for (const loop of cut) {
      oxbows.push({ pts: loop, age: 0 });
      // the abandoned loop silts up, but never quite vanishes from the ground
      plain.noFill();
      plain.stroke(WATER[0], WATER[1], WATER[2], 26);
      plain.strokeWeight(7);
      polyline(plain, loop);
    }
    if (river.steps % STAMP_EVERY === 0) {
      plain.noFill();
      plain.stroke(INK[0], INK[1], INK[2], 12);
      plain.strokeWeight(0.8);
      polyline(plain, river.pts);
    }
  }

  image(plain, 0, 0);

  // standing water in recent oxbows, filling with fine sediment
  noFill();
  for (const o of oxbows) {
    o.age += STEPS_PER_FRAME;
    const a = Math.max(0, 150 * (1 - o.age / 900));
    if (a <= 0) continue;
    stroke(WATER[0], WATER[1], WATER[2], a);
    strokeWeight(5 * (1 - o.age / 1400));
    polyline(window, o.pts);
  }
  oxbows = oxbows.filter(o => o.age < 900);

  // the live channel: water between two banks
  stroke(WATER[0], WATER[1], WATER[2], 200);
  strokeWeight(6);
  polyline(window, river.pts);

  document.getElementById('readout').textContent =
    'bends cut off: ' + river.cutoffs + '  ·  length / distance: ' + WhereItWas.sinuosity(river).toFixed(2);
}
