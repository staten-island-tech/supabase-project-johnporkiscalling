import { atlasData } from "./atlas";
export const util3d = Object.freeze(
    {
        getUVCords: function (textureName: string) {
            const stuff = atlasData.frames[textureName];
            if (!stuff) {
                console.warn("missing texture for this item. idk man")
            }
            const { x, y, w, h } = stuff;
            const { width: texWidth, height: texHeigh } = atlasData.textureSize;
            const left = x / texWidth
            const right = (x + w) / texWidth;
            const top = 1 - y / texHeigh;
            const bottom = 1 - (y + h) / texHeigh;
            const padding = 0.0001;
            return [
                left + padding, bottom + padding,  // bottom-left
                right - padding, bottom + padding, // bottom-right
                right - padding, top - padding,    // top-right
                left + padding, top - padding      // top-left
            ];
        },
        gtlCords: function (wX: number, wY: number, wZ: number) {
            const cX = wX >> 4;
            const cY = wY >> 4;
            const cZ = wZ >> 4;
            const chunkCords = [cX, cY, cZ];
            const lX = Math.abs(wX) & 15;
            const lY = Math.abs(wY) & 15;
            const lZ = Math.abs(wZ) & 15;
            const localCords = [lX, lY, lZ];
            return { chunkCords, localCords };
        },
        getChunkKey(coords: Array<number>) {
            let string = ``
            coords.forEach((number) => {
                string += `${number}`
            })
            return string
        },
        euclideanDistance(a: Array<number>, b: Array<number>) {
            const x = a[0] - b[0];
            const y = a[1] - b[1];
            return Math.sqrt(x * x + y * y);
        }

    }
)
export const utilMath = Object.freeze(
    {
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
//max depth =  1 by 1 by 1 voxel
export class Octree {
    octree: Array<number>
    maxDepth: number
    constructor(boundary: Array<Array<number>>, maxDepth: number) {
        this.octree = [];
        this.maxDepth = maxDepth
    }
    subdivide(index: number) {

    }
    private setInitialNode(bounds: Array<number>) {
        this.octree.push
    }
    isLeaf(nodeIndex: number) {

    }
    depth(nodeIndex: number) {

    }
    mergeOctrees(o2: Octree) {
        //only merges if its root node is the same size
        //if it does get merged it does not perserve the leaf nodes and only combines the root nodes. along with that it'll also create theother 6 nodes of the part of the node
        //
        this.octree[0]
    }
    private addNode(i: number, data: number) {
        this.octree[8 * i + 1] = data;
    }
    //sets a node at a given position provided data 
}
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
export class BiomeStack extends Random {
    map: Array<boolean>
    cache: Map<string, Array<number>>
    constructor(seed: number) {
        super(seed);
        this.cache = new Map();
        this.map = [];
    }
    initialState() {
        for (let x = 0; x < 4; x++) {
            for (let z = 0; z < 4; z++) {
                const land = this.lcg() % 10 === 0 ? true : false;
                this.map[4 * x + z] = land;
            }
        }
    }
    doubleResolution() {

    }


}
class DLA {
    private lcgState = 0;
    dim: number
    grid: Uint8Array;
    boundary: Map<string, number>
    constructor(dim: number) {
        this.dim = dim;
        this.grid = new Uint8Array(dim * dim);
        this.boundary = new Map();
    }
    private lcg() {
        this.lcgState = (this.lcgState * 1664525 + 1013904223) >>> 0;
        return this.lcgState;
    }

    //define a grid that starts at a given size 

}

export class BitArray {
    array: Uint8Array;
    size: number;
    constructor(size: number) {
        this.size = size;
        this.array = new Uint8Array(Math.ceil(size / 8));
    }

    set(index: number, value: boolean) {
        const byteIndex = index >> 3;
        const bitIndex = index & 7;
        if (value) {
            this.array[byteIndex] |= (1 << bitIndex);
        } else {
            this.array[byteIndex] &= ~(1 << bitIndex);
        }
    }

    get(index: number) {
        const byteIndex = index >> 3;
        const bitIndex = index % 8;
        return (this.array[byteIndex] & (1 << bitIndex)) !== 0;
    }
}





//in the area where you call the class maintain a depth counter of the current octree node