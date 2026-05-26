<script setup>
/**
 * GlobeBasic.vue - Cesium Globe 类核心属性与方法示例组件
 *
 * 功能说明：
 * 1. 演示 Cesium Globe 类的常用配置选项
 * 2. 展示地球外观、地形、大气等效果的控制
 * 3. 介绍深度测试、光照、瓦片缓存等高级配置
 *
 * 技术要点：
 * - Globe.enableLighting: 地表光照效果
 * - Globe.depthTestAgainstTerrain: 地形深度测试
 * - Globe.baseColor: 地球基础颜色
 * - Globe.showGroundAtmosphere: 地面大气效果
 * - Globe.atmosphereHueShift/SaturationShift/BrightnessShift: 大气颜色调整
 * - Globe.terrainProvider: 地形提供器
 * - Globe.maximumScreenSpaceError: 地形精度控制
 * - Globe.tileCacheSize: 瓦片缓存大小
 * - Globe.ellipsoid: 椭球体配置
 */
import { onMounted, onUnmounted, ref } from "vue";
import * as Cesium from "cesium";

let viewer = null; // Cesium 实例
const isReady = ref(false); // 初始化状态
const lightingEnabled = ref(false); // 地表光照状态
const depthTestEnabled = ref(false); // 地形深度测试状态
const atmosphereEnabled = ref(true); // 地面大气效果状态
const wireframeMode = ref(false); // 网格线模式状态
const baseMapHidden = ref(false); // 底图隐藏状态

const initCesium = async () => {
  try {
    isReady.value = false;
    viewer = new Cesium.Viewer("cesium-container", {
      terrainProvider: await Cesium.createWorldTerrainAsync(),
    });
    // 配置地球外观
    setupGlobe(); 
    isReady.value = true;
    console.log("GlobeBasic 初始化完成");
  } catch (error) {
    console.error("GlobeBasic 初始化失败：", error);
  }
};

const setupGlobe = () => {
  const globe = viewer.scene.globe;

  /**
   * Globe 基础配置 - 地表光照
   * 启用后会根据太阳位置产生真实的光影效果
   * 效果：山脉会有阴影，增强立体感
   */
  globe.enableLighting = false;

  /**
   * Globe 基础配置 - 深度测试
   * 启用后可以正确处理3D模型与地形的遮挡关系
   * 场景：当有3DTiles或实体模型时，确保模型被地形正确遮挡
   */
  globe.depthTestAgainstTerrain = false;

  /**
   * Globe 基础配置 - 大气效果
   * 控制地球周围的大气光晕显示
   * 效果：地球边缘会有蓝色光晕，增强真实感
   */
  globe.showGroundAtmosphere = true;

  /**
   * Globe 基础配置 - 大气颜色调整
   * 可自定义大气的色调、饱和度和亮度
   * 范围：-1.0 到 1.0
   */
  globe.atmosphereHueShift = 0.0;
  globe.atmosphereSaturationShift = 0.0;
  globe.atmosphereBrightnessShift = 0.0;

  /**
   * Globe 外观配置 - 线框模式
   * 启用后仅显示地形的三角形网格线，不填充表面
   * 用途：调试地形网格结构、查看LOD细分程度、特殊视觉效果
   */
  globe.wireframe = false;

  /**
   * Globe 外观配置 - 基础颜色
   * 设置地球球体本身的基础颜色
   * 注意：当有影像图层覆盖时，此颜色会被影像遮挡
   * 显示条件：无影像图层、影像加载中、影像有透明度
   */
  globe.baseColor = Cesium.Color.WHITE;

  /**
   * Globe 地形配置 - 地形质量（最大屏幕空间误差）
   * 控制地形瓦片的细分精度，值越小地形越精细
   * 推荐值：
   *   - 低质量: 16 (性能优先，适合低配置设备)
   *   - 中等质量: 8 (平衡性能与质量)
   *   - 高质量: 4 (质量优先，适合高性能设备)
   *   - 极高质量: 2 (极致质量，性能开销大)
   */
  globe.maximumScreenSpaceError = 8;

  /**
   * Globe 性能配置 - 瓦片缓存大小
   * 设置地形瓦片的内存缓存数量
   * 值越大缓存的瓦片越多，切换视角时加载更快，但占用内存更多
   * 推荐范围：500 - 5000，默认值通常为1000
   */
  globe.tileCacheSize = 1000;
};

const toggleLighting = () => {
  const globe = viewer.scene.globe;
  globe.enableLighting = !globe.enableLighting;
  lightingEnabled.value = globe.enableLighting;
};

const toggleDepthTest = () => {
  const globe = viewer.scene.globe;
  globe.depthTestAgainstTerrain = !globe.depthTestAgainstTerrain;
  depthTestEnabled.value = globe.depthTestAgainstTerrain;
};

