<script setup>
/**
 * DrawPolyline.vue - Cesium 折线绘制示例组件
 *
 * 【功能说明】
 * 1. 演示如何在 Cesium 地图上交互式绘制折线
 * 2. 支持左键连续点击添加顶点，右键完成绘制
 * 3. 实时预览折线（跟随鼠标变形）
 * 4. 完成绘制后生成 WKT LINESTRING 格式坐标串和外包框
 *
 * 【核心技术要点】
 *
 * 1. 动态预览原理
 *    - 使用 Cesium.CallbackProperty 动态获取折线顶点数组
 *    - 鼠标移动时更新最后一个顶点位置，实现折线"拉伸"效果
 *    - activeShapePoints 数组中最后一个点随鼠标移动
 *
 * 2. 顶点与临时实体管理
 *    - drawnEntityIds：已完成折线的实体 ID
 *    - drawnVertexIds：已完成折线的顶点标记 ID
 *    - activeVertexIds：当前绘制中的顶点标记 ID（绘制完成后转入 drawnVertexIds）
 *    - vertexCounter：顶点 ID 自增计数器
 *
 * 3. 坐标转换与 WKT 生成
 *    - Cartesian3 → Cartographic（弧度经纬度）
 *    - 弧度 → 角度：Cesium.Math.toDegrees，保留8位小数
 *    - WKT LINESTRING 格式：LINESTRING (lon1 lat1, lon2 lat2, ...)
 *
 * 【交互流程】
 * - 点击"绘制折线"按钮进入绘制模式
 * - 左键点击添加顶点（第1个点创建浮动点和预览）
 * - 鼠标移动时折线末端跟随变形
 * - 右键点击完成绘制，生成最终实体和顶点标记
 * - 顶点不足2个时自动取消绘制
 *
 * 【设计要点】
 * - 预览样式：黄色折线，clampToGround 贴地
 * - 顶点样式：白色圆点，pixelSize: 6
 * - 状态栏显示已添加顶点数量
 * - terminateShape 时将 activeVertexIds 合并到 drawnVertexIds
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'

/** Cesium Viewer 实例 */
let viewer = null
/** 初始化状态 */
const isReady = ref(false)
/** 状态提示信息 */
const statusMessage = ref('请选择绘制模式')
/** 是否处于折线绘制模式 */
const isDrawing = ref(false)
/** 已完成的折线实体 ID 集合 */
const drawnEntityIds = []
/** 已完成的顶点实体 ID 集合 */
const drawnVertexIds = []
/** 当前绘制会话的临时顶点 ID 集合 */
const activeVertexIds = []
/** 顶点 ID 自增计数器 */
let vertexCounter = 0
/** 当前绘制的顶点坐标数组 */
let activeShapePoints = []
/** 动态预览折线实体 */
let activeShape = null
/** 跟随鼠标移动的浮动点 */
let floatingPoint = null
/** 屏幕空间事件处理器 */
let handler = null

/**
 * 获取屏幕坐标对应的地形表面笛卡尔坐标
 *
 * @param {Cesium.Cartesian2} position - 屏幕坐标 {x, y}
 * @returns {Cesium.Cartesian3|null} 地形表面坐标，失败返回 null
 */
const getPickedPosition = (position) => {
  const ray = viewer.camera.getPickRay(position)
  if (!ray) return null
  return viewer.scene.globe.pick(ray, viewer.scene)
    || viewer.camera.pickEllipsoid(position, viewer.scene.globe.ellipsoid)
}

/** 将顶点坐标转换为经纬度并生成 WKT */
const buildResult = (positions) => {
  const lnglats = positions.map((p) => {
    const cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(p)
    return [
      Number(Cesium.Math.toDegrees(cartographic.longitude).toFixed(8)),
      Number(Cesium.Math.toDegrees(cartographic.latitude).toFixed(8))
    ]
  })

  let minX = 180, maxX = -180, minY = 90, maxY = -90
  lnglats.forEach(([lon, lat]) => {
    minX = Math.min(minX, lon); maxX = Math.max(maxX, lon)
    minY = Math.min(minY, lat); maxY = Math.max(maxY, lat)
  })

  return {
    type: 'line',
    lnglats,
    wkt: `LINESTRING (${lnglats.map(p => p.join(' ')).join(', ')})`,
    boundingBox: { west: minX, south: minY, east: maxX, north: maxY }
  }
}

/** 结束当前折线绘制，创建最终实体 */
const terminateShape = () => {
  if (!activeShape || !viewer) return

  const finalPositions = [...activeShapePoints]
  viewer.entities.remove(activeShape)
  activeShape = null

  if (floatingPoint) {
    viewer.entities.remove(floatingPoint)
    floatingPoint = null
  }

  if (finalPositions.length < 2) {
    activeVertexIds.forEach(id => viewer.entities.removeById(id))
    activeVertexIds.length = 0
    resetState()
    statusMessage.value = '顶点不足，折线已取消'
    return
  }

  const entity = viewer.entities.add({
    polyline: {
      positions: finalPositions,
      clampToGround: true,
      width: 3,
      material: Cesium.Color.YELLOW
    }
  })
  drawnEntityIds.push(entity.id)

  activeVertexIds.forEach(id => drawnVertexIds.push(id))
  activeVertexIds.length = 0

  const result = buildResult(finalPositions)
  console.log('折线绘制完成:', result.wkt)
  statusMessage.value = `折线绘制完成，共 ${finalPositions.length} 个顶点`
  resetState()
  viewer.scene.requestRender()
}

