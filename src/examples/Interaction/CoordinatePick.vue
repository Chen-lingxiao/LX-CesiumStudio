<script setup>
/**
 * CoordinatePick.vue - 独立坐标拾取示例
 *
 * 【功能说明】
 * 点击地图任意位置 → 在该点生成标记和坐标标签 → 显示经纬度和高度信息
 * 支持连续拾取多个坐标，历史标记保留显示
 *
 * 【核心原理】
 * 1. 使用 ScreenSpaceEventHandler 监听鼠标左键点击事件
 * 2. 使用 Camera.getPickRay + Globe.pick 获取地形表面坐标（支持地形起伏）
 * 3. 使用 Cartographic.fromCartesian 将笛卡尔坐标转为弧度制经纬度+高度
 * 4. 使用 Math.toDegrees 将弧度转为角度制经纬度
 *
 * 【坐标参考系说明】
 * - 经度（Longitude）：-180° 到 180°，东经为正，西经为负
 * - 纬度（Latitude）：-90° 到 90°，北纬为正，南纬为负
 * - 高度（Height）：相对于 WGS-84 椭球面的高度（米）
 *   - 加载地形后，高度为地形表面到椭球面的距离（即地形高程）
 *   - 无地形时，高度为 0（椭球面本身）
 *
 * 【交互流程】
 * - 左键点击：在点击位置创建标记点和坐标标签
 * - 可连续点击拾取多个坐标，所有标记保留显示
 * - 点击"停止拾取"按钮退出交互模式
 * - 点击"清除所有"按钮移除所有标记
 *
 * 【disableDepthTestDistance 说明】
 * 设置为 Number.POSITIVE_INFINITY 表示标签始终可见，
 * 不会被地形或其他实体遮挡。这对于坐标标签非常重要，
 * 因为用户可能在任何视角下都需要看到坐标信息。
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'

/** @type {Cesium.Viewer|null} Cesium Viewer 实例 */
let viewer = null

/** 是否初始化完成 */
const isReady = ref(false)

/** 状态栏提示信息 */
const statusMessage = ref('点击地图查看坐标')

/** 当前是否处于坐标拾取交互模式 */
let isPicking = false

/** @type {Cesium.ScreenSpaceEventHandler|null} 屏幕空间事件处理器 */
let handler = null

// ======================== 坐标拾取工具函数 ========================

/**
 * 获取屏幕坐标对应的笛卡尔坐标
 *
 * 【拾取策略】
 * 1. 先通过 getPickRay + globe.pick 拾取地形表面坐标
 *    - 该方法返回的坐标自动包含地形高程信息
 *    - 在有地形数据的区域，返回的是地形表面的真实三维坐标
 * 2. 如果地形不可用（如无地形数据或地球未加载完成），回退到椭球体表面拾取
 *    - pickEllipsoid 返回的是椭球面上的最近点坐标
 *    - 此时高度通常为 0
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
 * 将笛卡尔坐标转换为经纬度高度信息
 *
 * 【转换流程】
 * 1. Cartesian3 (ECEF 坐标) → Cartographic (弧度制经纬度+高度)
 * 2. 弧度制经纬度 → 角度制经纬度（使用 toDegrees）
 * 3. 格式化为 6 位小数的字符串（精度约 0.11 米）
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

// ======================== 交互控制 ========================

/**
 * 启动坐标拾取模式
 *
 * 创建 ScreenSpaceEventHandler，监听左键点击事件。
 * 每次点击在对应位置创建标记点和坐标标签，支持连续拾取。
 */
const startPick = () => {
  if (isPicking) {
    stopPick()
    return
  }

  isPicking = true
  statusMessage.value = '点击地图查看坐标'
  viewer.scene.canvas.style.cursor = 'crosshair'

  handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

  // 左键点击获取坐标
  handler.setInputAction((event) => {
    const pos = getPosition(event.position)
    if (!pos) return

    const info = getPositionInfo(pos)
    if (!info) return

    // 在点击位置创建标记点和坐标标签
    // 所有实体直接加入全局 entities，不做临时处理，
    // 因为坐标拾取模式下所有标记都应该保留显示
    viewer.entities.add({
      position: pos,
      point: {
        pixelSize: 6,
        color: Cesium.Color.YELLOW,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2
      },
      label: {
        text: `N${info.lat}° E${info.lon}°\nH:${info.height}m`,
        font: '12px 微软雅黑',
        fillColor: Cesium.Color.YELLOW,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        // disableDepthTestDistance: Infinity 使标签始终可见，
        // 不会被地形、建筑或其他实体遮挡
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        pixelOffset: new Cesium.Cartesian2(0, -20)
      }
    })

    statusMessage.value = `坐标：N${info.lat}° E${info.lon}°，高度：${info.height}m`
    viewer.scene.requestRender()
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

/**
 * 停止坐标拾取模式
 *
 * 销毁事件处理器，恢复默认鼠标样式。
 * 已拾取的坐标标记保留显示。
 */
const stopPick = () => {
  isPicking = false

  if (handler) {
    handler.destroy()
    handler = null
  }

  viewer.scene.canvas.style.cursor = 'default'
  statusMessage.value = '已停止坐标拾取'
}

/**
 * 清除所有坐标标记
 */
const clearAll = () => {
  stopPick()
  viewer.entities.removeAll()
  statusMessage.value = '已清除所有标记'
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
  stopPick()

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
      <div class="panel-title">坐标拾取</div>

      <button
        class="measure-btn"
        :class="{ active: isPicking }"
        @click="startPick"
      >
        {{ isPicking ? '停止拾取' : '开始拾取' }}
      </button>

      <button class="clear-btn" @click="clearAll">清除所有</button>
    </div>

    <div class="status-bar">
      <span class="status-icon">📍</span>
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