const toggleAtmosphere = () => {
  const globe = viewer.scene.globe;
  globe.showGroundAtmosphere = !globe.showGroundAtmosphere;
  atmosphereEnabled.value = globe.showGroundAtmosphere;
};

const toggleWireframe = () => {
  const globe = viewer.scene.globe;
  globe.wireframe = !globe.wireframe;
  wireframeMode.value = globe.wireframe;
};

const setBaseColor = (colorName) => {
  const globe = viewer.scene.globe;
  const colors = {
    blue: Cesium.Color.BLUE,
    green: Cesium.Color.GREEN,
    red: Cesium.Color.RED,
    cyan: Cesium.Color.CYAN,
    orange: Cesium.Color.ORANGE,
    purple: Cesium.Color.PURPLE,
    reset: Cesium.Color.WHITE,
  };
  globe.baseColor = colors[colorName] || Cesium.Color.WHITE;
};

const adjustAtmosphere = (type, value) => {
  const globe = viewer.scene.globe;
  switch (type) {
    case "hue":
      globe.atmosphereHueShift = value;
      break;
    case "saturation":
      globe.atmosphereSaturationShift = value;
      break;
    case "brightness":
      globe.atmosphereBrightnessShift = value;
      break;
  }
};
// 切换基础地图显示
const toggleBaseMap = () => {
  const layers = viewer.imageryLayers;
  if (layers.length > 0) {
    layers.get(0).show = !layers.get(0).show;
    baseMapHidden.value = !layers.get(0).show;
  }
};
// 设置地形质量
const setTerrainQuality = (quality) => {
  const globe = viewer.scene.globe;
  // maximumScreenSpaceError 越小，地形越精细，但性能开销越大
  const qualities = {
    low: 16,
    medium: 8,
    high: 4,
    ultra: 2,
  };
  globe.maximumScreenSpaceError = qualities[quality] || 8;
};
// 设置瓦片缓存大小
const setTileCacheSize = (size) => {
  const globe = viewer.scene.globe;
  globe.tileCacheSize = size;
};
// 显示地球信息
const showGlobeInfo = () => {
  const globe = viewer.scene.globe;
  const info = `
Globe 信息：
- 椭球体半长轴: ${globe.ellipsoid.maximumRadius.toFixed(0)} 米
- 椭球体半短轴: ${globe.ellipsoid.minimumRadius.toFixed(0)} 米
- 启用光照: ${globe.enableLighting}
- 深度测试: ${globe.depthTestAgainstTerrain}
- 显示大气: ${globe.showGroundAtmosphere}
- 瓦片缓存大小: ${globe.tileCacheSize}
- 最大屏幕空间误差: ${globe.maximumScreenSpaceError}
- 瓦片加载数量: ${globe._surface.tileProvider._tilesLoaded}
  `;
  console.log(info);
  alert(info);
};

