import { util } from "./utils";
const gradients = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 0.5], [-1, 0.5], [0.5, 1], [-0.5, 1],
    [1, -0.5], [-1, -0.5], [0.5, -1], [-0.5, -1]
];
const grad3 = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [0, 1], [0, -1]
];
const grad3D = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
];
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const F3 = 1 / 3;
const G3 = 1 / 6;
export class Noise {
    seed: number
    permutation: Array<number>
    constructor(seed: number) {
        this.seed = seed;
        this.permutation = [];
        this.generatePermutation();
        this.lcgState = seed >>> 0;
    }
    private lcgState = 0;
    private lcg() {
        this.lcgState = (this.lcgState * 1664525 + 1013904223) >>> 0;
        return this.lcgState;
    }
    generatePermutation() {
        const permutate = [...Array(256).keys()];
        for (let i = 255; i > 0; i--) {
            const j = this.lcg() % (i + 1);
            [permutate[i], permutate[j]] = [permutate[j], permutate[i]];
        }
        this.permutation = new Array(512);
        for (let i = 0; i < 512; i++) {
            this.permutation[i] = permutate[i & 255];
        }
    }
    hash(x: number, y: number): number {
        const xi = x & 255;
        const yi = y & 255;
        const hash = this.permutation[this.permutation[xi] + yi];
        return hash & (gradients.length - 1);
    }
    perlin(x: number, y: number) {
        const xi = Math.floor(x)
        const yi = Math.floor(y)
        const xf = x - xi;
        const yf = y - yi;
        const u = util.fade(xf);
        const v = util.fade(yf);
        const v00 = (this.hash(xi, yi) % gradients.length + gradients.length) % gradients.length;
        const v01 = (this.hash(xi, yi + 1) % gradients.length + gradients.length) % gradients.length;
        const v10 = (this.hash(xi + 1, yi) % gradients.length + gradients.length) % gradients.length;
        const v11 = (this.hash(xi + 1, yi + 1) % gradients.length + gradients.length) % gradients.length;
        const dp00 = gradients[v00][0] * xf + gradients[v00][1] * yf;
        const dp01 = gradients[v01][0] * xf + gradients[v01][1] * (yf - 1);
        const dp10 = gradients[v10][0] * (xf - 1) + gradients[v10][1] * yf;
        const dp11 = gradients[v11][0] * (xf - 1) + gradients[v11][1] * (yf - 1);
        const x1 = util.lerp(dp00, dp10, u);
        const x2 = util.lerp(dp01, dp11, u);
        const value = util.lerp(x1, x2, v) / 2;
        return ((value * Math.SQRT1_2)+1) * 0.5
    }
    octaveNoise(x: number, y: number, octaves: number, persistence: number, amplitude: number, frequency: number, lacunarity: number, type: (x: number, y: number) => number) {
        let total = 0;
        let maxAmplitude = 0;
        let amp = amplitude;
        let freq = frequency;

        for (let i = 0; i < octaves; i++) {
            total += type(x * freq, y * freq) * amp;
            maxAmplitude += amp;
            freq *= lacunarity;
            amp *= persistence;
        }
        return total / maxAmplitude;
    }
    simplex(x: number, y: number) {
        const skew = (x + y) * F2;
        const cellX = Math.floor(x + skew);
        const cellY = Math.floor(y + skew);
        const unskew = (cellX + cellY) * G2;
        const originX = cellX - unskew;
        const originY = cellY - unskew;
        const dx0 = x - originX;
        const dy0 = y - originY;

        let offsetX1, offsetY1;
        if (dx0 > dy0) {
            offsetX1 = 1; offsetY1 = 0;
        }
        else {
            offsetX1 = 0; offsetY1 = 1;
        }
        const dx1 = dx0 - offsetX1 + G2;
        const dy1 = dy0 - offsetY1 + G2;
        const dx2 = dx0 - 1 + 2 * G2;
        const dy2 = dy0 - 1 + 2 * G2;

        const wrappedX = cellX & 255;
        const wrappedY = cellY & 255;

        let contrib0 = 0, contrib1 = 0, contrib2 = 0;

        let t0 = 0.5 - dx0 * dx0 - dy0 * dy0;
        if (t0 >= 0) {
            const gradIndex0 = this.permutation[wrappedX + this.permutation[wrappedY]] % 8; // Changed to %8 for 2D
            t0 *= t0;
            contrib0 = t0 * t0 * util.dot(grad3[gradIndex0], [dx0, dy0]);
        }

        let t1 = 0.5 - dx1 * dx1 - dy1 * dy1;
        if (t1 >= 0) {
            const gradIndex1 = this.permutation[wrappedX + offsetX1 + this.permutation[wrappedY + offsetY1]] % 8;
            t1 *= t1;
            contrib1 = t1 * t1 * util.dot(grad3[gradIndex1], [dx1, dy1]);
        }

        let t2 = 0.5 - dx2 * dx2 - dy2 * dy2;
        if (t2 >= 0) {
            const gradIndex2 = this.permutation[wrappedX + 1 + this.permutation[wrappedY + 1]] % 8;
            t2 *= t2;
            contrib2 = t2 * t2 * util.dot(grad3[gradIndex2], [dx2, dy2]);
        }

        return (70 * (contrib0 + contrib1 + contrib2) + 1) * 0.5;
    }
    simplex3(x: number, y: number, z: number) {
        const s = (x + y + z) * F3;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);
        const k = Math.floor(z + s);

