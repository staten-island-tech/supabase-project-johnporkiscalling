<template>
  <div ref="canvasContainer" class="scene-container"></div>
  <div class="debugScreen">
    {{ coordinates }}
  </div>
</template>

<script setup lang="ts">


import { onMounted, ref } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import Stats from 'stats.js';
import { util3d } from './utils';    
import { Noise } from './noisefunct';
import { configurationInfo } from './config';
import { faceDirections } from './stupidlylongvariables';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

const seed = 121214141414124;
const noiseMachine =  new Noise(seed);
const layer1 =  new Noise(seed+1);
const layer2 =  new Noise(seed+2);






const stats = new Stats();
document.body.appendChild(stats.dom);
const coordinates =  ref("SOMETHING");
const freq = .002;
const amp = .1;
const pers = .5;
const eta = 0.00001;
const scale = 1;
const octaves = 8;
const lacunarity = 2;

const textureLoader = new THREE.TextureLoader();
const canvasContainer = ref<HTMLElement | null>(null)    
let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls, lod:THREE.LOD;
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2048);
const chunkMeshes:Map<string, THREE.Mesh> = new Map();
let lastChunkX = Infinity, lastChunkZ = Infinity;
const pitchObject = new THREE.Object3D(); 
const yawObject = new THREE.Object3D();  
yawObject.add(pitchObject);
pitchObject.add(camera);
yawObject.position.set(0, 0,0);
scene.add(yawObject);
renderer = new THREE.WebGLRenderer({ antialias: false });
const canvas = renderer.domElement;

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
  const sensitivity = 0.002;

  yaw -= event.movementX * sensitivity;
  pitch -= event.movementY * sensitivity;
  const maxPitch = Math.PI / 2 - 0.01;
  pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));

  yawObject.rotation.y = yaw;
  pitchObject.rotation.x = pitch;
}

const keys:Record<string, boolean> = {}
window.addEventListener("keydown", (event)=>
{
  keys[event.key.toLowerCase()] = true;
})
window.addEventListener("keyup", (event)=>
{
  keys[event.key.toLowerCase()] = false;
})
const moveSpeed = 5;
function updateDebug()
{
  coordinates.value =  `
  Position:
  ${Math.round(yawObject.position.x).toString()},
  ${Math.round(yawObject.position.y).toString()},
  ${Math.round(yawObject.position.z).toString()}
  `;
}
const delta = [];
const currentFov = 75;
const sprintFov = currentFov + 25;
const adjustmentSpeed = 0.1; 

let sky:Sky
const light = new THREE.DirectionalLight(0xffffff, 1);
let sun = new THREE.Vector3();
function init() {
    camera.position.set(0, 0, 0);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (canvasContainer.value && !canvasContainer.value.hasChildNodes()) {
        canvasContainer.value.appendChild(renderer.domElement);
    }
    newPlayer =   new Player(new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0), 75);
    lod =  new THREE.LOD();
    scene.add(lod);
    scene.add(light);
    sky = new Sky();
    sky.scale.setScalar(10000); // Large enough to surround your scene
    scene.add(sky);
    const skyUniforms = sky.material.uniforms;
    skyUniforms['turbidity'].value = 4;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.00005;
    skyUniforms['mieDirectionalG'].value = 0.8;
    console.log(skyUniforms)
    requestAnimationFrame(animate);
}
function animate() 
{
    const delta = (performance.now()-currentTime)/1000;
    currentTime = performance.now()
    maybeLoadChunks();
    updateDebug();
    newPlayer.updatePosition(delta);
    stats.begin();
    renderer.render(scene, camera);
    stats.end();
    time += 0.0001; // Adjust for speed
    if (time > 1) time = 0;

    // Map time to elevation (sun height)
    const elevation = Math.sin(time * 2 * Math.PI) * 90;
    const azimuth = 180 + Math.cos(time * 2 * Math.PI) * 90;
    const dirvector = new THREE.Vector3();
    yawObject.getWorldPosition(dirvector);
    const info = voxelRayCast(dirvector);
    updateSun(elevation, azimuth);
    if(info.hit == true)
    {
      const block = info.position as THREE.Vector3;
      modifyChunk([block?.x, block?.y, block?.z]);
      console.log("HIT")
    }

    requestAnimationFrame(animate);
}




