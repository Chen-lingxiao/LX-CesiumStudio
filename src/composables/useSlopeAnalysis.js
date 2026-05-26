import * as Cesium from 'cesium'

/**
 * 坡度分析 Composable
 *
 * 【功能说明】
 * 对指定区域进行坡度分析，使用中心差分法计算每个网格点的坡度，
 * 并在地图上渲染坡度可视化结果
 *
 * 【使用方式】
 * const { analyzeSlope, clearSlope, destroyAnalysis } = useSlopeAnalysis(getViewer)
 *
 * // 绘制区域后进行坡度分析
 * const result = await drawPolygon()
 * if (result) {
 *   await analyzeSlope(result.boundingBox, precision, result.positions)
 * }
 */
export function useSlopeAnalysis(getViewer) {
  let slopePolygon = null

  /**
   * 判断点是否在多边形内部（射线法）
   * @param {Number} lon - 点的经度
   * @param {Number} lat - 点的纬度
   * @param {Array} polygonPositions - 多边形顶点坐标数组（Cartesian3格式）
   * @returns {Boolean}
   */
  const isPointInPolygon = (lon, lat, polygonPositions) => {
    if (!polygonPositions || polygonPositions.length < 3) {
      return true
    }

    let inside = false
    const n = polygonPositions.length

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = Cesium.Cartographic.fromCartesian(polygonPositions[i]).longitude
      const yi = Cesium.Cartographic.fromCartesian(polygonPositions[i]).latitude
      const xj = Cesium.Cartographic.fromCartesian(polygonPositions[j]).longitude
      const yj = Cesium.Cartographic.fromCartesian(polygonPositions[j]).latitude

      const pointLat = Cesium.Math.toRadians(lat)
      const pointLon = Cesium.Math.toRadians(lon)

      if (((yi > pointLat) !== (yj > pointLat)) &&
          (pointLon < (xj - xi) * (pointLat - yi) / (yj - yi) + xi)) {
        inside = !inside
      }
    }

    return inside
  }

  /**
   * 创建坡度可视化Canvas
   * @param {Array} slopeData - 坡度数据数组（角度值）
   * @param {Number} width - 网格宽度
   * @param {Number} height - 网格高度
   * @param {Number} minLon - 最小经度
   * @param {Number} minLat - 最小纬度
   * @param {Number} maxLon - 最大经度
   * @param {Number} maxLat - 最大纬度
   * @param {Array} polygonPositions - 用户绘制的多边形顶点（可选）
   * @returns {HTMLCanvasElement}
   */
  const createSlopeCanvas = (slopeData, width, height, minLon, minLat, maxLon, maxLat, polygonPositions = null) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    const imgData = new Uint8ClampedArray(width * height * 4)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4

        const lon = minLon + (maxLon - minLon) * x / (width - 1)
        const lat = maxLat - (maxLat - minLat) * y / (height - 1)

        const isInside = isPointInPolygon(lon, lat, polygonPositions)

        if (!isInside) {
          imgData[idx] = 0
          imgData[idx + 1] = 0
          imgData[idx + 2] = 0
          imgData[idx + 3] = 0
          continue
        }

        const slope = slopeData[y * width + x] ?? 0

        let color
        if (slope < 10) {
          color = [0, 200, 0, 180]
        } else if (slope < 20) {
          color = [100, 200, 50, 180]
        } else if (slope < 30) {
          color = [200, 200, 0, 180]
        } else if (slope < 45) {
          color = [255, 150, 0, 180]
        } else if (slope < 60) {
          color = [255, 80, 0, 180]
        } else {
          color = [200, 0, 0, 180]
        }

        imgData[idx] = color[0]
        imgData[idx + 1] = color[1]
        imgData[idx + 2] = color[2]
        imgData[idx + 3] = color[3]
      }
    }

    ctx.putImageData(new ImageData(imgData, width, height), 0, 0)
    return canvas
  }

  /**
   * 坡度分析主函数
   * @param {Array} extent - 分析范围 [minLon, minLat, maxLon, maxLat]
   * @param {Number} precision - 采样精度（度，值越小精度越高），默认0.0005度≈55米
   * @param {Array} polygonPositions - 用户绘制的多边形坐标（可选）
   * @returns {Promise<Object>} - 返回坡度数据和可视化实体
   */
  const analyzeSlope = async (extent, precision = 0.0005, polygonPositions = null) => {
    const viewer = getViewer()
    if (!viewer) {
      throw new Error('Cesium viewer 未初始化')
    }

    if (!extent || extent.length !== 4) {
      throw new Error('无效的extent参数，应为[minLon, minLat, maxLon, maxLat]')
    }

    if (slopePolygon) {
      viewer.entities.remove(slopePolygon)
      slopePolygon = null
    }

    const [minLon, minLat, maxLon, maxLat] = extent

    const gridWidth = Math.ceil((maxLon - minLon) / precision)
    const gridHeight = Math.ceil((maxLat - minLat) / precision)

    if (gridWidth < 2 || gridHeight < 2) {
      throw new Error('分析区域太小，无法进行坡度分析')
    }

    const ddx = Cesium.Cartesian3.distance(
      Cesium.Cartesian3.fromDegrees(minLon, minLat),
      Cesium.Cartesian3.fromDegrees(maxLon, minLat)
    ) / gridWidth

    const ddy = Cesium.Cartesian3.distance(
      Cesium.Cartesian3.fromDegrees(minLon, minLat),
      Cesium.Cartesian3.fromDegrees(minLon, maxLat)
    ) / gridHeight

    const positions = []
    const halfPrecision = precision / 2

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const lon = Cesium.Math.toDegrees(Cesium.Math.lerp(
          Cesium.Math.toRadians(minLon),
          Cesium.Math.toRadians(maxLon),
          x / (gridWidth - 1)
        ))
        const lat = Cesium.Math.toDegrees(Cesium.Math.lerp(
          Cesium.Math.toRadians(maxLat),
          Cesium.Math.toRadians(minLat),
          y / (gridHeight - 1)
        ))

        positions.push(Cesium.Cartographic.fromDegrees(lon - halfPrecision, lat))
        positions.push(Cesium.Cartographic.fromDegrees(lon - halfPrecision, lat - halfPrecision))
        positions.push(Cesium.Cartographic.fromDegrees(lon, lat + halfPrecision))
        positions.push(Cesium.Cartographic.fromDegrees(lon - halfPrecision, lat + halfPrecision))
        positions.push(Cesium.Cartographic.fromDegrees(lon + halfPrecision, lat))
        positions.push(Cesium.Cartographic.fromDegrees(lon + halfPrecision, lat + halfPrecision))
        positions.push(Cesium.Cartographic.fromDegrees(lon, lat - halfPrecision))
        positions.push(Cesium.Cartographic.fromDegrees(lon + halfPrecision, lat - halfPrecision))
        positions.push(Cesium.Cartographic.fromDegrees(lon, lat))
      }
    }

    const updatedPositions = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, positions)

    const slopeData = []
    for (let i = 0; i < updatedPositions.length; i += 9) {
      const center = updatedPositions[i + 8]

      if (center.height === undefined) {
        slopeData.push(0)
        continue
      }

      const westHeight = updatedPositions[i + 0].height ?? center.height
      const westSouthHeight = updatedPositions[i + 1].height ?? center.height
      const northHeight = updatedPositions[i + 2].height ?? center.height
      const westNorthHeight = updatedPositions[i + 3].height ?? center.height
      const eastHeight = updatedPositions[i + 4].height ?? center.height
      const eastNorthHeight = updatedPositions[i + 5].height ?? center.height
      const southHeight = updatedPositions[i + 6].height ?? center.height
      const eastSouthHeight = updatedPositions[i + 7].height ?? center.height

      const fx = (westSouthHeight + 2 * southHeight + eastSouthHeight - westNorthHeight - 2 * northHeight - eastNorthHeight) / (8 * ddx)
      const fy = (eastNorthHeight + 2 * eastHeight + eastSouthHeight - westNorthHeight - 2 * westHeight - westSouthHeight) / (8 * ddy)

      const slope = Math.atan(Math.sqrt(fx * fx + fy * fy)) * (180 / Math.PI)
      slopeData.push(Math.min(slope, 90))
    }

    const canvas = createSlopeCanvas(slopeData, gridWidth, gridHeight, minLon, minLat, maxLon, maxLat, polygonPositions)

    let polygonHierarchy
    if (polygonPositions) {
      polygonHierarchy = new Cesium.PolygonHierarchy(polygonPositions)
    } else {
      polygonHierarchy = new Cesium.PolygonHierarchy([
        Cesium.Cartesian3.fromDegrees(minLon, minLat),
        Cesium.Cartesian3.fromDegrees(minLon, maxLat),
        Cesium.Cartesian3.fromDegrees(maxLon, maxLat),
        Cesium.Cartesian3.fromDegrees(maxLon, minLat),
      ])
    }

    const polygon = viewer.entities.add({
      polygon: {
        hierarchy: polygonHierarchy,
        material: new Cesium.ImageMaterialProperty({
          image: canvas,
          transparent: true
        }),
        classificationType: Cesium.ClassificationType.TERRAIN
      }
    })

    slopePolygon = polygon

    return {
      data: slopeData,
      gridSize: { width: gridWidth, height: gridHeight },
      extent: extent,
      precision: precision,
      entity: polygon
    }
  }

  const clearSlope = () => {
    const viewer = getViewer()
    if (!viewer) return
    if (slopePolygon) {
      viewer.entities.remove(slopePolygon)
      slopePolygon = null
    }
  }

  const destroyAnalysis = () => {
    clearSlope()
  }

  return {
    analyzeSlope,
    clearSlope,
    destroyAnalysis
  }
}
