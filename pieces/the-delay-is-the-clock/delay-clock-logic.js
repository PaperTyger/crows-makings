// Pure computational core — no p5, no DOM. A minimal delayed negative-feedback
// oscillator: an activator A drives a repressor R with a lag (the delay
// buffer), and R represses A's own production. No single fast component is
// "the clock" here; the period comes from the round-trip time through the
// delay, the same insight tonight's Curiosity pick named for the real
// circadian TTFL (CLOCK:BMAL1 -> PER/CRY -> repression, with the delay set
// by transcription+translation+phosphorylation+nuclear re-entry).
//
// Exposed as CommonJS (for Node verification) and as window globals (for the
// browser sketch), same pattern as prior pieces in this folder.

const PARAMS = {
    k1: 0.05, // repressor production rate, driven by the DELAYED activator
    k2: 0.02, // repressor decay rate
    k3: 0.06, // activator production rate, repressed by current R
    k4: 0.03, // activator decay rate
    n: 4,     // Hill coefficient (repression steepness)
    dt: 1
};

function makeState(delayFrames, a0 = 0.15, r0 = 0.05) {
    const buf = new Array(Math.max(1, Math.round(delayFrames))).fill(a0);
    return {
        A: a0,
        R: r0,
        buf,
        bufIdx: 0,
        delayFrames: Math.max(1, Math.round(delayFrames)),
        t: 0,
        logA: [],
        logR: []
    };
}

// Advance one tick. Returns a NEW state object (immutable-style, easy to test).
function stepState(state, params = PARAMS) {
    const { k1, k2, k3, k4, n, dt } = params;
    const buf = state.buf;
    const idx = state.bufIdx;
    const delayedA = buf[idx]; // the activator value from `delayFrames` ticks ago
    buf[idx] = state.A;        // overwrite oldest slot with current A
    const nextIdx = (idx + 1) % buf.length;

    const dR = k1 * delayedA - k2 * state.R;
    const dA = k3 / (1 + Math.pow(Math.max(0, state.R), n)) - k4 * state.A;

    const newR = Math.max(0, state.R + dt * dR);
    const newA = Math.max(0, state.A + dt * dA);

    const logA = state.logA.length >= 4000 ? state.logA.slice(1) : state.logA.slice();
    const logR = state.logR.length >= 4000 ? state.logR.slice(1) : state.logR.slice();
    logA.push(newA);
    logR.push(newR);

    return {
        A: newA,
        R: newR,
        buf,
        bufIdx: nextIdx,
        delayFrames: state.delayFrames,
        t: state.t + 1,
        logA,
        logR
    };
}

function stepN(state, n, params = PARAMS) {
    let s = state;
    for (let i = 0; i < n; i++) s = stepState(s, params);
    return s;
}

// Peak-to-peak period detector on a log array. Finds local maxima above a
// fraction of the observed range, returns the mean spacing in ticks (or null
// if fewer than 2 peaks were found — not enough data / not oscillating yet).
function measurePeriod(log) {
    if (log.length < 20) return null;
    const max = Math.max(...log);
    const min = Math.min(...log);
    const span = max - min;
    if (span < 1e-6) return null; // flat-lined, no oscillation
    const threshold = min + span * 0.6;
    const peaks = [];
    for (let i = 2; i < log.length - 2; i++) {
        if (log[i] > threshold &&
            log[i] >= log[i - 1] && log[i] >= log[i - 2] &&
            log[i] >= log[i + 1] && log[i] >= log[i + 2]) {
            // avoid double-counting a plateau as two peaks
            if (peaks.length === 0 || i - peaks[peaks.length - 1] > 5) {
                peaks.push(i);
            }
        }
    }
    if (peaks.length < 2) return null;
    let total = 0;
    for (let i = 1; i < peaks.length; i++) total += peaks[i] - peaks[i - 1];
    return total / (peaks.length - 1);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PARAMS, makeState, stepState, stepN, measurePeriod };
}
if (typeof window !== 'undefined') {
    window.DelayClockLogic = { PARAMS, makeState, stepState, stepN, measurePeriod };
}
