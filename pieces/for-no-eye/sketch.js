// For No Eye. A pelt of flattened hairs, each a thin keratin film.
// The sheen is real interference colour, computed per wavelength, and it is
// worn by an animal whose eyes are covered in skin.

const SEED = 20260923;
const STRANDS = 900;
const SEGMENTS = 34;
const STEP = 7;

let strands = [];
let lut = new Map();
let lightAngle = 0;
let meanLum = 0;

function filmAt(thickness, cosI) {
    const tb = Math.round(thickness / 5) * 5;
    const cb = Math.round(cosI * 50) / 50;
    const key = tb * 1000 + Math.round(cb * 50);
    let v = lut.get(key);
    if (!v) { v = thinFilmColour(tb, cb); lut.set(key, v); }
    return v;
}

function buildPelt() {
    randomSeed(SEED);
    noiseSeed(SEED);
    strands = [];
    for (let i = 0; i < STRANDS; i++) {
        let x = random(-40, width + 40);
        let y = random(-40, height + 40);
        const pts = [];
        for (let s = 0; s < SEGMENTS; s++) {
            // The pelt lies mostly one way, as fur does, with a slow swirl.
            const a = 0.35 + (noise(x * 0.0035, y * 0.0035) - 0.5) * 9.0;
            pts.push({ x, y, a, s });
            x += cos(a) * STEP;
            y += sin(a) * STEP;
        }
        strands.push({ pts, jitter: random(0.85, 1.15), w: random(1.2, 2.6), phase: random(TWO_PI), twist: random(0.25, 0.6) });
    }
}

function setup() {
    const size = Math.min(720, windowWidth - 360, windowHeight - 40);
    const c = createCanvas(Math.max(320, size), Math.max(320, size));
    c.parent('canvasWrap');
    buildPelt();
    strokeCap(ROUND);
}

function draw() {
    const auto = document.getElementById('autoBox').checked;
    const thickness = Number(document.getElementById('thickSlider').value);
    const moleView = document.getElementById('moleBox').checked;
    if (auto) lightAngle += 0.006;
    else lightAngle = Number(document.getElementById('lightSlider').value) * Math.PI / 180;

    background(24, 18, 14);
    let lumSum = 0, n = 0;
    for (const st of strands) {
        strokeWeight(st.w);
        for (let s = 1; s < st.pts.length; s++) {
            const p0 = st.pts[s - 1], p1 = st.pts[s];
            const rel = p1.a - lightAngle;
            // Capped below 1 so the brown always shows through: a sheen on fur, not a slick on water.
            const glint = 0.6 * Math.pow(Math.abs(Math.cos(rel)), 10);
            // A flattened hair twists along its length, so the angle light meets the film at
            // changes down each strand. Tying it to the glint instead meant the lit hairs
            // only ever showed their head-on colour.
            const cosI = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(p1.s * st.twist + st.phase));
            const film = filmAt(thickness * st.jitter, cosI);
            // Melanin brown underneath; the film only shows where it catches the light.
            const r = 0.20 * (1 - glint) + film.rgb[0] * glint;
            const g = 0.13 * (1 - glint) + film.rgb[1] * glint;
            const b = 0.09 * (1 - glint) + film.rgb[2] * glint;
            lumSum += 0.2126 * r + 0.7152 * g + 0.0722 * b; n++;
            stroke(r * 255, g * 255, b * 255);
            line(p0.x, p0.y, p1.x, p1.y);
        }
    }
    meanLum = lumSum / n;

    if (moleView) {
        // Skin over the eyes: at most light and dark. Everything above collapses to one value.
        background(meanLum * 255);
    }

    document.getElementById('readout').innerHTML =
        'Film thickness <span class="val">' + thickness + ' nm</span><br>' +
        'Light from <span class="val">' + Math.round(((lightAngle * 180 / Math.PI) % 360 + 360) % 360) + '°</span><br>' +
        'Mean brightness <span class="val">' + meanLum.toFixed(3) + '</span>';
}
