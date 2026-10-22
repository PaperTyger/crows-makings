// Where It Was Held - pure logic, no p5. Exported for the sketch and for headless checks.
// A bowl is held by its foot and dipped rim-first into white slip. The line where the
// slip stops is the surface of the slip bucket, as the bowl saw it: tilted by the wrist,
// rippled by the hand not being perfectly still on the way out.

(function (root) {
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  // One bowl: its thrown shape, and how it was dipped.
  function makeBowl(seed, steadiness) {
    const r = rng(seed);
    const unsteady = 1 - steadiness; // 0 = a still hand, 1 = a shaky one
    const bowl = {
      seed,
      rimR: 0.92 + r() * 0.08,         // rim half-width, fraction of max
      footR: 0.30 + r() * 0.06,        // foot ring half-width
      footH: 0.10 + r() * 0.04,        // foot ring height, fraction of total
      flare: 0.35 + r() * 0.3,         // how fast the wall opens out
      rimWobble: [],                   // the rim isn't quite round
      dip: 0.58 + r() * 0.16,          // dipped to this fraction of the body, from the rim
      tilt: (r() - 0.5) * 0.10,        // the wrist's angle
      ripple: [],                      // the hand moving as it came out
      drips: [],
      speckles: [],
    };
    for (let k = 2; k <= 5; k++) bowl.rimWobble.push({ k, a: (r() * 0.008) / k, p: r() * 6.283 });
    // slow sway from the arm, then finer tremble from the fingers
    for (let i = 0; i < 3; i++) {
      const k = 1 + Math.floor(r() * 4);
      bowl.ripple.push({ k, a: (0.008 + unsteady * 0.05) * (0.5 + r() * 0.5) / k, p: r() * 6.283 });
    }
    for (let i = 0; i < 6; i++) {
      const k = 6 + Math.floor(r() * 30);
      bowl.ripple.push({ k, a: (0.0015 + unsteady * 0.012) * (0.3 + r() * 0.7) / Math.sqrt(k / 6), p: r() * 6.283 });
    }
    const nDrips = Math.round(1 + unsteady * 7 + r() * 2);
    for (let i = 0; i < nDrips; i++) {
      bowl.drips.push({
        theta: (r() - 0.5) * 3.0,
        len: 0.02 + r() * (0.03 + unsteady * 0.07),
        w: 0.022 + r() * 0.03,
      });
    }
    for (let i = 0; i < 260; i++) bowl.speckles.push({ theta: (r() - 0.5) * 3.14, h: r(), s: 0.4 + r() * 1.4 });
    return bowl;
  }

  // Half-width of the body at height h (0 = rim, 1 = bottom of foot), before the rim wobble.
  function profile(bowl, h) {
    const body = 1 - bowl.footH;
    if (h >= body) return bowl.footR * (1 - 0.06 * (h - body) / bowl.footH);
    const t = h / body; // 0 at rim, 1 where the wall meets the foot
    const curve = 1 - Math.pow(t, 1.1 + bowl.flare * 0.8);
    return bowl.footR * 0.92 + (bowl.rimR - bowl.footR * 0.92) * curve;
  }

  function rimOffset(bowl, theta) {
    let o = 0;
    for (const w of bowl.rimWobble) o += w.a * Math.sin(w.k * theta + w.p);
    return o;
  }

  // Where the slip stops, as height from the rim, at angle theta around the bowl.
  function slipLine(bowl, theta) {
    let h = bowl.dip * (1 - bowl.footH) + bowl.tilt * Math.sin(theta);
    for (const w of bowl.ripple) h += w.a * Math.sin(w.k * theta + w.p);
    return h;
  }

  // Extra slip reach below the line from drips, at angle theta. A run is a tongue: it leaves
  // the line wide and shallow, then narrows to a rounded end.
  function dripReach(bowl, theta) {
    let reach = 0;
    for (const d of bowl.drips) {
      const x = (theta - d.theta) / d.w;
      if (Math.abs(x) > 3) continue;
      const shoulder = 0.3 * d.len * Math.exp(-x * x / 2.5);            // where it pulls off the line
      const tongue = Math.abs(x) < 0.8 ? d.len * Math.sqrt(1 - (x / 0.8) ** 2) : 0;
      reach = Math.max(reach, shoulder, tongue);
    }
    return reach;
  }

  // How much slip covers the body at (theta, h): 1 full, 0 bare, soft at the edge.
  function coverage(bowl, theta, h, soft) {
    const line = slipLine(bowl, theta);
    const main = Math.max(0, Math.min(1, 0.5 + (line - h) / soft));
    // a run is a thinner coat than the dip, so it lets the clay through
    const run = Math.max(0, Math.min(1, 0.5 + (line + dripReach(bowl, theta) - h) / (soft * 1.5)));
    return Math.max(main, 0.55 * run);
  }

  // Crackle: a jittered-grid Worley distance gap (F2 - F1). Small = on a crack.
  function crackle(seed, x, y) {
    const cx = Math.floor(x), cy = Math.floor(y);
    let f1 = 9, f2 = 9;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const gx = cx + i, gy = cy + j;
      let hsh = (gx * 374761393 + gy * 668265263 + seed * 2246822519) >>> 0;
      hsh = ((hsh ^ (hsh >>> 13)) * 1274126177) >>> 0;
      const px = gx + (hsh & 1023) / 1024;
      const py = gy + ((hsh >>> 10) & 1023) / 1024;
      const dd = Math.hypot(x - px, y - py);
      if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) f2 = dd;
    }
    return f2 - f1;
  }

  // How far the line wanders, as a number for the readout: max minus min of slipLine.
  function lineSpread(bowl) {
    let lo = 9, hi = -9;
    for (let i = 0; i <= 200; i++) {
      const th = -Math.PI / 2 + Math.PI * i / 200;
      const h = slipLine(bowl, th);
      lo = Math.min(lo, h); hi = Math.max(hi, h);
    }
    return hi - lo;
  }

  const api = { rng, makeBowl, profile, rimOffset, slipLine, dripReach, coverage, crackle, lineSpread };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Held = api;
})(this);
