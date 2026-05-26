/**
 * @file useMeasureVolume.js - Cesium 方量分析 Composable
 * @description 基于 Cesium 的方量分析实现，用于计算挖方量和填方量
 * @category 分析工具
 * 
 * 【使用说明】
 * 
 * 1. 基础用法
 * ```javascript
 * import { useMeasureVolume } from '@/composables/useMeasureVolume'
 * 
 * // 创建分析器
 * const { calculateVolume, visualize, clearVisuals, destroyAnalysis } = useMeasureVolume(getViewer)
 * 
 * // 准备多边形数据（经纬度数组，格式：[[lon, lat], [lon, lat], ...]）
 * const polygonData = [
 *   [116.15, 40.01],
 *   [116.151, 40.01],
 *   [116.151, 40.011],
 *   [116.15, 40.011]
 * ]
 * 
 * // 计算方量
 * calculateVolume({
 *   polygon: polygonData,
 *   planeHeight: 50,      // 基准面高度（米）
 *   wallMinHeight: 0,     // 墙体最小高度（米）
 *   wallMaxHeight: 100    // 墙体最大高度（米）
 * }, (result) => {
 *   console.log('挖方量:', result.cutVolume)
 *   console.log('填方量:', result.fillVolume)
 *   console.log('面积:', result.area)
 * })
 * 
 * // 可视化分析结果（可选）
 * visualize({
 *   polygonColor: Cesium.Color.CHARTREUSE.withAlpha(0.5),
 *   wallColor: Cesium.Color.CYAN.withAlpha(0.7),
 *   showLabel: true
 * })
 * ```
 * 
 * 【核心概念】
 * - 挖方量 (Cut Volume): 高于基准面的土方量（需要挖除）
 * - 填方量 (Fill Volume): 低于基准面的土方量（需要填充）
 * - 基准面 (Plane Height): 计算方量的参考高度平面
 * 
 * 【技术要点】
 * 1. 使用自定义几何函数进行地理空间计算（面积、网格生成、点在多边形测试）
 * 2. 通过 Cesium 地形服务获取高程数据
 * 3. 采用网格法离散计算区域内的方量
 * 4. 纯数据处理工具，不包含绘制逻辑
 * 
 * 【依赖库】
 * - Cesium.js: 三维地球可视化和地形高程采样
 * 
 * 【核心算法】
 * - 多边形面积计算：球面 Shoelace 公式
 * - 点在多边形测试：射线法 (Ray-casting algorithm)
 * - 网格生成：基于经纬度的均匀采样
 */

import * as Cesium from 'cesium'

/**
 * @function useMeasureVolume
 * @description 方量分析 Composable，接收 getViewer 函数，返回分析方法
 * @category 分析
 * @param {Function} getViewer - 获取 Cesium.Viewer 实例的函数
 * @param {Object} options - 配置选项
 * @param {number} [options.terrainLevel=13] - 地形查询级别
 * @returns {Object} 分析方法 { calculateVolume, visualize, clearVisuals, destroyAnalysis }
 */
