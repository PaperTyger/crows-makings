// Pure flight logic, no p5. Each moth keeps its back toward the brightest
// direction (the dorsal light response). Near a point lamp that one rule
// is enough to make orbits, stalls and inversions; nothing here steers
// toward the lamp.
const UP = (() => {
  const SKY = 0.35;      // faint sky glow from straight above
  const LAMP = 90000;    // point-lamp strength, falls off as 1/d^2
  const CANOPY = 2.2;    // the same light spread overhead, from above
  const TURN = 10;       // how hard a moth rolls toward the light. Below ~6
                         // the same rule deflects them round the lamp instead
  const SPEED = 95;
  const SINK = 70;       // drop rate when the back faces the ground

  function lightDir(x, y, lamp, canopy) {
    const dx = lamp.x - x, dy = lamp.y - y;
    const d2 = dx * dx + dy * dy + 400;
    const d = Math.sqrt(d2);
    const w = (1 - canopy) * LAMP / d2;
    const up = SKY + canopy * CANOPY;
    const lx = w * dx / d, ly = w * dy / d - up;
    const n = Math.hypot(lx, ly) || 1;
    return { x: lx / n, y: ly / n };
  }

  function step(m, lamp, canopy, dt, noise) {
    const L = lightDir(m.x, m.y, lamp, canopy);
    // the moth's back; s says which side of the heading it is on, so a
    // moth flying left isn't born upside down
    const Dx = m.s * Math.sin(m.th), Dy = -m.s * Math.cos(m.th);
    const cross = Dx * L.y - Dy * L.x;
    m.th += (TURN * cross + noise) * dt;
    m.x += Math.cos(m.th) * SPEED * dt;
    m.y += Math.sin(m.th) * SPEED * dt;
    if (Dy > 0) m.y += SINK * Dy * dt;   // inverted: the dive
    m.inverted = Dy > 0.5;
  }

  return { lightDir, step };
})();

if (typeof module !== 'undefined') module.exports = UP;
