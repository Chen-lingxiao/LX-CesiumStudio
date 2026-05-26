<script setup>
/**
 * VolumeAnalysis.vue - Cesium 方量分析示例组件
 *
 * 【功能说明】
 * 1. 集成交互式绘制工具，支持用户在地图上绘制多边形区域
 * 2. 绘制完成后自动进行挖方量和填方量计算
 * 3. 自动可视化分析结果（基准面多边形、墙体、结果标签）
 * 4. 支持参数动态调整，实时重新分析
 *
 * 【核心技术要点】
 *
 * 1. MeasureVolume 工具类
 *    - 接收外部多边形数据（经纬度数组格式）
 *    - 返回计算结果（挖方量、填方量、面积、高程范围）
 *    - 基于自定义几何算法，无外部地理库依赖
 *
 * 2. 方量计算原理
 *    - 挖方量 (Cut Volume): 高于基准面的土方量（需要挖除）
 *    - 填方量 (Fill Volume): 低于基准面的土方量（需要填充）
 *    - 使用网格法离散计算区域内的方量
 *    - 通过 Cesium 地形服务获取实际高程数据
 *
 * 3. 参数设置
 *    - polygon: 多边形顶点数组，格式 [[lon, lat], [lon, lat], ...]
 *    - planeHeight: 基准面高度（米），作为方量计算的参考平面
 *    - wallMinHeight: 墙体最小高度（米），可视化墙体底部高度
 *    - wallMaxHeight: 墙体最大高度（米），可视化墙体顶部高度
 *
 * 4. 绘制集成
 *    - 使用 useCesiumDraw composable 进行交互式多边形绘制
 *    - 绘制完成后自动清除绘制痕迹，避免与分析结果重叠
 *    - 自动触发方量分析并可视化结果
 *    - 参数调整时自动重新分析
 *
 * 【操作流程】
 * 1. 点击"绘制多边形"按钮进入绘制模式
 * 2. 左键点击地图添加顶点（至少3个）
 * 3. 右键点击结束绘制
 * 4. 系统自动计算方量并显示结果
 * 5. 可通过滑块调整参数，系统自动重新分析
 * 6. 点击"清除分析"重置所有内容
 */
import { onMounted, onUnmounted, ref, reactive } from 'vue'
import * as Cesium from 'cesium'
import { useMeasureVolume } from '../../composables/useMeasureVolume'
import { useCesiumDraw } from '../../composables/useCesiumDraw'

// ===================== 基础代码 =====================
let viewer = null
let measureVolume = null
const isReady = ref(false)
const isAnalyzing = ref(false)
const isDrawing = ref(false)
const statusMessage = ref('点击"绘制多边形"开始绘制')

// 获取绘制方法
const { drawPolygon, clearDrawings, cancelCurrentDrawing } = useCesiumDraw(() => viewer)

// 分析参数和结果
const analysisParams = reactive({
  planeHeight: 100,
  wallMinHeight: 0,
  wallMaxHeight: 200
})

const analysisResults = reactive({
  cutVolume: 0,
  fillVolume: 0,
  area: 0,
  minHeight: 0,
  maxHeight: 0
})

// 当前绘制的多边形数据
let currentPolygonData = []

/**
 * 初始化 Cesium Viewer
 */
const initCesium = async () => {
  try {
    isReady.value = false
    
    viewer = new Cesium.Viewer('cesium-container', {
      terrainProvider: await Cesium.createWorldTerrainAsync(),
    })

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.1501, 40.0101, 500),
      duration: 2,
    })
    
    // 创建方量分析器（使用 Composable 风格）
    measureVolume = useMeasureVolume(() => viewer, {
      terrainLevel: 13
    })
    
    isReady.value = true
    console.log('VolumeAnalysis 初始化完成')
  } catch (error) {
    console.error('VolumeAnalysis 初始化失败：', error)
  }
}

/**
 * 销毁 Cesium 实例
 */
const destroyCesium = () => {
  // 取消绘制
  cancelCurrentDrawing()
  
  if (measureVolume) {
    measureVolume.clearVisuals()
    measureVolume = null
  }
  
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
    viewer = null
  }
  isReady.value = false
  console.log('Cesium 销毁完成')
}

onMounted(async () => {
  await initCesium()
})

onUnmounted(() => {
  destroyCesium()
})

// ===================== 绘制和分析功能 =====================

/**
 * 开始绘制多边形
 */
