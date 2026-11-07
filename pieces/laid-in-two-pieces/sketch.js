// A name laid in two pieces.
const W = 960, H = 480, S = 12;
const P = { W, H, s: S, seam: W * 0.465, seamTilt: 0.06, slip: 0.6, seed: 1023 };
let mask, sections = [], order = [], laid = 0, PER_FRAME = 36;

const STONE = {
  '-1': { ground: [233, 226, 210], ink: [30, 27, 24] },  // crew A: limestone, basalt
  '1':  { ground: [232, 219, 192], ink: [36, 37, 44] }   // crew B: another quarry
};
const GROUT = [128, 120, 106];

function setup() {
  const c = createCanvas(W, H);
  c.parent('canvas-holder');
  pixelDensity(1);
  makeMask();
  const slip = document.getElementById('slip');
  const seam = document.getElementById('seam');
  slip.addEventListener('input', () => { P.slip = slip.value / 100; rebuild(true); });
  seam.addEventListener('input', () => { P.seam = W * seam.value / 100; rebuild(true); });
  document.getElementById('relay').addEventListener('click', () => { P.seed = (P.seed * 7 + 13) % 100000; rebuild(false); });
  P.slip = slip.value / 100; P.seam = W * seam.value / 100;
  rebuild(false);
}

function makeMask() {
  mask = createGraphics(W, H);
  mask.pixelDensity(1);
  mask.background(0);
  mask.noFill(); mask.stroke(255); mask.strokeWeight(S * 1.7);
  mask.rect(S * 2.8, S * 2.8, W - S * 5.6, H - S * 5.6);   // the border band
  mask.strokeWeight(S * 1.25);
  mask.rect(S * 5.4, S * 5.4, W - S * 10.8, H - S * 10.8); // inner fillet, wide enough that no row misses it
  mask.noStroke(); mask.fill(255);
  mask.textFont('Georgia'); mask.textStyle(BOLD); mask.textAlign(CENTER, CENTER);
  mask.textSize(216);
  mask.text('SALVE', W / 2, H / 2 + 14);
  mask.loadPixels();
}

function inside(x, y) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return false;
  return mask.pixels[4 * (y * W + x)] > 128;
}

function rebuild(instant) {
  sections = [LaidLogic.buildSection(P, -1, inside), LaidLogic.buildSection(P, 1, inside)];
  order = [];
  for (const sec of sections) for (const t of sec.tiles) order.push([sec.side, t]);
  laid = instant ? order.length : 0;
  const m = LaidLogic.seamMismatch(sections[1], inside);
  document.getElementById('count').textContent =
    `${order.length} tesserae · ${m.mismatched} of crew B's sit where crew A's drawing disagrees`;
  loop();
}

function clipSide(side) {
  const ctx = drawingContext, y0 = -20, y1 = H + 20;
  const x0 = LaidLogic.seamX(y0, P), x1 = LaidLogic.seamX(y1, P);
  ctx.beginPath();
  if (side < 0) { ctx.moveTo(-20, y0); ctx.lineTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(-20, y1); }
  else { ctx.moveTo(W + 20, y0); ctx.lineTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(W + 20, y1); }
  ctx.closePath();
  ctx.clip();
}

function drawTile(side, t) {
  const pal = STONE[side], base = t.ink ? pal.ink : pal.ground;
  const d = (t.tone - 0.5) * (t.ink ? 18 : 22);
  const h = t.size / 2, q = t.jit;
  push();
  translate(t.x, t.y); rotate(t.rot);
  noStroke();
  fill(base[0] + d, base[1] + d, base[2] + d * 0.9);
  quad(-h + q[0], -h + q[1], h + q[2], -h + q[3], h + q[4], h + q[5], -h + q[6], h + q[7]);
  fill(255, t.ink ? 14 : 30);                       // worn top face catching light
  quad(-h + q[0], -h + q[1], h + q[2], -h + q[3], h * 0.4, -h * 0.35, -h * 0.5, -h * 0.3);
  pop();
}

function draw() {
  background(GROUT[0], GROUT[1], GROUT[2]);
  for (const side of [-1, 1]) {
    drawingContext.save();
    clipSide(side);
    for (let k = 0; k < laid; k++) if (order[k][0] === side) drawTile(side, order[k][1]);
    drawingContext.restore();
  }
  if (laid < order.length) laid = Math.min(order.length, laid + PER_FRAME);
  else noLoop();
}
