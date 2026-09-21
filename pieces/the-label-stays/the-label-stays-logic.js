// Pure logic for "The Label Stays" — no p5, no DOM. Exercised by verify.js and
// by sketch.js. A population of fans, each with a fan curve P(Q) = Ps*(1-(Q/Qf)^2)
// (a schematic quadratic, not calibrated to any real product), meets a duct's
// system curve P = k*Q^2. The label number is the fan's flow at P = 0.1 in. w.g.
// and never moves. The operating point is where the two curves cross, and it
// slides down the fan curve as the duct gets harder.

const RATED_P = 0.1; // in. w.g., the pressure at which the label is measured

function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// A fan is defined by what its label says (ratedQ, cfm at 0.1 in.) and its
// shutoff pressure Ps. Free-air flow Qf follows from the two.
function makeFan(ratedQ, shutoffP) {
    const qFree = ratedQ / Math.sqrt(1 - RATED_P / shutoffP);
    return { ratedQ, shutoffP, qFree };
}

function makeFans(count, seed) {
    const rnd = mulberry32(seed);
    const fans = [];
    for (let i = 0; i < count; i++) {
        const ratedQ = 40 + rnd() * 70;      // 40..110 cfm on the label
        const shutoffP = 0.25 + rnd() * 0.45; // 0.25..0.70 in.
        fans.push(makeFan(ratedQ, shutoffP));
    }
    return fans;
}

// Fan pressure at flow q.
function fanPressure(fan, q) {
    const r = q / fan.qFree;
    return fan.shutoffP * (1 - r * r);
}

// Flow the fan delivers at a given static pressure.
function fanFlowAt(fan, p) {
    return fan.qFree * Math.sqrt(Math.max(0, 1 - p / fan.shutoffP));
}

// Duct resistance coefficient k (P = k*Q^2) from equivalent length. The cap
// alone contributes a base; every foot of straight duct and every elbow (as
// elbowEquivFt feet) adds a little. Schematic numbers, chosen so the cap-only
// case sits near the label and a long run with elbows lands well below it.
function ductK(lengthFt, elbows, elbowEquivFt = 6) {
    return (0.3 + 0.012 * (lengthFt + elbowEquivFt * elbows)) * 1e-4;
}

// Closed-form crossing of P = Ps*(1-(Q/Qf)^2) with P = k*Q^2.
function operatingPoint(fan, k) {
    const q = fan.qFree * Math.sqrt(fan.shutoffP / (fan.shutoffP + k * fan.qFree * fan.qFree));
    return { q, p: k * q * q, ratio: q / fan.ratedQ };
}

function summarize(fans, k) {
    const ratios = fans.map(f => operatingPoint(f, k).ratio).sort((a, b) => a - b);
    const median = ratios[Math.floor(ratios.length / 2)];
    const atLeast80 = ratios.filter(r => r >= 0.8).length / ratios.length;
    return { median, atLeast80, min: ratios[0], max: ratios[ratios.length - 1] };
}

if (typeof module !== 'undefined') {
    module.exports = { RATED_P, mulberry32, makeFan, makeFans, fanPressure, fanFlowAt, ductK, operatingPoint, summarize };
}
