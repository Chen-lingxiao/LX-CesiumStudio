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
const exaggeration = ref(1.0); // 地形夸张


const initCesium = async () => {
  try {
    isReady.value = false;
    viewer = new Cesium.Viewer("cesium-container", {
      terrainProvider: await Cesium.createWorldTerrainAsync(),
    });
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(110.42, 29.33, 10000),
      duration: 2,
    });
    const scene = viewer.scene;
    
    // 1. Cesium.createElevationBandMaterial() - 直接在 Cesium 命名空间下
    // 创建高程分层设色
    const layers = [
      {
        entries: [
          {
            height: 0.0,
            color: new Cesium.Color(0.0, 0.6, 0.27, 0.7)
          },
          {
            height: 200.0,
            color: new Cesium.Color(0.0, 0.6, 0.27, 0.7)
          }
        ]
      },
      {
        entries: [
          {
            height: 200.0,
            color: new Cesium.Color(0.47, 0.8, 0.47, 0.7)
          },
          {
            height: 500.0,
            color: new Cesium.Color(0.47, 0.8, 0.47, 0.7)
          }
        ]
      },
      {
        entries: [
          {
            height: 500.0,
            color: new Cesium.Color(0.93, 0.87, 0.47, 0.7)
          },
          {
            height: 1000.0,
            color: new Cesium.Color(0.93, 0.87, 0.47, 0.7)
          }
        ]
      },
      {
        entries: [
          {
            height: 1000.0,
            color: new Cesium.Color(0.87, 0.73, 0.27, 0.7)
          },
          {
            height: 2000.0,
            color: new Cesium.Color(0.87, 0.73, 0.27, 0.7)
          }
        ]
      },
      {
        entries: [
          {
            height: 2000.0,
            color: new Cesium.Color(0.8, 0.53, 0.27, 0.7)
          },
          {
            height: 3000.0,
            color: new Cesium.Color(0.8, 0.53, 0.27, 0.7)
          }
        ]
      },
      {
        entries: [
          {
            height: 3000.0,
            color: new Cesium.Color(0.6, 0.4, 0.27, 0.7)
          },
          {
            height: 5000.0,
            color: new Cesium.Color(0.6, 0.4, 0.27, 0.7)
          }
        ]
      },
      {
        entries: [
          {
            height: 5000.0,
            color: new Cesium.Color(0.67, 0.47, 0.73, 0.7)
          },
          {
            height: 8848.0,
            color: new Cesium.Color(0.67, 0.47, 0.73, 0.7)
          }
        ],
        extendUpwards: true
      }
    ];
    
    // 使用正确的方法创建高程带材质
    const material = Cesium.createElevationBandMaterial({
      scene: scene,
      layers: layers
    });
    
    // 应用到地球
    viewer.scene.globe.material = material;
    
    // 增强地形可视化效果
    scene.verticalExaggeration = 3.0; // 地形垂直夸张
    scene.globe.enableLighting = true; // 启用光照
    
    console.log('高程分层设色效果已成功应用！');
    isReady.value = true;
    console.log("SceneBasic 初始化完成");
  } catch (error) {
    console.error("SceneBasic 初始化失败：", error);
  }
};

const setExaggeration = (value) => {
  const scene = viewer.scene;
  scene.verticalExaggeration = parseFloat(value);
  exaggeration.value = parseFloat(value);
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
</style>
