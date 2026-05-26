<script setup>
/**
 * DrawPolygon.vue - Cesium 多边形绘制示例组件
 *
 * 【功能说明】
 * 1. 演示如何在 Cesium 地图上交互式绘制多边形
 * 2. 支持左键连续点击添加顶点，右键闭合多边形
 * 3. 实时预览多边形填充和边框（跟随鼠标变形）
 * 4. 完成绘制后生成 WKT 格式坐标串和外包框
 *
 * 【核心技术要点】
 *
 * 1. 动态预览原理
 *    - 使用 Cesium.CallbackProperty 动态获取多边形顶点数组
 *    - 鼠标移动时更新最后一个顶点位置，实现多边形"拉伸"效果
 *    - activeShapePoints 数组第一个点是起点，最后一个点随鼠标移动
 *
 * 2. 闭合多边形构建
 *    - PolygonHierarchy 支持非闭合顶点数组，自动形成闭合多边形
 *    - 边框线需要手动首尾相连：[...points, points[0]]
 *    - arcType: Cesium.ArcType.RHUMB 确保沿恒向线绘制
 *
 * 3. 坐标转换与 WKT 生成
 *    - Cartesian3 → Cartographic（弧度经纬度）
 *    - 弧度 → 角度：Cesium.Math.toDegrees
 *    - WKT POLYGON 格式：( (lon1 lat1, lon2 lat2, ... ) )
 *
 * 【交互流程】
 * - 点击"绘制多边形"按钮进入绘制模式
 * - 左键点击添加顶点（第1个点创建浮动点和预览，第2个点后显示多边形预览）
 * - 鼠标移动时多边形末端跟随变形
 * - 右键点击闭合多边形，生成最终实体
 * - 顶点不足3个时自动取消绘制
 *
 * 【设计要点】
 * - 预览样式：黄色半透明填充 + 黄色边框
 * - 最终样式：红色半透明填充 + 红色边框
 * - zIndex: 10 确保多边形在地形之上显示
 * - drawnEntityIds 同时存储面实体和边框线实体 ID
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'

/** Cesium Viewer 实例 */
let viewer = null
/** 初始化状态 */
const isReady = ref(false)
/** 状态提示信息 */
const statusMessage = ref('请选择绘制模式')
/** 是否处于多边形绘制模式 */
const isDrawing = ref(false)
/** 已完成的多边形实体 ID 集合（面填充 + 边框线） */
const drawnEntityIds = []
/** 当前绘制的顶点坐标数组 */
let activeShapePoints = []
/** 动态预览的多边形面实体 */
let activeShape = null
/** 动态预览的多边形边框线实体 */
let activePolyline = null
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

  const closedLnglats = [...lnglats, lnglats[0]]
  return {
    type: 'polygon',
    lnglats,
    wkt: `POLYGON ((${closedLnglats.map(p => p.join(' ')).join(', ')}))`,
    boundingBox: { west: minX, south: minY, east: maxX, north: maxY }
  }
}

/** 结束当前多边形绘制，创建最终实体 */
const terminateShape = () => {
  if (!activeShape || !viewer) return

  const finalPositions = [...activeShapePoints]
  viewer.entities.remove(activeShape)
  activeShape = null

  if (activePolyline) {
    viewer.entities.remove(activePolyline)
    activePolyline = null
  }

  if (floatingPoint) {
    viewer.entities.remove(floatingPoint)
    floatingPoint = null
  }

  if (finalPositions.length < 3) {
    resetState()
    statusMessage.value = '顶点不足（至少需要3个），多边形已取消'
    return
  }

  const fillEntity = viewer.entities.add({
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(finalPositions),
      material: Cesium.Color.fromCssColorString('rgba(245, 63, 63, 0.4)'),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      zIndex: 10
    }
  })

  const borderEntity = viewer.entities.add({
    polyline: {
      positions: [...finalPositions, finalPositions[0]],
      width: 3,
      material: Cesium.Color.fromCssColorString('#F53F3F'),
      clampToGround: true
    }
  })

  drawnEntityIds.push(fillEntity.id)
  drawnEntityIds.push(borderEntity.id)

  const result = buildResult(finalPositions)
  console.log('多边形绘制完成:', result.wkt)
  statusMessage.value = `多边形绘制完成，共 ${finalPositions.length} 个顶点`
  resetState()
  viewer.scene.requestRender()
}

/** 重置绘制临时状态 */
const resetState = () => {
  activeShapePoints = []
  activeShape = null
  activePolyline = null
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

/** 开始多边形绘制模式 */
const startDrawPolygon = () => {
  if (!viewer || isDrawing.value) return

  isDrawing.value = true
  statusMessage.value = '左键点击添加顶点，右键闭合多边形'
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

      const dynamicPolygonHierarchy = new Cesium.CallbackProperty(
        () => new Cesium.PolygonHierarchy(activeShapePoints), false
      )
      const dynamicPolylinePositions = new Cesium.CallbackProperty(
        () => [...activeShapePoints, activeShapePoints[0]], false
      )

      activeShape = viewer.entities.add({
        polygon: {
          hierarchy: dynamicPolygonHierarchy,
          material: Cesium.Color.YELLOW.withAlpha(0.4)
        }
      })

      activePolyline = viewer.entities.add({
        polyline: {
          positions: dynamicPolylinePositions,
          width: 3,
          material: Cesium.Color.YELLOW,
          clampToGround: true
        }
      })
    }

    activeShapePoints.push(earthPosition)

    viewer.entities.add({
      position: earthPosition,
      point: { color: Cesium.Color.WHITE, pixelSize: 6 }
    })

    statusMessage.value = `已添加 ${activeShapePoints.length - 1} 个顶点，右键闭合多边形`
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
  if (activeShapePoints.length >= 3) {
    terminateShape()
  } else {
    if (activeShape) viewer.entities.remove(activeShape)
    if (activePolyline) viewer.entities.remove(activePolyline)
    if (floatingPoint) viewer.entities.remove(floatingPoint)
    resetState()
    statusMessage.value = '多边形已取消'
  }
  viewer.scene.requestRender()
}

/** 切换绘制模式 */
const toggleDrawMode = () => {
  if (isDrawing.value) {
    stopDrawing()
  } else {
    startDrawPolygon()
  }
}

/** 清除所有已绘制的多边形 */
const clearAllPolygons = () => {
  if (!viewer) return
  stopDrawing()
  drawnEntityIds.forEach(id => viewer.entities.removeById(id))
  drawnEntityIds.length = 0
  viewer.scene.requestRender()
  statusMessage.value = '已清除所有多边形'
}

/** 初始化 Cesium */
const initCesium = async () => {
  try {
    isReady.value = false
    viewer = new Cesium.Viewer('cesium-container', {})
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.397222, 39.9075, 10000),
      duration: 2
    })
    isReady.value = true
    console.log('DrawPolygon初始化成功')
    statusMessage.value = '地图加载完成，请选择绘制模式'
  } catch (error) {
    console.error('DrawPolygon初始化失败：', error)
    statusMessage.value = 'DrawPolygon初始化失败'
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
  console.log('DrawPolygon已销毁')
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
      <div class="panel-title">多边形绘制工具</div>

      <div class="button-group">
        <button class="draw-btn" :class="{ active: isDrawing }" @click="toggleDrawMode">
          {{ isDrawing ? '结束绘制' : '绘制多边形' }}
        </button>
      </div>

      <button class="clear-btn" @click="clearAllPolygons">
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
