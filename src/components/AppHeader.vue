<script setup>
/**
 * AppHeader.vue - 应用头部组件
 * 
 * 功能说明：
 * 1. 显示应用标题和 Cesium 版本
 * 2. 提供横向导航菜单（首页、在线示例、项目示例）
 * 3. 集成功能区（邮箱、GitHub、主题切换、设置）
 * 4. 在首页时背景透明，与首页融为一体
 */
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSettings } from '../composables/useSettings'
import { useHomeSection } from '../composables/useHomeSection'
import SettingsPanel from './SettingsPanel.vue'

const route = useRoute()
const { settings, updateSetting } = useSettings()
const { isHeroSection } = useHomeSection()

/**
 * 判断是否在首页
 */
const isHome = computed(() => route.path === '/')

/**
 * 是否应用白色文字样式（首页且处于hero区域）
 */
const useWhiteTextStyle = computed(() => isHome.value && isHeroSection.value)

/**
 * 设置面板显示状态
 */
const showSettingsPanel = ref(false)

/**
 * 处理主题切换
 */
const handleThemeToggle = () => {
  updateSetting('isDark', !settings.isDark)
}

/**
 * 处理GitHub点击
 */
const handleGithubClick = () => {
  window.open('https://github.com/Chen-lingxiao', '_blank')
}

/**
 * 处理图标点击
 * @param {string} iconName - 图标名称
 */
const handleIconClick = (iconName) => {
  if (iconName === 'settings') {
    showSettingsPanel.value = !showSettingsPanel.value
  } else if (iconName === 'docs') {
    window.open('https://cesium.com/learn/cesiumjs/ref-doc/', '_blank')
  }
  else if (iconName === 'email') {
    window.open('mailto:chen.lingxiao@outlook.com', '_blank')
  }
}

/**
 * 关闭设置面板
 */
const handleCloseSettings = () => {
  showSettingsPanel.value = false
}
</script>

<template>
  <header class="app-header" :class="{ 'transparent-header': isHome }">
    <!-- 左侧标题区域 -->
    <div class="header-content">
      <h1 class="header-title" :class="{ 'white-text': useWhiteTextStyle }">LX</h1>
      <span class="header-version" :class="{ 'white-text': useWhiteTextStyle }">v1.141.0</span>
    </div>
    
    <!-- 右侧区域：导航菜单 + 功能区 -->
    <div class="header-right">
      <!-- 导航菜单 -->
      <nav class="header-nav">
        <router-link to="/" class="nav-link" :class="{ active: $route.path === '/', 'white-link': useWhiteTextStyle }">
          <span>首页</span>
        </router-link>
        <router-link to="/examples" class="nav-link" :class="{ active: $route.path === '/examples', 'white-link': useWhiteTextStyle }">
          <span>在线沙盒</span>
        </router-link>
        <router-link to="/project" class="nav-link" :class="{ active: $route.path === '/project', 'white-link': useWhiteTextStyle }">
          <span>项目示例</span>
        </router-link>
        <router-link to="/study" class="nav-link" :class="{ active: $route.path === '/study', 'white-link': useWhiteTextStyle }">
          <span>学习笔记</span>
        </router-link>
      </nav>
      
      <!-- 分隔线 -->
      <div class="nav-divider" :class="{ 'white-divider': useWhiteTextStyle }"></div>
      
      <!-- 功能区图标 -->
      <div class="icon-group">
        <div class="icon-item" :class="{ 'white-icon': useWhiteTextStyle }" @click="handleIconClick('email')" title="邮箱">
          <span class="iconfont icon-youxiang"></span>
        </div>
        <div class="icon-item" :class="{ 'white-icon': useWhiteTextStyle }" @click="handleGithubClick" title="GitHub">
          <span class="iconfont icon-githublogo"></span>
        </div>
        <div 
          class="icon-item" 
          :class="{ 'white-icon': useWhiteTextStyle }"
          @click="handleThemeToggle" 
          :title="settings.isDark ? '切换到亮色主题' : '切换到暗色主题'"
        >
          <span class="iconfont" :class="settings.isDark ? 'icon-taiyang' : 'icon-yueliang'"></span>
        </div>
        <div class="icon-item" :class="{ 'white-icon': useWhiteTextStyle }" @click="handleIconClick('settings')" title="设置">
          <span class="iconfont icon-shezhi"></span>
        </div>
      </div>
    </div>
  </header>
  
  <!-- 设置面板 -->
  <SettingsPanel 
    :visible="showSettingsPanel" 
    @close="handleCloseSettings" 
  />
</template>

<style scoped>
/* 头部导航栏样式 */
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 50px;
  background-color: var(--color-bg-surface);
  border-bottom: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  padding: 0 20px;
  box-shadow: var(--shadow);
  transition: all 0.3s ease;
  justify-content: space-between;
  z-index: 1000;
}

/* 透明头部样式（首页） */
.transparent-header {
  background-color: transparent;
  border-bottom: none;
  box-shadow: none;
}

/* 内容区域 */
.header-content {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

/* 标题样式 */
.header-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  transition: color 0.3s;
}

/* 白色文本（首页） */
.white-text {
  color: #ffffff;
}

/* 版本样式 */
.header-version {
  font-size: 12px;
  color: var(--color-text-secondary);
  transition: color 0.3s;
}

/* 右侧区域 */
.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

/* 导航区域 */
.header-nav {
  display: flex;
  align-items: center;
}

/* 导航链接 */
.nav-link {
  font-size: 14px;
  color: var(--color-text-secondary);
  text-decoration: none;
  padding: 0 20px;
  margin: 0;
  height: 50px;
  line-height: 50px;
  border-radius: 0;
  border-bottom: 3px solid transparent;
  transition: all var(--transition-fast);
  font-weight: 500;
}

.nav-link:hover {
  color: var(--color-text-primary);
  background-color: var(--color-primary-bg-light);
}

.nav-link.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: 600;
}

/* 白色链接（首页） */
.white-link {
  color: rgba(255, 255, 255, 0.8);
}

.white-link:hover {
  color: #ffffff;
  background-color: rgba(255, 255, 255, 0.08);
}

.white-link.active {
  color: #ffffff;
  border-bottom-color: #ffffff;
  font-weight: 600;
}

/* 分隔线 */
.nav-divider {
  width: 1px;
  height: 24px;
  background-color: var(--color-border);
  transition: background-color var(--transition-normal);
}

/* 白色分隔线（首页） */
.white-divider {
  background-color: rgba(255, 255, 255, 0.3);
}

/* 功能区图标组 */
.icon-group {
  display: flex;
  align-items: center;
  gap: 5px;
}

/* 图标项样式 */
.icon-item {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color var(--transition-fast);
  color: var(--color-text-primary);
  border-radius: 4px;
}

.icon-item:hover {
  background-color: var(--color-bg-hover);
}

/* 白色图标（首页） */
.white-icon {
  color: rgba(255, 255, 255, 0.9);
}

.white-icon:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

/* 图标字体样式 */
.iconfont {
  font-size: 18px;
}
</style>