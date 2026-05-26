<script setup>
/**
 * AreaMeasure.vue - 独立面积测量示例
 *
 * 【功能说明】
 * 点击地图添加多边形顶点 → 多边形实时预览变形 → 完成后显示面积
 * 支持多种完成方式：Enter 键 / 右键 / 双击 | Esc 取消
 *
 * 【核心原理】
 * 1. 使用 ScreenSpaceEventHandler 监听鼠标左键、右键、双击和移动事件
 * 2. 使用 CallbackProperty 动态更新多边形轮廓，实现跟随鼠标变形的预览效果
 * 3. 使用 Chamberlain-Duquette 球面公式计算多边形面积（与 turf.area 算法一致）
 *    - 该算法考虑了地球曲率，在大范围多边形上比平面投影算法更精确
 *    - 基于 WGS-84 椭球体长半轴 R = 6378137 米
 * 4. 使用 BoundingSphere.fromPoints 获取多边形中心用于放置面积标签
 *
 * 【交互流程】
 * - 左键点击：逐个添加多边形顶点（第 2 个点后开始显示多边形预览）
 * - 完成方式（满足 ≥3 个顶点时）：
 *   - Enter 键：通过键盘完成
 *   - 右键：通过鼠标右键完成
 *   - 双击：快速完成（最后一次双击会额外添加一个顶点）
 * - Esc 键：取消当前测量
 *
 * 【算法详解：Chamberlain-Duquette 球面面积公式】
 * 对于球面上由 n 个顶点围成的多边形，面积公式为：
 *   A = (R² / 2) × |Σᵢ(λᵢ₊₂ - λᵢ) × sin(φᵢ₊₁)|
 * 其中 λ 为经度，φ 为纬度，R 为地球半径。
 * 该公式对球面上的多边形给出精确面积，无需投影到平面。
 *
 * 【设计要点】
 * - 鼠标位置（mousePosition）独立于已提交顶点（activePoints），避免覆盖 Bug
 * - 多边形预览和边界线均通过 CallbackProperty 动态获取坐标
 * - 使用 arcType: Cesium.ArcType.RHUMB 确保多边形边界沿恒向线绘制
 * - 临时顶点标记加入 tempEntities，取消时清理；最终结果保留
 * - 键盘事件绑定到 window 级别，清理时安全移除
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'

/** @type {Cesium.Viewer|null} Cesium Viewer 实例 */
let viewer = null

/** 是否初始化完成 */
const isReady = ref(false)

/** 状态栏提示信息 */
const statusMessage = ref('点击地图添加顶点')

/** 当前是否处于面积测量交互模式 */
let isMeasuring = false

/** @type {Cesium.ScreenSpaceEventHandler|null} 屏幕空间事件处理器 */
let handler = null

/** @type {Cesium.Cartesian3[]} 已确认的测量点数组（用户点击提交的坐标） */
let activePoints = []

/**
 * 鼠标实时位置（独立于 activePoints）
 *
 * 【关键设计】
 * 多边形预览通过此变量动态拼接到 activePoints 末尾。
 * 这样可以确保鼠标移动只影响预览形状，绝不修改已提交的顶点坐标。
 *
 * @type {Cesium.Cartesian3|null}
 */
let mousePosition = null

/** @type {Cesium.Entity|null} 动态预览实体（包含多边形填充和边界线） */
let activeShape = null

/** @type {Cesium.Entity|null} 浮动标记点实体（跟随鼠标移动） */
let floatingPoint = null

/** @type {Set<string>} 临时实体 ID 集合，取消测量时统一清理 */
let tempEntities = new Set()

/**
 * 当前键盘事件处理函数引用
 * 用于在清理时安全移除 window 级别的 keydown 监听
 * @type {Function|null}
 */
let currentKeyDownHandler = null

// ======================== 坐标拾取工具函数 ========================

/**
 * 获取屏幕坐标对应的笛卡尔坐标
 *
 * 【拾取策略】
 * 1. 先通过 getPickRay + globe.pick 拾取地形表面坐标
 * 2. 如果地形不可用，回退到椭球体表面拾取
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

// ======================== 角度转换与面积计算 ========================

/**
 * 将角度转换为弧度
 *
 * @param {number} degrees - 角度值
 * @returns {number} 对应的弧度值
 */
