// Pure computational core — no p5, no DOM. Testable standalone under plain Node.
//
// Seeded by three things from one night (2026-08-16): a Curiosity thread on why
// vision systems can't reliably tell a real object from its mirror reflection
// (the honest fix in the field is to mask the region, not classify it); an
// Aesthesis keeper — a fire-damaged 8th-century sutra whose burned edge reads,
// by accident, as a mountain silhouette, sitting next to a torn manuscript
// fragment whose damage was just loss; and an Introspection reflection asking
// what actually separates an accident that composes from one that only
// subtracts. This does not answer that question. It makes the question
// interactive: a jagged silhouette on the left ("source"), and on the right a
// silhouette that is either its exact mirror, pure independent noise, or
// something in between, controlled by one parameter — coherence.

// --- deterministic PRNG (mulberry32) so a given seed always produces the same terrain ---
function mulberry32(seed) {
    let s = seed >>> 0;
    return function () {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function clamp01(t) { return Math.max(0, Math.min(1, t)); }
function lerp(a, b, t) { return a + (b - a) * t; }

// 1D midpoint displacement — the standard fractal-terrain algorithm. n must be
// (power of two) + 1. roughness in (0,1): lower = smoother, higher = jagged.
// Returns an array of n heights, roughly in [-1, 1] but not hard-clamped
// (fractal displacement can occasionally overshoot, which is honest — real
// fracture edges do too).
function midpointDisplacement(n, roughness, rng) {
    const size = n - 1;
    if (size < 1 || (size & (size - 1)) !== 0) {
        throw new Error('midpointDisplacement: n-1 must be a power of two');
    }
    const arr = new Array(n).fill(0);
    arr[0] = (rng() * 2 - 1) * 0.3;
    arr[size] = (rng() * 2 - 1) * 0.3;
    let scale = 1.0;
    let step = size;
    while (step > 1) {
        const half = step / 2;
        for (let i = half; i < size; i += step) {
            const avg = (arr[i - half] + arr[i + half]) / 2;
            arr[i] = avg + (rng() * 2 - 1) * scale;
        }
        step = half;
        scale *= roughness;
    }
    return arr;
}

// Blend a source profile against an independent one. coherence=1 -> exact
// mirror of source (perfect reflection). coherence=0 -> pure independent
// noise (unrelated shape). Anything between is a partial rhyme.
function blendProfiles(sourceProfile, independentProfile, coherence) {
    const c = clamp01(coherence);
    return sourceProfile.map((s, i) => lerp(independentProfile[i], s, c));
}

// Mean absolute difference between two equal-length profiles — how far the
// "reflection" has drifted from being a reflection. 0 = indistinguishable
// from a true mirror. Larger = reads as its own separate shape.
function rhymeScore(sourceProfile, otherProfile) {
    let sum = 0;
    for (let i = 0; i < sourceProfile.length; i++) {
        sum += Math.abs(sourceProfile[i] - otherProfile[i]);
    }
    return sum / sourceProfile.length;
}

// A coarse, honest label. Thresholds are aesthetic judgment calls, not derived
// from anything — noted here rather than pretending otherwise.
function legibilityLabel(score) {
    if (score < 0.03) return 'reads as reflection';
    if (score < 0.18) return 'reflection with damage';
    if (score < 0.4) return 'seam visible, still rhymes';
    return 'reads as its own shape';
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        mulberry32, midpointDisplacement, blendProfiles, rhymeScore,
        legibilityLabel, clamp01, lerp,
    };
}
