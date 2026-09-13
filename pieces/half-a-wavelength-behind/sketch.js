// Rendering + DOM wiring. All phase/span/savings/amplitude math lives in
// wake-logic.js (loaded before this file) and is exercised, not reimplemented, here.

let cnv;
let W = 640, H = 480;

const FLAP_FREQ = 0.0028; // radians per ms, leader's wingbeat
const WAKE_HISTORY = 260; // how many past leader-wingtip samples to keep for the ribbon

let phaseSliderEl, spanSliderEl, readoutEl;
let phi01 = 0.5;      // 0..1, from the phase slider
let spanBW = 0.88;    // body-widths, from the span slider

let leaderX, leaderY0, followerX;
let wakeHistory = []; // {y} leader wingtip height over time, oldest first

let cumulativeSaved = 0; // running total of instantaneous power-saving fraction, for a felt sense of accumulation

function setup() {
    cnv = createCanvas(W, H);
    cnv.parent('canvasWrap');
    colorMode(HSB, 360, 100, 100, 1);

    leaderX = W * 0.32;
    followerX = W * 0.62;
    leaderY0 = H * 0.42;

    phaseSliderEl = document.getElementById('phaseSlider');
    spanSliderEl = document.getElementById('spanSlider');
    readoutEl = document.getElementById('readout');
    phaseSliderEl.addEventListener('input', updateFromSliders);
    spanSliderEl.addEventListener('input', updateFromSliders);
    updateFromSliders();
}

function updateFromSliders() {
    phi01 = Number(phaseSliderEl.value) / 100;
    spanBW = Number(spanSliderEl.value) / 100; // slider is 0..200 -> 0..2.0
    renderReadout();
}

function renderReadout() {
    const saving = powerSavingFraction(phi01, spanBW);
    const ampScale = amplitudeScale(phi01, spanBW);
    readoutEl.innerHTML =
        `phase <span class="val">${phi01.toFixed(2)}</span> · span <span class="val">${spanBW.toFixed(2)}</span> BW<br>` +
        `instantaneous power saved <span class="val">${(saving * 100).toFixed(1)}%</span><br>` +
        `follower flap amplitude <span class="val">${(ampScale * 100).toFixed(0)}%</span> of solo<br>` +
        `accumulated saved-effort <span class="val">${cumulativeSaved.toFixed(1)}</span> units`;
}

function draw() {
    background(0, 0, 4.5);

    const t = millis();
    const leaderAngle = sin(t * FLAP_FREQ);
    const followerPhaseOffset = phi01 * TWO_PI;
    const ampScale = amplitudeScale(phi01, spanBW);
    const followerAngle = sin(t * FLAP_FREQ + followerPhaseOffset) * ampScale;
    const saving = powerSavingFraction(phi01, spanBW);

    cumulativeSaved += saving * (deltaTime / 1000);

    // leader wingtip height, used both to draw the leader and to seed the wake ribbon
    const leaderWingSpan = 46;
    const leaderTipY = leaderY0 - leaderAngle * leaderWingSpan;

    wakeHistory.push(leaderTipY);
    if (wakeHistory.length > WAKE_HISTORY) wakeHistory.shift();

    // wake ribbon: the leader's own recent wingtip trace, drifting rightward as "downstream"
    noFill();
    const rColor = lerpColor(color(210, 15, 30, 0.5), color(30, 70, 95, 0.85), saving);
    stroke(rColor);
    strokeWeight(2);
    beginShape();
    for (let i = 0; i < wakeHistory.length; i++) {
        const x = leaderX + i * ((followerX + 90 - leaderX) / WAKE_HISTORY);
        vertex(x, wakeHistory[i]);
    }
    endShape();

    // guide: the spanwise offset target zone (visual only, doesn't move the follower's actual y)
    const spanPixels = (spanBW - 0.88) * 60; // how far this run's span sits from the true optimum, in px
    const followerY = leaderY0 + 70 + spanPixels;

    drawBird(leaderX, leaderY0, leaderAngle, 1.0, color(35, 70, 95));
    drawBird(followerX, followerY, followerAngle, 1.0, color(200, 55, 90));

    // effort readout bars, drawn live so the behaviour is visible, not just numeric
    drawEffortBar(30, H - 46, 180, 14, 1 - ampScale, color(200, 55, 90));
    drawEffortBar(30, H - 26, 180, 14, saving, color(30, 70, 95));

    noStroke();
    fill(0, 0, 80);
    textFont('monospace');
    textSize(11);
    text('follower amplitude cut', 220, H - 34);
    text('leader-relative power saved', 220, H - 14);

    renderReadout();
}

function drawBird(x, y, flapAngle, scale, col) {
    push();
    translate(x, y);
    stroke(col);
    strokeWeight(3);
    noFill();
    const wingLen = 40 * scale;
    // left wing
    line(0, 0, -wingLen * cos(flapAngle * 0.6 + 0.5), -wingLen * sin(flapAngle * 0.6 + 0.5) - wingLen * 0.3);
    // right wing
    line(0, 0, wingLen * cos(flapAngle * 0.6 + 0.5), -wingLen * sin(flapAngle * 0.6 + 0.5) - wingLen * 0.3);
    noStroke();
    fill(col);
    circle(0, 0, 10);
    pop();
}

function drawEffortBar(x, y, w, h, frac01, col) {
    noStroke();
    fill(0, 0, 20);
    rect(x, y, w, h, 3);
    fill(col);
    rect(x, y, w * constrain(frac01, 0, 1), h, 3);
}