const toRad = (degrees) => degrees * Math.PI / 180

/**
 * 使用 Chamberlain-Duquette 球面公式计算环形区域面积
 *
 * 【算法原理】
 * 该算法基于球面几何，对于由 n 个经纬度坐标围成的多边形：
 * A = (R² / 2) × |Σᵢ(λᵢ₊₂ - λᵢ) × sin(φᵢ₊₁)|
 *
 * 其中：
 * - R = 6378137 米（WGS-84 椭球体长半轴）
 * - λ 为经度（弧度）
 * - φ 为纬度（弧度）
 * - 索引取模运算实现环形遍历
 *
 * 【优势】
 * - 考虑了地球曲率，在大范围多边形（如跨国区域）上比平面投影精确得多
 * - 与 turf.area 使用的 Spherical 算法结果一致
 * - 计算复杂度 O(n)，适合实时计算
 *
 * @param {number[][]} coords - 经纬度坐标数组 [[lon, lat], ...]，首尾不需要闭合
 * @returns {number} 面积（平方米）
 */
const ringArea = (coords) => {
  const len = coords.length
  if (len <= 2) return 0

  const R = 6378137 // WGS-84 地球长半轴（米）
  let area = 0

  for (let i = 0; i < len; i++) {
    const p1 = coords[i]
    const p2 = coords[(i + 1) % len]
    const p3 = coords[(i + 2) % len]

    area += (toRad(p3[0]) - toRad(p1[0])) * Math.sin(toRad(p2[1]))
  }

  return Math.abs(area * R * R / 2)
}

/**
 * 计算多边形面积（平方米）
 *
 * 将笛卡尔坐标转为经纬度后，使用 Chamberlain-Duquette 球面公式计算。
 * 需要闭合多边形（首尾坐标相同），因此自动追加第一个坐标。
 *
 * @param {Cesium.Cartesian3[]} positions - 顶点坐标数组
 * @returns {number} 面积（平方米）
 */
const calculateArea = (positions) => {
  if (positions.length < 3) return 0

  // 将笛卡尔坐标转换为经纬度 [lon, lat]
  const coordinates = positions.map((pos) => {
    const cartographic = Cesium.Cartographic.fromCartesian(pos)
    return [
      Cesium.Math.toDegrees(cartographic.longitude),
      Cesium.Math.toDegrees(cartographic.latitude)
    ]
  })
  coordinates.push(coordinates[0]) // 闭合环

  return ringArea(coordinates)
}

// ======================== 面积格式化 ========================

/**
 * 将平方米面积格式化为人类可读字符串
 * 根据数值大小自动选择 平方米 / 公顷 / 平方公里 单位
 *
 * @param {number} sqMeters - 面积（平方米）
 * @returns {string} 格式化后的面积字符串
 */
const formatArea = (sqMeters) => {
  if (sqMeters >= 1000000) {
    return `${(sqMeters / 1000000).toFixed(4)} 平方公里`
  }
  if (sqMeters >= 10000) {
    return `${(sqMeters / 10000).toFixed(2)} 公顷`
  }
  return `${sqMeters.toFixed(2)} 平方米`
}

// ======================== 实体创建工具 ========================

/**
 * 创建浮动标记点实体（跟随鼠标移动）
 *
 * @param {Cesium.Cartesian3} position - 初始位置
 * @returns {Cesium.Entity} 浮动点实体（自动加入临时实体集合）
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

// ======================== 预览形状动态数据 ========================

/**
 * 获取面积测量预览多边形的层级数据
 *
 * 通过 CallbackProperty 动态调用，实现多边形跟随鼠标变形的效果。
 * 将浮动点拼接到 activePoints 末尾，形成包含鼠标位置的完整多边形。
 *
 * @returns {Cesium.PolygonHierarchy} 多边形层级（含浮动点）
 */
const getAreaHierarchy = () => {
  const pts = mousePosition ? [...activePoints, mousePosition] : [...activePoints]
  return new Cesium.PolygonHierarchy(pts)
}