        const t = (i + j + k) * G3;
        const X0 = i - t;
        const Y0 = j - t;
        const Z0 = k - t;

        const x0 = x - X0;
        const y0 = y - Y0;
        const z0 = z - Z0;

        // Determine which simplex we are in
        let i1, j1, k1;
        let i2, j2, k2;

        if (x0 >= y0) {
            if (y0 >= z0) {
                i1 = 1; j1 = 0; k1 = 0;
                i2 = 1; j2 = 1; k2 = 0;
            } else if (x0 >= z0) {
                i1 = 1; j1 = 0; k1 = 0;
                i2 = 1; j2 = 0; k2 = 1;
            } else {
                i1 = 0; j1 = 0; k1 = 1;
                i2 = 1; j2 = 0; k2 = 1;
            }
        } else {
            if (y0 < z0) {
                i1 = 0; j1 = 0; k1 = 1;
                i2 = 0; j2 = 1; k2 = 1;
            } else if (x0 < z0) {
                i1 = 0; j1 = 1; k1 = 0;
                i2 = 0; j2 = 1; k2 = 1;
            } else {
                i1 = 0; j1 = 1; k1 = 0;
                i2 = 1; j2 = 1; k2 = 0;
            }
        }

        const x1 = x0 - i1 + G3;
        const y1 = y0 - j1 + G3;
        const z1 = z0 - k1 + G3;

        const x2 = x0 - i2 + 2 * G3;
        const y2 = y0 - j2 + 2 * G3;
        const z2 = z0 - k2 + 2 * G3;

        const x3 = x0 - 1 + 3 * G3;
        const y3 = y0 - 1 + 3 * G3;
        const z3 = z0 - 1 + 3 * G3;

        const ii = i & 255;
        const jj = j & 255;
        const kk = k & 255;

        const getGradient = (i: number, j: number, k: number) => grad3D[this.permutation[ii + i + this.permutation[jj + j + this.permutation[kk + k]]] % 8];

        const contrib = (dx: number, dy: number, dz: number, grad: number[]) => {
            let t = 0.6 - dx * dx - dy * dy - dz * dz;
            if (t < 0) return 0;
            t *= t;
            return t * t * util.dot(grad, [dx, dy, dz]);
        }

        const n0 = contrib(x0, y0, z0, getGradient(0, 0, 0));
        const n1 = contrib(x1, y1, z1, getGradient(i1, j1, k1));
        const n2 = contrib(x2, y2, z2, getGradient(i2, j2, k2));
        const n3 = contrib(x3, y3, z3, getGradient(1, 1, 1));

        return 32 * (n0 + n1 + n2 + n3); // Normalization factor for 3D simplex
    }

}