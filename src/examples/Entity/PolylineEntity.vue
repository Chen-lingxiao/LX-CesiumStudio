<script setup>
/**
 * PolylineEntity.vue - Cesium 折线实体示例组件
 *
 * 功能说明：
 * 1. 演示折线（Polyline）的三种模式：直线隧道效果、贴地弧线、不贴地弧线
 * 2. 展示 depthFailMaterial 属性实现隧道效果（被遮挡部分变色）
 * 3. 演示不同的 arcType 和 clampToGround 设置
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'

let viewer = null // Cesium 实例
const isReady = ref(false) // 初始化状态

const initCesium = async () => {
  try {
    isReady.value = false
    // 步骤1：创建 Viewer
    viewer = new Cesium.Viewer('cesium-container', {
      terrainProvider: await Cesium.createWorldTerrainAsync(), // 地形直接赋值
    })
  viewer.scene.globe.depthTestAgainstTerrain = true // 开启地形深度检测
  
  // 步骤2：添加实体
  addPolylines()
  
  // 步骤3：飞至目标位置
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(86.85, 28.05, 30000),
    duration: 2,
  })
    isReady.value = true
    console.log('PolylineEntity 初始化完成')
  } catch (error) {
    console.error('PolylineEntity 初始化失败：', error)
  }
}

/**
 * 添加折线实体
 *
 * Polyline 重要属性说明：
 * - positions: 折线顶点位置数组，决定折线的走向
 * - width: 线宽（像素），值越大线越粗
 * - material: 线的材质颜色，正常显示时的颜色
 * - depthFailMaterial: 深度失败材质，当线被地形遮挡时显示的颜色
 *   （需要配合 depthTestAgainstTerrain = true 使用）
 * - arcType: 弧线类型
 *   - ArcType.NONE: 直线（适合隧道等直线穿越效果）
 *   - ArcType.GEODESIC: 大地线/测地线（球面最短路径，适合跨区域线路）
 *   - ArcType.RHUMB: 恒向线（等角航线，适合导航）
 * - clampToGround: 是否贴地
 *   - true: 线条沿地表起伏，适合道路、边界
 *   - false: 保持指定高度，不随地形变化
 * - classificationType: 分类类型，控制线条如何与地形/3D瓦片交互
 *   - TERRAIN: 仅贴地形
 *   - CESIUM_3D_TILE: 仅贴3D瓦片表面
 *   - BOTH: 同时贴地形和3D瓦片
 * - heightReference: 高度参考
 *   - CLAMP_TO_GROUND: 固定到地面
 *   - RELATIVE_TO_GROUND: 相对于地面高度
 *   - NONE: 使用绝对高度
 */
const addPolylines = () => {
  /**
   * 直线（隧道效果）
   * 使用 ArcType.NONE 实现直线穿越效果
   * depthFailMaterial 实现被地形遮挡部分显示为半透明红色
   */
  viewer.entities.add({
    name: '直线（隧道效果）',
    position: Cesium.Cartesian3.fromDegrees(86.85, 27.99, 6800),
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        86.70, 27.99, 6800,
        87.00, 27.99, 6800
      ]),
      width: 8,                                              // 线宽8像素
      material: Cesium.Color.BLUE,                           // 正常显示蓝色
      classificationType: Cesium.ClassificationType.BOTH,   // 同时贴地形和3D瓦片
      arcType: Cesium.ArcType.NONE,                          // 直线（不随球面弯曲）
      depthFailMaterial: Cesium.Color.RED.withAlpha(0.5),   // 被遮挡时显示半透明红色
    },
    label: {
      text: '直线（隧道）',
      font: '20px sans-serif',
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 2,
      outlineColor: Cesium.Color.BLUE,
      pixelOffset: new Cesium.Cartesian2(0, -30),
    }
  })

  /**
   * 贴地弧线
   * 使用 ArcType.GEODESIC 实现球面曲线
   * clampToGround = true 使线条贴地起伏
   */
  viewer.entities.add({
    name: '贴地弧线',
    position: Cesium.Cartesian3.fromDegrees(86.85, 28.15, 0),
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        86.70, 28.15,
        87.00, 28.15
      ]),
      width: 8,                                              // 线宽8像素
      material: Cesium.Color.YELLOW,                         // 黄色线条
      clampToGround: true,                                   // 贴地模式
      classificationType: Cesium.ClassificationType.TERRAIN, // 仅贴地形
      arcType: Cesium.ArcType.GEODESIC,                     // 大地线（球面最短路径）
    },
    label: {
      text: '贴地弧线',
      font: '20px sans-serif',
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 2,
      outlineColor: Cesium.Color.YELLOW,
      pixelOffset: new Cesium.Cartesian2(0, -10),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    }
  })

  /**
   * 不贴地弧线
   * clampToGround = false 保持绝对高度
   * 线条在指定高度水平延伸，不随地形起伏
   */
  viewer.entities.add({
    name: '不贴地弧线',
    position: Cesium.Cartesian3.fromDegrees(86.85, 28.07, 8000),
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        86.70, 28.07, 8000,
        87.00, 28.07, 8000
      ]),
      width: 8,                                              // 线宽8像素
      material: Cesium.Color.GREEN,                          // 绿色线条
      clampToGround: false,                                  // 不贴地（保持高度）
      arcType: Cesium.ArcType.GEODESIC,                     // 大地线
    },
    label: {
      text: '不贴地弧线',
      font: '20px sans-serif',
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 2,
      outlineColor: Cesium.Color.GREEN,
      pixelOffset: new Cesium.Cartesian2(0, -10),
    }
  })
}

// 销毁 Cesium 实例
const destroyCesium = () => {
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
    viewer = null
  }
  isReady.value = false
  console.log('PolylineEntity 销毁完成')
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
