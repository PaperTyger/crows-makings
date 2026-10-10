// Where It Was — pure river-migration logic, no p5, no DOM.
// A centreline migrates sideways at a rate set by its own curvature, weighted
// toward curvature upstream (Howard & Knutson 1984's simplification of the
// Ikeda-Parker-Sawai bend theory): erosion peaks past each bend's apex, so
// bends grow and travel downstream. When a neck closes, the loop is cut off
// and handed back as an oxbow.

(function (root) {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeRiver(W, H, seed) {
    const rand = mulberry32(seed >>> 0);
    const ds = 6;
    const pts = [];
    for (let x = -420; x <= W + 320; x += ds) {   // rises and ends off the frame, so it arrives already bending and its bends can leave
      pts.push({ x: x, y: H / 2 + (rand() - 0.5) * 3 });
    }
    return { pts: pts, ds: ds, W: W, H: H, rand: rand, steps: 0, cutoffs: 0 };
  }

  function boxSmooth(a, k) {
    const n = a.length, out = new Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0, m = 0;
      for (let j = Math.max(0, i - k); j <= Math.min(n - 1, i + k); j++) { s += a[j]; m++; }
      out[i] = s / m;
    }
    return out;
  }

  function curvatures(pts) {
    const n = pts.length, c = new Array(n).fill(0);
    for (let i = 1; i < n - 1; i++) {
      const ax = pts[i].x - pts[i - 1].x, ay = pts[i].y - pts[i - 1].y;
      const bx = pts[i + 1].x - pts[i].x, by = pts[i + 1].y - pts[i].y;
      const cross = ax * by - ay * bx, dot = ax * bx + ay * by;
      const ang = Math.atan2(cross, dot);
      const len = 0.5 * (Math.hypot(ax, ay) + Math.hypot(bx, by));
      c[i] = ang / (len || 1);
    }
    return c;
  }

  function resample(pts, ds) {
    const out = [{ x: pts[0].x, y: pts[0].y }];
    let need = ds;                                // arc length still owed before the next sample
    for (let i = 1; i < pts.length; i++) {
      let ax = pts[i - 1].x, ay = pts[i - 1].y;
      const bx = pts[i].x, by = pts[i].y;
      let seg = Math.hypot(bx - ax, by - ay);
      while (seg >= need) {
        const t = need / seg;
        ax += (bx - ax) * t; ay += (by - ay) * t;
        out.push({ x: ax, y: ay });
        seg -= need;
        need = ds;
      }
      need -= seg;
    }
    const last = pts[pts.length - 1];
    // the mouth is pinned: never let it be rounded away, or it creeps upstream a pixel a step
    if (Math.hypot(out[out.length - 1].x - last.x, out[out.length - 1].y - last.y) < ds * 0.3) out.pop();
    out.push({ x: last.x, y: last.y });
    return out;
  }

  // bank: 0 (loose sand) .. 1 (rooted, cohesive). Returns any oxbows cut this step.
  function step(r, bank) {
    const pts = r.pts, n = pts.length, ds = r.ds;
    const c = boxSmooth(curvatures(pts), 4);
    const decay = Math.exp(-ds / 40);            // upstream memory, ~40 px
    const omega = -1.0, gamma = 2.5;
    const E = 1 - 0.8 * bank;                    // erodibility
    const noise = 3.0 * (1 - bank) + 0.4;
    let acc = 0, wsum = 0;
    let move = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      acc = acc * decay + c[i];
      wsum = wsum * decay + 1;
      const R = omega * c[i] + gamma * acc / wsum;
      move[i] = E * R * 70 + (r.rand() - 0.5) * noise;
    }
    move = boxSmooth(move, 6);                   // the noise becomes a slow wobble, not grit
    for (let i = 0; i < n; i++) move[i] = Math.max(-1.2, Math.min(1.2, move[i]));
    const next = [];
    for (let i = 0; i < n; i++) {
      if (i < 2 || i > n - 3) { next.push({ x: pts[i].x, y: pts[i].y }); continue; }
      const tx = pts[i + 1].x - pts[i - 1].x, ty = pts[i + 1].y - pts[i - 1].y;
      const tl = Math.hypot(tx, ty) || 1;
      const nx = -ty / tl, ny = tx / tl;
      let x = pts[i].x - nx * move[i], y = pts[i].y - ny * move[i];
      // the valley walls lean back rather than stop it dead
      const band = 70;
      if (y < band) y += (band - y) * 0.04;
      if (y > r.H - band) y -= (y - (r.H - band)) * 0.04;
      y = Math.max(6, Math.min(r.H - 6, y));
      next.push({ x: x, y: y });
    }
    // light smoothing so the line stays a river, not a seismograph
    for (let k = 2; k < next.length - 2; k++) {
      next[k].x = 0.92 * next[k].x + 0.04 * (next[k - 1].x + next[k + 1].x);
      next[k].y = 0.92 * next[k].y + 0.04 * (next[k - 1].y + next[k + 1].y);
    }
    r.pts = resample(next, ds);
    r.steps++;
    return cutoff(r);
  }

  function cutoff(r) {
    const pts = r.pts, cut = [], minGap = 12, neck = 11;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + minGap; j < pts.length; j++) {
        const dx = pts[j].x - pts[i].x, dy = pts[j].y - pts[i].y;
        if (dx * dx + dy * dy < neck * neck) {
          cut.push(pts.slice(i, j + 1));
          r.pts = pts.slice(0, i + 1).concat(pts.slice(j));
          r.cutoffs++;
          return cut.concat(cutoff(r));
        }
      }
    }
    return cut;
  }

  function sinuosity(r) {
    let L = 0;
    const p = r.pts;
    for (let i = 1; i < p.length; i++) L += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
    return L / Math.hypot(p[p.length - 1].x - p[0].x, p[p.length - 1].y - p[0].y);
  }

  const api = { makeRiver: makeRiver, step: step, curvatures: curvatures, sinuosity: sinuosity, resample: resample };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WhereItWas = api;
})(this);
