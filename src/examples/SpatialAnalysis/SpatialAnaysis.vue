<script setup>
/**
 * SpatialAnaysis.vue - Cesium 综合空间分析示例组件
 * 
 * 【功能说明】
 * 集成四种地形分析功能，展示如何调用封装好的 composables：
 * 1. 剖面分析：沿折线采样地形高程，渲染剖面图
 * 2. 坡向分析：分析多边形区域内的坡向分布
 * 3. 坡度分析：分析多边形区域内的坡度分布
 * 4. 方量分析：计算填挖方量
 * 
 * 【调用方式】
 * 直接在页面中引入该组件即可使用：
 * <SpatialAnaysis />
 * 
 * 【模块依赖说明】
 * - useCesiumDraw: 提供绘制折线和多边形的交互能力
 * - useSectionAnalysis: 剖面分析，返回分析器实例
 * - useAspectAnalysis: 坡向分析，返回分析器实例
 * - useSlopeAnalysis: 坡度分析，返回分析器实例
 * - MeasureVolume: 方量分析，需实例化使用
 */

// ------------------------------
// 依赖导入
// ------------------------------
import { onMounted, onUnmounted, ref, reactive, watch } from 'vue'
import * as Cesium from 'cesium'
import { useCesiumDraw } from '@/composables/useCesiumDraw'
import { useSectionAnalysis } from '@/composables/useSectionAnalysis'
import { useAspectAnalysis } from '@/composables/useAspectAnalysis'
import { useSlopeAnalysis } from '@/composables/useSlopeAnalysis'
import { useMeasureVolume } from '@/composables/useMeasureVolume'

// ------------------------------
// 全局实例变量
// ------------------------------
let viewer = null                // Cesium 视图实例
let getViewer = null           // 获取 viewer 的函数（供 composables 使用）
let drawManager = null           // 绘制管理器实例
let sectionAnalyzer = null       // 剖面分析器实例
let aspectAnalyzer = null        // 坡向分析器实例
let slopeAnalyzer = null         // 坡度分析器实例
let volumeAnalyzer = null        // 方量分析器实例

// ------------------------------
// 响应式状态（通用）
// ------------------------------
const isReady = ref(false)               // Cesium 是否初始化完成
const isDrawing = ref(false)             // 是否正在绘制
const statusMessage = ref('点击"绘制剖面线"开始分析')  // 状态提示信息
const currentMode = ref('section')       // 当前分析模式: section | aspect | slope | volume

// ------------------------------
// 响应式状态（坡向/坡度分析共用）
// ------------------------------
const currentExtent = ref([116.138, 40.001, 116.162, 40.019])  // 分析区域范围
const currentPolygonPositions = ref(null)                        // 当前多边形顶点位置
const precisionLevel = ref(5)            // 精度等级 (1-10)
const precisionMeters = ref(55)          // 精度对应的米数
const currentPrecision = ref(0.0005)     // 精度（经纬度单位）
const showAspectResult = ref(false)      // 是否显示坡向图例
const showSlopeResult = ref(false)       // 是否显示坡度图例

// ------------------------------
// 响应式状态（方量分析专用）
// ------------------------------
const volumeResult = ref(null)           // 方量计算结果
const volumePolygonData = ref(null)      // 保存原始多边形数据（用于重新分析）

/**
 * 方量分析参数配置
 * - planeHeight: 基准面高度（米）
 * - wallMinHeight: 墙体最小高度（米）
 * - wallMaxHeight: 墙体最大高度（米）
 */
const volumeParams = reactive({
  planeHeight: 100,
  wallMinHeight: 0,
  wallMaxHeight: 200
})

// ------------------------------
// 方量分析参数监听（自动重新分析）
// ------------------------------
watch(volumeParams, () => {
  if (volumeResult.value) {
    handleReAnalyzeVolume()
  }
}, { deep: true })

