<script setup>
/**
 * SpatialAnalysis.vue - 地形分析交互示例
 *
 * 【功能说明】
 * 支持两种地形分析模式：
 * 1. 剖面分析：用户在地图上交互式绘制一条折线，系统自动沿该折线进行地形高程采样，
 *    并渲染 ECharts 高程剖面图
 * 2. 坡向分析：用户在地图上交互式绘制一个多边形区域，系统对该区域进行坡向分析，
 *    并在地图上渲染坡向可视化结果
 *
 * 【剖面分析交互流程】
 * 1. 点击"绘制剖面线"按钮，进入绘制模式
 * 2. 在地图上依次点击添加顶点（至少 2 个点）
 * 3. 右键结束绘制，自动触发剖面分析
 * 4. 图表显示高程剖面，支持悬停查看具体数值
 * 5. 可点击"清除"按钮重新开始
 *
 * 【坡向分析交互流程】
 * 1. 点击"绘制分析区域"按钮，进入多边形绘制模式
 * 2. 在地图上依次点击添加顶点，右键结束绘制
 * 3. 点击"开始坡向分析"按钮，系统进行坡向分析并渲染结果
 * 4. 可通过精度滑块调整分析精度
 * 5. 可点击"清除"按钮重新开始
 *
 * 【使用的 Composable】
 * - useCesiumDraw: 负责折线和多边形绘制交互
 * - useTerrainSectionAnalysis: 负责地形剖面采样 + ECharts 图表渲染
 * - useAspectAnalysis: 负责坡向分析
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'
import { useCesiumDraw } from '@/composables/useCesiumDraw'
import { useTerrainSectionAnalysis } from '@/composables/useTerrainSectionAnalysis'
import { useAspectAnalysis } from '@/composables/useAspectAnalysis'

let viewer = null
const isReady = ref(false)
const isDrawing = ref(false)
const statusMessage = ref('点击"绘制剖面线"开始分析')

let getViewerFn = null
let drawManager = null
let sectionAnalyzer = null
let aspectAnalyzer = null

const currentAnalysisMode = ref('section')
const currentExtent = ref([116.138, 40.001, 116.162, 40.019])
const currentPolygonPositions = ref(null)
const precisionLevel = ref(5)
const precisionMeters = ref(55)
const currentPrecision = ref(0.0005)
const currentMode = ref('section')
const showAspectResult = ref(false)

const initCesium = async () => {
  try {
    isReady.value = false
    viewer = new Cesium.Viewer('cesium-container', {
      terrainProvider: await Cesium.createWorldTerrainAsync(),
    })

    viewer.scene.globe.depthTestAgainstTerrain = true

    viewer.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(90, 30, 92, 32),
      duration: 3,
    })

    getViewerFn = () => viewer
    drawManager = useCesiumDraw(getViewerFn)
    sectionAnalyzer = useTerrainSectionAnalysis(getViewerFn, 'section-chart')
    aspectAnalyzer = useAspectAnalysis(getViewerFn)

    isReady.value = true
    console.log('SpatialAnalysis 初始化完成')
  } catch (error) {
    console.error('SpatialAnalysis 初始化失败：', error)
  }
}

const updateDelta = () => {
  const level = precisionLevel.value
  currentPrecision.value = level * 0.0001
  precisionMeters.value = Math.round(currentPrecision.value * 111320)
}

const switchMode = (mode) => {
  currentMode.value = mode
  if (mode === 'section') {
    statusMessage.value = '点击"绘制剖面线"开始剖面分析'
  } else {
    statusMessage.value = '点击"绘制分析区域"开始坡向分析'
  }
}

const handleDrawSection = async () => {
  if (!drawManager || !sectionAnalyzer) return

  if (isDrawing.value) return

  isDrawing.value = true
  statusMessage.value = '绘制中：左键点击添加顶点，右键结束绘制'

  const result = await drawManager.drawLine()

  isDrawing.value = false

  if (result && result.lnglats && result.lnglats.length >= 2) {
    sectionAnalyzer.analyzeSection(result.lnglats)
    statusMessage.value = '剖面分析完成，悬停图表查看高程详情'
  } else {
    statusMessage.value = '绘制取消，请重新绘制'
  }
}

const handleDrawPolygon = async () => {
  if (!drawManager) return

  if (isDrawing.value) return

  isDrawing.value = true
  statusMessage.value = '绘制中：左键点击添加顶点，右键结束绘制'

  const result = await drawManager.drawPolygon()

  isDrawing.value = false

  if (result && result.positions && result.positions.length >= 3) {
    currentPolygonPositions.value = result.positions
    currentExtent.value = [
      result.boundingBox.west,
      result.boundingBox.south,
      result.boundingBox.east,
      result.boundingBox.north
    ]
    statusMessage.value = '区域绘制完成，点击"开始坡向分析"进行分析'
  } else {
    statusMessage.value = '绘制取消，请重新绘制'
  }
}

const handleStartAspectAnalysis = async () => {
  if (!aspectAnalyzer) return

  if (!currentExtent.value || currentExtent.value.length !== 4) {
    statusMessage.value = '请先绘制分析区域'
    return
  }

  try {
    statusMessage.value = '分析中，请稍候...'
    await aspectAnalyzer.analyzeAspect(currentExtent.value, currentPrecision.value, currentPolygonPositions.value)
    if (drawManager) {
      drawManager.clearDrawings()
    }
    currentPolygonPositions.value = null
    showAspectResult.value = true
    statusMessage.value = '坡向分析完成'
  } catch (error) {
    console.error('坡向分析失败:', error)
    statusMessage.value = '坡向分析失败：' + error.message
  }
}

const handleClear = () => {
  if (sectionAnalyzer) {
    sectionAnalyzer.clearSection()
  }
  if (aspectAnalyzer) {
    aspectAnalyzer.clearAspect()
  }
  if (drawManager) {
    drawManager.clearDrawings()
  }
  currentPolygonPositions.value = null
  showAspectResult.value = false
  if (currentMode.value === 'section') {
    statusMessage.value = '已清除，点击"绘制剖面线"开始剖面分析'
  } else {
    statusMessage.value = '已清除，点击"绘制分析区域"开始坡向分析'
  }
}

const destroyCesium = () => {
  if (sectionAnalyzer) {
    sectionAnalyzer.destroyAnalysis()
  }
  if (aspectAnalyzer) {
    aspectAnalyzer.destroyAnalysis()
  }
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
    viewer = null
  }
  getViewerFn = null
  drawManager = null
  sectionAnalyzer = null
  aspectAnalyzer = null
  isReady.value = false
  console.log('Cesium 销毁完成')
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

    <div class="mode-tabs">
      <button
        class="mode-tab"
        :class="{ active: currentMode === 'section' }"
        @click="switchMode('section')"
      >
        <span class="tab-icon">📈</span>
        <span>剖面分析</span>
      </button>
      <button
        class="mode-tab"
        :class="{ active: currentMode === 'aspect' }"
        @click="switchMode('aspect')"
      >
        <span class="tab-icon">🧭</span>
        <span>坡向分析</span>
      </button>
    </div>

    <div class="toolbar-panel" v-if="currentMode === 'section'">
      <div class="toolbar-row">
        <button class="btn-primary" :disabled="!isReady || isDrawing" @click="handleDrawSection">
          <span class="btn-icon">✏️</span>
          {{ isDrawing ? '绘制中...' : '绘制剖面线' }}
        </button>
        <button class="btn-danger" :disabled="!isReady" @click="handleClear">
          <span class="btn-icon">🗑️</span>
          清除
        </button>
      </div>
      <div class="status-bar">
        <span class="status-text">{{ statusMessage }}</span>
      </div>
    </div>

    <div class="toolbar-panel" v-if="currentMode === 'aspect'">
      <div class="toolbar-row">
        <button class="btn-primary" :disabled="!isReady || isDrawing" @click="handleDrawPolygon">
          <span class="btn-icon">✏️</span>
          {{ isDrawing ? '绘制中...' : '绘制分析区域' }}
        </button>
        <button class="btn-purple" :disabled="!isReady || !currentPolygonPositions" @click="handleStartAspectAnalysis">
          <span class="btn-icon">🔍</span>
          开始分析
        </button>
        <button class="btn-danger" :disabled="!isReady" @click="handleClear">
          <span class="btn-icon">🗑️</span>
          清除
        </button>
      </div>
      <div class="precision-row">
        <span class="label">分析精度:</span>
        <input
          type="range"
          min="1"
          max="10"
          step="1"
          v-model="precisionLevel"
          @change="updateDelta"
          class="precision-slider"
        />
        <span class="precision-value">{{ precisionMeters }}m</span>
      </div>
      <div class="status-bar">
        <span class="status-text">{{ statusMessage }}</span>
      </div>
    </div>

    <div v-if="currentMode === 'aspect' && showAspectResult" class="legend-panel">
      <div class="legend-header">
        <span class="legend-title">坡向图例</span>
      </div>
      <div class="legend-items">
        <div class="legend-row">
          <span class="color-box" style="background: rgba(0,150,255,0.8)"></span>
          <span>北 (0°)</span>
        </div>
        <div class="legend-row">
          <span class="color-box" style="background: rgba(0,255,0,0.8)"></span>
          <span>东北 (45°)</span>
        </div>
        <div class="legend-row">
          <span class="color-box" style="background: rgba(0,255,255,0.8)"></span>
          <span>东 (90°)</span>
        </div>
        <div class="legend-row">
          <span class="color-box" style="background: rgba(255,255,0,0.8)"></span>
          <span>东南 (135°)</span>
        </div>
        <div class="legend-row">
          <span class="color-box" style="background: rgba(255,150,0,0.8)"></span>
          <span>南 (180°)</span>
        </div>
        <div class="legend-row">
          <span class="color-box" style="background: rgba(255,0,0,0.8)"></span>
          <span>西南 (225°)</span>
        </div>
        <div class="legend-row">
          <span class="color-box" style="background: rgba(255,0,255,0.8)"></span>
          <span>西 (270°)</span>
        </div>
        <div class="legend-row">
          <span class="color-box" style="background: rgba(150,0,255,0.8)"></span>
          <span>西北 (315°)</span>
        </div>
      </div>
    </div>

    <div v-if="currentMode === 'section'" id="section-chart" class="section-chart"></div>

    <div v-if="!isReady" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span>加载地形数据中...</span>
    </div>
  </div>
</template>

<style scoped>
.mode-tabs {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  gap: 4px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 8px;
  padding: 4px;
  z-index: 100;
}

.mode-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  font-family: '微软雅黑', sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-tab:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.mode-tab.active {
  background: rgba(255, 255, 255, 0.95);
  color: #333;
}

.tab-icon {
  font-size: 16px;
}

.toolbar-panel {
  position: absolute;
  top: 80px;
  left: 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 100;
  min-width: 280px;
}

.toolbar-row {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.btn-primary,
.btn-danger,
.btn-purple {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-family: '微软雅黑', sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #2980b9, #2471a3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
}

.btn-primary:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-danger {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: linear-gradient(135deg, #c0392b, #a93226);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
}

.btn-danger:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-purple {
  background: linear-gradient(135deg, #9b59b6, #8e44ad);
  color: white;
}

.btn-purple:hover:not(:disabled) {
  background: linear-gradient(135deg, #8e44ad, #7d3c98);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(155, 89, 182, 0.4);
}

.btn-purple:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-icon {
  font-size: 14px;
}

.precision-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  margin-bottom: 12px;
}

.label {
  font-size: 12px;
  color: #666;
  font-family: '微软雅黑', sans-serif;
  white-space: nowrap;
}

.precision-slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: linear-gradient(90deg, #3498db, #9b59b6);
  border-radius: 2px;
  outline: none;
}

.precision-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.precision-value {
  font-size: 12px;
  color: #333;
  font-family: '微软雅黑', sans-serif;
  font-weight: 500;
  min-width: 40px;
  text-align: right;
}

.status-bar {
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
  border-left: 3px solid #3498db;
}

.status-text {
  font-size: 12px;
  color: #666;
  font-family: '微软雅黑', sans-serif;
}

.legend-panel {
  position: absolute;
  bottom: 220px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 10px;
  padding: 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 100;
  min-width: 140px;
}

.legend-header {
  padding-bottom: 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.legend-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  font-family: '微软雅黑', sans-serif;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #555;
  font-family: '微软雅黑', sans-serif;
}

.color-box {
  width: 20px;
  height: 14px;
  border-radius: 3px;
  flex-shrink: 0;
}

.section-chart {
  position: absolute;
  bottom: 20px;
  left: 20px;
  width: calc(100% - 40px);
  height: 220px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 100;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.9);
  z-index: 200;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(52, 152, 219, 0.2);
  border-top-color: #3498db;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-overlay span {
  font-size: 14px;
  color: #666;
  font-family: '微软雅黑', sans-serif;
}
</style>