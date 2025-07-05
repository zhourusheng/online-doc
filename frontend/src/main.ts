import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { setRouter } from './utils/router-helper'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import './assets/styles/main.less'

// 保存路由实例以供全局访问
setRouter(router)

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Antd)

app.mount('#app') 