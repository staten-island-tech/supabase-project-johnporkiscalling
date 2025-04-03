<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
import { ref, Ref } from "vue";

const loggedin = ref(false);
</script>

<template>
  <div class="login" v-if="!loggedin">
    <div class="logincontainer"></div>
  </div>
  <div v-if="loggedin">
    <header>
      <div class="wrapper">
        <nav>
          <div class="border"><RouterLink to="/">Home</RouterLink></div>
          <div class="border"><RouterLink to="/about">About</RouterLink></div>
        </nav>
      </div>
    </header>

    <RouterView />
  </div>
</template>

<style scoped>
/* --------------------logged in = false-------------------- */
.login {
  height: 100vh;
  width: 100%;
  position: absolute;
  top: 0%;
  left: 0%;
}
.logincontainer {
  height: 100%;
  margin: 30rem 40rem 30rem 40rem;
  background-color: blue;
  border-radius: 7px;
  display: flex;
  flex-direction: column;
  justify-content: center;
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
