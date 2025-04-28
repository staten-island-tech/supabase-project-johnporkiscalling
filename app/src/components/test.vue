<script setup lang="ts">
import { ref } from "vue";

const open = ref(false);

function spin() {
  open.value = !open.value; // Toggle rotation state
}
</script>

<template>
  <div class="login">
    <header>
      <div class="wrapper">
        <nav>
          <button class="account">
            <img src="./assets/grass.png" alt="Account" :class="{ rotated: open }" @click="spin" />
          </button>
        </nav>
      </div>
    </header>
  </div>
</template>

<style scoped>
.account img {
  height: 35px;
  width: 35px;
  object-fit: cover;
  border-radius: 5px;
  transform-origin: center;
  transition: transform 0.4s ease-out; /* Smooth transition */
}

.account img.rotated {
  transform: rotate(90deg); /* Rotate the image when the 'rotated' class is added */
}
</style>
