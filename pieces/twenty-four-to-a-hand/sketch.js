// Twenty-four to a hand. A dealer goes round seven seats, one card an hour.
// The first card of each day lands face up, and a waxed thread runs from the
// last morning's card to this one. Nobody draws the star. It's what 24 mod 7 sews.

const W = 760, H = 760, CX = W / 2, CY = H / 2;
const PILE_R = 188, MORNING_R = 262, LABEL_R = 334;
const TICKS_PER_CARD = 3, DAWN_PAUSE = 22, MAX_DAYS = 35, PILE_DRAW = 22;

let felt, hoursPerDay = 24;
let hour, wait, piles, mornings, threads, flying, glow;

function seatPos(seat, r) {
  const a = -HALF_PI + seat * TWO_PI / 7;
  return { x: CX + r * cos(a), y: CY + r * sin(a), a };
}

function resetDeal() {
  hour = 0; wait = 0; flying = null; glow = 0; lastMorning = null;
  piles = PLANETS.map(() => []);
  mornings = PLANETS.map(() => []);
  threads = [];
}

function setup() {
  pixelDensity(1);
  createCanvas(W, H).parent('canvas-holder');
  randomSeed(1102); noiseSeed(1102);
  felt = buildFelt();
  const s = document.getElementById('hours');
  s.addEventListener('input', () => {
    hoursPerDay = parseInt(s.value, 10);
    resetDeal();
    writeReadout();
  });
  hoursPerDay = parseInt(s.value, 10);
  resetDeal();
  writeReadout();
  textFont('Georgia');
}

// Baize under a single low light: fibre noise, nap, and a warm falloff.
function buildFelt() {
  const g = createImage(W, H);
  g.loadPixels();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nap = noise(x * 0.012, y * 0.012);
      const fibre = noise(x * 0.55, y * 0.16) * 0.6 + noise(x * 0.14, y * 0.6) * 0.4;
      const d = dist(x, y, CX, CY - 30) / (W * 0.68);
      const light = constrain(1.08 - d * d * 1.25, 0.1, 1.1) * (0.74 + nap * 0.32) * (0.84 + fibre * 0.3);
      const i = (y * W + x) * 4;
      g.pixels[i] = 14 + 26 * light;
      g.pixels[i + 1] = 30 + 66 * light;
      g.pixels[i + 2] = 24 + 40 * light;
      g.pixels[i + 3] = 255;
    }
  }
  g.updatePixels();
  return g;
}

function advance() {
  if (flying) {
    flying.t += 1 / TICKS_PER_CARD;
    if (flying.t < 1) return;
    land(flying);
    flying = null;
    wait = flying === null && isMorning(hour, hoursPerDay) ? DAWN_PAUSE : 0;
    hour++;
    return;
  }
  if (wait > 0) { wait--; return; }
  if (hour >= MAX_DAYS * hoursPerDay) { resetDeal(); return; }
  flying = { seat: seatOfHour(hour), morning: isMorning(hour, hoursPerDay), t: 0,
             rot: random(-0.09, 0.09), dx: random(-3.5, 3.5), dy: random(-3.5, 3.5) };
}

function land(c) {
  if (c.morning) {
    const list = mornings[c.seat];
    list.push({ rot: c.rot * 2.4, dx: c.dx * 3, dy: c.dy * 3 });
    if (lastMorning !== null && lastMorning !== c.seat) {
      threads.push({ from: lastMorning, to: c.seat, sag: random(-16, 16), wob: random(1000) });
    }
    lastMorning = c.seat;
    glow = 1;
  } else {
    piles[c.seat].push({ rot: c.rot, dx: c.dx, dy: c.dy });
  }
}
let lastMorning = null;

function drawBack(x, y, rot, a) {
  push();
  translate(x, y); rotate(a + rot);
  noStroke(); fill(0, 0, 0, 70); rect(-15, -21, 32, 46, 3);
  fill(231, 222, 201); rect(-17, -24, 34, 48, 3);
  fill(92, 34, 36); rect(-14.5, -21.5, 29, 43, 2);
  stroke(214, 176, 118, 150); strokeWeight(0.6);
  for (let i = -16; i < 16; i += 4) line(-13, i - 4, 13, i + 4);
  pop();
}

