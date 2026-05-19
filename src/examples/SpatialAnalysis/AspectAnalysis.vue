<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'
import { useCesiumDraw } from '@/composables/useCesiumDraw'

// ===================== 原有基础代码 完全保留 无任何修改 =====================
let viewer = null // Cesium 实例
const isReady = ref(false) // 初始化状态
const isDrawing = ref(false) // 是否正在绘制

const initCesium = async () => {
  try {
    isReady.value = false
    viewer = new Cesium.Viewer('cesium-container', {
      terrainProvider: await Cesium.createWorldTerrainAsync(),
    })

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.15, 40.01, 1500),
      duration: 2,
    })
    isReady.value = true
    console.log('BasicEntity 初始化完成')
  } catch (error) {
    console.error('BasicEntity 初始化失败：', error)
  }
}

const destroyCesium = () => {
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
    viewer = null
  }
  isReady.value = false
  console.log('Cesium 销毁完成')
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
}

// ===================== 坡向分析核心模块 =====================
/**
 * 坡向分析主函数
 * @param {Array} extent - 分析范围 [最小经度, 最小纬度, 最大经度, 最大纬度]
 * @param {Number} precision - 采样精度（度，值越小精度越高），默认0.0005度≈55米
 * @returns {Promise<Object>} - 返回坡向数据和可视化实体
 */
const analyzeAspect = async (extent, precision = 0.0005) => {
  if (!viewer || !isReady.value) {
    throw new Error('Cesium viewer 未初始化')
  }

  if (!extent || extent.length !== 4) {
    throw new Error('无效的extent参数，应为[minLon, minLat, maxLon, maxLat]')
  }

  // 清除旧的分析结果
  if (aspectPolygon) {
    viewer.entities.remove(aspectPolygon)
    aspectPolygon = null
  }

  const [minLon, minLat, maxLon, maxLat] = extent
  const rectangle = Cesium.Rectangle.fromDegrees(minLon, minLat, maxLon, maxLat)

  // 计算网格尺寸
  const gridWidth = Math.ceil((maxLon - minLon) / precision)
  const gridHeight = Math.ceil((maxLat - minLat) / precision)

  if (gridWidth < 2 || gridHeight < 2) {
    throw new Error('分析区域太小，无法进行坡向分析')
  }

  // 生成采样点（中心点+8邻域：4正交+4对角）
  const positions = []
  const halfPrecision = precision / 2

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const lon = Cesium.Math.toDegrees(Cesium.Math.lerp(rectangle.west, rectangle.east, x / (gridWidth - 1)))
      const lat = Cesium.Math.toDegrees(Cesium.Math.lerp(rectangle.north, rectangle.south, y / (gridHeight - 1)))

      // 中心点
      positions.push(Cesium.Cartographic.fromDegrees(lon, lat))
      // 4个正交方向
      positions.push(Cesium.Cartographic.fromDegrees(lon - halfPrecision, lat))      // 西
      positions.push(Cesium.Cartographic.fromDegrees(lon + halfPrecision, lat))      // 东
      positions.push(Cesium.Cartographic.fromDegrees(lon, lat - halfPrecision))      // 南
      positions.push(Cesium.Cartographic.fromDegrees(lon, lat + halfPrecision))      // 北
      // 4个对角方向
      positions.push(Cesium.Cartographic.fromDegrees(lon - halfPrecision, lat - halfPrecision)) // 西南
      positions.push(Cesium.Cartographic.fromDegrees(lon + halfPrecision, lat - halfPrecision)) // 东南
      positions.push(Cesium.Cartographic.fromDegrees(lon - halfPrecision, lat + halfPrecision)) // 西北
      positions.push(Cesium.Cartographic.fromDegrees(lon + halfPrecision, lat + halfPrecision)) // 东北
    }
  }

  // 采样地形高度
  const updatedPositions = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, positions)

  // 计算坡向
  const aspectData = []
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const baseIndex = (y * gridWidth + x) * 9  // 每个网格9个点
      const center = updatedPositions[baseIndex]

      if (center.height === undefined) {
        aspectData.push(0)
        continue
      }

      // 8个邻域点
      const west = updatedPositions[baseIndex + 1]
      const east = updatedPositions[baseIndex + 2]
      const south = updatedPositions[baseIndex + 3]
      const north = updatedPositions[baseIndex + 4]
      const southwest = updatedPositions[baseIndex + 5]  // 西南
      const southeast = updatedPositions[baseIndex + 6]  // 东南
      const northwest = updatedPositions[baseIndex + 7]  // 西北
      const northeast = updatedPositions[baseIndex + 8]  // 东北

      let maxHeightDiff = 0
      let maxDx = 0
      let maxDy = 0

      const neighbors = [
        { pos: west, dx: -1, dy: 0, dist: 1 },
        { pos: east, dx: 1, dy: 0, dist: 1 },
        { pos: south, dx: 0, dy: -1, dist: 1 },
        { pos: north, dx: 0, dy: 1, dist: 1 },
        { pos: southwest, dx: -1, dy: -1, dist: Math.SQRT2 },
        { pos: southeast, dx: 1, dy: -1, dist: Math.SQRT2 },
        { pos: northwest, dx: -1, dy: 1, dist: Math.SQRT2 },
        { pos: northeast, dx: 1, dy: 1, dist: Math.SQRT2 }
      ]

      for (const neighbor of neighbors) {
        if (neighbor.pos.height === undefined) continue

        const heightDiff = neighbor.pos.height - center.height
        // 归一化处理：对角方向距离更远，需要除以距离系数
        const normalizedDiff = heightDiff / neighbor.dist
        if (Math.abs(normalizedDiff) > Math.abs(maxHeightDiff)) {
          maxHeightDiff = normalizedDiff
          maxDx = neighbor.dx
          maxDy = neighbor.dy
        }
      }

      if (maxHeightDiff === 0) {
        aspectData.push(0)
        continue
      }

      // 根据高度差方向计算坡向（水流流向）
      let aspect = 0
      if (maxHeightDiff > 0) {
        if (maxDx > 0 && maxDy > 0) aspect = 225
        else if (maxDx > 0 && maxDy === 0) aspect = 270
        else if (maxDx > 0 && maxDy < 0) aspect = 315
        else if (maxDx === 0 && maxDy < 0) aspect = 0
        else if (maxDx < 0 && maxDy < 0) aspect = 45
        else if (maxDx < 0 && maxDy === 0) aspect = 90
        else if (maxDx < 0 && maxDy > 0) aspect = 135
        else if (maxDx === 0 && maxDy > 0) aspect = 180
      } else {
        if (maxDx > 0 && maxDy > 0) aspect = 45
        else if (maxDx > 0 && maxDy === 0) aspect = 90
        else if (maxDx > 0 && maxDy < 0) aspect = 135
        else if (maxDx === 0 && maxDy < 0) aspect = 180
        else if (maxDx < 0 && maxDy < 0) aspect = 225
        else if (maxDx < 0 && maxDy === 0) aspect = 270
        else if (maxDx < 0 && maxDy > 0) aspect = 315
        else if (maxDx === 0 && maxDy > 0) aspect = 0
      }

      aspectData.push(aspect)
    }
  }

  // 创建可视化
  const canvas = createAspectCanvas(aspectData, gridWidth, gridHeight)
  
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

  aspectPolygon = polygon

  return {
    data: aspectData,
    gridSize: { width: gridWidth, height: gridHeight },
    extent: extent,
    precision: precision,
    entity: polygon
  }
}

