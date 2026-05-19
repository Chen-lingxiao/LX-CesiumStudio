<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'
import { useCesiumDraw } from '@/composables/useCesiumDraw'
import * as turf from 'turf'

// ===================== 原有基础代码 完全保留 无任何修改 =====================
let viewer = null
const isReady = ref(false)
const isDrawing = ref(false)

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
    console.log('VolumeAnalysis 初始化完成')
  } catch (error) {
    console.error('VolumeAnalysis 初始化失败：', error)
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

const currentExtent = ref([116.138, 40.001, 116.162, 40.019])
const currentPolygonPositions = ref(null)

const startDrawPolygon = async () => {
  if (!drawApi) return
  isDrawing.value = true
  const result = await drawApi.drawPolygon()
  isDrawing.value = false

  if (result) {
    currentPolygonPositions.value = result.positions
    currentExtent.value = [
      result.boundingBox.west,
      result.boundingBox.south,
      result.boundingBox.east,
      result.boundingBox.north
    ]
    console.log('绘制范围:', currentExtent.value)
  }
}

const clearDraw = () => {
  if (drawApi) {
    drawApi.clearDrawings()
    currentPolygonPositions.value = null
  }
  clearVolumeVisualization()
}

// ===================== 方量分析核心模块 =====================

const toRad = (deg) => (deg * Math.PI) / 180

const ringArea = (coords) => {
  const len = coords.length
  if (len <= 2) return 0

  const R = 6378137
  let area = 0

  for (let i = 0; i < len; i++) {
    const p1 = coords[i]
    const p2 = coords[(i + 1) % len]
    const p3 = coords[(i + 2) % len]

    area += (toRad(p3[0]) - toRad(p1[0])) * Math.sin(toRad(p2[1]))
  }

  return Math.abs(area * R * R / 2)
}

const calculatePolygonArea = (lnglats) => {
  if (lnglats.length < 3) return 0
  const coords = [...lnglats]
  coords.push([...lnglats[0]])
  return ringArea(coords)
}

const volumeEntities = ref([])
const volumeData = ref({
  planeHeight: 50,
  wallMinHeight: 0,
  wallMaxHeight: 100,
  cutVolume: 0,
  fillVolume: 0,
  area: 0,
})

const startVolumeAnalysis = async () => {
  if (!currentPolygonPositions.value || currentPolygonPositions.value.length < 3) {
    console.warn('请先绘制分析区域')
    return
  }
  await calculateVolume()
}

const calculateVolume = async () => {
  const v = getViewer()
  if (!v) return

  clearVolumeVisualization()

  const positions = currentPolygonPositions.value
  const lnglats = positions.map((p) => {
    const carto = Cesium.Cartographic.fromCartesian(p)
    return [Cesium.Math.toDegrees(carto.longitude), Cesium.Math.toDegrees(carto.latitude)]
  })
  lnglats.push([...lnglats[0]])

  const polygonFeature = turf.polygon([lnglats])

  const spacingMeters = 50
  const grid = turf.pointGrid(turf.bbox(polygonFeature), spacingMeters, 'meters')

  const sampleCoords = grid.features.map((f) => f.geometry.coordinates)
  if (sampleCoords.length === 0) {
    console.warn('区域过小未生成采样点，请扩大区域后重试。')
    return
  }

  const cartographics = sampleCoords.map(([lon, lat]) => Cesium.Cartographic.fromDegrees(lon, lat))

  let heights
  try {
    heights = await v.scene.sampleHeightMostDetailed(cartographics)
  } catch (e) {
    console.error('高程采样失败:', e)
    return
  }

  const baseHeight = volumeData.value.planeHeight
  const wallBottomHeight = volumeData.value.wallMinHeight

  let cutVolume = 0
  let fillVolume = 0

  for (let i = 0; i < sampleCoords.length; i++) {
    const [lon, lat] = sampleCoords[i]
    const h = heights[i].height || 0

    const leftBottom = Cesium.Cartesian3.fromDegrees(lon - spacingMeters / 2 / 111320, lat - spacingMeters / 2 / 111320)
    const leftTop = Cesium.Cartesian3.fromDegrees(lon - spacingMeters / 2 / 111320, lat + spacingMeters / 2 / 111320)
    const rightBottom = Cesium.Cartesian3.fromDegrees(lon + spacingMeters / 2 / 111320, lat - spacingMeters / 2 / 111320)
    const cellHeight = Cesium.Cartesian3.distance(leftBottom, leftTop)
    const cellWidth = Cesium.Cartesian3.distance(leftBottom, rightBottom)
    const cellArea = cellWidth * cellHeight

    if (h > baseHeight) {
      cutVolume += (h - baseHeight) * cellArea
    } else if (h < baseHeight) {
      const effectiveGround = Math.max(h, wallBottomHeight)
      if (effectiveGround < baseHeight) {
        fillVolume += (baseHeight - effectiveGround) * cellArea
      }
    }
  }

  volumeData.value.cutVolume = cutVolume.toFixed(2)
  volumeData.value.fillVolume = fillVolume.toFixed(2)
  volumeData.value.area = calculatePolygonArea(lnglats)

  visualizeResults(positions, heights, sampleCoords, baseHeight, wallBottomHeight)
}

const visualizeResults = (positions, heights, sampleCoords, baseHeight, wallBottomHeight) => {
  const v = getViewer()
  if (!v) return

  const baseColor = Cesium.Color.fromCssColorString('rgba(51, 133, 255, 0.5)')
  const wallColor = Cesium.Color.fromCssColorString('rgba(255, 166, 0, 0.6)')

  const basePositions = positions.map((p) => {
    const carto = Cesium.Cartographic.fromCartesian(p)
    return Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, baseHeight)
  })

  const baseEntity = v.entities.add({
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(basePositions),
      material: baseColor,
      heightReference: Cesium.HeightReference.NONE,
    },
  })
  volumeEntities.value.push(baseEntity)

  for (let i = 0; i < positions.length; i++) {
    const p1 = positions[i]
    const p2 = positions[(i + 1) % positions.length]

    const carto1 = Cesium.Cartographic.fromCartesian(p1)
    const carto2 = Cesium.Cartographic.fromCartesian(p2)

    const lon1 = Cesium.Math.toDegrees(carto1.longitude)
    const lat1 = Cesium.Math.toDegrees(carto1.latitude)
    const lon2 = Cesium.Math.toDegrees(carto2.longitude)
    const lat2 = Cesium.Math.toDegrees(carto2.latitude)

    let maxH = 0
    const steps = 10
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      const lon = lon1 + (lon2 - lon1) * t
      const lat = lat1 + (lat2 - lat1) * t
      const carto = Cesium.Cartographic.fromDegrees(lon, lat)
      try {
        const h = v.scene.sampleHeight(carto)
        if (h > maxH) maxH = h
      } catch (e) {}
    }

    const wallTopHeight = Math.max(maxH, baseHeight) + 5

    const wallPositions = [
      Cesium.Cartesian3.fromRadians(carto1.longitude, carto1.latitude, baseHeight),
      Cesium.Cartesian3.fromRadians(carto2.longitude, carto2.latitude, baseHeight),
      Cesium.Cartesian3.fromRadians(carto2.longitude, carto2.latitude, wallTopHeight),
      Cesium.Cartesian3.fromRadians(carto1.longitude, carto1.latitude, wallTopHeight),
    ]

    const wallEntity = v.entities.add({
      polygon: {
        hierarchy: wallPositions,
        material: wallColor,
        perPositionHeight: true,
      },
    })
    volumeEntities.value.push(wallEntity)
  }

  v.scene.requestRender()
}

