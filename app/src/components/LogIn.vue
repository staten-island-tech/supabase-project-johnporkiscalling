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
<style scoped>
/* --------------------logged in = false-------------------- */
.front {
  z-index: 10;
  height: 100vh;
}
.login {
  height: 100%;
  width: 100%;
  position: absolute;
  top: 0%;
  left: 0%;
  z-index: 2;
}
.logincontainer {
  height: 37%;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: center;
}
.loginview {
  background-color: #1f1f1f;
  border-radius: 7px;
  height: 100%;
  width: 30%;
  box-shadow: 0 0 15px #7d7d7d;
}
.sides {
  width: 30%;
  height: 100%;
}
.p {
  height: 31.5%;
}
.log {
  font-weight: 900;
  font-size: 2.5rem;
  width: 100%;
  height: 15%;
  text-align: center;
  color: #f2f3f3;
  text-shadow: 0 0 15px #f2f3f3;
  margin: 5% 0 3% 0;
}
form {
  display: flex;
  flex-direction: column;
  /* justify-content: center; */
  height: 85%;
  align-items: center;
}
input {
  margin-bottom: 1.5rem;
  padding: 0.2rem 1rem 0.2rem 1rem;
  border: 3px solid transparent;
  border-radius: 7px;
  background-color: #f4fdff;
  outline: none;
  color: #959697;
  transition: border-color 0.3s ease;
  width: 80%;
  height: 10%;
}
input:first-of-type {
  margin-top: 3rem;
}
input:focus {
  border: 3px solid rgba(31, 31, 31, 0.3);
  background-color: #ececec;
  transition: 0.2s;
}
input:active {
  border: 3px solid rgba(31, 31, 31, 0.55);
  transition: 0.2s;
}
input::placeholder {
  color: #1f1f1fb0;
  transition: 0.2s;
}
button {
  padding: 0.2rem 1rem 0.2rem 1rem;
  border: 3px solid transparent;
  border-radius: 7px;
  transition: border 0.3s ease;
  background-color: #f4fdff;
  color: #1f1f1fb0;
}

button:hover {
  border: 3px solid rgba(31, 31, 31, 0.3);
  transition: 0.1s;
}
button:active {
  border: 3px solid rgba(31, 31, 31, 0.55);
  background-color: #ececec;
  transition: 0.1s;
}
/* --------------------background--------------------- */
.background {
  height: 100vh;
  width: 100vw;
  z-index: -1;
  display: flex;
  flex-direction: column;
  position: absolute;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  background-color: #1f1f1f;
}
.overlay {
  z-index: -1;
  background: radial-gradient(circle, #ffffff00 60%, #1f1f1f 90%);
  height: 100%;
  width: 100%;
  position: absolute;
}
/* .row {
  height: 12.5vw;
  width: 100%;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
} */
.square {
  box-sizing: border-box;
  background-color: #dfe4e7;
  background-image: url(../src/assets/grass.png);
  border-radius: 7px;
  margin: 1vh;
  width: 11.5%;
  height: 11.5vw;
  background-size: cover;
  z-index: 1;
}
.cursor {
  position: absolute;
  height: 40vh;
  width: 40vh;
  background: radial-gradient(
    circle closest-side,
    rgba(47, 172, 15, 1) 0%,
    rgba(46, 172, 15, 0.708) 50%,
    rgba(46, 172, 15, 0.447) 59%,

    rgba(255, 255, 255, 0) 70%,
    rgba(255, 255, 255, 0) 100%
  );
  z-index: 0;
  border-radius: 50%;
  top: 23%;
  left: 73%;
  transform: translate(-50%, -50%);
}
</style>
