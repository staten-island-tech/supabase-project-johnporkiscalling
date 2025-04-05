<template>
  <div>

  </div>
</template>

<script setup lang="ts">
import { utilMath } from './test';//gives acess to lerp and stuff
import { Perlin } from './testicle';
const gradients = [
  [1, 1], [-1, 1], [1,-1], [-1,-1],
  [1, 0], [-1, 0], [0, 1], [0, -1]
]
const hashTable =  Perlin.permutate(2312131);
function hash(x:number, y:number){
  return hashTable[((x%256)+y)%256]
}

console.log(hash(0,0));
const gridSize = 32;
const grid = Array.from({length:gridSize}, (_,i)=> 
  Array.from({length:gridSize}, (_,f)=>octavePerlin((i+0.00001)*0.1, (f+0.00001)*0.1, 1, 1))//call the noise function here
  //for the thing do the noise function with a scale of .1 and add an offset value to prevent 0 from being used in the noise func

);//generates a 256 long grid
console.log(grid);
//put perlinNose and octavePerlin into the perlin object
//initialize the hashtable first from perlin Object
//use



function noise(x:number,y:number)//gotta add something else to make it more varied 
{
  //get the truncated int
  const xi = Math.floor(x)
  const yi = Math.floor(y)

  //get the decimals
  const xf = x - xi;
  const yf = y - yi;
  
  //smooth it
  const u = utilMath.fade(xf);
  const v = utilMath.fade(yf);

  //get the grad unit vectors index
  const v00 = hash(xi,yi) %8;
  const v01 = hash(xi,yi+1)%8;
  const v10 = hash(xi+1,yi)%8;
  const v11 = hash(xi+1,yi+1)%8;
  
  //calculate the dot products between grad and displacement vectors
  const dp00 = gradients[v00][0] * xf + gradients[v00][1] * yf;
  const dp01 = gradients[v01][0] * xf + gradients[v01][1] * (yf-1);
  const dp10 = gradients[v10][0] * (xf-1) + gradients[v10][1] * yf;
  const dp11 = gradients[v11][0] * (xf-1) + gradients[v11][1] * (yf-1);

  //lerp it
  const x1 = utilMath.lerp(dp00, dp10, u);
  const x2 = utilMath.lerp(dp01, dp11, u);
  return utilMath.lerp(x1, x2, v)*0.3; 
}
//octaves =  how many times to run perlin. higher = more details
//persistence =  bias of pre existing highs and lows p<.5 reversal so high =  low 0.5 =  standard brown
function octavePerlin(x:number, y:number, octaves:number, persistence:number)
{
  let total = 0; 
  let frequency = 1;
  let maxValue = 0;
  let amplitude = 1;
  for(let i = 0; i<octaves; i++)
  {
    total+=noise(x*frequency, y*frequency) * amplitude;
    maxValue+=amplitude;
    frequency *= 2;
    amplitude *= persistence;
  }
  return total/maxValue;
}




</script>

<style scoped>

</style>