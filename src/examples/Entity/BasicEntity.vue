<script setup>
/**
 * BasicEntity.vue - Cesium Entity 基础示例组件
 * 
 * 功能说明：
 * 1. 创建基础的 Cesium Viewer 实例
 * 2. 添加一个完整的实体对象（包含点标记、图片广告牌、文字标签）
 * 3. 演示如何使用 Cesium Entities API 创建和管理地理实体
 * 4. 自动定位到北京故宫太和殿位置
 * 
 * 技术要点：
 * - 使用 Cartesian3.fromDegrees 将经纬度坐标转换为笛卡尔坐标
 * - Entity 支持多种可视化属性：point、billboard、label、polyline、polygon 等
 * - 通过 properties 属性存储自定义业务数据
 * - 使用 camera.flyTo 实现平滑视角过渡
 * - disableDepthTestDistance 确保标注始终显示在最前方
 */
import { onMounted, onUnmounted } from 'vue'
import * as Cesium from 'cesium'

/**
 * Cesium Viewer 实例
 */
let viewer = null

/**
 * 初始化 Cesium Viewer 并添加实体
 */
const initCesium = () => {
  // 创建 Viewer 实例，使用默认配置（包含默认影像图层）
  viewer = new Cesium.Viewer('cesium-container')
  
  // 添加实体到场景
  viewer.entities.add({
    // 核心属性
    id: 'entity-basic-001',           // 实体唯一标识符
    name: '故宫太和殿',                 // 实体名称（显示在选择信息面板）
    show: true,                        // 实体是否可见
    position: Cesium.Cartesian3.fromDegrees(116.390937, 39.91588, 0), // 位置：北京故宫太和殿
    
    // 描述信息（点击实体时显示的HTML内容）
    description: `
      <h3 style="font-size: 20px; color: #c41e3a;">故宫太和殿</h3>
      <p>世界文化遗产 · 全国重点文物保护单位</p>
      <p>明清两代皇权的象征，中国现存最大的木结构大殿</p>
    `,
    
    // 自定义业务属性（可用于业务逻辑处理）
    properties: {
      code: 'BJ-GUGONG-001',           // 自定义编码
      type: 'historical-site',          // 实体类型
      category: 'cultural'              // 分类标签
    },
    
    // 点标记配置
    point: {
      color: Cesium.Color.RED,                           // 点颜色
      pixelSize: 16,                                     // 点大小（像素）
      heightReference: Cesium.HeightReference.NONE,       // 高度参考：相对于椭球面
      disableDepthTestDistance: Number.POSITIVE_INFINITY  // 禁用深度测试，始终显示在最前
    },
    
    // 图片广告牌配置
    billboard: {
      image: 'public/static/billbord/gufeng.png',        // 广告牌图片路径
      scale: 1.0,                                        // 缩放比例
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,  // 水平居中对齐
      verticalOrigin: Cesium.VerticalOrigin.CENTER,      // 垂直居中对齐
      pixelOffset: new Cesium.Cartesian2(0, -30),        // 像素偏移（向上偏移30像素）
      color: Cesium.Color.WHITE,                         // 图片着色（白色为原始色彩）
      rotation: 0,                                       // 旋转角度（弧度）
      width: 150,                                        // 宽度（像素）
      height: 30,                                        // 高度（像素）
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000000) // 可见距离范围
    },
    
    // 文字标签配置
    label: {
      text: '故宫太和殿',                                // 标签文本
      font: '16px 微软雅黑, sans-serif',                 // 字体样式
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,  // 水平居中
      verticalOrigin: Cesium.VerticalOrigin.CENTER,      // 垂直居中
      pixelOffset: new Cesium.Cartesian2(0, -30),        // 与广告牌位置对齐
      fillColor: Cesium.Color.BLACK,                     // 文字颜色
      disableDepthTestDistance: Number.POSITIVE_INFINITY, // 始终显示在最前
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000000)
    }
  })

  // 相机飞至目标位置
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(116.390937, 39.91588, 1000), // 目标位置及高度
    duration: 2,                                         // 飞行时长（秒）
    easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT    // 缓动函数（平滑过渡）
  })
}

/**
 * 组件挂载时初始化 Cesium
 */
onMounted(() => {
  initCesium()
})

/**
 * 组件卸载时销毁 Viewer，释放资源
 */
onUnmounted(() => {
  if (viewer) {
    viewer.destroy()
    viewer = null
  }
})
</script>

<template>
  <!-- Cesium 渲染容器 -->
  <div id="cesium-container"></div>
</template>

<style scoped>
#cesium-container {
  width: 100%;
  height: 100%;
}
</style>
