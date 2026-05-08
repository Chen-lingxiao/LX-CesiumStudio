<script setup>
/**
 * Basic.vue - Entities基础示例组件
 * 功能说明：
 * 1. 创建基础的Cesium Viewer实例
 * 2. 添加一个简单的实体对象（点标记+标签）到场景中
 * 3. 演示如何使用Cesium Entities API创建和显示地理实体
 */
import { onMounted, onUnmounted } from 'vue'
import * as Cesium from 'cesium'

// Cesium Viewer实例 - 声明在import语句之后，确保正确的作用域
let viewer = null
const initCesium = () => {
  viewer = new Cesium.Viewer('cesium-container') // 创建Viewer实例，使用默认配置
  // 添加实体到场景
  viewer.entities.add({
    // 设置实体位置：北京坐标（东经116.4°，北纬39.9°，海拔1000米）
    position: Cesium.Cartesian3.fromDegrees(116.4, 39.9, 1000),
    // 点标记配置
    point: {
      pixelSize: 10,      // 像素大小
      color: Cesium.Color.RED  // 颜色为红色
    },
    // 标签配置
    label: {
      text: '北京',        // 标签文本
    }
  })
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(116.4, 39.9, 1000000), // 目标位置：北京坐标（东经116.4°，北纬39.9°，海拔10000000米）
    duration: 2
  })
}

/**
 * 组件挂载时初始化Cesium
 */
onMounted(() => {
  initCesium()
})

/**
 * 组件卸载时销毁Viewer，释放资源
 */
onUnmounted(() => {
  if (viewer) {
    viewer.destroy()
    viewer = null
  }
})
</script>

<template>
  <!-- Cesium容器 -->
  <div id="cesium-container"></div>
</template>

<style scoped>
#cesium-container {
  width: 100%;
  height: 100%;
}
</style>