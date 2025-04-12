<template>
  <div ref="canvasContainer" class="scene-container"></div>
</template>
<script setup lang="ts">

import { utilMath } from './test';
import { Perlin } from './testicle';
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls, UVsDebug } from "three/examples/jsm/Addons.js";
import { array, textureLoad } from 'three/tsl';
import Stats from 'stats.js';
interface TextureSize {
    width: number;
    height: number;
}
interface AtlasData {
    textureSize: TextureSize;
    frames: Record<string, TextureFrame>;
}
interface TextureFrame {
    x: number;
    y: number;
    w: number;
    h: number;
}

const stats = new Stats();
document.body.appendChild(stats.dom);
const gridSize = 512; 
const gradients = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 0.5], [-1, 0.5], [0.5, 1], [-0.5, 1],
  [1, -0.5], [-1, -0.5], [0.5, -1], [-0.5, -1]
]; 
const hashTable =  Perlin.permutate(34963789);
function hash(x:number, y:number){
  return hashTable[(hashTable[(x & 255) + hashTable[y & 255]] & 255)];
}
const maxDepth = -100;
const maxHeight = 20;
const chunkSize = 16;


const freq = .1;//the distance between dips and peaks
const amp = 5;//the max height
const pers = .4;//smoothness lower =  more smooth
const eta = 0.00001;//small offset value to ensure non-zero values
const scale = 0.1;//scale it to ensure non-zero values
const height = 64;//the default height
const octaves = 2;//the amount of times to run the function to get more detail
const grid = Array.from({length:gridSize}, (_,i)=>
  Array.from({length:gridSize}, (_,f)=>
  Math.pow(Math.floor(( octavePerlin((i+eta)*scale, (f+eta)*scale, octaves, pers, amp, freq))*maxHeight),3))
);





function noise(x:number,y:number)
{
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi;
  const yf = y - yi;
  const u = utilMath.fade(xf);
  const v = utilMath.fade(yf);
  const v00 = hash(xi,yi) %gradients.length;
  const v01 = hash(xi,yi+1)%gradients.length;
  const v10 = hash(xi+1,yi)%gradients.length;
  const v11 = hash(xi+1,yi+1)%gradients.length;
    const dp00 = gradients[v00][0] * xf + gradients[v00][1] * yf;
  const dp01 = gradients[v01][0] * xf + gradients[v01][1] * (yf-1);
  const dp10 = gradients[v10][0] * (xf-1) + gradients[v10][1] * yf;
  const dp11 = gradients[v11][0] * (xf-1) + gradients[v11][1] * (yf-1);
  const x1 = utilMath.lerp(dp00, dp10, u);
  const x2 = utilMath.lerp(dp01, dp11, u);
  return utilMath.lerp(x1, x2, v)/2; 
}
function octavePerlin(x:number, y:number, octaves:number, persistence:number, amplitude:number, frequency:number)
{
  let total = 0; 
  let maxValue = 0;
  for(let i = 0; i<octaves; i++)
  {
    total+=noise(x*frequency, y*frequency) * amplitude;
    maxValue+=amplitude;
    frequency *= 2;
    amplitude *= persistence;
  }
  return total/maxValue;
}
const elevationMap = {
  
}
//start at the origin or 0,0 of the block 
//increment the x and z index of the thing to figure out if merging is possible

function greedyMesh()
{
  const vertexData = []
  for(let x = 0; x < gridSize; x++)
  {
    for(let z = 0; z<gridSize; z++)
    {
      let xOffset = 1;
      let zOffset = 1;
      const y = grid[x][z];
      while(y==grid[x+xOffset][z])
      {
        //set values that satisfy this to a false or null value to ensure that they dont get reread again
        
        xOffset+=1;
      }
      while(y==grid[x][z+zOffset])//use a while loop and use a for loop equal to the offset amount 
      {
        for(let i = 0; i<xOffset; i++)//run a loop to check that the rows after actually can be extended to 
        {
          if(y!=grid[x+zOffset][z+i])
          {
            zOffset=0;
            break;    
          }
        }
        zOffset+=1;
      }
      vertexData.push([
      ])
    }
  }
}


