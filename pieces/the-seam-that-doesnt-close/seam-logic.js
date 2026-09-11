// seam-logic.js — pure, DOM-free lattice logic for "The Seam That Doesn't Close"
// No p5, no window, no DOM. Exported for both the browser sketch and the
// node verify.js test, so the math is checked identically to how it renders.

function latticePoints(rotationRad, range, spacing) {
  // Square lattice at integer multiples of `spacing`, rotated by rotationRad
  // about the origin, kept within +-range in both x and y.
  const pts = [];
  const n = Math.ceil(range / spacing) + 1;
  const cos = Math.cos(rotationRad), sin = Math.sin(rotationRad);
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const x0 = i * spacing, y0 = j * spacing;
      const x = x0 * cos - y0 * sin;
      const y = x0 * sin + y0 * cos;
      if (Math.abs(x) <= range && Math.abs(y) <= range) pts.push([x, y]);
    }
  }
  return pts;
}

function nearestDist(pt, others) {
  let best = Infinity;
  for (let k = 0; k < others.length; k++) {
    const o = others[k];
    const dx = pt[0] - o[0], dy = pt[1] - o[1];
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < best) best = d;
  }
  return best;
}

function seamResidual(rotationRad, range, spacing) {
  // Mean nearest-neighbor distance from lattice A (unrotated, "the birds")
  // to lattice B (rotated by rotationRad, "the plaid"), normalized by
  // spacing so the number reads as a fraction of one grid cell: ~0 means
  // the two grammars have realigned, larger means the seam is open.
  const a = latticePoints(0, range, spacing);
  const b = latticePoints(rotationRad, range, spacing);
  let sum = 0;
  for (let k = 0; k < a.length; k++) sum += nearestDist(a[k], b);
  return (sum / a.length) / spacing;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { latticePoints, nearestDist, seamResidual };
}
