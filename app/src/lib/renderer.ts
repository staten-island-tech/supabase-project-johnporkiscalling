import { Random, util } from "./utils";
import { Noise } from "./noise";
import { faceDirections } from "./constants";

const testData = new Uint8Array(4096)//single chunk
const CHUNK_LENGTH = 16; 
const CHUNK_AREA = 256;
const CHUNK_VOLUME = 4096;
const faceArray = ["left", "right", "bottom", "top", "back", "front"]
const indexRef:Record<string, Array<number>> = {"left":[1,2,0], "right":[1,2,0], "bottom":[0,2,1], "top":[0,2,1], "back":[1,3,2], "front":[1,3,2]}
const BLOCK_TYPES = {
    AIR: 0,
    STONE: 1,
    DIRT: 2,
    GRASS: 3,
    SAND: 4,
    WATER: 5,
    SNOW: 6,
    ICE: 7,
    COAL_ORE: 8,
    IRON_ORE: 9,
    BEDROCK: 10
};
const BIOMES = {
    PLAINS: 0,
    DESERT: 1,
    MOUNTAINS: 2,
    FOREST: 3,
    TUNDRA: 4,
    OCEAN: 5
};
export class TerrainGenerator extends Random {
    heightNoise: Noise;
    biomeNoise: Noise;
    caveNoise: Noise;
    riverNoise: Noise;
    oreNoise: Noise;
    detailNoise: Noise;

    constructor(seed: number) {
        super(seed);
        this.heightNoise = new Noise(seed);
        this.biomeNoise = new Noise(seed + 1000);
        this.caveNoise = new Noise(seed + 2000);
        this.riverNoise = new Noise(seed + 3000);
        this.oreNoise = new Noise(seed + 4000);
        this.detailNoise = new Noise(seed + 5000);
    }

    generateChunkData(chunkX: number, chunkZ: number): Map<number, Uint8Array> {
        const chunkData: Map<number, Uint8Array> = new Map();
        
        // Generate height and biome maps for this chunk
        const heightMap = this.baseHeightMap(chunkX, chunkZ);
        const biomeMap = this.biomeMap(chunkX, chunkZ);
        
        // Determine Y range needed based on height map
        const minHeight = Math.min(...heightMap);
        const maxHeight = Math.max(...heightMap);
        const minChunkY = Math.floor(minHeight / 16) - 1; // Extra buffer for caves/ores
        const maxChunkY = Math.floor(maxHeight / 16) + 1;
        
        // Generate each Y chunk section
        for (let chunkY = 0; chunkY <= maxChunkY; chunkY++) {
            const chunkBlocks = this.generateChunkSection(chunkX, chunkY, chunkZ, heightMap, biomeMap);
            if (chunkBlocks.some(block => block !== BLOCK_TYPES.AIR)) {
                chunkData.set(chunkY, chunkBlocks);
            }
        }
        
        return chunkData;
    }

    generateChunkSection(chunkX: number, chunkY: number, chunkZ: number, heightMap: Uint8Array, biomeMap: Uint8Array): Uint8Array {
        const blocks = new Uint8Array(4096); // 16x16x16 = 4096
        const worldX = chunkX * 16;
        const worldY = chunkY * 16;
        const worldZ = chunkZ * 16;
        
        for (let x = 0; x < 16; x++) {
            for (let z = 0; z < 16; z++) {
                const localIndex = x * 16 + z;
                const surfaceHeight = heightMap[localIndex];
                const biome = biomeMap[localIndex];
                const absX = worldX + x;
                const absZ = worldZ + z;
                
                for (let y = 0; y < 16; y++) {
                    const absY = worldY + y;
                    const blockIndex = y * 256 + z * 16 + x; // y * 16 * 16 + z * 16 + x
                    
                    // Skip if above surface (unless water level)
                    if (absY > surfaceHeight + 5) {
                        blocks[blockIndex] = BLOCK_TYPES.AIR;
                        continue;
                    }
                    
                    // Bedrock layer
                    if (absY <= 2) {
                        blocks[blockIndex] = BLOCK_TYPES.BEDROCK;
                        continue;
                    }
                    
                    // Check for caves
                    if (this.isCave(absX, absY, absZ)) {
                        blocks[blockIndex] = BLOCK_TYPES.AIR;
                        continue;
                    }
                    
                    // Check for rivers (at surface level)
                    if (Math.abs(absY - surfaceHeight) <= 2 && this.isRiver(absX, absZ)) {
                        blocks[blockIndex] = BLOCK_TYPES.WATER;
                        continue;
                    }
                    
                    // Generate terrain based on height and biome
                    blocks[blockIndex] = this.getBlockType(absX, absY, absZ, surfaceHeight, biome);
                }
            }
        }
        
        return blocks;
    }

