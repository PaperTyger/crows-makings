// Rendering + DOM wiring. All fan/duct math lives in the-label-stays-logic.js
// (loaded before this file) and is exercised, not reimplemented, here.

const W = 760, H = 580;
const PAD = { l: 64, r: 24, t: 28, b: 48 };
const Q_MAX = 190;   // cfm on the x axis
const P_MAX = 0.8;   // in. w.g. on the y axis
const FAN_COUNT = 60;

let fans;
let ductLength = 0, elbows = 0, autoOn = true, autoT = 0;
let lengthSlider, elbowSlider, autoBox, readoutEl;

function qx(q) { return PAD.l + (q / Q_MAX) * (W - PAD.l - PAD.r); }
function py(p) { return H - PAD.b - (p / P_MAX) * (H - PAD.t - PAD.b); }

function setup() {
    const cnv = createCanvas(W, H);
    cnv.parent('canvasWrap');
    colorMode(HSB, 360, 100, 100, 1);
    lengthSlider = document.getElementById('lengthSlider');
    elbowSlider = document.getElementById('elbowSlider');
    autoBox = document.getElementById('autoBox');
    readoutEl = document.getElementById('readout');
    lengthSlider.addEventListener('input', () => { ductLength = Number(lengthSlider.value); autoBox.checked = false; autoOn = false; });
    elbowSlider.addEventListener('input', () => { elbows = Number(elbowSlider.value); });
    autoBox.addEventListener('change', () => { autoOn = autoBox.checked; });
    fans = makeFans(FAN_COUNT, 20260920);
    ductLength = Number(lengthSlider.value);
    elbows = Number(elbowSlider.value);
}

// Ratio -> hue: teal when the fan delivers its label, warming to red as it falls.
function ratioHue(r) {
    const t = constrain((r - 0.35) / (1.05 - 0.35), 0, 1);
    return lerp(8, 188, t);
}

function draw() {
    if (autoOn) {
        autoT += 0.004;
        ductLength = 40 - 40 * Math.cos(autoT * TWO_PI * 0.5); // 0..80 ft, slow breath
        lengthSlider.value = Math.round(ductLength);
    }
    const k = ductK(ductLength, elbows);

    background(228, 22, 6);
    drawAxes();

    // Fan curves: faint, all present the whole time.
    noFill();
    strokeWeight(1);
    for (const f of fans) {
        stroke(215, 30, 70, 0.10);
        beginShape();
        for (let i = 0; i <= 40; i++) {
            const q = (i / 40) * f.qFree;
            vertex(qx(q), py(fanPressure(f, q)));
        }
        endShape();
    }

    // The label line, and each fan's label point on it. These never move.
    stroke(40, 12, 80, 0.5);
    strokeWeight(1);
    drawingContext.setLineDash([3, 5]);
    line(qx(0), py(RATED_P), qx(Q_MAX), py(RATED_P));
    drawingContext.setLineDash([]);

    // System curve.
    stroke(28, 78, 96);
    strokeWeight(2.2);
    noFill();
    beginShape();
    for (let q = 0; q <= Q_MAX; q += 2) {
        const p = k * q * q;
        if (p > P_MAX) break;
        vertex(qx(q), py(p));
    }
    endShape();

    // Threads from label point to operating point, then the points.
    for (const f of fans) {
        const o = operatingPoint(f, k);
        const h = ratioHue(o.ratio);
        stroke(h, 55, 95, 0.32);
        strokeWeight(1);
        line(qx(f.ratedQ), py(RATED_P), qx(o.q), py(o.p));
    }
    for (const f of fans) {
        noFill();
        stroke(40, 10, 88, 0.55);
        strokeWeight(1);
        circle(qx(f.ratedQ), py(RATED_P), 5);
    }
    for (const f of fans) {
        const o = operatingPoint(f, k);
        noStroke();
        fill(ratioHue(o.ratio), 65, 98, 0.95);
        circle(qx(o.q), py(o.p), 6);
    }

    updateReadout(k);
}

function drawAxes() {
    stroke(0, 0, 40, 0.6);
    strokeWeight(1);
    line(PAD.l, H - PAD.b, W - PAD.r, H - PAD.b);
    line(PAD.l, PAD.t, PAD.l, H - PAD.b);
    noStroke();
    fill(0, 0, 60);
    textSize(11);
    textAlign(CENTER, TOP);
    for (let q = 0; q <= Q_MAX; q += 30) text(q, qx(q), H - PAD.b + 6);
    textAlign(RIGHT, CENTER);
    for (let p = 0; p <= P_MAX + 1e-9; p += 0.2) text(p.toFixed(1), PAD.l - 8, py(p));
    textAlign(CENTER, TOP);
    text('airflow, cfm', (PAD.l + W - PAD.r) / 2, H - 18);
    push();
    translate(16, (PAD.t + H - PAD.b) / 2);
    rotate(-HALF_PI);
    textAlign(CENTER, TOP);
    text('static pressure, in. w.g.', 0, 0);
    pop();
    textAlign(LEFT, BOTTOM);
    fill(40, 12, 80);
    text('rated at 0.10 in.', qx(Q_MAX * 0.66), py(RATED_P) - 4);
}

function updateReadout(k) {
    const s = summarize(fans, k);
    readoutEl.innerHTML =
        'duct <span class="val">' + Math.round(ductLength) + ' ft, ' + elbows + ' elbow' + (elbows === 1 ? '' : 's') + '</span><br>' +
        'median installed / label <span class="val">' + s.median.toFixed(2) + '</span><br>' +
        'fans at 80% of label or better <span class="val">' + Math.round(s.atLeast80 * 100) + '%</span>';
}