function updateSun(elevation:number, azimuth:number) {
  const phi = THREE.MathUtils.degToRad(90 - elevation);
  const theta = THREE.MathUtils.degToRad(azimuth);

  sun.setFromSphericalCoords(1, phi, theta);

  sky.material.uniforms['sunPosition'].value.copy(sun);
  light.position.copy(sun);
}
let time = 0;

function maybeLoadChunks() {
    const chunkX = Math.floor(yawObject.position.x / 16);
    const chunkZ = Math.floor(yawObject.position.z / 16);

    if (chunkX !== lastChunkX || chunkZ !== lastChunkZ) {
        chunkLoader();
        lastChunkX = chunkX;
        lastChunkZ = chunkZ;
    }
}
interface chunkData { 
  blockData : Array<number>;
}
const chunkDataMap:Map<string, chunkData> =  new Map();
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
    if(getVoxel([pos.x, pos.y, pos.z])==true)
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


const dirtyChunks:Set<string> =  new Set();
function reRender()
{
  for(const chunk of dirtyChunks)
  {
    //call a function here to rerender  stuff

  }
}
let lastChunkY = 0;
function getVoxel(wCords:Array<number>)
{
  //calculate the chunk cords and use that to retrieve the chunk data
  //then convert the wCords to chunk-relative cords.
  //finally acess the array thru the chunk-relative cords
  const {chunkCords, localCords }= gtlCords(...wCords as [number, number, number]);
  const chunk = chunkDataMap.get(`${chunkCords[0]},${chunkCords[1]},${chunkCords[2]}`);
  const block = chunk?.blockData[localCords[0] + 16 * (localCords[1] + 16 * localCords[2])]?true:false;
  return block;
}//only concerned about whether the block itsef exists or not
//
function gtlCords(wX:number, wY:number, wZ:number)
{
  const cX = Math.floor(wX/16);
  const cY = Math.floor(wY/16);
  const cZ = Math.floor(wZ/16);
  const chunkCords = [cX, cY, cZ];
  const lX =  wX%16;
  const lY =  wY%16;
  const lZ =  wZ%16;
  const localCords = [lX, lY, lZ];
  return { chunkCords, localCords};
}
function modifyChunk(wCords:Array<number>)
{
  const wCordVector = new THREE.Vector3(...wCords as [number, number, number]);
  const {chunkCords, localCords }= gtlCords(...wCords as [number, number, number]);
  dirtyChunks.add(`${chunkCords[0]},${chunkCords[1]},${chunkCords[2]}`);
  const highlightPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color: 0xffff00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    })
  );
  highlightPlane.position.copy(wCordVector);
  scene.add(highlightPlane);
  //apply a box on top of it 
}

