// Pure computational logic: grid state, extraction, and particle physics.
// No p5, no DOM — testable headlessly via verify.js (Node) and exercised
// live by sketch.js (browser). See sketch.js for the rendering half.

function makeRng(seed) {
    // mulberry32 — small deterministic PRNG so the piece (and its tests)
    // reproduce exactly from a fixed seed.
    let a = seed >>> 0;
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function buildGrid(cols, rows, spacing, offsetX, offsetY, rng) {
    const dots = [];
    for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
            const jitterX = (rng() - 0.5) * spacing * 0.3;
            const jitterY = (rng() - 0.5) * spacing * 0.3;
            dots.push({
                gx, gy,
                x: offsetX + gx * spacing + jitterX,
                y: offsetY + gy * spacing + jitterY,
                extracted: false,
                hue: 38 + (rng() - 0.5) * 14,   // warm gold, slight per-dot jitter
                bright: 55 + rng() * 30
            });
        }
    }
    return dots;
}

// Extract every un-extracted dot within radius of (cx, cy). Extraction is
// PERMANENT — an already-extracted dot is skipped, so calling this twice at
// the same point yields zero new extractions the second time. Returns the
// newly-extracted dots (for spawning particles from them).
function extractInRadius(grid, cx, cy, radius) {
    const newlyExtracted = [];
    const r2 = radius * radius;
    for (const dot of grid) {
        if (dot.extracted) continue;
        const dx = dot.x - cx, dy = dot.y - cy;
        if (dx * dx + dy * dy <= r2) {
            dot.extracted = true;
            newlyExtracted.push(dot);
        }
    }
    return newlyExtracted;
}

function countExtracted(grid) {
    let n = 0;
    for (const d of grid) if (d.extracted) n++;
    return n;
}

// A dot leaving the grid becomes a free particle, flung outward from the
// extraction center at a speed set by flingSpeed (a live control).
function spawnParticle(dot, cx, cy, flingSpeed, rng) {
    const dx = dot.x - cx, dy = dot.y - cy;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const nx = dx / dist, ny = dy / dist;
    const speed = flingSpeed * (0.6 + rng() * 0.8);
    return {
        x: dot.x, y: dot.y,
        vx: nx * speed + (rng() - 0.5) * speed * 0.4,
        vy: ny * speed - speed * 0.3 - rng() * speed * 0.3, // slight upward kick
        hue: dot.hue, bright: dot.bright,
        settled: false
    };
}

// One physics step: gravity + friction + a damped floor bounce that settles
// once motion is small enough. Pure function of (particle, params).
function stepParticle(p, gravity, friction, floorY) {
    if (p.settled) return p;
    let vx = p.vx * friction;
    let vy = p.vy * friction + gravity;
    let x = p.x + vx;
    let y = p.y + vy;
    let settled = false;
    if (y >= floorY) {
        y = floorY;
        vy = -vy * 0.25;
        if (Math.abs(vy) < 0.4 && Math.abs(vx) < 0.15) {
            settled = true;
            vx = 0; vy = 0;
        }
    }
    return { ...p, x, y, vx, vy, settled };
}

function countSettled(particles) {
    let n = 0;
    for (const p of particles) if (p.settled) n++;
    return n;
}

function maxDistanceFromOrigin(particles, ox, oy) {
    let m = 0;
    for (const p of particles) {
        const d = Math.hypot(p.x - ox, p.y - oy);
        if (d > m) m = d;
    }
    return m;
}

if (typeof module !== 'undefined') {
    module.exports = {
        makeRng, buildGrid, extractInRadius, countExtracted,
        spawnParticle, stepParticle, countSettled, maxDistanceFromOrigin
    };
}
