// Pure computational core — no p5, no DOM. Testable standalone under plain Node.
// Models the V-formation wake-surfing finding (Curiosity, 2026-09-12): a follower
// bird's effort depends on how well it matches the leader's wake in TWO independent
// dimensions — temporal phase (antiphase, phi=0.5, is optimal) and spanwise offset
// (0.88 body-widths is optimal). Real numbers from the 2025/2026 PNAS minimal
// wake-vortex model: at the optimum, an antiphase follower saves 11% total power
// (9% induced, 18% profile-dominant) via a 28% reduction in flapping amplitude.

const OPTIMAL_PHASE = 0.5;       // antiphase
const OPTIMAL_SPAN = 0.88;       // body-widths
const PHASE_TOLERANCE = 0.15;    // how forgiving the phase-matching bell curve is
const SPAN_TOLERANCE = 0.4;      // how forgiving the spanwise bell curve is
const MAX_POWER_SAVING = 0.11;   // 11% total power reduction at perfect match
const MAX_AMPLITUDE_REDUCTION = 0.28; // 28% flap-amplitude cut at perfect match

function clamp01(t) { return Math.max(0, Math.min(1, t)); }

function gaussian(x, center, tolerance) {
    const d = (x - center) / tolerance;
    return Math.exp(-0.5 * d * d);
}

// phi: 0..1, where 0.5 is antiphase (the real optimum). 0 and 1 are both in-phase.
function phaseFactor(phi) {
    return gaussian(phi, OPTIMAL_PHASE, PHASE_TOLERANCE);
}

// span: 0..2 body-widths of spanwise offset.
function spanFactor(span) {
    return gaussian(span, OPTIMAL_SPAN, SPAN_TOLERANCE);
}

// Combined 0..1 "how close to the real aerodynamic optimum" — the two dimensions
// are independent, so closeness is their PRODUCT, not their average: being right
// on phase but wrong on span still gets you almost nothing, exactly as the real
// wingtip-path-coherence mechanism requires both at once.
function closeness(phi, span) {
    return clamp01(phaseFactor(phi) * spanFactor(span));
}

function powerSavingFraction(phi, span) {
    return closeness(phi, span) * MAX_POWER_SAVING;
}

// Returns the follower's flap-amplitude SCALE relative to flying alone (1.0).
// At the true optimum this drops to 1 - 0.28 = 0.72.
function amplitudeScale(phi, span) {
    return 1 - closeness(phi, span) * MAX_AMPLITUDE_REDUCTION;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        phaseFactor, spanFactor, closeness, powerSavingFraction, amplitudeScale,
        OPTIMAL_PHASE, OPTIMAL_SPAN, PHASE_TOLERANCE, SPAN_TOLERANCE,
        MAX_POWER_SAVING, MAX_AMPLITUDE_REDUCTION
    };
}
