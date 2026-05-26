<script setup>
/**
 * VisibilityAnalysis.vue - Cesium 地形通视分析示例组件
 *
 * 【功能说明】
 * 1. 演示如何进行地形通视分析（Line of Sight Analysis）
 * 2. 用户在地图上绘制两点（观测点和目标点），系统自动分析两点间的通视情况
 * 3. 可视化显示视线、遮挡点位置，并提供详细的分析结果
 * 4. 支持调整采样点数、高度容差、精化迭代次数等参数
 *
 * 【核心技术要点】
 *
 * 1. 通视分析原理
 *    - 视线：从观测点到目标点的直线
 *    - 遮挡判断：沿视线采样地形高度，判断是否有地形高于视线
 *    - 通视条件：所有采样点的地形高度 ≤ 视线高度 + 容差
 *    - 遮挡点：第一个阻挡视线的地形点
 *
 * 2. 采样策略
 *    - 线性插值：在观测点和目标点之间进行等分采样
 *    - 采样点数：32-512 点（可通过滑块调整）
 *    - 高度获取：使用 sampleHeightMostDetailed 获取精确地形高度
 *    - 视线高度：线性插值计算视线在采样点的高度
 *
 * 3. 遮挡点精化（二分法）
 *    - 发现遮挡后，使用二分法精化遮挡点位置
 *    - 迭代次数：8-32 次（可通过滑块调整）
 *    - 精度：每次迭代将搜索范围缩小一半
 *    - 最终精度：视线长度的 1/2^iterations
 *
 * 4. 可视化渲染
 *    - 观测点：绿色点标记 + 标签
 *    - 目标点：红色点标记 + 标签
 *    - 可视段：绿色实线
 *    - 不可视段：红色虚线
 *    - 遮挡点：黄色点标记 + 标签
 *
 * 【通视分析算法详解】
 *
 * 假设观测点为 O，目标点为 T
 *
 * 1. 采样阶段：
 *    - 在 O 和 T 之间进行 N 等分（N = sampleCount）
 *    - 对每个采样点 P_i：
 *      · 计算视线高度 H_line_i（线性插值）
 *      · 获取地形高度 H_terrain_i
 *      · 判断：若 H_terrain_i > H_line_i + ε，则发现遮挡
 *
 * 2. 精化阶段（二分法）：
 *    - 发现遮挡后，在 [t_start, t_end] 范围内二分搜索
 *    - t = 0 表示观测点，t = 1 表示目标点
 *    - 每次迭代计算中点 t_mid，判断是否遮挡
 *    - 若遮挡，搜索范围缩小为 [t_start, t_mid]
 *    - 若不遮挡，搜索范围缩小为 [t_mid, t_end]
 *    - 重复迭代，直到达到最大迭代次数
 *
 * 3. 结果输出：
 *    - 可视：返回 { visible: true, distance }
 *    - 不可视：返回 { visible: false, distance, blockingPoint, blockingPosition }
 *
 * 【实现步骤】
 * 1. 创建 Viewer 实例并加载全球地形数据
 * 2. 开启地形深度测试（depthTestAgainstTerrain = true）
 * 3. 初始化 useCesiumDraw 绘制工具
 * 4. 用户点击"通视分析"按钮，进入绘制模式
 * 5. 用户在地图上绘制两点（观测点和目标点）
 * 6. 执行通视分析：
 *    - 计算两点距离
 *    - 生成采样点
 *    - 获取地形高度
 *    - 判断遮挡
 *    - 精化遮挡点
 * 7. 可视化结果：
 *    - 绘制观测点和目标点标记
 *    - 绘制视线（实线/虚线）
 *    - 绘制遮挡点标记（若有）
 * 8. 显示分析结果（距离、遮挡点位置等）
 *
 * 【参数说明】
 * - sampleCount（采样点数）：32-512
 *   · 值越大，采样越密集，精度越高，但计算量越大
 *   · 建议：短距离（<1km）用 128，长距离（>10km）用 256
 *
 * - heightEpsilon（高度容差）：0.1-10 米
 *   · 用于判断遮挡的容差范围
 *   · 值越大，越容易判定为通视
 *   · 建议：一般场景用 1.0 米，复杂地形用 2.0 米
 *
 * - refineIterations（精化迭代次数）：8-32 次
 *   · 二分法精化遮挡点的迭代次数
 *   · 值越大，遮挡点位置越精确
 *   · 建议：一般场景用 20 次，高精度场景用 32 次
 *
 * 【注意事项】
 * - 必须加载地形数据才能进行通视分析
 * - 采样点数和迭代次数会影响性能，建议根据场景调整
 * - 高度容差设置过大可能导致误判（实际遮挡但判定为通视）
 * - 地形数据精度会影响分析结果的准确性
 * - 建议在起伏明显的山地测试，效果更佳
 * - 组件卸载时需要销毁所有分析实例，防止内存泄漏
 *
 * 【使用场景】
 * - 军事应用：战场侦察、火力覆盖分析、雷达部署
 * - 城市规划：建筑高度控制、景观视野分析
 * - 交通规划：道路选线、隧道选址、桥梁设计
 * - 旅游开发：观景台选址、景点视野评估
 * - 通信工程：基站选址、信号覆盖分析
 * - 消防救援：火点观测、救援路径规划
 * - 房地产：楼盘视野评估、房价分析
 * - 考古研究：古迹视野分析、防御体系研究
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
    
    <!-- 工具开关 -->
    <div class="tool-switch">
      <button @click="startPicking" :disabled="isPicking" class="tool-btn">
        {{ isPicking ? '选点中' : '通视分析' }}
      </button>
      <button @click="clearResult" class="tool-btn">清除</button>
    </div>
    
    <!-- 信息提示区 -->
    <div class="info-panel">
      <div class="status-bar">{{ statusText }}</div>
      <div v-if="resultText" class="result-panel">{{ resultText }}</div>
    </div>
    
    <!-- 参数设置与图例 -->
    <div class="settings-panel">
      <h4>参数设置</h4>
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
      
      <h4>图例说明</h4>
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
</template>

<style scoped>
.tool-switch {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 8px;
  z-index: 100;
}

.tool-btn {
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #ccc;
  font-size: 14px;
  cursor: pointer;
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.info-panel {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  text-align: center;
}

.status-bar {
  background: #fff;
  padding: 8px 16px;
  border: 1px solid #ccc;
  font-size: 13px;
}

.result-panel {
  background: #333;
  color: #fff;
  padding: 8px 16px;
  margin-top: 8px;
  font-size: 13px;
}

.settings-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #fff;
  border: 1px solid #ccc;
  padding: 12px;
  width: 200px;
  z-index: 100;
}

.settings-panel h4 {
  margin: 12px 0 8px 0;
  font-size: 14px;
}

.settings-panel h4:first-child {
  margin-top: 0;
}

.param-item {
  margin-bottom: 8px;
}

.param-item label {
  font-size: 12px;
  color: #666;
}

.param-item input[type="range"] {
  width: 100%;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 4px;
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
