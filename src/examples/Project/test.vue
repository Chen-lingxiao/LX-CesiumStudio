<script setup>
import { onMounted, onUnmounted, ref, computed } from "vue";
import * as Cesium from "cesium";
// ==================== 全局状态 ====================
let viewer = null;
const isReady = ref(false);
// 星座配置
const cfg = ref({
  orbitCnt: 15,
  satPer: 20,
  alt: 550,
  inc: 55,
  speed: 15,
});
// 功能开关
const isRun = ref(true);
const showIsl = ref(true);
const showTrack = ref(false);
const showHeat = ref(false);
const faultSat = ref(false);
// 数据统计
const satTotal = ref(0);
const linkNum = ref(0);
const avgDelay = ref(0);
const minElev = ref(5);
const groundNum = ref(4);
const faultCount = ref(0);
const simTimeStr = ref("00:00:00");
const fps = ref(0);
// 搜索功能
const searchSatId = ref("");
const searchedSat = ref(null);
// 运行时变量
let satMap = new Map();
let linkEntities = null;
let trackEntities = null;
let heatEntities = null;
let groundStations = [];
let faultSatIds = new Set();
let simTime = 0;
let animId = null;
let lastFpsTime = 0;
let frameCount = 0;
let lastUpdateTime = 0;
const UPDATE_INTERVAL = 50; // 更新间隔(ms)
// 航天常数
const EARTH_RADIUS = 6378137;
const GM = 398600441800000;
// 当前选中的卫星
let selectedSat = null;
// 星座类型预设
const constellationPresets = [
  { name: "Starlink", orbitCnt: 72, satPer: 22, alt: 550, inc: 53 },
  { name: "OneWeb", orbitCnt: 12, satPer: 192, alt: 1200, inc: 87.9 },
  { name: "Telesat", orbitCnt: 12, satPer: 156, alt: 1000, inc: 98.2 },
  { name: "Iridium", orbitCnt: 66, satPer: 6, alt: 780, inc: 86.4 },
];
// 计算属性：卫星总数
const totalSatellites = computed(() => cfg.value.orbitCnt * cfg.value.satPer);
// ==================== 初始化地球 ====================
const initCesium = async () => {
  try {
    isReady.value = false;
    viewer = new Cesium.Viewer("cesium-container", {
      terrainProvider: await Cesium.createWorldTerrainAsync(),
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      sceneModePicker: false,
      infoBox: false,
      selectionIndicator: false,
    });
    viewer.scene.globe.enableLighting = true;
    viewer.scene.globe.depthTestAgainstTerrain = true;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(110, 30, 15000000),
      duration: 2,
    });
    createGroundStation();
    isReady.value = true;
    mainLoop();
    console.log("LEO卫星星座系统初始化完成");
  } catch (error) {
    console.error("初始化失败：", error);
  }
};
// ==================== 创建地面站 ====================
const createGroundStation = () => {
  const sites = [
    [116.4, 39.9, "北京"],
    [121.47, 31.23, "上海"],
    [113.27, 23.13, "广州"],
    [103.83, 36.06, "兰州"],
  ];
  sites.forEach((lonlat) => {
    const pos = Cesium.Cartesian3.fromDegrees(lonlat[0], lonlat[1], 0);
    groundStations.push({
      pos,
      lon: lonlat[0],
      lat: lonlat[1],
      name: lonlat[2],
    });
    viewer.entities.add({
      position: pos,
      billboard: {
        image:
          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="16" height="16"%3E%3Ccircle fill="%23ff3333" cx="8" cy="8" r="6"/%3E%3C/svg%3E',
        pixelSize: 12,
      },
      label: {
        text: lonlat[2],
        font: "12px sans-serif",
        pixelOffset: new Cesium.Cartesian2(10, 0),
      },
    });
  });
};
// ==================== 清空所有实体 ====================
const clearAll = () => {
  satMap.forEach((e) => viewer.entities.remove(e));
  if (linkEntities) {
    viewer.scene.primitives.remove(linkEntities);
    linkEntities = null;
  }
  if (trackEntities) {
    viewer.scene.primitives.remove(trackEntities);
    trackEntities = null;
  }
  if (heatEntities) {
    viewer.scene.primitives.remove(heatEntities);
    heatEntities = null;
  }
  if (searchedSat) {
    viewer.entities.remove(searchedSat);
    searchedSat.value = null;
  }
  satMap.clear();
  faultSatIds.clear();
  simTime = 0;
  selectedSat = null;
};
// ==================== 卫星位置计算 ====================
const getSatPos = (orbitIdx, satIdx, t) => {
  const a = EARTH_RADIUS + cfg.value.alt * 1000;
  const inc = Cesium.Math.toRadians(cfg.value.inc);
  const raan = Cesium.Math.toRadians((orbitIdx * 360) / cfg.value.orbitCnt);
  const omega = Math.sqrt(GM / (a * a * a));
  const meanAnom = omega * t + (satIdx * 2 * Math.PI) / cfg.value.satPer;

  // 使用开普勒方程求解偏近点角（简化版，e=0时直接等于平近点角）
  const e = 0.001; // 微小偏心率避免完全圆形轨道的数值问题
  let E = meanAnom;
  // 迭代求解开普勒方程
  for (let i = 0; i < 5; i++) {
    E = meanAnom + e * Math.sin(E);
  }

  const trueAnom =
    2 *
    Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2),
    );

  const xOrb = a * (Math.cos(trueAnom) - e);
  const yOrb = a * Math.sin(trueAnom) * Math.sqrt(1 - e * e);

  const x = xOrb * Math.cos(raan) - yOrb * Math.sin(raan) * Math.cos(inc);
  const y = xOrb * Math.sin(raan) + yOrb * Math.cos(raan) * Math.cos(inc);
  const z = yOrb * Math.sin(inc);

  return new Cesium.Cartesian3(x, y, z);
};
// ==================== 通信时延 ====================
const calcDelay = (p1, p2) => {
  const dis = Cesium.Cartesian3.distance(p1, p2);
  const c = 299792458;
  return (dis / c) * 1000;
};
// ==================== 仰角计算 ====================
const calcElevation = (satPos, groundLon, groundLat) => {
  const groundCart = Cesium.Cartesian3.fromDegrees(groundLon, groundLat, 0);
  const vecSat = Cesium.Cartesian3.subtract(
    satPos,
    groundCart,
    new Cesium.Cartesian3(),
  );
  const normal = Cesium.Cartesian3.fromDegrees(
    groundLon,
    groundLat,
    EARTH_RADIUS,
  );
  const angle = Cesium.Cartesian3.angleBetween(vecSat, normal);
  return 90 - Cesium.Math.toDegrees(angle);
};
// ==================== 按钮功能 ====================
const rebuild = () => clearAll();
const pauseSim = () => (isRun.value = !isRun.value);
const resetAll = () => {
  clearAll();
  cfg.value = { orbitCnt: 15, satPer: 20, alt: 550, inc: 55, speed: 15 };
  isRun.value = true;
  showIsl.value = true;
  showTrack.value = false;
  showHeat.value = false;
  faultSat.value = false;
  searchSatId.value = "";
};
// ==================== 加载预设星座 ====================
const loadPreset = (preset) => {
  cfg.value.orbitCnt = preset.orbitCnt;
  cfg.value.satPer = preset.satPer;
  cfg.value.alt = preset.alt;
  cfg.value.inc = preset.inc;
  clearAll();
};
// ==================== 搜索卫星 ====================
const searchSat = () => {
  if (!searchSatId.value.trim()) return;
  const sid = searchSatId.value.trim();
  if (satMap.has(sid)) {
    const sat = satMap.get(sid);
    // 清除之前的搜索高亮
    if (searchedSat.value) {
      viewer.entities.remove(searchedSat.value);
    }
    // 定位到卫星
    viewer.camera.flyTo({
      destination: sat.position.getValue(viewer.clock.currentTime),
      offset: new Cesium.HeadingPitchRange(
        0,
        -Cesium.Math.PI_OVER_FOUR,
        500000,
      ),
      duration: 1.5,
    });
    // 添加高亮标记
    const pos = sat.position.getValue(viewer.clock.currentTime);
    searchedSat.value = viewer.entities.add({
      position: pos,
      point: {
        pixelSize: 12,
        color: Cesium.Color.YELLOW,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
      },
      label: {
        text: `★ ${sid}`,
        font: "bold 14px sans-serif",
        fillColor: Cesium.Color.YELLOW,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        pixelOffset: new Cesium.Cartesian2(12, 0),
      },
    });
    // 设置选中状态
    selectedSat = sid;
  } else {
    alert(`未找到卫星 ${sid}`);
  }
};
// ==================== 清除搜索 ====================
const clearSearch = () => {
  if (searchedSat.value) {
    viewer.entities.remove(searchedSat.value);
    searchedSat.value = null;
  }
  searchSatId.value = "";
  selectedSat = null;
};
// ==================== 优化：计算两点距离的平方（避免开方运算）====================
const distanceSquared = (p1, p2) => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;
  return dx * dx + dy * dy + dz * dz;
};