const clearVolumeVisualization = () => {
  const v = getViewer()
  if (!v) return

  volumeEntities.value.forEach((entity) => {
    v.entities.remove(entity)
  })
  volumeEntities.value = []

  volumeData.value.cutVolume = 0
  volumeData.value.fillVolume = 0
  volumeData.value.area = 0
}
</script>
<template>
  <div class="cesium-wrapper">
    <div id="cesium-container"></div>
    <div v-if="!isReady" class="loading-overlay">加载中...</div>
    
    <div class="control-panel">
      <div class="panel-header">
        <h3>方量分析</h3>
      </div>
      
      <div class="panel-section">
        <h4>绘制区域</h4>
        <button 
          class="btn btn-primary" 
          :disabled="isDrawing"
          @click="startDrawPolygon"
        >
          {{ isDrawing ? '绘制中...' : '绘制多边形' }}
        </button>
        <button class="btn btn-secondary" @click="clearDraw">清除绘制</button>
      </div>
      
      <div class="panel-section">
        <h4>参数设置</h4>
        <div class="form-group">
          <label>平面高度: {{ volumeData.planeHeight }} m</label>
          <input 
            type="range" 
            v-model.number="volumeData.planeHeight" 
            min="0" 
            max="100" 
            step="1"
          />
        </div>
        <div class="form-group">
          <label>墙体最小高度: {{ volumeData.wallMinHeight }} m</label>
          <input 
            type="range" 
            v-model.number="volumeData.wallMinHeight" 
            min="0" 
            max="100" 
            step="1"
          />
        </div>
        <div class="form-group">
          <label>墙体最大高度: {{ volumeData.wallMaxHeight }} m</label>
          <input 
            type="range" 
            v-model.number="volumeData.wallMaxHeight" 
            min="0" 
            max="200" 
            step="1"
          />
        </div>
      </div>
      
      <div class="panel-section">
        <button class="btn btn-success" @click="startVolumeAnalysis">
          开始分析
        </button>
      </div>
      
      <div class="panel-section results">
        <h4>分析结果</h4>
        <div class="result-item">
          <span class="label">挖方量:</span>
          <span class="value cut">{{ volumeData.cutVolume }} m³</span>
        </div>
        <div class="result-item">
          <span class="label">填方量:</span>
          <span class="value fill">{{ volumeData.fillVolume }} m³</span>
        </div>
        <div class="result-item">
          <span class="label">面积:</span>
          <span class="value">{{ volumeData.area.toFixed(2) }} m²</span>
        </div>
      </div>
      
      <div class="panel-section">
        <h4>操作提示</h4>
        <ul class="tips">
          <li>1. 点击"绘制多边形"按钮</li>
          <li>2. 在地图上点击绘制区域</li>
          <li>3. 双击完成绘制</li>
          <li>4. 点击"开始分析"计算方量</li>
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

#cesium-container {
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  z-index: 100;
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

.btn-secondary {
  background: #f5f5f5;
}

.btn-success {
  background: #67C23A;
  color: #fff;
  border-color: #67C23A;
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

.tips {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: #666;
}
</style>
