<script setup>
/**
 * ScreenSpaceEventBasic.vue - Cesium 屏幕空间事件基础示例组件
 *
 * 【功能说明】
 * 1. 演示 ScreenSpaceEventHandler 的基础事件监听
 * 2. 演示场景拾取（Picking）功能，将屏幕坐标转换为三维信息
 * 3. 点击地图创建点实体，并显示自定义弹窗展示坐标信息
 *
 * 【核心技术要点】
 *
 * 1. ScreenSpaceEventHandler - 屏幕空间事件处理器
 *    - 将浏览器原生事件封装为 Cesium 事件类型
 *    - 支持的事件类型：LEFT_CLICK, RIGHT_CLICK, LEFT_DOUBLE_CLICK, MOUSE_MOVE 等
 *    - 需要手动销毁避免内存泄漏
 *
 * 2. 场景拾取（Picking）
 *    - camera.getPickRay(screenPos): 获取从相机到屏幕点的射线
 *    - globe.pick(ray, scene): 拾取地形表面点（含高程）
 *    - camera.pickEllipsoid(screenPos, ellipsoid): 拾取椭球体表面点
 *
 * 【交互流程】
 * - 左键点击地图 → 创建红色点标记 → 在鼠标位置显示自定义弹窗
 * - 右键点击 → 关闭弹窗
 */
import { onMounted, onUnmounted, ref, reactive } from 'vue'
import * as Cesium from 'cesium'

let viewer = null
const isReady = ref(false)

// 弹窗状态
const popup = reactive({
  visible: false,
  x: 0,
  y: 0,
  lon: '',
  lat: '',
  height: ''
})

let handler = null

/**
 * 获取屏幕坐标对应的世界坐标
 */
const getWorldPosition = (screenPos) => {
  const ray = viewer.camera.getPickRay(screenPos)
  if (!ray) return null
  
  // 优先拾取地形表面
  const terrainPos = viewer.scene.globe.pick(ray, viewer.scene)
  if (terrainPos) return terrainPos
  
  // 回退到椭球体表面
  return viewer.camera.pickEllipsoid(screenPos, viewer.scene.globe.ellipsoid)
}

/**
 * 将世界坐标转换为经纬度和高度信息
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

/**
 * 关闭弹窗
 */
const closePopup = () => {
  popup.visible = false
}

/**
 * 处理鼠标点击事件
 * event.position 是相对于 canvas 的坐标（0,0 在 canvas 左上角，与页面坐标系一致）
 */
const handleClick = (event) => {
  // 获取相对于 canvas 的点击位置（原点在左上角，x向右，y向下）
  const canvasPos = event.position
  
  // 获取 canvas 元素的位置信息（相对于浏览器窗口）
  const canvas = viewer.scene.canvas
  const canvasRect = canvas.getBoundingClientRect()
  
  // 计算弹窗在页面中的绝对位置（直接相加，坐标系一致）
  const popupX = canvasRect.left + canvasPos.x + 15
  const popupY = canvasRect.top + canvasPos.y + 15
  
  // 获取世界坐标
  const worldPos = getWorldPosition(canvasPos)
  if (!worldPos) return
  
  // 获取坐标信息
  const info = getPositionInfo(worldPos)
  if (!info) return
  
  // 在点击位置创建点标记
  viewer.entities.add({
    position: worldPos,
    point: {
      pixelSize: 15,
      color: Cesium.Color.RED,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2
    }
  })
  
  // 更新弹窗状态
  popup.lon = info.lon
  popup.lat = info.lat
  popup.height = info.height
  popup.x = popupX
  popup.y = popupY
  popup.visible = true
}

const initCesium = async () => {
  try {
    isReady.value = false
    
    viewer = new Cesium.Viewer('cesium-container', {
      infoBox: false,
      selectionIndicator: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      vrButton: false,
      terrainProvider: await Cesium.createWorldTerrainAsync()
    })

    // 创建事件处理器
    handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    
    // 绑定左键点击事件
    handler.setInputAction(handleClick, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    
    // 绑定右键点击关闭弹窗
    handler.setInputAction(closePopup, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    
    // 飞往北京上空
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.4, 39.9, 5000),
      duration: 2
    })

    isReady.value = true
    console.log('ScreenSpaceEventBasic 初始化完成')
  } catch (error) {
    console.error('ScreenSpaceEventBasic 初始化失败：', error)
  }
}

const destroyCesium = () => {
  if (handler) {
    handler.destroy()
    handler = null
  }
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
    
    <!-- 加载遮罩 -->
    <div v-if="!isReady" class="loading-overlay">加载中...</div>

    <!-- 信息提示面板 -->
    <div class="info-panel">
      <div class="panel-title">屏幕空间事件示例</div>
      <div class="panel-content">
        <div class="tip-item">
          <span class="tip-icon">•</span>
          <span class="tip-text">左键点击地图创建点标记</span>
        </div>
        <div class="tip-item">
          <span class="tip-icon">•</span>
          <span class="tip-text">右键点击关闭弹窗</span>
        </div>
      </div>
    </div>

    <!-- 自定义弹窗 -->
    <Teleport to="body">
      <div
        v-if="popup.visible"
        class="custom-popup"
        :style="{
          left: popup.x + 'px',
          top: popup.y + 'px'
        }"
      >
        <div class="popup-close" @click="closePopup">×</div>
        <div class="popup-title">坐标信息</div>
        <div class="popup-content">
          <div class="popup-row">
            <span class="popup-label">经度：</span>
            <span class="popup-value">{{ popup.lon }}°</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">纬度：</span>
            <span class="popup-value">{{ popup.lat }}°</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">高度：</span>
            <span class="popup-value">{{ popup.height }}m</span>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.cesium-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.info-panel {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
  background-color: rgba(255, 255, 255, 0.95);
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 200px;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tip-icon {
  color: #1890ff;
}

.tip-text {
  font-size: 12px;
  color: #666;
}
</style>

<style>
.custom-popup {
  position: fixed;
  z-index: 9999;
  background-color: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  max-width: 300px;
  pointer-events: auto;
}

.popup-close {
  position: absolute;
  top: 8px;
  right: 12px;
  font-size: 20px;
  color: #999;
  cursor: pointer;
  line-height: 1;
}

.popup-close:hover {
  color: #666;
}

.popup-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
  padding-right: 24px;
}

.popup-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.popup-row {
  display: flex;
  justify-content: space-between;
}

.popup-label {
  font-size: 12px;
  color: #666;
}

.popup-value {
  font-size: 12px;
  color: #1890ff;
  font-family: 'Consolas', monospace;
}
</style>