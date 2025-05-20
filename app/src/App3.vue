<template>
  <div ref="canvasContainer" class="scene-container"></div>
    <div class="debugScreen">
        {{ coordinates }}
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as THREE from 'three';
import Stats from 'stats.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { util3d, BitArray, Random, BiomeStack } from './utils';    
import { Noise } from './noisefunct';
import { faceDirections } from './stupidlylongvariables';
import { options } from './options';

import pako from 'pako';

const seed = 11111111;
const noiseMachine =  new Noise(seed);
const stats =  new Stats();
document.body.appendChild(stats.dom);
const coordinates =  ref();

const scene:THREE.Scene = new THREE.Scene();
const camera:THREE.Camera =  new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 2048)
const renderer:THREE.WebGLRenderer =  new THREE.WebGLRenderer({antialias:false});
const pitchObject:THREE.Object3D =  new THREE.Object3D().add(camera);
const yawObject:THREE.Object3D =  new THREE.Object3D().add(pitchObject);
yawObject.position.set(0,0,0);
camera.position.set(0, 0, 0);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
scene.add(yawObject);


//mouse movement
const canvasContainer = ref<HTMLElement | null>(null)
const canvas =  renderer.domElement;
canvas.addEventListener('click', () => {
    canvas.requestPointerLock();
});
document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
        document.addEventListener('mousemove', onMouseMove);
    } else {
        document.removeEventListener('mousemove', onMouseMove);
    }
});
let yaw = 0;
let pitch = 0;
function onMouseMove(event:MouseEvent) {
    yaw -= event.movementX * options.mouseSens;
    pitch -= event.movementY * options.mouseSens;
    const maxPitch = Math.PI / 2 - 0.01;
    pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));
    yawObject.rotation.y = yaw;
    pitchObject.rotation.x = pitch;
}
//


//keyboard actions
const keys:Record<string, boolean> = {}
window.addEventListener("keydown", (event)=>
{
    keys[event.key.toLowerCase()] = true;
})
window.addEventListener("keyup", (event)=>
{
    keys[event.key.toLowerCase()] = false;
})




//

//debug area
function updateDebug()
{
    coordinates.value =  `
    ${Math.round(yawObject.position.x)},
    ${Math.round(yawObject.position.y)},
    ${Math.round(yawObject.position.z)}`;
}
//

//basic scene initializing
const sunSource =  new THREE.DirectionalLight(0xffffff,1);
const sun =  new THREE.Vector3();
const sky =  new Sky();
const skyUniforms = sky.material.uniforms;
skyUniforms['turbidity'].value = 4;
skyUniforms['rayleigh'].value = 2;
skyUniforms['mieCoefficient'].value = 0.00005;
skyUniforms['mieDirectionalG'].value = 0.8;
sky.scale.setScalar(10000);
scene.add(sky);
scene.add(sunSource);



//

//sky shaders + sun
let time = 0;
function updateSun() 
{
    time += 0.0001; // Adjust for speed
    if (time > 1) time = 0;
    const elevation = Math.sin(time * 2 * Math.PI) * 90;
    const azimuth = 180 + Math.cos(time * 2 * Math.PI) * 90;
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);
    sun.setFromSphericalCoords(1, phi, theta);
    sky.material.uniforms['sunPosition'].value.copy(sun);
    sunSource.position.copy(sun);
}
//

//animate loop
let currentTime = Infinity;


//


//player interactions



//


//texture loading
const textureLoader = new THREE.TextureLoader();
function loadBlockTexture(path:string)
{
  const tex = textureLoader.load(path);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = true;
  tex.premultiplyAlpha = false;
  return tex;
};
const texture0 = loadBlockTexture('./src/assets/blockAtlases/atlas0.png')
const blockUVs:Record<string,Array<number>> = {
  top: util3d.getUVCords('minecraft:block/grass_block_top'),
  side: util3d.getUVCords('minecraft:block/grass_block_side'),
  bottom: util3d.getUVCords('minecraft:block/dirt'),
  sand: util3d.getUVCords('minecraft:block/sand'),
  red_sand: util3d.getUVCords('minecraft:block/red_sand'),
  stone: util3d.getUVCords('minecraft:block/stone'),
};
//


