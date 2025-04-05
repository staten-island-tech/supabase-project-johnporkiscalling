export const utilMath = Object.freeze(
    {
        lerp:function(a:number, b:number, t:number)//t must be between 0-1;
        {
            return a*(1-t) + b*t;
        },
        fade:function(t:number)//limit =  0 to 1;
        {
            return t*t*t*(t*(t*6 -15) + 10);
        }
    }
)


