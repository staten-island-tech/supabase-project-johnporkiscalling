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
//operates on the notion that all the block data for the chunks being loaded has been loaded into memory or some sort of ref area
const chunkData = new Map();
//automatically clears data from the map when out of areac
const column:Map<string, Map<number, Uint8Array>> = new Map();
class TerrainGenerator
{
    constructor()
    {
        
        //format of this will be an object with keys that act as the y coordinates of the chunks
        //
    }
    generateChunkData(x:number,z:number)
    {
        const chunkData:Map<number, Uint8Array> = new Map();
        //chunKData here
        chunkData.set(1,new Uint8Array());
        return chunkData;
    }
}
//only area where render dist is passed is update

class UpdateChunkData
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

}


const chunkMesher = Object.freeze(
    {
        faceOccude(data:Uint8Array)
        {
            const occludedFaces = new Map();

            for(let x = 0; x<CHUNK_LENGTH; x++)
            {
                for(let y = 0; y<CHUNK_LENGTH; y++)
                {
                    for(let z = 0; z<CHUNK_LENGTH; z++)
                    {
                        
                    }
                }
            }
        },
        getNeighbors(x:number,y:number,z:number)
        {
            
            return []
        },
        greedyMesh(occludedFaces:Map<string, number>)
        {
            for(const [key, faces] of occludedFaces)
            {

            }
        }

    }
)