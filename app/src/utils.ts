import { atlasData } from "./atlas";
export const util3d = Object.freeze(
    {
        getUVCords:function(textureName:string)
        {
            const stuff = atlasData.frames[textureName];
            if(!stuff)
            {
              console.warn("missing texture for this item. idk man")
            }
            const { x,y,w,h } = stuff;
            const { width: texWidth, height: texHeigh } =  atlasData.textureSize;
            const left =  x / texWidth
            const right = ( x+w ) / texWidth;
            const top = 1 -  y /texHeigh;
            const bottom = 1 - (y+h)/texHeigh;
            const padding = 0.0000055;
            return [
              left + padding, bottom + padding,  // bottom-left
              right - padding, bottom + padding, // bottom-right
              right - padding, top - padding,    // top-right
              left + padding, top - padding      // top-left
            ];
        }
    }
)

export const utilMath = Object.freeze(
    {
        lerp:function(a:number, b:number, t:number)//t must be between 0-1;
        {
            return a*(1-t) + b*t;
        },
        fade:function(t:number)//limit =  0 to 1;
        {
            return t*t*t*(t*(t*6 -15) + 10);
        },
        dot:function(a:Array<number>, b:Array<number>)
        {
            return  a[0]*b[0]+a[1]*b[1];
        },
        roundTo:function(number:number, decimal:number)
        {
            const place = 10**decimal;
            return Math.round(number*place)/place;
        }
    }
)



