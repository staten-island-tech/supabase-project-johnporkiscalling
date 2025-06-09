<template>
    <div class="hotbar">
      <div
        v-for="(slot, index) in hotbarSlots"
        :key="'hotbar-' + index"
        class="hotbarSlot"
      >
        <div
          v-if="hotbar[index]?.id !== null"
          class="item hotbarItem"
        >
          {{ items[hotbar[index]?.id] || '' }}
          <span v-if="hotbar[index]?.count > 1" class="item-count">
            {{ hotbar[index]?.count }}
          </span>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
    import { InvStore } from '@/stores/inventory';
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
    background: rgba(30, 30, 30, 0.9);
    border: 2px solid #666;
    border-radius: 5px;
    align-items: center;
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
    background-color: #4caf50;
}

.hotbarSlot .hotbarItem {
    background-color: #2196f3;
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