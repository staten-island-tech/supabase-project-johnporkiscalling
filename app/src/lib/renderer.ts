import { Random, util } from "./utils";
import { Noise } from "./noise";
import { faceDirections } from "./constants";
import { atlasData } from "@/lib/atlas";
const faceArray = ["left", "right", "bottom", "top", "back", "front"]
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
    GOLD_ORE: 10,
    DIAMOND_ORE: 11,
    BEDROCK: 12,
    CLAY: 13,
    GRAVEL: 14,
    OBSIDIAN: 15
};

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
    10:"minecraft:block/gold_ore",
    11:"minecraft:block/diamond_ore",
    12: "minecraft:block/bedrock",
    13:"minecraft:block/clay",
    14:"minecraft:block/gravel",
    15:"minecraft:block/obsidian"
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
    readyQueue:Array<string>
    aqueue:Array<string>
    constructor() {
        this.chunkData = new Map();
        this.chunkHeights = {
        }
        this.queue = [];
        this.aqueue = [];
        this.readyQueue = [];
    }
    checkQueue(tg:TerrainGenerator)
    {
        if(this.aqueue.length==0) return;

        if(this.aqueue.length!=0)
        {
            for(let item of this.aqueue)
            {
                const [x,z] = item.split(',').map(Number);
                this.nonAsync(x,z,tg);
                this.readyQueue.push(item);
            }
        }
        this.aqueue.length=0;
    }
    nonAsync(chunkX:number,chunkZ:number, tg:TerrainGenerator)
    {
        const {data, maxChunkY} = tg.generateChunkData(chunkX, chunkZ);
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
        if(!chunkMap) return;
        const chunkData = chunkMap?.get(cCords[1]) as Uint8Array;
        if(chunkMap && !chunkData) 
        {
            const modifiedData = new Uint8Array(4096);
            console.log("new data was created")
            modifiedData[util.getIndex(lCords[0], lCords[1], lCords[2])] = data;
            chunkMap.set(cCords[1], modifiedData);
        }
        else
        {
            chunkData[util.getIndex(lCords[0], lCords[1], lCords[2])] = data;
        }
    }
}
import * as THREE from "three";
const texture0 = util.loadBlockTexture('./src/assets/atlas0.png')
const blocksMaterial = new THREE.MeshBasicMaterial({ map: texture0, side: THREE.DoubleSide })
const frameBudget = 4;
import { Item } from "./entitymanager";
interface renderItem 
{
    item:Item;
    mesh:THREE.Mesh
}
export class ItemManager
{
    droppedItems:Array<renderItem> = []
    lastDespawn:number;
    constructor()
    {
        this.lastDespawn = 0;       
    }
    addItem(scene:THREE.Scene, positon:THREE.Vector3, id:number)
    {
        const item = new Item(id, positon.clone().add(new THREE.Vector3(0,1.5,0)), new THREE.Vector3(0.1,2,0.1));
        const geometry = new THREE.BoxGeometry(0.25,0.25,0.25);
        const uv = getUVCords(UVCORDS[id], 1,1);
        const uvs = geometry.attributes.uv.array;
        for (let i = 0; i < uvs.length; i += 8) {
            uvs[i + 0] = uv[0]; uvs[i + 1] = uv[1]; // bottom-left
            uvs[i + 2] = uv[2]; uvs[i + 3] = uv[3]; // bottom-right
            uvs[i + 4] = uv[4]; uvs[i + 5] = uv[5]; // top-right
            uvs[i + 6] = uv[6]; uvs[i + 7] = uv[7]; // top-left
        }
        geometry.attributes.uv.needsUpdate = true;
        const newMesh = new THREE.Mesh(geometry, blocksMaterial);
        scene.add(newMesh)
        this.droppedItems.push({item:item,mesh:newMesh})
    }
    updateAll(delta:number,dm:DataManager)
    {
        for(let x of this.droppedItems)
        {
            x.item.update(delta, dm);
            x.item.applyToMesh(x.mesh, delta);
        }
    }
    despawnAll(scene:THREE.Scene)
    {
        if(!((performance.now()-this.lastDespawn) >= 300)) return;
        for(let x of this.droppedItems)
        {
            scene.remove(x.mesh);
            x.mesh.geometry.dispose();
        }
        this.droppedItems.length = 0;
        this.lastDespawn = performance.now();

    }
}
export class Mesher2 {
    meshMap: Map<string, THREE.Mesh>;
    renderQueue:Array<string> = [];
    priorityQueue:Array<string> = [];
    constructor() {
        this.meshMap = new Map();
    }
    renderStuff(dm:DataManager,scene:THREE.Scene)
    {
        for(let a = 0; a<this.renderQueue.length; a++)
        {
            const key = this.renderQueue[a];
            this.destroyMesh(key, scene);
            const [x,y,z] = key.split(',').map(Number);
            console.log(x,y,z)
            if(z===undefined)
            {
                const data =  dm.chunkData.get(`${x},${y}`) as Map<number, Uint8Array>;
                const maxHeight = Math.max(...Array.from(data.keys()).map(Number));
                for(let bab = maxHeight; bab>=0; bab--)
                {
                    this.priorityQueue.push(`${x},${bab},${y}`);
                }
                continue;
            }
            console.log(x,y,z)
            this.priorityQueue.push(key);
        }
        this.renderQueue.length = 0;
        if(this.priorityQueue.length==0) return;
        for(let a = 0; a<2; a++)
        {
            if(this.priorityQueue.length==0) break;
            const element = this.priorityQueue.shift() as string;
            console.log(element)
            const [x,y,z] = element?.split(",").map(Number);
            this.createMesh(dm, x,y,z, scene);
        }
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
    destroyMesh(key:string, scene:THREE.Scene)
    {
        const mesh = this.meshMap.get(key);
        if(!mesh) return;
        scene.remove(mesh);
        mesh.geometry.dispose();
        this.meshMap.delete(key);
    }
}