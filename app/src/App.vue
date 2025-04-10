<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
import { ref } from "vue";

const loggedin = ref(false);
function submit() {}
</script>

<template>
  <div class="login" v-if="!loggedin">
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
    </div>
    <div class="overlay"></div>
    <div class="front">
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
  </div>
  <div v-if="loggedin">
    <header>
      <div class="wrapper">
        <nav>
          <div class="border"><RouterLink to="/">Home</RouterLink></div>
          <div class="border"><RouterLink to="/about">About</RouterLink></div>
          <div class="border"><a href="" @click="loggedin = false">Log out</a></div>
        </nav>
      </div>
    </header>

    <RouterView />
  </div>
</template>

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
  height: 50%;
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
  box-shadow: 0 0 15px #1f1f1f;
}
.sides {
  width: 30%;
  height: 100%;
}
.p {
  height: 25%;
}
.log {
  font-weight: 900;
  font-size: 2.5rem;
  width: 100%;
  height: 15%;
  text-align: center;
  color: #f2f3f3;
  text-shadow: 0 0 15px #f2f3f3;
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
  border: 3px solid rgba(190, 202, 206, 0.7);
  background-color: #ececec;
  transition: 0.1s;
}
input:active {
  border: 3px solid rgba(190, 202, 206, 0.7);
}
input::placeholder {
  color: #c4c9cb;
}
button {
  padding: 0.2rem 1rem 0.2rem 1rem;
  border: 3px solid transparent;
  border-radius: 7px;
  transition: border 0.3s ease;
  background-color: #f4fdff;
  color: #959697;
}

button:hover {
  border: 3px solid rgba(190, 202, 206, 0.7);
}
button:active {
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
  background: radial-gradient(circle, #ffffff00, #000000);
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
}
/* --------------------logged in = true-------------------- */
header {
  line-height: 1.5;
  max-height: 100vh;
}
nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: #dfe4e7;
  background-color: #2c3e50;
}
a {
  color: black;
  text-decoration: none;
  font-weight: 500;
  background-color: #d2dbe259;
  border-radius: 5px;
  width: 120px;
  padding: 0rem 1rem 0rem 1rem;
  height: 100%;
}
a:hover {
  color: grey;
  background-color: #c2c9ce5e;
}
a:focus {
  background-color: #afb4b896;
}
.border {
  display: inline-block;
  padding: 0 0.125rem;
  border-left: 1.5px solid var(--color-border);
  text-decoration: none;
}

.border:first-of-type {
  border: 0;
}
</style>
