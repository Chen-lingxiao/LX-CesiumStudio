<script setup>
/**
 * SectionAnalysis.vue - 剖面分析示例组件
 *
 * 功能说明：
 * 1. 在地形上绘制剖面线（起点→中间点→终点）
 * 2. 沿剖面线插值采样地形高度
 * 3. 使用 ECharts 绘制高程剖面图
 *
 * 技术要点：
 * - Cesium.Math.lerp: 线性插值获取路径上的采样点
 * - viewer.scene.globe.getHeight: 获取地形高度
 * - Haversine 公式: 计算球面两点间的累计距离
 * - depthTestAgainstTerrain: 开启地形深度测试
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'
import * as echarts from 'echarts'

let viewer = null
let chart = null
const isReady = ref(false)

const defaultPoints = [[116.144, 39.951], [116.166, 39.940]]

/**
 * 初始化 Cesium Viewer
 * 1. 创建带地形的 Cesium Viewer 实例
 * 2. 开启地形深度测试，使被地形遮挡的元素正确显示
 * 3. 飞行到目标区域，待地形加载完成后执行剖面分析
 */
const initCesium = async () => {
  try {
    isReady.value = false
    viewer = new Cesium.Viewer('cesium-container', {
      terrainProvider: await Cesium.createWorldTerrainAsync(),
    })

    viewer.scene.globe.depthTestAgainstTerrain = true

    viewer.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(defaultPoints[0][0], defaultPoints[0][1], defaultPoints[1][0], defaultPoints[1][1]),
      duration: 3,
      complete: () => {
        setTimeout(() => {
          initPM(defaultPoints)
        }, 1000)
      }
    })

    isReady.value = true
    console.log('SectionAnalysis 初始化完成')
  } catch (error) {
    console.error('SectionAnalysis 初始化失败：', error)
  }
}

/**
 * 使用 Haversine 公式计算球面上两点间的大圆距离
 *
 * 【算法原理】
 * 对于地球表面两点 (lon1, lat1) 和 (lon2, lat2)，大圆距离公式为：
 *   d = R × 2 × atan2(√a, √(1-a))
 * 其中：
 *   a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
 *   R = 6371 km（地球平均半径）
 *
 * 【特点】
 * - 考虑了地球曲率，比平面投影距离更精确
 * - 适合剖面分析中沿地表路径的累计距离计算
 *
 * @param {number} lon1 - 起点经度（度）
 * @param {number} lat1 - 起点纬度（度）
 * @param {number} lon2 - 终点经度（度）
 * @param {number} lat2 - 终点纬度（度）
 * @returns {number} 球面距离（公里）
 */
