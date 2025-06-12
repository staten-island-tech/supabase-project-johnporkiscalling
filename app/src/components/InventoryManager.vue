<template>
  <div class="container">
    <div class="inventory">
      <!-- Inventory slots -->
      <div
        v-for="(slot, index) in inventorySlots"
        :key="'inv-' + index"
        class="inventorySlot"
        @mouseup="dropItem($event, index, 'inventory')"
      >
        <!-- Render item if this slot has one -->
        <div
          v-if="inventory[index]?.id !== null"
          class="item"
          v-show="draggingIndex !== index || draggingSource !== 'inventory'"
          @mousedown="startDrag($event, index, 'inventory')"
        >
          <img :src="NOTUVCORDS[inventory[index]?.id]">
          <span v-if="inventory[index]?.count > 1" class="item-count">
            {{ inventory[index]?.count }}
          </span>
        </div>
      </div>
    </div>

    <div class="hotbar">
      <!-- Hotbar slots -->
      <div
        v-for="(slot, index) in hotbarSlots"
        :key="'hotbar-' + index"
        class="hotbarSlot"
        @mouseup="dropItem($event, index, 'hotbar')"
      >
        <!-- Render item if this slot has one -->
        <div
          v-if="hotbar[index]?.id !== null"
          class="item hotbarItem"
          v-show="draggingIndex !== index || draggingSource !== 'hotbar'"
          @mousedown="startDrag($event, index, 'hotbar')"
        >
          <img :src="NOTUVCORDS[hotbar[index]?.id]">
          <span v-if="hotbar[index]?.count > 1" class="item-count">
            {{ hotbar[index]?.count }}
          </span>
        </div>
      </div>
    </div>

    <!-- Dragged item, follows cursor -->
    <div
      v-if="draggingIndex !== null && draggedItem !== null"
      class="item dragging"
      :class="{ hotbarItem: draggingSource === 'hotbar' }"
      :style="{ left: dragX + 'px', top: dragY + 'px' }"
    >
      <img :src="NOTUVCORDS[draggedItem?.id]">
      <span v-if="draggedItem.count > 1" class="item-count">
        {{ draggedItem.count }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { InvStore } from '@/stores/inventory'
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


const store = InvStore();
console.log(store)
const rows = 4
const cols = 9
const inventorySlots = Array.from({ length: rows * cols })
const hotbarSlots = Array.from({ length: cols })

// Example items - you might want to move this to your store or a separate data file
const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

// Access store data
const inventory = store.inventory
const hotbar = store.hotBar

const draggingIndex = ref<number | null>(null)
const draggingSource = ref<'inventory' | 'hotbar' | null>(null)
const dragX = ref(0)
const dragY = ref(0)
const draggedItem = ref<{id: number | null, count: number} | null>(null)

function startDrag(event: MouseEvent, slotIndex: number, source: 'inventory' | 'hotbar') {
  draggingIndex.value = slotIndex
  draggingSource.value = source
    const itemData = store.readSlot(source, slotIndex)
  if (itemData.id === null) return
  draggedItem.value = { ...itemData }
  store.changeData(slotIndex, { id: null, count: 0 }, source)
  dragX.value = event.clientX - 40
  dragY.value = event.clientY - 40
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
}

function onDrag(event: MouseEvent) {
  dragX.value = event.clientX - 40
  dragY.value = event.clientY - 40
}

function dropItem(event: MouseEvent, slotIndex: number, target: 'inventory' | 'hotbar') {
  if (draggingIndex.value === null || draggedItem.value === null || draggingSource.value === null) return
  if (draggingSource.value === target && draggingIndex.value === slotIndex) {
    store.changeData(draggingIndex.value, draggedItem.value, draggingSource.value)
    stopDrag()
    return
  }
  
  const targetItem = store.readSlot(target, slotIndex)
  
  // If target slot is empty or has the same item
  if (targetItem.id === null || targetItem.id === draggedItem.value.id) {
    // Merge stacks if same item
    if (targetItem.id === draggedItem.value.id) {
      const total = targetItem.count + draggedItem.value.count
      if (total <= 999) {
        // Combine stacks
        store.changeData(slotIndex, { id: draggedItem.value.id, count: total }, target)
      } else {
        // Fill existing stack and leave remainder in dragged item
        store.changeData(slotIndex, { id: draggedItem.value.id, count: 999 }, target)
        draggedItem.value.count = total - 999
        // Return remainder to original position
        store.changeData(draggingIndex.value, draggedItem.value, draggingSource.value)
      }
    } else {
      // Place in empty slot
      store.changeData(slotIndex, draggedItem.value, target)
    }
  } else {
    // Swap items
    const temp = { ...targetItem }
    store.changeData(slotIndex, draggedItem.value, target)
    store.changeData(draggingIndex.value, temp, draggingSource.value)
  }
  
  stopDrag()
}

function stopDrag() {
  if (draggingIndex.value !== null && draggedItem.value !== null && draggingSource.value !== null) {
    // If not dropped on a valid slot, return to original position
    if (document.elementFromPoint(dragX.value, dragY.value) === null) {
      store.changeData(draggingIndex.value, draggedItem.value, draggingSource.value)
    }
  }

  draggingIndex.value = null
  draggingSource.value = null
  draggedItem.value = null
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
})
</script>

<style scoped>
:global(body) {
    overflow: hidden;
    margin: 0;
    padding: 0;
}

.container {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    background: #222;
}

.inventory {
    display: grid;
    grid-template-columns: repeat(9, 80px);
    gap: 5px;
    padding: 20px;
    background: rgba(50, 50, 50, 0.7);
    border: 2px solid #444;
    border-radius: 5px;
}

.hotbar {
    display: grid;
    grid-template-columns: repeat(9, 80px);
    gap: 5px;
    padding: 20px;
    background: rgba(30, 30, 30, 0.9);
    border: 2px solid #666;
    border-radius: 5px;
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
    background-color: #333;
    border: 2px solid #555;
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

.inventorySlot .item {
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