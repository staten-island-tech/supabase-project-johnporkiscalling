import * as THREE from 'three';
import { faceDirections } from './stupidlylongvariables';
import { util3d } from './utils';
import { Random } from './utils';
import { Noise } from './noisefunct';
import { BiomeData, BIOME_IDS, BLOCK_TYPES } from './biome';
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
class WorldGenerator extends Random {
    temperatureNoise: Noise;
    humidityNoise: Noise;
    continentalnessNoise: Noise;
    detailNoise: Noise;
    mountainNoise: Noise;
    constructor(seed: number) {
        super(seed);
        this.temperatureNoise = new Noise(this.lcg());
        this.humidityNoise = new Noise(this.lcg());
        this.continentalnessNoise = new Noise(this.lcg());
        this.detailNoise = new Noise(this.lcg());
        this.mountainNoise = new Noise(this.lcg());
    }
    seaLevel = 62;
    cThresh = 0.48;
    mFactor = 0.6;
    getColumnData(x: number, z: number)//uses world corrds
    {
        const continentalness = this.continentalnessNoise.simplex(x / 2000, z / 2000);
        const temperature = this.temperatureNoise.simplex(x / 1500, z / 1500);
        const humidity = this.humidityNoise.simplex(x / 1200, z / 1200);
        const detailInfluence = this.detailNoise.simplex(x / 150, z / 150);
        const mountainInfluence = this.mountainNoise.simplex(x / 500, z / 500);
        let biome;
        let baseHeight;
        if (continentalness < this.cThresh) {
            biome = BiomeData[BIOME_IDS.OCEAN];
            const depthFactor = 1.0 - (continentalness / this.cThresh)
            baseHeight = this.seaLevel + biome.baseHeightOffset * depthFactor;
            baseHeight += (detailInfluence * 2 - 1) * biome.heightVariation;
        }
        else {
            const landElevationFactor = (continentalness - this.cThresh) / (1 - this.cThresh);
            const altitudeEffect = landElevationFactor * 0.6;
            let effectiveTemperature = temperature * (1 - altitudeEffect);
            effectiveTemperature = util3d.clamp(0, 1, effectiveTemperature);
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
        const finalHeight = Math.floor(util3d.clamp(1, 255, baseHeight));
        return { height: finalHeight, biome: biome };
    }
    generateChunkData(chunkX: number, chunkZ: number) {
        const CHUNK_WIDTH = 16;
        const columnInfoArray = new Array(CHUNK_WIDTH * CHUNK_WIDTH);
        let highestBlock = -Infinity;
        for (let localX = 0; localX < CHUNK_WIDTH; localX++) {
            for (let localZ = 0; localZ < CHUNK_WIDTH; localZ++) {
                const worldX = chunkX * CHUNK_WIDTH + localX;
                const worldZ = chunkZ * CHUNK_WIDTH + localZ;
                const data = this.getColumnData(worldX, worldZ)
                if (data.height > highestBlock) {
                    highestBlock = data.height;
                }
                columnInfoArray[localX + localZ * CHUNK_WIDTH] = data;
            }
        }
        const chunkPartitions = Math.ceil(highestBlock / 16);
        const chunks = [];
        for (let i = 0; i < chunkPartitions+1; i++) {
            chunks.push(new Uint8Array(4096));
            //preallocates memory for the new chunk data
        }
        for (let x = 0; x < 16; x++) {
            for (let z = 0; z < 16; z++) {
                const indexV = x + z * CHUNK_WIDTH;
                const height = columnInfoArray[indexV].height;
                const biome = columnInfoArray[indexV].biome;
                for (let y = 0; y <= height; y++) {
                    const currentPartition = Math.floor(y / 16);
                    const localY = y - currentPartition * 16;
                    const block = y == height ? biome.primaryBlock : y > height - 8 ? biome.secondaryBlock : BLOCK_TYPES.STONE;
                    chunks[currentPartition][util3d.getIndex(x, localY, z)] = block;
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
                heightMap[x * 16 + z] = (Math.floor(this.detailNoise.simplex(x + xStart, z + zStart) * 32));
            }
        }
        return heightMap;
    }

}
const texture0 = util3d.loadBlockTexture('./src/assets/blockAtlases/atlas0.png')
const blocksMaterial = new THREE.MeshStandardMaterial({ map: texture0, side: THREE.DoubleSide, metalness: 0.2, roughness: 0.8 })
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
export class ChunkManager {
    chunks: Map<string, VoxelChunk>
    dirtyChunks: Set<string>
    worldGen: WorldGenerator
    CX = Infinity;
    CZ = Infinity;
    CY = Infinity;
    constructor(seed: number) {
        this.chunks = new Map();
        this.dirtyChunks = new Set();
        this.worldGen = new WorldGenerator(seed);
    }
    rerender(scene:THREE.Scene)
    {

    }
    generateChunkMesh(chunk:VoxelChunk)
    {
        if(!chunk) return;
        const [chunkX, chunkY, chunkZ] = chunk.key.split(",").map(Number);
        for (let a = -1; a < 2; a++) {
            for (let b = -1; b < 2; b++) {
                this.loadWorldData(chunkX + a, chunkZ + b);
            }
        }
        for (let localX = 0; localX < 16; localX++) {
            for (let localY = 0; localY < 16; localY++) {
                for (let localZ = 0; localZ < 16; localZ++) {
    }
}