// Ignis Fatuus: pure logic, no p5. Loaded by the page and testable from Node.

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// A wisp is brightest at the edge of attention and fades as you close on it.
function visibility(dist, near, far) {
  return smoothstep(near, far, dist);
}

// Push away from the seeker, stronger the closer it is; zero outside radius.
function fleeVector(wx, wy, sx, sy, radius, strength) {
  const dx = wx - sx, dy = wy - sy;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d >= radius || d === 0) return [0, 0];
  const k = strength * (1 - d / radius);
  return [dx / d * k, dy / d * k];
}

// Draining the marsh takes the lights faster than it takes the water.
function activeCount(maxN, drain) {
  return Math.round(maxN * Math.pow(1 - drain, 1.5));
}

// Noise level above which a cell counts as standing water.
function poolThreshold(drain) {
  return 0.52 + 0.4 * drain;
}

if (typeof module !== 'undefined') {
  module.exports = { smoothstep, visibility, fleeVector, activeCount, poolThreshold };
}
