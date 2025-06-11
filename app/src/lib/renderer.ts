import { Random, util } from "./utils";
import { Noise } from "./noise";
import { faceDirections } from "./constants";
import { atlasData } from "@/lib/atlas";
const faceArray = ["left", "right", "bottom", "top", "back", "front"]
const UVCORDS: Record<number, string> = 
{
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
interface TextureFrame {
    x: number;
    y: number;
    w: number;
    h: number;
}
type AtlasData = {
    textureSize: TextureSize;
    frames: Record<string, TextureFrame>;
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

type WorkerMessage =
{
    type: "generate",
    DATABUTUPPERCASE:
    {
        seed: number;
        payload: Array<string>
    }
}
type ReturnMessage =
{
    type:string,
    data:Record<string,
    {
        data: Record<number, Uint8Array>
        maxChunkY: number,
    }>
}
import { TerrainGenerator } from "./workerscripts";
export class DataManager {
    chunkData: Map<string, Map<number, Uint8Array>> = new Map();
    chunkHeights: Record<string, number>
    queue:Array<string>;
    constructor() {
        this.chunkData = new Map();
        this.chunkHeights = {
        }
        this.queue = [];
    }
    nonAsync(chunkX:number,chunkZ:number, tg:TerrainGenerator)
    {
        const {data, maxChunkY} = tg.generateChunkData2(chunkX, chunkZ);
        for(let a = 0; a<maxChunkY; a++)
        {
            this.chunkData.set(`${chunkX},${chunkZ}`, data);
            this.queue.push(`${chunkX},${chunkZ}`);
        }
    }
    nonasyncUpdate(cZ:number, cX:number, bounds:number, tg:TerrainGenerator)
    {
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
            console.log(key)
        }
        for (let x = wBound; x <= eBound; x++) {
            for (let z = sBound; z <= nBound; z++) {
                if (!this.chunkData.has(`${x},${z}`)) this.nonAsync(x,z,tg);
            }
        }

    }
    async intializeWorkerScripts(data: Array<string>) {
        const coreCount = navigator.hardwareConcurrency || 4;
        if (!coreCount) return;
        const workerCount = Math.max(1, coreCount - 1);
        const batchSize = 16;
        const iterations = data.length / batchSize;
        const allWorkerPromises: Array<Promise<void>> = [];

        for (let x = 0; x < iterations; x++) {
            for (let b = 0; b < workerCount; b++) {
                const work:Array<string> = [];
                for (let j = 0; j < batchSize; j++) {
                    if(!data[x*batchSize+j])continue;
                    work.push(data[x * batchSize + j]);
                }
                if(work.length==0) continue;
                const promise = new Promise<void>((resolve, reject)=>
                {
                    const worker = new Worker(
                        new URL('../workers/terrainWorker.ts?worker', import.meta.url),
                        { type: 'module' }
                    );
                    worker.onerror = (e) => { 
                        console.error(e, "Error")
                        worker.terminate();
                    }; 
                    const message:WorkerMessage =
                    {
                        type: 'generate',
                        DATABUTUPPERCASE: {
                            seed: 123, // or whatever your seed is
                            payload: work
                        }
                    }
                    worker.postMessage(message);
                    worker.onmessage = (e: MessageEvent<ReturnMessage>) => {
                        const { data: returnData } = e.data; 
                        for (const [key, value] of Object.entries(returnData)) {
                            const [x, z] = key.split(',').map(Number);
                            value.data
                            if (!value?.data) continue;
                            const yLevelsMap = new Map<number, Uint8Array>(
                                Object.entries(value.data).map(([yStr, data]) => 
                                    [Number(yStr), data] 
                                )
                            );
                            this.chunkData.set(`${x},${z}`, yLevelsMap);
                            this.chunkHeights[`${x},${z}`] = value.maxChunkY;
                            this.queue.push(`${x},${z}`);
                        }
                        worker.terminate();
                        resolve();
                    };
                })
                allWorkerPromises.push(promise);

            }
        }
        await Promise.all(allWorkerPromises);
    }
    async update(cX: number, cZ: number, bounds: number) {
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
            console.log(key)
        }
        const requiredData: Array<string> = [];
        for (let x = wBound; x <= eBound; x++) {
            for (let z = sBound; z <= nBound; z++) {
                if (!this.chunkData.has(`${x},${z}`)) requiredData.push(`${x},${z}`);
            }
        }
        if(requiredData.length==0) return;
        console.log("thos is issue")
        await this.intializeWorkerScripts(requiredData);
        return requiredData;
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
    setVoxel(x:number, y:number, z:number, data:number)
    {
        const { cCords, lCords } = util.localizeCords(x, y, z);
        const chunkKey = `${cCords[0]},${cCords[1]},${cCords[2]}`;
        if (this._lastChunkKey === chunkKey && this._lastChunkData) {
            return this._lastChunkData[util.getIndex(lCords[0], lCords[1], lCords[2])] || false;
        }
        const chunkMap = this.chunkData.get(`${cCords[0]},${cCords[2]}`);
        const chunkData = chunkMap?.get(cCords[1]);
        if(!chunkData) return;
        chunkData[util.getIndex(lCords[0], lCords[1], lCords[2])] = data;
    }
}
import * as THREE from "three";
const texture0 = util.loadBlockTexture('./src/assets/blockAtlases/atlas0.png')
const blocksMaterial = new THREE.MeshBasicMaterial({ map: texture0, side: THREE.DoubleSide })
export class Mesher2 {
    meshMap: Map<string, THREE.Mesh>;
    renderQueue:Array<string> = [];
    constructor() {
        this.meshMap = new Map();
    }
    renderStuff(dm:DataManager,scene:THREE.Scene)
    {
        if(this.renderQueue.length==0) return;
        for(let a = 0; a<this.renderQueue.length; a++)
        {
            const key = this.renderQueue[a];
            const mesh = this.meshMap.get(key) as THREE.Mesh;
            scene.remove(mesh);
            mesh.geometry.dispose();
            this.meshMap.delete(key);
            const [x,y,z] = key.split(',').map(Number);
            this.createMesh(dm, x,y,z, scene)
        }
        this.renderQueue.length = 0;
    }
    removeStuff(cX:number, cZ:number, bounds:number,scene:THREE.Scene)
    {
        const nBound = cZ + bounds;
        const sBound = cZ - bounds;
        const eBound = cX + bounds;
        const wBound = cX - bounds;
        for (const [key, mesh] of this.meshMap) {
            const [x, , z] = key.split(',').map(Number);
            if (z > nBound || z < sBound || x > eBound || x < wBound) {
                this.meshMap.delete(key);
                scene.remove(mesh);
                mesh.geometry.dispose();

            }
        }
    }
    createMesh(dm: DataManager, ax: number, ay: number, az: number, scene: THREE.Scene) {
        if(this.meshMap.has(`${ax},${ay},${az}`)) return this.meshMap.get(`${ax},${ay},${az}`);
        const xBound = ax * 16;
        const yBound = ay * 16;
        const zBound = az * 16;
        let faceCounter = 0;
        let vertices: Array<number> = [];
        let indices: Array<number> = [];
        let uvs: Array<number> = [];
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
    destroyMesh()
    {
        
    }
}