/**
 * 创建坡向可视化Canvas
 * @param {Array} aspectData - 坡向数据数组
 * @param {Number} width - 网格宽度
 * @param {Number} height - 网格高度
 * @returns {HTMLCanvasElement}
 */
const createAspectCanvas = (aspectData, width, height) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const imgData = new Uint8ClampedArray(width * height * 4)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const aspect = aspectData[y * width + x] ?? 0

      let color
      if (aspect >= 337.5 || aspect < 22.5) color = [0, 150, 255, 180]    // 北
      else if (aspect < 67.5) color = [0, 255, 0, 180]                      // 东北
      else if (aspect < 112.5) color = [0, 255, 255, 180]                   // 东
      else if (aspect < 157.5) color = [255, 255, 0, 180]                   // 东南
      else if (aspect < 202.5) color = [255, 150, 0, 180]                   // 南
      else if (aspect < 247.5) color = [255, 0, 0, 180]                      // 西南
      else if (aspect < 292.5) color = [255, 0, 255, 180]                   // 西
      else color = [150, 0, 255, 180]                                        // 西北

      imgData[idx] = color[0]
      imgData[idx+1] = color[1]
      imgData[idx+2] = color[2]
      imgData[idx+3] = color[3]
    }
  }

  ctx.putImageData(new ImageData(imgData, width, height), 0, 0)
  return canvas
}

// ===================== UI交互模块 =====================
let aspectPolygon = null

const precisionLevel = ref(5) // 滑块精度等级 1-10
const precisionMeters = ref(55) // 当前精度（米）
const currentPrecision = ref(0.0005) // 当前精度值（度）

const updateDelta = () => {
  const level = precisionLevel.value
  currentPrecision.value = level * 0.0001
  precisionMeters.value = Math.round(currentPrecision.value * 111320)
}

const startAspectAnalysis = async () => {
  try {
    // 清除绘制的区域，避免叠加
    if (drawApi) {
      drawApi.clearDrawings()
      currentPolygonPositions.value = null
    }
    await analyzeAspect(currentExtent.value, currentPrecision.value)
  } catch (error) {
    console.error('坡向分析失败:', error)
  }
}
</script>

<template>
  <div class="cesium-wrapper">
    <!-- 原有容器 无修改 -->
    <div id="cesium-container"></div>
    <div v-if="!isReady" class="loading-overlay">加载中...</div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <button @click="startDrawPolygon" :disabled="!isReady" class="btn btn-draw">绘制区域</button>
      <button @click="clearDraw" :disabled="!isReady" class="btn btn-clear">清除绘制</button>
      <button @click="startAspectAnalysis" :disabled="!isReady" class="btn btn-analyze">坡向分析</button>
    </div>

    <!-- 精度滑块 -->
    <div class="precision-control">
      <span>精度: {{ precisionMeters }}m</span>
      <input type="range" min="1" max="10" step="1" v-model="precisionLevel" @change="updateDelta" />
    </div>

    <!-- 坡向分析图例 -->
    <div class="legend">
      <div class="legend-title">坡向</div>
      <div class="legend-item"><span class="color" style="background: rgba(0,150,255,0.7)"></span><span>北</span></div>
      <div class="legend-item"><span class="color" style="background: rgba(0,255,0,0.7)"></span><span>东北</span></div>
      <div class="legend-item"><span class="color" style="background: rgba(0,255,255,0.7)"></span><span>东</span></div>
      <div class="legend-item"><span class="color" style="background: rgba(255,255,0,0.7)"></span><span>东南</span></div>
      <div class="legend-item"><span class="color" style="background: rgba(255,150,0,0.7)"></span><span>南</span></div>
      <div class="legend-item"><span class="color" style="background: rgba(255,0,0,0.7)"></span><span>西南</span></div>
      <div class="legend-item"><span class="color" style="background: rgba(255,0,255,0.7)"></span><span>西</span></div>
      <div class="legend-item"><span class="color" style="background: rgba(150,0,255,0.7)"></span><span>西北</span></div>
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
</style>