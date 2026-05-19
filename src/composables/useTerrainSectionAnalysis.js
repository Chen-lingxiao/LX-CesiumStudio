import * as Cesium from 'cesium'
import * as echarts from 'echarts'

/**
 * 地形剖面分析 Composable
 *
 * 【功能说明】
 * 接收一条折线坐标，沿线进行地形高程采样，并渲染 ECharts 高程剖面图
 *
 * 【使用方式】
 * const { analyzeSection, clearSection, destroyAnalysis } = useTerrainSectionAnalysis(getViewer, 'section-chart')
 *
 * // 用户绘制完成后
 * const result = await drawLine()
 * if (result) {
 *   analyzeSection(result.lnglats)
 * }
 */
export function useTerrainSectionAnalysis(getViewer, chartContainerId = 'section-chart') {
  let chart = null
  const sectionEntityIds = []

  /**
   * 使用 Haversine 公式计算球面上两点间的大圆距离
   */
  const haversineDistance = (lon1, lat1, lon2, lat2) => {
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
   * 沿折线进行地形剖面采样
   *
   * 【采样算法】
   * 1. 遍历折线每两个相邻控制点
   * 2. 在每段上进行 n 等分线性插值
   * 3. 对每个插值点通过 globe.getHeight 获取地形高度
   * 4. 使用 Haversine 公式累加计算累计距离
   *
   * @param {Array} lnglats - 折线坐标数组 [[lon, lat], ...]
   * @param {Object} options - 配置项
   * @param {number} options.samplePoints - 每段采样点数，默认 100
   * @returns {Array} 采样数据 [lon, lat, height, cumulativeDistance]
   */
  const sampleTerrain = (lnglats, options = {}) => {
    const viewer = getViewer()
    if (!viewer || !lnglats || lnglats.length < 2) return []

    const { samplePoints = 100 } = options
    const sampledCoords = []
    const result = []
    let cumulativeDistance = 0

    lnglats.forEach((point, index) => {
      if (index < lnglats.length - 1) {
        const [startLon, startLat] = lnglats[index]
        const [endLon, endLat] = lnglats[index + 1]

        for (let i = 0; i < samplePoints; ++i) {
          const offset = i / (samplePoints - 1)
          const lon = Cesium.Math.lerp(startLon, endLon, offset)
          const lat = Cesium.Math.lerp(startLat, endLat, offset)

          const cartographic = Cesium.Cartographic.fromDegrees(lon, lat)
          const height = viewer.scene.globe.getHeight(cartographic)

          sampledCoords.push([lon, lat])

          if (sampledCoords.length > 1) {
            const prev = sampledCoords[sampledCoords.length - 2]
            cumulativeDistance += haversineDistance(prev[0], prev[1], lon, lat)
          }

          result.push([lon, lat, height, cumulativeDistance])
        }
      }
    })

    return result
  }

  /**
   * 在地图上标注剖面线的起点和终点
   *
   * @param {Array} lnglats - 折线坐标数组
   * @returns {Array} 添加的实体 ID 数组
   */
  const addSectionMarkers = (lnglats) => {
    const viewer = getViewer()
    if (!viewer || !lnglats || lnglats.length < 2) return []

    const entityIds = []
    const start = lnglats[0]
    const end = lnglats[lnglats.length - 1]

    const startEntity = viewer.entities.add({
      name: '剖面起点',
      position: Cesium.Cartesian3.fromDegrees(start[0], start[1]),
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
    entityIds.push(startEntity.id)

    const endEntity = viewer.entities.add({
      name: '剖面终点',
      position: Cesium.Cartesian3.fromDegrees(end[0], end[1]),
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
    entityIds.push(endEntity.id)

    return entityIds
  }

  /**
   * 使用 ECharts 渲染高程剖面图
   *
   * @param {Array} sampledData - 采样数据 [lon, lat, height, cumulativeDistance]
   */
  const renderChart = (sampledData) => {
    const chartDom = document.getElementById(chartContainerId)
    if (!chartDom) return

    if (chart) {
      chart.dispose()
      chart = null
    }

    chart = echarts.init(chartDom)

    const xData = []
    const yData = []
    sampledData.forEach((item) => {
      xData.push(item[3].toFixed(2))
      yData.push(item[2])
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
        data: xData,
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
          data: yData,
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
   * 执行剖面分析（完整流程）
   *
   * 1. 清空之前的分析结果（图例和图表）
   * 2. 沿折线采样地形高度
   * 3. 在地图上标注起点和终点
   * 4. 渲染 ECharts 高程剖面图
   *
   * @param {Array} lnglats - 折线坐标数组 [[lon, lat], ...]
   * @param {Object} options - 配置项
   * @param {number} options.samplePoints - 每段采样点数，默认 100
   * @param {boolean} options.showMarkers - 是否在地图上标注起点终点，默认 true
   */
  const analyzeSection = (lnglats, options = {}) => {
    const { samplePoints = 100, showMarkers = true } = options

    clearSection()

    const sampledData = sampleTerrain(lnglats, { samplePoints })
    if (sampledData.length === 0) return

    console.log('剖面采样数据：', sampledData)

    if (showMarkers) {
      const markerIds = addSectionMarkers(lnglats)
      sectionEntityIds.push(...markerIds)
    }

    renderChart(sampledData)
  }

  /**
   * 清空剖面分析结果
   * 移除地图上的剖面标记实体和图表
   */
  const clearSection = () => {
    const viewer = getViewer()
    if (viewer) {
      sectionEntityIds.forEach((id) => viewer.entities.removeById(id))
      sectionEntityIds.length = 0
    }

    if (chart) {
      chart.dispose()
      chart = null
    }
  }

  /**
   * 销毁剖面分析
   * 清空所有资源，组件卸载时调用
   */
  const destroyAnalysis = () => {
    clearSection()
  }

  return {
    analyzeSection,
    clearSection,
    destroyAnalysis,
  }
}