export function useMeasureVolume(getViewer, options = {}) {
  // 状态变量（替代类实例属性）
  let planeHeight = 0
  let minHeight = 0
  let maxHeight = 0
  let area = 0
  let cellsize = 0
  let centroid = null
  let Cartesian2Array = []
  let data = []
  
  // 可视化实体
  let polygon = null
  let wall = null
  let label = null
  let floatingPointLis = []
  
  /**
   * @function calculateVolume
   * @description 计算指定多边形区域的方量
   * @param {Object} params - 参数对象
   * @param {Array} params.polygon - 多边形顶点数组，格式：[[lon, lat], [lon, lat], ...]
   * @param {number} params.planeHeight - 基准面高度（米）
   * @param {number} params.wallMinHeight - 墙体最小高度（米）
   * @param {number} params.wallMaxHeight - 墙体最大高度（米）
   * @param {Function} callback - 回调函数，返回计算结果
   */
  const calculateVolume = (params, callback) => {
    const viewer = getViewer()
    
    // 参数验证
    if (!params.polygon || params.polygon.length < 3) {
      console.error('多边形数据无效，至少需要3个顶点')
      return
    }
    
    // 设置参数
    planeHeight = params.planeHeight || 0
    minHeight = params.wallMinHeight || 0
    maxHeight = params.wallMaxHeight || 100
    
    // 复制多边形数据并闭合
    Cartesian2Array = params.polygon.map(point => [...point])
    Cartesian2Array.push([...params.polygon[0]])
    
    // 计算面积（使用 shoelace 公式）
    area = calculatePolygonArea(Cartesian2Array)
    console.log('计算面积:', area, '平方米')
    
    // 计算网格间距（确保至少有一个合理的间距）
    cellsize = Math.sqrt(area / 100) || 10
    if (cellsize < 1) cellsize = 1
    if (cellsize > 50) cellsize = 50
    console.log('网格间距:', cellsize, '米')
    
    // 计算中心点
    centroid = calculateCentroid(Cartesian2Array)
    console.log('中心点:', centroid)
    
    // 生成采样网格
    let bbox = calculateBBox(Cartesian2Array)
    console.log('边界框:', bbox)
    
    // 生成网格点
    let gridPoints = generateGridPoints(bbox, cellsize)
    console.log('生成网格点数:', gridPoints.length)
    
    // 过滤多边形内的点
    let ptsWithin = filterPointsInPolygon(gridPoints, Cartesian2Array)
    console.log('多边形内的点数:', ptsWithin.length)
    
    // 获取地形高程数据并计算方量
    const cartographicPositions = ptsWithin.map(point => 
      Cesium.Cartographic.fromDegrees(point.lon, point.lat)
    )
    
    Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, cartographicPositions)
      .then((updatedPositions) => {
        // 转换为 { lon, lat, height } 格式
        data = updatedPositions.map((pos, index) => ({
          lon: ptsWithin[index].lon,
          lat: ptsWithin[index].lat,
          height: pos.height || 0
        }))
        console.log('高程数据点数:', data.length)
        
        // 计算最小和最大高程
        let heights = data.map(d => d.height)
        let actualMinHeight = heights.length > 0 ? Math.min(...heights) : 0
        let actualMaxHeight = heights.length > 0 ? Math.max(...heights) : 100
        
        // 如果未指定墙体高度，使用实际地形高度
        if (params.wallMinHeight === undefined) {
          minHeight = actualMinHeight
        }
        if (params.wallMaxHeight === undefined) {
          maxHeight = actualMaxHeight
        }
        
        // 计算方量
        let result = calculateBulk()
        
        // 返回结果
        callback({
          cutVolume: result.cutVolume,
          fillVolume: result.fillVolume,
          area: area,
          minHeight: actualMinHeight,
          maxHeight: actualMaxHeight,
          planeHeight: planeHeight,
          wallMinHeight: minHeight,
          wallMaxHeight: maxHeight
        })
      })
      .catch((error) => {
        console.error('获取地形数据失败:', error)
        callback({
          cutVolume: 0,
          fillVolume: 0,
          area: area,
          minHeight: 0,
          maxHeight: 100,
          planeHeight: planeHeight,
          wallMinHeight: minHeight,
          wallMaxHeight: maxHeight
        })
      })
  }
  
  /**
   * @function calculateBulk
   * @description 计算挖方量和填方量
   * @returns {Object} 计算结果 { cutVolume, fillVolume }
   * @private
   */
  const calculateBulk = () => {
    let cutVolume = 0
    let fillVolume = 0
    let cellArea = cellsize * cellsize
    
    // 计算挖方和填方
    for (let i = 0; i < data.length; i++) {
      let height = data[i]['height']
      
      if (height > planeHeight) {
        // 高于基准面：挖方
        cutVolume += (height - planeHeight) * cellArea
      } else {
        // 低于基准面：填方
        fillVolume += (planeHeight - height) * cellArea
      }
    }
    
    return {
      cutVolume: cutVolume,
      fillVolume: fillVolume
    }
  }
  
  /**
   * @function visualize
   * @description 可视化分析结果（多边形、墙体、标签）
   * @param {Object} options - 可视化选项
   */
  const visualize = (visualOptions = {}) => {
    const viewer = getViewer()
    
    // 清除之前的可视化
    clearVisuals()
    
    // 创建墙体可视化
    let Cartesian3Array = []
    Cartesian2Array.forEach(element => {
      Cartesian3Array.push(element[0])
      Cartesian3Array.push(element[1])
      Cartesian3Array.push(0)
    })
    
    let minimumHeights = []
    let maximumHeights = []
    for (let i = 0; i < Cartesian2Array.length; i++) {
      minimumHeights.push(minHeight)
      maximumHeights.push(maxHeight)
    }
    
    wall = viewer.entities.add({
      wall: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights(Cartesian3Array),
        minimumHeights: minimumHeights,
        maximumHeights: maximumHeights,
        outline: true,
        outlineColor: Cesium.Color.WHITE.withAlpha(0.7),
        material: visualOptions.wallColor || Cesium.Color.CYAN.withAlpha(0.7)
      }
    })
    
    // 创建基准面多边形
    polygon = viewer.entities.add({
      polygon: {
        show: true,
        hierarchy: new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArrayHeights(Cartesian3Array)
        ),
        height: planeHeight,
        material: visualOptions.polygonColor || Cesium.Color.CHARTREUSE.withAlpha(0.5)
      }
    })
    
    // 添加结果标签
    if (visualOptions.showLabel !== false && centroid) {
      let result = calculateBulk()
      let cutVolumeText = formatVolume(result.cutVolume)
      let fillVolumeText = formatVolume(result.fillVolume)
      let areaText = formatArea(area)
      
      label = viewer.entities.add({
        name: '方量结果',
        position: Cesium.Cartesian3.fromDegrees(
          centroid.lon,
          centroid.lat,
          maxHeight
        ),
        label: {
          text: '挖方体积：' + cutVolumeText + '\n' + 
                '填方体积：' + fillVolumeText + '\n' + 
                '横切面积：' + areaText,
          font: '18px sans-serif',
          showBackground: true,
          fillColor: Cesium.Color.WHITE,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          pixelOffset: new Cesium.Cartesian2(0.0, -80)
        }
      })
    }
  }
  
  /**
   * @function clearVisuals
   * @description 清除所有可视化内容
   */
  const clearVisuals = () => {
    const viewer = getViewer()
    
    if (floatingPointLis.length > 0) {
      floatingPointLis.forEach(element => {
        viewer.entities.remove(element)
      })
      floatingPointLis = []
    }
    if (Cesium.defined(wall)) {
      viewer.entities.remove(wall)
      wall = null
    }
    if (Cesium.defined(polygon)) {
      viewer.entities.remove(polygon)
      polygon = null
    }
    if (Cesium.defined(label)) {
      viewer.entities.remove(label)
      label = null
    }
  }
  
  /**
   * @function destroyAnalysis
   * @description 销毁分析器，释放资源
   */
  const destroyAnalysis = () => {
    clearVisuals()
  }
  
  return {
    calculateVolume,
    visualize,
    clearVisuals,
    destroyAnalysis
  }
}

