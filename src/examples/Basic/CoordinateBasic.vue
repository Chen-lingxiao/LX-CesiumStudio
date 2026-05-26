<script setup>
/**
 * CoordinateBasic.vue - Cesium 坐标系系统示例组件
 *
 * 【功能说明】
 * 1. 演示 Cesium 中常用的四种坐标系
 * 2. 展示坐标系之间的转换方法
 * 3. 控制台打印输出各坐标系的具体值
 *
 * 【核心技术要点】
 *
 * 1. 地理坐标系（经纬度 - 角度制）
 *    - 使用 Cesium.Cartesian3.fromDegrees(lon, lat, height) 创建
 *    - 经度范围：-180° ~ 180°（东经为正，西经为负）
 *    - 纬度范围：-90° ~ 90°（北纬为正，南纬为负）
 *    - 高度：相对于 WGS-84 椭球面的高度（米）
 *
 * 2. 地理坐标系（弧度制）
 *    - 使用 Cesium.Cartographic(longitude, latitude, height) 创建
 *    - 经度/纬度单位是弧度，高度是米
 *    - 弧度与角度转换：弧度 = 角度 × π / 180
 *    - 这是 Cesium 内部进行地理坐标计算的基础格式
 *
 * 3. 屏幕坐标系（Cartesian2）
 *    - 使用 Cesium.Cartesian2(x, y) 创建
 *    - x: 屏幕水平像素坐标（从左到右）
 *    - y: 屏幕垂直像素坐标（从上到下）
 *    - 原点在屏幕左上角
 *
 * 4. 笛卡尔空间直角坐标系（Cartesian3）
 *    - 使用 Cesium.Cartesian3(x, y, z) 创建
 *    - ECEF（Earth-Centered, Earth-Fixed）坐标系
 *    - 原点在地球质心
 *    - X轴：指向本初子午线与赤道交点
 *    - Y轴：指向东
 *    - Z轴：指向北极
 *
 * 【坐标系转换】
 * 1. 经纬度 → Cartesian3：Cartesian3.fromDegrees(lon, lat, height)
 * 2. Cartesian3 → 经纬度：Cartographic.fromCartesian(cartesian)
 * 3. Cartesian3 → 弧度：Cartographic.fromCartesian(cartesian)
 * 4. 弧度 → 角度：Cesium.Math.toDegrees(radian)
 * 5. 角度 → 弧度：Cesium.Math.toRadians(degree)
 * 6. Cartesian3 → 屏幕坐标：scene.cartesianToCanvasCoordinates(cartesian)
 * 7. 屏幕坐标 → Cartesian3：camera.pickEllipsoid(screenPos, ellipsoid)
 *
 * 【示例位置】
 * 北京天安门：经度 116.4°E，纬度 39.9°N，高度 0 米
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'

let viewer = null // Cesium 实例
const isReady = ref(false) // 初始化状态

const initCesium = async () => {
  try {
    isReady.value = false
    viewer = new Cesium.Viewer('cesium-container', {
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      vrButton: false,
      infoBox: false,
      selectionIndicator: false
    })

    // ============================================
    // 1. 地理坐标系（经纬度 - 角度制）
    // ============================================
    console.log('========== 1. 地理坐标系（经纬度）==========')
    const lon = 116.4    // 经度（角度）
    const lat = 39.9     // 纬度（角度）
    const height = 1000  // 高度（米）
    
    // 从经纬度创建 Cartesian3
    const cartesian3 = Cesium.Cartesian3.fromDegrees(lon, lat, height)
    console.log(`原始经纬度: 经度=${lon}°, 纬度=${lat}°, 高度=${height}m`)
    console.log(`Cartesian3 (ECEF): x=${cartesian3.x.toExponential(6)}, y=${cartesian3.y.toExponential(6)}, z=${cartesian3.z.toExponential(6)}`)

    // ============================================
    // 2. 地理坐标系（弧度制）
    // ============================================
    console.log('\n========== 2. 地理坐标系（弧度制）==========')
    
    // 方法1：直接创建弧度坐标
    const lonRad = Cesium.Math.toRadians(lon)
    const latRad = Cesium.Math.toRadians(lat)
    const cartographic1 = new Cesium.Cartographic(lonRad, latRad, height)
    console.log(`弧度坐标: 经度=${cartographic1.longitude.toFixed(6)}rad, 纬度=${cartographic1.latitude.toFixed(6)}rad, 高度=${cartographic1.height}m`)

    // 方法2：从 Cartesian3 转换为弧度坐标
    const cartographic2 = Cesium.Cartographic.fromCartesian(cartesian3)
    console.log(`从Cartesian3转换: 经度=${cartographic2.longitude.toFixed(6)}rad, 纬度=${cartographic2.latitude.toFixed(6)}rad, 高度=${cartographic2.height.toFixed(2)}m`)

    // ============================================
    // 3. 弧度 ↔ 角度 转换
    // ============================================
    console.log('\n========== 3. 弧度与角度转换 ==========')
    const degree = 180
    const radian = Cesium.Math.toRadians(degree)
    console.log(`${degree}° = ${radian.toFixed(6)} rad`)
    console.log(`${radian.toFixed(6)} rad = ${Cesium.Math.toDegrees(radian)}°`)

    // ============================================
    // 4. 屏幕坐标系（Cartesian2）
    // ============================================
    console.log('\n========== 4. 屏幕坐标系（Cartesian2）==========')
    
    // 创建屏幕坐标（示例值）
    const screenPos = new Cesium.Cartesian2(400, 300)
    console.log(`屏幕坐标: x=${screenPos.x}, y=${screenPos.y}`)
    
    // 将世界坐标转换为屏幕坐标
    const canvasPos = viewer.scene.cartesianToCanvasCoordinates(cartesian3)
    if (canvasPos) {
      console.log(`世界坐标转屏幕坐标: x=${canvasPos.x.toFixed(2)}, y=${canvasPos.y.toFixed(2)}`)
    }

    // ============================================
    // 5. 坐标系综合转换演示
    // ============================================
    console.log('\n========== 5. 坐标系综合转换 ==========')
    
    // 经纬度 → Cartesian3 → Cartographic → 经纬度
    const originalLon = 120.0
    const originalLat = 30.0
    const originalHeight = 500
    
    // 步骤1: 经纬度 → Cartesian3
    const pos = Cesium.Cartesian3.fromDegrees(originalLon, originalLat, originalHeight)
    
    // 步骤2: Cartesian3 → Cartographic（弧度）
    const carto = Cesium.Cartographic.fromCartesian(pos)
    
    // 步骤3: 弧度 → 角度
    const convertedLon = Cesium.Math.toDegrees(carto.longitude)
    const convertedLat = Cesium.Math.toDegrees(carto.latitude)
    
    console.log(`原始坐标: (${originalLon}°, ${originalLat}°, ${originalHeight}m)`)
    console.log(`转换后坐标: (${convertedLon.toFixed(8)}°, ${convertedLat.toFixed(8)}°, ${carto.height.toFixed(2)}m)`)
    console.log(`转换精度验证: ${Math.abs(originalLon - convertedLon) < 0.00000001 ? '✓ 精确' : '✗ 有误差'}`)

    // ============================================
    // 6. 在地图上添加标记点
    // ============================================
    viewer.entities.add({
      position: cartesian3,
      point: {
        pixelSize: 20,
        color: Cesium.Color.RED,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2
      },
      label: {
        text: `(${lon}°, ${lat}°)\n${height}m`,
        font: '14px 微软雅黑',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        pixelOffset: new Cesium.Cartesian2(0, -30),
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    })

    // 飞往目标位置
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, 5000),
      duration: 2
    })

    isReady.value = true
    console.log('\nCoordinateBasic 初始化完成，请查看控制台输出')
  } catch (error) {
    console.error('CoordinateBasic 初始化失败：', error)
  }
}

// 销毁 Cesium 实例
const destroyCesium = () => {
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
    viewer = null
  }
  isReady.value = false
  console.log('CoordinateBasic 销毁完成')
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
    
    <!-- 坐标系说明面板 -->
    <div class="info-panel">
      <div class="panel-title">坐标系说明</div>
      <div class="panel-content">
        <div class="coord-item">
          <span class="coord-label">1. 地理坐标系（经纬度）</span>
          <span class="coord-code">Cartesian3.fromDegrees(lon, lat, height)</span>
        </div>
        <div class="coord-item">
          <span class="coord-label">2. 地理坐标系（弧度）</span>
          <span class="coord-code">Cartographic(lon, lat, height)</span>
        </div>
        <div class="coord-item">
          <span class="coord-label">3. 屏幕坐标系</span>
          <span class="coord-code">Cartesian2(x, y)</span>
        </div>
        <div class="coord-item">
          <span class="coord-label">4. 笛卡尔坐标系</span>
          <span class="coord-code">Cartesian3(x, y, z)</span>
        </div>
      </div>
      <div class="panel-hint">请打开浏览器控制台查看详细输出</div>
    </div>
  </div>
</template>

<style scoped>
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
  min-width: 280px;
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
  gap: 8px;
}

.coord-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.coord-label {
  font-size: 12px;
  color: #666;
}

.coord-code {
  font-size: 11px;
  font-family: 'Consolas', monospace;
  color: #1890ff;
  background-color: #f6f8fa;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
}

.panel-hint {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  font-size: 12px;
  color: #999;
}
</style>