const startDrawing = async () => {
  if (!viewer || !isReady.value) return
  
  // 清除之前的分析结果
  clearAnalysis()
  
  isDrawing.value = true
  statusMessage.value = '左键点击添加顶点，右键完成绘制'
  
  console.log('========== 开始绘制多边形 ==========')
  
  // 调用绘制工具
  const result = await drawPolygon()
  
  if (result && result.type === 'polygon' && result.lnglats && result.lnglats.length >= 3) {
    // 保存绘制数据
    currentPolygonData = result.lnglats
    console.log('绘制完成，多边形顶点:', currentPolygonData)
    statusMessage.value = '绘制完成，正在分析...'
    
    // 自动开始方量分析
    await startVolumeAnalysis()
  } else {
    statusMessage.value = '绘制已取消'
    console.log('绘制已取消')
  }
  
  isDrawing.value = false
}

/**
 * 开始方量分析
 * 使用当前绘制的多边形数据进行计算
 */
const startVolumeAnalysis = async () => {
  if (!viewer || !measureVolume || currentPolygonData.length < 3) return
  
  isAnalyzing.value = true
  
  // 先清除绘制的面，避免与分析结果叠在一起
  clearDrawings()
  
  console.log('========== 开始方量分析 ==========')
  console.log('多边形数据:', currentPolygonData)
  console.log('基准面高度:', analysisParams.planeHeight, '米')
  console.log('墙体最小高度:', analysisParams.wallMinHeight, '米')
  console.log('墙体最大高度:', analysisParams.wallMaxHeight, '米')
  console.log('==================================')
  
  // 调用 MeasureVolume 的计算方法
  measureVolume.calculateVolume({
    polygon: currentPolygonData,
    planeHeight: analysisParams.planeHeight,
    wallMinHeight: analysisParams.wallMinHeight,
    wallMaxHeight: analysisParams.wallMaxHeight
  }, (result) => {
    console.log('========== 分析完成 ==========')
    console.log('挖方量:', result.cutVolume.toFixed(2), '立方米')
    console.log('填方量:', result.fillVolume.toFixed(2), '立方米')
    console.log('面积:', result.area.toFixed(2), '平方米')
    console.log('区域最小高程:', result.minHeight.toFixed(2), '米')
    console.log('区域最大高程:', result.maxHeight.toFixed(2), '米')
    console.log('基准面高度:', result.planeHeight, '米')
    console.log('墙体最小高度:', result.wallMinHeight, '米')
    console.log('墙体最大高度:', result.wallMaxHeight, '米')
    console.log('=============================')
    
    isAnalyzing.value = false
    
    // 更新结果显示
    updateResults(result)
    
    // 自动可视化结果
    visualizeResult()
    
    statusMessage.value = '分析完成！可调整参数重新分析'
  })
}

/**
 * 更新结果展示
 * @param {Object} result - 分析结果
 */
const updateResults = (result) => {
  analysisResults.cutVolume = result.cutVolume
  analysisResults.fillVolume = result.fillVolume
  analysisResults.area = result.area
  analysisResults.minHeight = result.minHeight
  analysisResults.maxHeight = result.maxHeight
}

/**
 * 可视化分析结果
 */
const visualizeResult = () => {
  if (!measureVolume) return
  
  measureVolume.visualize({
    polygonColor: Cesium.Color.CHARTREUSE.withAlpha(0.5),
    wallColor: Cesium.Color.CYAN.withAlpha(0.7),
    showLabel: true
  })
  
  console.log('可视化已添加到场景')
}

/**
 * 重新分析（参数改变时）
 */
const reAnalyze = () => {
  if (currentPolygonData.length >= 3) {
    startVolumeAnalysis()
  }
}

/**
 * 清除分析结果和可视化
 */
const clearAnalysis = () => {
  // 清除绘制
  clearDrawings()
  
  // 清除可视化
  if (measureVolume) {
    measureVolume.clearVisuals()
  }
  
  // 重置结果
  analysisResults.cutVolume = 0
  analysisResults.fillVolume = 0
  analysisResults.area = 0
  analysisResults.minHeight = 0
  analysisResults.maxHeight = 0
  currentPolygonData = []
  
  statusMessage.value = '已清除，点击"绘制多边形"开始新的分析'
  console.log('分析已清除')
}
</script>

