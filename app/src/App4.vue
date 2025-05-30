<template>
    <div ref="canvasContainer" class="scene-container"></div>
        <div class="debugScreen">
            {{ coordinates }}
        </div>
    <div>
    
    </div>
</template>

<script setup lang="ts"> 
import { onMounted, ref } from 'vue';

const keys:Record<string, boolean> = {}
window.addEventListener("keydown", (event)=>
{
    keys[event.key.toLowerCase()] = true;
})
window.addEventListener("keyup", (event)=>
{
    keys[event.key.toLowerCase()] = false;
})


const inInventory = ref(false);
const paused =  ref(false);

function inputLayer()
{
    if(keys["escape"])//change this to some other key later, esc messes with pointer lock i think
    {
        if(inInventory.value==true)
        {
            inInventory.value = false;   
        }
        else if(paused.value==true)
        {
            paused.value = false;
        }
        else
        {
            paused.value = true;
        }
    }
}



import * as THREE from 'three';
import Stats from 'stats.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { util3d } from './utils';    
import { Noise } from './noisefunct';
import { faceDirections } from './stupidlylongvariables';
import { options } from './options';
import pako from 'pako';

const seed = 11111111;
const stats =  new Stats();
document.body.appendChild(stats.dom);
const coordinates =  ref();

const scene:THREE.Scene = new THREE.Scene();
const camera:THREE.Camera =  new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 2048)
const renderer:THREE.WebGLRenderer =  new THREE.WebGLRenderer({antialias:true});
const pitchObject:THREE.Object3D =  new THREE.Object3D().add(camera);
const yawObject:THREE.Object3D =  new THREE.Object3D().add(pitchObject);
yawObject.position.set(0,-10,0);
camera.position.set(0, 0, 0);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
scene.add(yawObject);
scene.add(new THREE.AxesHelper(50));
scene.add(new THREE.GridHelper(200, 50));

const debugGeometry = new THREE.BoxGeometry(10,10,10); // 1x1x1 unit cube
const debugMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xff0000, // Red (easily visible)
});
const debugCube = new THREE.Mesh(debugGeometry, debugMaterial);

// 2. Position it where you suspect issues (e.g., chunk origin)
debugCube.position.set(0, 70, -20); // 20 units ahead

// 3. Add to your scene
scene.add(debugCube);

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


function updateDebug()
{
    coordinates.value =  `
    ${Math.round(yawObject.position.x)},
    ${Math.round(yawObject.position.y)},
    ${Math.round(yawObject.position.z)}`;
}

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
let time = 0;
function updateSun() 
{
    time += 0.000001; // Adjust for speed
    if (time > 1) time = 0;
    const elevation = Math.sin(time * 2 * Math.PI) * 90;
    const azimuth = 180 + Math.cos(time * 2 * Math.PI) * 90;
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);
    sun.setFromSphericalCoords(1, phi, theta);
    sky.material.uniforms['sunPosition'].value.copy(sun);
    sunSource.position.copy(sun);
}
let currentTime = Infinity;
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



let mouseDown: Array<number> = [];
let duration: Array<number> = []
document.addEventListener('mousedown', function (event) {
    mouseDown[event.button] = performance.now();
});
document.addEventListener('mouseup', function (event) {
    const currentTime = performance.now();
    duration[event.button] = currentTime - mouseDown[event.button]
});

import { BiomeData, BIOME_IDS, BLOCK_TYPES } from './biome';
import { ChunkManager } from './oewfwo';



let chunkManager:ChunkManager
function animate()
{
    stats.begin();
    const delta = (performance.now()-currentTime)/1000;
    currentTime = performance.now()
    chunkManager.maybeLoad(scene,yawObject);

    const dirvector = new THREE.Vector3();
    yawObject.getWorldPosition(dirvector);
    const result = chunkManager.voxelRayCast(dirvector, yawObject);//clean this up
    if (result.hit == true) {
        chunkManager.handleMouse(result.position as THREE.Vector3, result.face as THREE.Vector3, duration)
    }
    
    updateSun();
    updateDebug();
    renderer.render(scene, camera);
    stats.end();
    requestAnimationFrame(animate);
}
function init()
{
    if (canvasContainer.value && !canvasContainer.value.hasChildNodes()) {
        canvasContainer.value.appendChild(renderer.domElement);
    }
    chunkManager = new ChunkManager(seed);
    requestAnimationFrame(animate);
}
//call the init function in onMounted()

onMounted(()=>{
    init()
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