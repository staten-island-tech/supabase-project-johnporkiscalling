export const utilMath = Object.freeze(
    {
        lerp:function(a:number, b:number, t:number)
        {
            return a*(1-t) + b*t;
        }

    }
)


