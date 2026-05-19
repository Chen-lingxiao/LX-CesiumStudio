<script setup>
/**
 * 通视分析示例
 * 使用封装的 useCesiumDraw 绘制工具进行选点交互
 */

import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'
import { useCesiumDraw } from '@/composables/useCesiumDraw'

// ============ 状态管理 ============
let viewer = null
const isReady = ref(false)
const isPicking = ref(false)
const statusText = ref('点击「开始通视选点」按钮，依次选择观测点和目标点')
const resultText = ref('')

// 分析参数
const sampleCount = ref(160)
const heightEpsilon = ref(1.0)
const refineIterations = ref(20)

// 选点结果
let observerPoint = null
let targetPoint = null

// 绘制工具实例
let drawTool = null

// 分析结果实体（用于清除）
let resultEntities = []

// ============ 核心算法：通视分析 ============

/**
 * 通视分析核心函数
 */
async function analyzeVisibility(observer, target) {
  const distance = Cesium.Cartesian3.distance(observer, target)
  const segments = Math.max(32, Math.min(512, sampleCount.value))
  const samplePoints = []
  const lineHeights = []

  for (let i = 1; i < segments; i++) {
    const t = i / segments
    const point = Cesium.Cartesian3.lerp(observer, target, t, new Cesium.Cartesian3())
    const cartographic = Cesium.Cartographic.fromCartesian(
      point,
      viewer.scene.globe.ellipsoid,
      new Cesium.Cartographic()
    )
    samplePoints.push(new Cesium.Cartographic(cartographic.longitude, cartographic.latitude, 0))
    lineHeights.push(cartographic.height)
  }

  if (samplePoints.length === 0) {
    return { visible: true, distance }
  }

  let terrainHeights
  if (viewer.scene.sampleHeightSupported) {
    const updated = await viewer.scene.sampleHeightMostDetailed(samplePoints)
    terrainHeights = updated.map(p => p?.height)
  } else {
    terrainHeights = samplePoints.map(p => viewer.scene.sampleHeight(p))
  }

  for (let i = 0; i < terrainHeights.length; i++) {
    const terrainH = terrainHeights[i]
    const lineH = lineHeights[i]
    if (terrainH !== undefined && terrainH > lineH + heightEpsilon.value) {
      const refined = await refineOcclusionPoint(observer, target, i / segments, (i + 1) / segments)
      return {
        visible: false,
        distance,
        blockingPoint: refined.blockingPoint,
        blockingPosition: refined.position
      }
    }
  }

  return { visible: true, distance }
}

/**
 * 二分法精化遮挡点位置
 */
async function refineOcclusionPoint(observer, target, tStart, tEnd) {
  let left = tStart
  let right = tEnd
  let blockingPoint = null
  let position = null

  for (let i = 0; i < refineIterations.value; i++) {
    const mid = (left + right) / 2
    const point = Cesium.Cartesian3.lerp(observer, target, mid, new Cesium.Cartesian3())
    const cartographic = Cesium.Cartographic.fromCartesian(
      point,
      viewer.scene.globe.ellipsoid,
      new Cesium.Cartographic()
    )

    let terrainH
    const samplePoint = new Cesium.Cartographic(cartographic.longitude, cartographic.latitude, 0)
    if (viewer.scene.sampleHeightSupported) {
      const updated = await viewer.scene.sampleHeightMostDetailed([samplePoint])
      terrainH = updated[0]?.height
    } else {
      terrainH = viewer.scene.sampleHeight(samplePoint)
    }

    if (terrainH !== undefined && terrainH > cartographic.height + heightEpsilon.value) {
      right = mid
      blockingPoint = new Cesium.Cartographic(cartographic.longitude, cartographic.latitude, terrainH)
      position = point.clone()
    } else {
      left = mid
    }
  }

  if (!blockingPoint) {
    const point = Cesium.Cartesian3.lerp(observer, target, tEnd, new Cesium.Cartesian3())
    const cartographic = Cesium.Cartographic.fromCartesian(
      point,
      viewer.scene.globe.ellipsoid,
      new Cesium.Cartographic()
    )
    blockingPoint = new Cesium.Cartographic(cartographic.longitude, cartographic.latitude, 0)
    position = point.clone()
  }

  return { blockingPoint, position }
}

// ============ 可视化功能 ============

/**
 * 创建观测点标记
 */
