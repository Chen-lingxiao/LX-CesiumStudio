<script setup>
/**
 * AppSidebar.vue - 侧边栏组件
 * 
 * 功能说明：
 * 1. 提供应用的主要功能入口
 * 2. 支持视图切换（画廊/编辑器）
 * 3. 提供其他快捷操作入口（新建、文档）
 * 
 * Props：
 * - currentView: 当前视图模式（'gallery' | 'editor'）
 * 
 * 事件：
 * - view-change: 视图切换事件，传递目标视图名称
 */
import { useSettings } from '../composables/useSettings'

const props = defineProps({
  currentView: {
    type: String,
    default: 'gallery'
  }
})

const emit = defineEmits(['view-change', 'new-example'])

const { settings } = useSettings()

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
  } else if (iconName === 'docs') {
    window.open('https://cesium.com/learn/cesiumjs/ref-doc/', '_blank')
  }
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
  </aside>
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
  align-items: center;
  padding-top: 10px;
  transition:
    background-color var(--transition-normal),
    border-color var(--transition-normal);
}

/* 顶部功能区样式 */
.sidebar-top {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 图标项样式 */
.icon-item {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color var(--transition-fast);
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