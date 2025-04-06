<template>
  <div ref="canvasContainer" class="scene-container"></div>
</template>


<script setup lang="ts">
import { utilMath } from './test';//gives acess to lerp and stuff
import { Perlin } from './testicle';
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls, UVsDebug } from "three/examples/jsm/Addons.js";
import { array } from 'three/tsl';
import Stats from 'stats.js';
const stats = new Stats();
document.body.appendChild(stats.dom);
//checklist
//actually load massive amounts of chunks
//save world data to a file on the users computer
//idk 
//use supabase somehow for this


//terrain gen logic here
const gridSize = 128; 
const gradients = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 0.5], [-1, 0.5], [0.5, 1], [-0.5, 1],
  [1, -0.5], [-1, -0.5], [0.5, -1], [-0.5, -1]
]; 
const hashTable =  Perlin.permutate(2312131);
function hash(x:number, y:number){
  return hashTable[(hashTable[(x & 255) + hashTable[y & 255]] & 255)];
}
const grid = Array.from({length:gridSize}, (_,i)=> 
  Array.from({length:gridSize}, (_,f)=>Math.floor(octavePerlin((i+0.00001)*0.05, (f+0.00001)*0.05,2,.5)*4))//call the noise function here
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
    frequency *= 1.1;
    amplitude *= persistence;
  }
  return total/maxValue;
}

const textureLoader = new THREE.TextureLoader();
const canvasContainer = ref<HTMLElement | null>(null)
let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls;
const geometry = new THREE.BoxGeometry(1, 1, 1);
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2048);
const loadBlockTexture = (path:string) => {
  const tex = textureLoader.load(path);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.premultiplyAlpha = false;
  return tex;
};

//use a texture atlas


const texTop = loadBlockTexture('./src/assets/texturetest/grass_block_top.png');
const texSide = loadBlockTexture('./src/assets/texturetest/grass_block_side.png');
const texBottom = loadBlockTexture('./src/assets/texturetest/dirt.png');
const materials:Record<string,THREE.MeshBasicMaterial> = {
  right: new THREE.MeshBasicMaterial({ map: texSide,side: THREE.DoubleSide }), // Right
  left:  new THREE.MeshBasicMaterial({ map: texSide,side: THREE.DoubleSide }), // Left
  top: new THREE.MeshBasicMaterial({ map: texTop, color:0x7cbd6b,side: THREE.DoubleSide }),  // Top
  bottom: new THREE.MeshBasicMaterial({ map: texBottom,side: THREE.DoubleSide }), // Bottom
  front: new THREE.MeshBasicMaterial({ map: texSide,side: THREE.DoubleSide }), // Front
  back: new THREE.MeshBasicMaterial({ map: texSide,side: THREE.DoubleSide })  // Back
};
const mats:Array<THREE.MeshBasicMaterial> = [];
const texew = loadBlockTexture('./src/assets/texturetest/stone.png');
const materials2 = new THREE.MeshBasicMaterial({color:0xFF00FF,  side: THREE.DoubleSide })
const materialArray = [
  materials.top,
  materials.bottom,
  materials.front,
  materials.back,
  materials.left,
  materials.right,
];


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
const testBuffer = new THREE.BufferGeometry();
const vertices:Array<number> = []
const indexes:Array<number> = [];
const UV:Array<number> = [];
//apply somne form of chunking ehre to reduce the array size and thus the amount of memory taken up
//fix the textures somehow



