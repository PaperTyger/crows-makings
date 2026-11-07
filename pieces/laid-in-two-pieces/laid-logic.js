// A name laid in two pieces: pure tile logic, no p5, no DOM.
// Two crews lay one cartoon on two grids that meet at a straight joint.
(function (root) {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // The joint: a straight line, slightly off vertical.
  function seamX(y, p) { return p.seam + (y - p.H / 2) * p.seamTilt; }

  // Crew B's set-up, all driven by one "slip" in 0..1.
  function crewB(p) {
    const s = p.s, k = p.slip;
    return {
      angle: k * 0.018,                       // ~1 degree at full slip
      phase: { x: s * 0.55 * k, y: s * 0.43 * k },
      cartoon: { x: k * s * 1.1, y: k * s * 0.55 } // their copy of the drawing sat here
    };
  }

  // side: -1 = crew A (left of the joint), +1 = crew B (right).
  function buildSection(p, side, inside) {
    const s = p.s, cx = p.W / 2, cy = p.H / 2;
    const set = side < 0 ? { angle: 0, phase: { x: 0, y: 0 }, cartoon: { x: 0, y: 0 } } : crewB(p);
    const rng = mulberry32((p.seed * 2654435761 + (side < 0 ? 17 : 71)) >>> 0);
    const ca = Math.cos(set.angle), sa = Math.sin(set.angle);
    const R = Math.ceil(Math.hypot(p.W, p.H) / s / 2) + 2;
    const tiles = [];
    for (let j = -R; j <= R; j++) {
      for (let i = -R; i <= R; i++) {
        const u = i * s + set.phase.x, v = j * s + set.phase.y;
        const x = cx + u * ca - v * sa, y = cy + u * sa + v * ca;
        if (x < -s || x > p.W + s || y < -s || y > p.H + s) continue;
        const f = x - seamX(y, p);
        if (side < 0 && f > s) continue;
        if (side > 0 && f < -s) continue;
        // Each crew squares its copy of the drawing to its own grid, so the
        // drawing is read in the crew's frame, not the room's.
        const ink = inside(cx + u - set.phase.x - set.cartoon.x,
                           cy + v - set.phase.y - set.cartoon.y);
        tiles.push({
          x, y, i, j, ink,
          rot: set.angle + (rng() - 0.5) * 0.12,
          size: s * (0.8 + rng() * 0.1),
          jit: [0, 1, 2, 3, 4, 5, 6, 7].map(() => (rng() - 0.5) * s * 0.12),
          tone: rng()
        });
      }
    }
    // Laying order: A from the left door, B from the right, so they meet at the joint.
    tiles.sort((a, b) => side < 0 ? (a.j - b.j) || (a.i - b.i) : (a.j - b.j) || (b.i - a.i));
    return { side, tiles, set };
  }

  // How many letter tiles change colour between "where crew A's cartoon says"
  // and "where crew B laid them": the size of the mistake, as a number.
  function seamMismatch(sectionB, inside) {
    let n = 0, ink = 0;
    for (const t of sectionB.tiles) {
      if (t.ink) ink++;
      if (t.ink !== inside(t.x, t.y)) n++;
    }
    return { mismatched: n, inkTiles: ink, total: sectionB.tiles.length };
  }

  const api = { mulberry32, seamX, crewB, buildSection, seamMismatch };
  if (typeof module !== 'undefined') module.exports = api;
  else root.LaidLogic = api;
})(this);
