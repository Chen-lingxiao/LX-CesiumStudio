<script setup>
/**
 * AppRightPanel.vue - 右侧面板组件
 * 
 * 功能说明：
 * 1. 提供Cesium Viewer预览区域，支持加载示例组件或执行代码
 * 2. 实现Console日志捕获和展示功能
 * 3. 支持垂直拖拽调整Console高度
 * 4. 响应示例组件变化和代码执行请求
 * 
 * Props：
 * - exampleComponent: 当前加载的示例Vue组件
 * - codeToRun: 待执行的代码对象，包含js和htmlCss字段
 * 
 * 主要功能：
 * - Console.log/error/warn重写，实现日志双端输出（控制台+页面）
 * - Cesium Viewer创建和销毁管理
 * - 动态代码执行（支持从编辑器运行代码）
 * - Console面板展开/折叠和高度调整
 */
import { ref, computed, onMounted, onUnmounted, watch, shallowRef, nextTick } from 'vue'
import * as Cesium from 'cesium'
import { useResizer } from '../composables/useResizer'

// 配置Cesium Ion访问令牌
Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN

/**
 * 组件属性定义
 */
const props = defineProps({
  exampleComponent: {
    type: Object,
    default: null
  },
  codeToRun: {
    type: Object,
    default: null
  }
})

/**
 * 使用拖拽调整composable（垂直方向，5%-50%范围）
 */
const { isDragging, sizePercent: consoleHeightPercent, startDrag, setContainerRef } = useResizer('vertical', 5, 50)

// 初始化默认高度
consoleHeightPercent.value = 15

/**
 * Cesium容器DOM引用
 */
const cesiumContainerRef = ref(null)

/**
 * Console内容区域DOM引用，用于自动滚动到底部
 */
const consoleContentRef = ref(null)

/**
 * Cesium Viewer实例
 */
let viewer = null

/**
 * 原始Console方法备份，用于组件卸载时恢复
 */
let originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn
}

/**
 * Console是否展开
 */
const isConsoleExpanded = ref(true)

/**
 * 日志列表
 */
const logs = ref([])

/**
 * 当前加载的示例组件（使用shallowRef避免不必要的响应式）
 */
const currentExampleComponent = shallowRef(null)

/**
 * Console高度（计算属性）
 * 展开时使用百分比，折叠时固定30px高度
 */
const consoleHeight = computed(() => {
  if (isConsoleExpanded.value) {
    return `${consoleHeightPercent.value}%`
  }
  return '30px'
})

/**
 * 切换Console展开/折叠状态
 */
const toggleConsole = () => {
  isConsoleExpanded.value = !isConsoleExpanded.value
}

/**
 * 添加日志到Console
 * @param {string} type - 日志类型：'log' | 'error' | 'warn'
 * @param {...any} args - 日志参数
 */
const addLog = (type, ...args) => {
  // 将参数转换为字符串
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2)
      } catch {
        return String(arg)
      }
    }
    return String(arg)
  }).join(' ')
  
  // 添加日志项
  logs.value.push({
    id: Date.now() + Math.random(),
    type,
    message,
    timestamp: new Date().toLocaleTimeString()
  })
  
  // 延迟滚动到最新日志
  nextTick(() => {
    if (consoleContentRef.value) {
      consoleContentRef.value.scrollTop = consoleContentRef.value.scrollHeight
    }
  })
}

/**
 * 清空所有日志
 */
const clearLogs = () => {
  logs.value = []
}

/**
 * 重写Console方法，实现日志双端输出
 */
const initConsoleOverride = () => {
  console.log = (...args) => {
    // 保留原始输出
    originalConsole.log.apply(console, args)
    // 添加到页面Console
    addLog('log', ...args)
  }
  
  console.error = (...args) => {
    originalConsole.error.apply(console, args)
    addLog('error', ...args)
  }
  
  console.warn = (...args) => {
    originalConsole.warn.apply(console, args)
    addLog('warn', ...args)
  }
}

/**
 * 恢复原始Console方法
 */
const restoreConsole = () => {
  console.log = originalConsole.log
  console.error = originalConsole.error
  console.warn = originalConsole.warn
}

/**
 * 销毁Cesium Viewer实例并清理容器
 */
const destroyViewer = () => {
  if (viewer) {
    viewer.destroy()
    viewer = null
  }
  
  // 清空容器，确保移除所有残留的canvas和DOM元素
  if (cesiumContainerRef.value) {
    cesiumContainerRef.value.innerHTML = ''
  }
}

