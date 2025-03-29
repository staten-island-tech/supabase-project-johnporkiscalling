import { randomRange, randomVector, Vector3Stringify, getNeighbors, wallCheck } from "./utils";
import { width, height, length} from "./config"
import { rand } from "three/tsl";
import type { axisInfo } from "./types";
const totalNodes =  width*height*length;
const mazeContainer:Array<Array<Array<number>>> = []
function initializeContainer(w:number,h:number,l:number)
{
    for(let x = 0; x<w; x++)
    {
        
        for(let y = 0; y<h; y++)
        {
            for(let z = 0; z<l; z++)
            {
            }
        }
    }
}
function RBT()
{
    const visited = new Set();
    const stack:Array<Array<number>>=[];
    const range = new Map()
    range.set("width", [0, width]);
    range.set("height", [0, height]);
    range.set("length", [0, length]);
    let current =  randomVector(range);//initialize a random point to start generation
    visited.add(Vector3Stringify(current));
    while(visited.size!=totalNodes)
    {
        const neighbors = getNeighbors(current)//apply the wrapper here
        if(neighbors.length>0)
        {
            const randNeighbor = neighbors[randomRange(0, neighbors.length)];
            current = randNeighbor;
            //add function here to open a path between two walls.
            visited.add(Vector3Stringify(randNeighbor));
            stack.push(randNeighbor)
        }
        else{  
            if(stack.length==0){return};
            current=stack.pop() as Array<number>;
        }
    }
}
function manipulateWalls(a:Array<number>,b:Array<number>)
{
    const { max , min , axis } = wallCheck(a, b);//should always return an object with key being string and array

}