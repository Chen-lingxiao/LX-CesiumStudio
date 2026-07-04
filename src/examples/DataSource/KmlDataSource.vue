<script setup>
/**
 * KmlDataSource.vue - Cesium KMZ/KML 数据源加载示例组件
 *
 * 功能说明：
 * 1. 创建 Cesium Viewer 实例
 * 2. 使用 KmlDataSource 加载 KMZ 格式的地理数据
 * 3. 自动飞行到数据范围
 *
 * 技术要点：
 * - Cesium.KmlDataSource.load() 支持 KML 和 KMZ 格式
 * - clampToGround: 贴地显示
 * - KMZ 是 KML 的压缩格式，Cesium 会自动解压处理
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'

let viewer = null // Cesium 实例
const isReady = ref(false) // 初始化状态
const dataurl = import.meta.env.BASE_URL + 'static/KMZ/HBshibianjie.kmz'
async function loadKmlData(url) {
  try {
    // 加载 KMZ 数据源
    const dataSource = await Cesium.KmlDataSource.load(url, {
      camera: viewer.scene.camera,
      canvas: viewer.scene.canvas,
      clampToGround: true, // 贴地显示
    });

    // 添加到数据源管理器
    viewer.dataSources.add(dataSource);

    // 获取加载后的实体集合，可进一步操作
    const entities = dataSource.entities.values;

    // 相机飞行到数据范围（自动适配视角）
    await viewer.flyTo(dataSource);

    console.log(`KMZ加载完成，共${entities.length}个实体`);
    return dataSource;
  } catch (error) {
    console.error("KMZ加载失败：", error);
    throw error;
  }
}
const initCesium = async () => {
  try {
    isReady.value = false
    viewer = new Cesium.Viewer('cesium-container', {
      // terrainProvider: await Cesium.createWorldTerrainAsync(),
    })
    await loadKmlData(dataurl) // 加载KMZ数据

    isReady.value = true
    console.log('KmlDataSource 初始化完成')
  } catch (error) {
    console.error('KmlDataSource 初始化失败：', error)
  }
}

const destroyCesium = () => {
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
    viewer = null
  }
  isReady.value = false
  console.log('KmlDataSource 销毁完成')
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
