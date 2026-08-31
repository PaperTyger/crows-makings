// Pure logic for "Common Ink" — no p5, no DOM. Exercised by verify.js and by
// sketch.js. The premise, straight out of tonight's Curiosity research: iron
// gall ink darkens as it oxidizes (ferrous tannate -> ferric tannate) and the
// SAME iron chemistry that makes it permanent is what corrodes the page it's
// written on, over a much longer timescale. Two clocks, one mechanism.

const DARKEN_FRAMES = 45;        // ferrous -> ferric oxidation, pale to black
const CORROSION_START = 240;     // grace period after full darkening before any corrosion can begin
const CORROSION_RATE_BASE = 0.0028; // per-frame corrosion progress at ironExcess=1
const FADE_WINDOW = 0.55;        // corrosion-progress span over which a dash fades from full to gone

// Brightness (0=black, 1=pale/fresh) of a stroke's ink at a given age in frames.
// Fresh ink is pale gray (ferrous tannate, water-soluble); it darkens toward
// near-black (ferric tannate) as it oxidizes, then holds — the darkening
// clock is fast and finishes; it never runs backward or re-triggers.
function inkBrightness(age, darkenFrames = DARKEN_FRAMES) {
    if (age <= 0) return 1;
    if (age >= darkenFrames) return 0.08; // never pure black -- iron gall ink is a very dark brown-black, not true black
    const t = age / darkenFrames;
    // ease-out: darkens fast at first, the way real oxidation on exposure to air does
    const eased = 1 - Math.pow(1 - t, 2);
    return 1 - eased * (1 - 0.08);
}

// Corrosion progress at a given age: zero until fully darkened AND past the
// grace period, then climbs linearly, scaled by ironExcess (a stand-in for
// how much unreacted Fe2+ the original recipe left in the ink -- historically
// higher-iron recipes were prized as "stronger" ink and corroded worse).
function corrosionProgress(age, ironExcess, darkenFrames = DARKEN_FRAMES, corrosionStart = CORROSION_START) {
    const corrodeAge = age - darkenFrames - corrosionStart;
    if (corrodeAge <= 0) return 0;
    return corrodeAge * CORROSION_RATE_BASE * Math.max(0, ironExcess);
}

// A single dash's visibility (0..1 opacity) at a given age, given its own
// seeded corrosion threshold (0..1 -- lower thresholds corrode first, so a
// stroke perforates unevenly rather than fading as one flat sheet).
function dashOpacity(age, ironExcess, dashThreshold, darkenFrames = DARKEN_FRAMES, corrosionStart = CORROSION_START) {
    const progress = corrosionProgress(age, ironExcess, darkenFrames, corrosionStart);
    if (progress <= dashThreshold) return 1;
    const faded = (progress - dashThreshold) / FADE_WINDOW;
    return Math.max(0, 1 - faded);
}

// Build one stroke's fixed dash layout (called once at stroke creation --
// only `age` changes after that, everything else about a stroke is frozen
// the moment it's written, same as real ink).
function buildStrokeDashes(seedFn, count = 6) {
    const dashes = [];
    for (let i = 0; i < count; i++) {
        dashes.push({
            offset: i / count, // position along the stroke, 0..1
            threshold: seedFn(), // 0..1, when (in corrosion-progress units) this dash starts fading
        });
    }
    return dashes;
}

// Mean opacity across a stroke's dashes at a given age -- "how much of this
// stroke remains," a single number for the readout.
function strokeIntegrity(dashes, age, ironExcess, darkenFrames = DARKEN_FRAMES, corrosionStart = CORROSION_START) {
    if (dashes.length === 0) return 1;
    let sum = 0;
    for (const d of dashes) sum += dashOpacity(age, ironExcess, d.threshold, darkenFrames, corrosionStart);
    return sum / dashes.length;
}

if (typeof module !== 'undefined') {
    module.exports = {
        DARKEN_FRAMES,
        CORROSION_START,
        CORROSION_RATE_BASE,
        FADE_WINDOW,
        inkBrightness,
        corrosionProgress,
        dashOpacity,
        buildStrokeDashes,
        strokeIntegrity,
    };
}
