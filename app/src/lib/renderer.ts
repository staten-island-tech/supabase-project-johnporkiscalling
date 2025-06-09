import { Random, util } from "./utils";
import { Noise } from "./noise";
import { faceDirections } from "./constants";
import { atlas2, atlasData } from "@/lib/atlas";
const testData = new Uint8Array(4096)//single chunk
const CHUNK_LENGTH = 16;
const CHUNK_AREA = 256;
const CHUNK_VOLUME = 4096;
const faceArray = ["left", "right", "bottom", "top", "back", "front"]
const indexRef: Record<string, Array<number>> = { "left": [1, 2, 0], "right": [1, 2, 0], "bottom": [0, 2, 1], "top": [0, 2, 1], "back": [1, 3, 2], "front": [1, 3, 2] }
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

const precomputedUVs: Record<string, Array<number>> = {};
interface TextureSize {
    width: number;
    height: number;
}
type AtlasData = {
    textureSize: TextureSize;
    frames: Record<string, TextureFrame>;
}
interface TextureFrame {
    x: number;
    y: number;
    w: number;
    h: number;
}
function preprocessAtlas(atlasData: AtlasData) {
    const { width: texWidth, height: texHeight } = atlasData.textureSize;
    const padding = 0.0001;

    for (const [name, frame] of Object.entries(atlasData.frames)) {
        const { x, y, w, h } = frame;

        const u0 = x / texWidth + padding;
        const u1 = (x + w) / texWidth - padding;
        const v1 = 1 - y / texHeight - padding;     // top
        const v0 = 1 - (y + h) / texHeight + padding; // bottom

        precomputedUVs[name] = [
            u0,
            v0,

            u1 - u0, //tw
            v1 - v0 //th
        ];
    }
}
preprocessAtlas(atlasData);
// In getUVCords(), ensure proper texture mapping:
function getUVCords(name: string, width: number, height: number) {
    const uv = precomputedUVs[name];
    if (!uv) {
        console.warn(`Missing UVs for texture: ${name}`);
        return [0, 0, 1, 0, 1, 1, 0, 1];
    }

    const [u0, v0, tw, th] = uv;

    // For non-greedy meshing (single block)
    if (width === 1 && height === 1) {
        return [
            u0, v0,         // bottom-left
            u0 + tw, v0,    // bottom-right
            u0 + tw, v0 + th, // top-right
            u0, v0 + th      // top-left
        ];
    }

    // For greedy meshing (merged faces)
    return [
        0, 0,
        width, 0,
        width, height,
        0, height
    ].map((val, i) => {
        return i % 2 === 0
            ? u0 + (val % 1) * tw  // U: tile-repeated within tile region
            : v0 + (val % 1) * th; // V: same here
    });


}
export class TerrainGenerator extends Random {
    heightNoise: Noise;
    biomeNoise: Noise;
    caveNoise: Noise;
    riverNoise: Noise;
    oreNoise: Noise;
    detailNoise: Noise;

    constructor(seed: number) {
        super(seed);
        this.heightNoise = new Noise(this.lcg());
        this.biomeNoise = new Noise(this.lcg());
        this.caveNoise = new Noise(this.lcg());
        this.riverNoise = new Noise(this.lcg());
        this.oreNoise = new Noise(this.lcg());
        this.detailNoise = new Noise(this.lcg());
    }

