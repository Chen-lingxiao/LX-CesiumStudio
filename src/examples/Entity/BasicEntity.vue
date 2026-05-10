<script setup>
/**
 * BasicEntity.vue - Cesium Entity 基础示例组件
 *
 * 功能说明：
 * 1. 创建基础的 Cesium Viewer 实例
 * 2. 添加一个完整的实体对象（包含点标记、广告牌、文字标签）
 * 3. 演示如何使用 Cesium Entities API 创建和管理地理实体
 *
 * 技术要点：
 * - Entity 支持多种可视化属性：point、billboard、label、polyline、polygon 等
 * - heightReference: 高度参考（NONE/RELATIVE_TO_GROUND/CLAMP_TO_GROUND）
 * - disableDepthTestDistance: 禁用深度测试，使标注始终显示在最前方
 * - distanceDisplayCondition: 根据距离控制显示范围
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'

let viewer = null // Cesium 实例
const isReady = ref(false) // 初始化状态

const initCesium = async () => {
  try {
    isReady.value = false
    viewer = new Cesium.Viewer('cesium-container', {
      // terrainProvider: await Cesium.createWorldTerrainAsync(),
    })

    viewer.entities.add({
      id: 'entity-basic-001',
      name: '故宫太和殿',
      description: `
        <h3 style="font-size: 20px; color: #c41e3a;">故宫太和殿</h3>
        <p>世界文化遗产 · 全国重点文物保护单位</p>
        <p>明清两代皇权的象征，中国现存最大的木结构大殿</p>
      `,
      position: Cesium.Cartesian3.fromDegrees(116.390937, 39.91588, 0),
      point: {
        color: Cesium.Color.RED,
        pixelSize: 16,
        heightReference: Cesium.HeightReference.NONE,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      billboard: {
        image: 'public/static/billbord/gufeng.png',
        scale: 1.0,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        pixelOffset: new Cesium.Cartesian2(0, -30),
        color: Cesium.Color.WHITE,
        width: 150,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000000)
      },
      label: {
        text: '故宫太和殿',
        font: '16px 微软雅黑, sans-serif',
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        pixelOffset: new Cesium.Cartesian2(0, -30),
        fillColor: Cesium.Color.BLACK,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000000)
      }
    })

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.390937, 39.91588, 1000),
      duration: 2,
    })
    isReady.value = true
    console.log('BasicEntity 初始化完成')
  } catch (error) {
    console.error('BasicEntity 初始化失败：', error)
  }
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

<style scoped></style>
