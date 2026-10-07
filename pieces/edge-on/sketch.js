// Edge-on — p5 wiring. All the physics is in edge-on-logic.js.
const W = 300, H = 300, N = 420;
let buf, t = 0, az = 0.4;

function setup() {
  const c = createCanvas(600, 600);
  c.parent('canvas-holder');
  pixelDensity(1);
  buf = createImage(W, H);
  frameRate(20);
}

function draw() {
  const tilt = radians(+document.getElementById('tilt').value);
  const strength = +document.getElementById('strength').value / 100;
  const turning = document.getElementById('turn').checked;
  if (turning) az += 0.006;
  t += 0.02;

  const D = EdgeOn.soften(EdgeOn.depth(W, H, N, t, tilt, az, 0.012), W, H, 2);
  buf.loadPixels();
  let sum = 0, peak = 0;
  for (let i = 0; i < W * H; i++) {
    const [r, g, b] = EdgeOn.shade(D[i], strength);
    buf.pixels[4 * i] = r; buf.pixels[4 * i + 1] = g; buf.pixels[4 * i + 2] = b; buf.pixels[4 * i + 3] = 255;
    sum += D[i]; if (D[i] > peak) peak = D[i];
  }
  buf.updatePixels();
  background(EdgeOn.BG[0], EdgeOn.BG[1], EdgeOn.BG[2]);
  image(buf, 0, 0, width, height);

  document.getElementById('readout').innerHTML =
    'veil in the frame (sum of depth): ' + sum.toFixed(0) +
    '<br>deepest point: ' + peak.toFixed(2);
}