// ==================== 工具函数 ====================

/**
 * @function calculatePolygonArea
 * @description 使用 shoelace 公式计算多边形面积（平方米）
 * @param {Array} polygon - 多边形顶点数组 [[lon, lat], ...]
 * @returns {number} 面积（平方米）
 */
function calculatePolygonArea(polygon) {
  if (polygon.length < 3) return 0
  
  let area = 0
  const R = 6371000 // 地球半径（米）
  
  for (let i = 0; i < polygon.length - 1; i++) {
    const lat1 = polygon[i][1] * Math.PI / 180
    const lon1 = polygon[i][0] * Math.PI / 180
    const lat2 = polygon[i + 1][1] * Math.PI / 180
    const lon2 = polygon[i + 1][0] * Math.PI / 180
    
    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2))
  }
  
  area = Math.abs(area) * R * R / 2
  return area
}

/**
 * @function calculateCentroid
 * @description 计算多边形中心点
 * @param {Array} polygon - 多边形顶点数组 [[lon, lat], ...]
 * @returns {Object} 中心点 { lon, lat }
 */
function calculateCentroid(polygon) {
  if (polygon.length < 3) return { lon: 0, lat: 0 }
  
  let lonSum = 0
  let latSum = 0
  
  for (let i = 0; i < polygon.length - 1; i++) {
    lonSum += polygon[i][0]
    latSum += polygon[i][1]
  }
  
  const n = polygon.length - 1
  return {
    lon: lonSum / n,
    lat: latSum / n
  }
}

