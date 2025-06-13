<template>
    <div class="hotbar">
    <div
      v-for="(slot, index) in hotbarSlots"
      :key="'hotbar-' + index"
      :class="['hotbarSlot', { 'active-slot': index === selectedSlot }]"
    >
        <div
          v-if="hotbar[index]?.id !== null"
          class="item hotbarItem"
        >
          <img :src="NOTUVCORDS[hotbar[index]?.id]">
          <span v-if="hotbar[index]?.count > 1" class="item-count">
            {{ hotbar[index]?.count }}
          </span>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { InvStore } from '../stores/inventory';
const NOTUVCORDS: Record<number, string> = {
  1: new URL('@/assets/stone.png', import.meta.url).href,
  2: new URL('@/assets/dirt.png', import.meta.url).href,
  3: new URL('@/assets/green_wool.png', import.meta.url).href,
  4: new URL('@/assets/sand.png', import.meta.url).href,
  5: new URL('@/assets/water_still.png', import.meta.url).href,
  6: new URL('@/assets/snow.png', import.meta.url).href,
  7: new URL('@/assets/ice.png', import.meta.url).href,
  8: new URL('@/assets/coal_ore.png', import.meta.url).href,
  9: new URL('@/assets/iron_ore.png', import.meta.url).href,
  10: new URL('@/assets/gold_ore.png', import.meta.url).href,
  11: new URL('@/assets/diamond_ore.png', import.meta.url).href,
  12: new URL('@/assets/bedrock.png', import.meta.url).href,
  13: new URL('@/assets/clay.png', import.meta.url).href,
  14: new URL('@/assets/gravel.png', import.meta.url).href,
  15: new URL('@/assets/obsidian.png', import.meta.url).href
};
defineProps<{
  selectedSlot: number
}>();
const store =  InvStore();
const hotbar = store.hotBar;
const hotbarSlots = Array.from({ length: 9 })
const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
</script>

<style scoped>
.hotbar {
    display: grid;
    grid-template-columns: repeat(9, 80px);
    gap: 5px;
    padding: 20px;
    background: rgba(30, 30, 30, 0.1);
    border: 2px solid #666;
    border-radius: 5px;
    align-items: center;
}
.active-slot {
    z-index: 20;
    box-shadow: 0 0 100px #FFD700;
}
.inventorySlot, .hotbarSlot {
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
}

.inventorySlot {
    background-color: #444;
    border: 2px solid #777;
}

.hotbarSlot {
    background-color: rgba(0,0,0,0.3);
    border: 2px solid #000;
}

.item {
    width: 100%;
    height: 100%;
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: grab;
    user-select: none;
    font-weight: bold;
    font-size: 24px;
    position: relative;
}
.dragging {
    position: absolute;
    pointer-events: none;
    z-index: 1000;
    width: 80px;
    height: 80px;
    border-radius: 4px;
    user-select: none;
    opacity: 0.8;
}

.item-count {
    position: absolute;
    bottom: 5px;
    right: 5px;
    font-size: 16px;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>