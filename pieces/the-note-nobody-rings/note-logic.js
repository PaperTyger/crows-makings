// The note nobody rings: the arithmetic, with no drawing in it.
// Partials n = 2..7 of a period P that NO layer carries. Their sum still pulses at P.
const PARTIALS = [2, 3, 4, 5, 6, 7];

// Higher partials die first, as on a real bell.
function decayTau(n) { return 22 / n; }

function envelope(n, sinceStrike, muted) {
  return muted ? 0 : Math.exp(-sinceStrike / decayTau(n));
}

// One partial's value at distance r from the strike. delta only ever applies to the third.
function partialValue(n, r, P, c, t, delta) {
  const k = (n * (1 + (n === 3 ? delta : 0))) / P;
  const w = (n * c) / P; // same speed for all, so the sum rolls outward as one shape
  return Math.cos(2 * Math.PI * (k * r - w * t));
}

// Sum along a line of radii: what the eye gets, before any colour.
function profile(radii, opts) {
  const { P, c = 0, t = 0, since = 0, delta = 0, muted = {} } = opts;
  return radii.map((r) => {
    let s = 0;
    for (const n of PARTIALS) s += envelope(n, since, !!muted[n]) * partialValue(n, r, P, c, t, delta);
    return s;
  });
}

if (typeof module !== "undefined") module.exports = { PARTIALS, decayTau, envelope, partialValue, profile };