//re-rendering process
const dirtyChunks:Set<string> = new Set();
const chunkMeshMap:Map<string, THREE.Mesh> = new Map();
const maxChunk = options.chunksLoad;
let lastChunkX = Infinity, lastChunkZ = Infinity;

//detect if the chunk is full blocks or full air
//if any of those options are true then dont render anything at all

//

//chunk generation
class VoxelChunk
{
    cCords:Array<number>
    data:Uint8Array
    meshData:THREE.Mesh | null;
    offset:number;
    indices:Array<number>;
    vertices:Array<number>;
    uvs:Array<number>;
    dirty:boolean;
    constructor(x:number,y:number,z:number, chunkData?:Uint8Array)
    {
        this.data = chunkData?chunkData:new Uint8Array(16*16*16);
        this.cCords = [x,y,z];
        this.meshData =  new THREE.Mesh();
        this.offset = 0;
        this.indices = [];
        this.vertices = [];
        this.uvs = [];
        this.dirty = false;
    }
    getVoxel(x:number, y:number, z:number) {//operates on a chunk local approach
        if (x < 0 || y < 0 || z < 0 || x >= 16 || y >= 16 || z >= 16) 
        {
            return 0;
        }
        const index = x + (y * 16) + (z * 16 * 16);
        return this.data[index];
    }
    setVoxel(x:number, y:number, z:number, type:number) 
    {//the type is a numbber specified 
        if (x < 0 || y < 0 || z < 0 || x >= 16 || y >= 16 || z >= 16) {
        return 0; // Out of bounds
        }
        const index = x + (y * 16) + (z * 16 * 16);
        this.data[index] =  type;
        return true
    }
    addFace(x:number, y:number, z:number, blockType:number, dir:string)
    {
        const offSetValues = faceDirections[dir];
        this.vertices.push(
            x + offSetValues[0], y + offSetValues[1], z + offSetValues[2],
            x + offSetValues[3], y + offSetValues[4], z + offSetValues[5],
            x + offSetValues[6], y + offSetValues[7], z + offSetValues[8],
            x + offSetValues[9], y + offSetValues[10], z + offSetValues[11],
        )

        this.indices.push(this.offset, this.offset+1, this.offset+2, this.offset+2, this.offset+3, this.offset);
        const texturew = blockUVs[blockType];
        this.uvs.push(...texturew);
        this.offset+=4;
    }
    returnMesh()
    {
        const buffer  = new THREE.BufferGeometry();
        buffer.setAttribute('position', new THREE.Float32BufferAttribute(this.vertices, 3));
        buffer.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs,2));
        buffer.setIndex(this.indices);
        this.meshData = new THREE.Mesh(buffer, blocksMaterial);
    }
    destroyMesh(scene:THREE.Scene)
    {
        scene.remove(this.meshData!);
        this.meshData!.geometry.dispose();
        this.meshData = null;
        this.vertices = [];
        this.indices = [];
        this.uvs = [];
    }
}
//get the  


