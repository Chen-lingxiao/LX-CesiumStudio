<script setup>
/**
 * MeasureTool.vue - Cesium 综合测量工具组件
 *
 * 【功能说明】
 * 1. 集成距离测量、面积测量、高度测量、坐标拾取四大功能
 * 2. 基于 useMeasurement composable 实现测量逻辑复用
 * 3. 提供统一的 UI 交互和状态提示
 *
 * 【核心技术要点】
 *
 * 1. 组件架构
 *    - 视图层（Vue Template）：模式选择和状态展示
 *    - 业务层（useMeasurement）：封装测量逻辑
 *    - 渲染层（Cesium Viewer）：地图渲染和实体管理
 *
 * 2. useMeasurement Composable
 *    - startDistanceMeasure()：启动距离测量
 *    - startAreaMeasure()：启动面积测量
 *    - startHeightMeasure()：启动高度测量
 *    - startCoordinatePick()：启动坐标拾取
 *    - stopCurrentMode()：停止当前测量模式
 *    - clearAll()：清除所有测量结果
 *
 * 3. 测量模式说明
 *    - 距离测量：点击两点，显示三维空间直线距离
 *    - 面积测量：点击多点形成多边形，显示球面面积
 *    - 高度测量：点击两点，显示地形高差
 *    - 坐标拾取：点击任意位置，显示经纬度和高度
 *
 * 【交互流程】
 * - 点击按钮选择测量模式
 * - 根据模式提示进行操作
 * - 测量结果实时显示在地图上
 * - 再次点击同一按钮或点击其他按钮切换模式
 * - 点击"清除所有"移除所有测量结果
 *
 * 【设计要点】
 * - modeConfig 配置各模式的基本信息（键名、标签、图标、描述）
 * - statusCallback 回调将 composable 内部状态同步到组件
 * - currentMode 跟踪当前激活的测量模式
 * - 支持测量过程中的状态消息实时更新
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'
import { useMeasurement } from '@/composables/useMeasurement'

/** Cesium Viewer 实例（非响应式，挂载期间保持引用） */
let viewer = null

/** 地图是否加载完成 */
const isReady = ref(false)

/** 底部状态栏提示信息 */
const statusMessage = ref('请选择测量模式')

/** 当前激活的测量模式：'none' | 'distance' | 'area' | 'height' | 'coordinate' */
const currentMode = ref('none')

/** useMeasurement composable 返回的方法集合 */
let measurementMethods = null

/** 测量模式配置列表 */
const modeConfig = [
  {
    key: 'distance',
    label: '距离测量',
    activeLabel: '结束距离测量',
    description: '点击添加起点，再次点击完成',
    icon: ''
  },
  {
    key: 'area',
    label: '面积测量',
    activeLabel: '结束面积测量',
    description: '点击添加顶点，Enter/右键/双击完成',
    icon: ''
  },
  {
    key: 'height',
    label: '高度测量',
    activeLabel: '结束高度测量',
    description: '点击选择两个点计算高差',
    icon: ''
  },
  {
    key: 'coordinate',
    label: '坐标拾取',
    activeLabel: '结束坐标拾取',
    description: '点击查看经纬度高度',
    icon: ''
  }
]

/**
 * 获取指定模式的图标
 *
 * @param {string} mode - 测量模式键名
 * @returns {string} 对应的图标字符，未找到则返回默认图标
 */
const getModeIcon = (mode) => {
  const config = modeConfig.find((m) => m.key === mode)
  return config ? config.icon : ''
}

/**
 * 切换测量模式
 * 如果点击已激活的模式则关闭，否则先停止当前模式再切换到新模式
 *
 * @param {string} mode - 目标测量模式键名
 */
const toggleMode = (mode) => {
  if (currentMode.value === mode) {
    measurementMethods.stopCurrentMode()
    currentMode.value = 'none'
    statusMessage.value = '请选择测量模式'
    return
  }

  if (currentMode.value !== 'none') {
    measurementMethods.stopCurrentMode()
  }

  switch (mode) {
    case 'distance':
      measurementMethods.startDistanceMeasure()
      break
    case 'area':
      measurementMethods.startAreaMeasure()
      break
    case 'height':
      measurementMethods.startHeightMeasure()
      break
    case 'coordinate':
      measurementMethods.startCoordinatePick()
      break
  }

  currentMode.value = mode
}