    baseHeightMap(chunkX: number, chunkZ: number): Uint8Array {
        const heightMap = new Uint8Array(256); // 16x16
        const worldX = chunkX * 16;
        const worldZ = chunkZ * 16;
        
        for (let x = 0; x < 16; x++) {
            for (let z = 0; z < 16; z++) {
                const absX = worldX + x;
                const absZ = worldZ + z;
                
                // Multi-octave noise for varied terrain
                const baseHeight = this.heightNoise.octaveNoise(
                    absX * 0.005, absZ * 0.005, // Low frequency for large features
                    4, 0.5, 1.0, 1.0, 2.0,
                    (x, z) => this.heightNoise.simplex(x, z)
                ) * 60 + 64; // Scale to 64-124 range
                
                // Add mountains
                const mountainHeight = this.mountainCreate(absX, absZ);
                
                // Final height
                const finalHeight = Math.max(0, Math.min(255, baseHeight + mountainHeight));
                heightMap[x * 16 + z] = Math.floor(finalHeight);
            }
        }
        
        return heightMap;
    }

    biomeMap(chunkX: number, chunkZ: number): Uint8Array {
        const biomeMap = new Uint8Array(256); // 16x16
        const worldX = chunkX * 16;
        const worldZ = chunkZ * 16;
        
        for (let x = 0; x < 16; x++) {
            for (let z = 0; z < 16; z++) {
                const absX = worldX + x;
                const absZ = worldZ + z;
                
                // Temperature and humidity maps
                const temperature = this.biomeNoise.simplex(absX * 0.003, absZ * 0.003);
                const humidity = this.biomeNoise.simplex(absX * 0.003 + 1000, absZ * 0.003 + 1000);
                
                // Determine biome based on temperature and humidity
                let biome = BIOMES.PLAINS;
                
                if (temperature < -0.3) {
                    biome = BIOMES.TUNDRA;
                } else if (temperature > 0.4 && humidity < -0.2) {
                    biome = BIOMES.DESERT;
                } else if (temperature > -0.1 && temperature < 0.3 && humidity > 0.2) {
                    biome = BIOMES.FOREST;
                } else if (temperature < 0.6 && this.isNearWater(absX, absZ)) {
                    biome = BIOMES.OCEAN;
                }
                
                biomeMap[x * 16 + z] = biome;
            }
        }
        
        return biomeMap;
    }

    riverCarve(x: number, z: number): boolean {
        // Create winding rivers using multiple octaves
        const riverNoise1 = this.riverNoise.simplex(x * 0.01, z * 0.01);
        const riverNoise2 = this.riverNoise.simplex(x * 0.02 + 100, z * 0.02 + 100);
        
        // Rivers follow noise valleys
        return Math.abs(riverNoise1) < 0.1 || Math.abs(riverNoise2) < 0.08;
    }

    mountainCreate(x: number, z: number): number {
        // Mountain regions using simplex noise
        const mountainMask = this.heightNoise.simplex(x * 0.002, z * 0.002);
        
        if (mountainMask > 0.3) {
            // Add height variation in mountain regions
            const mountainHeight = this.heightNoise.octaveNoise(
                x * 0.008, z * 0.008,
                6, 0.6, 1.0, 1.0, 2.0,
                (x, z) => this.heightNoise.simplex(x, z)
            ) * 80; // Up to 80 blocks additional height
            
            return mountainHeight * (mountainMask - 0.3) * 2; // Fade in mountains
        }
        
        return 0;
    }