/** 重置绘制临时状态 */
const resetState = () => {
  activeShapePoints = []
  activeShape = null
  floatingPoint = null
  isDrawing.value = false
  if (handler) {
    handler.destroy()
    handler = null
  }
  if (viewer) {
    viewer.scene.canvas.style.cursor = 'default'
  }
}

/** 开始折线绘制模式 */
const startDrawPolyline = () => {
  if (!viewer || isDrawing.value) return

  isDrawing.value = true
  statusMessage.value = '左键点击添加顶点，右键完成绘制'
  viewer.scene.canvas.style.cursor = 'crosshair'
  activeShapePoints = []

  handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

  handler.setInputAction((event) => {
    const earthPosition = getPickedPosition(event.position)
    if (!earthPosition) return

    if (activeShapePoints.length === 0) {
      floatingPoint = viewer.entities.add({
        position: earthPosition,
        point: { color: Cesium.Color.WHITE, pixelSize: 6 }
      })
      activeShapePoints.push(earthPosition)

      const dynamicPositions = new Cesium.CallbackProperty(() => activeShapePoints, false)
      activeShape = viewer.entities.add({
        polyline: {
          positions: dynamicPositions,
          width: 3,
          material: Cesium.Color.YELLOW,
          clampToGround: true
        }
      })
    }

    activeShapePoints.push(earthPosition)

    const vertexId = `vertex_${vertexCounter++}`
    viewer.entities.add({
      id: vertexId,
      position: earthPosition,
      point: { color: Cesium.Color.WHITE, pixelSize: 6 }
    })
    activeVertexIds.push(vertexId)

    statusMessage.value = `已添加 ${activeShapePoints.length - 1} 个顶点，右键完成绘制`
    viewer.scene.requestRender()
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

  handler.setInputAction((event) => {
    if (!floatingPoint) return
    const newPosition = getPickedPosition(event.endPosition)
    if (!newPosition) return
    floatingPoint.position = new Cesium.ConstantPositionProperty(newPosition)
    activeShapePoints.pop()
    activeShapePoints.push(newPosition)
    viewer.scene.requestRender()
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

  handler.setInputAction(() => {
    activeShapePoints.pop()
    terminateShape()
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
}

/** 停止当前绘制 */
const stopDrawing = () => {
  if (!isDrawing.value) return
  if (activeShapePoints.length >= 2) {
    terminateShape()
  } else {
    if (activeShape) viewer.entities.remove(activeShape)
    if (floatingPoint) viewer.entities.remove(floatingPoint)
    activeVertexIds.forEach(id => viewer.entities.removeById(id))
    activeVertexIds.length = 0
    resetState()
    statusMessage.value = '折线已取消'
  }
  viewer.scene.requestRender()
}

/** 切换绘制模式 */
const toggleDrawMode = () => {
  if (isDrawing.value) {
    stopDrawing()
  } else {
    startDrawPolyline()
  }
}

/** 清除所有已绘制的折线和顶点 */
const clearAllPolylines = () => {
  if (!viewer) return
  stopDrawing()
  drawnEntityIds.forEach(id => viewer.entities.removeById(id))
  drawnEntityIds.length = 0
  drawnVertexIds.forEach(id => viewer.entities.removeById(id))
  drawnVertexIds.length = 0
  viewer.scene.requestRender()
  statusMessage.value = '已清除所有折线和顶点'
}

/** 初始化 Cesium */
const initCesium = async () => {
  try {
    isReady.value = false
    viewer = new Cesium.Viewer('cesium-container', {
      infoBox: false,
      // 选中指示器
      selectionIndicator: false
    })
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.397222, 39.9075, 10000),
      duration: 2
    })
    isReady.value = true
    console.log('DrawPolyline初始化成功')
    statusMessage.value = '地图加载完成，请选择绘制模式'
  } catch (error) {
    console.error('DrawPolyline初始化失败：', error)
    statusMessage.value = 'DrawPolyline初始化失败'
  }
}

/** 销毁 Cesium 实例 */
const destroyCesium = () => {
  stopDrawing()
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
    viewer = null
  }
  isReady.value = false
  console.log('DrawPolyline已销毁')
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

    <div v-if="!isReady" class="loading-overlay">
      <div class="loading-content">加载中...</div>
    </div>

    <div class="control-panel">
      <div class="panel-title">折线绘制工具</div>

      <div class="button-group">
        <button class="draw-btn" :class="{ active: isDrawing }" @click="toggleDrawMode">
          {{ isDrawing ? '结束绘制' : '绘制折线' }}
        </button>
      </div>

      <button class="clear-btn" @click="clearAllPolylines">
        清除所有
      </button>
    </div>

    <div class="status-bar">
      <span class="status-text">{{ statusMessage }}</span>
    </div>
  </div>
</template>

<style scoped>
.control-panel {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  box-shadow: var(--shadow);
  min-width: 200px;
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border-muted);
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
}

.draw-btn {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-bg-elevated);
  color: var(--color-text-primary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.draw-btn:hover {
  background-color: var(--color-bg-hover);
  border-color: var(--color-border-muted);
}

.draw-btn.active {
  background-color: #4a90d9;
  border-color: #4a90d9;
  color: white;
}

.clear-btn {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ff4d4f;
  border-radius: 4px;
  background-color: #ff4d4f;
  color: white;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background-color: #ff7875;
  border-color: #ff7875;
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
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  box-shadow: var(--shadow);
}

.status-icon {
  font-size: 14px;
}

.status-text {
  font-size: 12px;
  color: var(--color-text-primary);
}
</style>
