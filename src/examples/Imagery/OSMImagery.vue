<script setup>
/**
 * OSMImagery.vue - 影像图层切换示例组件
 *
 * 功能说明：
 * 1. 创建 Cesium Viewer 实例（禁用默认影像图层）
 * 2. 添加多个自定义影像图层（OSM标准风格、黑色风格）
 * 3. 演示如何切换显示不同的影像图层
 *
 * 技术要点：
 * - imageryProvider: false 禁用默认影像
 * - UrlTemplateImageryProvider 加载自定义瓦片服务
 * - imageryLayers.addImageryProvider 添加影像图层
 * - layer.show 控制图层显示/隐藏
 * - layer.alpha 控制图层透明度
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'

let viewer = null // Cesium 实例
const isReady = ref(false) // 初始化状态
let osmLayer = null
let osmBlackLayer = null

const initCesium = async () => {
  try {
    isReady.value = false
    viewer = new Cesium.Viewer('cesium-container', {
      terrainProvider: await Cesium.createWorldTerrainAsync(),
    })

    const osmProvider = new Cesium.UrlTemplateImageryProvider({
      url: 'https://tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c', 'd'],
    })

    const osmBlackProvider = new Cesium.UrlTemplateImageryProvider({
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c', 'd'],
    })

    osmBlackLayer = viewer.imageryLayers.addImageryProvider(osmBlackProvider)
    osmLayer = viewer.imageryLayers.addImageryProvider(osmProvider)

    osmLayer.alpha = 0.5
    osmLayer.show = false
    osmBlackLayer.show = true

    isReady.value = true
    console.log('OSMImagery初始化成功')
  } catch (error) {
    console.error('OSMImagery初始化失败：', error)
  }
}

const toggleLayer = (layerType) => {
  if (!viewer || !osmLayer || !osmBlackLayer) {
    return
  }
  if (layerType === 'standard') {
    osmLayer.show = true
    osmBlackLayer.show = false
  } else if (layerType === 'dark') {
    osmLayer.show = false
    osmBlackLayer.show = true
  }
}

const destroyCesium = () => {
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
    viewer = null
  }
  isReady.value = false
  console.log('OSMImagery已销毁')
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
        <button @click="toggleLayer('standard')">标准风格</button>
        <button @click="toggleLayer('dark')">黑色风格</button>
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
.toolbar {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
}
button {
  margin-right: 5px;
}
</style>
