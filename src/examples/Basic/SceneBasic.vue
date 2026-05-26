<script setup>
/**
 * SceneBasic.vue - Cesium Scene 场景配置示例组件
 *
 * 功能说明：
 * 1. 演示 Cesium Scene 类的各种配置选项
 * 2. 展示场景模式、大气效果、雾效、光照等效果
 * 3. 介绍地形夸张、天空盒、背景颜色等配置
 * 4. 提供交互式控制面板实时调整场景参数
 *
 * 技术要点：
 * - SkyAtmosphere: 大气效果（色调/饱和度/亮度调整）
 * - Fog: 雾效（距离衰减效果，density 控制浓度）
 * - Sun/Moon: 太阳和月亮天体显示
 * - Lighting: 地表光照（地形阴影效果）
 * - verticalExaggeration: 地形垂直夸张（1.0 真实，5.0+ 夸张）
 * - requestRenderMode: 渲染模式（false 持续渲染/true 按需渲染）
 * - FXAA: 快速近似抗锯齿
 * - shadows: 动态阴影（性能开销大）
 * - ClassificationType: 分类类型（TERRAIN/3D_TILES/BOTH）
 * - ArcType: 弧线类型（NONE/GEODESIC 大地线/RHUMB 恒向线）
 * - backgroundColor: 背景颜色设置
 * - skyBox: 天空盒（自定义星空纹理）
 */
import { onMounted, onUnmounted, ref } from "vue";
import * as Cesium from "cesium";

let viewer = null; // Cesium 实例
const isReady = ref(false); // 初始化状态

// 控制面板状态
const atmosphereEnabled = ref(true); // 是否显示大气效果
const fogEnabled = ref(true); // 是否显示雾效
const sunEnabled = ref(true); // 是否显示太阳
const moonEnabled = ref(true); // 是否显示月亮
const shadowsEnabled = ref(false); // 是否显示阴影
const fxaaEnabled = ref(false); // 是否启用 FXAA 抗锯齿
const exaggeration = ref(1.0); // 地形垂直夸张


const initCesium = async () => {
  try {
    isReady.value = false;
    viewer = new Cesium.Viewer("cesium-container", {
      terrainProvider: await Cesium.createWorldTerrainAsync(),
    });
    // 初始化场景
    setupScene();
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(86.85, 28.05, 100000),
      duration: 2,
      orientation: {
        heading: Cesium.Math.toRadians(45),
        pitch: Cesium.Math.toRadians(-10),
        roll: 0,
      },
    });
    isReady.value = true;
    console.log("SceneBasic 初始化完成");
  } catch (error) {
    console.error("SceneBasic 初始化失败：", error);
  }
};

const setupScene = () => {
  const scene = viewer.scene;

  /**
   * Scene 外观配置 - 大气效果 (SkyAtmosphere)
   * 控制地球周围的大气光晕效果，增强视觉真实感
   * 效果：地球边缘会显示蓝色光晕，模拟真实大气层
   */
  const skyAtmosphere = scene.skyAtmosphere;
  skyAtmosphere.show = true; // 是否显示大气效果
  skyAtmosphere.hueShift = 0.8; // 色调偏移，范围 -1.0 到 1.0
  skyAtmosphere.saturationShift = 0; // 饱和度偏移，范围 -1.0 到 1.0
  skyAtmosphere.brightnessShift = 0; // 亮度偏移，范围 -1.0 到 1.0

  /**
   * Scene 视觉配置 - 雾效 (Fog)
   * 模拟真实大气透视效果，远处景物逐渐融入背景
   * 作用：增强场景深度感和真实感
   */
  scene.fog.enabled = true; // 是否启用雾效
  scene.fog.density = 0.0002; // 雾浓度，值越大雾越浓

  /**
   * Scene 背景配置 - 背景颜色
   * 设置场景背景色，常用于星空或纯色背景效果
   */
  scene.backgroundColor = Cesium.Color.BLACK; // 背景颜色，黑色配合星空效果更佳

  /**
   * Scene 光照配置 - 光照系统
   * 控制太阳、月亮显示及地表光照效果
   */
  if (scene.sun) scene.sun.show = true; // 显示太阳
  if (scene.moon) scene.moon.show = true; // 显示月亮
  scene.globe.enableLighting = true; // 地表光照（默认关闭，开启后地形会有光影）

  /**
   * Scene 地形配置 - 地形垂直夸张
   * 垂直方向拉伸地形高度，用于突出地形特征
   * 用途：观察地形起伏、教学演示、特殊视觉效果
   * 推荐值：1.0（真实比例），5.0（夸张显示），10.0（高度夸张）
   */
  scene.verticalExaggeration = 1.0; // 地形夸张系数，1.0为真实比例

  /**
   * Scene 性能配置 - 渲染模式
   * false: 持续渲染（适合动画、实时交互）
   * true: 按需渲染（适合静态场景，节省CPU/GPU资源）
   */
  scene.requestRenderMode = false; // 默认持续渲染

  /**
   * Scene 背景配置 - 天空盒
   * 使用自定义天空盒纹理，undefined使用默认星空
   * 可加载6面立方体贴图实现自定义天空
   */
  scene.skyBox = undefined; // 使用默认星空

  /**
   * Scene 抗锯齿配置 - FXAA
   * 开启快速近似抗锯齿，提升画面平滑度
   * 注意：会增加性能开销，低配置设备可关闭
   */
  scene.fxaa = false; // 默认关闭抗锯齿

  /**
   * Scene 阴影配置
   * 启用动态阴影效果，增强立体感
   * 注意：性能开销较大，低配置设备建议关闭
   */
  scene.shadows = false; // 默认关闭阴影

  /**
   * Scene 分类类型
   * 控制3D瓦片/地形的分类渲染（如贴地效果）
   * ClassificationType.TERRAIN - 仅地形
   * ClassificationType.CESIUM_3D_TILE - 仅3D瓦片
   * ClassificationType.BOTH - 两者都支持
   */
  scene.classificationType = Cesium.ClassificationType.BOTH;

  /**
   * Scene 弧线类型
   * 控制实体之间连线的类型
   * ArcType.NONE - 直线连接
   * ArcType.GEODESIC - 大地线（测地线，最短路径）
   * ArcType.RHUMB - 恒向线（等角航线）
   */
  scene.arcType = Cesium.ArcType.GEODESIC; // 默认使用大地线
};

