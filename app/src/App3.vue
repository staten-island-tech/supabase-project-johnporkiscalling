<template>
  <div ref="canvasContainer" class="scene-container"></div>
    <div class="debugScreen">
        {{ coordinates }}
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref, render } from 'vue';
import * as THREE from 'three';
import Stats from 'stats.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { util3d } from './utils';    
import { Noise } from './noisefunct';

import { configurationInfo } from './config';
import { options } from './options';
import { info } from './playerinfo';

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
function animate()
{
    stats.begin();

    const delta = (performance.now()-currentTime)/1000;
    currentTime = performance.now()
    
    updateSun();
    updateDebug();

    renderer.render(scene, camera);
    stats.end();
    requestAnimationFrame(animate);
}

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

function checkDirtyChunks()
{
    for(const chunk of dirtyChunks)
    {
        //look it up in map and then pass it into to be re rendererd
        
    }
}
function updateChunks()
{

}
function chunkLoader()
{
  const chunkLoadLimit = 32;
  const chunkZ = Math.floor(yawObject.position.z/16)
  const chunkX = Math.floor(yawObject.position.x/16)  
  const nBound = chunkZ - chunkLoadLimit;
  const sBound = chunkZ + chunkLoadLimit;
  const wBound = chunkX - chunkLoadLimit;
  const eBound = chunkX + chunkLoadLimit;
  for(const [key, mesh] of chunkMeshMap.entries())
  {
    const [x,y] =  key.split(',').map(Number);
    if(x<wBound||x>eBound||y<nBound||y>sBound)
    {
      scene.remove(mesh);
      mesh.geometry.dispose();
      chunkMeshMap.delete(key);
    }
  }
  for(let x =  wBound; x<eBound; x++)
  {
      for(let z =  nBound; z<sBound; z++)
      {
          const stringCords = `${x},${z}`
          if(!chunkMeshMap.has(stringCords))
          {
            const chunkTest =  new WorldChunk([x,z]);
            chunkTest.createChunk();
            const {buffer, UVs, indices, vertices} = chunkTest.returnData();
            chunkTest.destroy();
            const mesh = new THREE.Mesh(buffer, blocksMaterial)
            mesh.receiveShadow = true;
            mesh.castShadow =  true;
            scene.add(mesh);       
            chunkMeshMap.set(stringCords, mesh);
          }

      }
  }
}
//detect if the chunk is full blocks or full air
//if any of those options are true then dont render anything at all

//

//chunk generation



//

//entity initiliazing

//



function init()
{
    if (canvasContainer.value && !canvasContainer.value.hasChildNodes()) {
        canvasContainer.value.appendChild(renderer.domElement);
    }//if statement cuz ts freaks out   
    requestAnimationFrame(animate);
}
onMounted(()=>
{
    init();
})
</script>

<style scoped>

</style>