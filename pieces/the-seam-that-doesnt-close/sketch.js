// sketch.js — p5/DOM wiring only. All the actual math lives in
// seam-logic.js (loaded before this file) so it can be tested headlessly.

let rotDeg = 0;
let residualEl, angleEl, slider;
const SPACING = 26;
let RANGE;

function setup() {
  const canvas = createCanvas(560, 420);
  canvas.parent('canvasWrap');
  RANGE = Math.max(width, height) * 0.75;

  angleEl = document.getElementById('angleReadout');
  residualEl = document.getElementById('residualReadout');
  slider = document.getElementById('rotSlider');
  slider.addEventListener('input', () => {
    rotDeg = parseFloat(slider.value);
    redraw();
  });

  noLoop();
}

function draw() {
  background(28, 23, 18);
  translate(width / 2, height / 2);

  const rotRad = radians(rotDeg);

  drawPlaid(rotRad);
  drawBirds(rotRad);

  angleEl.textContent = rotDeg.toFixed(1) + '°';
  const residual = seamResidual(rotRad, RANGE, SPACING);
  residualEl.textContent = residual.toFixed(3);

  // Near-zero (realigned) reads warm; an open seam reads cool and quiet.
  const closeness = constrain(1 - residual / 0.5, 0, 1);
  const col = lerpColor(color(150, 170, 190), color(224, 140, 90), closeness);
  residualEl.style.color = col.toString();
}

function drawPlaid(rotRad) {
  push();
  rotate(rotRad);
  stroke(196, 120, 90, 90);
  strokeWeight(2);
  for (let i = -20; i <= 20; i++) {
    const x = i * SPACING;
    line(x, -RANGE, x, RANGE);
  }
  stroke(120, 150, 150, 70);
  strokeWeight(1);
  for (let j = -20; j <= 20; j++) {
    const y = j * SPACING;
    line(-RANGE, y, RANGE, y);
  }
  pop();
}

function drawBirds(rotRad) {
  // Lattice A never moves — but each bird's own orientation is driven by
  // the same rotation that moves the plaid, so this is one coupled system,
  // not two independent layers happening to share a canvas.
  const pts = latticePoints(0, RANGE, SPACING);
  noStroke();
  fill(20, 16, 12);
  for (let k = 0; k < pts.length; k++) {
    const x = pts[k][0], y = pts[k][1];
    if (Math.abs(x) > width / 2 - 10 || Math.abs(y) > height / 2 - 10) continue;
    push();
    translate(x, y);
    rotate(rotRad);
    drawBird();
    pop();
  }
}

function drawBird() {
  beginShape();
  vertex(-8, 2);
  vertex(0, -3);
  vertex(8, 2);
  vertex(0, 0);
  endShape(CLOSE);
}