    generateChunkData(chunkX: number, chunkZ: number): { data: Map<number, Uint8Array>; maxChunkY: number } {
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

        return { data, maxChunkY };
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
                    const blockIndex = x + 16 * (y + 16 * z); // y * 16 * 16 + z * 16 + x

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
                    4, 0.5, 0.5, 0.5, 2.0,
                    (x, z) => this.heightNoise.simplex(x, z)
                ) * 60 + 12; // Scale to 64-124 range

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
type CD =
    {
        data: Map<number, Uint8Array>
        maxChunkY: number,
    }
type WorkerMessage =
    {
        type: string,
        data:
        {
            data: Map<number, Uint8Array>,
            maxChunkY: number,
        }
    }

export class DataManager {
    chunkData: Map<string, Map<number, Uint8Array>> = new Map();
    chunkHeights: Record<string, number>
    constructor() {
        this.chunkData = new Map();
        this.chunkHeights = {

        }
    }
    get(x: number, y: number, z: number) {
        return this.chunkData.get(`${x},${z}`);
    }
    intializeWorkerScripts(data: Array<string>) {
        const coreCount = navigator.hardwareConcurrency || 4;
        if (!coreCount) return;
        const workerCount = Math.max(1, coreCount - 1);
        const workerURL = 'app/src/worker/terrainWorker.ts';
        const batchSize = 8;
        const iterations = data.length / batchSize;

        for (let x = 0; x < iterations; x++) {
            for (let x = 0; x < workerCount; x++) {
                const worker = new Worker(workerURL);
                const work = [];
                for (let j = 0; j < batchSize; j++) {
                    work.push(data[x * batchSize + j]);
                }
                worker.onerror = (e) => { console.error(e.message, "Error") };
                worker.postMessage(
                    {
                        type: 'init',
                        data: work
                    }
                )
                worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
                    const { type, data } = e;
                    for (let [key, value] of Object.entries(data)) {
                        const [x, z] = key.split(',').map(Number);
                        for (let [k, v] of value) {
                            this.chunkData.set(`${x},${k},${z}`, v)
                        }
                    }
                };
            }
        }
    }
    update(cX: number, cZ: number, bounds: number, tGen: TerrainGenerator) {
        const nBound = cZ + bounds;
        const sBound = cZ - bounds;
        const eBound = cX + bounds;
        const wBound = cX - bounds;
        const deleteQueue: Set<string> = new Set();
        for (const [key] of this.chunkData) {
            const [x, , z] = key.split(',').map(Number);
            if (z > nBound || z < sBound || x > eBound || x < wBound) {
                deleteQueue.add(key);
            }
        }
        for (const key of deleteQueue) {
            this.chunkData.delete(key);
        }
        const requiredData: Array<string> = [];
        for (let x = wBound; x <= eBound; x++) {
            for (let z = sBound; z <= nBound; z++) {
                if (!this.chunkData.has(`${x},${z}`)) requiredData.push(`${x},${z}`);
            }
        }
        this.intializeWorkerScripts(requiredData);

    }
    loadNewData(tGen: TerrainGenerator, requiredData: Set<string>) {
        for (const string of requiredData) {
            const [x, z] = string.split(`,`).map(Number);
            const { data, maxChunkY } = tGen.generateChunkData(x, z);
            this.chunkHeights[string] = maxChunkY;
            this.chunkData.set(string, data)
        }//loads the new world data into storage
    }
    _lastChunkKey = ``;
    _lastChunkData: Uint8Array | undefined = new Uint8Array();
    getVoxel(x: number, y: number, z: number) {
        const { cCords, lCords } = util.localizeCords(x, y, z);
        const chunkKey = `${cCords[0]},${cCords[1]},${cCords[2]}`;
        if (this._lastChunkKey === chunkKey && this._lastChunkData) {
            return this._lastChunkData[util.getIndex(lCords[0], lCords[1], lCords[2])] || false;
        }
        const chunkMap = this.chunkData.get(`${cCords[0]},${cCords[2]}`);
        const chunkData = chunkMap?.get(cCords[1]);

        return chunkData?.[util.getIndex(lCords[0], lCords[1], lCords[2])] || false;
    }
    getNeighbor(ax: number, ay: number, az: number) {
        return [
            this.getVoxel(ax - 1, ay, az),   // left
            this.getVoxel(ax + 1, ay, az),   // right
            this.getVoxel(ax, ay - 1, az),   // bottom
            this.getVoxel(ax, ay + 1, az),   // top
            this.getVoxel(ax, ay, az - 1),    // back
            this.getVoxel(ax, ay, az + 1)    // front
        ];
    }
}
import * as THREE from "three";
const texture0 = util.loadBlockTexture('./src/assets/blockAtlases/atlas0.png')
const blocksMaterial = new THREE.MeshBasicMaterial({ map: texture0, side: THREE.DoubleSide })
export class Mesher {
    meshMap: Map<string, THREE.Mesh>;
    constructor() {
        this.meshMap = new Map();
    }
    createMesh(dm: DataManager, ax: number, ay: number, az: number, scene: THREE.Scene) {
        const xBound = ax * 16;
        const yBound = ay * 16;
        const zBound = az * 16;
        const validFaces: Record<string, Record<string, number>> = {
            "top": {},
            "bottom": {},
            "right": {},
            "left": {},
            "front": {},
            "back": {}
        }
        let faceCounter = 0;
        for (let x = xBound; x < xBound + 16; x++) {
            for (let y = yBound; y < yBound + 16; y++) {
                for (let z = zBound; z < zBound + 16; z++) {
                    const blockType = dm.getVoxel(x, y, z)
                    if (!!!blockType) continue;
                    const neighbors = dm.getNeighbor(x, y, z);
                    for (let i = 0; i < neighbors.length; i++) {
                        if (neighbors[i] == true) continue;
                        faceCounter++;
                        validFaces[faceArray[i]][`${x},${y},${z}`] = blockType as number;
                    }
                }
            }
        }
        const validQuads = this.greedyMesh(validFaces)
        if (validQuads.length === 0) return null;
        const vertices: Array<number> = [];
        const indices: Array<number> = [];
        const uvs: Array<number> = [];
        let offset = 0;
        for (const quad of validQuads) {
            const [start, end, face, blockType] = quad as [Array<number>, Array<number>, string, number];
            const [x1, y1, z1] = start;
            const [x2, y2, z2] = end;
            const aAxis = indexRef[face][0];
            const bAxis = indexRef[face][1];
            const width = end[aAxis] - start[aAxis] + 1;
            const height = end[bAxis] - start[bAxis] + 1;

            let uvData = getUVCords(UVCORDS[blockType], height, width);

            switch (face) {
                case 'top': // +Y face
                    vertices.push(
                        x1, y2 + 1, z1,      // Bottom-Left
                        x1, y2 + 1, z2 + 1,  // Top-Left
                        x2 + 1, y2 + 1, z2 + 1,  // Top-Right
                        x2 + 1, y2 + 1, z1       // Bottom-Right
                    );
                    // For top face: width = x dimension, height = z dimension
                    uvData = getUVCords(UVCORDS[blockType], (x2 - x1 + 1), (z2 - z1 + 1));
                    break;

                case 'bottom': // -Y face
                    vertices.push(
                        x1, y1, z1,      // Bottom-Left
                        x1, y1, z2 + 1,  // Top-Left
                        x2 + 1, y1, z2 + 1,  // Top-Right
                        x2 + 1, y1, z1       // Bottom-Right
                    );
                    // Same as top face
                    uvData = getUVCords(UVCORDS[blockType], (x2 - x1 + 1), (z2 - z1 + 1));
                    break;

                case 'left': // -X face
                    vertices.push(
                        x1, y1, z2 + 1,  // Bottom-Left
                        x1, y2 + 1, z2 + 1,  // Top-Left
                        x1, y2 + 1, z1,      // Top-Right
                        x1, y1, z1       // Bottom-Right
                    );
                    // For left face: width = z dimension, height = y dimension
                    uvData = getUVCords(UVCORDS[blockType], (z2 - z1 + 1), (y2 - y1 + 1));
                    break;

                case 'right': // +X face
                    vertices.push(
                        x2 + 1, y1, z1,      // Bottom-Left
                        x2 + 1, y2 + 1, z1,  // Top-Left
                        x2 + 1, y2 + 1, z2 + 1,  // Top-Right
                        x2 + 1, y1, z2 + 1       // Bottom-Right
                    );
                    // Same as left face
                    uvData = getUVCords(UVCORDS[blockType], (z2 - z1 + 1), (y2 - y1 + 1));
                    break;

                case 'front': // +Z face
                    vertices.push(
                        x1, y1, z2 + 1,  // Bottom-Left
                        x1, y2 + 1, z2 + 1,  // Top-Left
                        x2 + 1, y2 + 1, z2 + 1,  // Top-Right
                        x2 + 1, y1, z2 + 1       // Bottom-Right
                    );
                    // For front face: width = x dimension, height = y dimension
                    uvData = getUVCords(UVCORDS[blockType], (x2 - x1 + 1), (y2 - y1 + 1));
                    break;

                case 'back': // -Z face
                    vertices.push(
                        x2 + 1, y1, z1,  // Bottom-Left
                        x2 + 1, y2 + 1, z1,  // Top-Left
                        x1, y2 + 1, z1,  // Top-Right
                        x1, y1, z1       // Bottom-Right
                    );
                    // Same as front face
                    uvData = getUVCords(UVCORDS[blockType], (x2 - x1 + 1), (y2 - y1 + 1));
                    break;
            }
            uvs.push(...uvData)
            indices.push(offset, offset + 1, offset + 2, offset + 2, offset + 3, offset + 0);
            offset += 4;
        }
        const buffer = new THREE.BufferGeometry();
        buffer.setAttribute(`position`, new THREE.Float32BufferAttribute(vertices, 3));
        buffer.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        buffer.setIndex(indices);
        const mesh = new THREE.Mesh(buffer, blocksMaterial)
        scene.add(mesh);
        this.meshMap.set(`${ax},${ay},${az}`, mesh);
    }
    destroyMesh(key: string, scene: THREE.Scene) {
        const data = this.meshMap.get(key)
        scene.remove(data!);
        data!.geometry.dispose();
        this.meshMap.delete(key);
    }
    greedyMesh(data: Record<string, Record<string, number>>) {
        const validQuads = [];
        for (let [key, value] of Object.entries(data)) {
            const faces = Object.keys(value);
            if (faces.length === 0) continue;
            const aAxis = indexRef[key][0];
            const bAxis = indexRef[key][1];
            const visitedQuads = new Set();
            let current = 0;
            while (visitedQuads.size < faces.length) {
                while (current < faces.length && visitedQuads.has(faces[current])) {
                    current++;
                }
                if (current >= faces.length) break;
                const blockType = value[faces[current]];
                const face = faces[current].split(',').map(Number);
                let firstBound = [...face];
                let w = 0;
                let currentPos = [...face];
                while (true) {
                    currentPos[aAxis]++;
                    const str = currentPos.join(',');
                    if (!(str in value) || value[str] !== blockType || visitedQuads.has(str)) {
                        currentPos[aAxis]--;
                        firstBound = [...currentPos];
                        break;
                    }
                    w++;
                }
                let v = 0;
                currentPos = [...face];
                const quadFaces = new Set([faces[current]]);

                while (w > 0) {
                    currentPos[bAxis]++;
                    const rowFaces = [];
                    let success = true;
                    for (let i = 0; i <= w; i++) {
                        const newPos = [...currentPos];
                        newPos[aAxis] = face[aAxis] + i;
                        const str = newPos.join(',');

                        if (!(str in value) || value[str] !== blockType || visitedQuads.has(str)) {
                            success = false;
                            break;
                        }
                        rowFaces.push(str);
                    }

                    if (!success) break;
                    rowFaces.forEach(f => quadFaces.add(f));
                    v++;
                }
                quadFaces.forEach(f => visitedQuads.add(f));
                if (v === 0 && w === 0) {
                    validQuads.push([face, face, key, blockType]);
                } else {
                    const endPos = [...face];
                    endPos[aAxis] += w;
                    endPos[bAxis] += v;
                    validQuads.push([face, endPos, key, blockType]);
                }
            }
        }
        return validQuads;
    }
}
export class Mesher2 {
    meshMap: Map<string, THREE.Mesh>;