let offset = 0;
const faceDirections:Record<string,Array<number>> = {
  top: [
    -0.5, 0.5, -0.5,
     0.5, 0.5, -0.5,
     0.5, 0.5,  0.5,
    -0.5, 0.5,  0.5,
  ],
  bottom: [
    -0.5, -0.5,  0.5,
     0.5, -0.5,  0.5,
     0.5, -0.5, -0.5,
    -0.5, -0.5, -0.5,
  ],
  front: [
    -0.5, -0.5, 0.5,
     0.5, -0.5, 0.5,
     0.5,  0.5, 0.5,
    -0.5,  0.5, 0.5,
  ],
  back: [
     0.5, -0.5, -0.5,
    -0.5, -0.5, -0.5,
    -0.5,  0.5, -0.5,
     0.5,  0.5, -0.5,
  ],
  left: [
    -0.5, -0.5, -0.5,
    -0.5, -0.5,  0.5,
    -0.5,  0.5,  0.5,
    -0.5,  0.5, -0.5,
  ],
  right: [
     0.5, -0.5,  0.5,
     0.5, -0.5, -0.5,
     0.5,  0.5, -0.5,
     0.5,  0.5,  0.5,
  ],
};
const uvCords:Record<string,Array<number>> = {
  right:[
    1, 0, 
    0, 0,
    0, 1,  
    1, 1   
  ],
  left:[
    1, 0,  
    0, 0,  
    0, 1,  
    1, 1   
  ],
  top:[
    0, 0,
    1, 0,
    1, 1,
    0, 1,
  ],
  bottom:[
    0, 1, 
    1, 1,  
    1, 0, 
    0, 0 
  ],
  back:[
    0, 0, 
    1, 0,
    1, 1, 
    0, 1
  ],
  front:[
    0, 0,  
    1, 0, 
    1, 1, 
    0, 1  
  ]
}






function addQuad(x:number, y:number, z:number, dir:string)
{
  const offSetValues = faceDirections[dir];
  vertices.push(//get da corners
    x + offSetValues[0], y + offSetValues[1], z + offSetValues[2],
    x + offSetValues[3], y + offSetValues[4], z + offSetValues[5],
    x + offSetValues[6], y + offSetValues[7], z + offSetValues[8],
    x + offSetValues[9], y + offSetValues[10], z + offSetValues[11],
  )

  indexes.push(offset, offset+1, offset+2, offset+2, offset+3, offset);
  UV.push(...uvCords[dir]);
  testBuffer.addGroup(
    indexes.length - 6, // Start index (where these faces begin in the index array)
    6, // Number of indices (6 for 2 triangles)
    materialArray.indexOf(materials[dir]) // Material index
  );
  offset+=4;
}
function animate() {
  requestAnimationFrame(animate);
  stats.begin();
  controls.update();
  renderer.render(scene, camera);
  stats.end();
}
function addStuff(heights:Array<Array<number>>)
{
  console.log(heights, "heights");
  for(let x = 0; x<heights.length;x++)
  {
    for(let z = 0; z<heights[x].length; z++)
    {
      //add faces based off of the neighboring blocks
      //so use the height map to determine the neighbors where if the height of neighbors is greater then dont add side faces
      //otherwise if its taller than its neighbor add a face in the direction of the neighbor
      const y = heights[x][z];
      addQuad(x,y,z,"top");      //maybe add a functioin here to check if the block face has neighbor air on top
      //current neighbors to check for are in the x and z axis 
      //y axis checks will come later 
      if(x-1<0||heights[x-1][z]<y)//left
      { 
        addQuad(x,y,z,"left");
      }
      if(x+1 >= gridSize-1||heights[x+1][z]<y)//right
      { 
        addQuad(x,y,z,"right");
      }
      if(z+1 >= gridSize-1||heights[x][z+1]<y)//front
      {
        addQuad(x,y,z,"front");

      }
      if(z-1<0||heights[x][z-1]<y)//back
      {
        addQuad(x,y,z,"back");
      }
    }
    
  }
  testBuffer.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  testBuffer.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));  // Add UVs for the texture mapping

  testBuffer.setIndex(indexes);
  const mesh =  new THREE.Mesh(testBuffer, materialArray);
  scene.add(mesh);
  console.log(offset/4)
}//store this in a map or smth, then encode the data and put it in supabase. 
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