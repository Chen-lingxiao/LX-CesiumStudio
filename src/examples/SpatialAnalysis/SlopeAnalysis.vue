<script setup>
/**
 * SlopeAnalysis.vue - Cesium 地形坡度分析示例组件
 *
 * 【功能说明】
 * 1. 演示如何对地形进行坡度分析（Slope Analysis）
 * 2. 用户可在地图上绘制多边形区域，系统对该区域进行坡度计算
 * 3. 使用 Canvas 渲染坡度可视化结果，并叠加到地形上
 * 4. 提供精度滑块控制分析精度
 *
 * 【核心技术要点】
 *
 * 1. 坡度定义
 *    - 坡度：地形表面的倾斜程度（0°-90°）
 *    - 0°：平坦，90°：垂直悬崖
 *    - 坡度反映地形陡峭程度，对工程建设、农业耕作、灾害防治有重要影响
 *
 * 2. 坡度计算算法（基于中心差分法）
 *    - 使用 8 邻域点计算 x 和 y 方向的梯度
 *    - fx = (westSouth + 2*south + eastSouth - westNorth - 2*north - eastNorth) / (8 * ddx)
 *    - fy = (eastNorth + 2*east + eastSouth - westNorth - 2*west - westSouth) / (8 * ddy)
 *    - slope = arctan(sqrt(fx^2 + fy^2)) 转换为角度
 *
 * 3. 采样策略
 *    - 网格采样：在分析区域内生成均匀网格
 *    - 中心点 + 8 邻域：每个网格点采样 9 个位置（中心 + 8 个方向）
 *    - 使用 Cesium.sampleTerrainMostDetailed 获取精确地形高度
 *
 * 4. 可视化渲染
 *    - Canvas 像素级渲染：每个网格对应一个像素
 *    - 颜色渐变：从绿色(平缓)到红色(陡峭)
 *    - ImageMaterialProperty：将 Canvas 作为纹理叠加到多边形上
 *
 * 【实现步骤】
 * 1. 创建 Viewer 实例并加载全球地形数据
 * 2. 使用 useCesiumDraw 绘制多边形区域
 * 3. 计算分析范围的网格尺寸（gridWidth × gridHeight）
 * 4. 计算实际距离增量 ddx 和 ddy（米）
 * 5. 生成采样点坐标（中心点 + 8 邻域）
 * 6. 使用 sampleTerrainMostDetailed 采样地形高度
 * 7. 对每个网格点计算坡度（中心差分法）
 * 8. 创建 Canvas 并根据坡度值绘制像素
 * 9. 将 Canvas 作为材质应用到多边形
 *
 * 【坡度计算详解】
 * 
 * 使用中心差分法计算梯度：
 * fx = (H西南 + 2*H南 + H东南 - H西北 - 2*H北 - H东北) / (8 * ddx)
 * fy = (H东北 + 2*H东 + H东南 - H西北 - 2*H西 - H西南) / (8 * ddy)
 * slope = arctan(sqrt(fx^2 + fy^2)) * (180/π) 转换为角度
 *
 * 【注意事项】
 * - 必须加载地形数据才能进行坡度分析
 * - 分析精度越高（precision 越小），计算量越大，耗时越长
 * - 精度建议：小区域（<1km²）用 0.0001（~11m），大区域用 0.0005（~55m）
 * - 坡度分析结果叠加到地形上，需要开启 depthTestAgainstTerrain
 * - Canvas 尺寸 = 网格尺寸，过大可能导致性能问题
 *
 * 【使用场景】
 * - 工程规划：道路选线、建筑选址、管线设计
 * - 农业规划：梯田设计、作物种植区选择
 * - 灾害防治：滑坡风险评估、泥石流易发区识别
 * - 生态研究：植被分布、水土流失分析
 * - 军事应用：行军路线规划、阵地选择
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'
import { useCesiumDraw } from '@/composables/useCesiumDraw'

// ===================== 原有基础代码 =====================
let viewer = null // Cesium 实例
const isReady = ref(false) // 初始化状态
const isDrawing = ref(false) // 是否正在绘制

const initCesium = async () => {
  try {
    isReady.value = false
    viewer = new Cesium.Viewer('cesium-container', {
      terrainProvider: await Cesium.createWorldTerrainAsync(),
    })

    viewer.scene.globe.depthTestAgainstTerrain = true

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.15, 40.01, 1500),
      duration: 2,
    })
    isReady.value = true
    console.log('坡度分析 初始化完成')
  } catch (error) {
    console.error('坡度分析 初始化失败：', error)
  }
}

const destroyCesium = () => {
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
    viewer = null
  }
  if (slopePolygon) {
    slopePolygon = null
  }
  isReady.value = false
  console.log('坡度分析 销毁完成')
}

// ===================== 绘制功能集成 =====================
let drawApi = null

const getViewer = () => viewer

onMounted(async () => {
  await initCesium()
  drawApi = useCesiumDraw(getViewer)
})

onUnmounted(() => {
  destroyCesium()
})

// 当前绘制的分析范围
const currentExtent = ref([116.138, 40.001, 116.162, 40.019])
const currentPolygonPositions = ref(null) // 用户绘制的多边形坐标

// 开始绘制多边形
const startDrawPolygon = async () => {
  if (!drawApi) return
  isDrawing.value = true
  const result = await drawApi.drawPolygon()
  isDrawing.value = false
  
  if (result) {
    // 保存绘制的多边形位置
    currentPolygonPositions.value = result.positions
    // 从绘制结果中提取四至范围用于分析
    currentExtent.value = [
      result.boundingBox.west,
      result.boundingBox.south,
      result.boundingBox.east,
      result.boundingBox.north
    ]
    console.log('绘制范围:', currentExtent.value)
  }
}

// 清除绘制
const clearDraw = () => {
  if (drawApi) {
    drawApi.clearDrawings()
    currentPolygonPositions.value = null
  }
  if (slopePolygon) {
    viewer.entities.remove(slopePolygon)
    slopePolygon = null
  }
}

// ===================== 坡度分析核心模块 =====================
/**
 * 坡度分析主函数
 * @param {Array} extent - 分析范围 [最小经度, 最小纬度, 最大经度, 最大纬度]
 * @param {Number} precision - 采样精度（度，值越小精度越高），默认0.0005度≈55米
 * @returns {Promise<Object>} - 返回坡度数据和可视化实体
 */
