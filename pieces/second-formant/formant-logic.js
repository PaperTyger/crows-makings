// Second Formant — pure signal logic. No p5, no DOM, no canvas.
// Isolated so a headless runner can verify the claim the piece makes.
//
// The field spans a real speech-spectrogram range, 0-5000 Hz, so that every
// component sits where it physically belongs relative to every other one.
// The whistle occupies 1000-3000 Hz inside that, which is what makes the
// listener's search region (everything above 1000 Hz) a genuine constraint
// rather than a fudge.

const FIELD_HZ = 5000;
const WHISTLE_LO = 1000;
const WHISTLE_HI = 3000;

// The four whistled-Spanish vowel loci (Silbo), ~2600/2100/1700/1400 Hz.
const VOWEL_HZ = [2600, 2100, 1700, 1400];

const hzToNorm = (hz) => hz / FIELD_HZ;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// An utterance: a sequence of syllables, each gliding toward a vowel locus.
// Consonants are carried by the TRANSITIONS, not by spectral content --
// either an abrupt jump between loci, or an interruption of the carrier.
// That is the actual Silbo description, not a simplification of it.
function makeUtterance(seed, nCols) {
  const rnd = mulberry32(seed);
  const f2 = new Float32Array(nCols);
  const voiced = new Uint8Array(nCols);
  const abrupt = new Uint8Array(nCols);

  const segs = [];
  let x = Math.floor(nCols * 0.03);
  let prev = hzToNorm(VOWEL_HZ[Math.floor(rnd() * 4)]);

  while (x < nCols * 0.97) {
    const len = Math.floor(18 + rnd() * 46);
    const target = hzToNorm(VOWEL_HZ[Math.floor(rnd() * 4)]);
    const r = rnd();
    const kind = r < 0.42 ? 'glide' : (r < 0.78 ? 'jump' : 'break');
    segs.push({ x0: x, len, from: prev, to: target, kind });
    prev = target;
    x += len;
  }

  for (const s of segs) {
    for (let i = 0; i < s.len && s.x0 + i < nCols; i++) {
      const c = s.x0 + i;
      const t = i / s.len;
      if (s.kind === 'break') {
        const gap = Math.min(7, Math.floor(s.len * 0.28));
        if (i < gap) { voiced[c] = 0; f2[c] = s.to; abrupt[c] = 1; continue; }
        voiced[c] = 1;
        f2[c] = s.to;
      } else if (s.kind === 'jump') {
        voiced[c] = 1;
        f2[c] = s.from + (s.to - s.from) * smoothstep(0.0, 0.18, t);
        abrupt[c] = t < 0.18 ? 1 : 0;
      } else {
        voiced[c] = 1;
        f2[c] = s.from + (s.to - s.from) * smoothstep(0, 1, t);
      }
      f2[c] += (rnd() - 0.5) * 0.004;
      f2[c] = Math.max(hzToNorm(WHISTLE_LO + 40), Math.min(hzToNorm(WHISTLE_HI - 40), f2[c]));
    }
  }
  return { f2, voiced, abrupt, nCols };
}

// Which components survive at a given bandwidth. F2 is never removed --
// that is the premise: it is the band the whistle keeps.
function componentGains(bandwidth) {
  const ramp = (t) => Math.max(0, Math.min(1, (bandwidth - t) / 0.2));
  return {
    f2: 1.0,
    f1: ramp(0.22),
    f3: ramp(0.52),
    harmonics: ramp(0.10),
    noise: ramp(0.38),
  };
}