    private getBlockType(x: number, y: number, z: number, surfaceHeight: number, biome: number): number {
        const depthFromSurface = surfaceHeight - y;
        
        // Surface blocks based on biome
        if (depthFromSurface <= 0) {
            switch (biome) {
                case BIOMES.DESERT:
                    return BLOCK_TYPES.SAND;
                case BIOMES.TUNDRA:
                    return y > 120 ? BLOCK_TYPES.SNOW : BLOCK_TYPES.GRASS;
                case BIOMES.OCEAN:
                    return y < surfaceHeight - 3 ? BLOCK_TYPES.SAND : BLOCK_TYPES.WATER;
                default:
                    return BLOCK_TYPES.GRASS;
            }
        }
        
        // Subsurface layers
        if (depthFromSurface <= 3) {
            return biome === BIOMES.DESERT ? BLOCK_TYPES.SAND : BLOCK_TYPES.DIRT;
        }
        
        // Check for ores in stone layer
        if (depthFromSurface > 3) {
            const oreChance = this.oreNoise.simplex3(x * 0.1, y * 0.1, z * 0.1);
            
            if (y < 16 && oreChance > 0.6) {
                return BLOCK_TYPES.IRON_ORE;
            } else if (y < 32 && oreChance > 0.7) {
                return BLOCK_TYPES.COAL_ORE;
            }
            
            return BLOCK_TYPES.STONE;
        }
        
        return BLOCK_TYPES.AIR;
    }

    private isCave(x: number, y: number, z: number): boolean {
        if (y < 8 || y > 120) return false; // No caves too high or low
        
        // 3D cave system using simplex noise
        const caveNoise1 = this.caveNoise.simplex3(x * 0.02, y * 0.02, z * 0.02);
        const caveNoise2 = this.caveNoise.simplex3(x * 0.03 + 100, y * 0.03, z * 0.03 + 100);
        
        // Caves where noise values are close to 0
        
        return (Math.abs(caveNoise1) < 0.15 && Math.abs(caveNoise2) < 0.1) ||
               (Math.abs(caveNoise1) < 0.1 && Math.abs(caveNoise2) < 0.15);
    }

    private isRiver(x: number, z: number): boolean {
        return this.riverCarve(x, z);
    }

    private isNearWater(x: number, z: number): boolean {
        // Simple check for ocean biome proximity
        const waterNoise = this.biomeNoise.simplex(x * 0.005, z * 0.005);
        return waterNoise < -0.4;
    }
}
//only area where render dist is passed is update

export class DataManager
{
    chunkData:Map<string, Map<number, Uint8Array>> = new Map();
    constructor()
    {
        this.chunkData = new Map();
    }
    get(x:number,y:number,z:number)
    {
        return this.chunkData.get(`${x},${z}`);        
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
        for(let x = wBound; x<=eBound; x++)
        {
            for(let z = sBound; z<=nBound; z++)
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
            if(x==0) continue;
            neighbors.push(this.getVoxel(ax+x,ay,az)!=false);
        }
        for(let y = -1; y<=1; y++)
        {
            if(y==0) continue;
            neighbors.push(this.getVoxel(ax,ay+y,az)!=false);
        }
        for(let z = -1; z<=1; z++)
        {
            if(z==0)continue;
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
export class Mesher
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
        const vertices = [];
        const uvs = [];
        const index = [];
        const validFaces:Record<string, Record<string, number>> = {
            "top":{},
            "bottom":{},
            "right":{},
            "left":{},
            "front":{},
            "back":{}
        }
        console.log(validFaces)
        for(let x = xBound; x<xBound+16 ; x++)
        {
            for(let y = yBound; y<yBound+16; y++)
            {
                for(let z = zBound; z<zBound+16; z++)
                {
                    const blockType = dm.getVoxel(x,y,z)
                    console.log(blockType)
                    //converts any 0 data into false
                    if(!!!blockType) continue;
                    const neighbors = dm.getNeighbor(x,y,z);
                    for(let i = 0; i<neighbors.length; i++)
                    {
                        if(neighbors[i]==false) continue;
                        validFaces[faceArray[i]][`${x},${y},${z}`] = blockType as number;
                    }
                }
            }   
        }
        const newStuff = this.greedyMesh(validFaces);
        console.log(validFaces)
    }
    getQuadVertices(start: number[], end: number[], face: string): number[][] {
        // Returns 4 vertices of a quad from start to end (used in greedy mesh)
        const [x1, y1, z1] = start;
        const [x2, y2, z2] = end;

        // Handles 6 axis-aligned face directions
        switch (face) {
            case 'top':
                return [
                    [x1, y2, z1],
                    [x2, y2, z1],
                    [x2, y2, z2],
                    [x1, y2, z2]
                ];
            case 'bottom':
                return [
                    [x1, y1, z2],
                    [x2, y1, z2],
                    [x2, y1, z1],
                    [x1, y1, z1]
                ];
            case 'left':
                return [
                    [x1, y1, z2],
                    [x1, y1, z1],
                    [x1, y2, z1],
                    [x1, y2, z2]
                ];
            case 'right':
                return [
                    [x2, y1, z1],
                    [x2, y1, z2],
                    [x2, y2, z2],
                    [x2, y2, z1]
                ];
            case 'front':
                return [
                    [x1, y1, z1],
                    [x2, y1, z1],
                    [x2, y2, z1],
                    [x1, y2, z1]
                ];
            case 'back':
                return [
                    [x2, y1, z2],
                    [x1, y1, z2],
                    [x1, y2, z2],
                    [x2, y2, z2]
                ];
            default:
                return [];
        }
    }
    getQuadUVs(): number[][] {
        // Simple square UVs
        return [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1]
        ];
    }

