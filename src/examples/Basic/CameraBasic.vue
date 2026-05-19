<script setup lang="ts">
/**
 * CameraBasic.vue - Cesium 相机控制示例组件
 * 
 * 功能说明：
 * 1. 演示 Cesium 相机的常用操作方法
 * 2. 展示 flyTo、setView、lookAt 等核心 API
 * 3. 实现视角倾斜、旋转、缩放等交互控制
 * 
 * 技术要点：
 * - camera.flyTo: 带动画飞往目标位置
 * - camera.setView: 瞬间跳转到目标位置
 * - camera.lookAt: 设置相机朝向指定点
 * - camera.zoomIn/zoomOut: 相机缩放控制
 * - camera.flyHome: 返回默认视角
 * - camera.viewRectangle: 显示矩形区域
 */

import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'

let viewer = null // Cesium 视图实例
const isReady = ref(false) // Cesium 初始化状态
const isCameraMoving = ref(false) // Cesium 相机移动状态

/**
 * 初始化 Cesium 实例
 * 创建 Viewer 对象，加载全球地形，添加示例点位
 */
const initCesium = async () => {
  try {
    isReady.value = false // 初始化状态
    // 创建 Cesium 视图实例，启用全球地形
    viewer = new Cesium.Viewer('cesium-container', {
      terrainProvider: await Cesium.createWorldTerrainAsync(),
    })
    // 添加示例点位标记
    addPoints()
    // 监听相机移动事件
    setupCameraEvents()
    isReady.value = true // 初始化状态
    console.log('CameraBasic 初始化完成')
  } catch (error) {
    console.error('CameraBasic 初始化失败：', error)
  }
}

/**
 * 添加示例点位
 * 在地图上标记北京和上海两个城市位置
 */
const addPoints = () => {
  // 北京点位
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

  // 上海点位
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

/**
 * 设置相机事件监听
 * 监听相机开始/结束移动事件，更新状态显示
 */
const setupCameraEvents = () => {
  viewer.camera.moveStart.addEventListener(() => {
    isCameraMoving.value = true
  })
  
  viewer.camera.moveEnd.addEventListener(() => {
    isCameraMoving.value = false
  })
}

/**
 * 飞至北京（flyTo 基础用法）
 * 使用 flyTo 方法带动画飞往北京上空
 */
const flyToBeijing = () => {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(116.397428, 39.90923, 1500),
    duration: 2  // 动画持续时间（秒）
  })
}

/**
 * 飞至上海（flyTo 带朝向）
 * 使用 flyTo 方法飞往上海，同时设置相机朝向角度
 */
const flyToShanghai = () => {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(121.5, 31.2, 1500),
    duration: 2,
    orientation: {
      heading: Cesium.Math.toRadians(45),  // 水平旋转角（度转弧度）
      pitch: Cesium.Math.toRadians(-30),   // 俯仰角（负数表示向下看）
      roll: 0                              // 翻滚角
    }
  })
}

/**
 * 返回默认视角
 * 使用 flyHome 方法返回初始视角
 */
const resetView = () => {
  viewer.camera.flyHome(2)
}

/**
 * 跳转至广东（setView 瞬时跳转）
 * 使用 setView 方法瞬时跳转到广东区域，无动画效果
 */
const flyToGuangdong = () => {
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(113.2644, 23.1291, 1500),
  })
}

/**
 * 放大视角
 * 拉近相机距离 1000 米
 */
const zoomIn = () => {
  viewer.camera.zoomIn(1000)
}

/**
 * 缩小视角
 * 拉远相机距离 1000 米
 */
const zoomOut = () => {
  viewer.camera.zoomOut(1000)
}

/**
 * 看向北京（lookAt 用法）
 * 设置相机从指定距离和角度看向北京
 */
const lookAtBeijing = () => {
  const center = Cesium.Cartesian3.fromDegrees(116.397428, 39.90923, 0)
  const heading = Cesium.Math.toRadians(0)    // 水平朝向
  const pitch = Cesium.Math.toRadians(-45)   // 向下倾斜 45 度
  const range = 3000                         // 距离目标点 3000 米
  
  viewer.camera.lookAt(center, new Cesium.HeadingPitchRange(heading, pitch, range))
}