/**
 * 获取面积测量预览闭合边界线位置
 *
 * 从最后一个顶点到起点的闭合线，确保多边形轮廓可视化。
 * 通过 CallbackProperty 动态调用，跟随鼠标位置实时更新。
 *
 * @returns {Cesium.Cartesian3[]} 闭合的边界线坐标数组
 */
const getAreaBoundaryPositions = () => {
  const pts = mousePosition ? [...activePoints, mousePosition] : [...activePoints]
  return pts.length >= 2 ? [...pts, pts[0]] : pts
}

/**
 * 创建面积测量的动态预览实体
 *
 * 包含：
 * 1. 半透明绿色填充多边形（alpha=0.3），让用户看到面积范围
 * 2. 绿色边界线，明确多边形轮廓
 *
 * 使用 arcType: Cesium.ArcType.RHUMB 确保边界线沿恒向线（等角线）绘制，
 * 而非大圆弧线，更符合用户的视觉直觉。
 *
 * 仅在添加第二个顶点后创建（需要至少两点才能形成可见形状）。
 */
const createAreaPreviewShape = () => {
  if (activeShape) return

  activeShape = viewer.entities.add({
    polygon: {
      hierarchy: new Cesium.CallbackProperty(getAreaHierarchy, false),
      material: Cesium.Color.GREEN.withAlpha(0.3),
      outline: true,
      outlineColor: Cesium.Color.GREEN,
      outlineWidth: 2,
      arcType: Cesium.ArcType.RHUMB
    },
    polyline: {
      positions: new Cesium.CallbackProperty(getAreaBoundaryPositions, false),
      width: 2,
      material: Cesium.Color.GREEN,
      clampToGround: true
    }
  })
}

// ======================== 交互清理 ========================

/**
 * 清理交互状态
 *
 * 【清理范围】
 * - 销毁事件处理器
 * - 移除动态预览实体（activeShape）
 * - 清除临时标记点（tempEntities 中的浮动点等）
 * - 移除 window 级别的键盘事件监听
 * - 重置内部交互状态
 *
 * 【注意】
 * 不会清理已确认的测量结果实体（最终多边形、面积标签），它们保留显示。
 */
const cleanupInteraction = () => {
  if (handler) {
    handler.destroy()
    handler = null
  }

  if (activeShape) {
    viewer.entities.remove(activeShape)
    activeShape = null
  }

  // 清理测量过程中创建的临时标记点
  tempEntities.forEach((id) => {
    const entity = viewer.entities.getById(id)
    if (entity) {
      viewer.entities.remove(entity)
    }
  })
  tempEntities.clear()

  // 移除 window 级别的键盘事件监听
  if (currentKeyDownHandler) {
    window.removeEventListener('keydown', currentKeyDownHandler)
    currentKeyDownHandler = null
  }

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
 * 每次鼠标移动时，将新位置存入 mousePosition（独立变量），
 * 然后更新浮动点的视觉位置。activePoints 数组不受影响。
 * 多边形预览通过 CallbackProperty 自动读取最新状态并重绘。
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
 * 左键点击处理 - 添加多边形顶点
 *
 * 每次点击添加一个顶点，第二个顶点后开始显示多边形预览。
 * 顶点标记加入临时实体集合，以便取消时清理。
 *
 * @param {Object} event - Cesium 屏幕空间事件对象
 */
const onLeftClick = (event) => {
  const pos = getPosition(event.position)
  if (!pos) {
    statusMessage.value = '无法获取坐标，请重试'
    return
  }

  // 添加顶点标记点（临时实体，取消时清理）
  const point = viewer.entities.add({
    position: pos,
    point: {
      pixelSize: 6,
      color: Cesium.Color.WHITE
    }
  })
  tempEntities.add(point.id)

  activePoints.push(pos)

  // 更新或创建浮动点
  if (floatingPoint) {
    floatingPoint.position = new Cesium.ConstantPositionProperty(pos)
  } else {
    floatingPoint = createFloatingPoint(pos)
  }

  // 第二个顶点后开始显示多边形预览
  if (activePoints.length >= 2) {
    createAreaPreviewShape()
  }

  statusMessage.value = `面积测量：已添加 ${activePoints.length} 个顶点（≥3 后可完成）`
  viewer.scene.requestRender()
}

/**
 * 完成面积测量，生成最终多边形和面积标签
 *
 * 要求至少 3 个顶点才能构成有效多边形。
 * 使用 Chamberlain-Duquette 球面公式计算面积。
 *
 * @returns {boolean} 是否成功完成（顶点不足 3 个时返回 false）
 */
const finishAreaMeasure = () => {
  if (activePoints.length < 3) {
    statusMessage.value = '至少需要 3 个顶点才能构成多边形'
    return false
  }

  const finalPoints = [...activePoints]
  const area = calculateArea(finalPoints)

  // 最终多边形实体（固定坐标，不再跟随鼠标）
  viewer.entities.add({
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(finalPoints),
      material: Cesium.Color.GREEN.withAlpha(0.3),
      outline: true,
      outlineColor: Cesium.Color.GREEN,
      outlineWidth: 2,
      arcType: Cesium.ArcType.RHUMB
    }
  })

  // 面积标签（位于多边形中心上方）
  const center = Cesium.BoundingSphere.fromPoints(finalPoints).center
  viewer.entities.add({
    position: center,
    label: {
      text: formatArea(area),
      font: '16px 微软雅黑',
      fillColor: Cesium.Color.RED,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      pixelOffset: new Cesium.Cartesian2(0, -20)
    }
  })

  statusMessage.value = `面积测量完成：${formatArea(area)}`
  cleanupInteraction()
  isMeasuring = false
  viewer.scene.requestRender()
  return true
}

