<template>
    
    <div ref="canvasContainer" class="scene-container"></div>
        <div class="debugScreen">
            {{ coordinates }}
            {{ velocity }}
        </div>
    <div>
    <InventoryManager v-if="showInventory" class="gui"></InventoryManager>
    <HotBar class="employment" :selectedSlot="selectedSlot"></HotBar>
    </div>
    <div class="crosshair"></div>
    <EscapeMenu class="test" v-if="paused"></EscapeMenu>
    <img src="./assets/realhand.png" class="unemployed swing-image" width="30%">
    <img src="./assets/realhand.png" class="mirroredunemployed" width="30%">
</template>

<script setup lang="ts"> 
import { onMounted, ref,computed, onBeforeUnmount } from 'vue';
import InventoryManager from './components/InventoryManager.vue';
import * as THREE from 'three';
import { Mesher2, DataManager } from './lib/renderer';
import { InvStore } from './stores/inventory';
import { Item, Player } from './lib/entitymanager';
import { basicSkySetup } from './lib/sceneobjects';
import HotBar from './components/HotBar.vue';
import { TerrainGenerator } from './lib/workerscripts';
import { util } from './lib/utils';

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
const coordinates =  ref();
const velocity = ref();
const selectedSlot = ref(0);

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
    else if(event.key==="Escape")
    {
        paused.value = !paused.value;
    }
})
const audioPath = new URL('@/assets/metalpipe.mp3', import.meta.url).href;
const metalPipe = new Audio(audioPath)

const seed = 1213121;

const scene:THREE.Scene = new THREE.Scene();
const camera:THREE.PerspectiveCamera =  new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 2048)
const renderer:THREE.WebGLRenderer =  new THREE.WebGLRenderer({antialias:false});
const pitchObject:THREE.Object3D =  new THREE.Object3D().add(camera);
const yawObject:THREE.Object3D =  new THREE.Object3D().add(pitchObject);
yawObject.position.set(10,140,10);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
scene.add(yawObject);
scene.fog = new THREE.Fog(0xcccccc,5, 30)
//mouse movement
const canvasContainer = ref<HTMLElement | null>(null)
const canvas =  renderer.domElement;

window.addEventListener('wheel', (event) => {
  if (event.deltaY > 0) {
    selectedSlot.value = (selectedSlot.value + 1) % 9;
  } else {
    selectedSlot.value = (selectedSlot.value - 1 + 9) % 9;
  }
  event.preventDefault(); 
}, { passive: false });
document.addEventListener('mousedown', (event) => {
    isMouseDown[event.button] = true;
    mouseHeldTime[event.button] = performance.now();
});

