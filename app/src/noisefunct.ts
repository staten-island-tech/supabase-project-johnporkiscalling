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
        const hash = this.permutation[this.permutation[xi] + yi];
        return hash & (gradients.length - 1);
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

const yDir = [0, 0, 1, -1];
const xDir = [1, -1, 0, 0];
const quadrantDirections = {
    1: [[ 1,  0], [ 0, -1]],  // NE: prefer right or down
    2: [[ 1,  0], [ 0, -1]],   // NW: prefer right or down
    3: [[ 1,  0], [ 0,  1]],   // SW: prefer right or up
    4: [[-1,  0], [ 0,  1]]    // SE: prefer left or up
  };

class DLA
{   
    prng:()=>number;
    grid:Uint8Array;
    width:number;
    height:number;
    LoD:number;
    boundary:Set<string>;
    bounds:Array<number>;
    constructor(seed:number, LoD:number)
    {
        this.prng = this.mulberry32(seed);
        const dim = Math.pow(2, LoD);
        this.grid = new Uint8Array(dim*dim);
        this.width = dim;
        this.height = dim;
        this.grid[this.width/2 + (this.height/2) * this.width] = 1;
        this.LoD = LoD;
        this.boundary = new Set();
        this.bounds = []//wnes
    }
    //note:width and height here are different and don't actually map to voxel cords so scale it properly later on
    mulberry32(seed:number) 
    {
        return function() {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }
    }   
    validNeighbors(x:number, y:number)
    {
        const valid = [];
        for(let oY = -1; oY<=1; oY++)
        {
            for(let oX = -1; oX<=1; oX++)
            {
                const nX =  x +  oX, nY = y+oY;
                if (nX >= this.bounds[0] && nX < this.bounds[2] && nY >= this.bounds[1] && nY < this.bounds[3] && this.grid[nY * this.width + nX] != 0 && !this.boundary.has(`${nX},${nY}`)) {
                    valid.push([nX, nY])
                }
            }
        }
        return valid;
    }
    DLAStep()
    {
        const [x,y] = this.getRandomBoundary() as Array<number>;
        if(this.prng() < 0.5)
        {
            this.grid[y* this.width + x] = 0;
            this.boundary.delete(`${x},${y}`);
        }
        else
        {
            let [pX, pY] = this.stepAwayFromCenter(x,y,this.width/2, this.height/2);
            while(true)
            {   
                const neighbors = (this.validNeighbors(pX,pY));
                if(this.grid[pY*this.width+pX] === 1)
                {
                    for(let i = 0; i<neighbors.length; i++)
                    {
                        if(this.grid[neighbors[i][1] * this.width + neighbors[i][0]] === 1)
                        {
                            this.grid[pY * this.width + pX] = 1; 
                            this.updateBoundary(pY,pX);
                            this.boundary.delete(`${x},${y}`);
                            break;
                        }
                    }
                }
                [pX,pY] = this.randomWalk(pX, pY);
            }
        }
    }
    getQuadrant(x:number, y:number, centerX:number, centerY:number) {
        if (x >= centerX) {
          return y >= centerY ? 1 : 4; // Quadrants 1 (NE) or 4 (SE)
        } else {
          return y >= centerY ? 2 : 3; // Quadrants 2 (NW) or 3 (SW)
        }
    }      
    stepAwayFromCenter(x:number, y:number, centerX:number, centerY:number) {
        const quadrant = this.getQuadrant(x, y, centerX, centerY);
        const [dx, dy] = quadrantDirections[quadrant][Math.floor(this.prng() * 2)];
        return [x + dx, y + dy];
    }  
    randomWalk(x:number, y:number)
    {
        const neighbors = this.validNeighbors(x,y);
        const randomNeighbor = neighbors[Math.floor(this.prng()*neighbors.length)];
        return randomNeighbor;
    }
    getRandomBoundary():Array<number>|undefined 
    {
        const index = Math.floor(this.prng() * this.boundary.size)
        let i = 0;
        for(const cell of this.boundary)
        {
            if(i++ === index) return cell.split(',').map(Number);
        }
        return;
    }
    DLAScale()
    {

        let pow = 1;
        let size = Math.pow(2, pow);
        const center = [this.width/2, this.height/2];
        while(pow!=this.LoD)
        {
            //define the grid area
            //biased center towards the lower left corner 
            const expandAmount =  size - 1;
            const nwExpand = Math.ceil(expandAmount/2);
            const seExpand = Math.floor(expandAmount/2);
            const nwBound = [center[0]-nwExpand, center[1]-nwExpand];
            const seBound = [center[0]+seExpand, center[1]+seExpand];
            this.bounds = [...nwBound, ...seBound]; 
            let amountOfParticles = 0;
            while(amountOfParticles!=(size**2/2)-1)
            {
                this.DLAStep();
                
                amountOfParticles+=1;
            }
        }   
    }
    setPixel(x:number, y:number)
    {
        this.grid[y*this.width+x] = 1;
    }
    newInstance(LoD:number)
    {
        const dim = Math.pow(2, LoD);
        this.grid = new Uint8Array(dim*dim);
        this.width =  dim;
        this.height = dim;
        this.grid[this.width/2+(this.height/2) * this.width] = 1;
    }
    updateBoundary(x:number, y:number)
    {
        const neighbors =  this.validNeighbors(x,y);
        for(let i = 0; i< neighbors.length; i++)
        {
            if(this.grid[neighbors[i][1] * this.width +  neighbors[i][0]] === 1)
            {
                continue;
            }
            this.boundary.add(`${neighbors[i][0]},${neighbors[i][1]}`);
        }

    }
}   
const mountainMachine =  new DLA(1,1);