    destroyMesh(key:string, scene:THREE.Scene)
    {
        const data = this.meshMap.get(key)
        scene.remove(data!);
        data!.geometry.dispose();
        this.meshMap.delete(key);
    }
    greedyMesh(data:Record<string, Record<string, number>>)//something about w being initialized to 1? just in case leaving a note
    {
        const validQuads = [];
        for(let [key,value] of Object.entries(data))
        {
            console.log(key)
            let current = 0;//current variable = iteration thru faces 
            const faces = Object.keys(value);//gets the keys for iteration
            if(faces.length == 0) continue;//prevents iteration of 0 faces
            const aAxis = indexRef[key][0];//thingie to get the other axises to expand in
            const bAxis = indexRef[key][1];//thingie to get the other axises to expand in
            const visitedQuads =  new Set();//set that helps prevent going to visited quads
            while(visitedQuads.size<faces.length)
            {
                let w = 0;
                if(visitedQuads.has(faces[current]))//determines if the face has been consumed yet
                {
                    //if consumed go to the next iteration of the code 
                    current++;
                    if (current <= faces.length) break;
                    //if current has become longer than the length of total faces end loop
                    continue;
                }
                const blockType = value[faces[current]]//determines the block type
                visitedQuads.add(faces[current]);//current face that is on will be added to the visited set 
                let face = faces[current].split(',').map(Number);//splits the face into its coordinates to be utilized
                let firstBound;
                while(true)
                {
                    let currentPos = [...face];//make a deep cpy
                    currentPos[aAxis]++;//increment the first axis to try to expand
                    const str = `${currentPos.join(',')}`//join the string to get the key 
                    if(!value[str]||value[str]!=blockType) //if the key doesnt exist means the face doesnt exist or if the blocktypes dont match
                    {
                        currentPos[aAxis]--;//deincreements as the attempt failed
                        firstBound = currentPos;//sets the bound to the block that was last set 
                        break;//breaks 
                    }
                    visitedQuads.add(str)//if sucessful add the key to the visited set
                    w++//increments the value to indicated sucessfuil expansion
                    
                }
                let v = 0;
                while(true)//next loop to iterate thru to the next face 
                {
                    const currentPos = [...face];//make another deep copy
                    currentPos[bAxis]++;//increment the seconday axis
                    let sucess = true;//state varaible to check at end of loop
                    const consumedQuads = []
                    for(let i = 0; i<w; i++)//another loop that checks if this row is as long as w which si the expansion in the other axis
                    {
                        const newCopy = [...currentPos];//make a deepy copy again
                        newCopy[aAxis]+=i;//increment by i everytime to get the new key 
                        const str = `${newCopy.join(',')}`;//key thingie
                        if(!value[str]||value[str]!=blockType) //checks if its a valdi block or exists
                        {
                            sucess = false;//desnt exist then say that failed to expand
                            break//exit loop
                        };
                        //issue here where u premarturely add the key before you even know if u can fully expand downwards 
                        //fix this might be causing the infinite loop logic 
                        //wgoijegoeijveijbejbejberjbeojbeojbeojbe
                        consumedQuads.push(str);//otherwise sucessful expansion add to the explored quad 
                    }
                    if(!sucess) break;//if sucess was false indicaets that the maximum expansion has ooccured 
                    for(let a = 0; a<consumedQuads.length; a++)
                    {
                        visitedQuads.add(consumedQuads[a]);
                    }
                    v++;//increment v if sucessful and continue;
                }
                if(!(v!=0 && w!=0)) //if 0 expansion happened set them to their default states
                {
                    validQuads.push([face, face, key, blockType])
                }
                else //otherwise add the up corner and down corner. 
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

