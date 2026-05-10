<script setup lang="ts">
/**
 * CameraBasic.vue - Cesium 相机控制示例组件
 *
 * 功能说明：
 * 1. 演示 Cesium 相机的常用操作
 * 2. 展示 flyTo、setView、lookAt 等方法
 * 3. 介绍视角倾斜、旋转、缩放等控制
 *
 * 技术要点：
 * - camera.flyTo: 带动画飞往目标
 * - camera.setView: 瞬间跳转到目标
 * - camera.lookAt: 设置相机朝向目标点
 * - camera.zoomIn/zoomOut: 缩放控制
 * - camera.flyHome: 返回默认视角
 * - camera.viewRectangle: 矩形区域视图
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'

let viewer = null // Cesium 实例
const isReady = ref(false) // 初始化状态
const isCameraMoving = ref(false)

const initCesium = async () => {
  try {
    isReady.value = false
    viewer = new Cesium.Viewer('cesium-container', {
      terrainProvider: await Cesium.createWorldTerrainAsync(),
    })
    addPoints()
    cameraEvents()
    isReady.value = true // 初始化完成
    console.log('CameraBasic 初始化完成')
  } catch (error) {
    console.error('CameraBasic 初始化失败：', error)
  }
}

const addPoints = () => {
  viewer.entities.add({
    id: 'beijing',
    name: '北京',
    description: '中国首都',
    position: Cesium.Cartesian3.fromDegrees(116.397428, 39.90923, 0),
    point: {
      pixelSize: 15,
      color: Cesium.Color.RED,
    },
    label: {
      text: '北京',
      font: '18px sans-serif',
      pixelOffset: new Cesium.Cartesian2(0, -20),
    },
  })

  viewer.entities.add({
    id: 'shanghai',
    name: '上海',
    description: '中国第二大城市',
    position: Cesium.Cartesian3.fromDegrees(121.5, 31.2, 0),
    point: {
      pixelSize: 15,
      color: Cesium.Color.BLUE,
    },
    label: {
      text: '上海',
      font: '18px sans-serif',
      pixelOffset: new Cesium.Cartesian2(0, -20),
    },
  })
}

const cameraEvents = () => {
  viewer.camera.moveStart.addEventListener(() => {
    isCameraMoving.value = true
  })
  viewer.camera.moveEnd.addEventListener(() => {
    isCameraMoving.value = false
  })
}

const flyTobeijing = () => {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(116.397428, 39.90923, 1500),
    duration: 2
  })
}

const flyToshanghai = () => {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(121.5, 31.2, 1500),
    duration: 2,
    orientation: {
      heading: Cesium.Math.toRadians(45),
      pitch: Cesium.Math.toRadians(-30),
      roll: 0
    }
  })
}

const resetView = () => {
  viewer.camera.flyHome(2)
}

const flyToGuangdong = () => {
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(113.2644, 23.1291, 1500),
  })
}

const zoomIn = () => {
  viewer.camera.zoomIn(1000)
}

const zoomOut = () => {
  viewer.camera.zoomOut(1000)
}

const lookAtBeijing = () => {
  const center = Cesium.Cartesian3.fromDegrees(116.397428, 39.90923, 0)
  const heading = Cesium.Math.toRadians(0)
  const pitch = Cesium.Math.toRadians(-45)
  const range = 3000
  viewer.camera.lookAt(center, new Cesium.HeadingPitchRange(heading, pitch, range))
}

const setViewRectangle = () => {
  const west = 73.5
  const south = 18.1
  const east = 135.1
  const north = 53.5
  viewer.camera.flyTo({
    destination: Cesium.Rectangle.fromDegrees(west, south, east, north),
    duration: 2
  })
}

const getCameraInfo = () => {
  const position = viewer.camera.position
  const cartographic = Cesium.Cartographic.fromCartesian(position)
  const longitude = Cesium.Math.toDegrees(cartographic.longitude).toFixed(4)
  const latitude = Cesium.Math.toDegrees(cartographic.latitude).toFixed(4)
  const height = cartographic.height.toFixed(0)
  const heading = Cesium.Math.toDegrees(viewer.camera.heading).toFixed(2)
  const pitch = Cesium.Math.toDegrees(viewer.camera.pitch).toFixed(2)
  const roll = Cesium.Math.toDegrees(viewer.camera.roll).toFixed(2)
  alert(`相机位置信息：\n经度: ${longitude}°\n纬度: ${latitude}°\n高度: ${height}米\n朝向: ${heading}°\n俯仰: ${pitch}°\n翻滚: ${roll}°`)
}

const startPathRoaming = async () => {
  const pathPoints: Array<Cesium.Cartesian3> = [
    Cesium.Cartesian3.fromDegrees(116.397, 39.909, 1500),
    Cesium.Cartesian3.fromDegrees(117.2, 39.13, 2000),
    Cesium.Cartesian3.fromDegrees(121.47, 31.23, 1500)
  ]
  for (const point of pathPoints) {
    await new Promise<void>((resolve) => {
      viewer.camera.flyTo({
        destination: point,
        duration: 3,
        complete: () => resolve(),
        cancel: () => resolve()
      })
    })
  }
}
// 销毁 Cesium 实例
const destroyCesium = () => {
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
    viewer = null
  }
  isReady.value = false
  console.log('CameraBasic 销毁完成')
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
    <div id="cesium-container">
      <div v-if="!isReady" class="loading-overlay">加载中...</div>
      <div class="toolbar">
        <div class="camera-status">
          相机状态：{{ isCameraMoving ? "移动中" : "静止" }}
        </div>
        <div class="toolbar-section">
          <h4>基础飞行</h4>
          <button @click="flyTobeijing">飞北京（flyTo）</button>
          <button @click="flyToshanghai">飞上海（flyTo带角度）</button>
          <button @click="flyToGuangdong">跳广东（setView）</button>
          <button @click="resetView">重置视角</button>
        </div>

        <div class="toolbar-section">
          <h4>缩放控制</h4>
          <button @click="zoomIn">放大1000米</button>
          <button @click="zoomOut">缩小1000米</button>
        </div>

        <div class="toolbar-section">
          <h4>高级功能</h4>
          <button @click="lookAtBeijing">看向北京(lookAt)</button>
          <button @click="setViewRectangle">中国区域</button>
          <button @click="getCameraInfo">获取相机信息</button>
          <button @click="startPathRoaming">路径漫游</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  padding: 16px;
  border-radius: 8px;
  box-shadow: var(--shadow);
  min-width: 200px;
}

.camera-status {
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--color-border-muted);
  font-size: 14px;
  font-weight: bold;
  color: var(--color-text-primary);
}

.toolbar-section {
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--color-border-muted);
}

.toolbar-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.toolbar-section h4 {
  margin: 0 0 10px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.toolbar-section button {
  display: block;
  width: 100%;
  margin: 5px 0;
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-bg-elevated);
  color: var(--color-text-primary);
  transition: all 0.2s ease;
}

.toolbar-section button:hover {
  background-color: var(--color-bg-hover);
  border-color: var(--color-border-muted);
}

.toolbar-section button.active {
  background-color: #4a90d9;
  border-color: #4a90d9;
  color: white;
}
</style>