// Render the utterance into a normalized energy field. Row 0 = top = 5000 Hz.
function renderField(utt, nRows, bandwidth) {
  const nCols = utt.nCols;
  const g = componentGains(bandwidth);
  const field = new Float32Array(nRows * nCols);
  const rnd = mulberry32(9161);

  const rowOf = (norm) => (1 - norm) * (nRows - 1);
  const band = (col, centerRow, width, amp) => {
    if (amp <= 0) return;
    const lo = Math.max(0, Math.floor(centerRow - width * 3));
    const hi = Math.min(nRows - 1, Math.ceil(centerRow + width * 3));
    for (let r = lo; r <= hi; r++) {
      const d = (r - centerRow) / width;
      field[r * nCols + col] += amp * Math.exp(-0.5 * d * d);
    }
  };

  for (let c = 0; c < nCols; c++) {
    const f2n = utt.f2[c];

    if (utt.voiced[c]) {
      // F2 is always present -- but its CLARITY is the thing bandwidth buys.
      // In full speech F2 is one broad, low-contrast ridge embedded in a
      // complex spectrum; a whistle replaces it with a pure tone. That is
      // literally what whistling is, and leaving it out was the modelling
      // error that made recovery read a flat 99.7% at every bandwidth.
      band(c, rowOf(f2n),
           nRows * (0.005 + 0.022 * bandwidth),
           (1.0 - 0.42 * bandwidth) * g.f2);

      // F1, ~300-800 Hz -- low, weakly coupled to F2, and LOUDER than F2,
      // which is why a naive loudest-thing-wins listener never finds F2.
      const f1Hz = 300 + (f2n * FIELD_HZ - WHISTLE_LO) * 0.25;
      band(c, rowOf(hzToNorm(f1Hz)), nRows * 0.013, 1.45 * g.f1);

      // F3, ~2900-3500 Hz -- high, nearly stationary, and the one genuine
      // competitor inside the listener's search region.
      const f3Hz = 2900 + (f2n * FIELD_HZ - WHISTLE_LO) * 0.30;
      band(c, rowOf(hzToNorm(f3Hz)), nRows * 0.010, 0.62 * g.f3);

      // Harmonic stack off a ~120 Hz fundamental: the dense low striations
      // that make a speech spectrogram look like speech. All below 1000 Hz
      // except the topmost, so they sit outside the whistle band.
      if (g.harmonics > 0) {
        for (let k = 1; k <= 9; k++) {
          const hHz = 120 * k;
          band(c, rowOf(hzToNorm(hHz)), nRows * 0.005,
               (1.2 / (1 + k * 0.5)) * g.harmonics);
        }
      }
    }

    // Broadband noise at consonant edges and during interruptions --
    // this one DOES reach into the search region.
    if (g.noise > 0 && utt.abrupt[c]) {
      for (let r = 0; r < nRows; r++) {
        field[r * nCols + c] += rnd() * 0.55 * g.noise * (0.4 + 0.6 * (1 - r / nRows));
      }
    }
  }
  return field;
}

// --- The two measurements the piece exists to make -------------------------

// Total rendered energy: how much signal is actually being transmitted.
function totalEnergy(field) {
  let s = 0;
  for (let i = 0; i < field.length; i++) s += field[i];
  return s;
}

// Contour recovery: read the F2 trajectory back OFF the rendered field.
//
// The listener is modelled with the two things a Silbo listener actually
// knows, and nothing more:
//   1. The whistle lives above 1000 Hz, so the low harmonic stack is not a
//      candidate. Encoded as a search floor -- NOT as knowledge of the answer.
//   2. A formant is continuous -- track toward the peak nearest the running
//      estimate rather than taking a fresh global max each column.
//
// No ground truth enters the tracker. F3 and broadband consonant noise are
// genuine competitors inside the search region, so this degrades gracefully.
//
// (Rewritten twice during the 2026-08-22 build, and both repairs are the
// point. v1 took a global argmax: mean error pinned at exactly 130.64 rows
// across four different bandwidths and a hard 0%->100% jump, because F1 is
// louder than F2 and won every column until it vanished -- a graded control
// cannot produce a binary outcome, so the measure was reporting "is F1
// present" while claiming to report intelligibility. v2 added the search
// floor but the field only spanned 1000-3000 Hz, which put the harmonic
// stack inside the whistle band and left the floor amputating the lower
// third of F2's own range. Fixing the FIELD to span a real 0-5000 Hz is what
// made the floor mean what it says.)
function contourRecovery(utt, field, nRows, tolRows) {
  const nCols = utt.nCols;
  // Everything at or below 1000 Hz is outside the whistle band.
  const searchFloor = Math.floor((1 - hzToNorm(WHISTLE_LO)) * (nRows - 1));
  let err = 0, n = 0, within = 0;
  let est = null;

  for (let c = 0; c < nCols; c++) {
    if (!utt.voiced[c]) { est = null; continue; }

    let best = -1, bestScore = -Infinity;
    for (let r = 1; r < Math.min(searchFloor, nRows - 1); r++) {
      const v = field[r * nCols + c];
      if (v <= 1e-6) continue;
      if (v < field[(r - 1) * nCols + c] || v < field[(r + 1) * nCols + c]) continue;
      const cont = est === null ? 0 : Math.exp(-Math.abs(r - est) / (nRows * 0.03));
      const score = v * (1 + 1.6 * cont);
      if (score > bestScore) { bestScore = score; best = r; }
    }
    if (best < 0) { est = null; continue; }

    est = est === null ? best : est * 0.35 + best * 0.65;
    const trueRow = (1 - utt.f2[c]) * (nRows - 1);
    const e = Math.abs(est - trueRow);
    err += e; n++;
    if (e <= tolRows) within++;
  }
  return { meanErrRows: n ? err / n : NaN, withinFrac: n ? within / n : NaN, nCols: n };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    makeUtterance, renderField, componentGains,
    totalEnergy, contourRecovery, hzToNorm,
    VOWEL_HZ, FIELD_HZ, WHISTLE_LO, WHISTLE_HI,
  };
}
