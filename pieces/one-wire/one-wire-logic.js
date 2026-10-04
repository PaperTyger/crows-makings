// One Wire Over All of Them — pure logic, no p5.
// Seattle, NOAA station 9447130, harmonic constants (metres, degrees, degrees/hour),
// fetched 2026-10-03. Phases are used as each crank's starting angle; no
// astronomical arguments are applied, so the trace has Seattle's shape but is
// not set to any calendar date.

const SEATTLE = [
  { name: 'M2', amp: 1.063, phase: 10.8,  speed: 28.984104 },
  { name: 'K1', amp: 0.834, phase: 276.8, speed: 15.041069 },
  { name: 'O1', amp: 0.459, phase: 254.6, speed: 13.943035 },
  { name: 'S2', amp: 0.268, phase: 36.8,  speed: 30.0 },
  { name: 'P1', amp: 0.257, phase: 276.2, speed: 14.958931 },
  { name: 'N2', amp: 0.214, phase: 341.1, speed: 28.43973 },
  { name: 'M4', amp: 0.021, phase: 200.7, speed: 57.96821 },
];

const GEOM = {
  crankY: 120,        // wheel centres
  pxPerMetre: 24,     // crank throw scale
  rodLen: 150,        // yoke to moving pulley
  fixedY: 375,        // fixed pulley row
  pulleyR: 13,
  x0: 80, dx: 112,    // crank spacing
  anchor: { x: 30, y: 375 },
  guide: { x: 880, y: 70, r: 15 },
  blockTop: { x: 935, y: 70 }, // dead end of the wire, above the pen block
};

function crankX(i) { return GEOM.x0 + i * GEOM.dx; }
function fixedX(i) { return crankX(i) + GEOM.dx / 2; }

// angle in degrees of crank i at hour t; a disengaged crank is held at its
// neutral (pin level with the axle), so it adds nothing.
function crankAngle(c, t, engaged) {
  return engaged ? c.speed * t - c.phase : 0;
}

// vertical displacement of crank pin (screen px, +down) — scotch yoke
function pinDy(c, t, engaged) {
  const a = crankAngle(c, t, engaged) * Math.PI / 180;
  return -c.amp * GEOM.pxPerMetre * Math.cos(a) * (engaged ? 1 : 0);
}

// Wire path as a polyline of points: anchor, then over each moving pulley
// (top) and under each fixed pulley (bottom), then over the guide.
function wirePath(cons, t, nEngaged) {
  const R = GEOM.pulleyR;
  const pts = [{ x: GEOM.anchor.x, y: GEOM.anchor.y }];
  cons.forEach((c, i) => {
    const my = GEOM.crankY + pinDy(c, t, i < nEngaged) + GEOM.rodLen;
    const mx = crankX(i);
    pts.push({ x: mx - R, y: my }, { x: mx, y: my - R }, { x: mx + R, y: my });
    const fx = fixedX(i);
    pts.push({ x: fx - R, y: GEOM.fixedY }, { x: fx, y: GEOM.fixedY + R }, { x: fx + R, y: GEOM.fixedY });
  });
  const g = GEOM.guide;
  pts.push({ x: g.x - g.r, y: g.y }, { x: g.x, y: g.y - g.r }, { x: g.x + g.r, y: g.y });
  return pts;
}

function polyLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return L;
}

// The wire is one fixed length. Whatever the cranks and pulleys don't take
// hangs in a loop under the pen block and back up to the dead end, so the
// block drops by half of what is left over (a 2:1 reduction).
const WIRE_TOTAL = 3020;
function penBlockY(cons, t, nEngaged) {
  const left = WIRE_TOTAL - polyLength(wirePath(cons, t, nEngaged));
  return GEOM.guide.y + left / 2;
}

if (typeof module !== 'undefined') {
  module.exports = { SEATTLE, GEOM, crankX, fixedX, crankAngle, pinDy, wirePath, polyLength, penBlockY, WIRE_TOTAL };
}
