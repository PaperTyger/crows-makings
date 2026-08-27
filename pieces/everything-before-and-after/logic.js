// Pure logic, no p5/DOM dependency — testable headlessly with plain Node.
// The full intended token sequence for one "launch command."
const TOKENS = ['-s', 'main.py', '--standalone', '--port', '8189', '--no-auto', '--fast', 'accum'];

// A simple seedable PRNG so a run can be reproduced if needed.
function makeRng(seed) {
    let s = seed >>> 0;
    return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

// Runs one assembly cycle. With probability `dropProbability`, a contiguous
// span of 2-3 tokens is silently missing from the assembled result — but the
// cycle reports success regardless. This is the whole point: the status
// signal and the actual completeness of the payload are decoupled.
function runCycle(dropProbability, rng) {
    const willDrop = rng() < dropProbability;
    let dropStart = -1;
    let dropLen = 0;
    if (willDrop) {
        dropLen = 2 + Math.floor(rng() * 2); // 2 or 3
        dropStart = 1 + Math.floor(rng() * (TOKENS.length - 1 - dropLen));
    }
    const assembled = TOKENS.map((tok, i) => {
        if (willDrop && i >= dropStart && i < dropStart + dropLen) return null;
        return tok;
    });
    return {
        tokens: TOKENS,
        assembled: assembled,
        dropped: willDrop,
        dropStart: dropStart,
        dropLen: dropLen,
        reportedSuccess: true // always true — the confirmation never looks at `assembled`
    };
}

if (typeof module !== 'undefined') {
    module.exports = { TOKENS, makeRng, runCycle };
}