document.addEventListener('mouseup', (event) => {
    isMouseDown[event.button] = false;
    mouseHeldTime[event.button] = 0;
});

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
    mouseSens:0.002,
    renderDist:3
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
    ${Math.floor(yawObject.position.x)},
    ${Math.floor(yawObject.position.y)},
    ${Math.floor(yawObject.position.z)}`;
}
//when the player breaks a block spawn an item entity
import { Options } from './stores/options';
const opt = Options();
const render = computed({
  get: () => opt.render,
  set: (val) => (opt.render = val),
})
const brightness = computed(
  {
    get:()=>opt.brightness,
    set:(val)=>(opt.brightness = val),
  }
);

let currentTime = performance.now();
let mouseHeldTime: Array<number> = [];
let isMouseDown: Array<boolean> = [];
const HOLD_THRESHOLD = 1; 

import { ItemManager } from './lib/renderer';
const im = new ItemManager();
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
    const offset = faceNormal.clone().multiplyScalar(0.001);
    quad.position.copy(position).add(offset);
    quad.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), faceNormal);
    
    return quad;
}
let selectionQuad: THREE.Mesh | null = null;
interface VoxelRayHit {
    hit: true;
    position: THREE.Vector3;
    distance: number;
    face: THREE.Vector3;
}

interface VoxelRayMiss {
    hit: false;
}

type VoxelRayInfo = VoxelRayHit | VoxelRayMiss;

let currentChunkX = Math.floor(yawObject.position.x/16);
let currentChunkZ = Math.floor(yawObject.position.z/16);
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
                const [x,y,z] = rayinfo.position;
                const blockId = dm.getVoxel(x,y,z) as number
                dm.setVoxel(x,y,z,0);
                im.addItem(scene, new THREE.Vector3(x+0.5,y+0.5,z+0.5), blockId,1)
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
            const aabb = player.getPlayerAABB(yawObject.position);
            const blockAABB = new THREE.Box3(
                new THREE.Vector3(x,y,z),
                new THREE.Vector3(x+1,y+1,z+1)
            )
            if(blockAABB.intersectsBox(aabb)) return;
            
            const slotInfo = store.readSlot('hotbar', selectedSlot.value)
            if(slotInfo.id==null) return;
            const blockID = slotInfo.id;
            store.removeQuantity(1, selectedSlot.value)
            dm.setVoxel(x,y,z, blockID);
            isMouseDown[2] = false;
            metalPipe.currentTime = 0;
            metalPipe.play();
            
        }
    }
    if(yawObject.position.y<0)
    {
        yawObject.position.y = 100;
    }
}
//queue inside the dm to load new stuff
//when the stuff is loaded 

function loadStuff(yawObject:THREE.Object3D)
{
    const cX = Math.floor(yawObject.position.x/16)
    const cZ = Math.floor(yawObject.position.z/16);
    if(cX!=currentChunkX || cZ!=currentChunkZ)
    {
        const nBound = cZ + render.value;
        const sBound = cZ - render.value;
        const eBound = cX + render.value;
        const wBound = cX - render.value;
        for(let x = wBound; x<eBound; x++)
        {
            for(let z = sBound; z<nBound; z++)
            {
                if(dm.chunkData.has(`${x},${z}`)) continue;
                dm.aqueue.push(`${x},${z}`);
            }   
        }
        //determine what datas needs to be loaded into the queue
        //when the data is done being loaded return some sort of indicator back to tell the data that its done being loaded
        currentChunkX = cX;
        currentChunkZ = cZ
    }
    if(dm.readyQueue.length!=0)//checks if theres data that neesd rendereinr after dm finished
    {
        for(let item of dm.readyQueue)
        {
            mesher.renderQueue.push(item);
        }
        dm.readyQueue.length=0;
    }
}
const dropCooldown = {
    lastDrop: 0,
    delay: 300 // milliseconds
};

function handleDropAndPickup() {
    const now = performance.now();
    if(keys["r"])
    {
        store.removeQuantity(999999, selectedSlot.value);
    }
    else if (keys["q"] && now - dropCooldown.lastDrop > dropCooldown.delay) {

        store.removeQuantity(1, selectedSlot.value)
        dropCooldown.lastDrop = now;
    }
    im.itemsInRangeOfPlayer(yawObject.position, player, scene);

}

let dropped = false;

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
    dm.checkQueue(tg);
    handleDropAndPickup();
    mesher.renderStuff(dm, scene);
    im.updateAll(delta, dm);
    for(let x = 1; x<11; x++)
    {
        if(keys[`${x}`]) selectedSlot.value = x-1;
    }
    im.despawnAll(scene);

    renderer.render(scene, camera)
    requestAnimationFrame(animate)
}
import { initializeStore } from './lib/renderer';
import EscapeMenu from './components/EscapeMenu.vue';
function init()
{
    if (canvasContainer.value && !canvasContainer.value.hasChildNodes()) {
        canvas.style.position = 'fixed'; // important
        canvas.style.top = '0';
        canvas.style.left = '';
        canvas.style.zIndex = '0'; // background layer
        canvasContainer.value.appendChild(renderer.domElement);
    }
    skibidisky.setup();
    initializeStore();
    const cX = Math.ceil(yawObject.position.x/16);
    const cY = Math.ceil(yawObject.position.z/16);
    dm.nonasyncUpdate(cX,cY, render.value, tg);
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

const handleResize = () => {
  if (!canvasContainer.value) return;

  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};
onMounted(()=>
{
      window.addEventListener('resize', handleResize);


    init();
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
});



</script>

<style scoped>

    .test 
    {
        z-index:99999;
    }
    body {
      margin: 0;
      height: 100vh;
      overflow: hidden;
      background: #000; /* Optional: black background for contrast */
    }

    .crosshair {
      position: fixed;
      top: 50%;
      left: 50%;
      width: 20px;
      height: 20px;
      transform: translate(-50%, -50%);
      pointer-events: none; /* Let clicks pass through */
    }

    .crosshair::before,
    .crosshair::after {
      content: "";
      position: absolute;
      background: black; /* Change color if desired */
    }

    /* Vertical line */
    .crosshair::before {
      width: 2px;
      height: 100%;
      left: 50%;
      top: 0;
      transform: translateX(-50%);
    }

    /* Horizontal line */
    .crosshair::after {
      height: 2px;
      width: 100%;
      top: 50%;
      left: 0;
      transform: translateY(-50%);
    }
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
        z-index: 1;
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
    .escapemenu
    {
        z-index: 10;
    }

</style>