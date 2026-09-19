// kept-by-use-logic.js — pure, DOM-free mark-decay logic.
// No p5, no window, no DOM. Exported for both the browser sketch and the
// node verify.js test, so the math is checked identically to how it renders.
//
// A mark is { x, y, strength, resilience, touches, shape, rot }.
// strength decays every step at a rate divided by resilience — untouched
// marks fall at the base rate and eventually die (strength <= 0, removed
// permanently). Touching a mark resets its strength to 1 AND raises its
// resilience, so a repeatedly-touched mark decays ever more slowly. There
// is no reseeding: population only ever falls, except where touch holds it.

const EPS = 0.0005;
const RESILIENCE_GROWTH = 1.35;
const RESILIENCE_CAP = 10;

// Deterministic seeded RNG (mulberry32), so a run is reproducible given a seed.
function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SHAPES = ['dot', 'tail', 'dash', 'hook'];

function createMarks(count, w, h, rnd) {
  const marks = [];
  for (let i = 0; i < count; i++) {
    marks.push({
      x: rnd() * w,
      y: rnd() * h,
      strength: 0.35 + rnd() * 0.65,   // start partway faded, not all fresh
      resilience: 1,
      touches: 0,
      shape: SHAPES[Math.floor(rnd() * SHAPES.length)],
      rot: rnd() * Math.PI * 2,
    });
  }
  return marks;
}

// Advance every mark by dt seconds. decayPerSecond is the BASE fractional
// strength lost per second at resilience=1; each mark's own resilience
// divides that rate down. Marks whose strength falls to <= EPS are dropped
// from the returned array — permanent removal, not a fade held at zero.
function decayStep(marks, decayPerSecond, dt) {
  const next = [];
  for (const m of marks) {
    const rate = decayPerSecond / m.resilience;
    const strength = m.strength - rate * dt;
    if (strength > EPS) next.push({ ...m, strength });
  }
  return next;
}

// Touch the mark at the given index: strength snaps back to 1, resilience
// grows (capped), touch count increments. Returns a NEW array; does not
// mutate the input.
function touchMark(marks, index) {
  if (index < 0 || index >= marks.length) return marks;
  return marks.map((m, i) => {
    if (i !== index) return m;
    return {
      ...m,
      strength: 1,
      resilience: Math.min(RESILIENCE_CAP, m.resilience * RESILIENCE_GROWTH),
      touches: m.touches + 1,
    };
  });
}

// Nearest mark to (x,y) within radius, or -1 if none qualifies.
function findMarkNear(marks, x, y, radius) {
  let best = -1, bestD2 = radius * radius;
  for (let i = 0; i < marks.length; i++) {
    const dx = marks[i].x - x, dy = marks[i].y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= bestD2) { bestD2 = d2; best = i; }
  }
  return best;
}

function populationStats(marks) {
  if (marks.length === 0) {
    return { count: 0, meanStrength: 0, meanTouches: 0, maxTouches: 0, everTouchedCount: 0 };
  }
  let sumS = 0, sumT = 0, maxT = 0, everTouched = 0;
  for (const m of marks) {
    sumS += m.strength;
    sumT += m.touches;
    if (m.touches > maxT) maxT = m.touches;
    if (m.touches > 0) everTouched++;
  }
  return {
    count: marks.length,
    meanStrength: sumS / marks.length,
    meanTouches: sumT / marks.length,
    maxTouches: maxT,
    everTouchedCount: everTouched,
  };
}

if (typeof module !== 'undefined') {
  module.exports = { makeRng, createMarks, decayStep, touchMark, findMarkNear, populationStats, EPS, RESILIENCE_GROWTH, RESILIENCE_CAP };
}
