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

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setAnimationLoop( animate );
  document.body.appendChild( renderer.domElement );
  const controls = new OrbitControls( camera, renderer.domElement );
  const geometry = new THREE.BoxGeometry( 1, 1, 1 );
  const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
  const cube = new THREE.Mesh( geometry, material );
  scene.add( cube );

  camera.position.z = 5;

  function animate() {

    controls.update();

    renderer.render( scene, camera );

  }
</script>

<style scoped>

</style>