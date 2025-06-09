import * as THREE from 'three';
import { faceDirections } from './stupidlylongvariables';
import { util3d } from './utils';
import { Random } from './utils';
import { Noise } from './noisefunct';
import { string } from 'three/tsl';
import { ref } from 'vue'
const deltas = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
];
const faceArray = ["right", "left", "top", "bottom", "front", "back"]
interface VoxelRayInfo {
    hit: boolean;
    position?: THREE.Vector3;
    distance?: number;
    face?: THREE.Vector3;
}
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
const UVCORDS: Record<number, string> = {
    1: "minecraft:block/stone",
    2: "minecraft:block/dirt",
    3: "minecraft:block/green_wool",
    4: "minecraft:block/sand",
    5: "minecraft:block/water_still",
    6: "minecraft:block/snow",
    7: "minecraft:block/ice",
    8: "minecraft:block/coal_ore",
    9: "minecraft:block/iron_ore",
    10: "minecraft:block/bedrock"
};

export class WorldGenerator extends Random {
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

    generateChunkData(chunkX: number, chunkZ: number): {data: Map<number, Uint8Array>; maxChunkY: number} 
    {
        const data: Map<number, Uint8Array> = new Map();
        
        // Generate height and biome maps for this chunk
        const heightMap = this.baseHeightMap(chunkX, chunkZ);
        const biomeMap = this.biomeMap(chunkX, chunkZ);
        const maxHeight = Math.max(...heightMap);
        const maxChunkY = Math.floor(maxHeight / 16) + 1;
        
        // Generate each Y chunk section
        for (let chunkY = 0; chunkY <= maxChunkY; chunkY++) {
            const chunkBlocks = this.generateChunkSection(chunkX, chunkY, chunkZ, heightMap, biomeMap);
            if (chunkBlocks.some(block => block !== BLOCK_TYPES.AIR)) {
                data.set(chunkY, chunkBlocks);
            }
        }
        
        return {data, maxChunkY};
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
const texture0 = util3d.loadBlockTexture('./src/assets/blockAtlases/atlas0.png')
const blocksMaterial = new THREE.MeshBasicMaterial({ map: texture0, side: THREE.DoubleSide})
const blockUVs: Record<string, Array<number>> = {
    1: util3d.getUVCords('minecraft:block/stone'),
    2: util3d.getUVCords('minecraft:block/green_concrete'),
    3: util3d.getUVCords('minecraft:block/dirt'),
    9: util3d.getUVCords('minecraft:block/water_still'),
    12: util3d.getUVCords('minecraft:block/sand'),
    13: util3d.getUVCords('minecraft:block/sandstone'),
    14: util3d.getUVCords('minecraft:block/snow'),
    15: util3d.getUVCords('minecraft:block/ice'),
    17: util3d.getUVCords('minecraft:block/oak_log'),
    159:util3d.getUVCords('minecraft:block/obsidian'),
};
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
export class ChunkManager  //optimize this things memory usage 
{
    chunks: Map<string, VoxelChunk>
    dirtyChunks: Set<string>
    worldGen: WorldGenerator
    lastX = Infinity;
    lastZ = Infinity;
    lastY = Infinity;
    callCounter = 0;
    loadedChunks: Set<string> =  new Set();
    constructor(seed: number) {
        this.chunks = new Map();
        this.dirtyChunks = new Set();
        this.worldGen = new WorldGenerator(seed);
    }
    rerender(scene:THREE.Scene)
    {
        const dirtyChunksCopy =  new Set(this.dirtyChunks);
        for(let key of dirtyChunksCopy)
        {
            const chunk =  this.chunks.get(key);
            if(!chunk)
            {
                this.dirtyChunks.delete(key);
                continue;
            }
            chunk.destroyMesh(scene);
            this.generateChunkMesh(chunk);
            chunk.returnMesh();
            this.dirtyChunks.delete(key);
        }
    }
    generateChunkMesh(chunk:VoxelChunk)
    {
        if(!chunk) return;
        const [chunkX, chunkY, chunkZ] = chunk.key.split(",").map(Number);
        const aX = chunkX * 16;
        const aY = chunkY * 16
        const aZ = chunkZ * 16
        for(let a = -1; a < 2; a++)//this loop helps ensure that the neighboring chunks are loaded 
        {
            for(let b = -1; b < 2; b++)
            {
                if (!this.loadedChunks.has(`${chunkX+a},${chunkZ+b}`)) {
                    this.loadWorldData(chunkX+a, chunkZ+b);
                }
            }
        }
        for(let lX = 0; lX<16; lX++)
        {
            for(let lY = 0; lY<16;lY++)
            {
                for(let lZ = 0; lZ<16;lZ++)
                {
                    const blockType = chunk.data[util3d.getIndex(lX,lY,lZ)];
                    if(blockType==BLOCK_TYPES.AIR) continue;
                    const neighbors = deltas.map((delta)=>
                    {
                        const worldX = chunkX * 16 + lX + delta[0];
                        const worldY = chunkY * 16 + lY + delta[1];
                        const worldZ = chunkZ * 16 + lZ + delta[2];
                        return this.getVoxel(worldX, worldY, worldZ) != BLOCK_TYPES.AIR;
                    })
                    for (let i = 0; i < neighbors.length; i++) {
                        chunk.addFace(lX+aX, lY+aY, lZ+aZ, 1, faceArray[i]);
                    }
                }
            }
        }

    }
    loadWorldData(x:number, z:number)
    {
        this.callCounter+=1;
        this.loadedChunks.add(`${x},${z}`);
        const {data, maxChunkY} = this.worldGen.generateChunkData(x, z);
        for(const [key, value] of data)
        {
            const newVox = new VoxelChunk(`${x},${key},${z}`, value);
            this.chunks.set(`${x},${key},${z}`, newVox);

        }
    }
    getVoxel(x:number, y:number, z:number)
    {
        const { chunkCords, localCords } = util3d.gtlCords(x, y, z);
        if (!this.chunks.has(`${chunkCords[0]},${chunkCords[1]},${chunkCords[2]}`) &&  !this.loadedChunks.has(`${chunkCords[0]},${chunkCords[2]}`)) {
            this.loadWorldData(chunkCords[0], chunkCords[2]);
        }
        const [cX, cY, cZ] = localCords;
        const chunk = this.chunks.get(`${chunkCords[0]},${chunkCords[1]},${chunkCords[2]}`);
        if(!chunk) return 0;
        return chunk.data[cX + 16 * (cY + 16 * cZ)]    
    }
    renderNew(scene:THREE.Scene, yawObject:THREE.Object3D)
    {
        const loadLimit = ref(4);
        const chunkX = Math.floor(yawObject.position.x / 16)
        const chunkZ = Math.floor(yawObject.position.z / 16)    
        const nBound = chunkZ + loadLimit.value;
        const sBound = chunkZ - loadLimit.value;
        const eBound = chunkX + loadLimit.value;
        const wBound = chunkX - loadLimit.value;
        for(const [key, VoxChunk] of this.chunks)
        {
            const [x,y,z] = key.split(',').map(Number);
            if(x < wBound || x > eBound || z < sBound || z < nBound)
            {
                VoxChunk.destroyMesh(scene);
                this.chunks.delete(key);
            }
        }
        for(let x = wBound; x<eBound; x++)
        {
            for(let z = sBound; z<nBound; z++)
            {
                this.loadWorldData(x,z);
                for(let y = 0; y< 5; y++)
                {
                    const stringCords =  `${x},${y},${z}`;
                    const chunk = this.chunks.get(stringCords);
                    if(!chunk) continue;
                    this.generateChunkMesh(chunk);
                    chunk.returnMesh();
                    if(!chunk.meshData) continue;
                    scene.add(chunk.meshData);
                }
            }
        }
    }
    maybeLoad(scene:THREE.Scene, yawObject:THREE.Object3D)
    {
        const chunkX = Math.floor(yawObject.position.x/16);
        const chunkZ = Math.floor(yawObject.position.z/16);
        if(chunkX!=this.lastX || chunkZ != this.lastZ)
        {
            this.renderNew(scene, yawObject);
            this.lastX = chunkX;
            this.lastZ = chunkZ;
        }
    }
    voxelRayCast(direction: THREE.Vector3, yawObject: THREE.Object3D, maxReach = 10): VoxelRayInfo {
        const origin = yawObject.position.clone();
        const dir = direction.clone().normalize();
        yawObject.getWorldDirection(dir);
        const pos = origin.clone().floor();
        const step = new THREE.Vector3(
            Math.sign(dir.x),
            Math.sign(dir.y),
            Math.sign(dir.z)
        );
        const tDelta = new THREE.Vector3(
            dir.x !== 0 ? Math.abs(1 / dir.x) : Number.POSITIVE_INFINITY,
            dir.y !== 0 ? Math.abs(1 / dir.y) : Number.POSITIVE_INFINITY,
            dir.z !== 0 ? Math.abs(1 / dir.z) : Number.POSITIVE_INFINITY
        );
        const voxelBorder = new THREE.Vector3(
            step.x > 0 ? pos.x + 1 : pos.x,
            step.y > 0 ? pos.y + 1 : pos.y,
            step.z > 0 ? pos.z + 1 : pos.z
        );
        const next = new THREE.Vector3(
            dir.x !== 0 ? (voxelBorder.x - origin.x) / dir.x : Number.POSITIVE_INFINITY,
            dir.y !== 0 ? (voxelBorder.y - origin.y) / dir.y : Number.POSITIVE_INFINITY,
            dir.z !== 0 ? (voxelBorder.z - origin.z) / dir.z : Number.POSITIVE_INFINITY
        );
        let faceDir = new THREE.Vector3();
        let distanceTraveled = 0;
        while (distanceTraveled <= maxReach) {
            if (this.getVoxel(pos.x, pos.y, pos.z)) {
                return {
                    hit: true,
                    position: pos.clone(),
                    distance: distanceTraveled,
                    face: faceDir.clone()
                };
            }
            if (next.x < next.y && next.x < next.z) {
                pos.x += step.x;
                distanceTraveled = next.x;
                next.x += tDelta.x;
                faceDir.set(-step.x, 0, 0);
            } else if (next.y < next.z) {
                pos.y += step.y;
                distanceTraveled = next.y;
                next.y += tDelta.y;
                faceDir.set(0, -step.y, 0);
            } else {
                pos.z += step.z;
                distanceTraveled = next.z;
                next.z += tDelta.z;
                faceDir.set(0, 0, -step.z);
            }
        }
        return { hit: false };
    }
    handleMouse()
    {

    }
}