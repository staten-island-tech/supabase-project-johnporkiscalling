import { randomRange, randomVector, Vector3Stringify, getNeighbors, wallCheck } from "./utils";
import { width, height, length} from "./config"
import { array, rand } from "three/tsl";
import type { axisInfo, cellData } from "./types";
const totalNodes =  width*height*length;
interface testObj:cellData = {
    x: 0,
    y: 1,
    z: 2,
    "left": false,
    "right": true,
    "up": false,
    "down": true,
    "forward": false,
    "back": true
}
const container = initializeContainer(width, height, length);
function initializeContainer(w: number, h: number, l: number): Array<Array<Array<cellData>>> {
    const mazeContainer: Array<Array<Array<cellData>>> =
        Array.from({ length: w }, (_, x) =>
            Array.from({ length: h }, (_, y) => 
                Array.from({ length: l }, (_, z) => 
                    ({
                        x, y, z,
                        left: true, right: true,
                        up: true, down: true,
                        forward: true, back: true
                    } as )
                )
            )
        );

    return mazeContainer;
}
const axisReference = [
    {
        maxWall:"right",
        minWall:"left"
    },
    {
        maxWall:"up",
        minWall:"down"
    },    
    {
        maxWall:"forward",
        minWall:"back"
    }
]
function mergeCells(a:Array<number>,b:Array<number>)
{
    const { max, min, axis} = wallCheck(a,b);
    const axisref = axisReference[axis];
    const [max1,max2,max3] = max;
    const [min1,min2,min3] = min;
    container[max1][max2][max3][axisref.maxWall] = 
    container[min1][min2][min3];

}
function RBT()
{
    const visited = new Set();
    const stack:Array<Array<number>>=[];//replace this with a dll cuz o(1) push and pop operations
    const range = new Map()
    range.set("width", [0, width]);
    range.set("height", [0, height]);
    range.set("length", [0, length]);
    let current =  randomVector(range);//initialize a random point to start generation
    visited.add(Vector3Stringify(current));
    while(visited.size!=totalNodes)
    {
        const neighbors = getNeighbors(current).filter(item=>
            {
                if(visited.has(Vector3Stringify(item)))
                {
                    return false;
                }
                return true;
            }
        )
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


export { initializeContainer,  }