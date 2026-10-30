// Pure wave-field logic: no p5, no DOM. Runnable in Node for verification.
// An easterly swell travels west across the field. Two atolls, one north of
// the other, each reflect a fraction of it back as a circular wave and cast
// a lee shadow that diffraction slowly fills in.

const BuoyLogic = (() => {
  const K = (2 * Math.PI) / 26;   // swell wavenumber, in grid cells
  const W = 0.09;                 // angular speed per frame
  const SPREAD = [[0, 0.6, 0], [0.13, 0.25, 1.7], [-0.17, 0.2, 4.1]];

  function makeAtolls(n) {
    // n x n grid; the two atolls sit on one meridian, a little east of centre
    const x = n * 0.56;
    return [
      { x, y: n * 0.27, r: n * 0.035 },
      { x, y: n * 0.73, r: n * 0.035 },
    ];
  }

  // Lee shadow: strongest just west of the atoll, widening and weakening downstream
  function shadow(px, py, a) {
    const dx = a.x - px;              // distance west of the atoll
    if (dx <= 0) return 1;
    const w = a.r + dx * 0.22;        // diffraction widens it
    const depth = 0.75 * Math.exp(-dx / 90);
    return 1 - depth * Math.exp(-(((py - a.y) / w) ** 2));
  }

  function height(px, py, t, refl, atolls) {
    let s = 1;
    for (const a of atolls) s *= shadow(px, py, a);
    // incident: crests move toward -x as t grows. Three components a few
    // degrees apart, so crests come in lengths instead of endless stripes.
    let h = 0;
    for (const [ang, amp, ph] of SPREAD) {
      const kx = K * Math.cos(ang), ky = K * Math.sin(ang);
      h += amp * Math.cos(kx * px + ky * py + W * t + ph);
    }
    h *= s;
    for (const a of atolls) {
      const dx = px - a.x, dy = py - a.y;
      const r = Math.hypot(dx, dy);
      if (r < a.r) continue;
      // reflected off the windward (east) face, so it is strongest heading back east
      const dir = 0.5 * (1 + dx / r);
      const decay = 1 / Math.sqrt(1 + (r - a.r) / 12);
      h += refl * dir * decay * Math.cos(K * a.x + W * t - K * (r - a.r));
    }
    return h;
  }

  // 0 = open sea, 1 = reef/sand rim, 2 = lagoon. Atolls are stretched
  // north-south and their rims are ragged.
  function landKind(px, py, atolls, wobble) {
    for (const a of atolls) {
      const dx = (px - a.x) * 1.5, dy = py - a.y;
      const ang = Math.atan2(dy, dx);
      const rr = a.r * 1.9 * (1 + 0.45 * wobble(ang, a));
      const d = Math.hypot(dx, dy);
      if (d < rr * 0.62) return 2;
      if (d < rr) return 1;
    }
    return 0;
  }

  return { K, W, makeAtolls, shadow, height, landKind };
})();

if (typeof module !== 'undefined') module.exports = BuoyLogic;
