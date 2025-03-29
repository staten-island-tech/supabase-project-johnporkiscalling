import { width, height, length } from "./config";
import type { axisInfo } from "./types";
function delay(ms:number)
{
    return new Promise(resolve=>setTimeout(resolve, ms))
}
function randomRange(min:number, max:number)
{
    return Math.floor(Math.random()*(max-min)+min);
}
function wallCheck(a:Array<number>, b:Array<number>):axisInfo//Checks two cords and return what walls to modify or check
{//for 3d instead of checking for the same axises coords check for the differing axises cords and use that.
//only 1 comparison compared to 2
    if(a[0]!==b[0])
    {
        return {
            max:a[0] > b[0] ? a : b,
            min:a[0] > b[0] ? b : a,
            axis : 0
        }
    }
    else if(a[1]!==b[1])
    {
        return {
            max:a[1] > b[1] ? a : b,
            min:a[1] > b[1] ? b : a,
            axis : 1
        }
    }
    else if(a[2]!==b[2])
    {
        return {
            max:a[2] > b[2] ? a : b,
            min:a[2] > b[2] ? b : a,
            axis : 2
        }
    }
    throw new Error("you suck at writing code do better")
    //account for 3 axises
    //there is two axises that will be similar to an adjacent node
    //therefore to write the wall-check fn just add a function that checks for the similarities between two axises of nodes
}
function getNeighbors(coordinate:Array<number>, visitedNodes?:Set<string>)
{
    const neighbors:Array<Array<number>> = [
        [coordinate[0],coordinate[1], coordinate[2]+1],
        [coordinate[0],coordinate[1], coordinate[2]-1],
        [coordinate[0],coordinate[1]+1, coordinate[2]],
        [coordinate[0],coordinate[1]-1, coordinate[2]],
        [coordinate[0]+1,coordinate[1], coordinate[2]],
        [coordinate[0]-1,coordinate[1], coordinate[2]]
    ];  

    neighbors.filter(item=>
    {
        if(item[0]<0||item[1]<0||item[2]<0)
        {
            return false;
        }
        if(item[0]>width-1||item[1]>height-1||item[2]>length-1)
        {
            return false;
        }
    })
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
export {delay, randomRange, wallCheck, mDist3d, randomVector, Vector3Stringify, getNeighbors };
