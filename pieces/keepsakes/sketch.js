// Keepsakes — drawing and motion. The rule lives in keepsakes-logic.js.
const K = window.Keepsakes;
const W = 820, H = 600, COLS = 8, ROWS = 6, FLY = 80;
let marks, seq, idx, tick, nextAt, seed, rand, leaving;

function setup() {
  const c = createCanvas(W, H);
  c.parent('canvas-holder');
  document.getElementById('again').addEventListener('click', function () { reset(Math.floor(Math.random() * 1e9)); });
  document.getElementById('gifts').addEventListener('input', function () { reset(seed); });
  reset(20261108);
}

function reset(s) {
  seed = s;
  marks = K.makeMarks(seed, COLS, ROWS, W, H);
  seq = K.order(seed, marks.length);
  rand = K.rng(seed * 13 + 5);
  idx = 0; tick = 0; nextAt = 50; leaving = [];
}

function gifts() { return parseInt(document.getElementById('gifts').value, 10); }
function pace() { return 104 - parseInt(document.getElementById('pace').value, 10); }

function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

function drawStroke(s, cx, cy, alpha) {
  const ca = Math.cos(s.a), sa = Math.sin(s.a), h = s.len / 2;
  const x0 = cx - ca * h, y0 = cy - sa * h, x1 = cx + ca * h, y1 = cy + sa * h;
  const mx = cx - sa * s.bend * s.len, my = cy + ca * s.bend * s.len;
  stroke(s.ink[0], s.ink[1], s.ink[2], alpha);
  strokeWeight(s.wt);
  noFill();
  beginShape();
  vertex(x0, y0);
  quadraticVertex(mx, my, x1, y1);
  endShape();
  // a little pooled ink where the nib landed
  noStroke();
  fill(s.ink[0], s.ink[1], s.ink[2], alpha * 0.8);
  circle(x0, y0, s.wt * 1.25);
}

function draw() {
  tick++;
  background(236, 227, 207);

  if (tick >= nextAt && idx < seq.length - 1) {
    const m = marks[seq[idx]];
    const ghost = { x: m.x, y: m.y, strokes: m.strokes.slice(), t0: tick };
    const res = K.depart(marks, m, gifts(), rand, tick);
    ghost.strokes = ghost.strokes.filter(function (s) { return res.given.indexOf(s) < 0; });
    leaving.push(ghost);
    idx++;
    nextAt = tick + pace();
  }

  strokeCap(ROUND);
  for (const m of marks) {
    if (m.gone) continue;
    for (const s of m.strokes) {
      const t = Math.min(1, (tick - s.t0) / FLY);
      const e = ease(t);
      const cx = s.fx + (m.x + s.dx - s.fx) * e;
      const cy = s.fy + (m.y + s.dy - s.fy) * e - Math.sin(Math.PI * t) * 26;
      drawStroke(s, cx, cy, 235);
    }
  }

  leaving = leaving.filter(function (g) { return tick - g.t0 < FLY; });
  for (const g of leaving) {
    const t = (tick - g.t0) / FLY;
    for (const s of g.strokes) drawStroke(s, g.x + s.dx, g.y + s.dy - t * 34, 235 * (1 - t));
  }

  const sum = K.summarise(marks);
  const el = document.getElementById('count');
  if (sum.last) el.textContent = (marks.length - 1) + ' gone. The last one is wearing ' + sum.strokes + ' strokes from ' + sum.hands + (sum.hands === 1 ? ' hand: its own.' : ' hands.');
  else el.textContent = (marks.length - sum.remaining) + ' gone, ' + sum.remaining + ' still here.';
}
