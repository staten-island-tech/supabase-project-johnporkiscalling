import * as THREE from 'three';
import { faceDirections } from './stupidlylongvariables';
import { util3d } from './utils';
import { Random } from './utils';
import { Noise } from './noisefunct';
const seed = 101021034100323;
//first pass differentiates between whats solid and not
const index = (x:number, y:number, z:number)=>
{
    return  x+16*(y+16*z)
}


const BIOME_IDS = {
    OCEAN: 0, BEACH: 1, PLAINS: 2, FOREST: 3, DESERT: 4, MOUNTAINS: 5,
    SNOWY_PEAKS: 6, TAIGA: 7, JUNGLE: 8, BADLANDS: 9,
};
const BLOCK_TYPES = {
    AIR: 0, STONE: 1, GRASS: 2, DIRT: 3, WATER: 9, SAND: 12, SANDSTONE: 13,
    SNOW_BLOCK: 14, ICE: 15, WOOD_LOG: 17, LEAVES: 18, GRAVEL: 19, CLAY: 82,
    TERRACOTTA_RED: 159,
};
const BiomeData = {
    [BIOME_IDS.OCEAN]: { id: BIOME_IDS.OCEAN, name: "Ocean", primaryBlock: BLOCK_TYPES.WATER, secondaryBlock: BLOCK_TYPES.SAND, stoneBlock: BLOCK_TYPES.STONE, soilDepth: 3, baseHeightOffset: -30, heightVariation: 5, },
    [BIOME_IDS.BEACH]: { id: BIOME_IDS.BEACH, name: "Beach", primaryBlock: BLOCK_TYPES.SAND, secondaryBlock: BLOCK_TYPES.SAND, stoneBlock: BLOCK_TYPES.SANDSTONE, soilDepth: 4, baseHeightOffset: 1, heightVariation: 1, },
    [BIOME_IDS.PLAINS]: { id: BIOME_IDS.PLAINS, name: "Plains", primaryBlock: BLOCK_TYPES.GRASS, secondaryBlock: BLOCK_TYPES.DIRT, stoneBlock: BLOCK_TYPES.STONE, soilDepth: 3, baseHeightOffset: 2, heightVariation: 5, },
    [BIOME_IDS.FOREST]: { id: BIOME_IDS.FOREST, name: "Forest", primaryBlock: BLOCK_TYPES.GRASS, secondaryBlock: BLOCK_TYPES.DIRT, stoneBlock: BLOCK_TYPES.STONE, soilDepth: 4, baseHeightOffset: 4, heightVariation: 10, },
    [BIOME_IDS.DESERT]: { id: BIOME_IDS.DESERT, name: "Desert", primaryBlock: BLOCK_TYPES.SAND, secondaryBlock: BLOCK_TYPES.SAND, stoneBlock: BLOCK_TYPES.SANDSTONE, soilDepth: 5, baseHeightOffset: 2, heightVariation: 3, },
    [BIOME_IDS.MOUNTAINS]: { id: BIOME_IDS.MOUNTAINS, name: "Mountains", primaryBlock: BLOCK_TYPES.STONE, secondaryBlock: BLOCK_TYPES.STONE, stoneBlock: BLOCK_TYPES.STONE, soilDepth: 1, baseHeightOffset: 30, heightVariation: 50, },
    [BIOME_IDS.SNOWY_PEAKS]: { id: BIOME_IDS.SNOWY_PEAKS, name: "Snowy Peaks", primaryBlock: BLOCK_TYPES.SNOW_BLOCK, secondaryBlock: BLOCK_TYPES.STONE, stoneBlock: BLOCK_TYPES.STONE, soilDepth: 2, baseHeightOffset: 40, heightVariation: 40, },
    [BIOME_IDS.TAIGA]: { id: BIOME_IDS.TAIGA, name: "Taiga", primaryBlock: BLOCK_TYPES.GRASS, secondaryBlock: BLOCK_TYPES.DIRT, stoneBlock: BLOCK_TYPES.STONE, soilDepth: 3, baseHeightOffset: 3, heightVariation: 8, },
    [BIOME_IDS.JUNGLE]: { id: BIOME_IDS.JUNGLE, name: "Jungle", primaryBlock: BLOCK_TYPES.GRASS, secondaryBlock: BLOCK_TYPES.DIRT, stoneBlock: BLOCK_TYPES.STONE, soilDepth: 5, baseHeightOffset: 5, heightVariation: 20, },
    [BIOME_IDS.BADLANDS]: { id: BIOME_IDS.BADLANDS, name: "Badlands", primaryBlock: BLOCK_TYPES.TERRACOTTA_RED, secondaryBlock: BLOCK_TYPES.SAND, stoneBlock: BLOCK_TYPES.STONE, soilDepth: 10, baseHeightOffset: 10, heightVariation: 25, },
};
class WorldGenerator extends Random {
    temperatureNoise: Noise;
    humidityNoise: Noise;
    continentalnessNoise: Noise;
    detailNoise: Noise;
    mountainNoise: Noise;
    heightMapCache: Map<string, Uint8Array>
    constructor(seed: number) {
        super(seed);
        this.temperatureNoise = new Noise(this.lcg());
        this.humidityNoise = new Noise(this.lcg());
        this.continentalnessNoise = new Noise(this.lcg());
        this.detailNoise = new Noise(this.lcg());
        this.mountainNoise = new Noise(this.lcg());
        this.heightMapCache = new Map();
    }
    seaLevel = 62;
    cThresh = 0.48; 
    mFactor = 0.6;
    getColumnData(x:number, z:number)//uses world corrds
    {
        const continentalness = this.continentalnessNoise.simplex(x/2000, z/2000);
        const temperature =  this.temperatureNoise.simplex(x/1500, z/1500);
        const humidity = this.humidityNoise.simplex(x/1200, z/1200);
        const detailInfluence =  this.detailNoise.simplex(x/150, z/150);
        const mountainInfluence = this.mountainNoise.simplex(x/500, z/500);
        let biome;
        let baseHeight;
        if(continentalness<this.cThresh)
        {
            biome = BiomeData[BIOME_IDS.OCEAN];
            const depthFactor = 1.0-(continentalness/this.cThresh)
            baseHeight = this.seaLevel+biome.baseHeightOffset*depthFactor;
            baseHeight+=(detailInfluence*2-1) * biome.heightVariation;
        }
        else
        {
            const landElevationFactor = (continentalness - this.cThresh ) / (1-this.cThresh);
            const altitudeEffect = landElevationFactor * 0.6;
            let effectiveTemperature =  temperature * (1-altitudeEffect);
            effectiveTemperature = util3d.clamp(0,1,effectiveTemperature);
            if (effectiveTemperature < 0.15) { // Very Cold
                if (landElevationFactor > 0.5 && mountainInfluence > this.mFactor * 0.8) biome = BiomeData[BIOME_IDS.SNOWY_PEAKS];
                else biome = BiomeData[BIOME_IDS.TAIGA];
            } else if (effectiveTemperature < 0.4) { // cold
                if (landElevationFactor > 0.4 && mountainInfluence > this.mFactor * 0.7) biome = BiomeData[BIOME_IDS.MOUNTAINS];
                else biome = BiomeData[BIOME_IDS.TAIGA];
            } else if (effectiveTemperature < 0.7) { // average
                if (landElevationFactor > 0.5 && mountainInfluence > this.mFactor) biome = BiomeData[BIOME_IDS.MOUNTAINS];
                else if (humidity < 0.3) biome = BiomeData[BIOME_IDS.PLAINS];
                else if (humidity < 0.6) biome = BiomeData[BIOME_IDS.PLAINS]; 
                else biome = BiomeData[BIOME_IDS.FOREST];
            } else {//HOT
                if (humidity < 0.15) {
                    if (landElevationFactor > 0.3 && mountainInfluence > this.mFactor * 0.5) biome = BiomeData[BIOME_IDS.BADLANDS];
                    else biome = BiomeData[BIOME_IDS.DESERT];
                } else if (humidity < 0.4) biome = BiomeData[BIOME_IDS.PLAINS];
                else biome = BiomeData[BIOME_IDS.JUNGLE];
            }
            const distToWater = (continentalness - this.cThresh) / 0.03; 
            if (distToWater >= 0 && distToWater < 1.0 && biome.id !== BIOME_IDS.OCEAN && biome.id !== BIOME_IDS.MOUNTAINS && biome.id !== BIOME_IDS.SNOWY_PEAKS) {
                if (landElevationFactor < 0.1) biome = BiomeData[BIOME_IDS.BEACH];
            }

            // Calculate Land Height
            baseHeight = this.seaLevel + biome.baseHeightOffset + (landElevationFactor * biome.heightVariation * 0.5);
            baseHeight += (detailInfluence * 2 - 1) * biome.heightVariation * 0.5; // detailInfluence from [0,1] to [-1,1]

            if (biome.id === BIOME_IDS.MOUNTAINS || biome.id === BIOME_IDS.SNOWY_PEAKS || biome.id === BIOME_IDS.BADLANDS) {
                baseHeight += mountainInfluence * biome.heightVariation * 1.2;
            } else if (mountainInfluence > 0.7 && landElevationFactor > 0.3) {
                baseHeight += mountainInfluence * biome.heightVariation * 0.3;
            }
        }
        const finalHeight = Math.floor(util3d.clamp(1,255, baseHeight));
        return { height: finalHeight, biome: biome };
    }
    generateChunkData(chunkX:number, chunkZ:number) {
        const CHUNK_WIDTH = 16;
        const columnInfoArray = new Array(CHUNK_WIDTH * CHUNK_WIDTH);
        let highestBlock = -Infinity;
        for (let localX = 0; localX < CHUNK_WIDTH; localX++) {
            for (let localZ = 0; localZ < CHUNK_WIDTH; localZ++) {
                const worldX = chunkX * CHUNK_WIDTH + localX;
                const worldZ = chunkZ * CHUNK_WIDTH + localZ;
                const data = this.getColumnData(worldX, worldZ)
                if(data.height>highestBlock)
                {
                    highestBlock = data.height;
                }
                columnInfoArray[localX + localZ * CHUNK_WIDTH] = data;  
            }
        }
        const chunkPartitions = Math.ceil(highestBlock/16);
        const chunks = [];
        for(let i = 0; i<chunkPartitions; i++)
        {
            chunks.push(new Uint8Array(4096));  
            //preallocates memory for the new chunk data
        }
        for(let x = 0; x<16; x++)
        {
            for(let z = 0; z<16; z++)
            {
                const indexV = x+z*CHUNK_WIDTH;
                const height = columnInfoArray[indexV].height;
                const biome = columnInfoArray[indexV].biome;
                for(let y = 0; y++; y>=height)
                {
                    const currentPartition =  Math.floor(y/16);
                    const localY = y - currentPartition*16;
                    const block =  y==height?biome.primaryBlock:y>y-8?biome.secondaryBlock:BLOCK_TYPES.STONE;
                    chunks[currentPartition][index(x,localY,z)] = block;      

                }
            }
        }
        //returns chunkdata formatted in the index format 
        return chunks;
    }
    getBiome(x: number, z: number) {
        const biomeMap: Uint8Array = new Uint8Array(256);
        const xStart = x * 16;
        const zStart = z * 16;
        for (let x = 0; x < 16; x++) {
            for (let z = 0; z < 16; z++) {
                //placeholder for the biomeselector
                biomeMap[x * 16 + z] = this.detailNoise.simplex(x + xStart, z + zStart);
            }
        }
        return biomeMap;
    }
    generateBaseHeight(x: number, z: number) {
        const heightMap: Uint8Array = new Uint8Array(256);
        const xStart = x * 16;
        const zStart = z * 16;
        for (let x = 0; x < 16; x++) {
            for (let z = 0; z < 16; z++) {
                heightMap[x * 16 + z] = Math.floor(this.detailNoise.simplex(x + xStart, z + zStart) * 32);
            }
        }
        this.heightMapCache.set(`${x},${z}`, heightMap);
        return heightMap;
    }

}