// ------------------------------
// 初始化函数
// ------------------------------
/**
 * 初始化 Cesium 视图和所有分析器
 * 【调用时机】组件挂载时自动调用
 */
const initCesium = async () => {
  try {
    isReady.value = false
    
    // 1. 创建 Cesium Viewer
    viewer = new Cesium.Viewer('cesium-container', {
      terrainProvider: await Cesium.createWorldTerrainAsync(),
    })
    viewer.scene.globe.depthTestAgainstTerrain = true

    // 2. 定位到默认区域（北京附近）
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.15, 40.01, 1500),
      duration: 2,
    })

    // 3. 初始化各分析模块
    getViewer = () => viewer
    drawManager = useCesiumDraw(getViewer)
    sectionAnalyzer = useSectionAnalysis(getViewer, 'section-chart')
    aspectAnalyzer = useAspectAnalysis(getViewer)
    slopeAnalyzer = useSlopeAnalysis(getViewer)
    volumeAnalyzer = useMeasureVolume(getViewer, { terrainLevel: 13 })

    isReady.value = true
    console.log('SpatialAnalysis 初始化完成')
  } catch (error) {
    console.error('SpatialAnalysis 初始化失败：', error)
  }
}

// ------------------------------
// 精度设置函数
// ------------------------------
/**
 * 更新分析精度
 * @description 根据精度等级计算实际精度值（米和经纬度单位）
 */
const updateDelta = () => {
  const level = precisionLevel.value
  currentPrecision.value = level * 0.0001
  precisionMeters.value = Math.round(currentPrecision.value * 111320)
}

// ------------------------------
// 模式切换函数
// ------------------------------
/**
 * 切换分析模式
 * @param {string} mode - 目标模式: 'section' | 'aspect' | 'slope' | 'volume'
 * @description 切换模式时自动清除之前的分析结果
 */
const switchMode = (mode) => {
  currentMode.value = mode
  handleClear()
  
  // 设置对应模式的初始提示
  switch (mode) {
    case 'section':
      statusMessage.value = '点击"绘制剖面线"开始剖面分析'
      break
    case 'aspect':
      statusMessage.value = '点击"绘制分析区域"开始坡向分析'
      break
    case 'slope':
      statusMessage.value = '点击"绘制分析区域"开始坡度分析'
      break
    case 'volume':
      statusMessage.value = '点击"绘制区域"开始方量分析'
      volumeResult.value = null
      break
  }
}

// ------------------------------
// 绘制交互函数
// ------------------------------

/**
 * 绘制剖面线
 * @description 调用 drawManager.drawLine() 绘制折线，完成后自动执行剖面分析
 */
const handleDrawSection = async () => {
  if (!drawManager || !sectionAnalyzer) return
  if (isDrawing.value) return

  isDrawing.value = true
  statusMessage.value = '绘制中：左键点击添加顶点，右键结束绘制'

  const result = await drawManager.drawLine()
  isDrawing.value = false

  if (result && result.lnglats && result.lnglats.length >= 2) {
    // 调用剖面分析器的分析方法
    sectionAnalyzer.analyzeSection(result.lnglats)
    statusMessage.value = '剖面分析完成，悬停图表查看高程详情'
  } else {
    statusMessage.value = '绘制取消，请重新绘制'
  }
}

/**
 * 绘制分析区域（坡向/坡度共用）
 * @description 调用 drawManager.drawPolygon() 绘制多边形，保存区域范围和顶点
 */
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
    
    // 根据当前模式设置提示信息
    if (currentMode.value === 'aspect') {
      statusMessage.value = '区域绘制完成，点击"开始坡向分析"进行分析'
    } else if (currentMode.value === 'slope') {
      statusMessage.value = '区域绘制完成，点击"开始坡度分析"进行分析'
    }
  } else {
    statusMessage.value = '绘制取消，请重新绘制'
  }
}

/**
 * 绘制方量分析区域
 * @description 调用 drawManager.drawPolygon() 绘制多边形，保存多边形数据供分析使用
 */
