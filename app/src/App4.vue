<template>
    
    <div ref="canvasContainer" class="scene-container"></div>
        <div class="debugScreen">
            {{ coordinates }}
            {{ velocity }}
        </div>
    <div>
    <InventoryManager v-if="showInventory" class="gui"></InventoryManager>
    <HotBar class="employment"></HotBar>
    </div>
    <img src="./assets/realhand.png" class="unemployed swing-image" width="30%">
    <img src="./assets/realhand.png" class="mirroredunemployed" width="30%" style="filter: sepia(0.7) hue-rotate(-10deg) brightness(0.4) contrast(1.1) saturate(1.2);">
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
                // If inventory is being shown, exit pointer lock
        if (showInventory.value && document.pointerLockElement === canvas) {
            document.exitPointerLock();
        }
        // If inventory is being hidden, request pointer lock
        else if (!showInventory.value && document.pointerLockElement !== canvas) {
            canvas.requestPointerLock();
        }
    }
    else if(event.key.toLowerCase()==="esc")
    {
        paused.value = !paused.value;
    }
})
import * as THREE from 'three';
import Stats from 'stats.js';
import pako from 'pako'; 

const seed = 1213121;
const coordinates =  ref();

const scene:THREE.Scene = new THREE.Scene();
const camera:THREE.PerspectiveCamera =  new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 2048)
const renderer:THREE.WebGLRenderer =  new THREE.WebGLRenderer({antialias:true});
const pitchObject:THREE.Object3D =  new THREE.Object3D().add(camera);
const yawObject:THREE.Object3D =  new THREE.Object3D().add(pitchObject);
yawObject.position.set(10,150,10);
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

let currentTime = performance.now();


let mouseHeldTime: Array<number> = [];
let isMouseDown: Array<boolean> = [];

const HOLD_THRESHOLD = 1; // time in ms required to "break" a block

document.addEventListener('mousedown', (event) => {
    isMouseDown[event.button] = true;
    mouseHeldTime[event.button] = performance.now();
});

document.addEventListener('mouseup', (event) => {
    isMouseDown[event.button] = false;
    mouseHeldTime[event.button] = 0;
});


import { Mesher2, DataManager } from './lib/renderer';
import { InvStore } from './stores/inventory';
import { Player } from './lib/entitymanager';
import { basicSkySetup } from './lib/sceneobjects';
import HotBar from './components/HotBar.vue';
import { TerrainGenerator } from './lib/workerscripts';
import { util } from './lib/utils';


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

const metalPipe = new Audio(`../src/assets/metalpipe.mp3`)
const miningSound = new Audio('../src/assets/blockbreak.mp3');
miningSound.loop = true; // Makes the sound loop
miningSound.preload = 'auto';
let isPlayingMiningSound = false;
function worldInteractions(rayinfo:VoxelRayInfo)
{
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
        if (isMouseDown[0]) 
        {
            const heldDuration = currentTime - mouseHeldTime[0];
            if (heldDuration >= HOLD_THRESHOLD) 
            {
                console.log("broke block")
                const [x,y,z] = rayinfo.position;
                dm.setVoxel(x,y,z,0);
                const {lCords, cCords} = util.localizeCords(x,y,z);
                mesher.renderQueue.push(cCords.toString());
                //trigger a re render at the chunk specified
                metalPipe.currentTime = 0;
                metalPipe.play();
                isMouseDown[0]=false;
            }
        }
        else if(isMouseDown[2])
        {
            const [x,y,z] = rayinfo.position.clone().add(rayinfo.face);
            const {lCords, cCords} = util.localizeCords(x,y,z);
            mesher.renderQueue.push(cCords.toString());
            const aabb = player.getPlayerAABB(camera.position);
            const min = aabb.min.clone().floor();
            const max = aabb.max.clone().floor();
            let nah = true;
            for (let ax = min.x; ax <= max.x; ax++) {
                for (let ay = min.y; ay <= max.y; ay++) {
                    for (let az = min.z; az <= max.z; az++) {
                        if(ay==y)
                        {
                            nah = false;
                        }
                    }
                }
            }
            if(nah)
            {
                dm.setVoxel(x,y,z, 1);
                isMouseDown[2] = false;
                metalPipe.currentTime = 0;
                metalPipe.play();
            }
        }
    }
    if(yawObject.position.y<0)
    {
        yawObject.position.y = 100;
    }
}
//queue inside the dm to load new stuff
//when the stuff is loaded 
let currentChunkX = Math.floor(yawObject.position.x/16);
let currentChunkZ = Math.floor(yawObject.position.z/16);
const bounds = 2;
function loadStuff(yawObject:THREE.Object3D)
{
    console.log(yawObject.position, currentChunkX, currentChunkZ)
    const cX = Math.floor(yawObject.position.x/16)
    const cZ = Math.floor(yawObject.position.z/16);
    if(cX!=currentChunkX || cZ!=currentChunkZ)
    {
        const nBound = cZ + bounds;
        const sBound = cZ - bounds;
        const eBound = cX + bounds;
        const wBound = cX - bounds;
        for(let x = wBound; x<eBound; x++)
        {
            for(let z = sBound; z<nBound; z++)
            {
                console.log(x,z)
                if(dm.chunkData.has(`${x},${z}`)) continue;
                dm.aqueue.push(`${x},${z}`);
            }   
        }
        //determine what datas needs to be loaded into the queue
        //when the data is done being loaded return some sort of indicator back to tell the data that its done being loaded
        currentChunkX = cX;
        currentChunkZ = cZ
    }
    console.log("SKIPPING")
    if(dm.readyQueue.length!=0)//checks if theres data that neesd rendereinr after dm finished
    {
        for(let item of dm.readyQueue)
        {
            mesher.renderQueue.push(item);
        }
        dm.readyQueue.length=0;
    }
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
    const rayinfo:VoxelRayInfo = player.voxelRayCast(dirvector, yawObject, dm) as VoxelRayInfo;
    worldInteractions(rayinfo);
    velocity.value = `${Math.floor(player.verticalVelocity)}m/s`
    loadStuff(yawObject);
    console.log("now checking da queue")
    dm.checkQueue(tg);
    console.log("stuck on da quqeu")
    mesher.renderStuff(dm, scene);

    renderer.render(scene, camera)
    requestAnimationFrame(animate)
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
    store.resetHotbar();
    store.resetInventory();
    store.changeData(0, {id:1, count:1}, "hotbar");
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
    .employment {
        position: fixed;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        padding: 1em;
        text-align: center;
        z-index: 0;
    }
    .unemployed {
        position: fixed;
        bottom: 0;
        right: 0;
        z-index: 10;
    }
    .mirroredunemployed {
        position: fixed;
        bottom: 0;
        left: 0;
        transform: scaleX(-1);

    }

</style>