    constructor() {
        this.meshMap = new Map();
    }
    createMesh(dm: DataManager, ax: number, ay: number, az: number, scene: THREE.Scene) {
        const xBound = ax * 16;
        const yBound = ay * 16;
        const zBound = az * 16;

        const validFaces: Record<string, Record<string, number>> = {
            "top": {},
            "bottom": {},
            "right": {},
            "left": {},
            "front": {},
            "back": {}
        }
        let faceCounter = 0;
        const vertices: Array<number> = [];
        const indices: Array<number> = [];
        const uvs: Array<number> = [];
        let offset = 0;
        for (let x = xBound; x < xBound + 16; x++) {
            for (let y = yBound; y < yBound + 16; y++) {
                for (let z = zBound; z < zBound + 16; z++) {
                    const blockType = dm.getVoxel(x, y, z)
                    if (!!!blockType) continue;
                    const neighbors = dm.getNeighbor(x, y, z);
                    for (let i = 0; i < neighbors.length; i++) {
                        if (neighbors[i] == true) continue;
                        faceCounter++;
                        const offSetValues = faceDirections[faceArray[i]];
                        vertices.push(
                            x + offSetValues[0], y + offSetValues[1], z + offSetValues[2],
                            x + offSetValues[3], y + offSetValues[4], z + offSetValues[5],
                            x + offSetValues[6], y + offSetValues[7], z + offSetValues[8],
                            x + offSetValues[9], y + offSetValues[10], z + offSetValues[11],
                        )
                        indices.push(offset, offset + 1, offset + 2, offset + 2, offset + 3, offset);
                        let uvsss = getUVCords(UVCORDS[blockType], 1, 1)
                        uvs.push(...uvsss);
                        offset += 4;
                    }
                }
            }
        }
        const buffer = new THREE.BufferGeometry();
        buffer.setAttribute(`position`, new THREE.Float32BufferAttribute(vertices, 3));
        buffer.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        buffer.setIndex(indices);
        const mesh = new THREE.Mesh(buffer, blocksMaterial)
        scene.add(mesh);
        this.meshMap.set(`${ax},${ay},${az}`, mesh);
    }
}

