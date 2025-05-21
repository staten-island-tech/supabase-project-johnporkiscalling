import * as THREE from 'three';
import { faceDirections } from './stupidlylongvariables';
import { util3d } from './utils';
const scene = new THREE.Scene;
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
let CZ =Infinity;
let CY = Infinity;
class SaveSystem//this system basically operates on the idea that when a player unloads a chunk the world data for that unloadd chunk gets saved here
//otherwise the loaded chunks are fine and when the player quits the game or generates a save file they read from the chunkManager
{
    save:Map<string,Uint8Array>
    constructor()
    {
        this.save =  new Map();
    }
    writeToSaveFile()
    {
        
    }
}
let saveSystem =  new SaveSystem();


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
        //first check if niehgobirng chunk data exists if not atleast set the data instead of generating the full mesh
        //if the neighboring chunk data that is meant to be retrieved exists outjside thte range of the render distance 
        //just get the edge of the voxel block which prevents massive calls that wont be used
        //or cache the unrendered results
        const [x, y, z] = chunk.key.split(",").map(Number)//determine the neighbors

        const neighbors = deltas.map(([dx, dy, dz]) => [x + dx, y + dy, z + dz]);
        for (let i = 0; i < neighbors.length; i++) {
            const key = neighbors[i].toString();
            const exists = this.chunks.has(key);
            if(!exists) this.loadWorldData(key);
            const data = this.chunks.get(key);
            
            //get the thingie to render the worldData
        }
    }
    getNeighbors(key:string)
    {
        
    }
    setVoxel(keys:string)
    {
        
    }
    getVoxel(x:number, y:number, z:number)
    {
        const {chunkCords, localCords} = util3d.gtlCords(x,y,z);
        const [cX, cY, cZ ] = chunkCords; 
        const chunk = this.chunks.get(`${chunkCords[0]},${chunkCords[1]}, ${chunkCords[2]}`) as VoxelChunk;
        return chunk.data[cX+16*(cY+16*cZ)]
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
        const chunkZ = Math.floor(yawObject.position.z/16)
        const chunkX = Math.floor(yawObject.position.x/16) 
        const chunkY = Math.floor(yawObject.position.x/16)
        const uBound = chunkY + chunkLoadLimit;
        const dBound = chunkY - chunkLoadLimit;
        const nBound = chunkZ - chunkLoadLimit;
        const sBound = chunkZ + chunkLoadLimit;
        const wBound = chunkX - chunkLoadLimit;
        const eBound = chunkX + chunkLoadLimit;

        //add another bound for going down or up 

        //first pass removes chunks that are outside of the limit
        for(const [key, VoxChunk] of this.chunks)
        {
            const [x,y,z] =  key.split(',').map(Number);
            if(x<wBound||x>eBound||y<nBound||y>sBound)
            {
                VoxChunk.destroyMesh(scene);
                //removes the mesh from the scene automatically
                //data is still perserved to be able to be read by the save system
            }
        }//second pass determines whether or not to rerender dirty chunks
        for(let x =  wBound; x<eBound; x++)//third pass loads new chunks
        {
            for(let y = dBound; y<uBound; y++)
            {
                for(let z =  nBound; z<sBound; z++)
                {
                    const stringCords = `${x},${y},${z}`
                    if(!this.chunks.has(stringCords))
                    {
                        const rewrite = new VoxelChunk(stringCords);
                        //initialize the world generator so it can be used globally
                        //
                        rewrite.data = new Uint8Array(16*16*16);
                        this.generateChunkMesh(rewrite);
                        rewrite.returnMesh();   
                    }
                }                
            }
        }
    }
    maybeLoad()
    {
        this.reloadDirty();
        //this will always be called regardless of whether the player has changed chunks or not
        const chunkX = Math.floor(yawObject.position.x / 16);
        const chunkZ = Math.floor(yawObject.position.z / 16);
        const chunkY = Math.floor(yawObject.position.y / 16);

        if (chunkX !== CX || chunkZ !== CZ || chunkY !== CY ) {
            this.renderNew();
            CX = chunkX;
            CZ = chunkZ;
            CY = chunkY;
        }        
    }
    reloadDirty()
    {
        for(let key of this.dirtyChunks)
        {
            const chunk = this.chunks.get(key) as VoxelChunk;
            this.generateChunkMesh(chunk);
        }
    }
}



import { Random } from './utils';
import { Noise } from './noisefunct';
import { string } from 'three/tsl';
class WorldGenerator extends Random {
    private temperatureNoise: Noise;
    private humidityNoise: Noise;
    private continentalnessNoise: Noise;
    private detailNoise: Noise;
    constructor(seed: number) {
        super(seed);
        this.temperatureNoise = new Noise(seed + 1);
        this.humidityNoise = new Noise(seed + 2);
        this.continentalnessNoise = new Noise(seed + 3);
        this.detailNoise = new Noise(seed + 4);
    }
}