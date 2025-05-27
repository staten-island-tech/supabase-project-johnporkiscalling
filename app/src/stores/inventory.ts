import { ref, computed, reactive } from 'vue'

import { defineStore } from 'pinia'
import { max } from 'three/tsl'

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
}
//add another inteface for unique item properties like damage, or whatnot
//for pickups just determine whether the player is in a certain proximity to hte item entity 

export const InvStore =  defineStore("inventory", ()=>
{
    const inventory = ref<Array<InventorySlotData>>([]);
    function changeData(slot:number, newBlock:InventorySlotData)
    {
        inventory.value[slot] = newBlock;
    }
    function addQuantity(amount:number, item:number)
    {
        for(let i = 0; i<inventory.value.length; i++)
        {
            //find the first item that matches the id
            if(inventory.value[i].id == item)
            {
              const maxAmount = inventory.value[i].count+amount;
              if(Math.ceil(maxAmount/999)>1)
              {
                const overflow = maxAmount - 999;
                //determine  the amount of slots needed to fill up the amount of overflow
                //use that to determine the amount of for loops to write 
                //if the inventory is full dont pickup the blocks 
                inventory.value[i].id = 999

                for(let j = i; j<inventory.value.length; j++)
                {
                    if(inventory.value[j].id == null)
                    {
                      
                    }
                }
                //find the next slot that satisfies the conditon of being empty 
              }
            }
        }
    }
    function readSlot(slot:number)
    {
      return inventory.value[slot];
    }
    
  

    return { inventory, changeData, readSlot, addQuantity };
})