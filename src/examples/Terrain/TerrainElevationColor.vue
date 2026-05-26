<script setup>
/**
 * TerrainElevationColor.vue - Cesium 地形高程分层设色示例组件
 *
 * 【功能说明】
 * 1. 演示如何使用 Cesium.createElevationBandMaterial() 创建高程分层设色效果
 * 2. 根据不同海拔高度为地形着色，形成类似地形图的视觉效果
 * 3. 提供地形垂直夸张控制，增强地形起伏的视觉表现
 * 4. 演示高程带材质的完整配置流程
 *
 * 【核心技术要点】
 *
 * 1. 高程带材质创建（Cesium.createElevationBandMaterial）
 *    - 核心方法：Cesium.createElevationBandMaterial({ scene, layers })
 *    - scene: 当前场景对象（必需）
 *    - layers: 高程带配置数组（定义各高度范围的颜色）
 *
 * 2. 高程带配置结构（layers 数组）
 *    - 每个 layer 包含：
 *      · entries: 高度区间配置数组
 *        - height: 高度值（米）
 *        - color: 该高度范围的颜色（支持透明度）
 *      · extendUpwards: 是否向上延伸（最后一层通常设为 true）
 *
 * 3. 高程分层方案（本示例采用标准地形图配色）
 *    - 0-200米: 深绿色（平原/低地）
 *    - 200-500米: 浅绿色（丘陵）
 *    - 500-1000米: 黄绿色（低山）
 *    - 1000-2000米: 橙黄色（中山）
 *    - 2000-3000米: 橙棕色（高山）
 *    - 3000-5000米: 棕褐色（极高山）
 *    - 5000-8848米: 紫灰色（雪线以上）
 *
 * 4. 地形增强效果
 *    - verticalExaggeration: 地形垂直夸张系数（1=真实比例，>1=夸张显示）
 *    - enableLighting: 启用光照（增强地形立体感）
 *
 * 【实现步骤】
 * 1. 创建 Viewer 实例并加载全球地形数据
 * 2. 定义高程带配置数组（layers），每个元素包含高度范围和对应颜色
 * 3. 使用 Cesium.createElevationBandMaterial() 创建材质对象
 * 4. 将材质应用到 globe.material
 * 5. 配置地形夸张和光照效果
 * 6. 提供交互式滑块控制地形夸张系数
 *
 * 【注意事项】
 * - 必须加载地形数据才能看到高程设色效果
 * - layers 数组中的高度值必须按升序排列
 * - 最后一个 layer 建议设置 extendUpwards: true，覆盖最高海拔以上区域
 * - 颜色的 alpha 值影响透明度，建议 0.6-0.8 之间以保持地形可见性
 * - 地形夸张系数不宜过大（建议 1-5 倍），否则会失真
 * - 启用光照（enableLighting）会增强立体感，但会增加性能开销
 *
 * 【使用场景】
 * - 地理教学：直观展示地形起伏和海拔分布
 * - 气象分析：配合高程数据进行气候分区
 * - 规划设计：评估地形对项目的影响
 * - 旅游导航：展示山地、平原等地形特征
 * - 地质研究：分析地形地貌分布规律
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
    console.log("TerrainElevationColor初始化成功");
  } catch (error) {
    console.error("TerrainElevationColor初始化失败：", error);
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
  console.log("TerrainElevationColor已销毁");
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