function chunkLoader()
{
  const chunkLoadLimit = 8;
  const chunkZ = Math.floor(yawObject.position.z/16)
  const chunkX = Math.floor(yawObject.position.x/16)  
  const nBound = chunkZ - chunkLoadLimit;
  const sBound = chunkZ + chunkLoadLimit;
  const wBound = chunkX - chunkLoadLimit;
  const eBound = chunkX + chunkLoadLimit;
  for(const [key, mesh] of chunkMeshes.entries())
  {
    const [x,y] =  key.split(',').map(Number);
    if(x<wBound||x>eBound||y<nBound||y>sBound)
    {
      scene.remove(mesh);
      mesh.geometry.dispose();
      chunkMeshes.delete(key);
    }
  }
  for(let x =  wBound; x<eBound; x++)
  {
      for(let z =  nBound; z<sBound; z++)
      {
          const stringCords = `${x},${z}`
          if(!chunkMeshes.has(stringCords))
          {
            const chunkTest =  new WorldChunk([x,z]);
            chunkTest.createChunk();
            const {buffer, UVs, indices, vertices} = chunkTest.returnData();
            chunkTest.destroy();
            const mesh = new THREE.Mesh(buffer, blocksMaterial)
            mesh.receiveShadow = true;
            mesh.castShadow =  true;
            scene.add(mesh);       
            chunkMeshes.set(stringCords, mesh);
          }

      }
  }
}
let currentTime =  performance.now();
let newPlayer:Player

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
const blocksMaterial = new THREE.MeshBasicMaterial({map:texture0,side: THREE.DoubleSide, vertexColors:true})
const blockUVs:Record<string,Array<number>> = {
  top: util3d.getUVCords('minecraft:block/grass_block_top'),
  right: util3d.getUVCords('minecraft:block/grass_block_side'),
  left: util3d.getUVCords('minecraft:block/grass_block_side'),
  front: util3d.getUVCords('minecraft:block/grass_block_side'),
  back: util3d.getUVCords('minecraft:block/grass_block_side'),
  bottom: util3d.getUVCords('minecraft:block/dirt'),
  desert: util3d.getUVCords('minecraft:block/sand'),
  badland: util3d.getUVCords('minecraft:block/red_sand'),
  stone: util3d.getUVCords('minecraft:block/stone'),
  purp: util3d.getUVCords('minecraft:block/amethyst_block'),
  green: util3d.getUVCords('minecraft:block/green_concrete')
};

class Entity
{
  boundingBox:THREE.Box3
  entityType:string
  id:number
  entitySize:THREE.Vector3
  entityPosition:THREE.Vector3
  entityVelocity:THREE.Vector3;
  worldBoundingBox:THREE.Box3;
  toggledBox:boolean;
  boxHelper?:THREE.Box3Helper
  constructor(entityType:string, entitySize:THREE.Vector3)
  {
    this.id = 1;
    this.entityType = entityType
    this.entitySize = entitySize;
    this.entityPosition = new THREE.Vector3;
    const max = new THREE.Vector3(this.entitySize.x/2, this.entitySize.y/2, this.entitySize.z/2)
    const min = new THREE.Vector3(-this.entitySize.x/2, -this.entitySize.y/2, -this.entitySize.z/2)
    this.boundingBox = new THREE.Box3(min, max);
    this.worldBoundingBox =  new THREE.Box3();
    this.worldBoundingBox.copy(this.boundingBox);
    this.entityVelocity =  new THREE.Vector3;
    this.toggledBox = false;

  }
  checkCollision(box:THREE.Box3)
  {
    if(this.worldBoundingBox.intersectsBox(box))
    {


      return true;
    }
    return false;
  }
  toggleHitbox()
  {   
    this.toggledBox = !this.toggledBox;
    if(this.toggledBox)
    {
      const boxHelper = new THREE.Box3Helper(this.worldBoundingBox, 0x000000);
      this.boxHelper = boxHelper;
      scene.add(boxHelper);
      return
    }
    scene.remove(this.boxHelper as THREE.Box3Helper);
  }
  updateBound()
  {
    //corners of the bounding boxes defined by a given size dimension vector
    this.worldBoundingBox.copy(this.boundingBox);
    this.worldBoundingBox.min.add(this.entityPosition);
    this.worldBoundingBox.max.add(this.entityPosition);
  }
  updatePosition(delta:number)
  {
    //trigger when velocity changes 
    //call the handleIntersect to check for possible intersections
    //if intersection does occur position gets set to smwhere where it dont intersect
  }
  handleIntersect(box:THREE.Box3)
  {
    if(this.worldBoundingBox.intersectsBox(box))
    {
      //set the position of the entity to above the block so they dont collide
    } 
  }
}
class Mob extends Entity
{
  agroLevel:number
  constructor()
  {
    super("id", new THREE.Vector3(1,1,1))
    this.agroLevel = 0;
  }
  manageAgro()
  {
    //conditions for agro
    //target entities in range =  agro up
    //higher agro = targets the target mob
    //must meet a certain agro threshold
  }
  targetAgro()
  {
    //system to find the nearest target and pathfind to it
  }
}

