// One Wire Over All of Them — Murmur, 2026-10-03.
// Seven cranks turn at Seattle's tidal speeds. One wire runs over every
// moving pulley and under every fixed one; whatever length they leave
// lets the pen block fall. Nothing here knows about water.

const W = 1000, H = 660;
const PX_PER_HOUR = 3;
const PAPER = { x: 44, y: 430, w: 912, h: 200 };
const PEN_ARM = 125;
const BLOCK_R = 20;
const BLOCK_X = 915;

let t = 0;
let nEngaged = 7;
let hoursPerFrame = 0.25;
let paper;
let shiftAcc = 0;
let prevInk = null;

function setup() {
  const c = createCanvas(W, H);
  c.parent('canvas-holder');
  paper = createGraphics(PAPER.w, PAPER.h);
  resetPaper();
  const eng = document.getElementById('engaged');
  eng.addEventListener('input', () => { nEngaged = int(eng.value); });
  const spd = document.getElementById('speed');
  spd.addEventListener('input', () => { hoursPerFrame = float(spd.value) / 60; });
  document.getElementById('again').addEventListener('click', () => { t = 0; resetPaper(); });
}

function resetPaper() {
  paper.background(233, 224, 201);
  paper.noStroke();
  for (let i = 0; i < 1400; i++) paperFibre(random(PAPER.w));
  prevInk = null;
  shiftAcc = 0;
}

function paperFibre(x) {
  paper.stroke(205, 192, 162, random(30, 70));
  paper.strokeWeight(0.6);
  const y = random(PAPER.h), l = random(2, 7), a = random(TWO_PI);
  paper.line(x, y, x + cos(a) * l, y + sin(a) * l);
  paper.noStroke();
}

function advancePaper(dxPx) {
  shiftAcc += dxPx;
  const s = floor(shiftAcc);
  if (s < 1) return 0;
  shiftAcc -= s;
  paper.copy(paper, s, 0, PAPER.w - s, PAPER.h, 0, 0, PAPER.w - s, PAPER.h);
  paper.noStroke();
  paper.fill(233, 224, 201);
  paper.rect(PAPER.w - s, 0, s, PAPER.h);
  for (let i = 0; i < s * 1.6; i++) paperFibre(PAPER.w - random(s));
  return s;
}

function draw() {
  t += hoursPerFrame;
  const shifted = advancePaper(hoursPerFrame * PX_PER_HOUR);

  const blockY = penBlockY(SEATTLE, t, nEngaged);
  const tipY = blockY + PEN_ARM;
  const ink = { x: BLOCK_X - PAPER.x, y: tipY - PAPER.y };
  if (prevInk) {
    prevInk.x -= shifted;
    paper.stroke(58, 40, 28, 225);
    paper.strokeWeight(1.7);
    paper.line(prevInk.x, prevInk.y, ink.x, ink.y);
  }
  prevInk = ink;

  drawRoom();
  drawFrame();
  drawPaper();
  drawWire(blockY);
  SEATTLE.forEach((c, i) => drawCrank(c, i));
  for (let i = 0; i < SEATTLE.length; i++) drawPulley(fixedX(i), GEOM.fixedY, GEOM.pulleyR, false);
  drawPulley(GEOM.guide.x, GEOM.guide.y, GEOM.guide.r, false);
  drawPenBlock(blockY);
  drawReadout();
}

function drawRoom() {
  for (let y = 0; y < H; y += 4) {
    const k = y / H;
    noStroke();
    fill(lerp(30, 18, k), lerp(25, 15, k), lerp(20, 12, k));
    rect(0, y, W, 4);
  }
}

function drawFrame() {
  // upper beam the cranks hang from, lower beam for the fixed pulleys
  noStroke();
  fill(52, 38, 26); rect(20, 22, 900, 26, 3);
  fill(70, 52, 36); rect(20, 22, 900, 6, 3);
  fill(52, 38, 26); rect(20, GEOM.fixedY + 30, 830, 18, 3);
  fill(70, 52, 36); rect(20, GEOM.fixedY + 30, 830, 4, 3);
  // standards: from the upper beam down to each wheel's bearing
  for (let i = 0; i < SEATTLE.length; i++) {
    const x = crankX(i);
    fill(44, 32, 22);
    rect(x - 5, 48, 10, GEOM.crankY - 48);
  }
  // fixed-pulley brackets
  for (let i = 0; i < SEATTLE.length; i++) {
    const x = fixedX(i);
    fill(60, 60, 58);
    rect(x - 3, GEOM.fixedY, 6, 32);
  }
  // the wire's fixed end: a post up from the lower beam with an eye at the top
  fill(60, 60, 58);
  rect(GEOM.anchor.x - 3, GEOM.anchor.y, 6, 32);
  fill(150, 152, 150); circle(GEOM.anchor.x, GEOM.anchor.y, 8);
  fill(30, 26, 22); circle(GEOM.anchor.x, GEOM.anchor.y, 3);
  // guide pulley post and dead-end hook
  fill(60, 60, 58);
  rect(GEOM.guide.x - 3, 48, 6, GEOM.guide.y - 48);
  rect(GEOM.blockTop.x - 3, 48, 6, GEOM.guide.y - 46);
}

function drawPaper() {
  // shadow, sheet, rollers at either end
  noStroke();
  fill(0, 0, 0, 70);
  rect(PAPER.x + 4, PAPER.y + 6, PAPER.w, PAPER.h);
  image(paper, PAPER.x, PAPER.y);
  roller(PAPER.x - 16, PAPER.y - 8, PAPER.h + 16);
  roller(PAPER.x + PAPER.w - 4, PAPER.y - 8, PAPER.h + 16);
}

