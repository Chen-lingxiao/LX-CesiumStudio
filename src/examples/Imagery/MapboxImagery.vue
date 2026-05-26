<script setup>
/**
 * MapboxImagery.vue - Mapbox 影像图层切换示例组件
 *
 * 功能说明：
 * 1. 创建 Cesium Viewer 实例（禁用默认影像图层）
 * 2. 动态加载 Mapbox 风格影像图层
 * 3. 通过下拉框切换显示不同的影像图层
 *
 * 技术要点：
 * - imageryProvider: false 禁用默认影像
 * - UrlTemplateImageryProvider 加载自定义瓦片服务
 * - imageryLayers.addImageryProvider 添加影像图层
 * - imageryLayers.remove 移除影像图层
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'

let viewer = null
const isReady = ref(false)
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN

/**
 * Mapbox 样式选项列表
 * @description 预定义的常用 Mapbox 底图样式
 */
const mapboxStyles = [
  { label: '深色模式', value: 'mapbox/dark-v11' },
  { label: '浅色模式', value: 'mapbox/light-v11' },
  { label: '街道模式', value: 'mapbox/streets-v11' },
  { label: '卫星模式', value: 'mapbox/satellite-v9' },
  { label: '户外模式', value: 'mapbox/outdoors-v11' },
  { label: '导航日', value: 'mapbox/navigation-day-v1' },
  { label: '导航夜', value: 'mapbox/navigation-night-v1' }
]

const selectedStyle = ref(mapboxStyles[0].value)
let currentLayer = null

/**
 * 创建 Mapbox 影像图层
 * @param {string} styleValue Mapbox 样式值
 * @returns {Cesium.ImageryLayer} 影像图层
 */
const createMapboxLayer = (styleValue) => {
  const provider = new Cesium.UrlTemplateImageryProvider({
    url: `https://api.mapbox.com/styles/v1/${styleValue}/tiles/256/{z}/{x}/{y}?access_token=${mapboxToken}`,
    credit: '© Mapbox © OpenStreetMap contributors',
    tilingScheme: new Cesium.WebMercatorTilingScheme(),
    maximumLevel: 18
  })
  return viewer.imageryLayers.addImageryProvider(provider)
}

/**
 * 初始化 Cesium
 */
const initCesium = async () => {
  try {
    isReady.value = false
    viewer = new Cesium.Viewer('cesium-container', {
      terrainProvider: await Cesium.createWorldTerrainAsync(),
      imageryProvider: false
    })

    // 只加载当前选中的一种风格
    currentLayer = createMapboxLayer(selectedStyle.value)

    isReady.value = true
    console.log('MapboxImagery初始化成功')
  } catch (error) {
    console.error('MapboxImagery初始化失败：', error)
  }
}

/**
 * 切换 Mapbox 影像图层
 * @param {string} styleValue 要切换的样式值
 */
const toggleLayer = (styleValue) => {
  if (!viewer || !currentLayer) return

  // 移除当前图层
  viewer.imageryLayers.remove(currentLayer)

  // 添加新图层
  currentLayer = createMapboxLayer(styleValue)
}

/**
 * 销毁 Cesium 实例
 */
const destroyCesium = () => {
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
    viewer = null
  }
  currentLayer = null
  isReady.value = false
  console.log('MapboxImagery已销毁')
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
    <div id="cesium-container">
      <div v-if="!isReady" class="loading-overlay">加载中...</div>
      <div class="toolbar">
        <!-- 下拉框 用于切换影像图层 -->
        <select v-model="selectedStyle" @change="toggleLayer(selectedStyle)">
          <option v-for="style in mapboxStyles" :key="style.value" :value="style.value">{{ style.label }}</option>
        </select>
      </div>
    </div>
  </div>
</template>

<style scoped>
#cesium-container {
  position: relative;
  width: 100%;
  height: 100%;
}
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 18px;
  z-index: 1001;
}
.toolbar {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
}
.toolbar select {
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: white;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}
.toolbar select:hover {
  border-color: #999;
}
</style>
