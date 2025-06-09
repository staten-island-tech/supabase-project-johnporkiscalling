import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App4 from './App4.vue'
import router from './router'

const app = createApp(App4)

app.use(createPinia())
app.use(router)

app.mount('#app')
