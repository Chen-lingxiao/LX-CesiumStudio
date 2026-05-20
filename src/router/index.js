/**
 * router/index.js - 路由配置文件
 * 
 * 功能说明：
 * 1. 定义应用的路由规则
 * 2. 配置首页、在线示例、项目示例三个主要页面
 */
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/home' // 重定向到首页
    },
    {
      path: '/home',
      name: 'Home',
      component: () => import('../home/home.vue')
    },
    {
      path: '/examples',
      name: 'Examples',
      component: () => import('../examples/examples.vue')
    },
    {
      path: '/project',
      name: 'Project',
      component: () => import('../project/project.vue'),
      children: [
        {
          path: 'digital-campus',
          name: 'DigitalCampusDetail',
          component: () => import('../project/DigitalCampusDetail.vue')
        },
        {
          path: 'graduation-project',
          name: 'GraduationProject',
          component: () => import('../project/GraduationProject.vue')
        },
        {
          path: 'cesium-sandbox',
          name: 'CesiumSandboxDetail',
          component: () => import('../project/CesiumSandboxDetail.vue')
        },
        {
          path: 'example',
          name: 'ExampleProject',
          component: () => import('../project/ExampleProject.vue')
        }
      ]
    },
    {
      path: '/study',
      name: 'Study',
      component: () => import('../study/study.vue')
    }
  ]
})

export default router