const handleDrawVolumePolygon = async () => {
  if (!drawManager) return
  if (isDrawing.value) return

  isDrawing.value = true
  statusMessage.value = '绘制中：左键点击添加顶点，右键结束绘制'

  const result = await drawManager.drawPolygon()
  isDrawing.value = false

  if (result && result.positions && result.positions.length >= 3) {
    volumePolygonData.value = result.lnglats // 保存原始多边形经纬度数据
    statusMessage.value = '区域绘制完成，点击"计算方量"进行分析'
  } else {
    statusMessage.value = '绘制取消，请重新绘制'
  }
}

// ------------------------------
// 分析执行函数
// ------------------------------

/**
 * 执行坡向分析
 * @description 调用 aspectAnalyzer.analyzeAspect() 进行坡向分析
 * @param {Array} extent - 分析区域范围 [west, south, east, north]
 * @param {number} precision - 分析精度（经纬度单位）
 * @param {Array} polygonPositions - 多边形顶点位置（用于裁剪分析结果）
 */
const handleStartAspectAnalysis = async () => {
  if (!aspectAnalyzer) return
  if (!currentExtent.value || currentExtent.value.length !== 4) {
    statusMessage.value = '请先绘制分析区域'
    return
  }

  try {
    statusMessage.value = '分析中，请稍候...'
    
    // 调用坡向分析器的分析方法
    await aspectAnalyzer.analyzeAspect(
      currentExtent.value, 
      currentPrecision.value, 
      currentPolygonPositions.value
    )
    
    // 清除绘制的多边形
    if (drawManager) {
      drawManager.clearDrawings()
    }
    currentPolygonPositions.value = null
    showAspectResult.value = true
    showSlopeResult.value = false
    statusMessage.value = '坡向分析完成'
  } catch (error) {
    console.error('坡向分析失败:', error)
    statusMessage.value = '坡向分析失败：' + error.message
  }
}

/**
 * 执行坡度分析
 * @description 调用 slopeAnalyzer.analyzeSlope() 进行坡度分析
 * @param {Array} extent - 分析区域范围 [west, south, east, north]
 * @param {number} precision - 分析精度（经纬度单位）
 * @param {Array} polygonPositions - 多边形顶点位置（用于裁剪分析结果）
 */
const handleStartSlopeAnalysis = async () => {
  if (!slopeAnalyzer) return
  if (!currentExtent.value || currentExtent.value.length !== 4) {
    statusMessage.value = '请先绘制分析区域'
    return
  }

  try {
    statusMessage.value = '分析中，请稍候...'
    
    // 调用坡度分析器的分析方法
    await slopeAnalyzer.analyzeSlope(
      currentExtent.value, 
      currentPrecision.value, 
      currentPolygonPositions.value
    )
    
    // 清除绘制的多边形
    if (drawManager) {
      drawManager.clearDrawings()
    }
    currentPolygonPositions.value = null
    showSlopeResult.value = true
    showAspectResult.value = false
    statusMessage.value = '坡度分析完成'
  } catch (error) {
    console.error('坡度分析失败:', error)
    statusMessage.value = '坡度分析失败：' + error.message
  }
}

/**
 * 执行方量计算
 * @description 调用 volumeAnalyzer.calculateVolume() 计算填挖方量
 * @param {Array} polygon - 多边形经纬度数组
 * @param {number} planeHeight - 基准面高度
 * @param {number} wallMinHeight - 墙体最小高度
 * @param {number} wallMaxHeight - 墙体最大高度
 */
