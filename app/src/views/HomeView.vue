<template>
  <div class="screen">
    <div ref="canvasContainer" class="scene-container"></div>
    <div class="debugScreen">
      {{ coordinates }}
    </div>
    <div>
      <InventoryManager v-if="showInventory" class="gui"></InventoryManager>
      <HotBar></HotBar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, render } from "vue";
import InventoryManager from "../components/InventoryManager.vue";
const keys: Record<string, boolean> = {};
window.addEventListener("keydown", (event) => {
  keys[event.key.toLowerCase()] = true;
});
window.addEventListener("keyup", (event) => {
  keys[event.key.toLowerCase()] = false;
});

const showInventory = ref(false);
const paused = ref(false);

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "e") {
    showInventory.value = !showInventory.value;
  } else if (event.key.toLowerCase() === "esc") {
    paused.value = !paused.value;
  }
});

import * as THREE from "three";
import Stats from "stats.js";
import { options } from "../options";
import pako from "pako";

const seed = 2134132131;
const coordinates = ref();

const scene: THREE.Scene = new THREE.Scene();
const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2048
);
const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({ antialias: false });
const pitchObject: THREE.Object3D = new THREE.Object3D().add(camera);
const yawObject: THREE.Object3D = new THREE.Object3D().add(pitchObject);
yawObject.position.set(0, 64, 0);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
scene.add(yawObject);
//mouse movement
const canvasContainer = ref<HTMLElement | null>(null);
const canvas = renderer.domElement;
canvas.addEventListener("click", () => {
  canvas.requestPointerLock();
});
document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement === canvas) {
    document.addEventListener("mousemove", onMouseMove);
  } else {
    document.removeEventListener("mousemove", onMouseMove);
  }
});
let yaw = 0;
let pitch = 0;
function onMouseMove(event: MouseEvent) {
  yaw -= event.movementX * options.mouseSens;
  pitch -= event.movementY * options.mouseSens;
  const maxPitch = Math.PI / 2 - 0.01;
  pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));
  yawObject.rotation.y = yaw;
  pitchObject.rotation.x = pitch;
}

function updateDebug() {
  coordinates.value = `
  ${Math.round(yawObject.position.x)},
  ${Math.round(yawObject.position.y)},
  ${Math.round(yawObject.position.z)}`;
}

let time = 0;
let currentTime = Infinity;

let mouseDown: Array<number> = [];
let duration: Array<number> = [];
document.addEventListener("mousedown", function (event) {
  mouseDown[event.button] = performance.now();
});
document.addEventListener("mouseup", function (event) {
  const currentTime = performance.now();
  duration[event.button] = currentTime - mouseDown[event.button];
});

import { Noise } from "../lib/noise";
import { TerrainGenerator, Mesher2, DataManager } from "../lib/renderer";
import { InvStore } from "../stores/inventory";
import { Player } from "../lib/entitymanager";
import { basicSkySetup } from "../lib/sceneobjects";
import HotBar from "../components/HotBar.vue";

const store = InvStore();
let player = new Player(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), 100);
let dm = new DataManager();
let tg = new TerrainGenerator(seed);
let mesher = new Mesher2();
let skibidisky = new basicSkySetup(scene);
function animate() {
  const delta = (performance.now() - currentTime) / 1000;
  currentTime = performance.now();
  if (showInventory.value) {
    document.exitPointerLock();
  } else {
    canvas.requestPointerLock();
  }
  updateDebug();
  skibidisky.updateSun();
  player.updatePosition(delta, camera, keys, yawObject);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
function init() {
  if (canvasContainer.value && !canvasContainer.value.hasChildNodes()) {
    canvas.style.position = "fixed"; // important
    canvas.style.top = "7vh";
    canvas.style.left = "0";
    canvas.style.zIndex = "0"; // background layer
    canvasContainer.value.appendChild(renderer.domElement);
  }
  skibidisky.setup();
  dm.update(0, 0, 1, tg);
  const stuff = dm.chunkHeights;
  for (let [key, value] of Object.entries(dm.chunkHeights)) {
    const [x, z] = key.split(",").map(Number);
    for (let y = 0; y < value; y++) {
      mesher.createMesh(dm, x, y, z, scene);
    }
  }
  requestAnimationFrame(animate);
}
onMounted(() => {
  store.resetHotbar();
  store.resetInventory();
  store.changeData(0, { id: 1, count: 1 }, "hotbar");

  init();
});
</script>

<style scoped>
.debugScreen {
  position: absolute;
  top: calc(10px+7vh);
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: lime;
  padding: 10px;
  font-family: monospace;
  font-size: 14px;
  z-index: 1000;
}

.gui {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 10;
  width: 100vw;
  height: 100vh;
  pointer-events: auto;
}

.scene-container {
  position: relative;
  z-index: 0;
  height: 93vh;
  width: 100vw;
}

.screen {
  position: relative;
  width: 100vw;
  height: 100vh;
  padding-top: 7vh; /* visual offset (not strictly needed since canvas is fixed) */
}
</style>
