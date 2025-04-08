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
const stats = new Stats();
document.body.appendChild(stats.dom);
const gridSize = 256; 
const gradients = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 0.5], [-1, 0.5], [0.5, 1], [-0.5, 1],
  [1, -0.5], [-1, -0.5], [0.5, -1], [-0.5, -1]
]; 
const hashTable =  Perlin.permutate(1010101011);
function hash(x:number, y:number){
  return hashTable[(hashTable[(x & 255) + hashTable[y & 255]] & 255)];
}
const freq = 0.1;//the distance between dips and peaks
const amp = 0.5;//the max height
const pers = .3;//smoothness higher =  more smooth
const eta = 0.00001;//small offset value to ensure non-zero values
const scale = 0.1;//scale it to ensure non-zero values
const height = 64;//the default height
const octaves = 5;//the amount of times to run the function to get more detail
const grid = Array.from({length:gridSize}, (_,i)=>
  Array.from({length:gridSize}, (_,f)=>
    Math.abs(Math.floor(octavePerlin((i+eta)*scale, (f+eta)*scale, octaves, pers, amp, freq)*10)))
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







const textureLoader = new THREE.TextureLoader();
const canvasContainer = ref<HTMLElement | null>(null)
let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls;
const geometry = new THREE.BoxGeometry(1, 1, 1);
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2048);
function loadBlockTexture(path:string)
{
  const tex = textureLoader.load(path);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.premultiplyAlpha = false;
  return tex;
};
interface mipMap 
{
  image:(HTMLImageElement | HTMLCanvasElement | ImageBitmap),
  width:number,
  height:number,
}
function mipMap(url: string, mippityMappitys: Array<(HTMLImageElement | HTMLCanvasElement | ImageBitmap)>) {
  const texture = textureLoader.load(url, () => {
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    mippityMappitys.forEach((mipmap, index) => {
      // Create the mipmap object with the correct type
      const mipmapData: THREE.mipMap = {
        image: mipmap,
        width: mipmap.width,
        height: mipmap.height,
      };

      // Push the mipmap data to the texture's mipmaps array
      texture.mipmaps?.push(mipmapData);
    });

    // Mark texture as updated
    texture.needsUpdate = true;
  });
}

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
  }
};
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
  const top =  y /texHeigh;
  const bottom = (y+h)/texHeigh;
  return [
        left, bottom,  // bottom-left
        right, bottom, // bottom-right
        right, top,    // top-right
        left, top      // top-left
  ];
}


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
function animate() {
  requestAnimationFrame(animate);
  stats.begin();
  controls.update();
  renderer.render(scene, camera);
  stats.end();
}
const testBuffer = new THREE.BufferGeometry();
const vertices:Array<number> = []
const indexes:Array<number> = [];
const UV:Array<number> = [];
let offset = 0;
import { faceDirections, uvCords } from './stupidlylongvariables';

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
  testBuffer.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));  

  testBuffer.setIndex(indexes);
  const mesh =  new THREE.Mesh(testBuffer, materialArray);
  scene.add(mesh);
  console.log(offset/4)
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