/**
 * main.js - 应用入口文件
 * 
 * 功能说明：
 * 1. 创建Vue应用实例
 * 2. 挂载到DOM元素
 * 3. 引入全局样式
 * 
 * 引入资源：
 * - App.vue: 主应用组件
 * - main.css: 全局样式（包含主题变量、重置样式）
 * - iconfont.css: 图标字体样式
 */
import { createApp } from 'vue'
import App from './App.vue'
import '@/assets/styles/main.scss'
import '@/assets/fonts/iconfont.css'
createApp(App).mount('#app')
