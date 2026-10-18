// Held Weight — p5 wiring. Logic lives in band-logic.js.
var W = 520, H = 680, CLAMP_Y = 60, CHAINS = 14, SEGS = 26;
var chains = [], bandLen, heatEl, loadEl, readEl;

function setup() {
  var c = createCanvas(W, H);
  c.parent('canvas-holder');
  heatEl = document.getElementById('heat');
  loadEl = document.getElementById('load');
  readEl = document.getElementById('readout');
  for (var k = 0; k < CHAINS; k++) {
    var steps = [];
    for (var i = 0; i < SEGS; i++) steps.push({ x: 0, y: 0 });
    chains.push(steps);
  }
  bandLen = equilibriumLength(load(), temp());
}

function temp() { return Number(heatEl.value); }          // K
function load() { return Number(loadEl.value) / 100; }    // 0..1

function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) * 1.4; }

function draw() {
  var T = temp(), m = load();
  var target = equilibriumLength(m, T);
  bandLen += (target - bandLen) * 0.03;                    // the weight takes its time

  var warmth = constrain(map(T, 263, 373, 0, 1), 0, 1);
  background(lerpColor(color(14, 16, 22), color(30, 16, 12), warmth));

  // heat glow below the band, never a shape of its own
  noStroke();
  for (var r = 0; r < 12; r++) {
    fill(255, 120, 40, 3 + 14 * warmth * (1 - r / 12));
    ellipse(W / 2, CLAMP_Y + bandLen * 0.55, 40 + r * 34, 120 + r * 40);
  }

  // clamp: a dark wooden jaw with two bolts
  fill(52, 40, 30); rect(W / 2 - 90, CLAMP_Y - 34, 180, 30, 3);
  fill(40, 30, 22); rect(W / 2 - 90, CLAMP_Y - 8, 180, 10, 2);
  fill(150, 140, 120); ellipse(W / 2 - 66, CLAMP_Y - 19, 9, 9); ellipse(W / 2 + 66, CLAMP_Y - 19, 9, 9);

  var topY = CLAMP_Y, botY = CLAMP_Y + bandLen;
  var spreadTop = 54, spreadBot = 34 + 10 * m;
  var col = lerpColor(color(190, 150, 95), color(232, 120, 70), warmth);

  noFill();
  for (var k = 0; k < CHAINS; k++) {
    jiggle(chains[k], T, gauss);
    var f = k / (CHAINS - 1) - 0.5;
    var pts = bridge(chains[k], { x: W / 2 + f * spreadTop, y: topY },
                                { x: W / 2 + f * spreadBot, y: botY });
    stroke(red(col), green(col), blue(col), 120 + 60 * (k % 3) / 2);
    strokeWeight(1.6);
    beginShape();
    curveVertex(pts[0].x, pts[0].y);
    for (var i = 0; i < pts.length; i++) curveVertex(pts[i].x, pts[i].y);
    curveVertex(pts[pts.length - 1].x, pts[pts.length - 1].y);
    endShape();
  }

  // the weight: an iron hook and a cast slug, size by load
  var ws = 26 + 46 * sqrt(m);
  stroke(120, 118, 112); strokeWeight(3); noFill();
  arc(W / 2, botY + 8, 16, 16, -HALF_PI, PI);
  line(W / 2, botY + 16, W / 2, botY + 26);
  noStroke();
  fill(58, 58, 60);
  beginShape();
  vertex(W / 2 - ws * 0.42, botY + 26);
  vertex(W / 2 + ws * 0.42, botY + 26);
  vertex(W / 2 + ws * 0.55, botY + 26 + ws * 0.9);
  vertex(W / 2 - ws * 0.55, botY + 26 + ws * 0.9);
  endShape(CLOSE);
  fill(255, 255, 255, 18);
  rect(W / 2 - ws * 0.38, botY + 30, ws * 0.18, ws * 0.78);

  var slope = lengthSlope(m, T), inv = inversionLoad(T);
  readEl.innerHTML =
    (T - 273).toFixed(0) + ' &deg;C, ' + (m < inv ? 'light' : 'heavy') + ' load.<br>' +
    'Warming it now would ' + (slope > 0 ? 'let the weight down' : 'lift the weight') + '.';
}
