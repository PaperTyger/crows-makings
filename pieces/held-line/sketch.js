// Rendering + DOM wiring. All contour/distance/coverage math lives in
// held-line-logic.js (loaded before this file) and is exercised, not
// reimplemented, here.

let W = 640, H = 640;
const COVERAGE_COLS = 40, COVERAGE_ROWS = 40;
const SCRIBBLES_PER_FRAME = 14;

let contour;
let coverageGrid;
let bufferRadius = 26;
let scribbleCount = 0;
let closestEverAllowed = Infinity; // smallest distance any accepted scribble has ever landed at

let bufferSlider, densitySlider, readoutEl, resetBtn;
let scribbleDensity = 14;

function setup() {
    const cnv = createCanvas(W, H);
    cnv.parent('canvasWrap');
    angleMode(RADIANS);
    colorMode(HSB, 360, 100, 100, 1);

    bufferSlider = document.getElementById('bufferSlider');
    densitySlider = document.getElementById('densitySlider');
    readoutEl = document.getElementById('readout');
    resetBtn = document.getElementById('resetBtn');
    bufferSlider.addEventListener('input', () => { bufferRadius = Number(bufferSlider.value); });
    densitySlider.addEventListener('input', () => { scribbleDensity = Number(densitySlider.value); });
    resetBtn.addEventListener('click', resetPiece);
    bufferRadius = Number(bufferSlider.value);
    scribbleDensity = Number(densitySlider.value);

    randomSeed(20260828);
    contour = buildContour(W / 2, H / 2, 150, 205, () => random(), 14, 12);
    resetPiece();
}

function resetPiece() {
    coverageGrid = makeCoverageGrid(COVERAGE_COLS, COVERAGE_ROWS);
    scribbleCount = 0;
    closestEverAllowed = Infinity;
    background(0, 0, 6);
}

function draw() {
    background(0, 0, 6);

    // The held line itself: a small number of calm, confident, never-jittering
    // strokes tracing the contour. Drawn every frame from the same fixed
    // points — nothing here ever moves or degrades.
    noFill();
    stroke(32, 12, 92);
    strokeWeight(2.2);
    beginShape();
    for (const p of contour) vertex(p.x, p.y);
    endShape(CLOSE);

    // Restless scribble field: many short, jittering marks probing the whole
    // canvas every frame. Most land; anything that would land inside
    // bufferRadius of the contour is refused before it is ever drawn.
    for (let i = 0; i < scribbleDensity; i++) {
        const x = random(W), y = random(H);
        const result = tryPlaceScribble(x, y, contour, bufferRadius);
        if (result.accepted) {
            drawScribbleMark(x, y);
            markCoverage(coverageGrid, COVERAGE_COLS, COVERAGE_ROWS, x, y, W, H);
            scribbleCount++;
            if (result.distance < closestEverAllowed) closestEverAllowed = result.distance;
        }
    }

    updateReadout();
}

function drawScribbleMark(x, y) {
    push();
    translate(x, y);
    rotate(random(TWO_PI));
    stroke(0, 0, 70, 0.5);
    strokeWeight(1);
    noFill();
    const s = random(4, 9);
    // a short, frantic double-stroke — hatching, not a tidy dot
    line(-s, random(-2, 2), s, random(-2, 2));
    line(random(-2, 2), -s * 0.7, random(-2, 2), s * 0.7);
    pop();
}

function updateReadout() {
    const coverage = coverageFraction(coverageGrid);
    const closestTxt = closestEverAllowed === Infinity ? '—' : closestEverAllowed.toFixed(1) + 'px';
    readoutEl.innerHTML =
        `buffer <span class="val">${bufferRadius}px</span> around the line<br>` +
        `field coverage <span class="val">${(coverage * 100).toFixed(0)}%</span><br>` +
        `closest a mark has ever landed <span class="val">${closestTxt}</span><br>` +
        `scribbles placed <span class="val">${scribbleCount}</span>`;
}