const destroyCesium = () => {
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy();
    viewer = null;
  }
  isReady.value = false;
  console.log("GlobeBasic 销毁完成");
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
    <div id="cesium-container">
      <div class="toolbar">
        <div class="toolbar-section">
          <h4>基础开关</h4>
          <button @click="toggleLighting" :class="{ active: lightingEnabled }">
            {{ lightingEnabled ? "关闭" : "启用" }}光照
          </button>
          <button
            @click="toggleDepthTest"
            :class="{ active: depthTestEnabled }"
          >
            {{ depthTestEnabled ? "关闭" : "启用" }}深度测试
          </button>
          <button
            @click="toggleAtmosphere"
            :class="{ active: atmosphereEnabled }"
          >
            {{ atmosphereEnabled ? "关闭" : "启用" }}大气效果
          </button>
          <button @click="toggleWireframe" :class="{ active: wireframeMode }">
            {{ wireframeMode ? "关闭" : "启用" }}线框模式
          </button>
          <button @click="toggleBaseMap" :class="{ active: baseMapHidden }">
            {{ baseMapHidden ? "显示" : "隐藏" }}底图
          </button>
        </div>

        <div class="toolbar-section">
          <h4>基础颜色</h4>
          <div class="color-buttons">
            <button
              @click="setBaseColor('blue')"
              class="color-btn blue"
            ></button>
            <button
              @click="setBaseColor('green')"
              class="color-btn green"
            ></button>
            <button @click="setBaseColor('red')" class="color-btn red"></button>
          </div>
        </div>

        <div class="toolbar-section">
          <h4>大气调整</h4>
          <div class="slider-item">
            <label
              >色调:
              {{
                (viewer?.scene.globe?.atmosphereHueShift || 0).toFixed(2)
              }}</label
            >
            <input
              type="range"
              min="-1"
              max="1"
              step="0.1"
              :value="viewer?.scene.globe?.atmosphereHueShift || 0"
              @input="adjustAtmosphere('hue', parseFloat($event.target.value))"
            />
          </div>
          <div class="slider-item">
            <label
              >饱和度:
              {{
                (viewer?.scene.globe?.atmosphereSaturationShift || 0).toFixed(2)
              }}</label
            >
            <input
              type="range"
              min="-1"
              max="1"
              step="0.1"
              :value="viewer?.scene.globe?.atmosphereSaturationShift || 0"
              @input="
                adjustAtmosphere('saturation', parseFloat($event.target.value))
              "
            />
          </div>
          <div class="slider-item">
            <label
              >亮度:
              {{
                (viewer?.scene.globe?.atmosphereBrightnessShift || 0).toFixed(2)
              }}</label
            >
            <input
              type="range"
              min="-1"
              max="1"
              step="0.1"
              :value="viewer?.scene.globe?.atmosphereBrightnessShift || 0"
              @input="
                adjustAtmosphere('brightness', parseFloat($event.target.value))
              "
            />
          </div>
        </div>

        <div class="toolbar-section compact-row">
          <h4>地形质量</h4>
          <div class="btn-group">
            <button @click="setTerrainQuality('low')">低</button>
            <button @click="setTerrainQuality('medium')">中</button>
            <button @click="setTerrainQuality('high')">高</button>
            <button @click="setTerrainQuality('ultra')">极高</button>
          </div>
        </div>

        <div class="toolbar-section">
          <h4>瓦片缓存</h4>
          <div class="slider-item">
            <label>{{ viewer?.scene.globe?.tileCacheSize || 1000 }}</label>
            <input
              type="range"
              min="500"
              max="5000"
              step="100"
              :value="viewer?.scene.globe?.tileCacheSize || 1000"
              @input="setTileCacheSize(parseInt($event.target.value))"
            />
          </div>
        </div>

        <div class="toolbar-section">
          <button @click="showGlobeInfo" class="btn-small">查看信息</button>
        </div>
      </div>
    </div>
    <div v-if="!isReady" class="loading-overlay">加载中...</div>
  </div>
</template>

<style scoped>
.toolbar {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  padding: 16px;
  border-radius: 8px;
  box-shadow: var(--shadow);
  min-width: 220px;
}

.toolbar-section {
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--color-border-muted);
}

.toolbar-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.toolbar-section h4 {
  margin: 0 0 10px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.toolbar-section button {
  display: block;
  width: 100%;
  margin: 5px 0;
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-bg-elevated);
  color: var(--color-text-primary);
  transition: all 0.2s ease;
}

.toolbar-section button:hover {
  background-color: var(--color-bg-hover);
  border-color: var(--color-border-muted);
}

.toolbar-section button.active {
  background-color: #4a90d9;
  border-color: #4a90d9;
  color: white;
}

.color-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.toolbar-section .color-buttons .color-btn {
  display: inline-flex !important;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  cursor: pointer;
  transition: transform 0.2s;
  flex-shrink: 0;
  padding: 0;
  margin: 0;
}

.toolbar-section .color-buttons .color-btn:hover {
  transform: scale(1.15);
  border-color: var(--color-border-muted);
}

.color-btn.blue {
  background: #2196f3;
}

.color-btn.green {
  background: #4caf50;
}

.color-btn.red {
  background: #f44336;
}

.color-btn.cyan {
  background: #00bcd4;
}

.color-btn.orange {
  background: #ff9800;
}

.color-btn.purple {
  background: #9c27b0;
}

.color-btn.reset {
  background: var(--color-bg-elevated);
  font-size: 10px;
  color: var(--color-text-secondary);
}

.slider-item {
  margin-bottom: 10px;
}

.slider-item:last-child {
  margin-bottom: 0;
}

.slider-item label {
  display: block;
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.slider-item input[type="range"] {
  width: 100%;
  height: 5px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--color-border-muted);
  border-radius: 3px;
  outline: none;
}

.slider-item input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  background: #4a90d9;
  border-radius: 50%;
  cursor: pointer;
}

.slider-item input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: #4a90d9;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.compact-row {
  margin-bottom: 12px;
  padding-bottom: 10px;
}

.compact-row h4 {
  margin-bottom: 6px;
}

.btn-group {
  display: flex;
  gap: 4px;
}

.btn-group button {
  flex: 1;
  padding: 4px 6px !important;
  font-size: 11px !important;
  margin: 0 !important;
}

.btn-small {
  padding: 4px 8px !important;
  font-size: 11px !important;
}
</style>