const handleCalculateVolume = async () => {
  if (!volumeAnalyzer || !volumePolygonData.value) {
    statusMessage.value = '请先绘制分析区域'
    return
  }

  try {
    statusMessage.value = '计算中，请稍候...'
    
    // 清除绘制的多边形
    if (drawManager) {
      drawManager.clearDrawings()
    }
    
    // 调用方量分析器的计算方法
    volumeAnalyzer.calculateVolume({
      polygon: volumePolygonData.value,
      planeHeight: volumeParams.planeHeight,
      wallMinHeight: volumeParams.wallMinHeight,
      wallMaxHeight: volumeParams.wallMaxHeight
    }, (result) => {
      // 保存计算结果
      volumeResult.value = {
        cutVolume: Math.round(result.cutVolume),
        fillVolume: Math.round(result.fillVolume),
        netVolume: Math.round(result.cutVolume - result.fillVolume),
        area: Math.round(result.area),
        minHeight: Math.round(result.minHeight),
        maxHeight: Math.round(result.maxHeight),
        planeHeight: result.planeHeight,
        wallMinHeight: result.wallMinHeight,
        wallMaxHeight: result.wallMaxHeight
      }
      
      // 可视化分析结果
      volumeAnalyzer.visualize({
        polygonColor: Cesium.Color.CHARTREUSE.withAlpha(0.5),
        wallColor: Cesium.Color.CYAN.withAlpha(0.7),
        showLabel: true
      })
      
      statusMessage.value = '方量计算完成'
    })
  } catch (error) {
    console.error('方量计算失败:', error)
    statusMessage.value = '方量计算失败：' + error.message
  }
}

/**
 * 重新分析方量
 * @description 参数变更时重新执行方量计算
 */
const handleReAnalyzeVolume = () => {
  if (volumeResult.value) {
    handleCalculateVolume()
  }
}

// ------------------------------
// 清理函数
// ------------------------------
/**
 * 清除所有分析结果和绘制内容
 * @description 切换模式或手动清除时调用
 */
const handleClear = () => {
  // 清除各分析器的结果
  if (sectionAnalyzer) {
    sectionAnalyzer.clearSection()
  }
  if (aspectAnalyzer) {
    aspectAnalyzer.clearAspect()
  }
  if (slopeAnalyzer) {
    slopeAnalyzer.clearSlope()
  }
  if (volumeAnalyzer) {
    volumeAnalyzer.clearVisuals()
  }
  if (drawManager) {
    drawManager.clearDrawings()
  }
  
  // 重置状态
  currentPolygonPositions.value = null
  showAspectResult.value = false
  showSlopeResult.value = false
  volumeResult.value = null
  volumePolygonData.value = null
}

/**
 * 组件卸载时清理资源
 * @description 销毁所有分析器实例，释放内存
 */
const handleDestroy = () => {
  if (sectionAnalyzer) {
    sectionAnalyzer.destroy()
  }
  if (aspectAnalyzer) {
    aspectAnalyzer.destroy()
  }
  if (slopeAnalyzer) {
    slopeAnalyzer.destroy()
  }
  if (volumeAnalyzer) {
    volumeAnalyzer.destroy()
  }
  if (viewer) {
    viewer.destroy()
    viewer = null
  }
}

// ------------------------------
// 生命周期钩子
// ------------------------------
onMounted(() => {
  initCesium()
})

onUnmounted(() => {
  handleDestroy()
})
</script>

