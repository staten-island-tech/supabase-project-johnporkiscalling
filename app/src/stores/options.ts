import { ref, computed, reactive } from 'vue'
import { defineStore } from 'pinia'
export const Options = defineStore('options',()=>
{
    const render = ref<number>(4);
    const brightness = ref<number>(100)
    return {render, brightness}
})