function createObserverMarker(position) {
  resultEntities.push(viewer.entities.add({
    position: position,
    point: { color: Cesium.Color.GREEN, pixelSize: 15, outlineColor: Cesium.Color.WHITE, outlineWidth: 2 },
    label: {
      text: '观测点', font: '14px sans-serif', fillColor: Cesium.Color.GREEN,
      outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, -20)
    }
  }))
}

/**
 * 创建目标点标记
 */
function createTargetMarker(position) {
  resultEntities.push(viewer.entities.add({
    position: position,
    point: { color: Cesium.Color.RED, pixelSize: 15, outlineColor: Cesium.Color.WHITE, outlineWidth: 2 },
    label: {
      text: '目标点', font: '14px sans-serif', fillColor: Cesium.Color.RED,
      outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, -20)
    }
  }))
}

/**
 * 创建视线
 */
function createSightLine(result) {
  if (result.visible) {
    resultEntities.push(viewer.entities.add({
      polyline: { positions: [observerPoint, targetPoint], width: 4, material: Cesium.Color.GREEN }
    }))
  } else {
    // 可视段
    resultEntities.push(viewer.entities.add({
      polyline: { positions: [observerPoint, result.blockingPosition], width: 4, material: Cesium.Color.GREEN }
    }))
    // 不可视段
    resultEntities.push(viewer.entities.add({
      polyline: {
        positions: [result.blockingPosition, targetPoint], width: 4,
        material: new Cesium.PolylineDashMaterialProperty({ color: Cesium.Color.RED, dashLength: 10 })
      }
    }))
    // 遮挡点
    const occlusionPos = Cesium.Cartesian3.fromRadians(
      result.blockingPoint.longitude,
      result.blockingPoint.latitude,
      result.blockingPoint.height + 10
    )
    resultEntities.push(viewer.entities.add({
      position: occlusionPos,
      point: { color: Cesium.Color.YELLOW, pixelSize: 12, outlineColor: Cesium.Color.BLACK, outlineWidth: 2 },
      label: {
        text: '遮挡点', font: '12px sans-serif', fillColor: Cesium.Color.YELLOW,
        outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, -15)
      }
    }))
  }
}

/**
 * 清除所有分析结果实体
 */
function clearResultEntities() {
  resultEntities.forEach(entity => {
    viewer.entities.remove(entity)
  })
  resultEntities = []
  observerPoint = null
  targetPoint = null
}

// ============ 交互功能 ============

/**
 * 开始选点模式（使用 useCesiumDraw 的 drawLine）
 */
async function startPicking() {
  if (!drawTool) return
  
  // 清除之前的结果
  clearResultEntities()
  drawTool.clearDrawings()
  resultText.value = ''

  isPicking.value = true
  statusText.value = '请点击场景选择观测点'

  // 使用绘制工具绘制线（两点）
  const drawResult = await drawTool.drawLine()
  
  if (!drawResult) {
    isPicking.value = false
    statusText.value = '已取消选点'
    return
  }

  // 获取两个端点作为观测点和目标点
  observerPoint = drawResult.positions[0]
  targetPoint = drawResult.positions[drawResult.positions.length - 1]

  // 清除绘制的线（我们自己创建可视化）
  drawTool.clearDrawings()

  // 创建标记
  createObserverMarker(observerPoint)
  createTargetMarker(targetPoint)

  // 执行分析
  statusText.value = '正在分析通视情况...'
  const result = await analyzeVisibility(observerPoint, targetPoint)
  createSightLine(result)
  showResult(result)

  isPicking.value = false
}

/**
 * 显示分析结果
 */
function showResult(result) {
  const distance = result.distance.toFixed(2)
  if (result.visible) {
    resultText.value = `✓ 通视分析结果：可见\n两点距离：${distance} 米`
  } else {
    const lat = Cesium.Math.toDegrees(result.blockingPoint.latitude).toFixed(6)
    const lng = Cesium.Math.toDegrees(result.blockingPoint.longitude).toFixed(6)
    const height = result.blockingPoint.height.toFixed(2)
    resultText.value = `✗ 通视分析结果：不可见\n两点距离：${distance} 米\n遮挡点位置：${lng}, ${lat}\n遮挡点高程：${height} 米`
  }
  statusText.value = '分析完成，可再次选点或清除结果'
}

/**
 * 清除结果
 */