const analyzeSlope = async (extent, precision = 0.0005) => {
  if (!viewer || !isReady.value) {
    throw new Error('Cesium viewer 未初始化')
  }

  if (!extent || extent.length !== 4) {
    throw new Error('无效的extent参数，应为[minLon, minLat, maxLon, maxLat]')
  }

  // 清除旧的分析结果
  if (slopePolygon) {
    viewer.entities.remove(slopePolygon)
    slopePolygon = null
  }

  const [minLon, minLat, maxLon, maxLat] = extent

  // 计算网格尺寸
  const gridWidth = Math.ceil((maxLon - minLon) / precision)
  const gridHeight = Math.ceil((maxLat - minLat) / precision)

  if (gridWidth < 2 || gridHeight < 2) {
    throw new Error('分析区域太小，无法进行坡度分析')
  }

  // 计算实际距离增量（米）
  const ddx = Cesium.Cartesian3.distance(
    Cesium.Cartesian3.fromDegrees(minLon, minLat),
    Cesium.Cartesian3.fromDegrees(maxLon, minLat)
  ) / gridWidth

  const ddy = Cesium.Cartesian3.distance(
    Cesium.Cartesian3.fromDegrees(minLon, minLat),
    Cesium.Cartesian3.fromDegrees(minLon, maxLat)
  ) / gridHeight

  // 生成采样点（8邻域+中心点）
  const positions = []
  const halfPrecision = precision / 2

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const lon = Cesium.Math.toDegrees(Cesium.Math.lerp(
        Cesium.Math.toRadians(minLon), 
        Cesium.Math.toRadians(maxLon), 
        x / (gridWidth - 1)
      ))
      const lat = Cesium.Math.toDegrees(Cesium.Math.lerp(
        Cesium.Math.toRadians(maxLat), 
        Cesium.Math.toRadians(minLat), 
        y / (gridHeight - 1)
      ))

      // 8个邻域点 + 中心点（中心点放在最后）
      positions.push(Cesium.Cartographic.fromDegrees(lon - halfPrecision, lat))      // 西
      positions.push(Cesium.Cartographic.fromDegrees(lon - halfPrecision, lat - halfPrecision)) // 西南
      positions.push(Cesium.Cartographic.fromDegrees(lon, lat + halfPrecision))      // 北
      positions.push(Cesium.Cartographic.fromDegrees(lon - halfPrecision, lat + halfPrecision)) // 西北
      positions.push(Cesium.Cartographic.fromDegrees(lon + halfPrecision, lat))      // 东
      positions.push(Cesium.Cartographic.fromDegrees(lon + halfPrecision, lat + halfPrecision)) // 东北
      positions.push(Cesium.Cartographic.fromDegrees(lon, lat - halfPrecision))      // 南
      positions.push(Cesium.Cartographic.fromDegrees(lon + halfPrecision, lat - halfPrecision)) // 东南
      positions.push(Cesium.Cartographic.fromDegrees(lon, lat))                      // 中心点
    }
  }

  // 采样地形高度
  const updatedPositions = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, positions)

  // 计算坡度（使用中心差分法）
  const slopeData = []
  for (let i = 0; i < updatedPositions.length; i += 9) {
    const center = updatedPositions[i + 8]

    if (center.height === undefined) {
      slopeData.push(0)
      continue
    }

    // 8个邻域点高度
    const westHeight = updatedPositions[i + 0].height ?? center.height
    const westSouthHeight = updatedPositions[i + 1].height ?? center.height
    const northHeight = updatedPositions[i + 2].height ?? center.height
    const westNorthHeight = updatedPositions[i + 3].height ?? center.height
    const eastHeight = updatedPositions[i + 4].height ?? center.height
    const eastNorthHeight = updatedPositions[i + 5].height ?? center.height
    const southHeight = updatedPositions[i + 6].height ?? center.height
    const eastSouthHeight = updatedPositions[i + 7].height ?? center.height

    // 中心差分法计算梯度
    const fx = (westSouthHeight + 2 * southHeight + eastSouthHeight - westNorthHeight - 2 * northHeight - eastNorthHeight) / (8 * ddx)
    const fy = (eastNorthHeight + 2 * eastHeight + eastSouthHeight - westNorthHeight - 2 * westHeight - westSouthHeight) / (8 * ddy)

    // 计算坡度（弧度转角度）
    const slope = Math.atan(Math.sqrt(fx * fx + fy * fy)) * (180 / Math.PI)
    slopeData.push(Math.min(slope, 90)) // 最大坡度不超过90度
  }

  // 创建可视化（传入多边形边界用于裁剪）
  const canvas = createSlopeCanvas(slopeData, gridWidth, gridHeight, minLon, minLat, maxLon, maxLat, currentPolygonPositions.value)
  
  // 使用用户绘制的多边形边界（如果有），否则使用矩形
  let polygonHierarchy
  if (currentPolygonPositions.value) {
    polygonHierarchy = new Cesium.PolygonHierarchy(currentPolygonPositions.value)
  } else {
    polygonHierarchy = new Cesium.PolygonHierarchy([
      Cesium.Cartesian3.fromDegrees(minLon, minLat),
      Cesium.Cartesian3.fromDegrees(minLon, maxLat),
      Cesium.Cartesian3.fromDegrees(maxLon, maxLat),
      Cesium.Cartesian3.fromDegrees(maxLon, minLat),
    ])
  }
  
  const polygon = viewer.entities.add({
    polygon: {
      hierarchy: polygonHierarchy,
      material: new Cesium.ImageMaterialProperty({
        image: canvas,
        transparent: true
      }),
      classificationType: Cesium.ClassificationType.TERRAIN
    }
  })

  slopePolygon = polygon

  return {
    data: slopeData,
    gridSize: { width: gridWidth, height: gridHeight },
    extent: extent,
    precision: precision,
    entity: polygon
  }
}

