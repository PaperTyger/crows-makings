// "Everything Before and After"
// A launch command assembles itself, token by token, once every few seconds.
// Sometimes a contiguous span goes missing in the middle — but the confirmation
// light turns green regardless, because nothing in the reporting path ever
// re-reads what actually arrived. A dim ledger row (toggle-able) shows what the
// full sequence should have been; the confirmation light never consults it.

let rng;
let dropSlider, ledgerToggle;
let cycle = null;
let cycleStartMs = 0;
const CYCLE_MS = 2600;
const ASSEMBLE_MS = 1000;
let history = []; // {dropped: bool}
const HISTORY_MAX = 40;

const COL_BG = '#0c0c0b';
const COL_TOKEN = '#e8e6dc';
const COL_TOKEN_BG = 'rgba(255,255,255,0.08)';
const COL_GAP = 'rgba(255,255,255,0.15)';
const COL_LEDGER = 'rgba(255,255,255,0.35)';
const COL_ORANGE = '#d97757';
const COL_GREEN = '#7fae6f';

function setup() {
    const wrap = document.getElementById('canvasWrap');
    const c = createCanvas(680, 420);
    c.parent(wrap);
    rng = (typeof makeRng === 'function') ? makeRng(20260826) : Math.random;
    dropSlider = document.getElementById('dropSlider');
    ledgerToggle = document.getElementById('ledgerToggle');
    startCycle();
    textFont('monospace');
}

function startCycle() {
    const p = dropSlider ? (parseInt(dropSlider.value, 10) / 100) : 0.3;
    cycle = runCycle(p, rng);
    cycleStartMs = millis();
}

function draw() {
    background(COL_BG);

    const elapsed = millis() - cycleStartMs;
    if (elapsed > CYCLE_MS) {
        history.push({ dropped: cycle.dropped });
        if (history.length > HISTORY_MAX) history.shift();
        startCycle();
    }

    const showLedger = ledgerToggle ? ledgerToggle.checked : false;
    const assembleProgress = constrain(elapsed / ASSEMBLE_MS, 0, 1);
    const tokensShown = Math.floor(assembleProgress * cycle.tokens.length);

    const n = cycle.tokens.length;
    const marginX = 40;
    const usableW = width - marginX * 2;
    const slotW = usableW / n;

    // Ledger row (the truth), dim, only when toggled on.
    if (showLedger) {
        noStroke();
        fill(COL_LEDGER);
        textAlign(CENTER, CENTER);
        textSize(11);
        for (let i = 0; i < n; i++) {
            const x = marginX + slotW * i + slotW / 2;
            text(cycle.tokens[i], x, 90);
        }
        fill(160);
        textSize(9);
        textAlign(LEFT, CENTER);
        text('what was actually specified', marginX, 60);
    }

    // Assembly belt: tokens arrive left to right over ASSEMBLE_MS.
    const beltY = 210;
    for (let i = 0; i < n; i++) {
        const x = marginX + slotW * i + slotW / 2;
        const arrived = i < tokensShown;
        const isGap = cycle.assembled[i] === null;

        if (!arrived) {
            noFill();
            stroke(255, 255, 255, 15);
            rectMode(CENTER);
            rect(x, beltY, slotW - 10, 40, 4);
            continue;
        }

        if (isGap) {
            // Quietly absent. No color change, no flag — just a slightly
            // different outline that reads as "empty slot," not "error."
            noFill();
            stroke(COL_GAP);
            strokeWeight(1);
            rectMode(CENTER);
            rect(x, beltY, slotW - 10, 40, 4);
        } else {
            noStroke();
            fill(COL_TOKEN_BG);
            rectMode(CENTER);
            rect(x, beltY, slotW - 10, 40, 4);
            fill(COL_TOKEN);
            textAlign(CENTER, CENTER);
            textSize(11);
            text(cycle.assembled[i], x, beltY);
        }
    }

    fill(160);
    noStroke();
    textAlign(LEFT, CENTER);
    textSize(9);
    text('assembled and sent', marginX, beltY - 35);

    // Confirmation badge — always green, always confident, once the belt
    // has fully arrived. It never looks back at the belt to check.
    if (assembleProgress >= 1) {
        const badgeY = 300;
        noStroke();
        fill(COL_GREEN);
        circle(marginX + 10, badgeY, 14);
        fill(230);
        textAlign(LEFT, CENTER);
        textSize(13);
        text('COMMAND SENT', marginX + 24, badgeY);
        fill(120);
        textSize(9);
        text('(reported success is independent of what actually arrived above)', marginX + 24, badgeY + 18);
    }

    // History strip — every cycle is green here too. The ring around a dot
    // only darkens if a drop happened, and only when the ledger is shown.
    const histY = 370;
    const dotSpacing = Math.min(14, usableW / HISTORY_MAX);
    for (let i = 0; i < history.length; i++) {
        const x = marginX + i * dotSpacing;
        const h = history[i];
        noStroke();
        fill(COL_GREEN);
        circle(x, histY, 8);
        if (showLedger && h.dropped) {
            noFill();
            stroke(COL_ORANGE);
            strokeWeight(1.5);
            circle(x, histY, 12);
        }
    }
    fill(160);
    noStroke();
    textAlign(LEFT, CENTER);
    textSize(9);
    const dropped = history.filter(h => h.dropped).length;
    const pct = history.length ? Math.round(100 * dropped / history.length) : 0;
    text('history — every dot reports green' + (showLedger ? `  (ring = actually incomplete: ${dropped}/${history.length}, ${pct}%)` : ''), marginX, histY + 22);

    updateReadout(dropped, history.length, pct);
}

function updateReadout(dropped, total, pct) {
    const r = document.getElementById('readout');
    if (!r) return;
    const p = dropSlider ? dropSlider.value : '30';
    r.innerHTML = `Drop probability: <span class="val">${p}%</span><br>` +
        `Cycles so far: <span class="val">${total}</span><br>` +
        `Actually incomplete: <span class="val">${dropped}</span> (${pct}%)<br>` +
        `Reported incomplete: <span class="val">0</span> — always`;
}
