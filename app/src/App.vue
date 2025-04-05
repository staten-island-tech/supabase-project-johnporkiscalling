<template>
  <div ref="canvasContainer" class="scene-container"></div>
</template>


<script setup lang="ts">
import { utilMath } from './test';//gives acess to lerp and stuff
import { Perlin } from './testicle';
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { array } from 'three/tsl';


//checklist
//actually load massive amounts of chunks
//save world data to a file on the users computer
//idk 
//use supabase somehow for this


//terrain gen logic here
const gridSize = 32;
const gradients = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 0.5], [-1, 0.5], [0.5, 1], [-0.5, 1],
  [1, -0.5], [-1, -0.5], [0.5, -1], [-0.5, -1]
]; // Added more gradients for better variation
const hashTable =  Perlin.permutate(2312131);
function hash(x:number, y:number){
  return hashTable[(hashTable[(x & 255) + hashTable[y & 255]] & 255)];
}
const grid = Array.from({length:gridSize}, (_,i)=> 
  Array.from({length:gridSize}, (_,f)=>Math.floor(octavePerlin((i+0.00001)*0.05, (f+0.00001)*0.05,1,.6)*5))//call the noise function here
  //for the thing do the noise function with a scale of .1 and add an offset value to prevent 0 from being used in the noise func
);//generates a 256 long grid
console.log(grid);
//small offsset value to ensure non zero values
//the scale value must be 0.1 or less than to ensure decent generation
//modify the funcftion byu using a min functoon 






function noise(x:number,y:number)//gotta add something else to make it more varied 
{
  //get the truncated intdd
  const xi = Math.floor(x)
  const yi = Math.floor(y)

  //get the decimals
  const xf = x - xi;
  const yf = y - yi;
  
  //smooth it
  const u = utilMath.fade(xf);
  const v = utilMath.fade(yf);

  //get the grad unit vectors index
  const v00 = hash(xi,yi) %gradients.length;
  const v01 = hash(xi,yi+1)%gradients.length;
  const v10 = hash(xi+1,yi)%gradients.length;
  const v11 = hash(xi+1,yi+1)%gradients.length;
  
  //calculate the dot products between grad and displacement vectors
  const dp00 = gradients[v00][0] * xf + gradients[v00][1] * yf;
  const dp01 = gradients[v01][0] * xf + gradients[v01][1] * (yf-1);
  const dp10 = gradients[v10][0] * (xf-1) + gradients[v10][1] * yf;
  const dp11 = gradients[v11][0] * (xf-1) + gradients[v11][1] * (yf-1);

  //lerp it
  const x1 = utilMath.lerp(dp00, dp10, u);
  const x2 = utilMath.lerp(dp01, dp11, u);
  return utilMath.lerp(x1, x2, v)/2; 
}
//octaves =  how many times to run perlin. higher = more details
//persistence =  bias of pre existing highs and lows p<.5 reversal so high =  low 0.5 =  standard brown
function octavePerlin(x:number, y:number, octaves:number, persistence:number)
{
  let total = 0; 
  let frequency = 1;
  let maxValue = 0;
  let amplitude = 1;
  for(let i = 0; i<octaves; i++)
  {
    total+=noise(x*frequency, y*frequency) * amplitude;
    maxValue+=amplitude;
    frequency *= 2;
    amplitude *= persistence;
  }
  return total/maxValue;
}

class generateChunk
{ 
  chunkCords:Array<number> = [];
  constructor(chunkCords:Array<number>)
  {
    this.chunkCords = chunkCords;
    
  }
  
}





const textureLoader = new THREE.TextureLoader();
const canvasContainer = ref<HTMLElement | null>(null)
let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls;
const geometry = new THREE.BoxGeometry(1, 1, 1);
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const loadBlockTexture = (path:string) => {
  const tex = textureLoader.load(path);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.premultiplyAlpha = false;
  return tex;
};
const texTop = loadBlockTexture('./src/assets/texturetest/grass_block_top.png');
const texSide = loadBlockTexture('./src/assets/texturetest/grass_block_side.png');
const texBottom = loadBlockTexture('./src/assets/texturetest/dirt.png');
const materials2 = [
  new THREE.MeshBasicMaterial({ map: texSide }), // Right
  new THREE.MeshBasicMaterial({ map: texSide }), // Left
  new THREE.MeshBasicMaterial({ map: texTop, color:0x7cbd6b }),  // Top
  new THREE.MeshBasicMaterial({ map: texBottom }), // Bottom
  new THREE.MeshBasicMaterial({ map: texSide }), // Front
  new THREE.MeshBasicMaterial({ map: texSide })  // Back
];
const texew = loadBlockTexture('./src/assets/texturetest/stone.png');
const materials = new THREE.MeshBasicMaterial({map:texew})


function init() {
  if (renderer) return;
  camera.position.z = 1;
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (canvasContainer.value && !canvasContainer.value.hasChildNodes()) {
    canvasContainer.value.appendChild(renderer.domElement);
  }
  controls = new OrbitControls(camera, renderer.domElement);
  addStuff(grid);
  animate()
}
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
function addStuff(heights:Array<Array<number>>)
{
  console.log(heights, "heights");
  for(let i = 0; i<heights.length;i++)
  {
    for(let f = 0; f<heights[i].length; f++)
    {
      const position = new THREE.Vector3(i,heights[i][f],f);
      const newCube =  new THREE.Mesh(geometry, materials);
      newCube.position.copy(position);
      scene.add(newCube);
    }
  }
}//store this in a map or smth, then encode the data and put it in supabase. 
const testBuffer = new THREE.BufferGeometry();
const vertices = []
const indexes = [];
let offset = 0;

function addQuad(x:number, y:number, z:number, dir:string)
{
  const size = 1;
  vertices.push(//get da corners
    [x - .5, y + .5, z - .5],
    [x + .5, y + .5, z - .5],
    [x + .5, y + .5, z + .5],
    [x - .5, y + .5, z + .5],
  )
  indexes.push(offset, offset+1, offset+2, offset+2, offset+3, offset);
  offset+=4;
}
const directions = 
{
  "left":
  [
    
  ]
}

onMounted(()=>
{
  init()
}
);
onBeforeUnmount(() => {
  if (renderer) {
    renderer.dispose();
    if (canvasContainer.value) {
      canvasContainer.value.innerHTML = "";
    }
  }
});


</script>

<style scoped>

</style>