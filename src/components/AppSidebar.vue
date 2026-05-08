<script setup>
/**
 * AppSidebar.vue - 侧边栏组件
 * 
 * 功能说明：
 * 1. 提供应用的主要功能入口
 * 2. 支持视图切换（画廊/编辑器）
 * 3. 提供主题切换功能（亮色/暗色）
 * 4. 提供其他快捷操作入口（新建、文档、设置、邮箱、GitHub）
 * 
 * Props：
 * - currentView: 当前视图模式（'gallery' | 'editor'）
 * 
 * 事件：
 * - view-change: 视图切换事件，传递目标视图名称
 */
import { ref } from 'vue'
import { useSettings } from '../composables/useSettings'
import SettingsPanel from './SettingsPanel.vue'

const props = defineProps({
  currentView: {
    type: String,
    default: 'gallery'
  }
})

const emit = defineEmits(['view-change', 'new-example'])

const { settings, updateSetting } = useSettings()

/**
 * 设置面板显示状态
 */
const showSettingsPanel = ref(false)

/**
 * 处理图标点击
 * @param {string} iconName - 图标名称
 */
const handleIconClick = (iconName) => {
  if (iconName === 'gallery' || iconName === 'editor') {
    emit('view-change', iconName)
  } else if (iconName === 'new') {
    emit('view-change', 'editor')
    emit('new-example')
  } else if (iconName === 'settings') {
    showSettingsPanel.value = !showSettingsPanel.value
  } else if (iconName === 'docs') {
    window.open('https://cesium.com/learn/cesiumjs/ref-doc/', '_blank')
  }
}

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
  window.open('https://github.com', '_blank')
}

/**
 * 关闭设置面板
 */
const handleCloseSettings = () => {
  showSettingsPanel.value = false
}
</script>

<template>
  <aside class="sidebar">
    <!-- 顶部功能区 -->
    <div class="sidebar-top">
      <div 
        class="icon-item" 
        :class="{ selected: currentView === 'gallery' }"
        @click="handleIconClick('gallery')" 
        title="画廊"
      >
        <span class="iconfont icon-tupian"></span>
      </div>
      <div 
        class="icon-item" 
        :class="{ selected: currentView === 'editor' }"
        @click="handleIconClick('editor')" 
        title="代码编辑"
      >
        <span class="iconfont icon-daima"></span>
      </div>
      <div class="icon-item" @click="handleIconClick('new')" title="新建">
        <span class="iconfont icon-tianjia"></span>
      </div>
      <div class="icon-item" @click="handleIconClick('docs')" title="文档">
        <span class="iconfont icon-wendang"></span>
      </div>
    </div>
    
    <!-- 底部功能区 -->
    <div class="sidebar-bottom">
      <div class="icon-item" @click="handleIconClick('email')" title="邮箱">
        <span class="iconfont icon-youxiang"></span>
      </div>
      <div class="icon-item" @click="handleGithubClick" title="GitHub">
        <span class="iconfont icon-githublogo"></span>
      </div>
       <div 
        class="icon-item" 
        @click="handleThemeToggle" 
        :title="settings.isDark ? '切换到亮色主题' : '切换到暗色主题'"
      >
        <span class="iconfont" :class="settings.isDark ? 'icon-taiyang' : 'icon-yueliang'"></span>
      </div>
      <div class="icon-item" @click="handleIconClick('settings')" title="设置">
        <span class="iconfont icon-shezhi"></span>
      </div>
    </div>
  </aside>
  
  <!-- 设置面板 -->
  <SettingsPanel 
    :visible="showSettingsPanel" 
    @close="handleCloseSettings" 
  />
</template>

<style scoped>
/* 引入图标字体样式 */
@import '../assets/fonts/iconfont.css';

/* 侧边栏容器样式 */
.sidebar {
  width: 50px;
  height: 100%;
  background-color: var(--color-bg-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: background-color 0.3s, border-color 0.3s;
}

/* 顶部和底部功能区样式 */
.sidebar-top,
.sidebar-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0;
}

/* 图标项样式 */
.icon-item {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
  color: var(--color-text-primary);
}

.icon-item:hover {
  background-color: var(--color-bg-hover);
}

.icon-item.selected {
  background-color: var(--color-bg-hover);
}

/* 图标字体样式 */
.iconfont {
  font-size: 20px;
}
</style>