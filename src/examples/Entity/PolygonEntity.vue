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
      terrainProvider: await Cesium.createWorldTerrainAsync(),
    })

    /**
     * Polygon A - 基础悬浮多边形
     * 特点：所有顶点使用统一高度(5000米)，perPositionHeight=false
     * 行为：使用hierarchy中的坐标，但忽略Z值，使用height属性的值
     */
    viewer.entities.add({
      name: 'Polygon A',
      position: Cesium.Cartesian3.fromDegrees(75.55, 35.52, 4500), // 多边形中心点位置（经度, 纬度, 高度）
      polygon: {
        // hierarchy: 定义多边形边界坐标，支持3D坐标（经度, 纬度, 高度）
        // fromDegreesArrayHeights: 将经纬度高度数组转换为笛卡尔坐标
        hierarchy: new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArrayHeights([
            75.5225, 35.4975, 4500, // 左下角顶点（经度, 纬度, 高度）
            75.5775, 35.4975, 4500, // 右下角顶点
            75.5775, 35.5425, 4500, // 右上角顶点
            75.5225, 35.5425, 4500, // 左上角顶点
          ]),
        ),
        material: Cesium.Color.RED.withAlpha(0.5), // 填充颜色，红色半透明
        outline: true, // 显示多边形轮廓线
        outlineColor: Cesium.Color.BLACK, // 轮廓线颜色为黑色
        outlineWidth: 2, // 轮廓线宽度为2像素
        height: 5000, // 多边形平面的统一高度（当perPositionHeight=false时生效）
        perPositionHeight: false, // false=所有顶点使用统一height值，忽略hierarchy中的Z值
      },
      label: {
        text: 'Polygon 基础悬浮', // 标签显示的文本
        font: '16px sans-serif', // 字体大小和类型
        style: Cesium.LabelStyle.FILL_AND_OUTLINE, // 标签样式：填充+描边
        outlineWidth: 2, // 文字描边宽度
        outlineColor: Cesium.Color.BLACK, // 文字描边颜色
        pixelOffset: new Cesium.Cartesian2(0, -30), // 标签相对于锚点的像素偏移量(右, 下)
      },
    })

    /**
     * Polygon B - 悬浮拉伸多边形（形成体积）
     * 特点：从height拉伸到extrudedHeight，形成有厚度的多边形
     * 行为：底部在5000米，顶部在6000米，closeTop=false顶部开放
     */
    viewer.entities.add({
      name: 'Polygon B',
      position: Cesium.Cartesian3.fromDegrees(75.65, 35.52, 4500), // 中心点位置（向东偏移0.1度）
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArrayHeights([
            75.6225, 35.4975, 4500, // 左下角
            75.6775, 35.4975, 4500, // 右下角
            75.6775, 35.5425, 4500, // 右上角
            75.6225, 35.5425, 4500, // 左上角
          ]),
        ),
        material: Cesium.Color.BLUE.withAlpha(0.5), // 蓝色半透明填充
        outline: true, // 显示轮廓
        outlineColor: Cesium.Color.BLACK, // 黑色轮廓
        outlineWidth: 2, // 轮廓宽度2像素
        height: 5000, // 多边形底部高度（拉伸起始点）
        extrudedHeight: 6000, // 拉伸顶部高度（拉伸结束点）
        perPositionHeight: false, // 使用统一高度模式
        closeTop: false, // 顶部不闭合（开放顶部，形成U型槽）
        closeBottom: true, // 底部闭合
      },
      label: {
        text: 'Polygon 悬浮拉伸', // 标签文本
        font: '16px sans-serif', // 字体
        style: Cesium.LabelStyle.FILL_AND_OUTLINE, // 填充+描边样式
        outlineWidth: 2, // 描边宽度
        outlineColor: Cesium.Color.BLACK, // 描边颜色
        pixelOffset: new Cesium.Cartesian2(0, -30), // 偏移量(右移0, 下移30像素)
      },
    })

    /**
     * Polygon C - 地形贴合多边形
     * 特点：没有设置高度属性，使用默认高度(0)，贴地显示
     * 行为：多边形跟随地形起伏，Z值来自hierarchy（这里用的是fromDegrees没有Z）
     * 注意：使用fromDegrees而非fromDegreesArrayHeights，所有顶点高度为0（贴地）
     */
    viewer.entities.add({
      name: 'Polygon C',
      position: Cesium.Cartesian3.fromDegrees(75.45, 35.52, 4500), // 中心点（向西偏移）
      polygon: {
        // 使用fromDegrees（无高度），多边形将贴地显示
        hierarchy: new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArray([ // 注意：这里是fromDegreesArray，没有Heights
            75.4225, 35.4975, // 左下
            75.4775, 35.4975, // 右下
            75.4775, 35.5425, // 右上
            75.4225, 35.5425, // 左上
          ]),
        ),
        material: Cesium.Color.GREEN.withAlpha(0.5), // 绿色半透明
        outline: true, // 显示轮廓
        outlineColor: Cesium.Color.BLACK, // 黑色轮廓
        outlineWidth: 2, // 轮廓宽度
        // 没有height和perPositionHeight属性，默认贴地
      },
      label: {
        text: 'Polygon 地形起伏', // 标签文本
        font: '16px sans-serif', // 字体
        style: Cesium.LabelStyle.FILL_AND_OUTLINE, // 填充+描边
        outlineWidth: 2, // 描边宽度
        outlineColor: Cesium.Color.BLACK, // 描边颜色
        pixelOffset: new Cesium.Cartesian2(0, -30), // 像素偏移
      },
    })

    /**
     * Polygon D - 贴地拉伸多边形（各顶点独立高度）
     * 特点：perPositionHeight=true，每个顶点使用hierarchy中的Z值
     * 行为：底部是倾斜的（4500到6500），顶部在extrudedHeight=1000米处
     */
    viewer.entities.add({
      name: 'Polygon D',
      position: Cesium.Cartesian3.fromDegrees(75.55, 35.6, 4500), // 中心点（向北偏移）
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArray([
            75.5225, 35.5775, // 左下角
            75.5775, 35.5775, // 右下角
            75.5775, 35.6225, // 右上角
            75.5225, 35.6225 // 左上角
          ]),
        ),
        material: Cesium.Color.YELLOW.withAlpha(0.5), // 黄色半透明
        outline: true, // 显示轮廓
        outlineColor: Cesium.Color.BLACK, // 黑色轮廓
        outlineWidth: 2, // 轮廓宽度
        extrudedHeight: 5000, // 拉伸高度：顶面高度5000米
      },
      label: {
        text: 'Polygon 贴地拉伸', // 标签文本
        font: '16px sans-serif', // 字体
        style: Cesium.LabelStyle.FILL_AND_OUTLINE, // 填充+描边
        outlineWidth: 2, // 描边宽度
        outlineColor: Cesium.Color.BLACK, // 描边颜色
        pixelOffset: new Cesium.Cartesian2(0, -30), // 像素偏移
      },
    })

    /**
     * Polygon F - 各顶点独立高度（无拉伸）
     * 特点：perPositionHeight=true，各顶点高度不同，形成倾斜面
     * 行为：四个顶点分别在4500、4500、6500、6500米，形成斜面
     */
    viewer.entities.add({
      name: 'Polygon F',
      position: Cesium.Cartesian3.fromDegrees(75.65, 35.6, 4500), // 中心点（Polygon D东侧）
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArrayHeights([
            75.6225, 35.5775, 4500, // 左下角，4500米
            75.6775, 35.5775, 4500, // 右下角，4500米
            75.6775, 35.6225, 6500, // 右上角，6500米
            75.6225, 35.6225, 6500, // 左上角，6500米
          ]),
        ),
        material: Cesium.Color.ORANGE.withAlpha(0.5), // 橙色半透明
        outline: true, // 显示轮廓
        outlineColor: Cesium.Color.BLACK, // 黑色轮廓
        outlineWidth: 2, // 轮廓宽度
        perPositionHeight: true, // true=各顶点使用独立高度，形成斜面
      },
      label: {
        text: 'Polygon 独立顶点高度', // 标签文本
        font: '16px sans-serif', // 字体
        style: Cesium.LabelStyle.FILL_AND_OUTLINE, // 填充+描边
        outlineWidth: 2, // 描边宽度
        outlineColor: Cesium.Color.BLACK, // 描边颜色
        pixelOffset: new Cesium.Cartesian2(0, -30), // 像素偏移
      },
    })

    /**
     * Polygon E - 带空洞的环形多边形
     * 特点：hierarchy的第二个参数是洞数组，可以有多个洞
     * 行为：外圈是紫色方块，内部小方块是空洞（透明，可见下方地形）
     */
    viewer.entities.add({
      name: 'Polygon E',
      position: Cesium.Cartesian3.fromDegrees(75.55, 35.44, 4500), // 中心点（Polygon A南侧）
      polygon: {
        // PolygonHierarchy构造函数：new Cesium.PolygonHierarchy(外圈坐标, [洞数组])
        hierarchy: new Cesium.PolygonHierarchy(
          // 外圈坐标：逆时针排列
          Cesium.Cartesian3.fromDegreesArrayHeights([
            75.5225, 35.4175, 4500, // 左下
            75.5775, 35.4175, 4500, // 右下
            75.5775, 35.4625, 4500, // 右上
            75.5225, 35.4625, 4500, // 左上
          ]),
          // 洞数组：顺时针排列（与外圈方向相反）
          [
            new Cesium.PolygonHierarchy(
              Cesium.Cartesian3.fromDegreesArrayHeights([
                75.565, 35.455, 4500, // 洞的右上
                75.535, 35.455, 4500, // 洞的左上
                75.535, 35.425, 4500, // 洞的左下
                75.565, 35.425, 4500, // 洞的右下
              ]),
            ),
          ],
        ),
        material: Cesium.Color.PURPLE.withAlpha(0.5), // 紫色半透明
        outline: true, // 显示轮廓
        outlineColor: Cesium.Color.BLACK, // 黑色轮廓
        outlineWidth: 2, // 轮廓宽度
        height: 6000, // 高度（perPositionHeight=true时会被忽略）
        perPositionHeight: true, // 使用hierarchy中的高度值
      },
      label: {
        text: 'Polygon 空洞', // 标签文本
        font: '16px sans-serif', // 字体
        style: Cesium.LabelStyle.FILL_AND_OUTLINE, // 填充+描边
        outlineWidth: 2, // 描边宽度
        outlineColor: Cesium.Color.BLACK, // 描边颜色
        pixelOffset: new Cesium.Cartesian2(0, -30), // 像素偏移
      },
    })

    // 从笛卡尔坐标创建，经纬度(75.55, 35.52)，高度12000米
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(75.45, 35.365, 23790),
      orientation: {
        heading: Cesium.Math.toRadians(25), // 30度
        pitch: Cesium.Math.toRadians(-45), // -45度
        roll: Cesium.Math.toRadians(0), // 0度
      },
      duration: 2, // 飞行动画持续2秒
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
