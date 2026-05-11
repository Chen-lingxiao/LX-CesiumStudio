<script setup>
/**
 * DistanceMeasure.vue - 独立距离测量示例
 *
 * 【功能说明】
 * 点击地图添加起点 → 预览线段实时跟随鼠标 → 再次点击完成测量
 * 显示两点间的三维空间距离（单位自动切换：米 / 公里）
 *
 * 【核心原理】
 * 1. 使用 ScreenSpaceEventHandler 监听鼠标左键点击和移动事件
 * 2. 使用 Camera.getPickRay + Globe.pick 获取地形表面坐标（支持地形起伏）
 * 3. 使用 CallbackProperty 动态更新预览线段，实现线段末端跟随鼠标的效果
 * 4. 使用 Cartesian3.distance 计算两点间的欧几里得距离（三维空间距离）
 * 5. 浮动点（floatingPoint）独立于已提交顶点数组（activePoints），避免覆盖已确认坐标
 *
 * 【交互流程】
 * - 左键点击第 1 次：设置起点，创建预览线和浮动点
 * - 左键点击第 2 次：设置终点，计算距离，生成最终结果
 * - 右键点击：取消当前测量（仅在已设置起点时生效）
 * - 测量完成后可继续新的测量，历史结果保留显示
 *
 * 【设计要点】
 * - 结果实体（标记点、连线、标签）不加入 tempEntities，确保完成后保留
 * - 临时实体（浮动点）加入 tempEntities，取消时清理
 * - 浮动点通过 mousePosition 独立追踪，绝不修改 activePoints 中已提交的顶点
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'

/** @type {Cesium.Viewer|null} Cesium Viewer 实例 */
let viewer = null

/** 是否初始化完成 */
const isReady = ref(false)

/** 状态栏提示信息 */
const statusMessage = ref('点击地图添加起点')

/** 当前是否处于距离测量交互模式 */
let isMeasuring = false

/** @type {Cesium.ScreenSpaceEventHandler|null} 屏幕空间事件处理器 */
let handler = null

/** @type {Cesium.Cartesian3[]} 已确认的测量点数组（用户点击提交的坐标） */
let activePoints = []

/**
 * 鼠标实时位置（独立于 activePoints）
 *
 * 【关键设计】
 * 浮动点的视觉位置通过此变量动态拼接，绝不修改 activePoints 中已提交的顶点。
 * 这样可以避免"鼠标移动覆盖已提交顶点"的 Bug。
 *
 * @type {Cesium.Cartesian3|null}
 */
let mousePosition = null

/** @type {Cesium.Entity|null} 动态预览线段实体（CallbackProperty 驱动） */
let activeLine = null

/** @type {Cesium.Entity|null} 浮动标记点实体（跟随鼠标移动，给用户即时视觉反馈） */
let floatingPoint = null

/** @type {Set<string>} 临时实体 ID 集合，取消测量时统一清理 */
let tempEntities = new Set()

// ======================== 坐标拾取工具函数 ========================

/**
 * 获取屏幕坐标对应的笛卡尔坐标
 *
 * 【拾取策略】
 * 1. 先通过 getPickRay + globe.pick 拾取地形表面坐标
 * 2. 如果地形不可用（如无地形数据），回退到椭球体表面拾取
 *
 * @param {Cesium.Cartesian2} screenPos - 屏幕坐标 {x, y}
 * @returns {Cesium.Cartesian3|null} 笛卡尔坐标，拾取失败返回 null
 */
const getPosition = (screenPos) => {
  const ray = viewer.scene.camera.getPickRay(screenPos)
  if (!ray) return null

  // 优先地形拾取，支持地形起伏场景
  const terrainPos = viewer.scene.globe.pick(ray, viewer.scene)
  if (terrainPos) return terrainPos

  // 回退到椭球体表面（无地形数据时使用）
  return viewer.scene.camera.pickEllipsoid(screenPos, viewer.scene.globe.ellipsoid)
}

// ======================== 距离格式化 ========================

/**
 * 将米制距离格式化为人类可读字符串
 * 超过 1 公里自动转为公里单位
 *
 * @param {number} meters - 距离（米）
 * @returns {string} 格式化后的距离字符串，如 "1234.56 米" 或 "1.23 公里"
 */
