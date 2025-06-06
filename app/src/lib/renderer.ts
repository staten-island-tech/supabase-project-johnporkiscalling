import { Random, util } from "./utils";
import { Noise } from "./noise";
import { faceDirections } from "./constants";

const testData = new Uint8Array(4096)//single chunk


class ChunkMesher
{
    constructor()
    {
        
    }
    faceOcclude()
    {

    }
}
const CHUNK_LENGTH = 16; 
const CHUNK_AREA = 256;
const CHUNK_VOLUME = 4096;
const faceArray = ["left", "right", "bottom", "top", "back", "front"]
const indexRef:Record<string, Array<number>> = {"left":[1,2,0], "right":[1,2,0], "bottom":[0,2,1], "top":[0,2,1], "back":[1,3,2], "front":[1,3,2]}

//operates on the notion that all the block data for the chunks being loaded has been loaded into memory or some sort of ref area
const chunkData = new Map();
//automatically clears data from the map when out of areac
const column:Map<string, Map<number, Uint8Array>> = new Map();
class TerrainGenerator extends Random
{
    heightNoise:Noise
    constructor(seed:number)
    {
        super(seed);
        //format of this will be an object with keys that act as the y coordinates of the chunks
        //
        this.heightNoise = new Noise(seed);

    }
    generateChunkData(x:number,z:number)
    {
        const chunkData:Map<number, Uint8Array> = new Map();
        //chunKData here
        chunkData.set(1,new Uint8Array());
        return chunkData;
    }
    baseHeightMap(x:number, z:number)
    {
        let xBound = x*16;
        let zBound = x*16;
        const heightMap = new Uint8Array(256)
        for(let x = xBound; x<xBound+16; x++)
        {
            for(let z = zBound; z<zBound+16; z++)
            {
                heightMap[x * 16 + z]=this.heightNoise.simplex(x,z)
            }
        }
        return heightMap
    }
    biomeMap(x:number,z:number)
    {

    }
    riverCarve()
    {

    }
    mountainCreate()
    {

    }
}
//only area where render dist is passed is update