const scene = new THREE.Scene;
const yawObject: THREE.Object3D = new THREE.Object3D()
const textureLoader = new THREE.TextureLoader();
function loadBlockTexture(path: string) {
    const tex = textureLoader.load(path);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = true;
    tex.premultiplyAlpha = false;
    return tex;
};
const texture0 = loadBlockTexture('./src/assets/blockAtlases/atlas0.png')
const blocksMaterial = new THREE.MeshStandardMaterial({ map: texture0, side: THREE.DoubleSide, metalness: 0.2, roughness: 0.8 })

const blockUVs: Record<string, Array<number>> = {
    top: util3d.getUVCords('minecraft:block/grass_block_top'),
    side: util3d.getUVCords('minecraft:block/grass_block_side'),
    bottom: util3d.getUVCords('minecraft:block/dirt'),
    sand: util3d.getUVCords('minecraft:block/sand'),
    red_sand: util3d.getUVCords('minecraft:block/red_sand'),
    stone: util3d.getUVCords('minecraft:block/stone'),
};
const worldGen = new WorldGenerator(seed);
class VoxelChunk {
    data: Uint8Array
    key: string
    meshData: null | THREE.Mesh
    offset: number;
    indices: Array<number>;
    vertices: Array<number>;
    uvs: Array<number>;
    dirty: boolean;
    constructor(key: string, data?: Uint8Array) {
        this.data = data ? data : new Uint8Array(16 * 16 * 16)
        this.key = key;
        this.meshData = null;
        this.offset = 0;
        this.indices = [];
        this.vertices = [];
        this.uvs = [];
        this.dirty = false;
    }
    getVoxel(x: number, y: number, z: number) {//operates on a chunk local approach
        if (x < 0 || y < 0 || z < 0 || x >= 16 || y >= 16 || z >= 16) {
            return 0;
        }
        const index = x + (y * 16) + (z * 16 * 16);
        return this.data[index];
    }
    addFace(x: number, y: number, z: number, blockType: number, dir: string) {
        const offSetValues = faceDirections[dir];
        this.vertices.push(
            x + offSetValues[0], y + offSetValues[1], z + offSetValues[2],
            x + offSetValues[3], y + offSetValues[4], z + offSetValues[5],
            x + offSetValues[6], y + offSetValues[7], z + offSetValues[8],
            x + offSetValues[9], y + offSetValues[10], z + offSetValues[11],
        )

        this.indices.push(this.offset, this.offset + 1, this.offset + 2, this.offset + 2, this.offset + 3, this.offset);
        const texturew = blockUVs[blockType];
        this.uvs.push(...texturew);
        this.offset += 4;
    }
    returnMesh() {
        const buffer = new THREE.BufferGeometry();
        buffer.setAttribute('position', new THREE.Float32BufferAttribute(this.vertices, 3));
        buffer.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
        buffer.setIndex(this.indices);
        this.meshData = new THREE.Mesh(buffer, blocksMaterial);
    }
    destroyMesh(scene: THREE.Scene) {
        scene.remove(this.meshData!);
        this.meshData!.geometry.dispose();
        this.meshData = null;
        this.vertices = [];
        this.indices = [];
        this.uvs = [];
    }
}
const deltas = [
    [1, 0, 0], [-1, 0, 0],
    [0, 1, 0], [0, -1, 0],
    [0, 0, 1], [0, 0, -1],
];
let CX = Infinity;
let CZ = Infinity;
let CY = Infinity;
class SaveSystem//this system basically operates on the idea that when a player unloads a chunk the world data for that unloadd chunk gets saved here
//otherwise the loaded chunks are fine and when the player quits the game or generates a save file they read from the chunkManager
{
    save: Map<string, Uint8Array>
    constructor() {
        this.save = new Map();
    }
    writeToSaveFile() {

    }
}
let saveSystem = new SaveSystem();