<template>
  <div class="cesium-wrapper">
    <div id="cesium-container"></div>
    <div v-if="!isReady" class="loading-overlay">加载中...</div>
    
    <!-- 状态提示 -->
    <div class="status-bar">
      <span class="status-icon">ℹ</span>
      <span class="status-text">{{ statusMessage }}</span>
    </div>
    
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="panel-header">
        <h3>方量分析</h3>
      </div>
      
      <!-- 绘制区域 -->
      <div class="panel-section">
        <h4>绘制区域</h4>
        <button 
          class="btn btn-primary" 
          :disabled="isDrawing || isAnalyzing"
          @click="startDrawing"
        >
          {{ isDrawing ? '绘制中...' : '绘制多边形' }}
        </button>
        <button 
          class="btn btn-danger" 
          :disabled="isDrawing || isAnalyzing"
          @click="clearAnalysis"
        >
          清除分析
        </button>
      </div>
      
      <!-- 参数设置 -->
      <div class="panel-section">
        <h4>参数设置</h4>
        <div class="form-group">
          <label>基准面高度：{{ analysisParams.planeHeight }} m</label>
          <input 
            type="range" 
            v-model.number="analysisParams.planeHeight" 
            min="0" 
            max="500" 
            step="1"
            @change="reAnalyze"
          />
        </div>
        <div class="form-group">
          <label>墙体最小高度：{{ analysisParams.wallMinHeight }} m</label>
          <input 
            type="range" 
            v-model.number="analysisParams.wallMinHeight" 
            min="0" 
            max="300" 
            step="1"
            @change="reAnalyze"
          />
        </div>
        <div class="form-group">
          <label>墙体最大高度：{{ analysisParams.wallMaxHeight }} m</label>
          <input 
            type="range" 
            v-model.number="analysisParams.wallMaxHeight" 
            min="0" 
            max="1000" 
            step="1"
            @change="reAnalyze"
          />
        </div>
      </div>
      
      <!-- 分析结果 -->
      <div class="panel-section results">
        <h4>分析结果</h4>
        <div class="result-item">
          <span class="label">挖方量:</span>
          <span class="value cut">{{ analysisResults.cutVolume.toFixed(2) }} m³</span>
        </div>
        <div class="result-item">
          <span class="label">填方量:</span>
          <span class="value fill">{{ analysisResults.fillVolume.toFixed(2) }} m³</span>
        </div>
        <div class="result-item">
          <span class="label">面积:</span>
          <span class="value">{{ analysisResults.area.toFixed(2) }} m²</span>
        </div>
        <div class="result-item">
          <span class="label">最小高程:</span>
          <span class="value">{{ analysisResults.minHeight.toFixed(2) }} m</span>
        </div>
        <div class="result-item">
          <span class="label">最大高程:</span>
          <span class="value">{{ analysisResults.maxHeight.toFixed(2) }} m</span>
        </div>
      </div>
      
      <!-- 操作提示 -->
      <div class="panel-section">
        <h4>操作提示</h4>
        <ul class="tips">
          <li>1. 点击"绘制多边形"开始</li>
          <li>2. 左键点击添加顶点</li>
          <li>3. 右键点击结束绘制</li>
          <li>4. 自动分析并可视化结果</li>
          <li>5. 拖动滑块调整参数</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cesium-wrapper {
  width: 100%;
  height: 100vh;
  position: relative;
}

.control-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 280px;
  background: #fff;
  border: 1px solid #ccc;
  padding: 15px;
  z-index: 50;
  max-height: 90vh;
  overflow-y: auto;
}

.control-panel h3 {
  margin-top: 0;
  font-size: 16px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.control-panel h4 {
  margin: 10px 0 5px 0;
  font-size: 13px;
}

.btn {
  display: block;
  width: 100%;
  padding: 8px;
  margin-bottom: 8px;
  border: 1px solid #ccc;
  cursor: pointer;
  font-size: 13px;
}

.btn-primary {
  background: #409EFF;
  color: #fff;
  border-color: #409EFF;
}

.btn-danger {
  background: #F56C6C;
  color: #fff;
  border-color: #F56C6C;
}

.form-group {
  margin-bottom: 10px;
}

.form-group label {
  display: block;
  font-size: 12px;
  margin-bottom: 3px;
}

.form-group input {
  width: 100%;
}

.results {
  background: #f8f9fa;
  padding: 10px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 13px;
}

.result-item .value.cut {
  color: #E6A23C;
  font-weight: bold;
}

.result-item .value.fill {
  color: #67C23A;
  font-weight: bold;
}

.tips {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: #666;
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
  background-color: rgba(255, 255, 255, 0.95);
  border: 1px solid #ccc;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.status-icon {
  color: #409EFF;
  font-weight: bold;
  font-size: 12px;
}

.status-text {
  font-size: 12px;
  color: #333;
}
</style>