<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
import { ref } from "vue";
import LogIn from "./components/LogIn1.vue";
const loggedin = ref(true);
const wantstologin = ref(false);
</script>

<template>
  <div class="login" v-if="wantstologin">
    <LogIn @login="(loggedin = true), (wantstologin = false)" />
  </div>
  <div v-else-if="!wantstologin || loggedin">
    <header>
      <div class="wrapper">
        <nav>
          <button class="account">
            <Transition> <img src="./assets/grass.png" alt="" @click="" /></Transition>
          </button>
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

<style scoped>
/* --------------------logged in = true-------------------- */
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
  image-rendering: crisp-edges;
  transition: 0.4s ease-out;
}
.account img:hover {
  transform: scale(1.3);
}
.main {
  width: 100%;
  height: 100%;
  align-items: center;
}
/* .accountimg: */
.v-enter-from,
.v-leave-to {
  transform: rotate(0);
}
.v.enter-to,
.v-leave-from {
}
.v-enter-active,
.v-leave-active {
  transition: all 0.5s ease-out;
}
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