let verticalVelocity = 0;
const gravity = -19.6;
const jumpStrength = 10;
let isOnGround = true;
const groundLevel = 2.5;

class Player extends Entity
{
  position:THREE.Vector3;
  velocity:THREE.Vector3;
  fov:number;
  fovMultiplier:number;
  constructor(position:THREE.Vector3, velocity:THREE.Vector3, fov:number)
  {
    super("test", new THREE.Vector3(1,1,1));
    this.position = position;
    this.velocity =  velocity;
    this.fov =  75;
    this.fovMultiplier = 1.3;
  }
  getBoundingBox():THREE.Box3
  { 
    const min =  new THREE.Vector3();
    const max = new THREE.Vector3();
    return new THREE.Box3(
      min, max
    )
  }
  checkPosition()
  {
    this.getBoundingBox();

  }
  updatePosition(delta:number)
  {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward).normalize();
    forward.y = 0; 
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();
    if(!keys["w"]){
      if(camera.fov>currentFov)
      {
        camera.fov-=(camera.fov-this.fov)*0.1;
        camera.updateProjectionMatrix();
      }
    }
    if (keys["w"]) { 
      if(camera.fov<sprintFov)
      {
        camera.fov+=(this.fov*this.fovMultiplier-camera.fov)* adjustmentSpeed;
        camera.updateProjectionMatrix();
      }
      yawObject.position.add(forward.clone().multiplyScalar(moveSpeed * delta))
    };
    if (keys["s"]) yawObject.position.add(forward.clone().multiplyScalar(-moveSpeed * delta));
    if (keys["a"]) yawObject.position.add(right.clone().multiplyScalar(-moveSpeed * delta));
    if (keys["d"]) yawObject.position.add(right.clone().multiplyScalar(moveSpeed * delta));
    if (keys[" "] && isOnGround) {
      verticalVelocity = jumpStrength;
      isOnGround = false;
    }
    verticalVelocity += gravity * delta;
    // Update Y position
    yawObject.position.y += verticalVelocity * delta;
    // Check ground collision (very basic, replace with your terrain or collision logic)
    if (yawObject.position.y <= groundLevel) {
      yawObject.position.y = groundLevel;
      verticalVelocity = 0;
      isOnGround = true;
    }
  }

  checkMovement(delta:number)
  {

  }
}
class BiomeCache
{
  cache:Map<string, Array<Array<number>>>
  constructor()
  {
    this.cache = new Map();
  }
  multiChunkBiomes(cX:number, cZ:number)
  {
    const biomeValues = [];
    for(let x = -1; x<2; x++) //range of cCords from  -1 to 1
    {
      for(let z = -1; z<2; z++)
      {
        //check if the item exists in the cache if not call the function to generate the chunk biomes
        const serializedcCords = `${cX},${cZ}`;
        const possibleCache = this.cache.get(serializedcCords);
        if(possibleCache)
        {
          biomeValues.push(possibleCache);
          continue;
        }
        const chunkBiome = this.generateChunkBiomes(cX+x, cZ+z);
        this.cache.set(serializedcCords, chunkBiome)
        //set the value to the serialized cCords
      }
    }
    return biomeValues; 
  }
  generateChunkBiomes(cX:number, cZ:number):Array<Array<number>>
  {
    const chunkData = [];
    for(let x = 0; x<16;x++)
    {
      const row = []
      for(let z = 0; z<16; z++)
      {
        row.push(this.biomeSelect(cX+x, cZ+z));
      }
      chunkData.push(row);
    }
    return chunkData;
  }
  biomeSelect(x:number, z:number):number
  {
    const continentalness = noiseMachine.octaveNoise(
                (x + eta) * scale,
                (z + eta) * scale,
                octaves,
                pers,
                amp,
                freq,
                lacunarity,
                noiseMachine.simplex.bind(noiseMachine)
                )
    const temperature = layer1.octaveNoise(                
                (x + eta) * scale,
                (z + eta) * scale,
                octaves,
                pers,
                amp,
                freq,
                lacunarity,
                layer1.simplex.bind(layer1)
              )
    const humidity = layer2.octaveNoise(                
                (x + eta) * scale,
                (z + eta) * scale,
                octaves,
                pers,
                amp,
                freq,
                lacunarity,
                layer2.simplex.bind(layer2)
              )
    

    
    return 1;
  }
}
const biomesAndTerrain = [
  // Original entries
  "plains", "mountain", "beach", "desert", "forest", "cold", "valley", "canyon", "jungle",
  
  // Additional biomes
  "tundra", "taiga", "savanna", "wetlands", "marsh", "swamp", "bog", 
  "grassland", "steppe", "prairie", "badlands", "mesa", "plateau",
  "rainforest", "bamboo_forest", "mangrove", "mushroom_fields",
  "ice_spikes", "frozen_ocean", "deep_ocean", "coral_reef",
  
  // Fantasy/magical biomes
  "enchanted_forest", "magic_grove", "crystal_caves", "floating_islands",
  "volcanic_wasteland", "obsidian_fields",
  
  // Terrain features
  "cliffs", "dunes", "fjord", "glacier", "geyser_field", "hot_springs",
  "lava_lakes", "salt_flats", "sandstone_pinnacles", "karst_landscape",
  "underground_rivers", "sinkholes", "cenotes", "oasis",
  
  // Water-related
  "river", "delta", "estuary", "lagoon", "atoll", "archipelago",
  "fjord", "bayou", "tidal_zone", "kelp_forest",
  
  // Special features
  "petrified_forest", "rainbow_hills", "slot_canyons", "pillar_clusters",
  "glowshroom_caverns", "bioluminescent_bays", "magnetic_hills"
];
function sampleBiome(x:number, y:number)
{
  //for biome generation
  //volcanoes =  generate a heightmap that has only peaks with no dips so Math.abs() all the values
  //for the parameters to generate the noise map for the volcano zoom out the values
  //find the max number in the noise map 
  //use that thing to create a cone area around the highest point
  //add some variation to it using some prng function
  //add a bias for the max number towards the center of the noise map  
  


  //for mountains just raise the function output to a power to prevent dips
  //plains = low frequency value
  //valleys and carved terrain strucutres = use 3d noise or a carver
  //mountains = DLA if i can figure it out and make it viable as an option
  //rivers and lakes and stuff 
  //3d noise or carver again
  //trees and grass are gonna be determined by another noise function
  //for mesa/badland biomes rase the noise value to an even power to ensure 0 dips and exagerated shapes 
  //apply a function that changes the bands of terracota to a certain color at a given y level
  //for glaciers biome have a high erosion value aka higher octaves/lacunarity
  //causes more holes to show up 
  //floating islands will prob just be selected by applying a noise function and then selectively selecting the value towards which the noise function values aggregate towards most commonly
  //add a bit of detail by putting random stuff and then extend thhe bottom with some function
  //for hotsprings same thing as mesa where you raise the noise functiokn value output to even power to prevent negative values
  //then restrict the height of the terrain generated to a given value and carve a hole in the center of it to mimic a geyser/hot srpign
}
const aoOffsets: Record<string, Array<[number[], number[], number[]]>> = {
  top: [
    [[-1, 0, 0], [0, 0, -1], [-1, 0, -1]],  // Top-left corner
    [[1, 0, 0], [0, 0, -1], [1, 0, -1]],    // Top-right corner
    [[1, 0, 0], [0, 0, 1], [1, 0, 1]],      // Bottom-right corner
    [[-1, 0, 0], [0, 0, 1], [-1, 0, 1]],    // Bottom-left corner
  ],
  bottom: [
    [[-1, 0, 0], [0, 1, 0], [-1, 1, 0]],    // Note: Y offset is +1 for bottom face
    [[1, 0, 0], [0, 1, 0], [1, 1, 0]],
    [[1, 0, 0], [0, 1, 0], [1, 1, 0]],
    [[-1, 0, 0], [0, 1, 0], [-1, 1, 0]],
  ],
  left: [
    [[0, -1, 0], [0, 0, -1], [0, -1, -1]],
    [[0, 1, 0], [0, 0, -1], [0, 1, -1]],
    [[0, 1, 0], [0, 0, 1], [0, 1, 1]],
    [[0, -1, 0], [0, 0, 1], [0, -1, 1]],
  ],
  right: [
    [[0, -1, 0], [0, 0, 1], [0, -1, 1]],
    [[0, 1, 0], [0, 0, 1], [0, 1, 1]],
    [[0, 1, 0], [0, 0, -1], [0, 1, -1]],
    [[0, -1, 0], [0, 0, -1], [0, -1, -1]],
  ],
  front: [
    [[-1, 0, 0], [0, -1, 0], [-1, -1, 0]],
    [[1, 0, 0], [0, -1, 0], [1, -1, 0]],
    [[1, 0, 0], [0, 1, 0], [1, 1, 0]],
    [[-1, 0, 0], [0, 1, 0], [-1, 1, 0]],
  ],
  back: [
    [[1, 0, 0], [0, -1, 0], [1, -1, 0]],    // Flipped for back face
    [[-1, 0, 0], [0, -1, 0], [-1, -1, 0]],
    [[-1, 0, 0], [0, 1, 0], [-1, 1, 0]],
    [[1, 0, 0], [0, 1, 0], [1, 1, 0]],
  ],
};
class WorldChunk
{
  cCords:Array<number>
  buffer:THREE.BufferGeometry;
  vertices:Array<number>
  indices:Array<number>
  UVs:Array<number>;
  offset:number;
  chunkData:Array<number>;
  colors:Array<number>;
  currentLocalHeightMap:Array<Array<number>>;
  constructor(cCords:Array<number>) 
  {
    this.cCords = cCords
    this.buffer = new THREE.BufferGeometry();
    this.vertices = [];
    this.indices = [];
    this.UVs = [];
    this.offset = 0;
    this.chunkData = [];
    this.colors = [];
    this.currentLocalHeightMap = [];
  }
  isSolid(x: number, y: number, z: number): boolean {
  // Assuming `currentLocalHeightMap` is 18x18 and covers (1..16)
  const localX = x - (this.cCords[0] * configurationInfo.chunkSize) + 1;
  const localZ = z - (this.cCords[1] * configurationInfo.chunkSize) + 1;

  // Clamp and check height
  if (localX < 0 || localX >= 18 || localZ < 0 || localZ >= 18) return false;
  const height = this.currentLocalHeightMap[localX][localZ];
  return y <= height; // True if this block is inside the terrain
}

computeAO(x: number, y: number, z: number, dir: string): number[] {
  const ao = [];
  const neighbors = aoOffsets[dir];
  if (!neighbors) return [1, 1, 1, 1];

  for (let i = 0; i < 4; i++) {
    const [side1, side2, corner] = neighbors[i];
    const side1Solid = this.isSolid(x + side1[0], y + side1[1], z + side1[2]);
    const side2Solid = this.isSolid(x + side2[0], y + side2[1], z + side2[2]);
    const cornerSolid = this.isSolid(x + corner[0], y + corner[1], z + corner[2]);

    // Improved AO calculation
    let occlusion = 0;
    if (side1Solid) occlusion += 1;
    if (side2Solid) occlusion += 1;
    if (cornerSolid && (side1Solid || side2Solid)) occlusion += 1;

    // Smoother brightness calculation
    const brightness = 1.0 - (occlusion * 0.2);
    ao.push(Math.max(0.3, Math.min(1.0, brightness))); // Clamp between 0.3 and 1.0
  }

  return ao;
}

