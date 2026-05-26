<script setup>
/**
 * DrawTool.vue - Cesium 综合绘制工具组件
 *
 * 【功能说明】
 * 1. 集成点、折线、多边形、矩形四种绘制模式
 * 2. 基于 useCesiumDraw composable 实现绘制逻辑复用
 * 3. 支持交互式绘制和绘制结果管理
 *
 * 【核心技术要点】
 *
 * 1. 组件架构
 *    - 视图层（Vue Template）：UI 交互和状态展示
 *    - 业务层（useCesiumDraw）：封装绘制逻辑
 *    - 渲染层（Cesium Viewer）：地图渲染和实体管理
 *
 * 2. useCesiumDraw Composable
 *    - drawLine()：异步绘制折线，返回 Promise<Result>
 *    - drawPolygon()：异步绘制多边形，返回 Promise<Result>
 *    - drawRectangle()：异步绘制矩形（两个对角点），返回 Promise<Result>
 *    - clearDrawings()：清除所有绘制
 *    - cancelCurrentDrawing()：取消当前绘制
 *
 * 3. 绘制结果格式
 *    Result = {
 *      type: 'polyline' | 'polygon' | 'rectangle',
 *      lnglats: [[lon, lat], ...],
 *      wkt: 'LINESTRING (...)' | 'POLYGON (...)',
 *      boundingBox: { west, south, east, north }
 *    }
 *
 * 【交互流程】
 * - 点击按钮选择绘制模式（点/线/面/矩形）
 * - 左键点击添加顶点，矩形只需两个对角点
 * - 折线和多边形右键完成绘制
 * - 绘制结果自动输出到控制台
 * - 点击"清除所有"移除所有绘制
 *
 * 【设计要点】
 * - currentMode 控制当前激活的绘制模式
 * - 点绘制在组件内部直接管理（不在 useCesiumDraw 中）
 * - 模式切换时先停止当前绘制，再开始新绘制
 * - toggleDrawMode 再次点击同一按钮可取消当前绘制
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'
import { useCesiumDraw } from '../../composables/useCesiumDraw'

/** Cesium Viewer 实例 */
let viewer = null
/** 初始化状态 */
const isReady = ref(false)
/** 状态提示信息 */
const statusMessage = ref('请选择绘制模式')
/** 当前绘制模式 */
const currentMode = ref('none')

/** 调用 useCesiumDraw 获取绘制方法 */
const { drawLine, drawPolygon, drawRectangle, clearDrawings, cancelCurrentDrawing } = useCesiumDraw(() => viewer)

/** 已绘制的点实体 ID 集合（点绘制不在 useCesiumDraw 中，需单独管理） */
const pointEntityIds = []
/** 点绘制的事件处理器 */
let pointHandler = null

/**
 * 切换绘制模式
 * 点击按钮后进入对应绘制模式，再次点击同一按钮可取消
 * @param {string} mode - 目标绘制模式 ('point' | 'line' | 'polygon' | 'rectangle')
 */
const toggleDrawMode = async (mode) => {
  if (!viewer || !isReady.value) return

  // 如果点击的是当前正在使用的模式，则取消绘制
  if (currentMode.value === mode) {
    stopDrawing()
    return
  }

  // 先停止之前的绘制
  stopDrawing()
  currentMode.value = mode

  // 根据模式调用对应的绘制方法
  if (mode === 'point') {
    startDrawPoint()
  } else if (mode === 'line') {
    statusMessage.value = '左键点击添加顶点，右键完成绘制'
    const result = await drawLine()
    handleDrawResult(result)
  } else if (mode === 'polygon') {
    statusMessage.value = '左键点击添加顶点，右键完成绘制'
    const result = await drawPolygon()
    handleDrawResult(result)
  } else if (mode === 'rectangle') {
    statusMessage.value = '点击两个对角点绘制矩形'
    const result = await drawRectangle()
    handleDrawResult(result)
  }
}

/**
 * 处理绘制完成的结果
 * @param {Object|null} result - useCesiumDraw 返回的绘制结果
 */
const handleDrawResult = (result) => {
  if (result) {
    console.log('绘制完成:', result.type, result.wkt)
    statusMessage.value = `绘制完成 - ${result.type}`
  } else {
    statusMessage.value = '绘制已取消'
  }
  currentMode.value = 'none'
}

/**
 * 开始绘制点
 * 点击地图任意位置放置一个点标记
 */
