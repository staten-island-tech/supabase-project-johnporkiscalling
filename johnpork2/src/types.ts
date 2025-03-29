interface axisInfo 
{
    max:Array<number>,
    min:Array<number>,
    axis:number
}
interface cellData
{
    x:number,
    y:number,
    z:number,
    left:boolean,
    right:boolean, 
    up:boolean,
    down:boolean,
    forward:boolean, 
    back:boolean
}

export type { axisInfo, cellData };