class ChunkManager
{
    chunks:Map<string, VoxelChunk>;
    dirtyChunks:Set<string>;
    constructor()
    {
        this.chunks = new Map();
        this.dirtyChunks =  new Set();
    }
    getChunkKey(x:number, y:number, z:number)
    {
        return `${x},${y},${z}`;
    }
    //probably dont even need this
    getChunk(x:number, y:number, z:number)
    {
        return this.chunks.get(this.getChunkKey(x,y,z));
    }
    getOrCreateChunk(x:number, y:number, z:number)
    {
        const key =  this.getChunkKey(x,y,z)
        if(!this.chunks.has(key))
        {
            const chunk = new VoxelChunk(x,y,z);
            this.chunks.set(key, chunk);
            this.dirtyChunks.add(key);
        }
        return this.chunks.get(key);
    }
    getVoxel(x:number, y:number, z:number)
    {
        const { chunkCords, localCords } =  util3d.gtlCords(x,y,z);
        const chunk = this.getChunk(chunkCords[0],chunkCords[1],chunkCords[2]);
        if(!chunk) return null;
        return chunk.getVoxel(localCords[0],localCords[1],localCords[2]);
    }
    setVoxel(x:number, y:number, z:number, type:number)
    {
        const { chunkCords, localCords } = util3d.gtlCords(x,y,z);
        const chunk =  this.getOrCreateChunk(chunkCords[0], chunkCords[1], chunkCords[2]) as VoxelChunk;
        chunk.setVoxel(localCords[0], localCords[1], localCords[2], type);
        this.dirtyChunks.add(this.getChunkKey(chunkCords[0],chunkCords[1],chunkCords[2]));
        if (localCords[0] === 0) this.markChunkDirty(chunkCords[0] - 1, chunkCords[1], chunkCords[2]);
        if (localCords[1] === 0) this.markChunkDirty(chunkCords[0], chunkCords[1] - 1, chunkCords[2]);
        if (localCords[2] === 0) this.markChunkDirty(chunkCords[0], chunkCords[1], chunkCords[2] - 1);
        if (localCords[0] === 15) this.markChunkDirty(chunkCords[0] + 1, chunkCords[1], chunkCords[2]);
        if (localCords[1] === 15) this.markChunkDirty(chunkCords[0], chunkCords[1] + 1, chunkCords[2]);
        if (localCords[2] === 15) this.markChunkDirty(chunkCords[0], chunkCords[1], chunkCords[2] + 1);
    }
    markChunkDirty(x:number, y:number, z:number)
    {
        const key =  this.getChunkKey(x,y,z);
        if(this.chunks.has(key))
        {
            this.dirtyChunks.add(key);
        }
    }
    getAdjacentVoxel(chunkCords:Array<number>, localCords:Array<number>)
    { 
        if (localCords[0] >= 0 && localCords[0] < 16 && 
            localCords[1] >= 0 && localCords[1] < 16 && 
            localCords[2] >= 0 && localCords[2] < 16) 
        {
            const chunk = this.getChunk(chunkCords[0], chunkCords[1], chunkCords[2]);
            return chunk ? chunk.getVoxel(localCords[0], localCords[1], localCords[2]) : 0;
        }
        let adjChunkX = chunkCords[0];
        let adjChunkY = chunkCords[1];
        let adjChunkZ = chunkCords[2];
        let adjLocalX = localCords[0];
        let adjLocalY = localCords[1];
        let adjLocalZ = localCords[2];
        if (localCords[0] < 0) 
        {
            adjChunkX--;
            adjLocalX = 16 + localCords[0];
        } 
        else if (localCords[0] >= 16) 
        {
            adjChunkX++;
            adjLocalX = localCords[0] - 16;
        }
        if (localCords[1] < 0) 
        {
            adjChunkY--;
            adjLocalY = 16 + localCords[1];
        } 
        else if (localCords[1] >= 16) 
        {
            adjChunkY++;
            adjLocalY = localCords[1] - 16;
        }
        
        if (localCords[2] < 0) 
        {
            adjChunkZ--;
            adjLocalZ = 16 + localCords[2];
        } 
        else if (localCords[2] >= 16) 
        {
            adjChunkZ++;
            adjLocalZ = localCords[2] - 16;
        }
        
        const adjChunk = this.getChunk(adjChunkX, adjChunkY, adjChunkZ);
        return adjChunk ? adjChunk.getVoxel(adjLocalX, adjLocalY, adjLocalZ) : 0;
    }
    generateChunkMesh(chunk:VoxelChunk)
    {
        if(chunk.meshData)
        {
            chunk.destroyMesh(scene);
        }
        const cCords = chunk.cCords;
        for (let x = 0; x < 16; x++) 
        {
            for (let y = 0; y < 16; y++) 
            {
                for (let z = 0; z < 16; z++)
                {
                    const voxelType = chunk.getVoxel(x, y, z);
                    if(!voxelType) continue;
                    if (this.getAdjacentVoxel(cCords, [x + 1, y, z]) === 0) 
                    {
                        chunk.addFace(x, y, z, voxelType, "right"); 
                    }
                    if (this.getAdjacentVoxel(cCords, [x - 1, y, z]) === 0) 
                    {
                        chunk.addFace(x, y, z, voxelType, "left");
                    }
                    if (this.getAdjacentVoxel(cCords, [x, y + 1, z]) === 0) 
                    {
                        chunk.addFace(x, y, z, voxelType, "top");
                    }
                    if (this.getAdjacentVoxel(cCords, [x, y - 1, z]) === 0) 
                    {
                        chunk.addFace(x, y, z, voxelType, "bottom");
                    }
                    if (this.getAdjacentVoxel(cCords, [x, y, z + 1]) === 0) 
                    {
                        chunk.addFace(x, y, z, voxelType, "front");
                    }        
                    if (this.getAdjacentVoxel(cCords, [x, y, z - 1]) === 0) 
                    {
                        chunk.addFace(x, y, z, voxelType, "back");
                    }
                }
            }
        }
        if (chunk.vertices.length > 0) 
        {
            chunk.returnMesh();
            scene.add(chunk.meshData as THREE.Mesh);
        }
    }
    updateChunkMeshes()//works off of the assunption that the voxel defined exists and can be rerendered
    {
        for(const key of this.dirtyChunks)
        {
            const chunk =  this.chunks.get(key);
            if(chunk)
            {
                this.generateChunkMesh(chunk);
            }
        }
        this.dirtyChunks.clear();
    }
    loadSaveFile(compressed:Uint8Array)
    {
        const decompressed = pako.inflate(compressed);
        const decodedJson = new TextDecoder().decode(decompressed);
        const parsed = JSON.parse(decodedJson);
        return parsed;
    }
    generateSaveFile()
    {
        const saveFile:Record<string, Uint8Array> = {}
        for(const [key, voxChunk] of this.chunks)
        {
            saveFile[key] = voxChunk.data;
        }        
        const jsonString = JSON.stringify(saveFile);
        const encoded = new TextEncoder().encode(jsonString); // => Uint8Array
        const compressed = pako.deflate(encoded);
        return compressed; 
    }
    chunkLoad()
    {
        const chunkLoadLimit = 8;
        const chunkZ = Math.floor(yawObject.position.z/16)
        const chunkX = Math.floor(yawObject.position.x/16)  
        const nBound = chunkZ - chunkLoadLimit;
        const sBound = chunkZ + chunkLoadLimit;
        const wBound = chunkX - chunkLoadLimit;
        const eBound = chunkX + chunkLoadLimit;    
        for(const [key, VoxChunk] of this.chunks)
        {
            const [x,y,z] =  key.split(',').map(Number);
            const mesh = VoxChunk.meshData as THREE.Mesh;
            if(x<wBound||x>eBound||y<nBound||y>sBound)
            {
                VoxChunk.destroyMesh(scene);
                this.updateChunkMeshes();//rerender the dirty stuff
                //call the world generator method here if you're loading uncached chunks
                //unloaded chunks will get sent to the save system
                //determine whether you needa rerender or
                //if the chunk has been flagged dirty make sure its saved in memory or saved to a save file
                if(VoxChunk.dirty)
                {
                    this.getOrCreateChunk(x,y,z)
                    //recreate it
                    //this will handle actual new chunks so no regeneration of chunks
                    //save it in memory or smth here
                }
            }
            
        }
        for(let x =  wBound; x<eBound; x++)
        {
            for(let z =  nBound; z<sBound; z++)
            {
                const stringCords = `${x},${z}`
                if(!chunkMeshMap.has(stringCords))
                {

                    const y = 1;
                    const rewrite = new VoxelChunk(x,y,z);
                    rewrite.data = new Uint8Array(16*16*16);
                    this.generateChunkMesh(rewrite);
                    rewrite.returnMesh();   
                }
            }
        }

    }
    maybeLoadChunks()
    {
        const chunkX = Math.floor(yawObject.position.x / 16);
        const chunkZ = Math.floor(yawObject.position.z / 16);

        if (chunkX !== lastChunkX || chunkZ !== lastChunkZ) {
            this.chunkLoad();
            lastChunkX = chunkX;
            lastChunkZ = chunkZ;
        }        
    }

}

