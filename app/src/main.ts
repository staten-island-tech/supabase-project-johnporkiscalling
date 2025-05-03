import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App3 from './App3.vue'
import router from './router'

const app = createApp(App3)

app.use(createPinia())
app.use(router)

app.mount('#app')
