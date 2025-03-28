function delay(ms:number)
{
    return new Promise(resolve=>setTimeout(resolve, ms))
}
function randomRange(min:number, max:number)
{
    return Math.floor(Math.random()*(max-min)+min);
}
function wall_check(a:Array<number>, b:Array<number>)//Checks two cords and return what walls to modify or check
{
    if(a[0]===b[0])
    {
        return {
            max:a[1] > b[1] ? a : b,
            min:a[1] > b[1] ? b : a,
            axis :  [1,2]
        }
    }
    else if(a[1]===b[1])
    {
        return {
            max:a[0] > b[0] ? a : b,
            min:a[0] > b[0] ? b : a,
            axis : [0,2]
        }
    }
    else if(a[2]===b[2])
        {
            return {
                max:a[0] > b[0] ? a : b,
                min:a[0] > b[0] ? b : a,
                axis : [0,1]
            }
        }
    //account for 3 axises
    //there is two axises that will be similar to an adjacent node
    //therefore to write the wall-check fn just add a function that checks for the similarities between two axises of nodes
}
function getNeighbors(coordinate:Array<number>, visitedNodes?:Set<string>)
{
    const neighbors:Array<Array<Number>> = [];
    neighbors.push([])
    return neighbors;
}
function mDist3d(a:Array<number>, b:Array<number>)//finds the manhattan distance for x,y,z cords
{
    return Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]) + Math.abs(a[2]-b[2]);
}
function randomVector(ranges:Map<string,Array<number>>)//returns a random vector of parsed length
{
    const vector:Array<number> = [];
    ranges.forEach((value, key) => {
        vector.push(randomRange(value[0],value[1]));
    });
    return vector;
}
function Vector3Stringify(coords:Array<number>)
{
    return `${coords[0]},${coords[1]},${coords[2]}`;
}
export {delay, randomRange, wall_check, mDist3d, randomVector, Vector3Stringify};
