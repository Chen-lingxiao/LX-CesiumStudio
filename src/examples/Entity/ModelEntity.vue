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
const modelPath_SuperHeavy = "/static/3Dmodel/Rocket/SuperHeavy.glb";
const modelPath_StarShip = "/static/3Dmodel/Rocket/StarShip.glb";
const initCesium = async () => {
  try {
    isReady.value = false;
    viewer = new Cesium.Viewer("cesium-container", {
      // terrainProvider: await Cesium.createWorldTerrainAsync(),
    });

    // 添加 3D 模型实体
    viewer.entities.add({
      id: "SuperHeavy",
      name: "Super Heavy",
      description: `
        星舰的Super Heavy助推器是星舰系统的第一级，高度为69米，直径为9米，空重200吨，满载重3600吨，是有史以来最大最强大的火箭一级。
        助推器上安装了33台猛禽发动机，其中20台是外圈的“Raptor Boost”型号，13台是内圈的“Raptor Sea Level”型号。
        装载了3400吨的液氧和液甲烷作为推进剂，在全流量级联燃烧循环中工作，提供高效的比冲和推力。助推器的总推力约7.4万千牛`,
      // 模型位置：25.985705°N, 97.190388°E，高度 0 米
      position: Cesium.Cartesian3.fromDegrees(-97.190367, 25.985713, 35),
      // 模型图形配置
      model: {
        uri: modelPath_SuperHeavy, // 模型资源路径（gltf/glb 格式）
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
    // 添加 3D 模型实体
    viewer.entities.add({
      id: "StarShip",
      name: "Star Ship",
      description: `
        V2版星舰二级于2025年初的第七次飞行测试（IFT-7）开始使用，实际用于飞行的仅有五架。在星舰第11次飞行后，V2版星舰二级退役。
        V2版星舰二级由Block.2版星舰组合体使用，编号范围为S33~S38。
        V2版星舰二级高52.1米（增加了约1.8米，即一个环的高度），起飞总重1585吨，其中推进剂装载量1500吨（比前代增加了25%），6台发动机总推力提升至1400吨`,
      // 模型位置：25.985705°N, 97.190388°E，高度 0 米
      position: Cesium.Cartesian3.fromDegrees(-97.190140, 25.985901, 25),
      // 模型图形配置
      model: {
        uri: modelPath_StarShip, // 模型资源路径（gltf/glb 格式）
        scale: 1, // 模型缩放比例（1 表示原始大小）
        // minimumPixelSize: 128, // 模型最小像素尺寸（防止远距离时过小不可见）
        maximumScale: 20000, // 模型最大缩放比例限制
        incrementallyLoadTextures: true, // 增量加载纹理（后台渐进式加载）
        runAnimations: true, // 运行模型内置动画（如有）
        clampAnimations: true, // 强制动画播放（动画时间超出时停留在最后一帧）
        shadows: Cesium.ShadowMode.ENABLED, // 开启阴影投射
        // 高度参考：RELATIVE_TO_GROUND 表示高度相对于地面高度
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        // 轮廓线
        silhouetteColor: Cesium.Color.BLUE, // 轮廓颜色
        silhouetteSize: 2,              // 轮廓大小
      },
    });
    // 添加 3D 模型实体
    viewer.entities.add({
      id: "StarShip1",
      name: "Star Ship1",
      description: `
        V2版星舰二级于2025年初的第七次飞行测试（IFT-7）开始使用，实际用于飞行的仅有五架。在星舰第11次飞行后，V2版星舰二级退役。
        V2版星舰二级由Block.2版星舰组合体使用，编号范围为S33~S38。
        V2版星舰二级高52.1米（增加了约1.8米，即一个环的高度），起飞总重1585吨，其中推进剂装载量1500吨（比前代增加了25%），6台发动机总推力提升至1400吨`,
      // 模型位置：25.985705°N, 97.190388°E，高度 0 米
      position: Cesium.Cartesian3.fromDegrees(-97.189851, 25.986203, 25),
      // orientation: Cesium.Quaternion.fromHeadingPitchRoll(new Cesium.HeadingPitchRoll(0, 0, 0)),
      orientation: Cesium.Transforms.headingPitchRollQuaternion(
        Cesium.Cartesian3.fromDegrees(-97.189851, 25.986203, 25), 
        new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(90), Cesium.Math.toRadians(90), Cesium.Math.toRadians(45))
      ),
      // 模型图形配置
      model: {
        uri: modelPath_StarShip, // 模型资源路径（gltf/glb 格式）
        scale: 1, // 模型缩放比例（1 表示原始大小）
        // minimumPixelSize: 128, // 模型最小像素尺寸（防止远距离时过小不可见）
        maximumScale: 20000, // 模型最大缩放比例限制
        incrementallyLoadTextures: true, // 增量加载纹理（后台渐进式加载）
        runAnimations: true, // 运行模型内置动画（如有）
        clampAnimations: true, // 强制动画播放（动画时间超出时停留在最后一帧）
        shadows: Cesium.ShadowMode.ENABLED, // 开启阴影投射
        // 高度参考：RELATIVE_TO_GROUND 表示高度相对于地面高度
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        // 模型颜色混合
        color: Cesium.Color.RED.withAlpha(0.4), // 指定与模型渲染颜色融合的颜色
        colorBlendMode: Cesium.ColorBlendMode.MIX, // 混合模式 （MIX 表示混合颜色） REPLACE 表示替换颜色 HIGHLIGHT 表示高亮颜色 MIX 表示混合颜色 配合 colorBlendAmount 使用
        colorBlendAmount: 0.5, // 混合比例 （0-1）
      },
    });
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-97.1895, 25.984, 200),
      orientation: {
        heading: Cesium.Math.toRadians(0), // 水平朝向
        pitch: Cesium.Math.toRadians(-45), // 向下倾斜 45 度
      },
      duration: 1,
    })
    isReady.value = true;
    console.log("BasicEntity 初始化完成");
  } catch (error) {
    console.error("BasicEntity 初始化失败：", error);
  }
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