// ==================== 优化：空间网格索引 ====================
class SpatialGrid {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  getCellKey(pos) {
    const cx = Math.floor(pos.x / this.cellSize);
    const cy = Math.floor(pos.y / this.cellSize);
    const cz = Math.floor(pos.z / this.cellSize);
    return `${cx},${cy},${cz}`;
  }

  insert(pos, data) {
    const key = this.getCellKey(pos);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key).push(data);
  }

  queryNeighbors(pos, maxDist) {
    const results = [];
    const cellSize = this.cellSize;
    const halfCells = Math.ceil(maxDist / cellSize);

    for (let dx = -halfCells; dx <= halfCells; dx++) {
      for (let dy = -halfCells; dy <= halfCells; dy++) {
        for (let dz = -halfCells; dz <= halfCells; dz++) {
          const cx = Math.floor(pos.x / cellSize) + dx;
          const cy = Math.floor(pos.y / cellSize) + dy;
          const cz = Math.floor(pos.z / cellSize) + dz;
          const key = `${cx},${cy},${cz}`;
          if (this.grid.has(key)) {
            results.push(...this.grid.get(key));
          }
        }
      }
    }
    return results;
  }
}

// ==================== 主仿真循环 ====================
const mainLoop = () => {
  if (!viewer) return;

  // 帧率计算
  const now = performance.now();
  frameCount++;
  if (now - lastFpsTime >= 1000) {
    fps.value = frameCount;
    frameCount = 0;
    lastFpsTime = now;
  }

  // 时间更新
  if (isRun.value) {
    simTime += 0.016 * cfg.value.speed;
  }

  // 时间格式化
  let h = Math.floor(simTime / 3600);
  let m = Math.floor((simTime % 3600) / 60);
  let s = Math.floor(simTime % 60);
  simTimeStr.value = `${String(h).padStart(2, 0)}:${String(m).padStart(2, 0)}:${String(s).padStart(2, 0)}`;

  // 更新卫星位置（每帧都更新）
  const allSat = [];
  const satPositions = [];
  const satColors = [];

  for (let o = 0; o < cfg.value.orbitCnt; o++) {
    for (let s = 0; s < cfg.value.satPer; s++) {
      const sid = `S${o}-${s}`;
      const pos = getSatPos(o, s, simTime);
      let isFault = faultSatIds.has(sid);

      if (faultSat.value && Math.random() < 0.002) {
        faultSatIds.add(sid);
        isFault = true;
      }

      allSat.push({ id: sid, pos, bad: isFault, orbit: o, idx: s });
      satPositions.push(pos);

      if (satMap.has(sid)) {
        const ent = satMap.get(sid);
        ent.position = pos;
        ent.point.color = isFault
          ? Cesium.Color.RED
          : selectedSat === sid
            ? Cesium.Color.YELLOW
            : Cesium.Color.SKYBLUE;
      } else {
        const ent = viewer.entities.add({
          id: sid,
          position: pos,
          point: {
            pixelSize: 6,
            color: Cesium.Color.SKYBLUE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 1,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        satMap.set(sid, ent);
      }
    }
  }

  satTotal.value = allSat.length;
  faultCount.value = faultSatIds.size;

  // 定期更新复杂计算（使用时间间隔优化）
  if (now - lastUpdateTime >= UPDATE_INTERVAL) {
    lastUpdateTime = now;

    // 星间链路（使用空间网格优化）
    updateLinks(allSat);

    // 轨迹
    updateTracks(allSat);

    // 地面覆盖
    updateHeat(allSat);
  }

  animId = requestAnimationFrame(mainLoop);
};

// ==================== 更新星间链路 ====================
const updateLinks = (allSat) => {
  if (!showIsl.value) {
    if (linkEntities) {
      viewer.scene.primitives.remove(linkEntities);
      linkEntities = null;
    }
    linkNum.value = 0;
    avgDelay.value = 0;
    return;
  }

  const goodSat = allSat.filter((s) => !s.bad);
  const maxDistSq = 4000000 * 4000000;
  const lines = [];
  let totalD = 0,
    dCnt = 0;

  // 使用空间网格索引优化
  const grid = new SpatialGrid(2000000);
  goodSat.forEach((sat) => grid.insert(sat.pos, sat));

  for (let i = 0; i < goodSat.length; i++) {
    const sat1 = goodSat[i];
    const neighbors = grid.queryNeighbors(sat1.pos, 4000000);

    for (const sat2 of neighbors) {
      if (sat1.id < sat2.id) {
        // 避免重复计算
        const distSq = distanceSquared(sat1.pos, sat2.pos);
        if (distSq < maxDistSq) {
          const dist = Math.sqrt(distSq);
          lines.push(sat1.pos, sat2.pos);
          const delay = (dist / 299792458) * 1000;
          totalD += delay;
          dCnt++;
        }
      }
    }
  }

  // 使用 Primitive API 渲染
  if (linkEntities) {
    viewer.scene.primitives.remove(linkEntities);
  }

  if (lines.length > 0) {
    linkEntities = new Cesium.PolylineCollection();
    linkEntities.add({
      positions: Cesium.PolylineCollection.packArray(lines),
      width: 1,
      material: Cesium.Color.CYAN.withAlpha(0.3),
    });
    viewer.scene.primitives.add(linkEntities);
  }

  linkNum.value = dCnt;
  avgDelay.value = dCnt > 0 ? (totalD / dCnt).toFixed(2) : 0;
};

// ==================== 更新轨迹 ====================
const updateTracks = (allSat) => {
  if (!showTrack.value) {
    if (trackEntities) {
      viewer.scene.primitives.remove(trackEntities);
      trackEntities = null;
    }
    return;
  }

  const lines = [];
  const sampleSat = allSat.slice(0, Math.min(20, allSat.length));

  for (const sat of sampleSat) {
    if (sat.bad) continue;
    const [o, s] = sat.id.split("-");
    const nextP = getSatPos(+o, +s, simTime + 300);
    lines.push(sat.pos, nextP);
  }

  if (trackEntities) {
    viewer.scene.primitives.remove(trackEntities);
  }

  if (lines.length > 0) {
    trackEntities = new Cesium.PolylineCollection();
    trackEntities.add({
      positions: Cesium.PolylineCollection.packArray(lines),
      width: 0.8,
      material: Cesium.Color.ORANGE.withAlpha(0.4),
    });
    viewer.scene.primitives.add(trackEntities);
  }
};

// ==================== 更新地面覆盖 ====================
const updateHeat = (allSat) => {
  if (!showHeat.value) {
    if (heatEntities) {
      viewer.scene.primitives.remove(heatEntities);
      heatEntities = null;
    }
    return;
  }

  const lines = [];

  for (const gs of groundStations) {
    for (const sat of allSat) {
      if (sat.bad) continue;
      const el = calcElevation(sat.pos, gs.lon, gs.lat);
      if (el >= minElev.value) {
        lines.push(gs.pos, sat.pos);
      }
    }
  }

  if (heatEntities) {
    viewer.scene.primitives.remove(heatEntities);
  }

  if (lines.length > 0) {
    heatEntities = new Cesium.PolylineCollection();
    heatEntities.add({
      positions: Cesium.PolylineCollection.packArray(lines),
      width: 1,
      material: Cesium.Color.LIME.withAlpha(0.35),
    });
    viewer.scene.primitives.add(heatEntities);
  }
};
// ==================== 销毁 ====================
const destroyCesium = () => {
  if (animId) cancelAnimationFrame(animId);
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy();
    viewer = null;
  }
  isReady.value = false;
  console.log("已销毁");
};
onMounted(() => initCesium());
onUnmounted(() => destroyCesium());
</script>

<template>
  <div class="cesium-wrapper">
    <div id="cesium-container"></div>
    <div v-if="!isReady" class="loading">加载中...</div>

    <!-- 顶部标题栏 -->
    <div class="header-bar">
      <div class="header-title">
        <span class="title-icon">🛰️</span>
        <span>LEO低空星网动态可视化推演平台</span>
      </div>
      <div class="header-status">
        <div class="status-item">
          <span class="status-label">状态:</span>
          <span :class="['status-dot', isRun ? 'running' : 'paused']"></span>
          <span>{{ isRun ? "运行中" : "已暂停" }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">时间:</span>
          <span class="status-value">{{ simTimeStr }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">FPS:</span>
          <span :class="['status-value', fps < 20 ? 'warning' : '']">{{
            fps
          }}</span>
        </div>
      </div>
    </div>

    <!-- 图例面板 -->
    <div class="legend-panel">
      <div class="legend-title">图例说明</div>
      <div class="legend-items">
        <div class="legend-item">
          <span class="legend-color" style="background: #87ceeb"></span>
          <span>正常卫星</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #ff0000"></span>
          <span>故障卫星</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #00ffff"></span>
          <span>星间链路</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #ffa500"></span>
          <span>卫星轨迹</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #32cd32"></span>
          <span>地面覆盖</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #ff3333"></span>
          <span>地面站</span>
        </div>
      </div>
    </div>

    <!-- 左侧控制面板 -->
    <div class="control-panel">
      <!-- 星座预设 -->
      <div class="box-title">星座预设</div>
      <div class="preset-group">
        <button
          v-for="preset in constellationPresets"
          :key="preset.name"
          @click="loadPreset(preset)"
          class="preset-btn"
        >
          {{ preset.name }}
        </button>
      </div>

      <!-- 星座基础配置 -->
      <div class="box-title">星座基础配置</div>
      <div class="form-item">
        <label>轨道面数量</label>
        <div class="input-group">
          <input v-model.number="cfg.orbitCnt" type="number" min="2" max="36" />
          <span class="input-value">{{ cfg.orbitCnt }}</span>
        </div>
      </div>
      <div class="form-item">
        <label>单轨卫星数</label>
        <div class="input-group">
          <input v-model.number="cfg.satPer" type="number" min="6" max="60" />
          <span class="input-value">{{ cfg.satPer }}</span>
        </div>
      </div>
      <div class="form-item">
        <label>轨道高度(km)</label>
        <div class="input-group">
          <input v-model.number="cfg.alt" type="number" min="300" max="1500" />
          <span class="input-value">{{ cfg.alt }} km</span>
        </div>
      </div>
      <div class="form-item">
        <label>轨道倾角(°)</label>
        <div class="input-group">
          <input v-model.number="cfg.inc" type="number" min="0" max="90" />
          <span class="input-value">{{ cfg.inc }}°</span>
        </div>
      </div>
      <div class="form-item">
        <label>仿真倍速</label>
        <div class="slider-group">
          <input v-model.number="cfg.speed" type="range" min="1" max="80" />
          <span class="slider-value">{{ cfg.speed }}x</span>
        </div>
      </div>

      <!-- 卫星总数显示 -->
      <div class="stat-card">
        <div class="stat-label">预计卫星总数</div>
        <div class="stat-value">{{ totalSatellites }}</div>
      </div>

      <!-- 控制按钮组 -->
      <div class="btn-group">
        <button @click="rebuild" class="btn btn-primary">重建星座</button>
        <button
          @click="pauseSim"
          :class="['btn', isRun ? 'btn-warning' : 'btn-success']"
        >
          {{ isRun ? "⏸ 暂停" : "▶ 启动" }}
        </button>
        <button @click="resetAll" class="btn btn-danger">一键重置</button>
      </div>

      <!-- 卫星搜索 -->
      <div class="box-title">卫星搜索</div>
      <div class="search-group">
        <input
          v-model="searchSatId"
          type="text"
          placeholder="输入卫星ID，如 S0-0"
          @keyup.enter="searchSat"
        />
        <button @click="searchSat" class="search-btn">搜索</button>
        <button v-if="searchedSat" @click="clearSearch" class="clear-btn">
          清除
        </button>
      </div>

      <!-- 高级功能 -->
      <div class="box-title">高级功能</div>
      <div class="form-item">
        <label>星间链路</label>
        <input v-model="showIsl" type="checkbox" />
      </div>
      <div class="form-item">
        <label>卫星轨迹</label>
        <input v-model="showTrack" type="checkbox" />
      </div>
      <div class="form-item">
        <label>地面覆盖</label>
        <input v-model="showHeat" type="checkbox" />
      </div>
      <div class="form-item">
        <label>故障注入</label>
        <input v-model="faultSat" type="checkbox" />
      </div>
      <div v-if="showHeat" class="form-item">
        <label>最小仰角(°)</label>
        <input v-model.number="minElev" type="range" min="0" max="30" />
        <span class="input-value">{{ minElev }}°</span>
      </div>

      <!-- 实时状态 -->
      <div class="box-title">实时状态</div>
      <div class="data-card">
        <div class="data-item">
          <span class="data-label">卫星总数</span>
          <span class="data-value">{{ satTotal }} 颗</span>
        </div>
        <div class="data-item">
          <span class="data-label">通信链路</span>
          <span class="data-value">{{ linkNum }} 条</span>
        </div>
        <div class="data-item">
          <span class="data-label">平均时延</span>
          <span class="data-value">{{ avgDelay }} ms</span>
        </div>
        <div class="data-item">
          <span class="data-label">故障卫星</span>
          <span :class="['data-value', faultCount > 0 ? 'danger' : '']"
            >{{ faultCount }} 颗</span
          >
        </div>
        <div class="data-item">
          <span class="data-label">运行时间</span>
          <span class="data-value">{{ simTimeStr }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 整体容器 */
.cesium-wrapper {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

#cesium-container {
  width: 100%;
  height: 100%;
}

.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 18px;
  color: #fff;
  background: rgba(0, 0, 0, 0.7);
  padding: 20px 40px;
  border-radius: 8px;
  z-index: 1000;
}

/* 顶部标题栏 */
.header-bar {
  position: absolute;
  top: 0;
  left: 340px;
  right: 0;
  height: 60px;
  background: rgba(21, 26, 45, 0.95);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  z-index: 999;
  border-bottom: 1px solid #333;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: bold;
  color: #50c8ff;
}

.title-icon {
  font-size: 24px;
}

.header-status {
  display: flex;
  gap: 30px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 14px;
}

.status-label {
  color: #888;
}

.status-value {
  font-weight: bold;
  color: #50c8ff;
}

.status-value.warning {
  color: #ff6b35;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #666;
}

.status-dot.running {
  background: #4caf50;
  animation: pulse 1.5s infinite;
}

.status-dot.paused {
  background: #ff9800;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 图例面板 */
.legend-panel {
  position: absolute;
  top: 80px;
  right: 20px;
  background: rgba(21, 26, 45, 0.95);
  border-radius: 8px;
  padding: 12px 16px;
  z-index: 998;
  border: 1px solid #333;
}

.legend-title {
  font-size: 14px;
  font-weight: bold;
  color: #50c8ff;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #333;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #ccc;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

/* 控制面板 */
.control-panel {
  position: absolute;
  left: 0;
  top: 0;
  width: 340px;
  height: 100vh;
  background: #151a2d;
  color: #fff;
  padding: 18px;
  overflow-y: auto;
  z-index: 999;
}

.box-title {
  font-size: 16px;
  font-weight: bold;
  color: #50c8ff;
  margin: 16px 0 10px;
  padding-left: 8px;
  border-left: 3px solid #50c8ff;
}

.box-title:first-child {
  margin-top: 0;
}

/* 预设按钮组 */
.preset-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 8px;
}

.preset-btn {
  padding: 8px 12px;
  background: #2a3448;
  color: #fff;
  border: 1px solid #3a4458;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: #007bff;
  border-color: #007bff;
}

/* 表单项目 */
.form-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 10px 0;
}

.form-item label {
  font-size: 13px;
  color: #ccc;
}

.form-item input[type="number"] {
  width: 100px;
  padding: 6px 8px;
  background: #202742;
  color: #fff;
  border: 1px solid #444;
  border-radius: 4px;
  font-size: 13px;
}

.form-item input[type="range"] {
  width: 120px;
  cursor: pointer;
}

.form-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

/* 输入组 */
.input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-group input {
  width: 70px;
}

.input-value {
  font-size: 13px;
  color: #50c8ff;
  font-weight: bold;
  min-width: 60px;
  text-align: right;
}

/* 滑块组 */
.slider-group {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.slider-group input {
  flex: 1;
}

.slider-value {
  font-size: 13px;
  color: #50c8ff;
  font-weight: bold;
  min-width: 40px;
  text-align: right;
}

/* 统计卡片 */
.stat-card {
  background: linear-gradient(135deg, #2a3448 0%, #1e2636 100%);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
  margin: 12px 0;
  border: 1px solid #3a4458;
}

.stat-label {
  font-size: 12px;
  color: #888;
  display: block;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #50c8ff;
}

/* 按钮组 */
.btn-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0;
}

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: #007bff;
  color: #fff;
}

.btn-primary:hover {
  background: #0069d9;
}

.btn-warning {
  background: #ff9800;
  color: #fff;
}

.btn-warning:hover {
  background: #f57c00;
}

.btn-success {
  background: #4caf50;
  color: #fff;
}

.btn-success:hover {
  background: #43a047;
}

.btn-danger {
  background: #dc3545;
  color: #fff;
}

.btn-danger:hover {
  background: #c82333;
}

/* 搜索组 */
.search-group {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.search-group input {
  flex: 1;
  padding: 8px 10px;
  background: #202742;
  color: #fff;
  border: 1px solid #444;
  border-radius: 4px;
  font-size: 13px;
}

.search-btn {
  padding: 8px 14px;
  background: #50c8ff;
  color: #151a2d;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}

.search-btn:hover {
  background: #7dd3fc;
}

.clear-btn {
  padding: 8px 12px;
  background: #666;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: #888;
}

/* 数据卡片 */
.data-card {
  background: #202742;
  padding: 14px;
  border-radius: 8px;
  border: 1px solid #3a4458;
}

.data-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #333;
}

.data-item:last-child {
  border-bottom: none;
}

.data-label {
  font-size: 13px;
  color: #888;
}

.data-value {
  font-size: 13px;
  font-weight: bold;
  color: #fff;
}

.data-value.danger {
  color: #ff4757;
}

/* 滚动条样式 */
.control-panel::-webkit-scrollbar {
  width: 6px;
}

.control-panel::-webkit-scrollbar-track {
  background: #151a2d;
}

.control-panel::-webkit-scrollbar-thumb {
  background: #3a4458;
  border-radius: 3px;
}

.control-panel::-webkit-scrollbar-thumb:hover {
  background: #4a5468;
}
</style>
