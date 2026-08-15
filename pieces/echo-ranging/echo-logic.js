// Pure computational core — no p5, no DOM. Testable standalone under plain Node.
// Models the orb-weaver leg-crouch echo-ranging finding (Curiosity, 2026-08-14):
// closer prey returns a HIGHER frequency at LOWER amplitude; farther prey returns
// a LOWER frequency at HIGHER amplitude. Distance is read off pitch, not loudness.

const FREQ_NEAR = 10.2; // Hz, prey on spiral thread 3 (close)
const FREQ_FAR = 5.6;   // Hz, prey on spiral thread 13 (far)
const AMP_NEAR = 0.28;  // quieter when close
const AMP_FAR = 1.0;    // louder when far
const HUE_NEAR = 18;    // warm (degrees, 0-360 HSB)
const HUE_FAR = 212;    // cool

function clamp01(t) { return Math.max(0, Math.min(1, t)); }
function lerp(a, b, t) { return a + (b - a) * t; }

// distance: 0 (at the hub) .. maxDistance (edge of the web). Returns Hz.
function freqForDistance(distance, maxDistance) {
    const t = clamp01(distance / maxDistance);
    return lerp(FREQ_NEAR, FREQ_FAR, t);
}

// Returns amplitude in [0,1].
function ampForDistance(distance, maxDistance) {
    const t = clamp01(distance / maxDistance);
    return lerp(AMP_NEAR, AMP_FAR, t);
}

// Maps a frequency in [FREQ_FAR, FREQ_NEAR] to a hue in [HUE_FAR, HUE_NEAR].
function hueForFreq(freq) {
    const t = clamp01((freq - FREQ_FAR) / (FREQ_NEAR - FREQ_FAR));
    return lerp(HUE_FAR, HUE_NEAR, t);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { freqForDistance, ampForDistance, hueForFreq, FREQ_NEAR, FREQ_FAR, AMP_NEAR, AMP_FAR, HUE_NEAR, HUE_FAR };
}
