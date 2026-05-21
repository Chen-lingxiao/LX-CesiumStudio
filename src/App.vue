<script setup>
/**
 * App.vue - 主应用组件
 * 
 * 功能说明：
 * 1. 作为整个应用的根组件，负责布局管理
 * 2. 引入路由视图，实现页面切换
 * 3. 首页时内容区无顶部padding，与透明头部融为一体
 */
import AppHeader from './components/AppHeader.vue'
import FPSMonitor from './components/FPSMonitor.vue'
import { useSettings } from './composables/useSettings'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const { settings, initSettings } = useSettings()
initSettings()

/**
 * 判断是否在首页
 */
const isHome = computed(() => route.path === '/')

/**
 * 判断是否需要隐藏顶部导航栏（用于独立页面）
 */
const hideHeader = computed(() => {
  const fullscreenPages = [
    '/project/echarts-datav/demo'
  ]
  return fullscreenPages.includes(route.path)
})
</script>

<template>
  <div id="app">
    <!-- 顶部导航栏（独立页面隐藏） -->
    <AppHeader v-if="!hideHeader" />
    
    <!-- FPS 监控 -->
    <FPSMonitor v-if="settings.showFps && !hideHeader" />
    
    <!-- 主内容区域 -->
    <main class="main-content" :class="{ 'no-padding': isHome || hideHeader }">
      <router-view />
    </main>
  </div>
</template>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 应用容器 */
#app {
  min-height: 100vh;
}
</style>

<style scoped>
/* 主内容区域 */
.main-content {
  height: 100vh;
  overflow-y: auto;
  padding-top: 50px;
}

/* 首页时无顶部padding */
.no-padding {
  padding-top: 0;
}
</style>