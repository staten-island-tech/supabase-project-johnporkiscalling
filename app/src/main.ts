import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App2 from './App2.vue'
import router from './router'

const app = createApp(App2)

app.use(createPinia())
app.use(router)

app.mount('#app')