const textureLoader = new THREE.TextureLoader();
const canvasContainer = ref<HTMLElement | null>(null)
let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls;
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2048);
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
//texture atlas size = 1024*512
const texture0 = loadBlockTexture('./src/assets/blockAtlases/atlas0.png')//16
const texture1 = loadBlockTexture('./src/assets/blockAtlases/atlas1.png')//8
const texture2 = loadBlockTexture('./src/assets/blockAtlases/atlas2.png')//4
const texture3 = loadBlockTexture('./src/assets/blockAtlases/atlas3.png')//2
const texture4 = loadBlockTexture('./src/assets/blockAtlases/atlas4.png')//1
let atlasData:AtlasData = {
  textureSize:{ width:1024, height:512},
  frames:
  {
    "minecraft:block/grass_block_top": {
      "x": 448,
      "y": 160,
      "w": 16,
      "h": 16
    },
    "minecraft:block/grass_block_side": {
      "x": 448,
      "y": 112,
      "w": 16,
      "h": 16
    },
    "minecraft:block/dirt":{"x":384,"y":32,"w":16,"h":16},

  }
}
function getUVs(textureName:string)
{
  const stuff = atlasData.frames[textureName];
  if(!stuff)
  {
    console.warn("missing texture for this item. idk man")
  }
  const { x,y,w,h } = stuff;
  const { width: texWidth, height: texHeigh } =  atlasData.textureSize;
  const left =  x / texWidth
  const right = ( x+w ) / texWidth;
  const top = 1 -  y /texHeigh;
  const bottom = 1 - (y+h)/texHeigh;
  const padding = 0.001;
  return [
    left + padding, bottom + padding,  // bottom-left
    right - padding, bottom + padding, // bottom-right
    right - padding, top - padding,    // top-right
    left + padding, top - padding      // top-left
  ];
}
function init() {
  if (renderer) return;
  camera.position.set(0, 1, 5); // Starting position
  camera.rotation.set(0, Math.PI, 0);  renderer = new THREE.WebGLRenderer({ antialias: true });
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
  stats.begin();
  controls.update()
  renderer.render(scene, camera);
  stats.end();
}








const testBuffer = new THREE.BufferGeometry();
const vertices:Array<number> = []
const indexes:Array<number> = [];
const UV:Array<number> = [];
let offset = 0;
import { faceDirections, uvCords } from './stupidlylongvariables';
const blockUVs:Record<string,Array<number>> = {
  top: getUVs('minecraft:block/grass_block_top'),
  right: getUVs('minecraft:block/grass_block_side'),
  left: getUVs('minecraft:block/grass_block_side'),
  front: getUVs('minecraft:block/grass_block_side'),
  back: getUVs('minecraft:block/grass_block_side'),
  bottom: getUVs('minecraft:block/dirt'), // for example
};
function addQuad(x:number, y:number, z:number, dir:string)//modify this to allow a texture type to be passed in
{
  const offSetValues = faceDirections[dir];
  vertices.push(//get da corners
    x + offSetValues[0], y + offSetValues[1], z + offSetValues[2],
    x + offSetValues[3], y + offSetValues[4], z + offSetValues[5],
    x + offSetValues[6], y + offSetValues[7], z + offSetValues[8],
    x + offSetValues[9], y + offSetValues[10], z + offSetValues[11],
  )

  indexes.push(offset, offset+1, offset+2, offset+2, offset+3, offset);
  const texturew = blockUVs[dir]
  UV.push(...texturew);
  offset+=4;
}
const blocksMaterial = new THREE.MeshBasicMaterial({map:texture0,side: THREE.DoubleSide})