//air =  null or 0 
//put smth that reads from the biomeObjLookup and returns the specified primary blocks and other composing blocks of it
//some biomes might have unique generation parameters in the noise function
//put those in there

//basic idea for world gen
//first generate a default height map
//not too many outliers in terms of sudden rises and drops just a really small change in eleavtiojnm
//this will act as the template for the other stuff to operate off of
//determine whether the area is water or land
//if its water dw about it too much besides temperature
//land is dependent on humidity and temperature values
//those will range widely and ahve different biomes
//for example high humidity, high temp = jungle 
//most notable feature is the amount of trees and stuff
//for cave generation determine if a chunk is a valid candidate for a worm to be placed there
//if the worm is placed let it tunnel thru the chunk until its next target is in another chunk. 
//maintain the position the worm will be in in the new chunk
//since the neighboring chunks will be loaded the worm can continue tunneling until the limits set are met
//for stuff like ravines use 3d noise
//for stuff like quifers do some weird stuff with 3d noise
//trees are based on branching off of trunks
//the branches will contaion radial leaves
//for coasts just use a threshold value for the

//basic idea
//abstract the mesh and the block data into its own class
//have a thingie to manage said chunks
//the manager can determine what block is in the chunk
//if the block is in the chunk then move it into 



import { BIOMES } from "./biome";
import type { Biome, BiomeName } from './biome';
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

    getBiomeAt(x: number, z: number): Biome {
        // Scale coordinates to get appropriate biome sizes
        const scale = 0.01;
        const xScaled = x * scale;
        const zScaled = z * scale;
        
        // Get base noise values (normalized to -1..1)
        const continentalness = this.continentalnessNoise.octaveNoise(
            xScaled, zScaled, 
            4, 0.5, 1.0, 1.0, 2.0, 
            this.continentalnessNoise.simplex
        );
        
        const temperature = this.temperatureNoise.octaveNoise(
            xScaled, zScaled, 
            3, 0.5, 1.0, 1.0, 2.0, 
            this.temperatureNoise.simplex
        );
        
        const humidity = this.humidityNoise.octaveNoise(
            xScaled, zScaled, 
            3, 0.5, 1.0, 1.0, 2.0, 
            this.humidityNoise.simplex
        ) * Math.sign(temperature); // Cold reduces humidity
        
        // Find matching biome
        for (const biomeName in BIOMES) {
            const biome = BIOMES[biomeName as BiomeName];
            
            if (continentalness >= biome.continentalness[0] && 
                continentalness <= biome.continentalness[1] &&
                temperature >= biome.temperature[0] && 
                temperature <= biome.temperature[1] &&
                humidity >= biome.humidity[0] && 
                humidity <= biome.humidity[1]) {
                return biome;
            }
        }
        
        // Default to plains if no biome matches perfectly
        return BIOMES.plains;
    }

    getTerrainHeightAt(x: number, z: number): number {
        const biome = this.getBiomeAt(x, z);
        
        // Large scale terrain shape
        const baseShape = this.continentalnessNoise.octaveNoise(
            x * 0.005, z * 0.005, 
            6, 0.5, 1.0, 1.0, 2.0, 
            this.continentalnessNoise.simplex
        );
        
        // Medium scale details
        const mediumDetails = this.detailNoise.octaveNoise(
            x * 0.02, z * 0.02, 
            4, 0.5, 0.3, 1.0, 2.0, 
            this.detailNoise.simplex
        );
        
        // Small scale details
        const smallDetails = this.detailNoise.octaveNoise(
            x * 0.1, z * 0.1, 
            2, 0.5, 0.1, 1.0, 2.0, 
            this.detailNoise.simplex
        );
        
        // Combine all noise layers
        let height = baseShape * 0.7 + mediumDetails * 0.2 + smallDetails * 0.1;
        
        // Normalize to 0..1
        height = (height + 1) / 2;
        
        // Apply biome-specific height adjustments
        height = biome.baseHeight + (height - 0.5) * biome.heightVariation;
        
        // Scale to world height (assuming 0-256 range)
        return Math.floor(height * 256);
    }

    generateChunk(chunkX: number, chunkZ: number): number[][][] {
        const chunkSize = 16;
        const worldHeight = 256;
        const chunkBlocks: number[][][] = [];
        
        // Generate blocks for each column in the chunk
        for (let x = 0; x < chunkSize; x++) {
            chunkBlocks[x] = [];
            for (let z = 0; z < chunkSize; z++) {
                const worldX = chunkX * chunkSize + x;
                const worldZ = chunkZ * chunkSize + z;
                
                const biome = this.getBiomeAt(worldX, worldZ);
                const surfaceHeight = this.getTerrainHeightAt(worldX, worldZ);
                
                chunkBlocks[x][z] = [];
                for (let y = 0; y < worldHeight; y++) {
                    if (y === 0) {
                        // Bedrock layer
                        chunkBlocks[x][z][y] = this.getBlockId(biome.blockTypes.bedrock);
                    } else if (y < surfaceHeight - 4) {
                        // Stone layer
                        chunkBlocks[x][z][y] = this.getBlockId("stone");
                    } else if (y < surfaceHeight - 1) {
                        // Subsurface layer
                        chunkBlocks[x][z][y] = this.getBlockId(biome.blockTypes.subsurface);
                    } else if (y < surfaceHeight) {
                        // Surface layer
                        chunkBlocks[x][z][y] = this.getBlockId(biome.blockTypes.surface);
                    } else if (y < 64 && biome.name === "ocean" || biome.name === "river") {
                        // Water for ocean/river biomes
                        chunkBlocks[x][z][y] = this.getBlockId("water");
                    } else {
                        // Air
                        chunkBlocks[x][z][y] = 0; // Assuming 0 is air
                    }
                }
            }
        }
        
        return chunkBlocks;
    }

    private getBlockId(blockName: string): number {
        // This would map block names to numeric IDs
        // Implement your own block registry here
        const blockRegistry: Record<string, number> = {
            "air": 0,
            "stone": 1,
            "grass_block": 2,
            "dirt": 3,
            "sand": 4,
            "water": 5,
            "snow_block": 6,
            "sandstone": 7
        };
        
        return blockRegistry[blockName] || 0;
    }

    generateRivers(chunkX: number, chunkZ: number, heightmap: number[][]): number[][] {
        const chunkSize = 16;
        const riverMap: number[][] = Array(chunkSize).fill(0).map(() => Array(chunkSize).fill(0));
        
        for (let x = 0; x < chunkSize; x++) {
            for (let z = 0; z < chunkSize; z++) {
                const worldX = chunkX * chunkSize + x;
                const worldZ = chunkZ * chunkSize + z;
                
                // River noise - creates winding paths
                const riverValue = this.humidityNoise.octaveNoise(
                    worldX * 0.01, worldZ * 0.01,
                    3, 0.5, 1.0, 1.0, 2.0,
                    this.humidityNoise.simplex
                );
                
                // Threshold for river generation
                if (Math.abs(riverValue) < 0.1) {
                    riverMap[x][z] = 1; // Mark as river
                    // Lower the height for river beds
                    heightmap[x][z] = Math.max(40, heightmap[x][z] - 5);
                }
            }
        }
        
        return riverMap;
    }

    decorateChunk(chunkBlocks: number[][][], biome: Biome, chunkX: number, chunkZ: number) {
        const chunkSize = 16;
        
        for (let x = 0; x < chunkSize; x++) {
            for (let z = 0; z < chunkSize; z++) {
                const worldX = chunkX * chunkSize + x;
                const worldZ = chunkZ * chunkSize + z;
                const surfaceY = this.findSurfaceY(chunkBlocks, x, z);
                
                if (surfaceY <= 0) continue;
                
                // Tree generation in forest biome
                if (biome.name === "forest" && 
                    this.lcg() % 100 < 2 && 
                    chunkBlocks[x][z][surfaceY] === this.getBlockId("grass_block")) {
                    
                    // Generate a simple tree
                    const treeHeight = 4 + this.lcg() % 3;
                    for (let y = 1; y <= treeHeight; y++) {
                        if (surfaceY + y < chunkBlocks[0][0].length) {
                            chunkBlocks[x][z][surfaceY + y] = this.getBlockId("oak_log");
                        }
                    }
                    
                    // Add leaves
                    for (let ly = treeHeight - 1; ly <= treeHeight + 1; ly++) {
                        for (let lx = -2; lx <= 2; lx++) {
                            for (let lz = -2; lz <= 2; lz++) {
                                if ((lx !== 0 || lz !== 0) && 
                                    x + lx >= 0 && x + lx < chunkSize &&
                                    z + lz >= 0 && z + lz < chunkSize &&
                                    surfaceY + ly < chunkBlocks[0][0].length) {
                                    chunkBlocks[x + lx][z + lz][surfaceY + ly] = this.getBlockId("oak_leaves");
                                }
                            }
                        }
                    }
                }
                
                // Desert features
                if (biome.name === "desert" && this.lcg() % 100 < 1) {
                    // Generate cactus
                    const cactusHeight = 1 + this.lcg() % 2;
                    for (let y = 1; y <= cactusHeight; y++) {
                        if (surfaceY + y < chunkBlocks[0][0].length) {
                            chunkBlocks[x][z][surfaceY + y] = this.getBlockId("cactus");
                        }
                    }
                }
            }
        }
    }

    private findSurfaceY(chunkBlocks: number[][][], x: number, z: number): number {
        for (let y = chunkBlocks[0][0].length - 1; y >= 0; y--) {
            if (chunkBlocks[x][z][y] !== this.getBlockId("air") && 
                chunkBlocks[x][z][y] !== this.getBlockId("water")) {
                return y;
            }
        }
        return -1;
    }
}

