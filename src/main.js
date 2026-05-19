/**
 * main.js - 应用入口文件
 * 
 * 功能说明：
 * 1. 创建Vue应用实例
 * 2. 配置路由
 * 3. 挂载到DOM元素
 * 4. 引入全局样式
 * 
 * 引入资源：
 * - App.vue: 主应用组件
 * - router: 路由配置
 * - main.css: 全局样式（包含主题变量、重置样式）
 * - iconfont.css: 图标字体样式
 */
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import '@/assets/styles/main.scss'
import '@/assets/fonts/iconfont.css'

const app = createApp(App)
app.use(router)
app.mount('#app')