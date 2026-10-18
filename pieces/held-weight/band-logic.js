// Held Weight — pure logic, no p5. Loaded by the page and by a Node check.
//
// A band of rubber is a tangle of long chains. Hang a weight on it and the
// chains get pulled straighter; the only thing pulling back is their jiggling,
// which is why the pull grows with temperature (Gough 1805, Joule 1850s).
// Ordinary thermal expansion pushes the other way. At a light load expansion
// wins and the band lengthens when heated; at a heavy load the entropic pull
// wins and the band lifts its weight. The crossover is thermoelastic inversion.

var BAND = {
  L0: 150,      // unloaded length, px, at T0
  T0: 293,      // reference temperature, K
  alpha: 0.0009, // linear expansion per K (exaggerated so it is visible)
  stiff: 0.32   // entropic compliance: px of stretch per (unit load / unit T)
};

// Equilibrium length for a load (0..1) at temperature T (K).
// Expansion term grows with T; entropic stretch shrinks with T (force ~ kT).
function equilibriumLength(load, T) {
  var expansion = BAND.L0 * (1 + BAND.alpha * (T - BAND.T0));
  var stretch = BAND.stiff * load * 1000 * (BAND.T0 / T);
  return expansion + stretch;
}

// dL/dT at a given load: positive means it lengthens when warmed.
function lengthSlope(load, T) {
  var h = 0.5;
  return (equilibriumLength(load, T + h) - equilibriumLength(load, T - h)) / (2 * h);
}

// The load at which heating stops lengthening the band and starts shortening it.
function inversionLoad(T) {
  var lo = 0, hi = 1;
  for (var i = 0; i < 40; i++) {
    var mid = (lo + hi) / 2;
    if (lengthSlope(mid, T) > 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// Brownian bridge: turn raw step increments into a walk that starts at a and
// ends at b. Returns an array of {x, y} with steps.length + 1 points.
function bridge(steps, a, b) {
  var n = steps.length, sx = 0, sy = 0, i;
  for (i = 0; i < n; i++) { sx += steps[i].x; sy += steps[i].y; }
  var dx = (b.x - a.x - sx) / n, dy = (b.y - a.y - sy) / n;
  var pts = [{ x: a.x, y: a.y }], x = a.x, y = a.y;
  for (i = 0; i < n; i++) {
    x += steps[i].x + dx; y += steps[i].y + dy;
    pts.push({ x: x, y: y });
  }
  return pts;
}

// Ornstein-Uhlenbeck nudge on each increment; warmer = livelier and wider.
function jiggle(steps, T, rand) {
  var sigma = 1.6 * Math.sqrt(T / BAND.T0);
  for (var i = 0; i < steps.length; i++) {
    steps[i].x += -0.08 * steps[i].x + 0.55 * sigma * rand();
    steps[i].y += -0.08 * steps[i].y + 0.55 * sigma * rand();
  }
}

if (typeof module !== 'undefined') {
  module.exports = { BAND: BAND, equilibriumLength: equilibriumLength, lengthSlope: lengthSlope,
                     inversionLoad: inversionLoad, bridge: bridge, jiggle: jiggle };
}
