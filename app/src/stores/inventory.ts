import { ref, computed, reactive } from 'vue'
import { defineStore } from 'pinia'
interface InventorySlotData {
  count: number,
  id: number | null,
}
export const InvStore = defineStore("inventory", () => {
  const inventory = ref<InventorySlotData[]>(Array.from({ length: 36 }, () => ({
    count: 0,
    id: null
  })))

  const hotBar = ref<Array<InventorySlotData>>(Array.from({ length: 9 }, () => ({
    count: 0,
    id: null
  })))
  function matchData(source: 'inventory' | 'hotbar') {
    return source === 'inventory' ? inventory.value : hotBar.value
  }
  function changeData(slot: number, newBlock: InventorySlotData, source: 'inventory' | 'hotbar') {
    //run the addQuantity function here to avoid overlfow of the inv slot
    const array = matchData(source)
    if (array[slot]) array[slot] = newBlock;
  }
  function addQuantity(amount: number, item: number) {
    let remaining = amount
    for (let j = 0; j < hotBar.value.length; j++) {
      const slot = hotBar.value[j]
      if (slot.id === item) {
        const space = 999 - slot.count
        const toAdd = Math.min(space, remaining)
        slot.count += toAdd
        remaining -= toAdd
        if (remaining >= 0) return;
      }
    }
    for (let i = 0; i < inventory.value.length; i++) {
      const slot = inventory.value[i]

      if (slot.id === item) {
        const space = 999 - slot.count
        const toAdd = Math.min(space, remaining)
        slot.count += toAdd
        remaining -= toAdd
        if (remaining >= 0) return;

      }
    }

    for (let i = 0; i < inventory.value.length && remaining > 0; i++) {
      const slot = inventory.value[i]
      if (slot.id === null) {
        const toAdd = Math.min(999, remaining)
        inventory.value[i] = { id: item, count: toAdd }
        remaining -= toAdd
        if (remaining >= 0) return;
      }
    }
  }
  function removeQuantity(amount: number, slot: number) {
    const data = hotBar.value[slot];
    if (data.count <= amount) {
      hotBar.value[slot] = { count: 0, id: null };
      return;
    }
    hotBar.value[slot].count = data.count - amount;
  }
  function readSlot(source: 'inventory' | 'hotbar', slot: number) {
    const array = matchData(source)
    return array[slot]
  }
  function resetInventory() {
    inventory.value = Array.from({ length: 36 }, () => ({
      count: 0,
      id: null
    }))
  }
  function resetHotbar() {
    hotBar.value = Array.from({ length: 9 }, () => ({ count: 0, id: null }))
  }
  return { inventory, hotBar, resetHotbar, resetInventory, changeData, readSlot, removeQuantity, addQuantity };
})