/**
 * 显示中国区域（viewRectangle 用法）
 * 调整相机视角以显示整个中国区域
 */
const setViewRectangle = () => {
  // 中国区域大致经纬度范围
  const west = 73.5   // 西边界
  const south = 18.1  // 南边界
  const east = 135.1  // 东边界
  const north = 53.5  // 北边界
  
  viewer.camera.flyTo({
    destination: Cesium.Rectangle.fromDegrees(west, south, east, north),
    duration: 2
  })
}

/**
 * 获取相机当前信息
 * 弹出对话框显示相机的位置、朝向等信息
 */
const getCameraInfo = () => {
  const position = viewer.camera.position
  const cartographic = Cesium.Cartographic.fromCartesian(position)
  
  // 将弧度转换为度并保留小数
  const longitude = Cesium.Math.toDegrees(cartographic.longitude).toFixed(4)
  const latitude = Cesium.Math.toDegrees(cartographic.latitude).toFixed(4)
  const height = cartographic.height.toFixed(0)
  const heading = Cesium.Math.toDegrees(viewer.camera.heading).toFixed(2)
  const pitch = Cesium.Math.toDegrees(viewer.camera.pitch).toFixed(2)
  const roll = Cesium.Math.toDegrees(viewer.camera.roll).toFixed(2)
  
  // 显示相机信息
  alert(`相机位置信息：\n经度: ${longitude}°\n纬度: ${latitude}°\n高度: ${height}米\n朝向: ${heading}°\n俯仰: ${pitch}°\n翻滚: ${roll}°`)
}

/**
 * 路径漫游
 * 按顺序飞往多个预设点位，实现连续漫游效果
 */
const startPathRoaming = async () => {
  // 定义漫游路径点（北京 -> 天津 -> 上海）
  const pathPoints: Array<Cesium.Cartesian3> = [
    Cesium.Cartesian3.fromDegrees(116.397, 39.909, 1500),  // 北京
    Cesium.Cartesian3.fromDegrees(117.2, 39.13, 2000),     // 天津
    Cesium.Cartesian3.fromDegrees(121.47, 31.23, 1500)     // 上海
  ]
  
  // 依次飞往每个路径点
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

/**
 * 销毁 Cesium 实例
 * 释放资源，防止内存泄漏
 */
const destroyCesium = () => {
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
    viewer = null
  }
  isReady.value = false
  console.log('CameraBasic 销毁完成')
}

// 组件挂载时初始化
onMounted(() => {
  initCesium()
})

// 组件卸载时销毁资源
onUnmounted(() => {
  destroyCesium()
})
</script>

<template>
  <div class="cesium-wrapper">
    <!-- Cesium 容器 -->
    <div id="cesium-container">
      <!-- 加载遮罩 -->
      <div v-if="!isReady" class="loading-overlay">
        <span>加载中...</span>
      </div>
      
      <!-- 工具栏 -->
      <div class="toolbar">
        <!-- 相机状态显示 -->
        <div class="camera-status">
          相机状态：{{ isCameraMoving ? "移动中" : "静止" }}
        </div>
        
        <!-- 基础飞行操作 -->
        <div class="toolbar-section">
          <h4>基础飞行</h4>
          <button @click="flyToBeijing">飞北京（flyTo）</button>
          <button @click="flyToShanghai">飞上海（带角度）</button>
          <button @click="flyToGuangdong">跳广东（setView）</button>
          <button @click="resetView">重置视角</button>
        </div>

        <!-- 缩放控制 -->
        <div class="toolbar-section">
          <h4>缩放控制</h4>
          <button @click="zoomIn">放大 1000 米</button>
          <button @click="zoomOut">缩小 1000 米</button>
        </div>

        <!-- 高级功能 -->
        <div class="toolbar-section">
          <h4>高级功能</h4>
          <button @click="lookAtBeijing">看向北京（lookAt）</button>
          <button @click="setViewRectangle">中国区域</button>
          <button @click="getCameraInfo">获取相机信息</button>
          <button @click="startPathRoaming">路径漫游</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 工具栏 */
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

/* 相机状态 */
.camera-status {
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--color-border-muted);
  font-size: 14px;
  font-weight: bold;
  color: var(--color-text-primary);
}

/* 工具栏分组 */
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

/* 按钮样式 */
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
