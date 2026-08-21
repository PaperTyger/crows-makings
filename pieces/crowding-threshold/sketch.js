// Rendering + DOM wiring. All grid/acceptance/visibility math lives in
// crowding-logic.js (loaded before this file) and is exercised, not
// reimplemented, here.

let W = 640, H = 640;
const CELL = 20;
const COLS = W / CELL, ROWS = H / CELL;
const VISIBILITY_FLOOR = 2; // a base mark's cell may absorb this many annotations and still count "legible"
const PLACEMENTS_PER_FRAME = 5;

let grid;
let pg; // persistent annotation layer — never cleared except on reset, so marks accrete
let baseMarks = [];      // {x, y, angle, len}
let baseMarkIndices = []; // cell index for each base mark, parallel array

let threshold = 2;
let annotationCount = 0;

let sliderEl, readoutEl, resetBtn;

function setup() {
    const cnv = createCanvas(W, H);
    cnv.parent('canvasWrap');
    angleMode(RADIANS);
    colorMode(HSB, 360, 100, 100, 1);

    sliderEl = document.getElementById('thresholdSlider');
    readoutEl = document.getElementById('readout');
    resetBtn = document.getElementById('resetBtn');
    sliderEl.addEventListener('input', () => { threshold = Number(sliderEl.value); });
    resetBtn.addEventListener('click', resetPiece);
    threshold = Number(sliderEl.value);

    buildBaseMarks();
    resetPiece();
}

function buildBaseMarks() {
    // A loose grid of manuscript "lines," jittered, like calligraphic strokes.
    baseMarks = [];
    const marginX = 60, marginY = 70;
    const rows = 11, perRow = 13;
    const rowSpacing = (H - marginY * 2) / (rows - 1);
    const colSpacing = (W - marginX * 2) / (perRow - 1);
    randomSeed(20260820);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < perRow; c++) {
            const jx = random(-8, 8);
            const jy = random(-6, 6);
            const x = marginX + c * colSpacing + jx;
            const y = marginY + r * rowSpacing + jy;
            const angle = random(-0.18, 0.18);
            const len = random(10, 18);
            baseMarks.push({ x, y, angle, len });
        }
    }
}

function resetPiece() {
    grid = makeGrid(COLS, ROWS);
    pg = createGraphics(W, H);
    pg.colorMode(HSB, 360, 100, 100, 1);
    pg.clear();
    annotationCount = 0;
    baseMarkIndices = baseMarks.map(m => cellIndex(m.x, m.y, CELL, COLS, ROWS));
}

function draw() {
    background(0, 0, 6);

    // base layer: the fixed original, redrawn every frame from its own
    // untouched data — annotation can never alter it, only sit on top.
    stroke(38, 55, 78);
    strokeWeight(2);
    for (const m of baseMarks) {
        const x2 = m.x + cos(m.angle) * m.len;
        const y2 = m.y + sin(m.angle) * m.len;
        line(m.x, m.y, x2, y2);
    }

    // attempt new annotation placements this frame
    for (let i = 0; i < PLACEMENTS_PER_FRAME; i++) {
        const x = random(20, W - 20);
        const y = random(20, H - 20);
        const result = tryPlace(grid, x, y, CELL, COLS, ROWS, threshold);
        if (result.accepted) {
            annotationCount++;
            drawAnnotationMark(x, y);
        }
    }

    image(pg, 0, 0);

    updateReadout();
}

function drawAnnotationMark(x, y) {
    pg.push();
    pg.translate(x, y);
    pg.rotate(random(TWO_PI));
    pg.stroke(0, 0, 62, 0.55);
    pg.strokeWeight(1.1);
    pg.noFill();
    const s = random(3, 6);
    pg.line(-s, 0, s, 0);
    pg.line(0, -s * 0.6, 0, s * 0.6);
    pg.pop();
}

function updateReadout() {
    const acceptance = acceptanceProbability(grid, threshold);
    const visibility = computeVisibility(baseMarkIndices, grid, VISIBILITY_FLOOR);
    const visClass = visibility > 0.6 ? 'legible' : '';
    readoutEl.innerHTML =
        `crowding tolerance <span class="val">${threshold}</span> marks/cell<br>` +
        `open cells right now <span class="val">${(acceptance * 100).toFixed(0)}%</span><br>` +
        `original still legible <span class="val ${visClass}">${(visibility * 100).toFixed(0)}%</span><br>` +
        `annotations placed <span class="val">${annotationCount}</span>`;
}
