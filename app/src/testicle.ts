import { utilMath } from "./test";
const Perlin =  Object.freeze(
    {
        lcg:function(seed:number)
        {
            return (seed * 6364136223846793005 + 1) >>> 0;
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
//parameters for perlin noise that the user passes in
//grid size ex:16
//seed: used for LCG prng generator
//this.hash table should be se


export { Perlin }