function haversineDistance(lon1, lat1, lon2, lat2) {
  const R = 6371
  const dLat = Cesium.Math.toRadians(lat2 - lat1)
  const dLon = Cesium.Math.toRadians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(Cesium.Math.toRadians(lat1)) * Math.cos(Cesium.Math.toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * 剖面采样主流程
 *
 * 【采样策略】
 * 1. 接受起点和终点坐标点
 * 2. 在两点之间进行 100 等分线性插值
 * 3. 对每个插值点通过 globe.getHeight 获取地形高度
 * 4. 累计计算从起点到当前点的路径距离
 *
 * 【数据结构】
 * - points: 控制点坐标 [[lon, lat], ...]，至少需要 2 个点（起点和终点）
 * - arr2: 采样点坐标序列（用于距离计算）
 * - arr3: 最终采样数据 [lon, lat, height, cumulativeDistance]
 *
 * 【输出】
 * 控制台打印采样数据数组，并触发 ECharts 图表渲染
 *
 * @param {Array} points - 剖面线的坐标点数组，格式为 [[lon, lat], [lon, lat], ...]
 */
function initPM(points) {
  if (!points || points.length < 2) {
    console.warn('剖面分析需要至少 2 个坐标点（起点和终点）')
    return
  }

  initLabel(points)

  const arr2 = []
  const arr3 = []
  const step = 100
  let cumulativeDistance = 0

  points.forEach((ele, index) => {
    for (let i = 0; i < step; ++i) {
      if (index < points.length - 1) {
        const offset = i / (step - 1)

        const startx = points[index][0]
        const starty = points[index][1]
        const endx = points[index + 1][0]
        const endy = points[index + 1][1]

        const lon = Cesium.Math.lerp(startx, endx, offset)
        const lat = Cesium.Math.lerp(starty, endy, offset)

        const cartographic = Cesium.Cartographic.fromDegrees(lon, lat)
        const posi = new Cesium.Cartographic(cartographic.longitude, cartographic.latitude)
        const height = viewer.scene.globe.getHeight(posi)

        arr2.push([lon, lat])

        if (arr2.length > 1) {
          const prev = arr2[arr2.length - 2]
          cumulativeDistance += haversineDistance(prev[0], prev[1], lon, lat)
        }

        arr3.push([lon, lat, height, cumulativeDistance])
      }
    }
  })
  initCharts(arr3)
}

/**
 * 使用 ECharts 渲染高程剖面图
 *
 * 【图表配置】
 * - xAxis: 累计距离（公里），boundaryGap: false 使曲线连续
 * - yAxis: 高程值（米）
 * - series: 平滑面积图，smooth: true 使曲线更自然
 * - tooltip: 悬停显示当前点距离和高程
 *
 * @param {Array} arr3 - 采样数据 [lon, lat, height, cumulativeDistance]
 */
function initCharts(arr3) {
  const chartDom = document.getElementById('section-chart')
  if (!chartDom) return
  chart = echarts.init(chartDom)

  const name = []
  const data = []
  arr3.forEach((k) => {
    name.push(k[3].toFixed(2))
    data.push(k[2])
  })

  const option = {
    title: {
      text: '高程剖面图',
      left: 'center',
      textStyle: { fontSize: 14, fontWeight: 'normal' },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const p = params[0]
        return `距离: ${p.name} km<br/>高程: ${p.value} m`
      },
    },
    grid: { left: 50, right: 20, top: 40, bottom: 40 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: name,
      name: '距离 (km)',
      nameLocation: 'center',
      nameGap: 25,
      axisLabel: { fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      name: '高程 (m)',
      nameLocation: 'center',
      nameGap: 35,
      axisLabel: { fontSize: 10 },
    },
    series: [
      {
        data: data,
        type: 'line',
        smooth: true,
        areaStyle: { color: 'rgba(52, 152, 219, 0.3)' },
        lineStyle: { color: 'rgba(52, 152, 219, 0.8)', width: 2 },
        symbol: 'none',
      }
    ]
  }

  chart.setOption(option)
}

/**
 * 在地图上标注剖面线的起点和终点，并绘制红色贴地剖面线
 *
 * 【实体说明】
 * - 起点：红点标记 + "起点" 标签
 * - 终点：红点标记 + "终点" 标签
 * - 剖面线：红色贴地直线
 *
 * 【高度参考】
 * 所有实体使用 CLAMP_TO_GROUND 使标签和点标记贴于地表，
 * disableDepthTestDistance: Infinity 确保标注始终在最上层
 *
 * @param {Array} points - 剖面线的坐标点数组，格式为 [[lon, lat], [lon, lat], ...]
 */
function initLabel(points) {
  const startPoint = points[0]
  const endPoint = points[points.length - 1]

  viewer.entities.add({
    name: '起点',
    position: Cesium.Cartesian3.fromDegrees(startPoint[0], startPoint[1]),
    point: {
      pixelSize: 8,
      color: Cesium.Color.RED,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: '起点',
      font: '14pt 微软雅黑',
      fillColor: Cesium.Color.RED,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      pixelOffset: new Cesium.Cartesian2(0, -15),
    }
  })

  viewer.entities.add({
    name: '终点',
    position: Cesium.Cartesian3.fromDegrees(endPoint[0], endPoint[1]),
    point: {
      pixelSize: 8,
      color: Cesium.Color.RED,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: '终点',
      font: '14pt 微软雅黑',
      fillColor: Cesium.Color.RED,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      pixelOffset: new Cesium.Cartesian2(0, -15),
    }
  })

  const polylineCoords = []
  points.forEach(point => {
    polylineCoords.push(point[0], point[1])
  })

  viewer.entities.add({
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray(polylineCoords),
      width: 3,
      material: Cesium.Color.RED,
      clampToGround: true,
    }
  })
}

/**
 * 销毁 Cesium Viewer 和 ECharts 实例
 * 组件卸载时调用，防止内存泄漏
 */
const destroyCesium = () => {
  if (chart) {
    chart.dispose()
    chart = null
  }
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
    viewer = null
  }
  isReady.value = false
  console.log('Cesium 销毁完成')
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
    <div id="section-chart" class="section-chart"></div>
    <div v-if="!isReady" class="loading-overlay">加载中...</div>
  </div>
</template>

<style scoped>
.section-chart {
  position: absolute;
  bottom: 10px;
  left: 10px;
  width: calc(100% - 20px);
  height: 200px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
}
</style>