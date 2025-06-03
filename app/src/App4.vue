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

const stats =  new Stats();
document.body.appendChild(stats.dom);
const coordinates =  ref();

const scene:THREE.Scene = new THREE.Scene();
const camera:THREE.Camera =  new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 2048)
const renderer:THREE.WebGLRenderer =  new THREE.WebGLRenderer({antialias:false});
const pitchObject:THREE.Object3D =  new THREE.Object3D().add(camera);
const yawObject:THREE.Object3D =  new THREE.Object3D().add(pitchObject);
yawObject.position.set(0,100,0);
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
window.addEventListener('resize', resizeCanvas);
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    requestAnimationFrame(animate);
}
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
import { ChunkManager } from './REWRITEAGAIN';



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
    chunkManager = new ChunkManager(1);
    requestAnimationFrame(animate);
}
//call the init function in onMounted()

onMounted(()=>{
    init()
})
interface BoundInfo
{
    x:number;
    y:number;
    z:number;
    size:number;
}

function greedyMesh(data:Array<number>)
{
    //asume a flat face
    const consumedFaces = new Map();
    //if the face has been consmed by the greedy mesher set it to map
    let x = 0; 
    let y = 0;
    let z = 0;
    while(true)
    {
        const currentFace = data[util3d.getIndex(x,y,z)]
        //check if theres any valid faces to consume 

        
    }
}
//ideas
//implement morton idea for octree, helps with locality of the coordinates
//octreenode for use in greedymesher
//pipeline for rendering optimizations
//1.octree
//2.face occlusion
//3. greedy mesh
//4. maybe frustrum cull if possible
//do some bounding box stuff 





class OctreeNode
{
    minPoint:Array<number>
    maxPoint:Array<number>
    depth:number;
    maxDepth:number;
    children:Array<OctreeNode> | null;
    data:Array<number>
    isLeaf:boolean;
    constructor(minPoint:Array<number>, maxPoint:Array<number>, depth=0, maxDepth=8, isleaf:boolean)
    {
        this.minPoint = minPoint;//[x,y,z]bottom left front
        this.maxPoint = maxPoint;//[x,y,z]top right back
        this.depth =  depth;
        this.maxDepth =  maxDepth;
        this.children = null;
        this.data = [];
        this.isLeaf = false;
    }
    subdivide()
    {
        this.children = []
        const size = this.maxPoint[0] - this.minPoint[0] +  1;
        
        for(let x = 0; x<=2; x++)
        {
            for(let y = 0; y<=2; y++)
            {
                for(let x = 0; x<=2; x++)
                {
                    //get the other nodes by adding 15 
                }
            }
        }
    }
    insert(pos:number, data:Array<number>)
    {
        //insert a node at a given 
    }
    remove()
    {
        //remove a node
    }
    get()
    {
        //gets the data at the given chunk
        //does it on a 1by1 basis
    }
    queryArea(aabb_min:Array<number>, aabb_max:Array<number>)//min and max are the corners of the box to avoid excessive storage 
    {

    }   
    clear()
    {
        //destroy the tree
    }
    optimize()
    {
        //reblanace the tree
    }

}
function interleave(a:number)
{

}
function dontInterleave(a:number)
{

}
function encodeMorton(x:number, y:number)
{

}
function decodeMorton(encoded:number)
{

}


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