import { util } from "./utils";
const GRADIENTS_2D = new Float32Array([
    1, 1, -1, 1, 1, -1, -1, -1,
    1, 0, -1, 0, 0, 1, 0, -1,
    1, 0.5, -1, 0.5, 0.5, 1, -0.5, 1,
    1, -0.5, -1, -0.5, 0.5, -1, -0.5, -1
]);

const GRADIENTS_3D = new Float32Array([
    1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
    1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
    0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1
]);
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const F3 = 1 / 3;
const G3 = 1 / 6;
const SQRT1_2 = Math.SQRT1_2;
export class Noise {
    private permutation: Uint8Array;
    private lcgState: number;
    constructor(seed: number) {
        this.lcgState = seed >>> 0;
        this.permutation = this.generatePermutation();
    }
    private generatePermutation(): Uint8Array {
        const perm = new Uint8Array(512);
        const temp = new Uint8Array(256);
        for (let i = 0; i < 256; i++) {
            temp[i] = i;
        }
        for (let i = 255; i > 0; i--) {
            const j = this.lcg() % (i + 1);
            [temp[i], temp[j]] = [temp[j], temp[i]];
        }
        for (let i = 0; i < 512; i++) {
            perm[i] = temp[i & 255];
        }
        return perm;
    }
    private lcg(): number {
        this.lcgState = (this.lcgState * 1664525 + 1013904223) >>> 0;
        return this.lcgState;
    }
    perlin(x: number, y: number): number {
        const xi = Math.floor(x);
        const yi = Math.floor(y);
        const xf = x - xi;
        const yf = y - yi;
        const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
        const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
        const xi255 = xi & 255;
        const yi255 = yi & 255;
        const v00 = this.permutation[xi255 + this.permutation[yi255]] & 15;
        const v01 = this.permutation[xi255 + this.permutation[(yi255 + 1) & 255]] & 15;
        const v10 = this.permutation[(xi255 + 1) & 255 + this.permutation[yi255]] & 15;
        const v11 = this.permutation[(xi255 + 1) & 255 + this.permutation[(yi255 + 1) & 255]] & 15;
        const dp00 = GRADIENTS_2D[v00 * 2] * xf + GRADIENTS_2D[v00 * 2 + 1] * yf;
        const dp01 = GRADIENTS_2D[v01 * 2] * xf + GRADIENTS_2D[v01 * 2 + 1] * (yf - 1);
        const dp10 = GRADIENTS_2D[v10 * 2] * (xf - 1) + GRADIENTS_2D[v10 * 2 + 1] * yf;
        const dp11 = GRADIENTS_2D[v11 * 2] * (xf - 1) + GRADIENTS_2D[v11 * 2 + 1] * (yf - 1);
        const x1 = util.lerp(dp00, dp10, u);
        const x2 = util.lerp(dp01, dp11, u);        
        return ((util.lerp(x1, x2, v) * SQRT1_2 + 1) * 0.5);
    }
    octaveNoise(
        x: number, 
        y: number, 
        octaves: number, 
        persistence: number, 
        amplitude: number, 
        frequency: number, 
        lacunarity: number, 
        type: (x: number, y: number) => number
    ): number {
        let total = 0;
        let maxAmplitude = 0;
        let amp = amplitude;
        let freq = frequency;
        switch (octaves) {
            case 1:
                return type(x * freq, y * freq) * amp;
            case 2:
                total = type(x * freq, y * freq) * amp;
                maxAmplitude = amp;
                freq *= lacunarity;
                amp *= persistence;
                total += type(x * freq, y * freq) * amp;
                maxAmplitude += amp;
                return total / maxAmplitude;
            default:
                for (let i = 0; i < octaves; i++) {
                    total += type(x * freq, y * freq) * amp;
                    maxAmplitude += amp;
                    freq *= lacunarity;
                    amp *= persistence;
                }
                return total / maxAmplitude;
        }
    }
    simplex(x: number, y: number): number {
        const s = (x + y) * F2;
        const cellX = Math.floor(x + s);
        const cellY = Math.floor(y + s);
        const t = (cellX + cellY) * G2;
        const dx0 = x - (cellX - t);
        const dy0 = y - (cellY - t);
        const offsetX1 = dx0 > dy0 ? 1 : 0;
        const offsetY1 = dx0 > dy0 ? 0 : 1;
        const dx1 = dx0 - offsetX1 + G2;
        const dy1 = dy0 - offsetY1 + G2;
        const dx2 = dx0 - 1 + 2 * G2;
        const dy2 = dy0 - 1 + 2 * G2;
        const wrappedX = cellX & 255;
        const wrappedY = cellY & 255;
        const gradIndex0 = this.permutation[wrappedX + this.permutation[wrappedY]] & 7;
        const gradIndex1 = this.permutation[wrappedX + offsetX1 + this.permutation[wrappedY + offsetY1]] & 7;
        const gradIndex2 = this.permutation[wrappedX + 1 + this.permutation[wrappedY + 1]] & 7;
        let t0 = 0.5 - dx0 * dx0 - dy0 * dy0;
        let contrib0 = 0;
        if (t0 >= 0) {
            t0 *= t0;
            contrib0 = t0 * t0 * (GRADIENTS_2D[gradIndex0 * 2] * dx0 + GRADIENTS_2D[gradIndex0 * 2 + 1] * dy0);
        }
        let t1 = 0.5 - dx1 * dx1 - dy1 * dy1;
        let contrib1 = 0;
        if (t1 >= 0) {
            t1 *= t1;
            contrib1 = t1 * t1 * (GRADIENTS_2D[gradIndex1 * 2] * dx1 + GRADIENTS_2D[gradIndex1 * 2 + 1] * dy1);
        }        
        let t2 = 0.5 - dx2 * dx2 - dy2 * dy2;
        let contrib2 = 0;
        if (t2 >= 0) {
            t2 *= t2;
            contrib2 = t2 * t2 * (GRADIENTS_2D[gradIndex2 * 2] * dx2 + GRADIENTS_2D[gradIndex2 * 2 + 1] * dy2);
        }
        return (70 * (contrib0 + contrib1 + contrib2) + 1) * 0.5;
    }
    simplex3(x: number, y: number, z: number): number {
        const s = (x + y + z) * F3;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);
        const k = Math.floor(z + s);
        const t = (i + j + k) * G3;        
        const x0 = x - (i - t);
        const y0 = y - (j - t);
        const z0 = z - (k - t);
        let i1, j1, k1, i2, j2, k2;
        if (x0 >= y0) {
            if (y0 >= z0) {
                i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
            } else if (x0 >= z0) {
                i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1;
            } else {
                i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1;
            }
        } else {
            if (y0 < z0) {
                i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1;
            } else if (x0 < z0) {
                i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1;
            } else {
                i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
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
        const getGrad = (i: number, j: number, k: number) => {
            const idx = this.permutation[ii + i + this.permutation[jj + j + this.permutation[kk + k]]] & 11;
            return idx * 3;
        };
        const contrib = (dx: number, dy: number, dz: number, gradIdx: number) => {
            let t = 0.6 - dx * dx - dy * dy - dz * dz;
            if (t < 0) return 0;
            t *= t;
            return t * t * (
                GRADIENTS_3D[gradIdx] * dx + 
                GRADIENTS_3D[gradIdx + 1] * dy + 
                GRADIENTS_3D[gradIdx + 2] * dz
            );
        };
        const n0 = contrib(x0, y0, z0, getGrad(0, 0, 0));
        const n1 = contrib(x1, y1, z1, getGrad(i1, j1, k1));
        const n2 = contrib(x2, y2, z2, getGrad(i2, j2, k2));
        const n3 = contrib(x3, y3, z3, getGrad(1, 1, 1));
        
        return 32 * (n0 + n1 + n2 + n3);
    }
}