/**
 * 判断点是否在多边形内部（射线法）
 * @param {Number} lon - 点的经度
 * @param {Number} lat - 点的纬度
 * @param {Array} polygonPositions - 多边形顶点坐标数组（Cartesian3格式）
 * @returns {Boolean}
 */
const isPointInPolygon = (lon, lat, polygonPositions) => {
  if (!polygonPositions || polygonPositions.length < 3) {
    return true // 如果没有多边形，默认在内部（使用矩形）
  }

  let inside = false
  const n = polygonPositions.length

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = Cesium.Cartographic.fromCartesian(polygonPositions[i]).longitude
    const yi = Cesium.Cartographic.fromCartesian(polygonPositions[i]).latitude
    const xj = Cesium.Cartographic.fromCartesian(polygonPositions[j]).longitude
    const yj = Cesium.Cartographic.fromCartesian(polygonPositions[j]).latitude

    const pointLat = Cesium.Math.toRadians(lat)
    const pointLon = Cesium.Math.toRadians(lon)

    if (((yi > pointLat) !== (yj > pointLat)) &&
        (pointLon < (xj - xi) * (pointLat - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }

  return inside
}

/**
 * 创建坡度可视化Canvas
 * @param {Array} slopeData - 坡度数据数组（角度值）
 * @param {Number} width - 网格宽度
 * @param {Number} height - 网格高度
 * @param {Number} minLon - 最小经度
 * @param {Number} minLat - 最小纬度
 * @param {Number} maxLon - 最大经度
 * @param {Number} maxLat - 最大纬度
 * @param {Array} polygonPositions - 用户绘制的多边形顶点（可选）
 * @returns {HTMLCanvasElement}
 */
const createSlopeCanvas = (slopeData, width, height, minLon, minLat, maxLon, maxLat, polygonPositions = null) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const imgData = new Uint8ClampedArray(width * height * 4)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4

      // 计算当前网格点的经纬度
      const lon = minLon + (maxLon - minLon) * x / (width - 1)
      const lat = maxLat - (maxLat - minLat) * y / (height - 1)

      // 判断点是否在多边形内部
      const isInside = isPointInPolygon(lon, lat, polygonPositions)

      if (!isInside) {
        // 不在多边形内部，设为完全透明
        imgData[idx] = 0
        imgData[idx + 1] = 0
        imgData[idx + 2] = 0
        imgData[idx + 3] = 0
        continue
      }

      const slope = slopeData[y * width + x] ?? 0

      // 根据坡度值设置颜色（绿色到红色渐变）
      let color
      if (slope < 10) {
        // 平缓：绿色
        color = [0, 200, 0, 180]
      } else if (slope < 20) {
        // 较缓：浅绿色
        color = [100, 200, 50, 180]
      } else if (slope < 30) {
        // 中等：黄色
        color = [200, 200, 0, 180]
      } else if (slope < 45) {
        // 较陡：橙色
        color = [255, 150, 0, 180]
      } else if (slope < 60) {
        // 陡峭：红色
        color = [255, 80, 0, 180]
      } else {
        // 极陡：深红色
        color = [200, 0, 0, 180]
      }

      imgData[idx] = color[0]
      imgData[idx + 1] = color[1]
      imgData[idx + 2] = color[2]
      imgData[idx + 3] = color[3]
    }
  }

  ctx.putImageData(new ImageData(imgData, width, height), 0, 0)
  return canvas
}