<template>
   <div class="cesium-wrapper">
    <div id="cesium-container"></div>
    
    <!-- 模式切换标签 -->
    <div class="mode-tabs">
      <button 
        :class="['mode-tab', { active: currentMode === 'section' }]"
        @click="switchMode('section')"
      >
        剖面分析
      </button>
      <button 
        :class="['mode-tab', { active: currentMode === 'aspect' }]"
        @click="switchMode('aspect')"
      >
        坡向分析
      </button>
      <button 
        :class="['mode-tab', { active: currentMode === 'slope' }]"
        @click="switchMode('slope')"
      >
        坡度分析
      </button>
      <button 
        :class="['mode-tab', { active: currentMode === 'volume' }]"
        @click="switchMode('volume')"
      >
        方量分析
      </button>
    </div>

    <!-- 剖面分析工具栏 -->
    <div v-if="currentMode === 'section'" class="toolbar">
      <button :disabled="!isReady || isDrawing" @click="handleDrawSection">
        绘制剖面线
      </button>
      <button :disabled="!isReady" @click="handleClear">
        清除
      </button>
    </div>

    <!-- 坡向分析工具栏 -->
    <div v-if="currentMode === 'aspect'" class="toolbar">
      <button :disabled="!isReady || isDrawing" @click="handleDrawPolygon">
        绘制分析区域
      </button>
      <button :disabled="!isReady || !currentPolygonPositions" @click="handleStartAspectAnalysis">
        开始坡向分析
      </button>
      <button :disabled="!isReady" @click="handleClear">
        清除
      </button>
      <div class="precision">
        精度: {{ precisionMeters }}m
        <input type="range" min="1" max="10" v-model="precisionLevel" @change="updateDelta" />
      </div>
    </div>

    <!-- 坡度分析工具栏 -->
    <div v-if="currentMode === 'slope'" class="toolbar">
      <button :disabled="!isReady || isDrawing" @click="handleDrawPolygon">
        绘制分析区域
      </button>
      <button :disabled="!isReady || !currentPolygonPositions" @click="handleStartSlopeAnalysis">
        坡度分析
      </button>
      <button :disabled="!isReady" @click="handleClear">
        清除
      </button>
      <div class="precision">
        精度: {{ precisionMeters }}m
        <input type="range" min="1" max="10" v-model="precisionLevel" @change="updateDelta" />
      </div>
    </div>

    <!-- 方量分析工具栏 -->
    <div v-if="currentMode === 'volume'" class="toolbar">
      <button :disabled="!isReady || isDrawing" @click="handleDrawVolumePolygon">
        绘制区域
      </button>
      <button :disabled="!isReady || !volumePolygonData" @click="handleCalculateVolume">
        计算方量
      </button>
      <button :disabled="!isReady || !volumeResult" @click="handleReAnalyzeVolume">
        重新分析
      </button>
      <button :disabled="!isReady" @click="handleClear">
        清除
      </button>
    </div>

    <!-- 方量分析参数设置 -->
    <div v-if="currentMode === 'volume'" class="volume-panel">
      <div class="panel-header">参数设置</div>
      <div class="param-item">
        <label>基准面高度：{{ volumeParams.planeHeight }} m</label>
        <input type="range" v-model.number="volumeParams.planeHeight" min="0" max="500" step="1" />
      </div>
      <div class="param-item">
        <label>墙体最小高度：{{ volumeParams.wallMinHeight }} m</label>
        <input type="range" v-model.number="volumeParams.wallMinHeight" min="0" max="300" step="1" />
      </div>
      <div class="param-item">
        <label>墙体最大高度：{{ volumeParams.wallMaxHeight }} m</label>
        <input type="range" v-model.number="volumeParams.wallMaxHeight" min="0" max="1000" step="1" />
      </div>
    </div>

    <!-- 状态提示 -->
    <div class="status">{{ statusMessage }}</div>

    <!-- 坡向图例 -->
    <div v-if="currentMode === 'aspect' && showAspectResult" class="legend aspect-legend">
      <div>坡向图例</div>
      <div><span style="background:rgba(0,150,255,0.8)"></span>北</div>
      <div><span style="background:rgba(0,255,0,0.8)"></span>东北</div>
      <div><span style="background:rgba(0,255,255,0.8)"></span>东</div>
      <div><span style="background:rgba(255,255,0,0.8)"></span>东南</div>
      <div><span style="background:rgba(255,150,0,0.8)"></span>南</div>
      <div><span style="background:rgba(255,0,0,0.8)"></span>西南</div>
      <div><span style="background:rgba(255,0,255,0.8)"></span>西</div>
      <div><span style="background:rgba(150,0,255,0.8)"></span>西北</div>
    </div>

    <!-- 坡度图例 -->
    <div v-if="currentMode === 'slope' && showSlopeResult" class="legend slope-legend">
      <div>坡度图例(°)</div>
      <div><span style="background:rgba(0,200,0,0.8)"></span>&lt;10</div>
      <div><span style="background:rgba(100,200,50,0.8)"></span>10-20</div>
      <div><span style="background:rgba(200,200,0,0.8)"></span>20-30</div>
      <div><span style="background:rgba(255,150,0,0.8)"></span>30-45</div>
      <div><span style="background:rgba(255,80,0,0.8)"></span>45-60</div>
      <div><span style="background:rgba(200,0,0,0.8)"></span>&gt;60</div>
    </div>

    <!-- 方量结果 -->
    <div v-if="currentMode === 'volume' && volumeResult" class="legend volume-result">
      <div>方量计算结果</div>
      <div><span class="value-cut">挖方:</span> {{ volumeResult.cutVolume.toLocaleString() }} m³</div>
      <div><span class="value-fill">填方:</span> {{ volumeResult.fillVolume.toLocaleString() }} m³</div>
      <div>净方量: {{ volumeResult.netVolume.toLocaleString() }} m³</div>
      <div>面积: {{ volumeResult.area.toLocaleString() }} m²</div>
      <div>最小高程: {{ volumeResult.minHeight }} m</div>
      <div>最大高程: {{ volumeResult.maxHeight }} m</div>
      <div>基准面高度: {{ volumeResult.planeHeight }} m</div>
    </div>

    <!-- 剖面图 -->
    <div v-if="currentMode === 'section'" id="section-chart" class="section-chart"></div>

    <!-- 加载状态 -->
   <div v-if="!isReady" class="loading-overlay">加载中...</div>
  </div>
