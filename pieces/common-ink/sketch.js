// Rendering + DOM wiring. All ink-brightness/corrosion math lives in
// common-ink-logic.js (loaded before this file) and is exercised, not
// reimplemented, here.

let W = 640, H = 640;
const MARGIN = 56;
const LINE_HEIGHT = 30;

let strokes = [];
let ironExcess = 1.2;
let handSpeed = 3; // strokes attempted per frame
let ironSlider, speedSlider, readoutEl, resetBtn;
let writeX, writeY, rnd;

function setup() {
    const cnv = createCanvas(W, H);
    cnv.parent('canvasWrap');
    colorMode(RGB, 255, 255, 255, 1);

    ironSlider = document.getElementById('ironSlider');
    speedSlider = document.getElementById('speedSlider');
    readoutEl = document.getElementById('readout');
    resetBtn = document.getElementById('resetBtn');
    ironSlider.addEventListener('input', () => { ironExcess = Number(ironSlider.value) / 100; });
    speedSlider.addEventListener('input', () => { handSpeed = Number(speedSlider.value); });
    resetBtn.addEventListener('click', resetPiece);
    ironExcess = Number(ironSlider.value) / 100;
    handSpeed = Number(speedSlider.value);

    resetPiece();
}

function resetPiece() {
    strokes = [];
    writeX = MARGIN;
    writeY = MARGIN;
    rnd = makeSeededRandom(Date.now() % 100000);
    background(238, 228, 200); // parchment
}

function makeSeededRandom(seed) {
    let s = seed || 1;
    return function () {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
    };
}

function draw() {
    // Parchment ground with a very faint warm vignette, painted fresh every
    // frame -- the page itself doesn't age, only what's written on it does.
    background(238, 228, 200);
    drawVignette();

    for (let i = 0; i < handSpeed; i++) advanceHand();

    for (const s of strokes) {
        const age = frameCount - s.bornAt;
        drawStroke(s, age);
    }

    updateReadout();
}

function drawVignette() {
    noStroke();
    for (let r = 0; r < 4; r++) {
        fill(200, 180, 140, 0.03);
        rect(r * 6, r * 6, W - r * 12, H - r * 12);
    }
}

// One "hand movement": place a short stroke at the current write position,
// then advance the pen -- wrapping to the next line, and back to the top of
// the page once the bottom margin is reached (a page gets reused, the way a
// real leaf does, rather than the piece halting).
function advanceHand() {
    const len = 10 + rnd() * 22;
    const angle = (rnd() - 0.5) * 0.35;
    strokes.push({
        x: writeX,
        y: writeY,
        len,
        angle,
        bornAt: frameCount,
        dashes: buildStrokeDashes(rnd, 6),
    });
    writeX += len + 4 + rnd() * 6;
    if (writeX > W - MARGIN) {
        writeX = MARGIN;
        writeY += LINE_HEIGHT;
        if (writeY > H - MARGIN) writeY = MARGIN;
    }
}

function drawStroke(s, age) {
    const gray = Math.round(inkBrightness(age) * 255 * 0.55); // ink is dark brown-black, never pure white/black
    const inkR = gray + 15, inkG = gray + 8, inkB = gray;
    const dashCount = s.dashes.length;
    for (let i = 0; i < dashCount; i++) {
        const d = s.dashes[i];
        const op = dashOpacity(age, ironExcess, d.threshold);
        const t0 = d.offset, t1 = i + 1 < dashCount ? s.dashes[i + 1].offset : 1;
        const x0 = s.x + Math.cos(s.angle) * s.len * t0;
        const y0 = s.y + Math.sin(s.angle) * s.len * t0;
        const x1 = s.x + Math.cos(s.angle) * s.len * t1;
        const y1 = s.y + Math.sin(s.angle) * s.len * t1;

        // Rust/foxing halo underneath -- always faintly present once a dash has
        // begun corroding, so fading ink reveals a stain rather than blank page.
        if (op < 0.85) {
            noStroke();
            fill(150, 90, 40, (1 - op) * 0.35);
            ellipse((x0 + x1) / 2, (y0 + y1) / 2, s.len / dashCount + 4);
        }

        if (op > 0.02) {
            stroke(inkR, inkG, inkB, op);
            strokeWeight(2.2);
            line(x0, y0, x1, y1);
        }
    }
}

function updateReadout() {
    let oldestIntegrity = 1, oldestAge = 0;
    if (strokes.length > 0) {
        const oldest = strokes[0];
        oldestAge = frameCount - oldest.bornAt;
        oldestIntegrity = strokeIntegrity(oldest.dashes, oldestAge, ironExcess);
    }
    readoutEl.innerHTML =
        `strokes written <span class="val">${strokes.length}</span><br>` +
        `oldest stroke age <span class="val">${(oldestAge / 60).toFixed(1)}s</span><br>` +
        `oldest stroke integrity <span class="val">${(oldestIntegrity * 100).toFixed(0)}%</span><br>` +
        `excess iron <span class="val">${ironExcess.toFixed(2)}x</span>`;
}
