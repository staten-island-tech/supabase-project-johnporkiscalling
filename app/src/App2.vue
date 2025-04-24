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
const seed = 121214141414124;
const noiseMachine =  new Noise(seed);
const layer1 =  new Noise(seed+1);
const layer2 =  new Noise(seed+2);



const stats = new Stats();
document.body.appendChild(stats.dom);
const coordinates =  ref("SOMETHING");
const freq = .002;
const amp = .2;
const pers = .5;
const eta = 0.00001;
const scale = 1;
const octaves = 4;
const lacunarity = 2;

const textureLoader = new THREE.TextureLoader();
const canvasContainer = ref<HTMLElement | null>(null)    
let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls;
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
renderer = new THREE.WebGLRenderer({ antialias: true });
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
const moveSpeed = 20;
function updateDebug()
{
  coordinates.value =  `
  Position:
  ${Math.round(yawObject.position.x).toString()},
  ${Math.round(yawObject.position.y).toString()},
  ${Math.round(yawObject.position.z).toString()}
  `;

}
const playerVars = 
{
  velocity:new THREE.Vector3(),
  onGround:false,

}
function checkJump()
{

}
const delta = [];//make delta a global variable sos it can be acessed by other stuff not just movement
function tweakMovement(delta: number) {
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward).normalize();
  forward.y = 0; 
  forward.normalize();

  const right = new THREE.Vector3();
  right.crossVectors(forward, camera.up).normalize();

  if (keys["w"]) yawObject.position.add(forward.clone().multiplyScalar(moveSpeed * delta));
  if (keys["s"]) yawObject.position.add(forward.clone().multiplyScalar(-moveSpeed * delta));
  if (keys["a"]) yawObject.position.add(right.clone().multiplyScalar(-moveSpeed * delta));
  if (keys["d"]) yawObject.position.add(right.clone().multiplyScalar(moveSpeed * delta));

}


function init() {
    camera.position.set(0, 0, 0);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (canvasContainer.value && !canvasContainer.value.hasChildNodes()) {
        canvasContainer.value.appendChild(renderer.domElement);
    }
    requestAnimationFrame(animate);
}
function maybeLoadChunks() {
    const chunkX = Math.floor(yawObject.position.x / 16);
    const chunkZ = Math.floor(yawObject.position.z / 16);

    if (chunkX !== lastChunkX || chunkZ !== lastChunkZ) {
        chunkLoader();
        lastChunkX = chunkX;
        lastChunkZ = chunkZ;
    }
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
            scene.add(mesh);       
            chunkMeshes.set(stringCords, mesh);
          }

      }
  }
}
let currentTime =  performance.now();
function animate() 
{
    const delta = (performance.now()-currentTime)/1000;
    currentTime = performance.now()
    maybeLoadChunks();
    updateDebug();
    tweakMovement(delta);
    stats.begin();

    renderer.render(scene, camera);
    stats.end();
    requestAnimationFrame(animate);
}
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
const blocksMaterial = new THREE.MeshBasicMaterial({map:texture0,side: THREE.DoubleSide})
const blockUVs:Record<string,Array<number>> = {
  top: util3d.getUVCords('minecraft:block/grass_block_top'),
  right: util3d.getUVCords('minecraft:block/grass_block_side'),
  left: util3d.getUVCords('minecraft:block/grass_block_side'),
  front: util3d.getUVCords('minecraft:block/grass_block_side'),
  back: util3d.getUVCords('minecraft:block/grass_block_side'),
  bottom: util3d.getUVCords('minecraft:block/dirt'),
};


function greedyMeshPrototype(heights:Array<Array<number>>)
{
  
}

//initialize the biomeCache at the beginning 

