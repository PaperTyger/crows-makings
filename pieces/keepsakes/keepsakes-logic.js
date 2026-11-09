// Keepsakes — the rule, kept apart from the drawing so it can be run headless.
// A made-up rule, true of nothing: when a mark leaves, it hands its longest
// stroke(s) to the nearest mark still on the page, along with every keepsake it
// was holding. Nothing given is ever dropped.
(function (root) {
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  // ink tints: iron-gall brown, blue-black, vermilion, olive, lamp black, sepia, verdigris
  const INKS = [[52, 36, 24], [30, 38, 70], [150, 44, 30], [78, 72, 34], [26, 24, 28], [112, 74, 46], [44, 92, 84]];

  function makeMarks(seed, cols, rows, w, h) {
    const r = rng(seed);
    const marks = [];
    const cw = w / cols, ch = h / rows;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const id = marks.length;
        const x = (i + 0.5) * cw + (r() - 0.5) * cw * 0.45;
        const y = (j + 0.5) * ch + (r() - 0.5) * ch * 0.45;
        const ink = INKS[Math.floor(r() * INKS.length)];
        const ns = 2 + Math.floor(r() * 3);
        const strokes = [];
        for (let k = 0; k < ns; k++) {
          strokes.push({
            dx: (r() - 0.5) * cw * 0.28, dy: (r() - 0.5) * ch * 0.28,
            a: r() * Math.PI, len: cw * (0.12 + r() * 0.26),
            bend: (r() - 0.5) * 0.6, wt: 1.3 + r() * 2.0,
            ink: ink, from: id, t0: -1e9, fx: 0, fy: 0
          });
        }
        marks.push({ id: id, x: x, y: y, strokes: strokes, gone: false });
      }
    }
    marks.bounds = { w: w, h: h };
    return marks;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function order(seed, n) {
    const r = rng(seed * 7 + 3);
    const o = [];
    for (let i = 0; i < n; i++) o.push(i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = o[i]; o[i] = o[j]; o[j] = t;
    }
    return o;
  }

  function nearest(marks, m) {
    let best = null, bd = Infinity;
    for (const o of marks) {
      if (o.gone || o === m) continue;
      const d = (o.x - m.x) * (o.x - m.x) + (o.y - m.y) * (o.y - m.y);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }

  // m leaves; its `gifts` longest strokes go to the nearest remaining mark.
  // `now` stamps when each gift sets off, so a drawing can fly it across.
  function depart(marks, m, gifts, r, now) {
    m.gone = true;
    const recv = nearest(marks, m);
    if (!recv || gifts <= 0) return { recv: recv, given: [] };
    // keepsakes it was holding always go on; of its own strokes, the longest `gifts`
    const kept = m.strokes.filter(function (s) { return s.from !== m.id; });
    const own = m.strokes.filter(function (s) { return s.from === m.id; })
      .sort(function (a, b) { return b.len - a.len; });
    const given = kept.concat(own.slice(0, gifts));
    for (const s of given) {
      const rad = 3 + Math.sqrt(recv.strokes.length) * 4.5;
      const ang = r() * Math.PI * 2;
      let dx = Math.cos(ang) * rad, dy = Math.sin(ang) * rad;
      if (marks.bounds) {
        // keep the nest on the page and round: near an edge it grows inward,
        // its centre moving off the edge as its radius gets bigger
        const pad = rad + 10 + s.len / 2;
        dx += clamp(recv.x, pad, marks.bounds.w - pad) - recv.x;
        dy += clamp(recv.y, pad, marks.bounds.h - pad) - recv.y;
      }
      recv.strokes.push(Object.assign({}, s, {
        dx: dx, dy: dy,
        t0: now, fx: m.x + s.dx, fy: m.y + s.dy
      }));
    }
    m.strokes = m.strokes.filter(function (s) { return given.indexOf(s) < 0; });
    return { recv: recv, given: given };
  }

  function summarise(marks) {
    const left = marks.filter(function (m) { return !m.gone; });
    const last = left.length === 1 ? left[0] : null;
    const hands = last ? new Set(last.strokes.map(function (s) { return s.from; })).size : 0;
    return { remaining: left.length, last: last, strokes: last ? last.strokes.length : 0, hands: hands };
  }

  function simulate(seed, cols, rows, w, h, gifts) {
    const marks = makeMarks(seed, cols, rows, w, h);
    const o = order(seed, marks.length);
    const r = rng(seed * 13 + 5);
    for (let i = 0; i < o.length - 1; i++) depart(marks, marks[o[i]], gifts, r, i);
    return summarise(marks);
  }

  const api = { rng: rng, makeMarks: makeMarks, order: order, nearest: nearest, depart: depart, summarise: summarise, simulate: simulate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Keepsakes = api;
})(typeof window !== 'undefined' ? window : this);
