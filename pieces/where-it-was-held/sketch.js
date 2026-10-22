// Where It Was Held - p5 wiring. All the shape and slip logic lives in held-logic.js.

const W = 720, H = 560;
const CX = 360, RIM_Y = 200, BODY_H = 250, R_PX = 250;
let seed = 1021;
let bowl;

function setup() {
  const c = createCanvas(W, H);
  c.parent('canvas-holder');
  pixelDensity(1);
  noLoop();
  document.getElementById('still').addEventListener('input', rebuild);
  document.getElementById('reseed').addEventListener('click', () => { seed = Math.floor(Math.random() * 1e9); rebuild(); });
  rebuild();
}

function rebuild() {
  const steadiness = parseFloat(document.getElementById('still').value);
  bowl = Held.makeBowl(seed, steadiness);
  redraw();
  const pct = Math.round(bowl.dip * 100);
  const mm = (Held.lineSpread(bowl) * 150).toFixed(1);
  document.getElementById('readout').innerHTML =
    `dipped about ${pct}% of the way to the foot<br>the line wanders over ${mm} mm`;
}

function mix(a, b, t) { return a + (b - a) * t; }

function draw() {
  const rimR = bowl.rimR * R_PX;
  const e = rimR * 0.16;            // how much of the opening we see from slightly above
  const footY = RIM_Y + BODY_H + e * (bowl.footR / bowl.rimR);
  loadPixels();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // museum ground: a soft grey sweep, with the bowl's shadow under it
      const g = 150 - 34 * (y / H);
      const sx = (x - CX - 46) / 300, sy = (y - footY - 4) / 34;
      const shadow = Math.exp(-(sx * sx + sy * sy) * 1.6) * 0.42;
      let r = g * (1 - shadow), gg = (g - 2) * (1 - shadow), b = (g - 6) * (1 - shadow);

      const dx = x - CX;
      const ex = dx / rimR, ey = (y - RIM_Y) / e;
      const inOpening = ex * ex + ey * ey < 1;
      const frontRimY = RIM_Y + e * Math.sqrt(Math.max(0, 1 - ex * ex));

      if (inOpening) {
        // inside of the bowl: all slip, lit at the back wall, shadowed toward us
        const back = 1 - (ey + 1) / 2;
        let shade = 0.5 + 0.38 * back;
        const lip = Math.max(0, 1 - Math.abs(Math.sqrt(ex * ex + ey * ey) - 0.985) / 0.02);
        shade += lip * 0.12 * (ey < 0 ? 1 : 0.3);
        // crazing, warped so the cells aren't even, and fainter in the shadow
        const wx = ex * 22 + 40 + 0.6 * Math.sin(ey * 5.1 + ex * 3.3), wy = ey * 6 + 40 + 0.6 * Math.sin(ex * 7.7);
        const cr = Held.crackle(bowl.seed, wx, wy);
        if (cr < 0.03) shade -= 0.045 * back * (1 - cr / 0.03);
        r = 232 * shade; gg = 226 * shade; b = 212 * shade;
      } else if (y >= frontRimY - 1) {
        // outer wall: solve for the height h on the bowl and the angle around it
        let h = (y - RIM_Y) / BODY_H, u = 0, ok = true;
        for (let k = 0; k < 4; k++) {
          const w = Held.profile(bowl, Math.min(1, Math.max(0, h))) * R_PX;
          u = dx / w;
          if (Math.abs(u) >= 1) { ok = false; break; }
          const cosT = Math.sqrt(1 - u * u);
          h = (y - RIM_Y - e * (w / rimR) * cosT) / BODY_H;
        }
        if (ok && h <= 1) {
          const theta = Math.asin(u);
          if (h >= Held.rimOffset(bowl, theta) - 0.002) {
            const w = Held.profile(bowl, Math.min(1, Math.max(0, h))) * R_PX;
            const edge = Math.min(1, (1 - Math.abs(u)) * w * 0.9); // soft silhouette, about a pixel
            const light = 0.42 + 0.58 * Math.max(0, Math.cos(theta + 0.55));
            const tuck = 1 - 0.2 * Math.max(0, Math.min(1, (h - 0.6) / 0.3)); // the wall turns under toward the foot
            const shade = light * tuck;

            const soft = 0.006 + 0.028 * Math.pow(Math.abs(Math.sin(theta * 5 + bowl.seed) * Math.sin(theta * 13 + 1.7)), 0.7);
            const cov = h > 1 - bowl.footH ? 0 : Held.coverage(bowl, theta, h, soft);

            // stoneware: warm grey with a little grit; the foot is raw and catches some iron
            const grit = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
            const n = (grit - Math.floor(grit)) * 14 - 7;
            let cr = 128 + n, cg = 121 + n, cb = 110 + n;
            if (h > 1 - bowl.footH) { cr += 22; cg += 8; cb -= 4; }

            // slip: white, thinner and greyer at its edge, crazed
            let sr = 236, sg = 231, sb = 218;
            const thin = Math.max(0, 1 - cov * 3);
            sr = mix(sr, 176, thin); sg = mix(sg, 178, thin); sb = mix(sb, 172, thin);
            const wt = theta * 16 + 20 + 0.5 * Math.sin(h * 40 + theta * 3), wh = h * 44 + 20 + 0.5 * Math.sin(theta * 23);
            const crk = Held.crackle(bowl.seed, wt, wh);
            if (crk < 0.03) { const d = 0.08 * (1 - crk / 0.03); sr *= 1 - d; sg *= 1 - d; sb *= 1 - d * 0.7; }

            const br = mix(cr, sr, cov) * shade, bg = mix(cg, sg, cov) * shade, bb = mix(cb, sb, cov) * shade;
            r = mix(r, br, edge); gg = mix(gg, bg, edge); b = mix(b, bb, edge);
          }
        }
      }
      const i = 4 * (y * W + x);
      pixels[i] = r; pixels[i + 1] = gg; pixels[i + 2] = b; pixels[i + 3] = 255;
    }
  }
  updatePixels();

  // iron speckle, in the clay and showing through the slip
  noStroke();
  for (const s of bowl.speckles) {
    if (Math.abs(s.theta) > 1.45) continue;
    const hh = s.h * 0.97;
    const w = Held.profile(bowl, hh) * R_PX;
    const px = CX + w * Math.sin(s.theta);
    const py = RIM_Y + hh * BODY_H + e * (w / rimR) * Math.cos(s.theta);
    const under = hh < Held.slipLine(bowl, s.theta);
    fill(70, 58, 48, under ? 70 : 150);
    circle(px, py, s.s);
  }
}