const maxReach = 8;

function voxelRayCast(direction:THREE.Vector3):VoxelRayInfo
{
    const origin = yawObject.position;
    const pos = yawObject.position.clone().floor(); //go to a whole int closest
    yawObject.getWorldDirection(direction);
    //current player cords
    const step = new THREE.Vector3(
        Math.sign(direction.x),
        Math.sign(direction.y),
        Math.sign(direction.z)
    )//get the direction vector 
    const tDelta =  new THREE.Vector3(
        Math.abs(1 / direction.x),
        Math.abs(1 / direction.y),
        Math.abs(1 / direction.z)
    )//ray cost in an axis
    const next = new THREE.Vector3(
            (step.x > 0 ? 1 - (origin.x - pos.x) : (origin.x - pos.x)) * tDelta.x,
            (step.y > 0 ? 1 - (origin.y - pos.y) : (origin.y - pos.y)) * tDelta.y,
            (step.z > 0 ? 1 - (origin.z - pos.z) : (origin.z - pos.z)) * tDelta.z
    );
    let distanceTraveled = 0;

    while(distanceTraveled<maxReach)
    {
        if(chunkManager.getVoxel(pos.x, pos.y, pos.z))
        {
        return {
            hit:true,
            position:pos.clone(),
            distance:distanceTraveled,
        }
        }
        if (next.x < next.y && next.x < next.z) {
            pos.x += step.x;
            distanceTraveled = next.x;
            next.x += tDelta.x;
        } else if (next.y < next.z) {
            pos.y += step.y;
            distanceTraveled = next.y;
            next.y += tDelta.y;
        } else {
            pos.z += step.z;
            distanceTraveled = next.z;
            next.z += tDelta.z;
        }
    }
    return { hit: false }
    //fix this 
}
interface VoxelRayInfo 
{
    hit:boolean;
    position?:THREE.Vector3;
    distance?:number;
}

//
const blocksMaterial = new THREE.MeshStandardMaterial({map:texture0,side: THREE.DoubleSide, metalness:0.2, roughness:0.8})

//entity initiliazing

//


let chunkManager:ChunkManager;
function animate()
{
    stats.begin();
    const delta = (performance.now()-currentTime)/1000;
    currentTime = performance.now()
    //check if chunk loading is necsary
    chunkManager.maybeLoadChunks();
    updateSun();
    updateDebug();
    renderer.render(scene, camera);
    stats.end();
    requestAnimationFrame(animate);
};
function init()
{
    if (canvasContainer.value && !canvasContainer.value.hasChildNodes()) {
        canvasContainer.value.appendChild(renderer.domElement);
    }
    chunkManager =  new ChunkManager();

    requestAnimationFrame(animate);
}
onMounted(()=>
{
    init();
})
</script>

<style scoped>

</style>