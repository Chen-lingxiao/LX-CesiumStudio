<script setup>
/**
 * App.vue - 主应用组件
 * 
 * 功能说明：
 * 1. 作为整个应用的根组件，负责布局管理
 * 2. 实现中间面板和右侧面板的水平拖拽调整功能
 * 3. 管理当前视图模式（画廊/编辑器）和当前加载的示例组件
 * 
 * 布局结构：
 * - AppHeader: 顶部导航栏
 * - AppSidebar: 左侧功能栏
 * - AppMiddlePanel: 中间内容区（示例画廊/代码编辑器）
 * - AppRightPanel: 右侧预览区（Cesium Viewer）
 */
import { ref, nextTick, computed, shallowRef, markRaw } from 'vue'
import AppHeader from './components/AppHeader.vue'
import FPSMonitor from './components/FPSMonitor.vue'
import AppSidebar from './components/AppSidebar.vue'
import AppMiddlePanel from './components/AppMiddlePanel.vue'
import AppRightPanel from './components/AppRightPanel.vue'
import { useResizer } from './composables/useResizer'
import { useSettings } from './composables/useSettings'

/**
 * 使用拖拽调整composable（水平方向，20%-80%范围）
 */
const { isDragging, sizePercent: middleWidthPercent, startDrag, setContainerRef } = useResizer('horizontal', 20, 80)

// 获取设置状态并初始化
const { settings, initSettings } = useSettings()
initSettings()

// 初始化默认宽度
middleWidthPercent.value = 33.33

/**
 * 中间面板组件引用
 */
const middlePanelRef = ref(null)

/**
 * 当前视图模式：'gallery'（画廊视图）| 'editor'（编辑器视图）
 */
const currentView = ref('gallery')

/**
 * 当前加载的示例组件（使用shallowRef避免不必要的响应式）
 */
const currentExampleComponent = shallowRef(null)

/**
 * 当前要执行的代码对象
 */
const currentCodeToRun = ref(null)

/**
 * 中间面板宽度（计算属性，转换为百分比字符串）
 */
const middleWidth = computed(() => `${middleWidthPercent.value}%`)

/**
 * 右侧面板宽度（计算属性，100% - 中间面板宽度）
 */
const rightWidth = computed(() => `${100 - middleWidthPercent.value}%`)

/**
 * 处理视图切换事件
 * @param {string} view - 目标视图模式（'gallery' | 'editor'）
 */
const handleViewChange = (view) => {
  currentView.value = view
}

/**
 * 处理新建示例事件
 * 切换到编辑器视图并加载基础Cesium模板
 */
const handleNewExample = () => {
  currentView.value = 'editor'
  nextTick(() => {
    middlePanelRef.value?.loadNewExample()
  })
}

/**
 * 处理加载示例事件
 * @param {Object} example - 示例对象，包含组件和代码信息
 */
const handleLoadExample = (example) => {
  // 使用markRaw标记组件，避免响应式包装，提升性能
  currentExampleComponent.value = markRaw(example.component)
  // 清除待执行的代码
  currentCodeToRun.value = null
}

/**
 * 处理运行代码事件
 * @param {Object} code - 要执行的代码对象，包含js和htmlCss字段
 */
const handleRunCode = (code) => {
  // 使用扩展运算符创建新对象，确保每次都是新引用，触发watch检测
  currentCodeToRun.value = { ...code }
  // 清除当前加载的示例组件
  currentExampleComponent.value = null
}
</script>

<template>
  <div id="app">
    <!-- 顶部导航栏 -->
    <AppHeader />
    
    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 左侧功能栏 -->
      <AppSidebar 
        :current-view="currentView" 
        @view-change="handleViewChange" 
        @new-example="handleNewExample"
      />
      
      <!-- 可拖拽调整的内容区域 -->
      <div class="content-area" :ref="setContainerRef">
        <!-- 中间面板（画廊/编辑器） -->
        <div class="middle-panel" :style="{ width: middleWidth }">
          <AppMiddlePanel 
            ref="middlePanelRef"
            v-model="currentView" 
            @run-code="handleRunCode"
            @load-example="handleLoadExample"
          />
        </div>

        <!-- 水平拖拽调整器 -->
        <div
          class="resizer-horizontal"
          :class="{ dragging: isDragging }"
          @mousedown="startDrag"
        ></div>

        <!-- 右侧面板（Cesium预览） -->
        <div class="right-panel" :style="{ width: rightWidth }">
          <AppRightPanel 
            :example-component="currentExampleComponent"
            :code-to-run="currentCodeToRun"
          />
        </div>
      </div>
    </div>
  </div>
  <!-- FPS监控 -->
  <FPSMonitor v-if="settings.showFps" />
</template>

<style scoped>
/* 主内容区域布局 */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 可拖拽区域容器 */
.content-area {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 中间面板和右侧面板基础样式 */
.middle-panel,
.right-panel {
  height: 100%;
  overflow: hidden;
}

/* 水平拖拽调整器样式 */
.resizer-horizontal {
  width: 4px;
  background-color: var(--color-resizer);
  cursor: col-resize;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.resizer-horizontal:hover,
.resizer-horizontal.dragging {
  background-color: var(--color-resizer-hover);
}
</style>