const startDrawPoint = () => {
  if (!viewer) return

  statusMessage.value = '点击地图放置点标记'

  pointHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

  pointHandler.setInputAction((event) => {
    // 从屏幕坐标拾取地球表面的三维坐标
    const ray = viewer.camera.getPickRay(event.position)
    if (!ray) return
    const earthPosition = viewer.scene.globe.pick(ray, viewer.scene)
    if (!earthPosition) return

    // 在点击位置添加一个红色点实体
    const pointEntity = viewer.entities.add({
      position: earthPosition,
      point: {
        color: Cesium.Color.RED,
        pixelSize: 10,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2
      }
    })

    // 记录实体 ID 以便后续清除
    pointEntityIds.push(pointEntity.id)

    // 转换为经纬度用于日志输出
    const cartographic = Cesium.Cartographic.fromCartesian(earthPosition)
    const lon = Cesium.Math.toDegrees(cartographic.longitude).toFixed(6)
    const lat = Cesium.Math.toDegrees(cartographic.latitude).toFixed(6)
    console.log(`点绘制完成: 经度=${lon}, 纬度=${lat}`)

    statusMessage.value = `已放置点 (${lon}, ${lat})，继续点击放置更多点`
    viewer.scene.requestRender()
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

/**
 * 停止当前绘制
 * 取消正在进行的绘制操作并重置状态
 */
const stopDrawing = () => {
  // 停止点绘制的事件监听
  if (pointHandler) {
    pointHandler.destroy()
    pointHandler = null
  }

  // 取消 useCesiumDraw 的绘制
  cancelCurrentDrawing()

  currentMode.value = 'none'
  statusMessage.value = '请选择绘制模式'
}

/**
 * 清除所有绘制内容
 * 移除地图上所有已绘制的图形元素
 */
const clearAllDrawings = () => {
  if (!viewer) return

  // 先停止当前绘制
  stopDrawing()

  // 清除 useCesiumDraw 绘制的线、面、矩形
  clearDrawings()

  // 清除单独管理的点实体
  pointEntityIds.forEach(id => viewer.entities.removeById(id))
  pointEntityIds.length = 0

  viewer.scene.requestRender()
  statusMessage.value = '已清除所有绘制'
}





/**
 * 初始化 Cesium
 */
const initCesium = async () => {
  try {
    isReady.value = false

    // 创建 Cesium Viewer 实例
    viewer = new Cesium.Viewer('cesium-container', {
      // 可选择添加地形服务
      // terrainProvider: await Cesium.createWorldTerrainAsync(),
    })

    // 设置初始视角为北京
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.397222, 39.9075, 10000),
      duration: 2
    })

    isReady.value = true
    statusMessage.value = '地图加载完成，请选择绘制模式'
    console.log('DrawTool初始化成功')
  } catch (error) {
    console.error('DrawTool初始化失败：', error)
    statusMessage.value = 'DrawTool初始化失败'
  }
}

/**
 * 销毁 Cesium 实例
 */
const destroyCesium = () => {
  stopDrawing()

  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
    viewer = null
  }

  isReady.value = false
  console.log('DrawTool已销毁')
}

// 组件挂载时初始化
onMounted(() => {
  initCesium()
})

// 组件卸载时销毁
onUnmounted(() => {
  destroyCesium()
})
</script>

<template>
  <div class="cesium-wrapper">
    <!-- Cesium 地图容器 -->
    <div id="cesium-container"></div>

    <!-- 加载遮罩 -->
    <div v-if="!isReady" class="loading-overlay">
      <div class="loading-content">加载中...</div>
    </div>

    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="panel-title">绘制工具</div>

      <!-- 绘制模式按钮 -->
      <div class="button-group">
        <button class="draw-btn" :class="{ active: currentMode === 'point' }" @click="toggleDrawMode('point')">
          {{ currentMode === 'point' ? '结束点绘制' : '绘制点' }}
        </button>

        <button class="draw-btn" :class="{ active: currentMode === 'line' }" @click="toggleDrawMode('line')">
          {{ currentMode === 'line' ? '结束线绘制' : '绘制线' }}
        </button>

        <button class="draw-btn" :class="{ active: currentMode === 'polygon' }" @click="toggleDrawMode('polygon')">
          {{ currentMode === 'polygon' ? '结束面绘制' : '绘制面' }}
        </button>

        <button class="draw-btn" :class="{ active: currentMode === 'rectangle' }" @click="toggleDrawMode('rectangle')">
          {{ currentMode === 'rectangle' ? '结束矩形绘制' : '绘制矩形' }}
        </button>
      </div>

      <!-- 清除按钮 -->
      <button class="clear-btn" @click="clearAllDrawings">
        清除所有
      </button>
    </div>

    <!-- 状态提示 -->
    <div class="status-bar">
      <span class="status-icon">ℹ</span>
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
  color: #4a90d9;
  font-weight: bold;
  font-size: 12px;
}

.status-text {
  font-size: 12px;
  color: var(--color-text-primary);
}
</style>