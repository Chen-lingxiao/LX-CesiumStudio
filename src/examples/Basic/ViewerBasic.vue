<script setup>
/**
 * ViewerBasic.vue - Cesium 基础示例组件
 *
 * 功能说明：
 * 1. 创建基础的 Cesium Viewer 实例
 * 2. 添加一个简单的实体对象（点标记+标签）到场景中
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'

let viewer = null // Cesium 实例
const isReady = ref(false) // 初始化状态

const initCesium = async () => {
  try {
    // 创建 Viewer 实例，关闭不必要的控件以提升性能
    isReady.value = false
    viewer = new Cesium.Viewer('cesium-container', {
      // --- 地形提供器 ---
      // 使用 Cesium 官方全球地形数据，可选值：
      // Cesium.createWorldTerrainAsync() - 全球地形（含地形起伏）
      // Cesium.createWorldTerrainAsync({ requestWaterMask: true }) - 带水体Mask
      // Cesium.createWorldTerrainAsync({ requestVertexNormals: true }) - 带法线（用于光照）
      // 或使用自定义地形provider如 CesiumTerrainProvider
      terrainProvider: await Cesium.createWorldTerrainAsync(),

      // --- 基础图层选择器 ---
      // 控制是否显示 Imagery Layers 选择面板（右上角）
      // true: 显示, false: 隐藏（默认显示）
      baseLayerPicker: false,

      // --- 地理编码搜索 ---
      // 控制是否显示搜索框，可输入地点名称进行定位
      // true: 显示搜索框, false: 隐藏
      geocoder: false,

      // --- 首页按钮 ---
      // 点击后飞行到默认视角位置（全球视图）
      // true: 显示, false: 隐藏
      homeButton: false,

      // --- 场景模式选择器 ---
      // 提供 3D/2D/2.5D 视角切换
      // true: 显示, false: 隐藏
      sceneModePicker: false,

      // --- 导航帮助按钮 ---
      // 显示操作提示（如何旋转、缩放、倾斜等）
      // true: 显示, false: 隐藏
      navigationHelpButton: false,

      // --- 动画控制器 ---
      // 左下角时间轴动画播放控件（适用于时间序列数据）
      // true: 显示, false: 隐藏
      animation: false,

      // --- 时间轴 ---
      // 底部时间轴滑块，用于控制时间（适用于时序模拟）
      // true: 显示, false: 隐藏
      timeline: false,

      // --- 全屏按钮 ---
      // 控制是否显示全屏切换按钮
      // true: 显示, false: 隐藏
      fullscreenButton: false,

      // --- VR 模式按钮 ---
      // 虚拟现实模式切换按钮
      // true: 显示, false: 隐藏
      vrButton: false,

      // --- 信息框 ---
      // 点击实体时显示的详细信息面板
      // true: 显示, false: 隐藏
      infoBox: false,

      // --- 选中指示器 ---
      // 显示实体被选中时的视觉标记（如高亮边框）
      // true: 显示, false: 隐藏
      selectionIndicator: false,

      // --- 天空盒 ---
      // 背景天空盒纹理，false时使用纯色天空
      // true: 显示天空盒, false: 使用纯色（可结合skyAtmosphere调整）
      skyBox: false,

      // --- 大气效果 ---
      // 地球周围的大气散射效果（蓝天、边缘辉光）
      // true: 启用大气, false: 禁用
      skyAtmosphere: false,

      // --- 独立透传 ---
      // 图层透传模式，影响地形与影像的叠加渲染方式
      // true: 启用独立透传, false: 禁用
      orderIndependentTranslucency: false,

      // --- 阴影 ---
      // 控制是否渲染阴影（会显著影响性能）
      // true: 启用阴影, false: 禁用
      shadows: false,

      // --- 自动动画 ---
      // 初始化时是否自动播放动画（如时间轴）
      // true: 自动播放, false: 暂停
      shouldAnimate: true,
    })

    // 添加实体到场景
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(116.4, 39.9, 1000),
      point: {
        pixelSize: 10,
        color: Cesium.Color.RED
      },
      label: {
        text: '北京',
      }
    })

    // 飞往目标位置
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.4, 39.9, 1000000),
      duration: 2
    })
    isReady.value = true // 初始化完成
    console.log('ViewerBasic 初始化完成')
  } catch (error) {
    console.error('ViewerBasic 初始化失败：', error)
  }
}
// 销毁 Cesium 实例
const destroyCesium = () => {
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
    viewer = null
  }
  isReady.value = false
  console.log('ViewerBasic 销毁完成')
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