  createheights(x: number, z: number): Array<Array<number>> {
    const cX = x * configurationInfo.chunkSize;
    const cZ = z * configurationInfo.chunkSize;
    return Array.from({ length: 18 }, (_, x) =>
            Array.from({ length: 18 }, (_, z) =>
        Math.floor(Math.pow((
                noiseMachine.octaveNoise(
                (x + cX + eta - 1) * scale,
                (z + cZ + eta - 1) * scale,
                octaves,
                pers,
                amp,
                freq,
                lacunarity,
                noiseMachine.simplex.bind(noiseMachine)
                )
            ), 4) * 200)
            )
        );
  }
  createChunk() {
      const heights: Array<Array<number>> = this.createheights(this.cCords[0], this.cCords[1]);
      this.currentLocalHeightMap = heights;
      const cX = this.cCords[0] * configurationInfo.chunkSize;
      const cZ = this.cCords[1] * configurationInfo.chunkSize;
      const biome = 1;//get the biome value here
      const biomeConditions = [] //look at tthe biomereference for the conditions for the biome
      const noiseParamters = [];//get the noise parameters from biomeReference
      const primaryBlockType = [];
      const secondaryBlockType = [];
      const tertiaryBlockType = [];
      const features = [];//couple of functions here that dictate the unique features found 
      const folliage = [];//specify the folliage to be placed here like trees shrubs or flowers
      //folliage can be a seperate layer considering it generates over the chunks
      //to generate folliage just use some algorithm and cross reference the generated folliage's coordinates to determine whether that position is valid. 
      const test = Object.keys(blockUVs)[Math.floor(Math.random() * Object.keys(blockUVs).length)];
      //iterate thru it in chunks 
      let chunkData:Array<number> = [];
      let chunkMap:Map<string, Array<number>> = new Map
      for (let x = 1; x < 17; x++) {
          const coX = cX + (x - 1); 
          for (let z = 1; z < 17; z++) {
          const coZ = cZ + (z - 1);
          const height = heights[x][z];
              for (let y = height; y > configurationInfo.maxDepth; y--) {
                const blocktype = "desert"
                  const currentYChunk =  Math.floor(y/16);
                  if (y == height) {
                  this.addQuad(coX, y, coZ, "top", blocktype);
                  }
                  if (heights[x - 1][z] < y) {
                  this.addQuad(coX, y, coZ, "left", blocktype);
                  }
                  if (heights[x + 1][z] < y) {
                  this.addQuad(coX, y, coZ, "right", blocktype);
                  }
                  if (heights[x][z + 1] < y) {
                  this.addQuad(coX, y, coZ, "front", blocktype);
                  }
                  if (heights[x][z - 1] < y) {
                  this.addQuad(coX, y, coZ, "back", blocktype);
                  }
                  if(y%16 === 0) 
                  {
                    chunkDataMap.set(`${cX},${cZ}, ${currentYChunk}`, {blockData:chunkData})
                    chunkData = [];
                  }
              }
          }
      }
      this.buffer.setAttribute('position', new THREE.Float32BufferAttribute(this.vertices, 3));
      this.buffer.setAttribute('uv', new THREE.Float32BufferAttribute(this.UVs, 2));
      this.buffer.setIndex(this.indices);
      this.buffer.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
  }
  addQuad(x:number, y:number, z:number, dir:string, blockType:string)
  {
    const offSetValues = faceDirections[dir];
    const aoData =  this.computeAO(x,y,z,dir);
    this.vertices.push(
      x + offSetValues[0], y + offSetValues[1], z + offSetValues[2],
      x + offSetValues[3], y + offSetValues[4], z + offSetValues[5],
      x + offSetValues[6], y + offSetValues[7], z + offSetValues[8],
      x + offSetValues[9], y + offSetValues[10], z + offSetValues[11],
    )

    this.indices.push(this.offset, this.offset+1, this.offset+2, this.offset+2, this.offset+3, this.offset);
    const texturew = blockUVs[blockType];
    this.UVs.push(...texturew);
    this.offset+=4;
    for(let i = 0; i<4; i++)
    {
      const ao =  aoData[i];
      this.colors.push(ao, ao, ao);
    }
  }
  returnData()
  {
    return {
      buffer: this.buffer,
      UVs: this.UVs,
      indices: this.indices,
      vertices:this.vertices
    }
  }
  destroy()
  {
    this.buffer.dispose();
  }
  getChunkData()
  {
    //conver to uint8Array for num efficieny 
    return new Uint8Array(this.chunkData);
  }
  //define the whole chunks block types
  //set some rules where if the current y level =  the max height - 8 place another type of block 
}




