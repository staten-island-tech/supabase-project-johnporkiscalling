import { utilMath } from "./utils";
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
//scew factors for simplex
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
export class Noise
{
    seed:number
    permutation:Array<number>
    constructor(seed:number)
    {
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
        return this.permutation[
          this.permutation[xi] + yi 
        ];
    }
    perlin(x:number,y:number)
     {
         const xi = Math.floor(x)
         const yi = Math.floor(y)
         const xf = x - xi;
         const yf = y - yi;
         const u = utilMath.fade(xf);
         const v = utilMath.fade(yf);
         const v00 = (this.hash(xi, yi) % gradients.length + gradients.length) % gradients.length;
         const v01 = (this.hash(xi, yi + 1) % gradients.length + gradients.length) % gradients.length;
         const v10 = (this.hash(xi + 1, yi) % gradients.length + gradients.length) % gradients.length;
         const v11 = (this.hash(xi + 1, yi + 1) % gradients.length + gradients.length) % gradients.length; 
         const dp00 = gradients[v00][0] * xf + gradients[v00][1] * yf;
         const dp01 = gradients[v01][0] * xf + gradients[v01][1] * (yf-1);
         const dp10 = gradients[v10][0] * (xf-1) + gradients[v10][1] * yf;
         const dp11 = gradients[v11][0] * (xf-1) + gradients[v11][1] * (yf-1);
         const x1 = utilMath.lerp(dp00, dp10, u);
         const x2 = utilMath.lerp(dp01, dp11, u);
         const value = utilMath.lerp(x1, x2, v)/2; 
         return value * Math.SQRT1_2
     }
     octaveNoise(x:number, y:number, octaves:number, persistence:number, amplitude:number, frequency:number, lacunarity:number,type:(x:number, y:number)=>number)
     {
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
        if (dx0 > dy0) 
        {
            offsetX1 = 1; offsetY1 = 0;
        } 
        else 
        {
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
            contrib0 = t0 * t0 * utilMath.dot(grad3[gradIndex0], [dx0, dy0]);
        }
    
        let t1 = 0.5 - dx1 * dx1 - dy1 * dy1;
        if (t1 >= 0) {
            const gradIndex1 = this.permutation[wrappedX + offsetX1 + this.permutation[wrappedY + offsetY1]] % 8;
            t1 *= t1;
            contrib1 = t1 * t1 * utilMath.dot(grad3[gradIndex1], [dx1, dy1]);
        }
    
        let t2 = 0.5 - dx2 * dx2 - dy2 * dy2;
        if (t2 >= 0) {
            const gradIndex2 = this.permutation[wrappedX + 1 + this.permutation[wrappedY + 1]] % 8;
            t2 *= t2;
            contrib2 = t2 * t2 * utilMath.dot(grad3[gradIndex2], [dx2, dy2]);
        }
    
        return 70 * (contrib0 + contrib1 + contrib2);
    }
  
}
