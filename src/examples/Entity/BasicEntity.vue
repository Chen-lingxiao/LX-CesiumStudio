<script setup>
/**
 * BasicEntity.vue - Cesium Entity 综合标注示例组件
 *
 * 【功能说明】
 * 1. 演示如何在同一个 Entity 上组合多种可视化元素（点 + 广告牌 + 标签）
 * 2. 展示 Entity 的完整配置结构，包括 ID、名称、描述信息和图形属性
 * 3. 实现点击实体时显示 HTML 格式的详细信息框
 * 4. 演示相机飞行到目标位置的动画效果
 *
 * 【核心技术要点】
 * - Entity 复合结构：单个 Entity 可同时包含 point、billboard、label 等多种图形
 * - 位置定位：使用 Cesium.Cartesian3.fromDegrees(经度，纬度，高度) 转换地理坐标
 * - 深度测试：disableDepthTestDistance 确保标注不被地形遮挡
 * - 距离控制：distanceDisplayCondition 根据相机距离自动显示/隐藏
 * - 信息框：description 支持 HTML 字符串，点击实体时自动弹出
 *
 * 【关键参数说明】
 * - id: 实体唯一标识符，用于后续查询和管理
 * - name: 实体名称，显示在信息框标题
 * - description: 实体描述，支持 HTML 格式，可包含图片、表格等
 * - position: 实体锚点位置（笛卡尔坐标）
 *
 * 【使用场景】
 * 适用于需要在地图上标注兴趣点（POI）并显示详细信息的场景，
 * 如旅游景点、建筑物、地标等位置的可视化展示
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
        image: '/static/billbord/gufeng.png',
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
  console.log('BasicEntity 销毁完成')
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