/**
 * @function calculateBBox
 * @description 计算多边形边界框
 * @param {Array} polygon - 多边形顶点数组 [[lon, lat], ...]
 * @returns {Array} [minLon, minLat, maxLon, maxLat]
 */
function calculateBBox(polygon) {
  if (polygon.length < 2) return [0, 0, 0, 0]
  
  let minLon = Infinity, minLat = Infinity
  let maxLon = -Infinity, maxLat = -Infinity
  
  for (let i = 0; i < polygon.length; i++) {
    const lon = polygon[i][0]
    const lat = polygon[i][1]
    
    if (lon < minLon) minLon = lon
    if (lon > maxLon) maxLon = lon
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  
  return [minLon, minLat, maxLon, maxLat]
}

/**
 * @function generateGridPoints
 * @description 生成网格点
 * @param {Array} bbox - 边界框 [minLon, minLat, maxLon, maxLat]
 * @param {number} cellSize - 网格间距（米）
 * @returns {Array} 网格点数组 [{ lon, lat }, ...]
 */
function generateGridPoints(bbox, cellSize) {
  const [minLon, minLat, maxLon, maxLat] = bbox
  
  // 将米转换为经纬度差
  const metersPerDegreeLat = 111132.92 // 纬度方向每度约 111km
  const metersPerDegreeLon = 111320 * Math.cos(minLat * Math.PI / 180) // 经度方向随纬度变化
  
  const stepLon = cellSize / metersPerDegreeLon
  const stepLat = cellSize / metersPerDegreeLat
  
  const points = []
  
  for (let lon = minLon; lon <= maxLon; lon += stepLon) {
    for (let lat = minLat; lat <= maxLat; lat += stepLat) {
      points.push({ lon, lat })
    }
  }
  
  return points
}

/**
 * @function filterPointsInPolygon
 * @description 过滤多边形内的点
 * @param {Array} points - 点数组 [{ lon, lat }, ...]
 * @param {Array} polygon - 多边形顶点数组 [[lon, lat], ...]
 * @returns {Array} 多边形内的点数组
 */
function filterPointsInPolygon(points, polygon) {
  return points.filter(point => isPointInPolygon(point, polygon))
}

/**
 * @function isPointInPolygon
 * @description 判断点是否在多边形内（射线法）
 * @param {Object} point - 点 { lon, lat }
 * @param {Array} polygon - 多边形顶点数组 [[lon, lat], ...]
 * @returns {boolean}
 */
function isPointInPolygon(point, polygon) {
  let inside = false
  const x = point.lon
  const y = point.lat
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1]
    const xj = polygon[j][0], yj = polygon[j][1]
    
    if (((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  
  return inside
}

/**
 * @function formatVolume
 * @description 格式化体积显示
 * @param {number} volume - 体积值（立方米）
 * @returns {string} 格式化后的字符串
 */
function formatVolume(volume) {
  if (volume < 1000) {
    return volume.toFixed(2) + ' m³'
  } else if (volume < 1000000) {
    return (volume / 1000).toFixed(2) + ' 千 m³'
  } else {
    return (volume / 1000000).toFixed(2) + ' 万 m³'
  }
}

/**
 * @function formatArea
 * @description 格式化面积显示
 * @param {number} area - 面积值（平方米）
 * @returns {string} 格式化后的字符串
 */
function formatArea(area) {
  if (area < 10000) {
    return area.toFixed(2) + ' m²'
  } else {
    return (area / 10000).toFixed(2) + ' 亩'
  }
}