class ChunkManager {
    chunks: Map<string, VoxelChunk>
    dirtyChunks: Set<string>
    constructor() {
        this.chunks = new Map();
        this.dirtyChunks = new Set();
    }
    //first 
    rerender() {
        for (let key of this.dirtyChunks) {

            const chunk = this.chunks.get(key);
            if (!chunk) return; //guard clausee
            chunk?.destroyMesh(scene);
            this.generateChunkMesh(chunk as VoxelChunk);
            //destroy the mesh from the scene
        }
    }
    //possible seperation of cache render distance and regular render distance to otpimize face culling
    generateChunkMesh(chunk: VoxelChunk) { //this is responsible for generating meshes instead of actual chunks
        //basic idea
        //example chunk 000
        //get the face adjacent neighbors
        const [x, y, z] = chunk.key.split(",").map(Number)//determine the neighbors

        const neighbors = deltas.map(([dx, dy, dz]) => [x + dx, y + dy, z + dz]);
        for (let i = 0; i < neighbors.length; i++) {
            const key = neighbors[i].toString();
            const exists = this.chunks.has(key);
            if(!exists) this.loadWorldData(neighbors[i][0], neighbors[i][2]);
            let data = this.chunks.get(key);
            //since loadWorldData only operates on a grid based approach instead of a 3d based grid you must pass in the vonNeuman neighbors instead
            //get the thingie to render the worldData
        }
    }
    getNeighbors(key: string) {
        //first checks if the neighbor is cached already
        //if not then call the worldgenerator for the output
        //if the output is full of 0 return air or smth
    
    }
    setVoxel(x: number, y: number, z: number, block: number) { //takes in a block id as the identifier
        const { chunkCords, localCords } = util3d.gtlCords(x, y, z);
        const [cX, cY, cZ] = localCords;
        const chunk = this.chunks.get(`${chunkCords[0]},${chunkCords[1]}, ${chunkCords[2]}`) as VoxelChunk;
        chunk.data[cX + 16 * (cY + 16 * cZ)] = block;
    }
    loadWorldData(x: number, z: number) {
        const data = worldGen.generateChunkData(x,z);
        for(let i = 0; i<data.length; i++)
        {
            const newVox = new VoxelChunk(`${x},${i},${z}`, data[i]);
            this.chunks.set(`${x},${i},${z}`, newVox);
        }
    }
    getVoxel(x: number, y: number, z: number) {
        const { chunkCords, localCords } = util3d.gtlCords(x, y, z);
        const [cX, cY, cZ] = localCords;
        const chunk = this.chunks.get(`${chunkCords[0]},${chunkCords[1]}, ${chunkCords[2]}`) as VoxelChunk;
        return chunk.data[cX + 16 * (cY + 16 * cZ)]
        //returns the data

    }
    renderNew() {
        //call the save system here 
        //ask if theres any pre existing chunk stored in it
        //also air chunks will be marked with an empty uint8array so when checking make sure the array isnt length 0 before working with it
        //if yes then pull it from there and return it
        //otherwise
        //call the world generator here
        //itll upload the data but not the mesh
        const chunkLoadLimit = 8;
        const chunkZ = Math.floor(yawObject.position.z / 16)
        const chunkX = Math.floor(yawObject.position.x / 16)
        const chunkY = Math.floor(yawObject.position.x / 16)
        const uBound = chunkY + chunkLoadLimit;
        const dBound = chunkY - chunkLoadLimit;
        const nBound = chunkZ - chunkLoadLimit;
        const sBound = chunkZ + chunkLoadLimit;
        const wBound = chunkX - chunkLoadLimit;
        const eBound = chunkX + chunkLoadLimit;

        //add another bound for going down or up 

        //first pass removes chunks that are outside of the limit
        for (const [key, VoxChunk] of this.chunks) {
            const [x, y, z] = key.split(',').map(Number);
            if (x < wBound || x > eBound || y < nBound || y > sBound) {
                VoxChunk.destroyMesh(scene);
                //removes the mesh from the scene automatically
                //data is still perserved to be able to be read by the save system
            }
        }//second pass determines whether or not to rerender dirty chunks
        for (let x = wBound; x < eBound; x++) {
            for (let y = dBound; y < uBound; y++) {
                for (let z = nBound; z < sBound; z++) {
                    const stringCords = `${x},${y},${z}`
                    if (!this.chunks.has(stringCords)) {
                        const rewrite = new VoxelChunk(stringCords);
                        //initialize the world generator so it can be used globally
                        //
                        rewrite.data = new Uint8Array(16 * 16 * 16);
                        this.generateChunkMesh(rewrite);
                        rewrite.returnMesh();
                    }
                }
            }
        }
    }
    maybeLoad() {
        this.rerender();
        //this will always be called regardless of whether the player has changed chunks or not
        const chunkX = Math.floor(yawObject.position.x / 16);
        const chunkZ = Math.floor(yawObject.position.z / 16);
        const chunkY = Math.floor(yawObject.position.y / 16);

        if (chunkX !== CX || chunkZ !== CZ || chunkY !== CY) {
            this.renderNew();
            CX = chunkX;
            CZ = chunkZ;
            CY = chunkY;
        }
    }
}