class DataManager
{
    chunkData:Map<string, Map<number, Uint8Array>> = new Map();
    constructor()
    {
        this.chunkData = new Map();
    }
    get(x:number,y:number,z:number)
    {
        return chunkData.get(`${x},${z}`);        
    }
    update(cX:number, cZ:number, bounds:number, tGen:TerrainGenerator)
    {
        const nBound = cZ+bounds;
        const sBound = cZ-bounds;
        const eBound = cX+bounds;
        const wBound = cX-bounds;
        const deleteQueue:Set<string> = new Set();
        for (const [key] of this.chunkData) {
            const [x, , z] = key.split(',').map(Number);
            if (z > nBound || z < sBound || x > eBound || x < wBound) {
                deleteQueue.add(key);
            }
        }
        for (const key of deleteQueue) {
            this.chunkData.delete(key);
        }
        const requiredData:Set<string> = new Set();
        for(let x = wBound; x<eBound; x++)
        {
            for(let z = sBound; z<nBound; z++)
            {
                if(!this.chunkData.has(`${x},${z}`)) requiredData.add(`${x},${z}`);
            }
        }
        this.loadNewData(tGen, requiredData);
    }
    loadNewData(tGen:TerrainGenerator, requiredData:Set<string>)
    {
        for(const string of requiredData)
        {
            const [x,z] = string.split(`,`).map(Number);
            const data = tGen.generateChunkData(x,z);
            this.chunkData.set(string, data)
        }//loads the new world data into storage
    }
    getVoxel(x:number,y:number,z:number)
    {
        const {cCords, lCords} = util.localizeCords(x,y,z);
        const chunkData = this.chunkData.get(`${cCords[0]},${cCords[2]}`)?.get(cCords[1]);
        if(!chunkData) return false;
        return chunkData[util.getIndex(lCords[0], lCords[1], lCords[2])];
    }
    getNeighbor(ax:number,ay:number,az:number)
    {
        const neighbors:Array<boolean> = []
        for(let x = -1; x<=1; x++)
        {
            neighbors.push(this.getVoxel(ax+x,ay,az)!=false);
        }
        for(let y = -1; y<=1; y++)
        {
            neighbors.push(this.getVoxel(ax,ay+y,az)!=false);
        }
        for(let z = -1; z<=1; z++)
        {
            neighbors.push(this.getVoxel(ax,ay,az+z)!=false);
        }
        return neighbors;
    }
}
import * as THREE from "three";
interface FaceInfo
{
    coordinates:string,
    blockType:number
}
class Mesher
{
    meshMap:Map<string, THREE.Mesh>;
    constructor()
    {
        this.meshMap = new Map();
    }
    createMesh(dm:DataManager,ax:number,ay:number,az:number)
    {
        const xBound = ax*16;
        const yBound = ay*16;
        const zBound = az*16;
        const validFaces:Record<string, Record<string, number>> = {}
        for(let x = xBound; x<xBound+16 ; x++)
        {
            for(let y = yBound; y<yBound+16; y++)
            {
                for(let z = zBound; z<zBound+16; z++)
                {
                    const blockType = dm.getVoxel(x,y,z)
                    //converts any 0 data into false
                    if(!!blockType) continue;
                    const neighbors = dm.getNeighbor(x,y,z);
                    for(let i = 0; i<neighbors.length; i++)
                    {
                        if(neighbors[i]==false) continue;
                        validFaces[faceArray[i]][`${x},${y},${z}`] = blockType as number;
                    }
                }
            }   
        }
        const validQuads = this.greedyMesh(validFaces)
    }
    addQuad()
    {

    }
    destroyMesh(key:string, scene:THREE.Scene)
    {
        const data = this.meshMap.get(key)
        scene.remove(data!);
        data!.geometry.dispose();
        this.meshMap.delete(key);
    }
    faceOcclude(data:Uint8Array)
    {
        
    }
    greedyMesh(data:Record<string, Record<string, number>>)//something about w being initialized to 1? just in case leaving a note
    {
        const validQuads = [];
        for(let [key,value] of Object.entries(data))
        {
            let current = 0;
            const faces = Object.keys(value);
            if(faces.length == 0) continue;
            const aAxis = indexRef[key][0];
            const bAxis = indexRef[key][1];
            const visitedQuads =  new Set();
            while(visitedQuads.size!=faces.length)
            {
                let w = 0;
                if(visitedQuads.has(faces[current]))
                {
                    current++;
                    if (current >= faces.length) break;
                    continue;
                }
                const blockType = value[faces[current]]
                visitedQuads.add(faces[current]);
                let face = faces[current].split(',').map(Number);
                let firstBound;
                while(true)
                {
                    let currentPos = [...face];
                    currentPos[aAxis]++;
                    const str = `${currentPos.join(',')}`
                    if(!value[str]||value[str]!=blockType) 
                    {
                        currentPos[aAxis]--;
                        firstBound = currentPos;
                        break;
                    }
                    visitedQuads.add(str)
                    w++
                    
                }
                let v = 0;
                while(true)
                {
                    const currentPos = [...face];
                    currentPos[bAxis]++;
                    let sucess = true;
                    for(let i = 0; i<w; i++)
                    {
                        const newCopy = [...currentPos];
                        newCopy[aAxis]+=i;
                        const str = `${newCopy.join(',')}`;
                        if(!value[str]||value[str]!=blockType) 
                        {
                            sucess = false;
                            break
                        };
                        visitedQuads.add(str);
                    }
                    if(!sucess) break;
                    v++;
                }
                if(!(v!=0 && w!=0)) 
                {
                    validQuads.push([face, face, key, blockType])
                }
                else
                {
                    const copy = [...face];
                    copy[bAxis]+=v;
                    copy[aAxis]+=w;
                    validQuads.push([face, copy, key, blockType])
                }
            }

        }   
        return validQuads;        
    }
    meshAxis()
    {

    }
}

