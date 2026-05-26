/**
 * router/index.js - 路由配置文件
 */
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('../examples/examples.vue')
    }
  ]
})

export default router