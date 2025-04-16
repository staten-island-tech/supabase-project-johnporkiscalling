<template>
  <div ref="canvasContainer" class="scene-container"></div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import Stats from 'stats.js';



import { util3d } from './utils';    
import { Noise } from './noisefunct';
import { configurationInfo } from './config';
import { faceDirections } from './stupidlylongvariables';
import { array } from 'three/tsl';
const seed = 121214141414124;
const noiseMachine =  new Noise(seed);
const stats = new Stats();
document.body.appendChild(stats.dom);

const freq = .1;//the distance between dips and peaks
const amp = 1;//the max height
const pers = .001;//smoothness lower =  more smooth
const eta = 0.00001;//small offset value to ensure non-zero values
const scale = 0.1;//scale it to ensure non-zero values
const octaves = 2;


const textureLoader = new THREE.TextureLoader();
const canvasContainer = ref<HTMLElement | null>(null)    
let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls;
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2048);


function init() {
    if (renderer) return;
    camera.position.set(0, 1, 5); // Starting position
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (canvasContainer.value && !canvasContainer.value.hasChildNodes()) {
        canvasContainer.value.appendChild(renderer.domElement);
    }
    controls = new OrbitControls(camera, renderer.domElement);
    const bufferArray = [];
    for(let x = -20; x<10; x++)
    {
        for(let z = -20; z<10; z++)
        {
            const chunkTest =  new WorldChunk([x,z]);
            chunkTest.createChunk();
            const {buffer, UVs, indices, vertices} = chunkTest.returnData();
            chunkTest.destroy();
            bufferArray.push(buffer);
            const mesh = new THREE.Mesh(buffer, blocksMaterial)
            scene.add(mesh);       
        }
    }
    animate()
}
function animate() {
    requestAnimationFrame(animate);
    stats.begin();
    controls.update()
    renderer.render(scene, camera);
    stats.end();
}
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
const texture0 = loadBlockTexture('./src/assets/blockAtlases/atlas0.png')//16
const blocksMaterial = new THREE.MeshBasicMaterial({map:texture0,side: THREE.DoubleSide})
const blockUVs:Record<string,Array<number>> = {
  top: util3d.getUVCords('minecraft:block/grass_block_top'),
  right: util3d.getUVCords('minecraft:block/grass_block_side'),
  left: util3d.getUVCords('minecraft:block/grass_block_side'),
  front: util3d.getUVCords('minecraft:block/grass_block_side'),
  back: util3d.getUVCords('minecraft:block/grass_block_side'),
  bottom: util3d.getUVCords('minecraft:block/dirt'), // for example
};
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
    const cX = this.cCords[0]*configurationInfo.chunkSize;
    const cZ = this.cCords[1]*configurationInfo.chunkSize;
    const heights:Array<Array<number>> = 
    Array.from({length:16}, (_,x)=>
        Array.from({length:16}, (_,z)=>
        (Math.floor(( noiseMachine.octaveNoise((x+cX+eta)*scale, (z+cZ+eta)*scale, octaves, pers, amp, freq, noiseMachine.simplex.bind(noiseMachine)))*configurationInfo.maxHeight))
        )
    )
    console.log(heights);
    return heights;
    
  }
  //make it return an 18 by 18 grid instead to get the neighbors and then operate on them with the knoweldge that 0 0 is bad
  createheights(x: number, z: number): Array<Array<number>> {
    const cX = x * configurationInfo.chunkSize;
    const cZ = z * configurationInfo.chunkSize;
    return  Array.from({ length: 18 }, (_, x) =>
            Array.from({ length: 18 }, (_, z) =>
            Math.floor(
                noiseMachine.octaveNoise(
                (x + cX + eta - 1) * scale,
                (z + cZ + eta - 1) * scale,
                octaves,
                pers,
                amp,
                freq,
                noiseMachine.simplex.bind(noiseMachine)
                ) * configurationInfo.maxHeight
            )
            )
        );
    }
    createChunk() {
        const heights: Array<Array<number>> = this.createheights(this.cCords[0], this.cCords[1]);
        const cX = this.cCords[0] * configurationInfo.chunkSize;
        const cZ = this.cCords[1] * configurationInfo.chunkSize;
        for (let x = 1; x < 17; x++) {
            const coX = cX + (x - 1); 
            for (let z = 1; z < 17; z++) {
            const coZ = cZ + (z - 1);
            const height = heights[x][z];
                for (let y = height; y > configurationInfo.maxDepth; y--) {
                    if (y == height) {
                    this.addQuad(coX, y, coZ, "top");
                    }
                    if (heights[x - 1][z] < y) {
                    this.addQuad(coX, y, coZ, "left");
                    }
                    if (heights[x + 1][z] < y) {
                    this.addQuad(coX, y, coZ, "right");
                    }
                    if (heights[x][z + 1] < y) {
                    this.addQuad(coX, y, coZ, "front");
                    }
                    if (heights[x][z - 1] < y) {
                    this.addQuad(coX, y, coZ, "back");
                    }
                }
            }
        }

        this.buffer.setAttribute('position', new THREE.Float32BufferAttribute(this.vertices, 3));
        this.buffer.setAttribute('uv', new THREE.Float32BufferAttribute(this.UVs, 2));
        this.buffer.setIndex(this.indices);
    }
  addQuad(x:number, y:number, z:number, dir:string)//modify this to allow a texture type to be passed in
  {
    const offSetValues = faceDirections[dir];
    this.vertices.push(//get da corners
      x + offSetValues[0], y + offSetValues[1], z + offSetValues[2],
      x + offSetValues[3], y + offSetValues[4], z + offSetValues[5],
      x + offSetValues[6], y + offSetValues[7], z + offSetValues[8],
      x + offSetValues[9], y + offSetValues[10], z + offSetValues[11],
    )

    this.indices.push(this.offset, this.offset+1, this.offset+2, this.offset+2, this.offset+3, this.offset);
    const texturew = blockUVs[dir]
    this.UVs.push(...texturew);
    this.offset+=4;
  }
  returnData()
  {
    return {
      buffer: this.buffer,
      UVs: this.UVs,
      indices: this.indices,
      vertices:this.vertices
    }
  }
  destroy()
  {
    this.buffer.dispose();
  }
}
onMounted(()=>
{
    init()

})



</script>

<style scoped>

</style>