function drawFace(x, y, rot, a, planet, lit) {
  push();
  translate(x, y); rotate(a + rot);
  noStroke(); fill(0, 0, 0, 90); rect(-17, -23, 38, 54, 3);
  fill(lit ? 250 : 236, lit ? 240 : 226, lit ? 212 : 200); rect(-19, -27, 38, 54, 3);
  fill(66, 34, 28);
  textAlign(CENTER, CENTER); textSize(25);
  text(planet.glyph, 0, -1);
  pop();
}

// Waxed linen, not a ruled line: it sags, wanders a little, and casts a shadow.
function drawThread(t) {
  const a = seatPos(t.from, MORNING_R), b = seatPos(t.to, MORNING_R);
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const nx = -(b.y - a.y), ny = b.x - a.x, len = sqrt(nx * nx + ny * ny) || 1;
  const cx = mx + (nx / len) * t.sag, cy = my + (ny / len) * t.sag;
  noFill();
  for (let pass = 0; pass < 2; pass++) {
    if (pass === 0) { stroke(0, 0, 0, 60); strokeWeight(2.4); }
    else { stroke(226, 208, 164, 150); strokeWeight(1.15); }
    const off = pass === 0 ? 2 : 0;
    beginShape();
    for (let i = 0; i <= 26; i++) {
      const u = i / 26, v = 1 - u;
      const px = v * v * a.x + 2 * v * u * cx + u * u * b.x;
      const py = v * v * a.y + 2 * v * u * cy + u * u * b.y;
      const w = (noise(t.wob, u * 3) - 0.5) * 5 * sin(u * PI);
      vertex(px + w + off, py + w + off);
    }
    endShape();
  }
}

function draw() {
  advance();
  image(felt, 0, 0);

  // Seat names, in the felt.
  noStroke(); textAlign(CENTER, CENTER); textSize(14);
  PLANETS.forEach((p, s) => {
    const q = seatPos(s, LABEL_R);
    fill(214, 208, 176, 120);
    text(p.name, q.x, q.y);
  });

  // Face-down hours.
  piles.forEach((pile, s) => {
    const q = seatPos(s, PILE_R);
    pile.slice(-PILE_DRAW).forEach((c, i) => {
      drawBack(q.x + c.dx, q.y + c.dy - i * 0.35, c.rot, q.a + HALF_PI);
    });
  });

  threads.forEach(drawThread);

  // Mornings, face up, and the newest one still warm.
  const current = hourCurrentSeat();
  mornings.forEach((list, s) => {
    const q = seatPos(s, MORNING_R);
    if (s === current && glow > 0.01 && list.length) {
      const g = drawingContext.createRadialGradient(q.x, q.y, 6, q.x, q.y, 74);
      g.addColorStop(0, 'rgba(255,214,140,' + 0.42 * glow + ')');
      g.addColorStop(1, 'rgba(255,214,140,0)');
      drawingContext.fillStyle = g;
      drawingContext.fillRect(q.x - 74, q.y - 74, 148, 148);
    }
    list.slice(-7).forEach((c, i, arr) => {
      drawFace(q.x + c.dx, q.y + c.dy, c.rot, q.a + HALF_PI, PLANETS[s], s === current && i === arr.length - 1);
    });
  });
  glow *= 0.965;

  // The dealer's remaining deck, and the card in the air.
  for (let i = 0; i < 5; i++) drawBack(CX + i * 0.5, CY - i * 0.7, 0.06, 0);
  if (flying) {
    const r = flying.morning ? MORNING_R : PILE_R;
    const q = seatPos(flying.seat, r);
    const u = flying.t * flying.t * (3 - 2 * flying.t);
    drawBack(lerp(CX, q.x, u), lerp(CY, q.y, u), flying.rot * u, (q.a + HALF_PI) * u);
  }
}

function hourCurrentSeat() { return lastMorning; }

function writeReadout() {
  const order = weekOrder(hoursPerDay).map(s => PLANETS[s].name);
  const step = stepPerDay(hoursPerDay);
  const el = document.getElementById('readout');
  const head = hoursPerDay + ' hours a day, so each dawn lands ' + step + ' seat' + (step === 1 ? '' : 's') + ' on.';
  el.innerHTML = step === 0
    ? head + '<br><br>Every day is ' + order[0] + '&rsquo;s. There is no week.'
    : head + '<br><br>' + order.join(', ') + (hoursPerDay === 24 ? '.<br><br>You know this one.' : '.');
}