/**
 * 转换代码格式，使其可以在浏览器环境中执行
 * @param {string} rawCode - 原始代码字符串
 * @returns {string} 转换后的可执行代码
 */
const transformCode = (rawCode) => {
  let jsCode = rawCode
  
  // 移除import语句（支持多行和无分号情况）
  jsCode = jsCode.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"]\s*[;\n]/g, '')
  
  // 移除export语句
  jsCode = jsCode.replace(/export\s+default\s+[\s\S]*?(?=\n|$)/g, '')
  jsCode = jsCode.replace(/export\s+[\s\S]*?[;\n]/g, '')
  
  // 移除defineProps和defineEmits
  jsCode = jsCode.replace(/defineProps\s*\([\s\S]*?\)\s*/g, '')
  jsCode = jsCode.replace(/defineEmits\s*\([\s\S]*?\)\s*/g, '')
  
  // 提取onMounted之前的内容（函数定义、变量声明等）
  const onMountedIndex = jsCode.indexOf('onMounted(() => {')
  let beforeOnMounted = ''
  let onMountedContent = ''
  
  if (onMountedIndex !== -1) {
    // 获取onMounted之前的内容
    beforeOnMounted = jsCode.substring(0, onMountedIndex).trim()
    
    // 提取onMounted内部内容
    let contentStart = onMountedIndex + 'onMounted(() => {'.length
    let depth = 1
    for (let i = contentStart; i < jsCode.length && depth > 0; i++) {
      const char = jsCode[i]
      if (char === '{' && jsCode[i-1] !== '\\') depth++
      if (char === '}' && jsCode[i-1] !== '\\') depth--
      if (depth > 0) {
        onMountedContent += char
      }
    }
    
    // 合并两部分内容
    jsCode = (beforeOnMounted + '\n\n' + onMountedContent).trim()
  }
  
  // 移除viewer声明（保留函数内部的viewer使用）
  jsCode = jsCode.replace(/let\s+viewer\s*=\s*null;/g, '')
  
  // 保持viewer赋值为全局变量，不改为const声明
  // 这样可以让外部的viewer变量引用到新创建的实例
  
  // 移除onUnmounted
  jsCode = jsCode.replace(/\s*onUnmounted\s*\([\s\S]*?\)\s*/g, '')
  
  // 将容器ID替换为container变量
  jsCode = jsCode.replace(/'cesium-container'/g, 'container')
  
  // 移除多余的空行和空白
  jsCode = jsCode.replace(/\n{3,}/g, '\n\n').trim()
  
  return jsCode.trim()
}

/**
 * 执行代码
 * @param {Object} code - 代码对象，包含executableCode、js等字段
 */
const executeCode = (code) => {
  if (!code || !cesiumContainerRef.value) return
  
  // 先销毁旧的Viewer
  destroyViewer()
  
  try {
    // 获取可执行代码
    let scriptCode = ''
    
    // 优先使用预编译的可执行代码
    if (code.executableCode) {
      scriptCode = code.executableCode
    } else if (code.js) {
      // 如果没有预编译的可执行代码，对代码进行转换处理
      scriptCode = transformCode(code.js)
    }
    
    // 创建函数并执行
    const script = new Function(
      'Cesium', 
      'container', 
      scriptCode
    )
    
    script(Cesium, cesiumContainerRef.value)
  } catch (error) {
    console.error('Failed to execute code:', error)
  }
}

/**
 * 监听示例组件变化
 */
watch(() => props.exampleComponent, (newComponent) => {
  if (newComponent) {
    // 销毁旧Viewer，加载新组件
    destroyViewer()
    currentExampleComponent.value = newComponent
  } else {
    // 清除组件，初始化默认Viewer
    currentExampleComponent.value = null
    initDefaultViewer()
  }
})

/**
 * 监听待执行代码变化
 */
watch(() => props.codeToRun, (newCode) => {
  if (newCode) {
    // 清除组件，执行代码
    currentExampleComponent.value = null
    nextTick(() => {
      executeCode(newCode)
    })
  }
})

/**
 * 初始化默认Cesium Viewer
 */