// ===================== UI交互模块 =====================
let slopePolygon = null

const precisionLevel = ref(5) // 滑块精度等级 1-10
const precisionMeters = ref(55) // 当前精度（米）
const currentPrecision = ref(0.0005) // 当前精度值（度）

const updateDelta = () => {
  const level = precisionLevel.value
  currentPrecision.value = level * 0.0001
  precisionMeters.value = Math.round(currentPrecision.value * 111320)
}

const startSlopeAnalysis = async () => {
  try {
    // 先检查是否有绘制的多边形
    if (!currentPolygonPositions.value) {
      console.warn('请先绘制分析区域')
      return
    }
    
    // 执行坡度分析（此时还保留多边形位置供裁剪使用）
    await analyzeSlope(currentExtent.value, currentPrecision.value)
    
    // 分析完成后再清除绘制的区域
    if (drawApi) {
      drawApi.clearDrawings()
    }
    currentPolygonPositions.value = null
  } catch (error) {
    console.error('坡度分析失败:', error)
  }
}
</script>

<template>
  <div class="cesium-wrapper">
    <!-- 原有容器 -->
    <div id="cesium-container"></div>
    <div v-if="!isReady" class="loading-overlay">加载中...</div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <button @click="startDrawPolygon" :disabled="!isReady" class="btn btn-draw">绘制区域</button>
      <button @click="clearDraw" :disabled="!isReady" class="btn btn-clear">清除绘制</button>
      <button @click="startSlopeAnalysis" :disabled="!isReady" class="btn btn-analyze">坡度分析</button>
    </div>

    <!-- 精度滑块 -->
    <div class="precision-control">
      <span>精度: {{ precisionMeters }}m</span>
      <input type="range" min="1" max="10" step="1" v-model="precisionLevel" @change="updateDelta" />
    </div>

    <!-- 坡度分析图例 -->
    <div class="legend">
      <div class="legend-title">坡度(°)</div>
      <div class="legend-item"><span class="color" style="background: rgba(0,200,0,0.7)"></span><span>&lt;10</span></div>
      <div class="legend-item"><span class="color" style="background: rgba(100,200,50,0.7)"></span><span>10-20</span></div>
      <div class="legend-item"><span class="color" style="background: rgba(200,200,0,0.7)"></span><span>20-30</span></div>
      <div class="legend-item"><span class="color" style="background: rgba(255,150,0,0.7)"></span><span>30-45</span></div>
      <div class="legend-item"><span class="color" style="background: rgba(255,80,0,0.7)"></span><span>45-60</span></div>
      <div class="legend-item"><span class="color" style="background: rgba(200,0,0,0.7)"></span><span>&gt;60</span></div>
    </div>
  </div>
</template>

<style scoped>
/* 工具栏 */
.toolbar {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 8px;
  z-index: 100;
}
.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
.btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
.btn-draw {
  background: #409eff;
  color: white;
}
.btn-clear {
  background: #67c23a;
  color: white;
}
.btn-analyze {
  background: #f56c6c;
  color: white;
}

/* 精度控制 */
.precision-control {
  position: absolute;
  top: 50px;
  left: 10px;
  background: rgba(0,0,0,0.7);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 100;
}

/* 图例 */
.legend {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0,0,0,0.7);
  color: white;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 100;
}
.legend-title {
  font-weight: bold;
  margin-bottom: 8px;
  text-align: center;
  border-bottom: 1px solid rgba(255,255,255,0.3);
  padding-bottom: 4px;
}
.legend-item {
  display: flex;
  align-items: center;
  margin: 4px 0;
}
.legend-item .color {
  width: 16px;
  height: 12px;
  margin-right: 6px;
  border-radius: 2px;
}

/* 加载遮罩 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.8);
  z-index: 200;
}
</style>
