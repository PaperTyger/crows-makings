// For No Eye: the physics, kept separate from the drawing so it can be checked on its own.
// Two-beam thin-film interference in a keratin layer between air and air,
// the same mechanism Snyder et al. (2012) found in golden mole hair.

const KERATIN_N = 1.54;

// Wyman, Sloan & Shirley (2013) multi-lobe fit to the CIE 1931 colour-matching functions.
function g(x, mu, s1, s2) {
    const t = (x - mu) / (x < mu ? s1 : s2);
    return Math.exp(-0.5 * t * t);
}
function cieXYZ(lambda) {
    return [
        1.056 * g(lambda, 599.8, 37.9, 31.0) + 0.362 * g(lambda, 442.0, 16.0, 26.7) - 0.065 * g(lambda, 501.1, 20.4, 26.2),
        0.821 * g(lambda, 568.8, 46.9, 40.5) + 0.286 * g(lambda, 530.9, 16.3, 31.1),
        1.217 * g(lambda, 437.0, 11.8, 36.0) + 0.681 * g(lambda, 459.0, 26.0, 13.8)
    ];
}

// Reflectance of a free film at one wavelength. Air-film-air: the two reflections
// differ by a half-wave phase flip, so R = 2r^2(1 - cos delta).
function filmReflectance(lambda, thicknessNm, cosThetaI, n = KERATIN_N) {
    const sinI = Math.sqrt(Math.max(0, 1 - cosThetaI * cosThetaI));
    const sinT = sinI / n;
    const cosT = Math.sqrt(Math.max(0, 1 - sinT * sinT));
    const r = (n - 1) / (n + 1);
    const delta = (4 * Math.PI * n * thicknessNm * cosT) / lambda;
    return 2 * r * r * (1 - Math.cos(delta));
}

function gammaEncode(c) {
    c = Math.max(0, c);
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

// Returns { rgb: [0..1]x3, luminance } for white light on the film.
function thinFilmColour(thicknessNm, cosThetaI) {
    let X = 0, Y = 0, Z = 0, norm = 0;
    for (let l = 380; l <= 720; l += 5) {
        const R = filmReflectance(l, thicknessNm, cosThetaI);
        const [x, y, z] = cieXYZ(l);
        X += R * x; Y += R * y; Z += R * z; norm += y;
    }
    X /= norm; Y /= norm; Z /= norm;
    const lin = [
        3.2406 * X - 1.5372 * Y - 0.4986 * Z,
        -0.9689 * X + 1.8758 * Y + 0.0415 * Z,
        0.0557 * X - 0.2040 * Y + 1.0570 * Z
    ];
    // Film reflectance peaks near 4r^2 ~ 0.18. The gain is a display choice, set by eye to keep the sheen short of candy.
    const gain = 3.2;
    return { rgb: lin.map(c => Math.min(1, gammaEncode(c * gain))), luminance: Y };
}

if (typeof module !== 'undefined') module.exports = { filmReflectance, thinFilmColour, cieXYZ, KERATIN_N };
