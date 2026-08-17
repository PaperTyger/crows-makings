// Rendering + DOM wiring. All terrain/blend/score math lives in
// accidental-symmetry-logic.js (loaded before this file) and is exercised,
// not reimplemented, here.

const N = 129; // (power of two) + 1
const ROUGHNESS = 0.58;

let W = 760, H = 480;
let cnv;
let sourceProfile, independentProfile;
let coherence = 0.55; // 0..1
let sourceSeed = 42, independentSeed = 999;

let coherenceSlider, readoutEl, reseedBtn;

function regenerate() {
    const rngA = mulberry32(sourceSeed);
    const rngB = mulberry32(independentSeed);
    sourceProfile = midpointDisplacement(N, ROUGHNESS, rngA);
    independentProfile = midpointDisplacement(N, ROUGHNESS, rngB);
}

function setup() {
    cnv = createCanvas(W, H);
    cnv.parent('canvasWrap');
    colorMode(HSB, 360, 100, 100, 1);
    noStroke();

    regenerate();

    coherenceSlider = document.getElementById('coherenceSlider');
    readoutEl = document.getElementById('readout');
    reseedBtn = document.getElementById('reseedBtn');

    coherenceSlider.addEventListener('input', () => {
        coherence = Number(coherenceSlider.value) / 100;
        updateReadout();
    });
    reseedBtn.addEventListener('click', () => {
        sourceSeed = Math.floor(Math.random() * 1e9);
        independentSeed = Math.floor(Math.random() * 1e9);
        regenerate();
        updateReadout();
    });

    updateReadout();
}

function updateReadout() {
    const blended = blendProfiles(sourceProfile, independentProfile, coherence);
    const score = rhymeScore(sourceProfile, blended);
    const label = legibilityLabel(score);
    readoutEl.innerHTML =
        `coherence <span class="val">${(coherence * 100).toFixed(0)}%</span><br>` +
        `rhyme score <span class="val">${score.toFixed(3)}</span><br>` +
        `<span class="label">${label}</span>`;
}

// Map a profile array (values roughly -1..1) to canvas y-coordinates within
// a given band, silhouette-style: value=0 sits at the band's floor, positive
// values rise toward the band's ceiling (like a mountain skyline).
function profileToY(v, bandTop, bandBottom) {
    const t = clamp01((v + 0.6) / 1.4); // rough normalize, allow slight overshoot to clip
    return lerp(bandBottom, bandTop, t);
}

function drawSilhouette(profile, x0, x1, bandTop, bandBottom, hue, sat, bri) {
    const n = profile.length;
    beginShape();
    vertex(x0, bandBottom);
    for (let i = 0; i < n; i++) {
        const x = lerp(x0, x1, i / (n - 1));
        const y = profileToY(profile[i], bandTop, bandBottom);
        vertex(x, y);
    }
    vertex(x1, bandBottom);
    endShape(CLOSE);
}

function draw() {
    background(220, 15, 6);

    const bandTop = 70;
    const bandBottom = H - 60;
    const mid = W / 2;

    const blended = blendProfiles(sourceProfile, independentProfile, coherence);

    // source (left) — warm indigo/gold, echoing the burned sutra: silver-gold
    // marks on a deep indigo ground
    fill(230, 55, 22);
    drawSilhouette(sourceProfile, 40, mid, bandTop, bandBottom, 230, 55, 22);

    // reflection (right) — mirrored x-axis, blended profile. Hue drifts from
    // matching-warm (high coherence) toward a colder, separate hue (low
    // coherence) — the palette itself reports the rhyme score.
    const score = rhymeScore(sourceProfile, blended);
    const drift = clamp01(score / 0.5); // 0 = perfect match, 1 = fully drifted
    const reflHue = lerp(230, 15, drift); // indigo -> ember as it stops rhyming
    fill(reflHue, 60, 30 + drift * 25);
    const n = blended.length;
    beginShape();
    vertex(W - 40, bandBottom);
    for (let i = 0; i < n; i++) {
        const x = lerp(W - 40, mid, i / (n - 1)); // mirrored: i=0 at far right edge
        const y = profileToY(blended[i], bandTop, bandBottom);
        vertex(x, y);
    }
    vertex(mid, bandBottom);
    endShape(CLOSE);

    // seam: a thin vertical band at the mirror line whose per-height glow
    // tracks local (not global) agreement between source and reflection
    for (let i = 0; i < n; i++) {
        const y = profileToY(sourceProfile[i], bandTop, bandBottom);
        const localDiff = Math.abs(sourceProfile[i] - blended[i]);
        const glow = clamp01(1 - localDiff / 0.6);
        if (glow > 0.05) {
            stroke(45, 40, 90, glow * 0.7);
            strokeWeight(2 + glow * 3);
            point(mid, y);
        }
    }
    noStroke();

    // ground line
    fill(0, 0, 12);
    rect(0, bandBottom, W, H - bandBottom);
    fill(0, 0, 30, 0.5);
    rect(0, bandBottom, W, 1.5);
}