class Entity
{
  boundingBox:THREE.Box3
  entityType:string
  id:number
  constructor(entityType:string)
  {
    this.id = 1;
    this.entityType = entityType
    this.boundingBox =  new THREE.Box3
  }
  checkCollision()
  {

  }
  toggleHitbox()
  { 

  }

}
class Mob extends Entity
{

}
class entityManager
{
  //class to manage entities
  //
  entityMap:Map<number,Entity>
  entityPositions:Map<number, THREE.Vector3>
  constructor()
  {
    this.entityPositions =  new Map();
    this.entityMap = new Map();
  }
  add(entity:Entity, position:THREE.Vector3)
  {
    this.entityMap.set(entity.id, entity);
    this.entityPositions.set(entity.id, position);
     
  }
  remove(id:number)
  {
    
  }
  get()
  {

  }
  update()
  {

  }

}
class Player extends Entity
{
  position:THREE.Vector3;
  velocity:THREE.Vector3;
  constructor(position:THREE.Vector3, velocity:THREE.Vector3)
  {
    super("test");
    this.position = position;
    this.velocity =  velocity;
  }
  getBoundingBox():THREE.Box3
  {

    return new THREE.Box3;
  }
  //add a function here to check the position. checking for in air can be done using bounding boxes of the player 
  checkPosition()
  {
    this.getBoundingBox();
    //if the player is off the ground 
    //multiple the delta variable by the velocity and apply that to the camera position
    //continuously do this until the boundingBoxs have collided and returns a true condition
  }
  updatePosition()
  {
    //tweak this might not be good practice
    camera.position.copy(this.position);
    //adjust for the current players rotation to prevent it from snapping every animation frame
    //
  } 
}
class AABB
{
  constructor()
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
  generateArea(cX:number, cZ:number)
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
        row.push(this.biomeSelect(cX+x, cZ+x));
      }
      chunkData.push(row);
    }
    return chunkData;
  }
  biomeSelect(x:number, z:number):number
  {
    const continentalness = noiseMachine.octaveNoise();
    const humidity =  layer1.octaveNoise();
    const temperature =  layer2.octaveNoise();    
    //
    

    
    //call the noise functions here 
    //add the conditionals here to determine the biome type 
    return 1;
  }
  
}
class WorldChunk
{
  cCords:Array<number>
  buffer:THREE.BufferGeometry;
  vertices:Array<number>
  indices:Array<number>
  UVs:Array<number>;
  offset:number
  constructor(cCords:Array<number>) 
  {
    this.cCords = cCords
    this.buffer = new THREE.BufferGeometry();
    this.vertices = [];
    this.indices = [];
    this.UVs = [];
    this.offset = 0;
  }
  createheights(x: number, z: number): Array<Array<number>> {
    const cX = x * configurationInfo.chunkSize;
    const cZ = z * configurationInfo.chunkSize;
    return Array.from({ length: 18 }, (_, x) =>
            Array.from({ length: 18 }, (_, z) =>
        (Math.floor(
                noiseMachine.octaveNoise(
                (x + cX + eta - 1) * scale,
                (z + cZ + eta - 1) * scale,
                octaves,
                pers,
                amp,
                freq,
                lacunarity,
                noiseMachine.simplex.bind(noiseMachine)
                ) * 5
            ))
            )
        );
    }
    createChunk() {
        const heights: Array<Array<number>> = this.createheights(this.cCords[0], this.cCords[1]);
        const cX = this.cCords[0] * configurationInfo.chunkSize;
        const cZ = this.cCords[1] * configurationInfo.chunkSize;
        for (let x = 1; x < 17; x++) {
            const coX = cX + (x - 1); 
            for (let z = 1; z < 17; z++) {
            const coZ = cZ + (z - 1);
            const height = heights[x][z];
                for (let y = height; y > configurationInfo.maxDepth; y--) {
                    if (y == height) {
                    this.addQuad(coX, y, coZ, "top");
                    }
                    if (heights[x - 1][z] < y) {
                    this.addQuad(coX, y, coZ, "left");
                    }
                    if (heights[x + 1][z] < y) {
                    this.addQuad(coX, y, coZ, "right");
                    }
                    if (heights[x][z + 1] < y) {
                    this.addQuad(coX, y, coZ, "front");
                    }
                    if (heights[x][z - 1] < y) {
                    this.addQuad(coX, y, coZ, "back");
                    }
                }
            }
        }

        this.buffer.setAttribute('position', new THREE.Float32BufferAttribute(this.vertices, 3));
        this.buffer.setAttribute('uv', new THREE.Float32BufferAttribute(this.UVs, 2));
        this.buffer.setIndex(this.indices);
    }
  addQuad(x:number, y:number, z:number, dir:string)
  {
    const offSetValues = faceDirections[dir];
    this.vertices.push(
      x + offSetValues[0], y + offSetValues[1], z + offSetValues[2],
      x + offSetValues[3], y + offSetValues[4], z + offSetValues[5],
      x + offSetValues[6], y + offSetValues[7], z + offSetValues[8],
      x + offSetValues[9], y + offSetValues[10], z + offSetValues[11],
    )

    this.indices.push(this.offset, this.offset+1, this.offset+2, this.offset+2, this.offset+3, this.offset);
    const texturew = blockUVs[dir]
    this.UVs.push(...texturew);
    this.offset+=4;
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
  //define the whole chunks block types
  //set some rules where if the current y level =  the max height - 8 place another type of block 

}








onMounted(()=>
{ 
    init();
})
const alpha =  0.1;
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