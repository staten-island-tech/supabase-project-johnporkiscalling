import * as THREE from 'three';
export class Random {
    private lcgState: number;
    constructor(seed: number) {
        this.lcgState = seed;
    }
    lcg() {
        this.lcgState = (this.lcgState * 1664525 + 1013904223) >>> 0;
        return this.lcgState;
    }
}
export class UniversalIntArray
{
    size:number;
    bits:number;
    array:Uint16Array;
    entries:number
    constructor(size:number, bits:number)
    {
        this.size =  size;
        this.bits = bits;
        const bitTotal = size*bits;
        const arraySize = (16/bitTotal);
        this.array = new Uint16Array(arraySize);
        this.entries = Math.floor(16/size);
    }
    get(index:number)
    {
        const wordIndex = Math.floor(index/this.entries);
        const bitOffset = (index % this.entries) * this.entries;
        const word = this.array[wordIndex];
        return (word >>> bitOffset) & ((1 << this.entries) -1 );
    }
    set(index:number, value:number)
    {
        const wordIndex = Math.floor(index/this.entries);
        const bitOffset = (index % this.entries) * this.entries;
        const word = this.array[wordIndex];
        const mask  = ((1 << this.entries) -1 ) << bitOffset;
        this.array[wordIndex] = (this.array[wordIndex] & ~mask) | ((value << bitOffset) & mask)
    }
}
const textureLoader = new THREE.TextureLoader();
export const util = Object.freeze(
    {
        loadBlockTexture(path: string) {
            const tex = textureLoader.load(path);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
            tex.generateMipmaps = true;
            tex.premultiplyAlpha = false;
            return tex;
        },
        localizeCords: function (wX: number, wY: number, wZ: number) {
            const cX = Math.floor(wX / 16);
            const cY = Math.floor(wY / 16);
            const cZ = Math.floor(wZ / 16);
            const cCords = [cX, cY, cZ];

            const lX = ((wX % 16) + 16) % 16;
            const lY = ((wY % 16) + 16) % 16;
            const lZ = ((wZ % 16) + 16) % 16;
            const lCords = [lX, lY, lZ];

            return { cCords, lCords };
        },
        clamp(min:number, max:number, value:number)
        {
            return Math.max(min, Math.min(max, value))
        },
        getIndex(x: number, y: number, z: number)  
        {
            return x + 16 * (y + 16 * z)
        },
            lerp: function (a: number, b: number, t: number)//t must be between 0-1;
        {
            return a * (1 - t) + b * t;
        },
        fade: function (t: number)//limit =  0 to 1;
        {
            return t * t * t * (t * (t * 6 - 15) + 10);
        },
        dot: function (a: Array<number>, b: Array<number>) {
            return a[0] * b[0] + a[1] * b[1];
        },
        roundTo: function (number: number, decimal: number) {
            const place = 10 ** decimal;
            return Math.round(number * place) / place;
        }
    }
)
