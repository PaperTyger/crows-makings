// Which Way It Went: pure logic, no p5. Runs in the page and under Node.
// Linearised Whipple bicycle, Meijaard et al. 2007 benchmark parameters:
//   M q'' + v C1 q' + (g K0 + v^2 K2) q = 0,  q = [lean, steer]
// Self-stable between the weave speed (~4.29 m/s) and capsize speed (~6.02 m/s).
(function (root) {
  const M = [[80.81722, 2.31941332208709], [2.31941332208709, 0.29784188199686]];
  const C1 = [[0, 33.86641391492494], [-0.85035641456978, 1.68540397397560]];
  const K0 = [[-80.95, -2.59951685249872], [-2.59951685249872, -0.80329488458618]];
  const K2 = [[0, 76.59734589573222], [0, 2.65431523794604]];
  const G = 9.81, WHEELBASE = 1.02, LAMBDA = Math.PI / 10;
  const det = M[0][0] * M[1][1] - M[0][1] * M[1][0];
  const Mi = [[M[1][1] / det, -M[0][1] / det], [-M[1][0] / det, M[0][0] / det]];

  // state: [lean, steer, leanRate, steerRate]
  function deriv(s, v) {
    const q = [s[0], s[1]], qd = [s[2], s[3]];
    const f = [0, 0];
    for (let i = 0; i < 2; i++) {
      f[i] = -(v * (C1[i][0] * qd[0] + C1[i][1] * qd[1]) +
               (G * K0[i][0] + v * v * K2[i][0]) * q[0] +
               (G * K0[i][1] + v * v * K2[i][1]) * q[1]);
    }
    return [qd[0], qd[1], Mi[0][0] * f[0] + Mi[0][1] * f[1], Mi[1][0] * f[0] + Mi[1][1] * f[1]];
  }

  function rk4(s, v, dt) {
    const add = (a, b, k) => a.map((x, i) => x + b[i] * k);
    const k1 = deriv(s, v), k2 = deriv(add(s, k1, dt / 2), v);
    const k3 = deriv(add(s, k2, dt / 2), v), k4 = deriv(add(s, k3, dt), v);
    return s.map((x, i) => x + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  }

  // One coasting run. push = sideways lean rate given at release (rad/s).
  function simulate(opt) {
    const dt = 0.005, FALL = 0.5;
    let v = opt.v0, x = opt.x, y = opt.y, psi = opt.heading;
    let s = [0, 0, opt.push, 0];
    const rear = [[x, y]], front = [];
    const fwd = () => [x + WHEELBASE * Math.cos(psi), y + WHEELBASE * Math.sin(psi)];
    front.push(fwd());
    let t = 0, minLean = 0, recovered = false, peak = Math.abs(opt.push);
    while (t < 60) {
      s = rk4(s, v, dt);
      psi += v * s[1] * Math.cos(LAMBDA) / WHEELBASE * dt;
      x += v * Math.cos(psi) * dt;
      y += v * Math.sin(psi) * dt;
      v = Math.max(0, v - (0.08 + 0.004 * v * v) * dt); // rolling drag + air
      t += dt;
      if (Math.round(t / dt) % 4 === 0) { rear.push([x, y]); front.push(fwd()); }
      if (t > 1.0 && Math.abs(s[0]) < 0.01 && Math.abs(s[2]) < 0.02) recovered = true;
      if (Math.abs(s[0]) > FALL || v < 0.3) break;
    }
    return {
      rear, front, t, vEnd: v,
      fallSide: Math.sign(s[0]) || 1, heading: psi,
      fell: Math.abs(s[0]) > FALL, recovered,
      distance: rear.reduce((d, p, i) => i ? d + Math.hypot(p[0] - rear[i - 1][0], p[1] - rear[i - 1][1]) : 0, 0),
    };
  }

  // Seeded field of runs.
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function field(seed, push, n, W, H) {
    const r = mulberry32(seed);
    const runs = [];
    for (let i = 0; i < n; i++) {
      const v0 = 3 + r() * 4.5;
      runs.push(Object.assign(simulate({
        v0, x: r() * W, y: r() * H, heading: r() * Math.PI * 2,
        push: push * (r() < 0.5 ? -1 : 1) * (0.6 + 0.8 * r()),
      }), { v0 }));
    }
    return runs;
  }

  function stats(runs) {
    const n = runs.length;
    return {
      n,
      recovered: runs.filter(r => r.recovered).length,
      meanDistance: runs.reduce((a, r) => a + r.distance, 0) / n,
      meanTime: runs.reduce((a, r) => a + r.t, 0) / n,
    };
  }

  const api = { simulate, field, stats, mulberry32, WHEELBASE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WhichLogic = api;
})(this);
