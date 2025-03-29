<template>
  <div>
  </div>
</template>

<script setup lang="ts">
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/Addons.js';
  import type { string } from 'three/tsl';
  import { render } from 'vue';
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
  const renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setAnimationLoop( animate );
  document.body.appendChild( renderer.domElement );
  const controls = new OrbitControls( camera, renderer.domElement );
  const geometry = new THREE.BoxGeometry(1,1,1);
  const material = new THREE.MeshBasicMaterial({color:0x0000FF})
  const cube = new THREE.Mesh( geometry, material );
  const edgeGeometry = new THREE.EdgesGeometry(geometry);
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
  const size = 10; // Size of the grid
  const divisions = 10; // Number of divisions
  const axesHelper = new THREE.AxesHelper(10); // 5 is the length of the axes
  scene.add(axesHelper);
  const gridHelper = new THREE.GridHelper(size, divisions);
  scene.add(gridHelper); // White outline
  const keys:Record<string,boolean>= {};

// Listen for keyboard events
  window.addEventListener('keydown', (event) => {
    keys[event.code] = true;
  });
  window.addEventListener('keyup', (event) => {
    keys[event.code] = false;
  });
  const cubeData:Object = {};
  function test()
  {
    for(let x = 0; x<10; x++)
    {
      for(let y = 0; y<10; y++)
      {
        for(let z = 0; z<10; z++)
        {
          let position =  new THREE.Vector3(x,y,z);
          let mesh =  new THREE.Mesh(geometry, material);
          let outline = new THREE.LineSegments(edgeGeometry, edgeMaterial);
          outline.position.copy(position);
          mesh.position.copy(position);
          scene.add(mesh);
          scene.add(outline);
        }
      }
    }
  }
  function test2()
  {
    for(let x = 0; x<10; x++)
    {
      for(let y = 0; y<10; y++)
      {
        for(let z = 0; z<10; z++)
        {
          let position =  new THREE.Vector3(-x,-y,-z);
          let mesh =  new THREE.Mesh(geometry, material);
          let outline = new THREE.LineSegments(edgeGeometry, edgeMaterial);
          outline.position.copy(position);
          mesh.position.copy(position);
          scene.add(mesh);
          scene.add(outline);
        }
      }
    }
  }
  test()
  test2();

  const cellReference:Record<string, Array<number>> =
  {
    "up":[0,0,1],
    "down":[0,0,-1],
    "left":[-1,0,0],
    "right":[1,0,0],
    "forward":[0,1,0],
    "back":[0,-1,0],
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
    const range = [[position[0]-1*3, position[0]],[position[1]-1*3, position[1]],[position[2]-1*3, position[2]]]
    cellInfo.forEach((value, key) => {
      if(value)
      {
        //for 1,1,1 the center would actually be 2,2,2
      };
    });//using cellReference find the offset from the center and use that for figuring out where all the other stiff should be 
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
    if (keys['ArrowUp'] || keys['KeyW']) 
    {
    }
    if (keys['ArrowDown'] || keys['KeyS']) 
    {
    }
    if (keys['ArrowLeft'] || keys['KeyA']) 
    {
    }
    if (keys['ArrowRight'] || keys['KeyD']) 
    {
    }
  }
</script>

<style scoped>
  canvas{
    width:100%;
    height:100%;
  }
</style>