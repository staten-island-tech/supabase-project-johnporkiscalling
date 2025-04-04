const Perlin = Object.freeze(
    {
        randomUnitVector:function(seed){
            const rand = PRNG.lcg(seed);
            return rand%256//gives a number between 0-255

        },
        permuate:function()
        {
            const perms:Array<number> = [];
            for(let i = 0; i<256; i++)//generate the numbers of 0-255
            {
                perms[i] = i;
            }
            for(let i = 255; i> 0; i--)//shuffle
            {
                const rIndex:number = Math.floor(Math.random()* (i+1));
                [perms[i], perms[rIndex]]  = [perms[rIndex], perms[i]];
            }
            for(let i = 0; i < 512; i++)//duplicate for value indexes exceeding 255
            {
                perms[i+256] = perms[i%256];
            }
            return perms;
        }

    }
)
const PRNG = Object.freeze(
    {
        lcg:function(seed:number)
        {
            const a =  1664525;
            const c =  1013904223;
            const m = 4294967296;
            return (a*seed+c) % m;
        }
    }
)
export { Perlin }

