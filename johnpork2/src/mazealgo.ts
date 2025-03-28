import { randomRange, randomVector, Vector3Stringify } from "./utils";
import { width, height, length} from "./config"
import { Vector3 } from "three";
const totalNodes =  width*height*length;
function RBT()
{
    const visited = new Set();
    const stack = [];
    const range = new Map()
    range.set("width", [0, width]);
    range.set("height", [0, height]);
    range.set("length", [0, length]);
    let current =  randomVector(range);//initialize a random point to start generation
    visited.add(Vector3Stringify(current));
    while(visited.size!=totalNodes)
}