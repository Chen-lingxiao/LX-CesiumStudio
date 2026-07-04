<script setup>
/**
 * SceneBasic.vue - Cesium 场景基础示例组件
 *
 * 功能说明：
 * 1. 演示 Cesium Scene 类的各种配置选项
 * 2. 展示场景模式、大气效果、雾效、光照等效果
 * 3. 介绍地形夸张、天空盒、背景颜色等配置
 * 4. 提供交互式控制面板实时调整场景参数
 *
 * 技术要点：
 * - SceneMode: 场景模式（2D/3D/ColumbusView）
 * - SkyAtmosphere: 大气效果（色调、饱和度、亮度调整）
 * - Fog: 雾效（距离衰减效果）
 * - ClassificationType: 分类类型（TERRAIN/3D_TILES/BOTH）
 * - ArcType: 弧线类型（NONE/GEODESIC/RHUMB）
 * - verticalExaggeration: 地形垂直夸张
 * - requestRenderMode: 渲染模式（持续/按需）
 */
import { onMounted, onUnmounted, ref } from "vue";
import * as Cesium from "cesium";

let viewer = null; // Cesium 实例
const isReady = ref(false); // 初始化状态

const initCesium = async () => {
  try {
    isReady.value = false;
    viewer = new Cesium.Viewer("cesium-container", {
      // terrainProvider: await Cesium.createWorldTerrainAsync()， // 加载世界地形
      terrain: new Cesium.Terrain(Cesium.CesiumTerrainProvider.fromUrl(import.meta.env.BASE_URL + "static/terrainTiles/demtilesnew")),
    })
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(110.47, 29.35, 1000),
      duration: 2,
    })
    isReady.value = true;
    console.log("TerrainBasic 初始化完成");
  } catch (error) {
    console.error("TerrainBasic 初始化失败：", error);
  }
};

const destroyCesium = () => {
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy();
    viewer = null;
  }
  isReady.value = false;
  console.log("TerrainBasic 销毁完成");
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
