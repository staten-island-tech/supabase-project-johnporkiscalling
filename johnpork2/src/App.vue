<template>
  <div class="main">
    <div ref="canvasContainer"></div>
  </div>
</template>

<script setup lang="ts">
//notes
//orange = x
//blue = z
//green = y



import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { onMounted, onBeforeUnmount, ref } from "vue";
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { width,height,length } from "./config";
import { positionGeometry } from "three/tsl";
import Stats from 'stats.js';
let stats:Stats;
const canvasContainer = ref<HTMLElement | null>(null);
let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls;
const keys: Record<string, boolean> = {};
const geometry = new THREE.BoxGeometry(.5, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
const edgeGeometry = new THREE.EdgesGeometry(geometry);
const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });

const size = 10; // Size of the grid
const divisions = 10; // Number of divisions
const axesHelper = new THREE.AxesHelper(10);
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight); 
const gridHelper = new THREE.GridHelper(size, divisions);
const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5);
// Function to initialize Three.js
function init() {
  // Prevent duplicate initialization
  if (renderer) return;
  scene = new THREE.Scene();
  directionalLight.castShadow = true;
  scene.add( directionalLight )
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 1;
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (canvasContainer.value && !canvasContainer.value.hasChildNodes()) {
    canvasContainer.value.appendChild(renderer.domElement);
  }
  controls = new OrbitControls(camera, renderer.domElement);
  scene.add(axesHelper)
  generateCell();
  doSomething();
  stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);
  stats.dom.style.transform = "scale(2)";  // Adjust scale as needed
  stats.dom.style.transformOrigin = "top left";  // Keep it anchored to the top-left corner
  animate()
};//use this to store data
//if objects contain the same size store them togethher in an objec that contains a positon array to avoid redudant storage of info
let data = [
{
  size:[3,3,1],
  position:[0,0,0],
},
{
  size:[3,1,1],
  position:[0,0,2]
}

]
function generateCell()
{
  data = [//default cell
    {
      size:[3,1,1],
      position:[0,0,0]
    },
    {
      size:[3,1,1],
      position:[0,2,0]
    },
    {
      size:[3,1,1],
      position:[0,0,2]
    },
    {
      size:[3,1,1],
      position:[0,2,2]
    },
    {
      size:[1,1,1],
      position:[0,1,0]
    },
    {
      size:[1,1,1],
      position:[0,1,2]
    },
    {
      size:[1,1,1],
      position:[0,2,1]
    },
    {
      size:[1,1,1],
      position:[0,0,1]
    }
    ,
    {
      size:[1,1,1],
      position:[2,1,0]
    },
    {
      size:[1,1,1],
      position:[2,1,2]
    },
    {
      size:[1,1,1],
      position:[2,2,1]
    },
    {
      size:[1,1,1],
      position:[2,0,1]
    }
  ]
}


function doSomething()//vector addition to select the cube of a given cell using cellReference;
//center of cell can be found by adding 1 to every axises of the coordinate of the cell, 
//cells should start at multiples of 3 since this is 0 indexed -1 to every range to get the right ranges

{
  for(let i = 0; i<data.length;i++)//to place an item at its bottom left corner offset the pos by half of each of the size coordiantes 
  {
    data[i].position[0]+=data[i].size[0]/2, data[i].position[1]+=data[i].size[1]/2, data[i].position[2]+=data[i].size[2]/2;
    const position =  new THREE.Vector3(...data[i].position);
    const geometry =  new THREE.BoxGeometry(...data[i].size);
    const newCube =  new THREE.Mesh(geometry, material);
    newCube.position.copy(position);
    scene.add(newCube);
  }
}

// Animation loop
function animate() {
  stats.begin();
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  stats.end();
}
window.addEventListener( 'resize', onWindowResize, false );
function onWindowResize(){

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}
onMounted(()=>
{
  init()
}
);

// Clean up to prevent memory leaks
onBeforeUnmount(() => {
  if (renderer) {
    renderer.dispose();
    if (canvasContainer.value) {
      canvasContainer.value.innerHTML = ""; // Remove canvas on unmount
    }
  }
});
</script>

<style scoped>
canvas {
  width: 100%;
  height: 100%;
}
.temporary
{
  width:100%;
  height:400px;
}
.bar
{
  background-color: green;
  position:absolute;
  width:100%;
  height:200px
}
</style>