function roller(x, y, h) {
  const w = 20;
  for (let i = 0; i < w; i++) {
    const k = sin(PI * i / w);
    stroke(70 + 90 * k, 56 + 70 * k, 36 + 40 * k);
    line(x + i, y, x + i, y + h);
  }
  noStroke();
  fill(40, 30, 20);
  rect(x - 2, y - 4, w + 4, 6, 2);
  rect(x - 2, y + h - 2, w + 4, 6, 2);
}

function drawWire(blockY) {
  const pts = wirePath(SEATTLE, t, nEngaged);
  stroke(196, 200, 206);
  strokeWeight(1.3);
  noFill();
  beginShape();
  pts.forEach(p => vertex(p.x, p.y));
  endShape();
  // down from the guide, under the pen block, up to the dead end
  line(GEOM.guide.x + GEOM.guide.r, GEOM.guide.y, BLOCK_X - BLOCK_R, blockY);
  line(BLOCK_X + BLOCK_R, blockY, GEOM.blockTop.x, GEOM.blockTop.y);
}

function drawCrank(c, i) {
  const on = i < nEngaged;
  const x = crankX(i), y = GEOM.crankY;
  const a = radians(crankAngle(c, t, on));
  const r = c.amp * GEOM.pxPerMetre;
  const R = 44;
  const dim = on ? 1 : 0.45;
  // wheel: brass, rim and web
  noStroke();
  fill(120 * dim, 88 * dim, 40 * dim); circle(x, y, R * 2 + 6);
  fill(184 * dim, 140 * dim, 68 * dim); circle(x, y, R * 2);
  fill(150 * dim, 110 * dim, 52 * dim); circle(x, y, R * 2 - 12);
  // spokes turn with the crank
  stroke(196 * dim, 154 * dim, 80 * dim);
  strokeWeight(5);
  for (let k = 0; k < 5; k++) {
    const b = a + k * TWO_PI / 5;
    line(x, y, x + sin(b) * (R - 8), y - cos(b) * (R - 8));
  }
  // gear teeth on the rim, so rotation is visible even on a slow wheel
  stroke(96 * dim, 70 * dim, 32 * dim);
  strokeWeight(2);
  for (let k = 0; k < 36; k++) {
    const b = a + k * TWO_PI / 36;
    line(x + sin(b) * R, y - cos(b) * R, x + sin(b) * (R + 3), y - cos(b) * (R + 3));
  }
  noStroke();
  fill(70 * dim, 52 * dim, 30 * dim); circle(x, y, 12);
  // the pin, at this constituent's throw
  const px = x + sin(a) * r, py = y - cos(a) * r;
  // scotch yoke: a slotted crosshead riding on the pin
  const yy = y + (on ? pinDy(c, t, true) : 0);
  fill(88, 88, 84);
  rect(x - 50, yy - 5, 100, 10, 2);
  fill(30, 26, 22);
  rect(x - 46, yy - 2, 92, 4, 2);
  fill(220 * dim, 210 * dim, 190 * dim); circle(px, yy, 7);
  // rod down to the moving pulley
  const my = y + (on ? pinDy(c, t, true) : 0) + GEOM.rodLen;
  stroke(110, 110, 104); strokeWeight(4);
  line(x, yy + 5, x, my - GEOM.pulleyR - 4);
  // rod guides
  noStroke(); fill(52, 38, 26);
  rect(x - 10, y + 70, 4, 22); rect(x + 6, y + 70, 4, 22);
  drawPulley(x, my, GEOM.pulleyR, true);
  // engraved plate
  fill(42, 32, 22); rect(x - 22, y + 100, 44, 16, 2);
  fill(on ? color(214, 186, 120) : color(110, 96, 70));
  textAlign(CENTER, CENTER); textSize(10); textFont('Georgia');
  text(c.name, x, y + 108);
}

function drawPulley(x, y, r, moving) {
  noStroke();
  if (moving) { fill(110, 110, 104); rect(x - r - 3, y - 3, 2 * r + 6, 6, 2); }
  fill(150, 152, 150); circle(x, y, r * 2);
  fill(96, 98, 98); circle(x, y, r * 2 - 6);
  fill(170, 172, 168); circle(x, y, r * 2 - 10);
  fill(50, 50, 50); circle(x, y, 4);
}

function drawPenBlock(blockY) {
  drawPulley(BLOCK_X, blockY, BLOCK_R, false);
  noStroke();
  // weight and pen arm
  fill(150, 112, 56); rect(BLOCK_X - 8, blockY + BLOCK_R - 2, 16, 34, 3);
  stroke(70, 60, 50); strokeWeight(3);
  line(BLOCK_X, blockY + BLOCK_R + 30, BLOCK_X, blockY + PEN_ARM - 6);
  noStroke(); fill(40, 30, 24);
  triangle(BLOCK_X - 3, blockY + PEN_ARM - 8, BLOCK_X + 3, blockY + PEN_ARM - 8, BLOCK_X, blockY + PEN_ARM);
}

function drawReadout() {
  const day = floor(t / 24), hr = floor(t % 24);
  let h = 0;
  SEATTLE.forEach((c, i) => { if (i < nEngaged) h += c.amp * cos(radians(crankAngle(c, t, true))); });
  noStroke(); fill(200, 180, 140);
  textAlign(RIGHT, CENTER); textSize(11); textFont('Georgia');
  text(`day ${day}, hour ${hr}`, W - 46, H - 14);
  const el = document.getElementById('readout');
  if (el && frameCount % 6 === 0) {
    el.innerHTML = `engaged: ${SEATTLE.slice(0, nEngaged).map(c => c.name).join(' ')}<br>` +
      `the pen says ${h >= 0 ? '+' : ''}${h.toFixed(2)} m`;
  }
}
