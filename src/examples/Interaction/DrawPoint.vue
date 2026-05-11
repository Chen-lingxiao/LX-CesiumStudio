<script setup>
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

/** 坐标拾取：优先地形表面，其次椭球体表面 */
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
    statusMessage.value = '地图加载完成，请选择绘制模式'
  } catch (error) {
    console.error('DrawPoint 初始化失败：', error)
    statusMessage.value = '地图初始化失败'
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
      <span class="status-icon">📍</span>
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
