import * as THREE from 'three';
import { faceDirections } from './stupidlylongvariables';
import { util3d } from './utils';
import { Random } from './utils';
import { Noise } from './noisefunct';
const index = (x: number, y: number, z: number):number => {
    return x + 16 * (y + 16 * z)
}
import { BiomeData, BIOME_IDS, BLOCK_TYPES } from './biome';
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
                console.log(data)
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
                    chunks[currentPartition][index(x, localY, z)] = block;
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
    rerender(scene: THREE.Scene) {
        const dirtyChunksCopy = new Set(this.dirtyChunks); // Avoid mutation during iteration
        for (let key of dirtyChunksCopy) {
            const chunk = this.chunks.get(key);
            if (!chunk) {
                this.dirtyChunks.delete(key); // Clean up invalid references
                continue;
            }
            chunk.destroyMesh(scene);
            this.generateChunkMesh(chunk);
            chunk.returnMesh(); // Ensure new mesh gets built and rendered
            this.dirtyChunks.delete(key); // Mark as clean after rerender
        }
    }
    generateChunkMesh(chunk: VoxelChunk) {
        const [x, y, z] = chunk.key.split(",").map(Number)
        for (let a = -1; a < 2; a++) {
            for (let b = -1; b < 2; b++) {
                this.loadWorldData(x + a, z + b);
            }
        }
        for (let x = 0; x < 16; x++) {
            for (let y = 0; y < 16; y++) {
                for (let z = 0; z < 16; z++) {
                    const blockType = chunk.data[index(x, y, z)];
                    if (blockType == BLOCK_TYPES.AIR) continue;
                    const neighbors = deltas.map((delta) => {
                        const nb = [x + delta[0], y + delta[1], z + delta[2]];
                        if(Math.sign(nb[1])==-1) return false;//error is most likely here
                        return this.getVoxel(nb[0], nb[1], nb[2]) == BLOCK_TYPES.AIR ? false : true;
                    })
                    for (let i = 0; i < neighbors.length; i++) {
                        if (neighbors[i] == false) continue;
                        console.log("added face") 
                        chunk.addFace(x, y, z, blockType, faceArray[i]);
                    }
                }
            }
        }
    }
    setVoxel(x: number, y: number, z: number, block: number) {
        const { chunkCords, localCords } = util3d.gtlCords(x, y, z);
        const [cX, cY, cZ] = localCords;
        const chunk = this.chunks.get(`${chunkCords[0]},${chunkCords[1]},${chunkCords[2]}`) as VoxelChunk;
        chunk.data[cX + 16 * (cY + 16 * cZ)] = block;
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
    loadWorldData(x: number, z: number) {
        const data = this.worldGen.generateChunkData(x, z);
        for (let i = 0; i < data.length; i++) {
            const newVox = new VoxelChunk(`${x},${i},${z}`, data[i]);
            this.chunks.set(`${x},${i},${z}`, newVox);
        } 
    }
    getVoxel(x: number, y: number, z: number) {
        const { chunkCords, localCords } = util3d.gtlCords(x, y, z);
        if (!this.chunks.has(`${chunkCords[0]},${chunkCords[1]},${chunkCords[2]}`)) {
            this.loadWorldData(chunkCords[0], chunkCords[2]);
        }
        const [cX, cY, cZ] = localCords;
        const chunk = this.chunks.get(`${chunkCords[0]},${chunkCords[1]},${chunkCords[2]}`) as VoxelChunk;
        return chunk.data[cX + 16 * (cY + 16 * cZ)]
    }
    renderNew(scene: THREE.Scene, yawObject: THREE.Object3D) {
        const chunkLoadLimit = 8;
        const chunkZ = Math.floor(yawObject.position.z / 16)
        const chunkX = Math.floor(yawObject.position.x / 16)
        const chunkY = Math.floor(yawObject.position.y / 16)
        const uBound = chunkY + chunkLoadLimit;
        const dBound = chunkY - chunkLoadLimit;
        const nBound = chunkZ + chunkLoadLimit;
        const sBound = chunkZ - chunkLoadLimit;
        const wBound = chunkX - chunkLoadLimit;
        const eBound = chunkX + chunkLoadLimit;
        for (const [key, VoxChunk] of this.chunks) {
            const [x, y, z] = key.split(',').map(Number);
            if (x < wBound || x > eBound || y < nBound || y > sBound || z > uBound || z < dBound) {
                VoxChunk.destroyMesh(scene);
                this.chunks.delete(key);
            }
        }
        for (let x = wBound; x < eBound; x++) {
            for (let y = 0; y < uBound; y++) {
                for (let z = nBound; z < sBound; z++) {
                    const stringCords = `${x},${y},${z}`
                    console.log(stringCords)
                    if (!this.chunks.has(stringCords)) {
                        
                        this.loadWorldData(x, z)
                        const rewrite = this.chunks.get(stringCords) as VoxelChunk;
                        this.generateChunkMesh(rewrite);
                        rewrite.returnMesh();
                        scene.add(rewrite.meshData as THREE.Mesh);
                    }
                }
            }
        }
    }
    maybeLoad(scene: THREE.Scene, yawObject: THREE.Object3D) {
        this.rerender(scene);
        const chunkX = Math.floor(yawObject.position.x / 16);
        const chunkZ = Math.floor(yawObject.position.z / 16);
        const chunkY = Math.floor(yawObject.position.y / 16);
        if (chunkX !== this.CX || chunkZ !== this.CZ || chunkY !== this.CY) {
            this.renderNew(scene, yawObject);
            this.CX = chunkX;
            this.CZ = chunkZ;
            this.CY = chunkY;
        }
    }
    handleMouse(block: THREE.Vector3, dirVec: THREE.Vector3, duration: Array<number>) {
        if (duration[0] > 0) {
            this.setVoxel(block.x, block.y, block.z, 0)
        }
        if (duration[2] > 0) {
            const newPos = block.add(dirVec);
            this.setVoxel(newPos.x, newPos.y, newPos.z, BLOCK_TYPES.STONE);
        }
        duration[0] = 0;
        duration[2] = 0;
    }

}
//use a block look up that specifies how long it takes to break a block
//determine how long the user has held their kouse for via kousedown and iup event listners
//when the threshold is met update the chunkdata