const sound2 = new Noise(seed+1);
const sound3 = new Noise(seed+2);
const sound4 = new Noise(seed+3);
class BiomeGenerator
{
  seed:number;
  constructor(seed:number)
  { 
    this.seed = seed;
  }
  biomeGenerate(cCrds:Array<number>)
  {
    for(let x = 0; x<16; x++)
    {
      const currentX =  cCrds[0] + x;
      for(let z = 0; z<16; z++)
      {
        const currentZ =  cCrds[1] +  z;
        const continentalness  = sound2.simplex(currentX/1000, currentZ/1000);
        const temperature =  sound3.simplex(currentX/300, currentZ/300);
        const humidity =  sound4.simplex(currentX/400, currentZ/400);


      }
    }
  }
}


//use a biome noise function to determine the biomes
//use parameters set for the biome to generate the terrain values
//when generating the stuff check the refernce for the main block type in the biome
//add additional features specific to the biome


//rendering process
//first generate the chunk data like block types etc
//next
import { BitArray, Random } from './utils';
function getIndex(x:number, y:number, z:number)
{
  return x+16*(y+16*z)
}
function getXYZ(index:number, W:number, H:number) 
{
  const x = index % W;
  const y = Math.floor(index / W) % H;
  const z = Math.floor(index / (W * H));
  return [x, y, z];
}

