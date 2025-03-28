<template>
  <div>
    Ligma
  </div>
</template>

<script setup lang="ts">
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/Addons.js';
  import { render } from 'vue';
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
  const renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setAnimationLoop( animate );
  document.body.appendChild( renderer.domElement );
  const controls = new OrbitControls( camera, renderer.domElement );
  const geometry = new THREE.BoxGeometry( 1, 1, 1 );
  const material = new THREE.MeshLambertMaterial({
    color: 0xff0000,       // Red color
    emissive: 0x330000,    // Slight emissive glow
    opacity: 0.8,          // Slight transparency
    transparent: true,     // Enable transparency
    wireframe: false       // Render as solid mesh
  });
  const cube = new THREE.Mesh( geometry, material );
  const edgeGeometry = new THREE.EdgesGeometry(geometry);
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 }); // White outline
  const outline = new THREE.LineSegments(edgeGeometry, edgeMaterial);


  scene.add(cube);
  scene.add(outline);
  const cellReference:Record<string, Array<number>> =
  {
    "up":[],
    "down":[],
    "left":[],
    "right":[],
    "forward":[],
    "back":[],

  };
  console.log(cube)
  function renderCell(position:Array<number>, cellInfo:Map<string,boolean>, material:THREE.Material, geometry:THREE.GeometryGroup)
  {
    //new material is passed on for a given cell
    //geometry like size of the thing is passed in by the user
    //cellinfo is basically just which sides are open. that stuff will be handled by some function i write
    
    //the hard part is figuring out how to place the cubes in the grid space. the amount of cubes needed is already known
    //optimizations can be done here. since the cell consists of a cube consisting of 27 cubes
    const maxGeoms:number = 26-cellInfo.size;//maximum amount of possible geometries. 26 cuz centered is hollowed out.
    const range = position.forEach(item=>
      {
        
      }
    )
  }
  const testCell:Record<string,boolean> = //change this to a map later on more efficient for storing cords points
  {
    "up":true,
    "down":false,
    "left":false,
    "right":false,
    "forward":false,
    "back":false,
  }
  
  //1 cell = a 3 by 3 grid of cubes to allow for removal of walls

  camera.position.z = 5;

  function animate() {

    controls.update();

    renderer.render( scene, camera );

  }
</script>

<style scoped>

</style>