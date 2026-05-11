<script setup>
/**
 * PointEntity.vue - Cesium 点实体示例组件
 *
 * 功能说明：
 * 1. 演示 Cesium Entity API 中高度参考（HeightReference）的三种模式
 * 2. 展示不贴地点、相对高度点、贴地点的区别
 * 3. 介绍如何使用 Billboard、Label 等可视化属性
 *
 * 技术要点：
 * - Cartesian3.fromDegrees：经纬度转笛卡尔坐标
 * - HeightReference.NONE：绝对高度，不跟随地形
 * - HeightReference.RELATIVE_TO_GROUND：相对高度，地面高程 + 偏移
 * - HeightReference.CLAMP_TO_GROUND：贴地，强制贴合地形
 * - createWorldTerrainAsync：加载地形服务
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'

let viewer = null // Cesium 实例
const isReady = ref(false) // 初始化状态

const initCesium = async () => {
  try {
    isReady.value = false
    // 1. 创建 Viewer
    viewer = new Cesium.Viewer('cesium-container', {
      terrainProvider: await Cesium.createWorldTerrainAsync(), // 地形直接赋值
    })
    // 2. 飞到目标位置
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(75.63, 35.5, 12000),
      duration: 2,
    })
    // 3. 添加实体
    // 不贴地
    viewer.entities.add({
      name: '不贴地点',
      position: Cesium.Cartesian3.fromDegrees(75.64, 35.5, 3500),
      description: '不贴地点 75.64, 35.5, 3500 绝对高度3500米',
      point: {
        color: Cesium.Color.BLUE,
        pixelSize: 20,
        heightReference: Cesium.HeightReference.NONE,
      },
      label: {
        text: '不贴地 绝对高度',
        font: '20px sans-serif',
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: 2,
        outlineColor: Cesium.Color.BLUE,
        pixelOffset: new Cesium.Cartesian2(0, -30),
        heightReference: Cesium.HeightReference.NONE,
      }
    })

    // 相对高度
    viewer.entities.add({
      name: '相对高度点',
      position: Cesium.Cartesian3.fromDegrees(75.63, 35.5, 500),
      description: '相对高度点 75.63, 35.5, 500 地面高程 + 500',
      point: {
        color: Cesium.Color.RED,
        pixelSize: 20,
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      },
      label: {
        text: '相对高度 地高+自高',
        font: '20px sans-serif',
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: 2,
        outlineColor: Cesium.Color.RED,
        pixelOffset: new Cesium.Cartesian2(0, -30),
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      }
    })

    // 贴地
    viewer.entities.add({
      name: '贴地点',
      position: Cesium.Cartesian3.fromDegrees(75.65, 35.5, 1500),
      description: '贴地点 75.65, 35.5, 1500 高度值会被忽略',
      point: {
        color: Cesium.Color.YELLOW,
        pixelSize: 20,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
      label: {
        text: '贴地 忽略点高度',
        font: '20px sans-serif',
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: 2,
        outlineColor: Cesium.Color.YELLOW,
        pixelOffset: new Cesium.Cartesian2(0, -30),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      }
    })
    isReady.value = true
    console.log('PointEntity 初始化完成')
  } catch (error) {
    console.error('PointEntity 初始化失败：', error)
  }
}

// 销毁 Cesium 实例
const destroyCesium = () => {
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
    viewer = null
  }
  isReady.value = false
  console.log('PointEntity 销毁完成')
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
<style scoped></style>
