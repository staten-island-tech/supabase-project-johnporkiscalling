<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
import { ref } from "vue";
import LogIn from "./components/LogIn1.vue";
const loggedin = ref(false);
const wantstologin = ref(false);
const open = ref(false);

function spin(event: MouseEvent) {
  event.stopPropagation(); // prevent triggering document click
  open.value = !open.value;
}
function close() {
  if (open.value) open.value = false;
}
</script>

<template>
  <div class="login" v-if="wantstologin">
    <LogIn @login="(loggedin = true), (wantstologin = false)" />
  </div>
  <div v-else-if="!wantstologin || loggedin">
    <header>
      <div class="wrapper" @click="close">
        <nav>
          <button class="account">
            <img src="./assets/grass.png" alt="Account" :class="{ rotated: open }" @click="spin" />
          </button>
          <Transition name="fade-slide">
            <div
              class="dropdown"
              v-if="open"
              @click="(event: MouseEvent) => event.stopPropagation()"
            >
              <div class="youraccount">
                <h1 class="header" v-if="loggedin">Your Account</h1>
                <h1 class="header" v-else>Please Log in to see your account</h1>
              </div>
              <div class="settings"><h2>Settings</h2></div>
              <div style="transform: translateY(-15px)" v-if="!loggedin">
                <h5>In order to save your settings, please log in</h5>
              </div>
            </div>
          </Transition>
          <div class="main">
            <div class="border"><RouterLink to="/">Home</RouterLink></div>
            <div class="border"><RouterLink to="/about">About</RouterLink></div>

            <div class="border" v-if="loggedin">
              <a href="" @click.prevent="(loggedin = false), (wantstologin = false)">Log out</a>
            </div>
            <div class="border" v-if="!loggedin">
              <a href="" @click.prevent="wantstologin = true">Log in</a>
            </div>
          </div>
        </nav>
      </div>
    </header>
    <RouterView />
  </div>
</template>

<!-- simplest solution: @click.stop -->

<style scoped>
/* --------------------logged in = true-------------------- */
.settings {
  height: 93%;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  color: #1f1f1f;
  transform: translate(-17vw, 40px) !important;
}
.fade-slide-enter-active {
  transition: all 0.3s ease-out;
}
.wrapper {
  width: 98%;
  height: 100%;
  border-bottom: 1px solid #dfe4e7;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.account {
  height: 100%;
  background: none;
  border: none;
  padding: 0;
  margin-right: 1rem;
  display: flex;
  align-items: center;
  position: absolute;
}
.account img {
  height: 35px;
  width: 35px;
  object-fit: cover;
  border-radius: 5px;
  transform-origin: center;
  /* image-rendering: crisp-edges; */
  transition: 0.4s ease-out;
}
.account img:hover:not(.rotated) {
  transform: scale(1.3);
}
.account img.rotated {
  transform: rotate(90deg);
}
.account img.rotated:hover {
  transform: rotate(90deg) scale(1.3);
}
.dropdown {
  height: 75vh;
  width: 25vw;
  position: absolute;
  transform: translateY(34px);
  background-color: #1f1f1f;
  box-shadow: 0 0 7px #dadada;
  border-radius: 5px;
  transition: 0.3s ease-out;
  top: 0%;
  left: 0%;
}
.account:hover + .dropdown {
  transform: translate(-5.5px, 39px);
}
.youraccount {
  height: 7%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.header {
  border-bottom: 1.5px solid #ffffff;
  width: 95%;
  border-radius: 3px;
}
.main {
  width: 100%;
  height: 100%;
  align-items: center;
}
/* .accountimg: */
/* .v-enter-from,
.v-leave-to {
  transform: rotate(0deg);
}
.v-enter-to,
.v-leave-from {
  transform: rotate(270deg);
}
.v-enter-active,
.v-leave-active {
  transition: all 0.7s ease-out;
} */

/* --------------------buttons-------------------- */
header {
  line-height: 1.5;
  height: 7vh;
  display: flex;
  flex-direction: row;
  justify-content: center;
}
nav {
  display: flex;
  flex-direction: row;
  height: 50%;
  width: 100%;
  font-size: 12px;
  text-align: center;
  position: relative;
}

nav a.router-link-exact-active {
  color: #dfe4e7;
  background-color: #1f1f1f;
  border: 2px solid #dfe4e7;
}
a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 1rem;
  background-color: #dadada;
  color: black;
  text-decoration: none;
  font-weight: 500;
  border-radius: 5px;
  width: 120px;
  transition: border-color 0.3s ease, background-color 0.5s ease;
}
a:hover {
  color: lightgrey;
  background-color: #8b8b8b;
  border: 1px solid #dfe4e7;
}
a:focus {
  background-color: #525252;
}
.border {
  display: inline-block;
  padding: 0 0.125rem;
  border-left: 1.5px solid var(--color-border);
  text-decoration: none;
  height: 100%;
}

.border:first-of-type {
  border: 0;
}
</style>
<!-- #aaedee  -->
<!-- #ddaadd  -->
