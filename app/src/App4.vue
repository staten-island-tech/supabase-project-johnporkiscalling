<template>
    
    <div ref="canvasContainer" class="scene-container"></div>
        <div class="debugScreen">
            {{ coordinates }}
            {{ velocity }}
        </div>
    <div>
    <InventoryManager v-if="showInventory" class="gui"></InventoryManager>
    <HotBar></HotBar>
    </div>
</template>

<script setup lang="ts"> 
import { onMounted, ref, render, type Ref } from 'vue';
import InventoryManager from './components/InventoryManager.vue';
const keys:Record<string, boolean> = {}
window.addEventListener("keydown", (event)=>
{
    keys[event.key.toLowerCase()] = true;
})
window.addEventListener("keyup", (event)=>
{
    keys[event.key.toLowerCase()] = false;
})


const showInventory = ref(false);
const paused =  ref(false);


window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'e') {
        showInventory.value = !showInventory.value
    }
    else if(event.key.toLowerCase()==="esc")
    {
        paused.value = !paused.value;
    }
})
import * as THREE from 'three';
import Stats from 'stats.js';
import pako from 'pako'; 

const seed = 2134132131;
const coordinates =  ref();

const scene:THREE.Scene = new THREE.Scene();
const camera:THREE.PerspectiveCamera =  new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 2048)
const renderer:THREE.WebGLRenderer =  new THREE.WebGLRenderer({antialias:true});
const pitchObject:THREE.Object3D =  new THREE.Object3D().add(camera);
const yawObject:THREE.Object3D =  new THREE.Object3D().add(pitchObject);
yawObject.position.set(0,160,0);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
scene.add(yawObject);
//mouse movement
const velocity = ref();



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
const options = 
{
    mouseSens:0.002
}
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
    ${(yawObject.position.x)},
    ${(yawObject.position.y)},
    ${(yawObject.position.z)}`;
}

let time = 0;
let currentTime = performance.now();


let mouseDown: Array<number> = [];
let duration: Array<number> = []
document.addEventListener('mousedown', function (event) {
    mouseDown[event.button] = performance.now();
});
document.addEventListener('mouseup', function (event) {
    const currentTime = performance.now();
    duration[event.button] = currentTime - mouseDown[event.button]
});   

import { Mesher2, DataManager } from './lib/renderer';
import { InvStore } from './stores/inventory';
import { Player } from './lib/entitymanager';
import { basicSkySetup } from './lib/sceneobjects';
import HotBar from './components/HotBar.vue';
import { TerrainGenerator } from './lib/workerscripts';


const store = InvStore();
let player = new Player(new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0), 100)
let dm = new DataManager();
let mesher = new Mesher2();
let skibidisky = new basicSkySetup(scene);
let tg =  new TerrainGenerator(seed);
function createFaceQuad(position: THREE.Vector3, faceNormal: THREE.Vector3): THREE.Mesh {
    const size = 1.001; // Slightly larger than the block to avoid z-fighting
    const geometry = new THREE.PlaneGeometry(size, size);
    
    // Align the quad based on the face normal
    const quad = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        })
    );

    // Position the quad slightly in front of the block face to avoid z-fighting
    const offset = faceNormal.clone().multiplyScalar(0.001);
    quad.position.copy(position).add(offset);

    // Rotate the quad to match the face orientation
    quad.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), faceNormal);
    
    return quad;
}
let selectionQuad: THREE.Mesh | null = null;
interface VoxelRayInfo 
{
    hit:boolean;
    position?:THREE.Vector3;
    distance?:number;
    face?:THREE.Vector3;
}
function animate()
{
    const delta = (performance.now()-currentTime)/1500;
    currentTime = performance.now()
    updateDebug();
    skibidisky.updateSun();
    player.updatePosition2(delta, camera, keys, yawObject, dm);
    const dirvector = new THREE.Vector3();
    camera.getWorldDirection(dirvector);
    const rayinfo = player.voxelRayCast(dirvector, yawObject, dm);
    velocity.value = `${Math.floor(player.verticalVelocity)}m/s`
    if (selectionQuad) {
        scene.remove(selectionQuad);
        selectionQuad = null;
    }
    if (rayinfo.hit) {
        // Calculate the center position of the face
        const faceCenter = new THREE.Vector3(
            rayinfo.position.x + 0.5 + rayinfo.face.x * 0.5,
            rayinfo.position.y + 0.5 + rayinfo.face.y * 0.5,
            rayinfo.position.z + 0.5 + rayinfo.face.z * 0.5
        );
        // Create and add new selection quad
        selectionQuad = createFaceQuad(faceCenter, rayinfo.face);
        scene.add(selectionQuad);
    }
    if(yawObject.position.y<0)
    {
        yawObject.position.y = 100;
    }
    renderer.render(scene, camera)
    requestAnimationFrame(animate)
}
let currentChunkX = Infinity;
let currentChunkZ = Infinity;
function maybeLoad()
{
    const chunkX = Math.floor(yawObject.position.x/16);
    const chunkZ = Math.floor(yawObject.position.z/16);
    if(chunkX != currentChunkX || chunkZ != currentChunkZ) {
        updateChunks(chunkX, chunkZ)
        currentChunkX = chunkX
        currentChunkZ = chunkZ
    }
}


async function updateChunks(chunkX:number,chunkZ:number)
{
    mesher.removeStuff(chunkX,chunkZ, renderDist.value, scene);
    //then update stuff which handles deleting usesless data 
    const stuff = await dm.update(chunkX, chunkZ, renderDist.value);
    if(!stuff) return;
}   

const renderDist = ref(1);
async function init()
{
    if (canvasContainer.value && !canvasContainer.value.hasChildNodes()) {
        canvas.style.position = 'fixed'; // important
        canvas.style.top = '0';
        canvas.style.left = '';
        canvas.style.zIndex = '0'; // background layer
        canvasContainer.value.appendChild(renderer.domElement);
    }
    skibidisky.setup();
    const cX = Math.ceil(yawObject.position.x/16);
    const cY = Math.ceil(yawObject.position.z/16);
    dm.nonasyncUpdate(cX,cY, 1, tg);
    for(let xa = 0; xa<dm.queue.length;xa++)
    {
        const [x,z] = dm.queue[xa].split(',').map(Number)
        const data = dm.chunkData.get(`${dm.queue[xa]}`);
        if(!data) continue;
        for(let [k,v] of data)
        {
            mesher.createMesh(dm,x,k,z,scene)
        }
    }
    requestAnimationFrame(animate);
}
onMounted(()=>
{
    store.resetHotbar();
    store.resetInventory();
    store.changeData(0, {id:1, count:1}, "hotbar");

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

    .scene-container
    {
        position: relative;
        z-index: 0;
    }
    .gui {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 10;
        width: 100vw;
        height: 100vh;
        pointer-events: auto;
    }
</style>