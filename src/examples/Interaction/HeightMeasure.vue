<script setup>
/**
 * HeightMeasure.vue - 独立高度测量示例
 *
 * 【功能说明】
 * 点击选择起点 → 再次点击选择终点 → 计算并显示两点间的地形高度差
 * 同时显示起点和终点的绝对高度（相对于 WGS-84 椭球面）
 *
 * 【核心原理】
 * 1. 使用 ScreenSpaceEventHandler 监听鼠标左键点击事件
 * 2. 使用 Camera.getPickRay + Globe.pick 获取地形表面坐标（含地形高度）
 * 3. 使用 Cartographic.fromCartesian 将笛卡尔坐标转为弧度制经纬度+高度
 * 4. 高度差 = |起点高度 - 终点高度|（单位：米）
 *
 * 【高度参考系说明】
 * Cesium 中的高度默认基于 WGS-84 椭球面（ellipsoid height），
 * 即该点到椭球面法线方向的距离。加载地形后，globe.pick 返回的坐标
 * 自动包含地形偏移量（即地形表面到椭球面的距离 = 地形高程）。
 *
 * 【连接线设计】
 * 连接线使用 clampToGround: false，确保显示空间直线而非贴地线，
 * 这样可以直观看到两点之间的空间高差关系。
 *
 * 【交互流程】
 * - 左键点击第 1 次：设置起点，显示该点的高度信息
 * - 左键点击第 2 次：设置终点，计算高差，生成连接线和高差标签
 * - 测量完成后可继续新的测量，历史结果保留显示
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'

/** @type {Cesium.Viewer|null} Cesium Viewer 实例 */
let viewer = null

/** 是否初始化完成 */
const isReady = ref(false)

/** 状态栏提示信息 */
const statusMessage = ref('点击地图选择起点')

/** 当前是否处于高度测量交互模式 */
let isMeasuring = false

/** @type {Cesium.ScreenSpaceEventHandler|null} 屏幕空间事件处理器 */
let handler = null

/** @type {Cesium.Cartesian3[]} 已确认的测量点数组（最多 2 个） */
let activePoints = []

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

/**
 * 获取坐标的经纬度和高度信息
 *
 * @param {Cesium.Cartesian3} cartesian - 笛卡尔坐标
 * @returns {{ lon: string, lat: string, height: string }|null} 格式化后的坐标信息
 */
const getPositionInfo = (cartesian) => {
  if (!cartesian) return null

  const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
  return {
    lon: Cesium.Math.toDegrees(cartographic.longitude).toFixed(6),
    lat: Cesium.Math.toDegrees(cartographic.latitude).toFixed(6),
    height: cartographic.height.toFixed(2)
  }
}

// ======================== 交互清理 ========================

/**
 * 清理交互状态
 *
 * 销毁事件处理器，重置内部状态。
 * 不会清理已确认的测量结果实体（标记点、连线、标签），它们保留显示。
 */
const cleanupInteraction = () => {
  if (handler) {
    handler.destroy()
    handler = null
  }

  activePoints = []

  if (viewer) {
    viewer.scene.canvas.style.cursor = 'default'
    viewer.scene.requestRender()
  }
}

// ======================== 鼠标事件处理 ========================

/**
 * 左键点击处理 - 添加测量点或完成测量
 *
 * 【流程】
 * 第 1 次点击：设置起点，显示该点高度，提示选择终点
 * 第 2 次点击：设置终点，计算高差，生成连接线和高差标签
 *
 * 【颜色区分】
 * - 起点：蓝色标记（Cesium.Color.BLUE）
 * - 终点：橙色标记（Cesium.Color.ORANGE）
 * - 连线/标签：品红色（Cesium.Color.MAGENTA）
 *
 * 【结果实体说明】
 * 所有标记点、连线、标签直接加入全局 entities（不在 tempEntities 中），
 * 确保测量完成后仍然保留显示。
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

  // 获取该点的高度信息（相对于椭球面）
  const info = getPositionInfo(pos)

  // 根据是起点还是终点选择不同颜色
  const pointColor = activePoints.length === 1
    ? Cesium.Color.BLUE
    : Cesium.Color.ORANGE

  // 添加标记点（含高度标签）
  viewer.entities.add({
    position: pos,
    point: {
      pixelSize: 8,
      color: pointColor,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2
    },
    label: {
      text: `H: ${info.height}m`,
      font: '12px 微软雅黑',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      pixelOffset: new Cesium.Cartesian2(0, -15),
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    }
  })

  if (activePoints.length === 1) {
    statusMessage.value = '高度测量：点击选择终点'
  } else {
    // === 第二个点：完成测量 ===
    const info1 = getPositionInfo(activePoints[0])
    const info2 = getPositionInfo(activePoints[1])

    // 计算两点间的高差（绝对值）
    const heightDiff = Math.abs(parseFloat(info1.height) - parseFloat(info2.height))

    // 连接线（不贴地，直线显示空间高差）
    // clampToGround: false 确保线段在空间中直线连接，
    // 而非沿地形表面弯曲，这样能直观看到高度差异
    viewer.entities.add({
      polyline: {
        positions: activePoints,
        width: 3,
        material: Cesium.Color.MAGENTA,
        clampToGround: false
      }
    })

    // 在连线中点上方添加高差标签
    const midPos = Cesium.Cartesian3.lerp(activePoints[0], activePoints[1], 0.5, new Cesium.Cartesian3())
    viewer.entities.add({
      position: midPos,
      label: {
        text: `高差: ${heightDiff.toFixed(2)}m`,
        font: '16px 微软雅黑',
        fillColor: Cesium.Color.MAGENTA,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        pixelOffset: new Cesium.Cartesian2(0, -20)
      }
    })

    statusMessage.value = `高度测量完成：起点 ${info1.height}m，终点 ${info2.height}m，高差 ${heightDiff.toFixed(2)}m`
    cleanupInteraction()
    isMeasuring = false
  }

  viewer.scene.requestRender()
}

// ======================== 测量控制 ========================

/**
 * 启动高度测量模式
 *
 * 【操作流程】
 * 点击选择起点 → 再次点击选择终点 → 计算并显示地形高差
 */
const startMeasure = () => {
  if (isMeasuring) {
    stopMeasure()
    return
  }

  isMeasuring = true
  statusMessage.value = '高度测量：点击选择起点'
  viewer.scene.canvas.style.cursor = 'crosshair'

  // 创建事件处理器，仅监听左键点击
  handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  handler.setInputAction(onLeftClick, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

/**
 * 停止测量并清理交互状态
 */
const stopMeasure = () => {
  isMeasuring = false
  cleanupInteraction()
  statusMessage.value = '已停止高度测量'
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
    console.log('HeightMeasure初始化成功')
  } catch (error) {
    console.error('HeightMeasure初始化失败：', error)
    statusMessage.value = 'HeightMeasure初始化失败'
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
  console.log('HeightMeasure已销毁')
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
      <div class="panel-title">高度测量</div>

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
