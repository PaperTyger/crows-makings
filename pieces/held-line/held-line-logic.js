// Pure logic for "Held Line" — no p5, no DOM. Exercised by verify.js and by
// sketch.js. A calm, fixed contour sits inside a field of restless scribble
// marks; scribble is refused wherever it would land within `bufferRadius` of
// the contour. The contour is never drawn differently — it just never gets
// touched, because everything that would touch it is turned away first.

// Build a closed, smooth-ish contour as a polyline: a set of control points
// on an ellipse-like loop, lightly perturbed so it reads as a drawn shape
// rather than a perfect ellipse, then densely resampled by linear
// interpolation so distance checks are accurate without needing a spline
// library.
function buildContour(cx, cy, rx, ry, seedFn, controlCount = 14, samplesPerSegment = 12) {
    const controls = [];
    for (let i = 0; i < controlCount; i++) {
        const t = (i / controlCount) * Math.PI * 2;
        const wob = 1 + (seedFn() - 0.5) * 0.22; // +/-11% radius wobble per control point
        controls.push({
            x: cx + Math.cos(t) * rx * wob,
            y: cy + Math.sin(t) * ry * wob,
        });
    }
    // Catmull-Rom-ish resample (linear segments are enough for a distance field;
    // the point is a stable, non-jittering shape, not curve-fitting fidelity).
    const points = [];
    for (let i = 0; i < controls.length; i++) {
        const p0 = controls[i];
        const p1 = controls[(i + 1) % controls.length];
        for (let s = 0; s < samplesPerSegment; s++) {
            const t = s / samplesPerSegment;
            points.push({ x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t });
        }
    }
    return points;
}

// Minimum distance from (x,y) to the contour polyline (point-to-polyline,
// approximated as point-to-nearest-sample — dense sampling makes this
// accurate to well under a pixel at typical canvas scale).
function distanceToContour(x, y, contourPoints) {
    let best = Infinity;
    for (const p of contourPoints) {
        const dx = x - p.x, dy = y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < best) best = d2;
    }
    return Math.sqrt(best);
}

// Returns { accepted, distance }. A scribble candidate is refused if it
// would land within bufferRadius of the contour — this is the entire
// mechanism; there is no other rejection rule.
function tryPlaceScribble(x, y, contourPoints, bufferRadius) {
    const distance = distanceToContour(x, y, contourPoints);
    return { accepted: distance >= bufferRadius, distance };
}

// Coverage bookkeeping: fraction of a coarse grid whose cells have received
// at least one accepted scribble. Grid is independent of the p5 canvas so
// this stays testable headlessly.
function makeCoverageGrid(cols, rows) {
    return new Uint8Array(cols * rows);
}

function markCoverage(grid, cols, rows, x, y, w, h) {
    const cx = Math.min(cols - 1, Math.max(0, Math.floor((x / w) * cols)));
    const cy = Math.min(rows - 1, Math.max(0, Math.floor((y / h) * rows)));
    grid[cy * cols + cx] = 1;
}

function coverageFraction(grid) {
    let sum = 0;
    for (let i = 0; i < grid.length; i++) sum += grid[i];
    return sum / grid.length;
}

if (typeof module !== 'undefined') {
    module.exports = {
        buildContour,
        distanceToContour,
        tryPlaceScribble,
        makeCoverageGrid,
        markCoverage,
        coverageFraction,
    };
}