/**
 * 清除所有测量结果并重置状态
 */
const clearAll = () => {
  measurementMethods.clearAll()
  currentMode.value = 'none'
  statusMessage.value = '已清除所有测量结果'
}

/**
 * 初始化 Cesium Viewer
 * 加载全球地形数据并将相机飞到北京天安门附近
 */
const initCesium = async () => {
  try {
    isReady.value = false

    viewer = new Cesium.Viewer('cesium-container', {
      terrainProvider: await Cesium.createWorldTerrainAsync()
    })

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.397222, 39.9075, 5000),
      duration: 2
    })

    /**
     * 创建 useMeasurement 实例
     * statusCallback 将 composable 内部的状态消息同步到组件的 statusMessage 响应式变量
     */
    measurementMethods = useMeasurement(viewer, (msg) => {
      statusMessage.value = msg
    })

    isReady.value = true
    statusMessage.value = '地图加载完成，请选择测量模式'
    console.log('MeasureTool初始化成功')
  } catch (error) {
    console.error('MeasureTool初始化失败：', error)
    statusMessage.value = 'MeasureTool初始化失败'
  }
}

/**
 * 销毁 Cesium Viewer 并清理所有资源
 * 组件卸载时调用，防止内存泄漏
 */
const destroyCesium = () => {
  if (measurementMethods) {
    measurementMethods.stopCurrentMode()
  }

  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
    viewer = null
  }

  isReady.value = false
  console.log('MeasureTool已销毁')
}

onMounted(() => {
  initCesium()
})

onUnmounted(() => {
  destroyCesium()
})
</script>

<template>
  <div class="cesium-wrapper">
    <!-- Cesium 地图容器 -->
    <div id="cesium-container"></div>

    <!-- 加载遮罩 -->
    <div v-if="!isReady" class="loading-overlay">加载中...</div>

    <!-- 左上角控制面板 -->
    <div class="control-panel">
      <div class="panel-title">综合测量工具</div>

      <!-- 测量模式按钮组 -->
      <div class="button-group">
        <button
          v-for="config in modeConfig"
          :key="config.key"
          class="measure-btn"
          :class="{ active: currentMode === config.key }"
          :title="config.description"
          @click="toggleMode(config.key)"
        >
          <span class="btn-icon">{{ config.icon }}</span>
          <span class="btn-label">
            {{ currentMode === config.key ? config.activeLabel : config.label }}
          </span>
        </button>
      </div>

      <!-- 清除所有测量结果 -->
      <button class="clear-btn" @click="clearAll">
        <span class="btn-label">清除所有</span>
      </button>
    </div>

    <!-- 顶部状态提示栏 -->
    <div class="status-bar">
      <span class="status-icon" v-if="currentMode !== 'none'">{{ getModeIcon(currentMode) }}</span>
      <span class="status-text">{{ statusMessage }}</span>
    </div>
  </div>
</template>

<style scoped>
.control-panel {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  box-shadow: var(--shadow);
  min-width: 200px;
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border-muted);
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
}

.measure-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-bg-elevated);
  color: var(--color-text-primary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.measure-btn:hover {
  background-color: var(--color-bg-hover);
  border-color: var(--color-border-muted);
}

.measure-btn.active {
  background-color: #4a90d9;
  border-color: #4a90d9;
  color: white;
}

.btn-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.btn-label {
  flex: 1;
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ff4d4f;
  border-radius: 4px;
  background-color: #ff4d4f;
  color: white;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background-color: #ff7875;
  border-color: #ff7875;
}

.status-bar {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  box-shadow: var(--shadow);
}

.status-icon {
  font-size: 14px;
}

.status-text {
  font-size: 12px;
  color: var(--color-text-primary);
  white-space: nowrap;
}
</style>
