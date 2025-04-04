<template>
  <div>

  </div>
</template>

<script setup lang="ts">
  import { utilMath } from './test';//gives acess to lerp and stuff
  //lerp will be used for perlin noise
  //2d perlin noise = heightmap
  //3d perlin noise =  caves and stuff
  function generateHeightMap()
  {
    
    //get a random graident vector X,Y  where sqrt(x^2+y^2) must equal 1;
    //
  }
  function randGradVector()
  {
    const randAngle =  Math.floor(Math.random() * (361));
    return [Math.cos(randAngle), Math.sin(randAngle)];
  }





</script>

<style scoped>

</style>