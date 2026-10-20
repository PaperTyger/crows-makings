// Which Way It Went: tracks of riderless bicycles on snow, seen from above.
const W = 910, H = 700, PX = 30;           // 30 px per metre; the field is about 30 m x 23 m
let seed = 19, push = 0.6, runs = [];
const pushEl = () => document.getElementById('push');

function setup() {
  pixelDensity(1);
  createCanvas(W, H).parent('canvas-holder');
  pushEl().addEventListener('input', () => { push = parseFloat(pushEl().value); regen(); });
  document.getElementById('reseed').addEventListener('click', () => { seed = Math.floor(Math.random() * 1e9); regen(); });
  push = parseFloat(pushEl().value);
  noLoop();
  regen();
}

function regen() {
  runs = WhichLogic.field(seed, push, 16, W / PX, H / PX);
  const s = WhichLogic.stats(runs);
  document.getElementById('readout').innerHTML =
    `${s.n} pushes. ${s.recovered} straightened out after the shove.<br>` +
    `They rolled ${s.meanDistance.toFixed(0)} m on average, and every one of them fell.`;
  redraw();
}

function snow() {
  const r = WhichLogic.mulberry32(seed ^ 0x51ed);
  background(236, 238, 240);
  noStroke();
  // drift: broad soft value changes, then grain
  for (let i = 0; i < 90; i++) {
    const x = r() * W, y = r() * H, d = 120 + r() * 260;
    for (let k = 0; k < 6; k++) { fill(255, 255, 255, 5); ellipse(x + (r() - .5) * 30, y + (r() - .5) * 30, d * (1 - k / 7), d * 0.45 * (1 - k / 7)); }
  }
  for (let i = 0; i < 26000; i++) {
    const g = r();
    fill(g < 0.5 ? 120 : 255, g < 0.5 ? 130 : 255, g < 0.5 ? 145 : 255, 10 + r() * 22);
    rect(r() * W, r() * H, 1, 1);
  }
}

// A wheel track: a groove, a shadowed lip on one side, a bright lip on the other,
// drawn as many short jittered strokes so it never reads as a plotted line.
function groove(pts, weight, r) {
  for (let pass = 0; pass < 3; pass++) {
    const off = [-2.2, 0, 2.2][pass], col = [[140, 150, 168, 80], [92, 102, 120, 120], [255, 255, 255, 170]][pass];
    stroke(...col);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const nx = -(b[1] - a[1]), ny = b[0] - a[0], nl = Math.hypot(nx, ny) || 1;
      const j = (r() - 0.5) * 0.5;
      strokeWeight(weight * (pass === 1 ? 1 : 0.8) * (0.85 + r() * 0.3));
      line(a[0] * PX + nx / nl * (off + j), a[1] * PX + ny / nl * (off + j),
           b[0] * PX + nx / nl * (off + j), b[1] * PX + ny / nl * (off + j));
    }
  }
}

// Where it went down: snow pushed out sideways from the end of the track,
// in the direction it leaned. Stippled, not outlined.
function fallMark(run, r) {
  const end = run.rear[run.rear.length - 1];
  const h = run.heading, side = run.fallSide;
  const ux = Math.cos(h), uy = Math.sin(h), sx = -uy * side, sy = ux * side;
  noStroke();
  const k = r() * 100;
  // the edge of the ploughed snow wanders along the bike's length
  const edge = a => (0.35 + 0.45 * noise(k + a * 1.3)) * Math.exp(-((a - 0.7) ** 2) / 0.9);
  for (let i = 0; i < 9000; i++) {
    const a = 0.7 + (r() + r() + r() - 1.5) * 1.1;      // metres along, soft at both ends
    const e = edge(a);
    const c = -Math.log(1 - r() * 0.98) * 0.35 * e;     // metres across, toward the lean
    if (c > e * 1.25) continue;
    const lip = c > e;                                  // snow shoved up past the edge
    const x = end[0] * PX + (ux * a + sx * c) * PX, y = end[1] * PX + (uy * a + sy * c) * PX;
    if (lip) fill(255, 255, 255, 40 + r() * 50);
    else fill(104, 114, 132, (8 + r() * 14) * (1 - c / (e + 0.01) * 0.6));
    rect(x, y, 1.5, 1.5);
  }
}

function draw() {
  const r = WhichLogic.mulberry32(seed ^ 0xbeef);
  noiseSeed(seed);
  snow();
  for (const run of runs) {
    groove(run.rear, 1.6, r);
    groove(run.front, 1.1, r);
    if (run.fell) fallMark(run, r);
  }
}
