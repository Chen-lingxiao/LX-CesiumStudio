<script setup>
import * as Cesium from 'cesium'
import { onMounted } from 'vue'
onMounted(() => {
  const viewer = new Cesium.Viewer('cesiumContainer')
})
</script>

<template>
  <div id="cesiumContainer"></div>
</template>

<style scoped>
#cesiumContainer {
  width: 100vw;
  height: 100vh;
}
</style>