</template>

<style scoped>
.mode-tabs {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  gap: 4px;
  background: rgba(0,0,0,0.7);
  padding: 4px;
  border-radius: 8px;
  z-index: 100;
}
.mode-tab {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}
.mode-tab:hover {
  background: rgba(255,255,255,0.1);
}
.mode-tab.active {
  background: white;
  color: #333;
}
.toolbar {
  position: absolute;
  top: 80px;
  left: 20px;
  display: flex;
  gap: 8px;
  background: rgba(255,255,255,0.95);
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  z-index: 100;
}
.toolbar button {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: #409eff;
  color: white;
}
.toolbar button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
.toolbar .precision {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 12px;
}
.status {
  position: absolute;
  bottom: 240px;
  left: 20px;
  background: rgba(255,255,255,0.95);
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
  z-index: 100;
}
.legend {
  position: absolute;
  bottom: 240px;
  right: 20px;
  background: rgba(0,0,0,0.7);
  color: white;
  padding: 14px 16px;
  border-radius: 8px;
  font-size: 13px;
  z-index: 100;
  min-width: 180px;
}
.legend div {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 6px 0;
  line-height: 1.6;
}
.legend span {
  width: 20px;
  height: 14px;
  border-radius: 2px;
}
.legend > div:first-child {
  font-weight: bold;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255,255,255,0.3);
}
.section-chart {
  position: absolute;
  bottom: 20px;
  left: 20px;
  width: calc(100% - 40px);
  height: 200px;
  background: rgba(255,255,255,0.95);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  z-index: 100;
}
.loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.9);
  z-index: 200;
}
.volume-panel {
  position: absolute;
  top: 140px;
  left: 20px;
  background: rgba(255,255,255,0.95);
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  z-index: 100;
  min-width: 280px;
}
.volume-panel .panel-header {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
  color: #333;
}
.volume-panel .param-item {
  margin-bottom: 12px;
}
.volume-panel .param-item:last-child {
  margin-bottom: 0;
}
.volume-panel label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}
.volume-panel input {
  width: 100%;
}
.volume-result .value-cut {
  color: #E6A23C;
  font-weight: bold;
  display: inline-block;
  min-width: 40px;
}
.volume-result .value-fill {
  color: #67C23A;
  font-weight: bold;
  display: inline-block;
  min-width: 40px;
}
</style>