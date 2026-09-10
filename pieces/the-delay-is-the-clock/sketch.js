// Rendering + DOM wiring. The oscillator math lives in delay-clock-logic.js
// (loaded before this file) and is exercised, not reimplemented, here.

// Aliased, not destructured under the same names: delay-clock-logic.js
// declares these as top-level `function` statements, which share the page's
// global scope with every other classic <script> tag. A `const` binding of
// the identical name here is a redeclaration of that global and is a
// SyntaxError, not a shadow — it aborted this script entirely until caught.
const { makeState: mkState, stepState: stepClock, measurePeriod: measPeriod } = window.DelayClockLogic;

let W = 640, H = 560;
const HISTORY_W = 600, HISTORY_H = 140, HISTORY_X = 20, HISTORY_Y = H - HISTORY_H - 20;
const RING_CX = W / 2, RING_CY = (H - HISTORY_H - 40) / 2 + 20;

let state;
let delayFrames = 60;
let delaySlider, readoutEl, resetBtn;
let trailA = [], trailR = [];
const TRAIL_MAX = HISTORY_W;

function setup() {
    const cnv = createCanvas(W, H);
    cnv.parent('canvasWrap');
    colorMode(HSB, 360, 100, 100, 1);

    delaySlider = document.getElementById('delaySlider');
    readoutEl = document.getElementById('readout');
    resetBtn = document.getElementById('resetBtn');
    delaySlider.addEventListener('input', () => {
        delayFrames = Number(delaySlider.value);
        resetPiece();
    });
    resetBtn.addEventListener('click', resetPiece);
    delayFrames = Number(delaySlider.value);

    resetPiece();

    // Exposed for headless verification — the Browser pane cannot dispatch a
    // real slider drag to an unattended session, so this performs the exact
    // change a drag does.
    window.setDelay = (v) => { delayFrames = v; delaySlider.value = v; resetPiece(); };
    window.stepN = (n) => { for (let i = 0; i < n; i++) advance(); };
    window.getState = () => ({
        A: state.A, R: state.R, t: state.t, delayFrames,
        period: measPeriod(state.logA),
        ampA: Math.max(...state.logA, 0) - Math.min(...state.logA, 0)
    });
}

function resetPiece() {
    state = mkState(delayFrames);
    trailA = [];
    trailR = [];
}

function advance() {
    state = stepClock(state);
    trailA.push(state.A);
    trailR.push(state.R);
    if (trailA.length > TRAIL_MAX) { trailA.shift(); trailR.shift(); }
}

function draw() {
    background(230, 25, 6);
    advance();

    // Two nested rings: A (inner, warm) and R (outer, cool) — radius and
    // brightness both driven by the live value, so the pulse is legible even
    // without reading the trail beneath.
    noStroke();
    const aR = 30 + state.A * 90;
    const rR = 90 + state.R * 90;
    fill(200, 45, 25 + state.R * 55, 0.55);
    circle(RING_CX, RING_CY, rR * 2);
    fill(28, 70, 40 + state.A * 55);
    circle(RING_CX, RING_CY, aR * 2);

    // Scrolling history strip: A in warm, R in cool, same axes, so the
    // period and the phase lag between them are both directly visible.
    noFill();
    stroke(0, 0, 40, 0.4);
    strokeWeight(1);
    rect(HISTORY_X, HISTORY_Y, HISTORY_W, HISTORY_H);
    drawTrail(trailR, color(200, 70, 75), 0.9);
    drawTrail(trailA, color(28, 85, 90), 1.0);

    updateReadout();
}

function drawTrail(arr, col, alpha) {
    if (arr.length < 2) return;
    stroke(col);
    strokeAlpha(alpha);
    strokeWeight(2);
    noFill();
    beginShape();
    for (let i = 0; i < arr.length; i++) {
        const x = HISTORY_X + (HISTORY_W - arr.length) + i;
        const y = HISTORY_Y + HISTORY_H - Math.min(1, arr[i]) * (HISTORY_H - 6) - 3;
        vertex(x, y);
    }
    endShape();
}

// p5's stroke() with an HSB p5.Color object already carries alpha if set at
// creation; this small helper just re-applies it cheaply per-call.
function strokeAlpha(a) {
    const c = drawingContext.strokeStyle;
    drawingContext.globalAlpha = a;
}

function updateReadout() {
    const period = measPeriod(state.logA);
    readoutEl.innerHTML =
        `delay <span class="val">${delayFrames}</span> ticks<br>` +
        `measured period <span class="val">${period ? period.toFixed(0) : '—'}</span> ticks<br>` +
        `A <span class="val">${state.A.toFixed(3)}</span> &nbsp; R <span class="val">${state.R.toFixed(3)}</span><br>` +
        `t <span class="val">${state.t}</span>`;
}
