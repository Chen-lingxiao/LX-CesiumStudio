<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as Cesium from 'cesium'
import { useCesium } from '@/hooks/useCesium'
import { useWmsLayer } from '@/hooks/useWmsLayer'
import type { WMSConfig } from '@/hooks/useWmsLayer'
/**
 * 图层配置接口扩展
 */
interface LayerConfig extends WMSConfig {
  label: string
  value: string
}
/**
 * 已加载图层映射
 */
interface LoadedLayer {
  config: LayerConfig
  layer: Cesium.ImageryLayer
}
/**
 * 图层配置列表
 */
const layerConfigs: LayerConfig[] = [
  {
    label: '建筑点图层',
    value: 'point',
    url: 'http://localhost:8085/geoserver/sdjzdx/wms',
    layers: 'sdjzdx:sdjzdx_Buildings_Point',
    version: '1.1.0',
    srs: 'EPSG:4326',
    format: 'image/png',
    styles: '',
    transparent: true,
  },
  {
    label: '建筑面图层',
    value: 'poly',
    url: 'http://localhost:8085/geoserver/sdjzdx/wms',
    layers: 'sdjzdx:sdjzdx_Buildings_Poly',
    version: '1.1.0',
    srs: 'EPSG:4326',
    format: 'image/png',
    styles: '',
    transparent: true,
  },
]
const { getViewer, initmap, destroyCesium } = useCesium('cesiumContainer')
const { loadWmsService } = useWmsLayer(getViewer)
/**
 * 当前选中的图层
 */
const selectedLayer = ref<string>('poly')
/**
 * 已加载的图层映射
 */
const loadedLayers = ref<Map<string, LoadedLayer>>(new Map())
/**
 * 当前显示的图层ID
 */
const currentVisibleLayerId = ref<string | null>(null)
/**
 * 加载或切换图层
 */
const switchLayer = async () => {
  const viewer = getViewer()
  if (!viewer) return
  const config = layerConfigs.find((c) => c.value === selectedLayer.value)
  if (!config) return
  // 如果图层已加载，直接显示
  if (loadedLayers.value.has(config.value)) {
    const loadedLayer = loadedLayers.value.get(config.value)!
    // 隐藏当前显示的图层
    if (currentVisibleLayerId.value && currentVisibleLayerId.value !== config.value) {
      const currentLayer = loadedLayers.value.get(currentVisibleLayerId.value)
      if (currentLayer) {
        currentLayer.layer.show = false
      }
    }
    // 显示新图层
    loadedLayer.layer.show = true
    currentVisibleLayerId.value = config.value
    console.log('切换到已加载的图层:', config.label)
    return
  }
  // 如果图层未加载，先隐藏当前图层
  if (currentVisibleLayerId.value) {
    const currentLayer = loadedLayers.value.get(currentVisibleLayerId.value)
    if (currentLayer) {
      currentLayer.layer.show = false
    }
  }
  // 加载新图层
  const layer = await loadWmsService(config)
  if (layer) {
    loadedLayers.value.set(config.value, { config, layer })
    currentVisibleLayerId.value = config.value
    console.log('加载并显示新图层:', config.label)
  }
}
/**
 * 初始化 Cesium 地图
 */
const initCesium = async () => {
  await initmap()
  const viewer = getViewer()
  if (!viewer) return
  // 默认加载并显示面图层
  selectedLayer.value = 'poly'
  await switchLayer()
  // 飞行到数据区域（济南附近）
  viewer.camera.flyTo({
    destination: Cesium.Rectangle.fromDegrees(
      117.17452239990234,
      36.67359161376953,
      117.18510437011719,
      36.685150146484375,
    ),
    duration: 2,
  })
}
/**
 * 清理已加载的图层
 */
const cleanupLayers = () => {
  const viewer = getViewer()
  if (!viewer) return
  loadedLayers.value.forEach((loadedLayer) => {
    viewer.imageryLayers.remove(loadedLayer.layer, false)
  })
  loadedLayers.value.clear()
  currentVisibleLayerId.value = null
}
onMounted(() => {
  initCesium()
})
onUnmounted(() => {
  cleanupLayers()
  destroyCesium()
})
</script>

<template>
  <!-- Cesium 地图容器 -->
  <div id="cesiumContainer" class="cesium-container"></div>

  <!-- 图层切换面板 -->
  <div class="layer-switch-panel">
    <h3>WMS 图层切换</h3>

    <!-- 下拉框选择图层 -->
    <div class="select-section">
      <label>选择图层</label>
      <el-select
        v-model="selectedLayer"
        class="layer-select"
        @change="switchLayer"
        placeholder="请选择图层"
      >
        <el-option
          v-for="layer in layerConfigs"
          :key="layer.value"
          :label="layer.label"
          :value="layer.value"
        />
      </el-select>
    </div>

    <!-- 图层管理信息 -->
    <div class="layer-info">
      <div class="info-item">
        <span class="info-label">已加载图层数:</span>
        <span class="info-value">{{ loadedLayers.size }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">当前图层:</span>
        <span class="info-value">{{
          layerConfigs.find((l) => l.value === currentVisibleLayerId)?.label || '无'
        }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cesium-container {
  width: 100%;
  height: 100%;
}

.layer-switch-panel {
  position: absolute;
  top: 70px;
  left: 220px;
  z-index: 100;
  border-radius: 8px;
  padding: 16px;
  background-color: var(--sidebar-bg);
  min-width: 220px;
}

.layer-switch-panel h3 {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 500;
}

.select-section {
  margin-bottom: 16px;
}

.select-section label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
}

.layer-select {
  width: 100%;
}

.layer-info {
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
}

.info-label {
  color: var(--text-secondary);
}

.info-value {
  color: var(--text-primary);
}
</style>
