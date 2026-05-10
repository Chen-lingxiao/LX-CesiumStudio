<script setup>
/**
 * SceneBasic.vue - Cesium 场景基础示例组件
 *
 * 功能说明：
 * 1. 演示 Cesium 场景的各种配置选项
 * 2. 展示场景模式、大气效果、雾效、光照等效果
 * 3. 介绍地形夸张、天空盒、背景颜色等配置
 *
 * 技术要点：
 * - SceneMode: 场景模式（2D/3D/ColumbusView）
 * - SkyAtmosphere: 大气效果（色调、饱和度、亮度调整）
 * - Fog: 雾效（距离衰减效果）
 * - ClassificationType: 分类类型（TERRAIN/3D_TILES/BOTH）
 * - ArcType: 弧线类型（NONE/GEODESIC/RHUMB）
 */
import { onMounted, onUnmounted } from 'vue'
import * as Cesium from 'cesium'

let viewer = null // Cesium 实例
const isReady = ref(false) // 初始化状态

const initCesium = async () => {
  try {
    isReady.value = false
    viewer = new Cesium.Viewer('cesium-container', {
      terrainProvider: await Cesium.createWorldTerrainAsync(),
    })

    setupScene()
    await flyToHimalaya()
    isReady.value = true
    console.log('Cesium 初始化完成')
  } catch (error) {
    console.error('Cesium 初始化失败：', error)
  }
}

const setupScene = () => {
  const scene = viewer.scene

  // 大气效果
  const skyAtmosphere = scene.skyAtmosphere
  skyAtmosphere.show = true
  skyAtmosphere.hueShift = 0
  skyAtmosphere.saturationShift = 0
  skyAtmosphere.brightnessShift = 0

  // 雾效
  scene.fog.enabled = true
  scene.fog.density = 0.0002

  // 背景颜色
  scene.backgroundColor = Cesium.Color.BLACK

  // 光照
  if (scene.sun) scene.sun.show = true
  if (scene.moon) scene.moon.show = true
  scene.globe.enableLighting = false

  // 地形夸张
  scene.verticalExaggeration = 1.0

  // 性能
  scene.requestRenderMode = false

  // 天空盒
  scene.skyBox = undefined
}

const flyToHimalaya = () => {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(86.85, 28.05, 30000),
    duration: 2,
  })
}

const destroyCesium = () => {
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
    viewer = null
  }
  isReady.value = false
  console.log('Cesium 销毁完成')
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
  </div>
</template>

<style scoped>  </style>
