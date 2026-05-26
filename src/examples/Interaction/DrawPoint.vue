<script setup>
/**
 * DrawPoint.vue - Cesium 单点绘制示例组件
 *
 * 【功能说明】
 * 1. 演示如何在 Cesium 地图上交互式绘制单个点标记
 * 2. 支持连续点击放置多个点标记，所有点保留显示
 * 3. 支持撤销最后一个点和清除所有点
 * 4. 实时显示已放置点的经纬度坐标
 *
 * 【核心技术要点】
 *
 * 1. 坐标拾取策略
 *    - 使用 Camera.getPickRay 获取屏幕射线
 *    - 使用 Globe.pick 拾取地形表面坐标（支持地形起伏）
 *    - 回退到 camera.pickEllipsoid 拾取椭球体表面
 *    - HeightReference.CLAMP_TO_GROUND 确保点贴地显示
 *
 * 2. 实体管理
 *    - pointEntityIds 数组存储所有已放置点的实体 ID
 *    - 支持按 ID 精确删除单个实体
 *    - 撤销功能通过 pop() 移除最后一个 ID
 *
 * 3. 事件处理
 *    - LEFT_CLICK：放置点标记
 *    - RIGHT_CLICK：结束绘制模式
 *    - 使用 ScreenSpaceEventHandler 管理鼠标事件
 *
 * 【交互流程】
 * - 点击"开始绘制"按钮进入绘制模式
 * - 左键点击地图放置点标记（可连续放置多个）
 * - 右键点击结束绘制模式
 * - 点击"撤销上一个点"删除最后放置的点
 * - 点击"清除所有"删除所有点
 *
 * 【设计要点】
 * - 点的样式：红色实心点，白色边框，贴地显示
 * - 状态栏实时显示已放置点数量和坐标
 * - 绘制模式和状态分离，通过 isDrawing 控制
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'

/** Cesium Viewer 实例 */
let viewer = null
/** 初始化状态 */
const isReady = ref(false)
/** 状态提示信息 */
const statusMessage = ref('请选择绘制模式')
/** 是否处于点绘制模式 */
const isDrawing = ref(false)
/** 已放置的点实体 ID 集合 */
const pointEntityIds = []
/** 屏幕空间事件处理器 */
let handler = null

/**
 * 获取屏幕坐标对应的地形表面笛卡尔坐标
 *
 * 【拾取策略】
 * 1. 通过 getPickRay 获取相机射线
 * 2. 使用 globe.pick 拾取地形表面（含高程）
 * 3. 若地形不可用，回退到椭球体表面拾取
 *
 * @param {Cesium.Cartesian2} position - 屏幕坐标 {x, y}
 * @returns {Cesium.Cartesian3|null} 地形表面坐标，失败返回 null
 */
const getPickedPosition = (position) => {
  const ray = viewer.camera.getPickRay(position)
  if (!ray) return null
  return viewer.scene.globe.pick(ray, viewer.scene)
    || viewer.camera.pickEllipsoid(position, viewer.scene.globe.ellipsoid)
}

/** 开始点绘制模式 */
const startDrawPoint = () => {
  if (!viewer || isDrawing.value) return

  isDrawing.value = true
  statusMessage.value = '左键点击地图放置点标记'
  viewer.scene.canvas.style.cursor = 'crosshair'

  handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

  handler.setInputAction((event) => {
    const earthPosition = getPickedPosition(event.position)
    if (!earthPosition) return

    const pointEntity = viewer.entities.add({
      position: earthPosition,
      point: {
        color: Cesium.Color.RED,
        pixelSize: 10,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
      }
    })
    pointEntityIds.push(pointEntity.id)

    const cartographic = Cesium.Cartographic.fromCartesian(earthPosition)
    const lon = Cesium.Math.toDegrees(cartographic.longitude).toFixed(6)
    const lat = Cesium.Math.toDegrees(cartographic.latitude).toFixed(6)
    statusMessage.value = `已放置点 (${lon}, ${lat})，继续点击或右键结束`
    viewer.scene.requestRender()
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

  handler.setInputAction(() => {
    stopDrawing()
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
}

/** 停止点绘制模式 */
const stopDrawing = () => {
  if (handler) {
    handler.destroy()
    handler = null
  }
  isDrawing.value = false
  if (viewer) {
    viewer.scene.canvas.style.cursor = 'default'
    viewer.scene.requestRender()
  }
  statusMessage.value = pointEntityIds.length > 0
    ? `已放置 ${pointEntityIds.length} 个点`
    : '请选择绘制模式'
}

/** 切换绘制模式 */
const toggleDrawMode = () => {
  if (isDrawing.value) {
    stopDrawing()
  } else {
    startDrawPoint()
  }
}

/** 撤销最后一个点 */
const undoLastPoint = () => {
  if (!viewer || pointEntityIds.length === 0) return
  const lastId = pointEntityIds.pop()
  viewer.entities.removeById(lastId)
  viewer.scene.requestRender()
  statusMessage.value = pointEntityIds.length > 0
    ? `已撤销，剩余 ${pointEntityIds.length} 个点`
    : '所有点已撤销'
}

/** 清除所有已绘制的点 */
const clearAllPoints = () => {
  if (!viewer) return
  stopDrawing()
  pointEntityIds.forEach(id => viewer.entities.removeById(id))
  pointEntityIds.length = 0
  viewer.scene.requestRender()
  statusMessage.value = '已清除所有点'
}

/** 初始化 Cesium */
const initCesium = async () => {
  try {
    isReady.value = false
    viewer = new Cesium.Viewer('cesium-container', {
      infoBox: false
    })
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.397222, 39.9075, 10000),
      duration: 2
    })
    isReady.value = true
    console.log('DrawPoint初始化成功')
    statusMessage.value = '地图加载完成，请选择绘制模式'
  } catch (error) {
    console.error('DrawPoint初始化失败：', error)
    statusMessage.value = 'DrawPoint初始化失败'
  }
}

/** 销毁 Cesium 实例 */
const destroyCesium = () => {
  stopDrawing()
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
    viewer = null
  }
  isReady.value = false
  console.log('DrawPoint已销毁')
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
    <div id="cesium-container"></div>

    <div v-if="!isReady" class="loading-overlay">
      <div class="loading-content">加载中...</div>
    </div>

    <div class="control-panel">
      <div class="panel-title">点绘制工具</div>

      <div class="button-group">
        <button class="draw-btn" :class="{ active: isDrawing }" @click="toggleDrawMode">
          {{ isDrawing ? '结束绘制' : '开始绘制' }}
        </button>
        <button class="draw-btn" :disabled="pointEntityIds.length === 0" @click="undoLastPoint">
          撤销上一个点
        </button>
      </div>

      <button class="clear-btn" @click="clearAllPoints">
        清除所有
      </button>
    </div>

    <div class="status-bar">
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

.draw-btn {
  display: block;
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

.draw-btn:hover {
  background-color: var(--color-bg-hover);
  border-color: var(--color-border-muted);
}

.draw-btn.active {
  background-color: #4a90d9;
  border-color: #4a90d9;
  color: white;
}

.draw-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.clear-btn {
  display: block;
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
}
</style>