class VoxelChunk
{
  cCords:Array<number>
  data:Uint8Array
  meshData:THREE.Mesh | null;
  offset:number;
  indices:Array<number>;
  vertices:Array<number>;
  uvs:Array<number>;
  constructor(x:number,y:number,z:number)
  {
    this.cCords = [x,y,z];
    this.data =  new Uint8Array(16*16*16);
    this.meshData =  new THREE.Mesh();
    this.offset = 0;
    this.indices = [];
    this.vertices = [];
    this.uvs = [];
  }
  getVoxel(x:number, y:number, z:number) {
    if (x < 0 || y < 0 || z < 0 || x >= 16 || y >= 16 || z >= 16) {
      return 0; // Out of bounds
    }
    const index = x + (y * 16) + (z * 16 * 16);
    return this.data[index];
  }
  setVoxel(x:number, y:number, z:number, type:number) {//the type is a numbber specified 
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
class ChunkManager
{
  chunks:Map<string, VoxelChunk>;
  dirtyChunks:Set<string>
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
    const { chunkCords, localCords } = gtlCords(x,y,z);
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
        if (localCords[0] < 0) {
      adjChunkX--;
      adjLocalX = 16 + localCords[0];
    } else if (localCords[0] >= 16) {
      adjChunkX++;
      adjLocalX = localCords[0] - 16;
    }
    
    if (localCords[1] < 0) {
      adjChunkY--;
      adjLocalY = 16 + localCords[1];
    } else if (localCords[1] >= 16) {
      adjChunkY++;
      adjLocalY = localCords[1] - 16;
    }
    
    if (localCords[2] < 0) {
      adjChunkZ--;
      adjLocalZ = 16 + localCords[2];
    } else if (localCords[2] >= 16) {
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
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        for (let z = 0; z < 16; z++) {
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
    }
  }
  updateChunkMeshes()
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
  loadSaveFile()
  {
    //loads the save file into a usuable map format for 
  }
  generateSaveFile()
  {
    //
  }
}
//when player quits the game make sure to clear all the chunk data and stuff
//




onMounted(()=>
{ 
    init();
})

</script>

<style scoped>
 .debugScreen
  {
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0,0,0,0.7);
    color: lime;
    padding: 10px;
    font-family: monospace;
    font-size: 14px;
    z-index: 1000;
  }
</style>
