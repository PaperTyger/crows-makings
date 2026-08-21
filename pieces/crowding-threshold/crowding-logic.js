// Pure computational logic — no p5, no DOM. Runnable headlessly in plain Node
// for verification (see index.html's sketch.js for the rendering/DOM half).
//
// The model: a fixed set of "original marks" sits on a grid. A stream of
// "annotation" marks tries to land at random positions forever. Each cell has
// a density counter. A candidate annotation is accepted only if its cell's
// density is still below `threshold`; accepted marks increment the cell.
// `threshold` is the one live variable — low keeps annotation confined to
// sparse cells (the original stays legible indefinitely), high lets density
// pile up anywhere (the original eventually reads as fully obscured).

function makeGrid(cols, rows) {
    return new Float64Array(cols * rows);
}

function cellIndex(x, y, cellSize, cols, rows) {
    let col = Math.floor(x / cellSize);
    let row = Math.floor(y / cellSize);
    col = Math.max(0, Math.min(cols - 1, col));
    row = Math.max(0, Math.min(rows - 1, row));
    return row * cols + col;
}

// Deterministic given grid + threshold: fraction of cells still under the
// threshold, i.e. how likely a random new candidate is to be accepted right
// now. This is the number that should move IMMEDIATELY when the threshold
// slider moves, independent of elapsed time or RNG.
function acceptanceProbability(grid, threshold) {
    let open = 0;
    for (let i = 0; i < grid.length; i++) {
        if (grid[i] < threshold) open++;
    }
    return open / grid.length;
}

// Fraction of the fixed base-mark positions whose cell density is still at
// or below `visibilityFloor` — i.e. still legible against the accreting
// annotation layer. This is the number that moves over TIME as marks
// accumulate, at a rate set by the threshold.
function computeVisibility(baseMarkIndices, grid, visibilityFloor) {
    if (baseMarkIndices.length === 0) return 1;
    let legible = 0;
    for (let i = 0; i < baseMarkIndices.length; i++) {
        if (grid[baseMarkIndices[i]] <= visibilityFloor) legible++;
    }
    return legible / baseMarkIndices.length;
}

// Attempts to place one annotation mark at (x, y). Returns true and mutates
// the grid (increments the target cell) if the cell's current density is
// still below threshold; returns false (no mutation) otherwise.
function tryPlace(grid, x, y, cellSize, cols, rows, threshold) {
    const idx = cellIndex(x, y, cellSize, cols, rows);
    if (grid[idx] < threshold) {
        grid[idx] += 1;
        return { accepted: true, idx };
    }
    return { accepted: false, idx };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { makeGrid, cellIndex, acceptanceProbability, computeVisibility, tryPlace };
}
