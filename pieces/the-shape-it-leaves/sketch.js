// Rendering + DOM wiring. Grid/extraction/physics math lives in
// the-shape-it-leaves-logic.js (loaded before this file) and is exercised,
// not reimplemented, here.

let W = 640, H = 560;
const COLS = 44, ROWS = 34, SPACING = 14;
const OFFSET_X = 20, OFFSET_Y = 20;
const FLOOR_Y = H - 12;

let grid;
let particles = [];
let rng;
let brushRadius = 22;
let flingSpeed = 6;
const gravity = 0.35;
const friction = 0.985;

let brushSlider, flingSlider, readoutEl, resetBtn;

function setup() {
    const cnv = createCanvas(W, H);
    cnv.parent('canvasWrap');
    colorMode(HSB, 360, 100, 100, 1);

    brushSlider = document.getElementById('brushSlider');
    flingSlider = document.getElementById('flingSlider');
    readoutEl = document.getElementById('readout');
    resetBtn = document.getElementById('resetBtn');
    brushSlider.addEventListener('input', () => { brushRadius = Number(brushSlider.value); });
    flingSlider.addEventListener('input', () => { flingSpeed = Number(flingSlider.value); });
    resetBtn.addEventListener('click', resetPiece);
    brushRadius = Number(brushSlider.value);
    flingSpeed = Number(flingSlider.value);

    resetPiece();

    // Exposed for headless verification — performs the identical extraction
    // the mouse handler does, without needing a real mouse event, since the
    // Browser pane cannot dispatch one to an unattended session.
    window.extractAt = (x, y, r) => performExtraction(x, y, r === undefined ? brushRadius : r);
    window.stepN = (n) => { for (let i = 0; i < n; i++) physicsStep(); };
    window.setFlingSpeed = (v) => { flingSpeed = v; };
    window.getState = () => ({
        extracted: countExtracted(grid),
        total: grid.length,
        particleCount: particles.length,
        settled: countSettled(particles),
        maxDist: maxDistanceFromOrigin(particles, W / 2, H / 2)
    });
}

function resetPiece() {
    rng = makeRng(20260906);
    grid = buildGrid(COLS, ROWS, SPACING, OFFSET_X, OFFSET_Y, rng);
    particles = [];
    background(150, 30, 4);
}

function performExtraction(cx, cy, r) {
    const newly = extractInRadius(grid, cx, cy, r);
    for (const dot of newly) {
        particles.push(spawnParticle(dot, cx, cy, flingSpeed, rng));
    }
    return newly.length;
}

function physicsStep() {
    for (let i = 0; i < particles.length; i++) {
        particles[i] = stepParticle(particles[i], gravity, friction, FLOOR_Y);
    }
}

function draw() {
    background(150, 30, 4);

    // The field: warm gold/bronze dots, each drawn only while un-extracted.
    // An extracted cell draws nothing — the dark ground shows through as a
    // literal, permanently-shaped hole, exactly the drag path's shape.
    noStroke();
    for (const dot of grid) {
        if (dot.extracted) continue;
        fill(dot.hue, 55, dot.bright);
        circle(dot.x, dot.y, 6);
    }

    // Free particles: what the field gave up, still moving. The total never
    // disappears — it relocates and settles at the floor as a growing heap.
    physicsStep();
    for (const p of particles) {
        fill(p.hue, 70, Math.min(100, p.bright + 15), 0.9);
        circle(p.x, p.y, 5);
    }

    // Live brush preview.
    if (mouseX >= 0 && mouseX <= W && mouseY >= 0 && mouseY <= H) {
        noFill();
        stroke(0, 0, 100, 0.35);
        strokeWeight(1);
        circle(mouseX, mouseY, brushRadius * 2);
    }

    updateReadout();
}

function mouseDragged() {
    if (mouseX < 0 || mouseX > W || mouseY < 0 || mouseY > H) return;
    performExtraction(mouseX, mouseY, brushRadius);
}
function mousePressed() {
    if (mouseX < 0 || mouseX > W || mouseY < 0 || mouseY > H) return;
    performExtraction(mouseX, mouseY, brushRadius);
}

function updateReadout() {
    const ex = countExtracted(grid);
    const settled = countSettled(particles);
    readoutEl.innerHTML =
        `extracted <span class="val">${ex}</span> / ${grid.length}<br>` +
        `free particles <span class="val">${particles.length}</span><br>` +
        `settled <span class="val">${settled}</span><br>` +
        `furthest travel <span class="val">${maxDistanceFromOrigin(particles, W / 2, H / 2).toFixed(0)}px</span>`;
}
