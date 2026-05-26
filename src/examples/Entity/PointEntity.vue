<script setup>
/**
 * PointEntity.vue - Cesium 点实体高度参考模式示例组件
 *
 * 【功能说明】
 * 1. 演示 Cesium Entity API 中高度参考（HeightReference）的三种模式
 * 2. 对比展示不贴地点、相对高度点、贴地点的视觉效果差异
 * 3. 帮助理解地形加载后点实体与地面的空间关系
 *
 * 【核心技术要点】
 * - 地形加载：使用 createWorldTerrainAsync() 加载全球地形数据
 * - 坐标转换：Cartesian3.fromDegrees(经度，纬度，高度) 将 WGS84 坐标转为笛卡尔坐标
 * - 高度参考模式：
 *   · NONE：绝对高度模式，使用位置的 Z 值（海拔高度），不跟随地形变化
 *   · RELATIVE_TO_GROUND：相对高度模式，位置 Z 值表示相对于地面的偏移量
 *   · CLAMP_TO_GROUND：贴地模式，强制将点吸附到地形表面，忽略位置 Z 值
 *
 * 【三种模式对比】
 * 1. NONE（不贴地 - 蓝色点）
 *    - 高度值 = 绝对海拔（如 3500 米）
 *    - 地形变化时，点保持在固定海拔
 *    - 适用：飞行器、无人机等空中目标
 *
 * 2. RELATIVE_TO_GROUND（相对高度 - 红色点）
 *    - 高度值 = 地面高程 + 偏移量（如地面 +500 米）
 *    - 地形变化时，点随地形起伏保持相对高度
 *    - 适用：建筑物、塔吊等地面以上固定高度的物体
 *
 * 3. CLAMP_TO_GROUND（贴地 - 黄色点）
 *    - 高度值被忽略，强制贴合地形表面
 *    - 地形变化时，点始终在地表
 *    - 适用：地面标记点、测量点、井盖等地面设施
 *
 * 【实现步骤】
 * 1. 创建 Viewer 实例并加载地形数据
 * 2. 相机飞行到目标区域（珠峰地区，地形起伏明显）
 * 3. 分别创建三个点实体，设置不同的高度参考模式
 * 4. 每个点配置对应的标签，说明其高度模式
 *
 * 【注意事项】
 * - 必须加载地形数据才能看到高度参考模式的效果差异
 * - RELATIVE_TO_GROUND 和 CLAMP_TO_GROUND 需要地形提供器支持
 * - 标签的 heightReference 应与对应点的高度参考保持一致
 *
 * 【使用场景】
 * 适用于需要精确控制点实体垂直位置的场景，如：
 * - 气象监测：不同海拔的气象站
 * - 城市规划：地面设施与空中目标的区分
 * - 地质勘探：地表采样点与地下钻孔点
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
