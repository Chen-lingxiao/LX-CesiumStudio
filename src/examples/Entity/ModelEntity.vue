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
import { onMounted, onUnmounted, ref } from "vue";
import * as Cesium from "cesium";

let viewer = null; // Cesium 实例
const isReady = ref(false); // 初始化状态
const modelPath = "/static/3Dmodel/Rocket/starShip1.glb";
const initCesium = async () => {
  try {
    isReady.value = false;
    viewer = new Cesium.Viewer("cesium-container", {
      // terrainProvider: await Cesium.createWorldTerrainAsync(),
    });

    // 添加 3D 模型实体
    viewer.entities.add({
      id: "rocket",
      name: "Super Heavy",
      description: `
        星舰的Super Heavy助推器是星舰系统的第一级，高度为69米，直径为9米，空重200吨，满载重3600吨，是有史以来最大最强大的火箭一级。
        助推器上安装了33台猛禽发动机，其中20台是外圈的“Raptor Boost”型号，13台是内圈的“Raptor Sea Level”型号。
        装载了3400吨的液氧和液甲烷作为推进剂，在全流量级联燃烧循环中工作，提供高效的比冲和推力。助推器的总推力约7.4万千牛`,
      // 模型位置：25.985705°N, 97.190388°E，高度 0 米
      position: Cesium.Cartesian3.fromDegrees(-97.190367, 25.985713, 35),
      // 模型图形配置
      model: {
        uri: modelPath, // 模型资源路径（gltf/glb 格式）
        scale: 1, // 模型缩放比例（1 表示原始大小）
        // minimumPixelSize: 128, // 模型最小像素尺寸（防止远距离时过小不可见）
        maximumScale: 20000, // 模型最大缩放比例限制
        incrementallyLoadTextures: true, // 增量加载纹理（后台渐进式加载）
        runAnimations: true, // 运行模型内置动画（如有）
        clampAnimations: true, // 强制动画播放（动画时间超出时停留在最后一帧）
        shadows: Cesium.ShadowMode.ENABLED, // 开启阴影投射
        // 高度参考：RELATIVE_TO_GROUND 表示高度相对于地面高度
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      },
    });
    lookAtEntity();
    isReady.value = true;
    console.log("BasicEntity 初始化完成");
  } catch (error) {
    console.error("BasicEntity 初始化失败：", error);
  }
};
const lookAtEntity = () => {
  const center = Cesium.Cartesian3.fromDegrees(-97.190367, 25.985713, 35);
  const heading = Cesium.Math.toRadians(0); // 水平朝向
  const pitch = Cesium.Math.toRadians(-45); // 向下倾斜 45 度
  const range = 250; // 距离目标点 3000 米

  viewer.camera.lookAt(
    center,
    new Cesium.HeadingPitchRange(heading, pitch, range),
  );
};
const destroyCesium = () => {
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy();
    viewer = null;
  }
  isReady.value = false;
  console.log("Cesium 销毁完成");
};

onMounted(() => {
  initCesium();
});

onUnmounted(() => {
  destroyCesium();
});
</script>

<template>
  <div class="cesium-wrapper">
    <div id="cesium-container"></div>
    <div v-if="!isReady" class="loading-overlay">加载中...</div>
  </div>
</template>

<style scoped></style>
