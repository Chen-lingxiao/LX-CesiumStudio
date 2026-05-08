<script setup>
/**
 * BaseImagery.vue - 影像管理基础示例组件
 *
 * 功能说明：
 * 1. 创建Cesium Viewer实例（禁用默认影像图层）
 * 2. 添加自定义影像源（OpenStreetMap）
 * 3. 演示如何管理和配置Cesium影像图层
 *
 * 技术要点：
 * - 使用imageryProvider: false禁用默认影像图层
 * - 创建UrlTemplateImageryProvider加载自定义瓦片服务
 * - 使用imageryLayers.addImageryProvider添加影像图层
 */
import { onMounted, onUnmounted } from "vue";
import * as Cesium from "cesium";

let viewer = null;
let osmLayer = null;
let osmBlackLayer = null;

const toggleLayer = (layerType) => {
  if (layerType === "standard") {
    osmLayer.show = true;
    osmBlackLayer.show = false;
  } else if (layerType === "dark") {
    osmLayer.show = false;
    osmBlackLayer.show = true;
  }
}
onMounted(() => {
  // 创建Viewer实例，禁用默认影像图层
  viewer = new Cesium.Viewer("cesium-container", {
    imageryProvider: false, // 禁用默认影像提供器
  });

  // 将自定义影像图层添加到场景，并保存图层引用
  const osmProvider = new Cesium.UrlTemplateImageryProvider({
    url: "https://tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c", "d"],
  });
  const osmBlackProvider = new Cesium.UrlTemplateImageryProvider({
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    subdomains: ["a", "b", "c", "d"],
  });
  
  osmBlackLayer = viewer.imageryLayers.addImageryProvider(osmBlackProvider); // 黑色风格图层
  osmLayer = viewer.imageryLayers.addImageryProvider(osmProvider); // 标准风格图层
  
  // 默认显示黑色风格
  osmLayer.alpha = 0.5; // 标准风格图层透明度
  osmLayer.show = false; // 标准风格图层是否显示
  osmBlackLayer.show = true;
});

/**
 * 组件卸载时销毁Viewer，释放资源
 */
onUnmounted(() => {
  if (viewer) {
    viewer.destroy();
    viewer = null;
  }
});
</script>

<template>
  <!-- Cesium容器 -->
  <div id="cesium-container">
    <div class="toolbar">
      <button @click="toggleLayer('standard')">标准风格</button>
      <button @click="toggleLayer('dark')">黑色风格</button>
    </div>
  </div>
</template>

<style scoped>
#cesium-container {
  position: relative;
  width: 100%;
  height: 100%;
}
.toolbar {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
}
button {
  margin-right: 5px;
}
</style>