const initDefaultViewer = () => {
  if (cesiumContainerRef.value && !viewer) {
    viewer = new Cesium.Viewer(cesiumContainerRef.value, {
      animation: false,           // 禁用动画控件
      timeline: false,            // 禁用时间线
      fullscreenButton: false,    // 禁用全屏按钮
      vrButton: false,            // 禁用VR按钮
      geocoder: false,            // 禁用地理编码搜索
      homeButton: false,          // 禁用Home按钮
      sceneModePicker: false,     // 禁用场景模式选择器
      baseLayerPicker: false,     // 禁用基础图层选择器
      navigationHelpButton: false,// 禁用导航帮助按钮
      infoBox: false,             // 禁用信息框
      selectionIndicator: false   // 禁用选择指示器
    })
  }
}

/**
 * 组件挂载时初始化
 */
onMounted(() => {
  initConsoleOverride()
  initDefaultViewer()
})

/**
 * 组件卸载时清理资源
 */
onUnmounted(() => {
  restoreConsole()
  destroyViewer()
})
</script>

<template>
  <div class="right-panel" :ref="setContainerRef">
    <!-- Cesium预览区域 -->
    <div class="cesium-container">
      <template v-if="currentExampleComponent">
        <component :is="currentExampleComponent" />
      </template>
      <template v-else>
        <div ref="cesiumContainerRef" class="cesium-viewer"></div>
      </template>
    </div>

    <!-- Console高度调整器 -->
    <div
      v-show="isConsoleExpanded"
      class="resizer-vertical"
      :class="{ dragging: isDragging }"
      @mousedown="startDrag"
    ></div>

    <!-- Console面板 -->
    <div class="console-container" :style="{ height: consoleHeight }">
      <div class="console-header" @click="toggleConsole">
        <span class="console-toggle-icon" :class="{ expanded: isConsoleExpanded }">▶</span>
        <span class="console-title">Console</span>
        <button class="clear-btn" @click.stop="clearLogs">Clear console</button>
      </div>
      <div v-show="isConsoleExpanded" ref="consoleContentRef" class="console-content">
        <div v-if="logs.length === 0" class="console-placeholder">
          Any console messages will be mirrored here
        </div>
        <div
          v-for="log in logs"
          :key="log.id"
          class="log-item"
          :class="`log-${log.type}`"
        >
          <span class="log-timestamp">[{{ log.timestamp }}]</span>
          <span class="log-type">{{ log.type.toUpperCase() }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 右侧面板基础样式 */
.right-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Cesium容器 */
.cesium-container {
  overflow: hidden;
  position: relative;
  flex: 1;
  min-height: 0;
}

/* Cesium Viewer */
.cesium-viewer {
  width: 100%;
  height: 100%;
}

/* 垂直调整器 */
.resizer-vertical {
  height: 4px;
  background-color: var(--color-resizer);
  cursor: row-resize;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.resizer-vertical:hover,
.resizer-vertical.dragging {
  background-color: var(--color-resizer-hover);
}

/* Console容器 */
.console-container {
  background-color: var(--color-console-bg);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  min-height: 30px;
}

/* Console头部 */
.console-header {
  display: flex;
  align-items: center;
  padding: 5px 10px;
  background-color: var(--color-bg-surface);
  border-bottom: 1px solid var(--color-border);
  min-height: 30px;
  cursor: pointer;
  user-select: none;
  justify-content: space-between;
}

/* 折叠图标 */
.console-toggle-icon {
  font-size: 8px;
  color: var(--color-text-secondary);
  margin-right: 6px;
  transition: transform 0.2s ease;
  transform: rotate(-90deg);
}

.console-toggle-icon.expanded {
  transform: rotate(0deg);
}

/* Console标题 */
.console-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 清空按钮 */
.clear-btn {
  padding: 2px 8px;
  font-size: 11px;
  color: var(--color-text-secondary);
  background-color: transparent;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
}

/* Console内容区域 */
.console-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-console-text);
}

/* 占位符 */
.console-placeholder {
  color: var(--color-console-text);
  opacity: 0.6;
}

/* 日志项 */
.log-item {
  display: flex;
  gap: 8px;
  padding: 2px 0;
}

/* 日志时间戳 */
.log-timestamp {
  color: var(--color-text-secondary);
  font-size: 11px;
}

/* 日志类型 */
.log-type {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  min-width: 40px;
}

/* 日志类型样式 */
.log-log .log-type {
  color: #4CAF50;
}

.log-error .log-type {
  color: #f44336;
}

.log-warn .log-type {
  color: #ff9800;
}

/* 日志消息 */
.log-message {
  color: var(--color-console-text);
  word-break: break-all;
}
</style>