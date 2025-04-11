<template>
  <div class="background">
    <!-- <div class="row"> -->
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <!-- </div>
    <div class="row"> -->
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <!-- </div>
    <div class="row"> -->
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <!-- </div>
    <div class="row"> -->
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <div class="square"></div>
    <!-- </div> -->
    <div class="cursor" ref="cursor"></div>
  </div>
  <div class="overlay"></div>
  <div class="front" @mousemove="mouse">
    <div class="p"></div>
    <div class="logincontainer">
      <div class="sides"></div>
      <div class="loginview">
        <div class="log">PLEASE LOGIN</div>
        <form @submit.prevent="submit()">
          <input type="text" placeholder="Email" />
          <input type="text" placeholder="Password" />
          <button type="submit" @click="loggedin = true">Login!</button>
        </form>
      </div>
      <div class="sides"></div>
    </div>
    <div class="p"></div>
  </div>
</template>
<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
import { ref } from "vue";

const loggedin = ref(false);
// let x = ref(null)
// let y = ref(null)
const cursor = ref<HTMLElement | null>(null);
function mouse(e: MouseEvent) {
  if (cursor.value) {
    cursor.value.style.left = `${e.clientX}px`;
    cursor.value.style.top = `${e.clientY}px`;
  }
  console.log("works");
}
function submit() {}
</script>