function clearResult() {
  if (drawTool) {
    drawTool.clearDrawings()
  }
  clearResultEntities()
  resultText.value = ''
  statusText.value = '点击「开始通视选点」按钮，依次选择观测点和目标点'
}

// ============ 初始化与销毁 ============

async function initViewer() {
  try {
    isReady.value = false
    viewer = new Cesium.Viewer('cesium-container', {
      terrainProvider: await Cesium.createWorldTerrainAsync()
    })
    viewer.scene.globe.depthTestAgainstTerrain = true
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.390937, 39.91588, 1000),
      duration: 2
    })

    // 初始化绘制工具
    drawTool = useCesiumDraw(() => viewer)

    isReady.value = true
    console.log('通视分析示例初始化完成')
  } catch (error) {
    console.error('初始化失败:', error)
  }
}

function destroyViewer() {
  if (drawTool) {
    drawTool.destroyDraw()
  }
  clearResultEntities()
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
    viewer = null
  }
  isReady.value = false
}

onMounted(() => {
  initViewer()
})

onUnmounted(() => {
  destroyViewer()
})
</script>

<template>
  <div class="cesium-wrapper">
    <div id="cesium-container"></div>
    <div v-if="!isReady" class="loading-overlay">加载中...</div>
    
    <!-- 左上角：工具开关 -->
    <div class="tool-switch">
      <button @click="startPicking" :disabled="isPicking" class="tool-btn">
        <span class="btn-icon">{{ isPicking ? '●' : '○' }}</span>
        {{ isPicking ? '选点中' : '通视分析' }}
      </button>
      <button @click="clearResult" class="tool-btn secondary">清除</button>
    </div>
    
    <!-- 信息提示区（底部中央） -->
    <div class="info-panel">
      <div class="status-bar" :class="{ active: isPicking }">{{ statusText }}</div>
      <div v-if="resultText" class="result-panel">{{ resultText }}</div>
    </div>
    
    <!-- 右上角：参数设置与图例 -->
    <div class="settings-panel">
      <h4>参数设置</h4>
      <div class="params">
        <div class="param-item">
          <label>采样点数: {{ sampleCount }}</label>
          <input type="range" v-model.number="sampleCount" min="32" max="512" />
        </div>
        <div class="param-item">
          <label>高度容差: {{ heightEpsilon }}m</label>
          <input type="range" v-model.number="heightEpsilon" min="0.1" max="10" step="0.1" />
        </div>
        <div class="param-item">
          <label>精化迭代: {{ refineIterations }}</label>
          <input type="range" v-model.number="refineIterations" min="8" max="32" />
        </div>
      </div>
      
      <h4>图例说明</h4>
      <div class="legend">
        <div class="legend-item">
          <span class="dot green"></span>
          <span>观测点 / 可视段</span>
        </div>
        <div class="legend-item">
          <span class="dot red"></span>
          <span>目标点 / 不可视段</span>
        </div>
        <div class="legend-item">
          <span class="dot yellow"></span>
          <span>遮挡点</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 左上角：工具开关 */
.tool-switch {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  gap: 8px;
  z-index: 100;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.tool-btn:hover:not(:disabled) {
  background: #f0f0f0;
}

.tool-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tool-btn.secondary {
  background: rgba(245, 245, 245, 0.9);
}

.btn-icon {
  font-size: 10px;
  color: #4caf50;
}

.tool-btn:disabled .btn-icon {
  color: #f44336;
}

/* 底部信息提示区 */
.info-panel {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 100;
  min-width: 300px;
  max-width: 500px;
}

.status-bar {
  background: rgba(255, 255, 255, 0.95);
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 13px;
  color: #555;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.status-bar.active {
  background: rgba(232, 245, 233, 0.95);
  color: #2e7d32;
}

.result-panel {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  text-align: center;
}

/* 右上角：参数设置面板 */
.settings-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 10px;
  padding: 18px;
  min-width: 240px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.settings-panel h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.settings-panel h4:not(:first-child) {
  margin-top: 15px;
}

.params {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.param-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.param-item label {
  font-size: 12px;
  color: #666;
}

.param-item input[type="range"] {
  width: 100%;
  cursor: pointer;
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #666;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot.green { background: #4caf50; }
.dot.red { background: #f44336; }
.dot.yellow { background: #ffc107; }
</style>