function addStuff(heights:Array<Array<number>>)
{//modify this for different material types based on the amount of a given x away from the top most block facing air 
  console.log(heights, "heights");
  for(let x = 0; x<heights.length;x++)
  {
    for(let z = 0; z<heights[x].length; z++)
    {
      for(let y = heights[x][z];y>maxDepth; y--)//decrement so generate from top down
      {
        if(y==heights[x][z])
        {
          addQuad(x,y,z,"top");//add a top quad if its the top most layer
        }//check the neighbors
        if(x-1<0||heights[x-1][z]<y)//left
        { 
          addQuad(x,y,z,"left");
        }//check if the neighbor to the left is higher or lower than the current block
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
      //at the end of every cord add a bottom at y = 0;
    }
    
  }
  testBuffer.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  testBuffer.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));  

  testBuffer.setIndex(indexes);
  const mesh =  new THREE.Mesh(testBuffer, blocksMaterial);
  scene.add(mesh);
  console.log(offset/4)
}
function generateChunks()
  {
    const chunks = (gridSize/16);
    for(let x = 0; x<chunks; x++)
    {
      for(let z = 0; z<chunks; z++)
      {
        const heightMap =         Array.from({length:16}, (_,x)=>{
          Array.from({length:16}, (_,z)=>{
            Math.pow(Math.floor(( octavePerlin((x+eta)*scale, (z+eta)*scale, octaves, pers, amp, freq))*maxHeight),3);
          })
        })
        //pass the heightmap as a the parameter for the addStuff function 
      }
    }
  }
function createChunk(chunkCord:Array<number>, heights:Array<Array<number>>)
{
  //c =  corner nearest to world origin(0,0) of the chunk at the specified chunk cords
  const cX = chunkCord[0]*chunkSize;
  const cZ = chunkCord[1]*chunkSize;
  for(let x = 0; x<heights.length;x++)
  {
    for(let z = 0; z<heights[x].length; z++)
    {
      for(let y = heights[x][z];y>maxDepth; y--)
      {
        if(y==heights[x][z])
        {
          addQuad(x+cX,y,z+cZ,"top");
        }
        if(x-1<0||heights[x-1][z]<y)
        { 
          addQuad(x+cX,y,z+cZ,"left");
        }
        if(x+1 >= gridSize-1||heights[x+1][z]<y)
        { 
          addQuad(x+cX,y,z+cZ,"right");
        }
        if(z+1 >= gridSize-1||heights[x][z+1]<y)
        {
          addQuad(x+cX,y,z+cZ,"front");
        }
        if(z-1<0||heights[x][z-1]<y)
        {
          addQuad(x+cX,y,z+cZ,"back");
        }
      }
    }
  }
}
function addQuad2Point0()
{
  


}
//chunk size will be a constant that cannot be changed by the user
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
  private createHeights():Array<Array<number>>//prevents user from calling this acidentally
  {
    const cX = this.cCords[0]*chunkSize;
    const cZ = this.cCords[1]*chunkSize;
    const heights:Array<Array<number>> = 
    Array.from({length:16}, (_,x)=>
      Array.from({length:16}, (_,z)=>
        Math.pow(Math.floor(( octavePerlin((x+cX+eta)*scale, (z+cZ+eta)*scale, octaves, pers, amp, freq))*maxHeight),3)
      )
    )
    return heights;
    
  }
  createChunk()
  {
    const heights:Array<Array<number>> = this.createHeights();
    const cX = this.cCords[0]*chunkSize;
    const cZ = this.cCords[1]*chunkSize;
    for(let x = 0; x<heights.length;x++)
    {
      for(let z = 0; z<heights[x].length; z++)
      {
        for(let y = heights[x][z];y>maxDepth; y--)
        {
          if(y==heights[x][z])
          {
            addQuad(x+cX,y,z+cZ,"top");
          }
          if(x-1<0||heights[x-1][z]<y)
          { 
            addQuad(x+cX,y,z+cZ,"left");
          }
          if(x+1 >= gridSize-1||heights[x+1][z]<y)
          { 
            addQuad(x+cX,y,z+cZ,"right");
          }
          if(z+1 >= gridSize-1||heights[x][z+1]<y)
          {
            addQuad(x+cX,y,z+cZ,"front");
          }
          if(z-1<0||heights[x][z-1]<y)
          {
            addQuad(x+cX,y,z+cZ,"back");
          }
        }
      }
    }
  }
  addQuad2()
  {

  }//basuically the addquad function but write to the class instead of a global var
  //then when the user requests for the buffergeo info etc return it ez chunk based generation
}



//chunk data storage
//use a map with ChunkCords as the key with chunk as the data being stored
//use a palete. get all the unique blocks in a chunk. store those in an array
//then get the length of the array
//find the closest power of 2 to the length of the array
//2^x => array.length
//take x to create the neccesary amounts of bits needed to store them efficiently 



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