// ==================== 控制面板交互函数 ====================

const toggleAtmosphere = () => {
  const scene = viewer.scene;
  scene.skyAtmosphere.show = !scene.skyAtmosphere.show;
  atmosphereEnabled.value = scene.skyAtmosphere.show;
};

const toggleFog = () => {
  const scene = viewer.scene;
  scene.fog.enabled = !scene.fog.enabled;
  fogEnabled.value = scene.fog.enabled;
};

const toggleSun = () => {
  const scene = viewer.scene;
  if (scene.sun) {
    scene.sun.show = !scene.sun.show;
    sunEnabled.value = scene.sun.show;
  }
};

const toggleMoon = () => {
  const scene = viewer.scene;
  if (scene.moon) {
    scene.moon.show = !scene.moon.show;
    moonEnabled.value = scene.moon.show;
  }
};

const toggleShadows = () => {
  const scene = viewer.scene;
  scene.shadows = !scene.shadows;
  shadowsEnabled.value = scene.shadows;
};

const toggleFXAA = () => {
  const scene = viewer.scene;
  scene.fxaa = !scene.fxaa;
  fxaaEnabled.value = scene.fxaa;
};

const setExaggeration = (value) => {
  const scene = viewer.scene;
  scene.verticalExaggeration = parseFloat(value);
  exaggeration.value = parseFloat(value);
};

/**
 * 场景模式平滑切换
 * 使用 Cesium 提供的 morph 方法实现平滑过渡动画
 * duration 参数控制切换动画时长（单位：秒）
 *
 * morphTo3D(duration) - 平滑切换到3D模式
 * morphTo2D(duration) - 平滑切换到2D模式
 * morphToColumbusView(duration) - 平滑切换到哥伦布视图
 */
const setSceneMode = (mode) => {
  const scene = viewer.scene;
  const duration = 1.0; // 切换动画时长，单位秒

  switch (mode) {
    case "3D":
      scene.morphTo3D(duration);
      break;
    case "2D":
      scene.morphTo2D(duration);
      break;
    case "CV":
      scene.morphToColumbusView(duration);
      break;
  }
};

const destroyCesium = () => {
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy();
    viewer = null;
  }
  isReady.value = false;
  console.log("SceneBasic 销毁完成");
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
          <h4>场景效果</h4>
          <button @click="toggleAtmosphere" :class="{ active: atmosphereEnabled }">
            {{ atmosphereEnabled ? "关闭" : "启用" }}大气
          </button>
          <button @click="toggleFog" :class="{ active: fogEnabled }">
            {{ fogEnabled ? "关闭" : "启用" }}雾效
          </button>
          <button @click="toggleSun" :class="{ active: sunEnabled }">
            {{ sunEnabled ? "隐藏" : "显示" }}太阳
          </button>
          <button @click="toggleMoon" :class="{ active: moonEnabled }">
            {{ moonEnabled ? "隐藏" : "显示" }}月亮
          </button>
          <button @click="toggleShadows" :class="{ active: shadowsEnabled }">
            {{ shadowsEnabled ? "关闭" : "启用" }}阴影
          </button>
          <button @click="toggleFXAA" :class="{ active: fxaaEnabled }">
            {{ fxaaEnabled ? "关闭" : "启用" }}抗锯齿
          </button>
        </div>

        <div class="toolbar-section">
          <h4>场景模式</h4>
          <div class="btn-group">
            <button @click="setSceneMode('3D')">3D</button>
            <button @click="setSceneMode('2D')">2D</button>
            <button @click="setSceneMode('CV')">CV</button>
          </div>
        </div>

        <div class="toolbar-section">
          <h4>地形夸张</h4>
          <div class="slider-item">
            <label>{{ exaggeration.toFixed(1) }}x</label>
            <input type="range" min="0.1" max="10" step="0.1" :value="exaggeration"
              @input="setExaggeration($event.target.value)" />
          </div>
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
  min-width: 200px;
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
  margin: 4px 0;
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

.slider-item {
  margin-top: 4px;
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
</style>
