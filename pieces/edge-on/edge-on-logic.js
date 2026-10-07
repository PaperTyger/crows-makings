// Edge-on — pure logic, no p5. A thin absorbing veil, folded in air, seen from a tilt.
// The veil's colour is never painted. Each patch of veil deposits its own area into the
// pixel it projects onto; where the sheet faces you its area spreads over many pixels,
// where it turns edge-on the same area crowds into a few. So per-pixel optical depth
// comes out as thickness / |cos(view angle)| without ever computing an angle.
// Absorption is Chappuis-shaped: red and green go, blue mostly stays.

const EdgeOn = (() => {
  const K = [1.0, 0.72, 0.10];          // relative absorption, R G B
  const BG = [244, 239, 230];           // warm daylight paper

  // the veil: z = f(u, v, t). Two slow folds and a long drape.
  function height(u, v, t) {
    return 0.22 * Math.sin(2.1 * u + 0.9 * v + 0.35 * t)
         + 0.16 * Math.sin(3.3 * v - 1.4 * u - 0.22 * t + 1.7)
         + 0.10 * Math.sin(5.2 * u + 0.3 * t + 0.4) * Math.cos(1.1 * v)
         + 0.25 * (u * u - 0.5) * 0.4;
  }

  // soft window so the veil has no hem
  function hemless(u, v) {
    // irregular, so the veil seen face-on is not a square of paper
    const a = Math.atan2(v, u);
    const r = Math.hypot(u, v) * (1 + 0.14 * Math.sin(3 * a + 0.7) + 0.08 * Math.sin(5 * a - 1.3));
    const s = Math.min(1, Math.max(0, (1.05 - r) / 0.45));
    return s * s * (3 - 2 * s);
  }

  // optical depth buffer, W x H. tilt = rotation about x (radians), az = about z.
  function depth(W, H, n, t, tilt, az, thickness) {
    const D = new Float32Array(W * H);
    const h = 2 / (n - 1), eps = 1e-3;
    const ca = Math.cos(az), sa = Math.sin(az), ct = Math.cos(tilt), st = Math.sin(tilt);
    const scale = Math.min(W, H) * 0.36;
    const pixelArea = 1 / (scale * scale);
    for (let i = 0; i < n; i++) {
      const u = -1 + i * h;
      for (let j = 0; j < n; j++) {
        const v = -1 + j * h;
        const z = height(u, v, t);
        // surface area element dA = sqrt(1 + fu^2 + fv^2) du dv
        const fu = (height(u + eps, v, t) - z) / eps;
        const fv = (height(u, v + eps, t) - z) / eps;
        const dA = Math.sqrt(1 + fu * fu + fv * fv) * h * h;
        // rotate: azimuth about z, then tilt about x; orthographic, view along -z'
        const x1 = ca * u - sa * v, y1 = sa * u + ca * v;
        const y2 = ct * y1 - st * z;
        const px = Math.round(W / 2 + x1 * scale);
        const py = Math.round(H / 2 + y2 * scale);
        if (px < 0 || py < 0 || px >= W || py >= H) continue;
        D[py * W + px] += thickness * dA * hemless(u, v) / pixelArea;
      }
    }
    return D;
  }

  // three-tap box blur, twice: sampling grain off, folds kept
  function soften(D, W, H, passes) {
    let a = D, b = new Float32Array(W * H);
    for (let p = 0; p < passes; p++) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let s = 0, c = 0;
        for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx >= 0 && xx < W) { s += a[y * W + xx]; c++; } }
        b[y * W + x] = s / c;
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let s = 0, c = 0;
        for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy >= 0 && yy < H) { s += b[yy * W + x]; c++; } }
        a[y * W + x] = s / c;
      }
    }
    return a;
  }

  function shade(d, strength) {
    return [0, 1, 2].map(c => BG[c] * Math.exp(-K[c] * strength * d));
  }

  return { depth, soften, shade, BG, K };
})();

if (typeof module !== 'undefined') module.exports = EdgeOn;
