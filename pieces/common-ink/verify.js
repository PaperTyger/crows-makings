// Headless verification of the pure logic — no p5, no DOM. Run: node verify.js
const {
    DARKEN_FRAMES, CORROSION_START,
    inkBrightness, corrosionProgress, dashOpacity, buildStrokeDashes, strokeIntegrity,
} = require('./common-ink-logic.js');

function seededRandom(seed) {
    let s = seed;
    return function () {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
    };
}

console.log('--- Test 1: darkening is monotonic non-increasing (pale -> black), then flat ---');
let prev = Infinity, monoDark = true;
for (let age = 0; age <= DARKEN_FRAMES * 2; age += 3) {
    const b = inkBrightness(age);
    if (b > prev + 1e-9) monoDark = false;
    prev = b;
}
console.log('  brightness at age 0:', inkBrightness(0).toFixed(3), '(EXPECT: 1, fully pale)');
console.log('  brightness at age', DARKEN_FRAMES, ':', inkBrightness(DARKEN_FRAMES).toFixed(3), '(EXPECT: ~0.08, near-black not pure black)');
console.log('  brightness at age', DARKEN_FRAMES * 5, ':', inkBrightness(DARKEN_FRAMES * 5).toFixed(3), '(EXPECT: flat at 0.08, darkening never re-triggers)');
console.log('  monotonic non-increasing over the darkening window:', monoDark, monoDark ? '(PASS)' : '(FAIL)');

console.log('\n--- Test 2: corrosion is exactly zero until darkened + grace period have both elapsed ---');
console.log('  progress at age 0:', corrosionProgress(0, 1), '(EXPECT: 0)');
console.log('  progress right at darken+start boundary:', corrosionProgress(DARKEN_FRAMES + CORROSION_START, 1), '(EXPECT: 0)');
console.log('  progress just past boundary:', corrosionProgress(DARKEN_FRAMES + CORROSION_START + 10, 1) > 0, '(EXPECT: true)');

console.log('\n--- Test 3: dash opacity is 1 until its threshold, then falls, never rises, and bottoms at 0 ---');
const rnd = seededRandom(20260830);
const dashes = buildStrokeDashes(rnd, 6);
console.log('  thresholds:', dashes.map(d => d.threshold.toFixed(2)).join(', '));
const d0 = dashes[0];
let prevOp = 1, monoOp = true, sawFade = false, sawZero = false;
for (let age = 0; age <= 5000; age += 25) {
    const op = dashOpacity(age, 1.5, d0.threshold);
    if (op > prevOp + 1e-9) monoOp = false;
    if (op < 1) sawFade = true;
    if (op === 0) sawZero = true;
    prevOp = op;
}
console.log('  opacity monotonic non-increasing over 5000 frames:', monoOp, monoOp ? '(PASS)' : '(FAIL)');
console.log('  eventually starts fading:', sawFade, '  eventually hits 0:', sawZero, sawFade && sawZero ? '(PASS)' : '(check timescale/range)');

console.log('\n--- Test 4: higher ironExcess corrodes strictly faster (same age, same dashes) ---');
const testAge = DARKEN_FRAMES + CORROSION_START + 400;
const lowIron = strokeIntegrity(dashes, testAge, 0.5);
const highIron = strokeIntegrity(dashes, testAge, 3.0);
console.log(`  integrity at ironExcess=0.5: ${lowIron.toFixed(3)}`);
console.log(`  integrity at ironExcess=3.0: ${highIron.toFixed(3)}`);
console.log('  high-iron integrity strictly lower:', highIron < lowIron, highIron < lowIron ? '(PASS)' : '(FAIL)');

console.log('\n--- Test 5: strokeIntegrity is 1.0 while still within the grace period regardless of ironExcess ---');
const graceAge = DARKEN_FRAMES + Math.floor(CORROSION_START / 2);
const integrityDuringGrace = strokeIntegrity(dashes, graceAge, 3.0);
console.log(`  integrity mid-grace-period at ironExcess=3.0: ${integrityDuringGrace.toFixed(3)} (EXPECT: 1.000, corrosion cannot start early no matter how much iron)`);
console.log('  PASS:', integrityDuringGrace === 1);

console.log('\n--- Test 6: a fresh stroke (age=0) always has full integrity, independent of ironExcess ---');
console.log('  integrity age=0, ironExcess=5:', strokeIntegrity(dashes, 0, 5).toFixed(3), '(EXPECT: 1.000)');
