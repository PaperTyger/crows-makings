// Rendering + DOM wiring. All distance/frequency/amplitude/hue math lives in
// echo-logic.js (loaded before this file) and is exercised, not reimplemented, here.

let cnv;
let W = 640, H = 640;
let hub;
let maxRadius;
const SPOKE_COUNT = 8;
const PREY_SPOKE = 2;
let spokeAngles = [];

let preyDistance01 = 0.55; // 0..1 of maxRadius, driven by the slider

let outwardPulses = [];  // {radius, speed}
let returnPulses = [];   // {spokeIndex, radius, speed, hue, amp}
let hubFlashes = [];     // {age, maxAge, hue, amp}

let lastCrouch = -99999;
const CROUCH_INTERVAL = 2200; // ms

let sliderEl, readoutEl;

function setup() {
    cnv = createCanvas(W, H);
    cnv.parent('canvasWrap');
    angleMode(RADIANS);
    colorMode(HSB, 360, 100, 100, 1);
    hub = createVector(W / 2, H / 2);
    maxRadius = min(W, H) / 2 - 60;
    for (let i = 0; i < SPOKE_COUNT; i++) {
        spokeAngles.push((TWO_PI / SPOKE_COUNT) * i - HALF_PI);
    }

    sliderEl = document.getElementById('distSlider');
    readoutEl = document.getElementById('readout');
    sliderEl.addEventListener('input', updateFromSlider);
    updateFromSlider();

    lastCrouch = millis() - CROUCH_INTERVAL + 400; // first crouch soon after load
}

function updateFromSlider() {
    const pct = Number(sliderEl.value); // 0..100
    preyDistance01 = pct / 100;
    const distance = preyDistance01 * maxRadius;
    const freq = freqForDistance(distance, maxRadius);
    const amp = ampForDistance(distance, maxRadius);
    const hue = hueForFreq(freq);
    readoutEl.innerHTML =
        `<span class="swatch" style="background:hsl(${hue.toFixed(0)},80%,55%)"></span>` +
        `distance <span class="val">${(pct).toFixed(0)}</span>%<br>` +
        `return frequency <span class="val">${freq.toFixed(2)} Hz</span><br>` +
        `return amplitude <span class="val">${amp.toFixed(2)}</span>`;
}

function draw() {
    background(0, 0, 4.5);

    // guide rings
    noFill();
    stroke(0, 0, 20, 0.35);
    strokeWeight(1);
    for (let r = maxRadius / 4; r <= maxRadius; r += maxRadius / 4) {
        circle(hub.x, hub.y, r * 2);
    }

    // spokes
    for (let i = 0; i < SPOKE_COUNT; i++) {
        const a = spokeAngles[i];
        const x2 = hub.x + cos(a) * maxRadius;
        const y2 = hub.y + sin(a) * maxRadius;
        stroke(0, 0, 30, 0.5);
        strokeWeight(i === PREY_SPOKE ? 1.4 : 0.8);
        line(hub.x, hub.y, x2, y2);
    }

    // prey marker
    const preyR = preyDistance01 * maxRadius;
    const pa = spokeAngles[PREY_SPOKE];
    const px = hub.x + cos(pa) * preyR;
    const py = hub.y + sin(pa) * preyR;
    noStroke();
    fill(40, 70, 90);
    circle(px, py, 9);

    // crouch trigger
    if (millis() - lastCrouch > CROUCH_INTERVAL) {
        lastCrouch = millis();
        for (let i = 0; i < SPOKE_COUNT; i++) {
            outwardPulses.push({ spokeIndex: i, radius: 4, speed: 3.6, spawnedReturn: false });
        }
    }

    // outward pulses
    for (let i = outwardPulses.length - 1; i >= 0; i--) {
        const p = outwardPulses[i];
        p.radius += p.speed;

        if (p.spokeIndex === PREY_SPOKE && !p.spawnedReturn && p.radius >= preyR) {
            p.spawnedReturn = true;
            const distance = preyR;
            const freq = freqForDistance(distance, maxRadius);
            const amp = ampForDistance(distance, maxRadius);
            const hue = hueForFreq(freq);
            returnPulses.push({ radius: preyR, speed: 2.0 + freq * 0.28, hue, amp });
        }

        const a = spokeAngles[p.spokeIndex];
        const x = hub.x + cos(a) * p.radius;
        const y = hub.y + sin(a) * p.radius;
        noStroke();
        fill(0, 0, 85, 0.8 * (1 - p.radius / maxRadius));
        circle(x, y, 6);

        if (p.radius > maxRadius + 10) outwardPulses.splice(i, 1);
    }

    // return pulses (prey spoke only, travelling inward)
    for (let i = returnPulses.length - 1; i >= 0; i--) {
        const r = returnPulses[i];
        r.radius -= r.speed;
        const a = spokeAngles[PREY_SPOKE];
        const x = hub.x + cos(a) * max(r.radius, 0);
        const y = hub.y + sin(a) * max(r.radius, 0);
        noStroke();
        fill(r.hue, 75, 95, 0.55 + r.amp * 0.45);
        circle(x, y, 6 + r.amp * 8);

        if (r.radius <= 0) {
            hubFlashes.push({ age: 0, maxAge: 40, hue: r.hue, amp: r.amp });
            returnPulses.splice(i, 1);
        }
    }

    // hub flashes
    for (let i = hubFlashes.length - 1; i >= 0; i--) {
        const f = hubFlashes[i];
        f.age++;
        const t = f.age / f.maxAge;
        noFill();
        stroke(f.hue, 70, 95, (1 - t) * (0.4 + f.amp * 0.6));
        strokeWeight(3);
        circle(hub.x, hub.y, 14 + t * 90 * (0.5 + f.amp));
        if (f.age >= f.maxAge) hubFlashes.splice(i, 1);
    }

    // hub itself
    noStroke();
    fill(0, 0, 70);
    circle(hub.x, hub.y, 10);
}
