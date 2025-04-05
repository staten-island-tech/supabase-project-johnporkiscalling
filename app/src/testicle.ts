import { utilMath } from "./test";
const Perlin =  Object.freeze(
    {
        lcg:function(seed:number)
        {
            return (seed * 1664525 + 1013904223) % 4294967296;
        },       
        permutate(seed:number)
        {
            const perm =  [...Array(256).keys()];
            let currentSeed = seed;
            for(let i = 255; i>0; i--)
            {
                currentSeed = this.lcg(currentSeed);
                const j = currentSeed%(i+1);
                [perm[i], perm[j]] = [perm[j], perm[i]];
            }
            return perm;
        }
    }
)
const hashTable = Object.freeze(
    {
        lcg:function(seed:number)
        {
            return (seed * 1664525 + 1013904223) % 4294967296;
        },       
        permutate(seed:number)
        {
            const perm =  [...Array(256).keys()];
            let currentSeed = seed;
            for(let i = 255; i>0; i--)
            {
                currentSeed = this.lcg(currentSeed);
                const j = currentSeed%(i+1);
                [perm[i], perm[j]] = [perm[j], perm[i]];
            }
            return perm;
        }
    }
)
const gradients = [
    [1, 1], [-1, 1], [1,-1], [-1,-1],
    [1, 0], [-1, 0], [0, 1], [0, -1]
]
class PerlinTwo
{
    seed:number = 0; 
    hashTable:Array<number> = [];
    constructor(seed:number)
    {
        this.seed = seed;
        this.hashTable  = hashTable.permutate(seed);
    }
    hash(x:number, y:number)
    {
        return this.hashTable[((x%256)+y)%256]
    }
    noise(x:number,y:number)//gotta add something else to make it more varied 
    {
        //get the truncated int
        const xi = Math.floor(x)
        const yi = Math.floor(y)

        //get the decimals
        const xf = x - xi;
        const yf = y - yi;
        
        //smooth it
        const u = utilMath.fade(xf);
        const v = utilMath.fade(yf);

        //get the grad unit vectors index
        const v00 = this.hash(xi,yi) %8;
        const v01 = this.hash(xi,yi+1)%8;
        const v10 = this.hash(xi+1,yi)%8;
        const v11 = this.hash(xi+1,yi+1)%8;
        
        //calculate the dot products between grad and displacement vectors
        const dp00 = gradients[v00][0] * xf + gradients[v00][1] * yf;
        const dp01 = gradients[v01][0] * xf + gradients[v01][1] * (yf-1);
        const dp10 = gradients[v10][0] * (xf-1) + gradients[v10][1] * yf;
        const dp11 = gradients[v11][0] * (xf-1) + gradients[v11][1] * (yf-1);

        //lerp it
        const x1 = utilMath.lerp(dp00, dp10, u);
        const x2 = utilMath.lerp(dp01, dp11, u);
        return utilMath.lerp(x1, x2, v)*0.3; 
    }
}
//parameters for perlin noise that the user passes in
//grid size ex:16
//seed: used for LCG prng generator
//this.hash table should be se


export { Perlin }