const formatDistance = (meters) => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} 公里`
  }
  return `${meters.toFixed(2)} 米`
}

// ======================== 实体创建工具 ========================

/**
 * 在指定位置创建标记点实体
 * 标记点加入全局实体（不在 tempEntities 中），测量完成后保留
 *
 * @param {Cesium.Cartesian3} position - 标记位置
 * @param {Cesium.Color} color - 点填充颜色
 * @param {number} [size=8] - 点像素大小
 */
const addMarkerPoint = (position, color, size = 8) => {
  viewer.entities.add({
    position,
    point: {
      pixelSize: size,
      color,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2
    }
  })
}

/**
 * 创建浮动标记点实体（跟随鼠标移动）
 *
 * 【浮动点作用】
 * 浮动点给用户实时视觉反馈，表示"下一个点击将落在此位置"。
 * 它加入 tempEntities 集合，取消测量时会被清理。
 *
 * @param {Cesium.Cartesian3} position - 初始位置
 * @returns {Cesium.Entity} 浮动点实体
 */
const createFloatingPoint = (position) => {
  const entity = viewer.entities.add({
    position,
    point: {
      pixelSize: 6,
      color: Cesium.Color.WHITE
    }
  })
  tempEntities.add(entity.id)
  return entity
}

/**
 * 更新浮动点位置
 *
 * @param {Cesium.Cartesian3} newPos - 新的笛卡尔坐标
 */
const updateFloatingPoint = (newPos) => {
  if (floatingPoint) {
    floatingPoint.position = new Cesium.ConstantPositionProperty(newPos)
  }
}

// ======================== 预览线段动态位置 ========================

/**
 * 获取距离测量预览线段的完整位置列表
 *
 * 通过 CallbackProperty 动态调用，实现线段末端跟随鼠标移动的效果。
 * 当 mousePosition 不为 null 时，将浮动点拼接到 activePoints 末尾。
 *
 * @returns {Cesium.Cartesian3[]} 包含浮动点的完整位置数组
 */
const getDistancePositions = () => {
  return mousePosition ? [...activePoints, mousePosition] : [...activePoints]
}

// ======================== 交互清理 ========================

/**
 * 清理交互状态
 *
 * 【清理范围】
 * - 销毁事件处理器（ScreenSpaceEventHandler）
 * - 移除动态预览实体（activeLine）
 * - 清除临时标记点（tempEntities 中的浮动点等）
 * - 重置内部交互状态（activePoints、mousePosition、floatingPoint）
 *
 * 【注意】
 * 不会清理已确认的测量结果实体（标记点、连线、标签），它们保留显示。
 */
const cleanupInteraction = () => {
  if (handler) {
    handler.destroy()
    handler = null
  }

  if (activeLine) {
    viewer.entities.remove(activeLine)
    activeLine = null
  }

  // 清理测量过程中创建的临时标记点
  tempEntities.forEach((id) => {
    const entity = viewer.entities.getById(id)
    if (entity) {
      viewer.entities.remove(entity)
    }
  })
  tempEntities.clear()

  // 重置交互状态
  activePoints = []
  mousePosition = null
  floatingPoint = null

  if (viewer) {
    viewer.scene.canvas.style.cursor = 'default'
    viewer.scene.requestRender()
  }
}

// ======================== 鼠标事件处理 ========================

/**
 * 鼠标移动处理 - 更新浮动点位置
 *
 * 【核心逻辑】
 * 每次鼠标移动时，将新位置存入 mousePosition（独立变量），
 * 然后更新浮动点的视觉位置。activePoints 数组不受影响。
 * 预览线段通过 CallbackProperty 自动读取最新状态并重绘。
 *
 * @param {Object} event - Cesium 屏幕空间事件对象
 */
const onMouseMove = (event) => {
  if (activePoints.length === 0) return

  const newPos = getPosition(event.endPosition)
  if (!newPos) return

  mousePosition = newPos
  updateFloatingPoint(newPos)
  viewer.scene.requestRender()
}

/**
 * 左键点击处理 - 添加顶点或完成测量
 *
 * 【流程】
 * 第 1 次点击：设置起点，创建预览线段和浮动点
 * 第 2 次点击：设置终点，计算距离，生成最终结果实体
 *
 * 【结果实体说明】
 * 标记点、连线、标签直接加入全局 entities（不在 tempEntities 中），
 * 确保测量完成后仍然保留显示，只有 clearAll 才会清理。
 *
 * @param {Object} event - Cesium 屏幕空间事件对象
 */
const onLeftClick = (event) => {
  const pos = getPosition(event.position)
  if (!pos) {
    statusMessage.value = '无法获取坐标，请重试'
    return
  }

  activePoints.push(pos)

  if (activePoints.length === 1) {
    // === 第一个点：创建起点标记和预览元素 ===
    addMarkerPoint(pos, Cesium.Color.RED)

    // 创建动态预览线段（CallbackProperty 驱动，末端跟随鼠标）
    activeLine = viewer.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(getDistancePositions, false),
        width: 3,
        material: Cesium.Color.CYAN,
        clampToGround: true
      }
    })

    // 创建浮动点（鼠标移动时更新位置）
    floatingPoint = createFloatingPoint(pos)
    statusMessage.value = '距离测量：点击添加终点，右键取消'
  } else {
    // === 第二个点：完成测量 ===
    addMarkerPoint(pos, Cesium.Color.RED)

    // 使用 Cartesian3.distance 计算三维空间距离
    // 注意：这是欧几里得距离，包含高度差
    const distance = Cesium.Cartesian3.distance(activePoints[0], activePoints[1])

    // 创建最终连线（固定坐标，不再跟随鼠标）
    viewer.entities.add({
      polyline: {
        positions: [activePoints[0], activePoints[1]],
        width: 3,
        material: Cesium.Color.CYAN,
        clampToGround: true
      }
    })

    // 在连线中点上方添加距离标签
    const midPos = Cesium.Cartesian3.lerp(activePoints[0], activePoints[1], 0.5, new Cesium.Cartesian3())
    viewer.entities.add({
      position: midPos,
      label: {
        text: formatDistance(distance),
        font: '16px 微软雅黑',
        fillColor: Cesium.Color.YELLOW,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        pixelOffset: new Cesium.Cartesian2(0, -20)
      }
    })

    statusMessage.value = `距离测量完成：${formatDistance(distance)}`
    cleanupInteraction()
    isMeasuring = false
  }

  viewer.scene.requestRender()
}

/**
 * 右键点击处理 - 取消当前测量
 *
 * 仅在已设置起点但未完成测量时生效。
 * 清理所有临时元素，保留已有的历史测量结果。
 */
const onRightClick = () => {
  if (activePoints.length === 1) {
    statusMessage.value = '距离测量已取消'
    cleanupInteraction()
    isMeasuring = false
  }
}

// ======================== 测量控制 ========================

/**
 * 启动距离测量模式
 *
 * 【操作流程】
 * 点击添加起点 → 预览线段跟随鼠标 → 再次点击完成
 * 右键在只有起点时取消测量
 */
const startMeasure = () => {
  if (isMeasuring) {
    stopMeasure()
    return
  }

  isMeasuring = true
  statusMessage.value = '距离测量：点击添加起点'
  viewer.scene.canvas.style.cursor = 'crosshair'

  // 创建事件处理器
  handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

  // 监听左键点击（添加顶点或完成测量）
  handler.setInputAction(onLeftClick, Cesium.ScreenSpaceEventType.LEFT_CLICK)

  // 监听鼠标移动（更新浮动点位置）
  handler.setInputAction(onMouseMove, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

  // 监听右键点击（取消测量）
  handler.setInputAction(onRightClick, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
}

/**
 * 停止测量并清理交互状态
 */
const stopMeasure = () => {
  isMeasuring = false
  cleanupInteraction()
  statusMessage.value = '已停止距离测量'
}

/**
 * 清除所有测量结果（包括已确认的实体和交互状态）
 */
const clearAll = () => {
  stopMeasure()
  viewer.entities.removeAll()
  statusMessage.value = '已清除所有测量结果'
}

// ======================== Cesium 初始化与销毁 ========================

/**
 * 初始化 Cesium Viewer
 *
 * 加载世界地形数据，将相机飞到北京上空
 */
const initCesium = async () => {
  try {
    isReady.value = false

    viewer = new Cesium.Viewer('cesium-container', {
      terrainProvider: await Cesium.createWorldTerrainAsync()
    })

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.397222, 39.9075, 5000),
      duration: 2
    })

    isReady.value = true
  } catch (error) {
    console.error('初始化失败：', error)
    statusMessage.value = '初始化失败'
  }
}

/**
 * 销毁 Cesium Viewer，释放所有资源
 */
const destroyCesium = () => {
  stopMeasure()

  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
    viewer = null
  }

  isReady.value = false
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

    <div v-if="!isReady" class="loading-overlay">加载中...</div>

    <div class="control-panel">
      <div class="panel-title">距离测量</div>

      <button
        class="measure-btn"
        :class="{ active: isMeasuring }"
        @click="startMeasure"
      >
        {{ isMeasuring ? '停止测量' : '开始测量' }}
      </button>

      <button class="clear-btn" @click="clearAll">清除所有</button>
    </div>

    <div class="status-bar">
      <span class="status-icon">📏</span>
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
  min-width: 160px;
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border-muted);
}

.measure-btn {
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
  margin-bottom: 8px;
}

.measure-btn:hover {
  background-color: var(--color-bg-hover);
}

.measure-btn.active {
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
