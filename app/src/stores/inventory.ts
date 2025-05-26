import { ref, computed, reactive } from 'vue'

import { defineStore } from 'pinia'

export const inventoryStore = defineStore('counter', () => {
  const count = ref(0)
  const doubleCount = computed(() => count.value * 2)
  function increment() {
    count.value++
  }

  return { count, doubleCount, increment }
})
interface InventorySlotData 
{
    count:number,
    id:number | null,
    stackable:boolean
}
//add another inteface for unique item properties like damage, or whatnot


export const InvStore =  defineStore("inventory", ()=>
{
    const inventory = ref<Array<InventorySlotData>>([]);
    function changeData(slot:number, newBlock:InventorySlotData)
    {
        inventory.value[slot] = newBlock;
    }
    return { inventory, changeData };
})