/**
 * 取消面积测量，清除所有临时绘制内容
 */
const cancelAreaMeasure = () => {
  statusMessage.value = '面积测量已取消'
  cleanupInteraction()
  isMeasuring = false
}

/**
 * 键盘事件处理 - Enter 完成 / Escape 取消
 *
 * @param {KeyboardEvent} e - 键盘事件对象
 */
const onKeyDown = (e) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    finishAreaMeasure()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cancelAreaMeasure()
  }
}

// ======================== 测量控制 ========================

/**
 * 启动面积测量模式
 *
 * 【操作流程】
 * 点击添加顶点 → 多边形实时预览 → Enter / 右键 / 双击完成 | Esc 取消
 *
 * 支持三种完成方式：
 * - Enter 键：通过键盘完成
 * - 右键：通过鼠标右键完成（需 ≥3 个顶点）
 * - 双击：快速完成（最后一次双击会额外添加一个顶点）
 */
const startMeasure = () => {
  if (isMeasuring) {
    stopMeasure()
    return
  }

  isMeasuring = true
  statusMessage.value = '面积测量：点击添加顶点，Enter / 右键 / 双击完成，Esc 取消'
  viewer.scene.canvas.style.cursor = 'crosshair'

  // 绑定键盘事件到 window 级别（确保在 canvas 失焦时也能响应）
  window.addEventListener('keydown', onKeyDown)
  currentKeyDownHandler = onKeyDown

  // 创建事件处理器
  handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

  // 左键点击添加顶点
  handler.setInputAction(onLeftClick, Cesium.ScreenSpaceEventType.LEFT_CLICK)

  // 鼠标移动更新浮动点
  handler.setInputAction(onMouseMove, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

  // 右键完成测量
  handler.setInputAction(finishAreaMeasure, Cesium.ScreenSpaceEventType.RIGHT_CLICK)

  // 双击完成测量
  handler.setInputAction(finishAreaMeasure, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
}

/**
 * 停止测量并清理交互状态
 */
const stopMeasure = () => {
  isMeasuring = false
  cleanupInteraction()
  statusMessage.value = '已停止面积测量'
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
    console.log('AreaMeasure初始化成功')
  } catch (error) {
    console.error('AreaMeasure初始化失败：', error)
    statusMessage.value = 'AreaMeasure初始化失败'
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
  console.log('AreaMeasure已销毁')
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
      <div class="panel-title">面积测量</div>

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
      <span class="status-icon">📐</span>
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
