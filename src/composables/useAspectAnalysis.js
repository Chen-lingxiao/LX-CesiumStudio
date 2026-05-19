import * as Cesium from 'cesium'

/**
 * 坡向分析 Composable
 *
 * 【功能说明】
 * 对指定区域进行坡向分析，使用8邻域算法计算每个网格点的坡向，
 * 并在地图上渲染坡向可视化结果
 *
 * 【使用方式】
 * const { analyzeAspect, clearAspect, destroyAnalysis } = useAspectAnalysis(getViewer)
 *
 * // 绘制区域后进行坡向分析
 * const result = await drawPolygon()
 * if (result) {
 *   await analyzeAspect(result.boundingBox, precision)
 * }
 */
export function useAspectAnalysis(getViewer) {
  let aspectPolygon = null

  /**
   * 创建坡向可视化Canvas
   * @param {Array} aspectData - 坡向数据数组
   * @param {Number} width - 网格宽度
   * @param {Number} height - 网格高度
   * @returns {HTMLCanvasElement}
   */
  const createAspectCanvas = (aspectData, width, height) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    const imgData = new Uint8ClampedArray(width * height * 4)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const aspect = aspectData[y * width + x] ?? 0

        let color
        if (aspect >= 337.5 || aspect < 22.5) color = [0, 150, 255, 180]
        else if (aspect < 67.5) color = [0, 255, 0, 180]
        else if (aspect < 112.5) color = [0, 255, 255, 180]
        else if (aspect < 157.5) color = [255, 255, 0, 180]
        else if (aspect < 202.5) color = [255, 150, 0, 180]
        else if (aspect < 247.5) color = [255, 0, 0, 180]
        else if (aspect < 292.5) color = [255, 0, 255, 180]
        else color = [150, 0, 255, 180]

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
   * 坡向分析主函数
   * @param {Array} extent - 分析范围 [minLon, minLat, maxLon, maxLat]
   * @param {Number} precision - 采样精度（度，值越小精度越高），默认0.0005度≈55米
   * @param {Array} polygonPositions - 用户绘制的多边形坐标（可选）
   * @returns {Promise<Object>} - 返回坡向数据和可视化实体
   */
  const analyzeAspect = async (extent, precision = 0.0005, polygonPositions = null) => {
    const viewer = getViewer()
    if (!viewer) {
      throw new Error('Cesium viewer 未初始化')
    }

    if (!extent || extent.length !== 4) {
      throw new Error('无效的extent参数，应为[minLon, minLat, maxLon, maxLat]')
    }

    if (aspectPolygon) {
      viewer.entities.remove(aspectPolygon)
      aspectPolygon = null
    }

    const [minLon, minLat, maxLon, maxLat] = extent
    const rectangle = Cesium.Rectangle.fromDegrees(minLon, minLat, maxLon, maxLat)

    const gridWidth = Math.ceil((maxLon - minLon) / precision)
    const gridHeight = Math.ceil((maxLat - minLat) / precision)

    if (gridWidth < 2 || gridHeight < 2) {
      throw new Error('分析区域太小，无法进行坡向分析')
    }

    const positions = []
    const halfPrecision = precision / 2

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const lon = Cesium.Math.toDegrees(Cesium.Math.lerp(rectangle.west, rectangle.east, x / (gridWidth - 1)))
        const lat = Cesium.Math.toDegrees(Cesium.Math.lerp(rectangle.north, rectangle.south, y / (gridHeight - 1)))

        positions.push(Cesium.Cartographic.fromDegrees(lon, lat))
        positions.push(Cesium.Cartographic.fromDegrees(lon - halfPrecision, lat))
        positions.push(Cesium.Cartographic.fromDegrees(lon + halfPrecision, lat))
        positions.push(Cesium.Cartographic.fromDegrees(lon, lat - halfPrecision))
        positions.push(Cesium.Cartographic.fromDegrees(lon, lat + halfPrecision))
        positions.push(Cesium.Cartographic.fromDegrees(lon - halfPrecision, lat - halfPrecision))
        positions.push(Cesium.Cartographic.fromDegrees(lon + halfPrecision, lat - halfPrecision))
        positions.push(Cesium.Cartographic.fromDegrees(lon - halfPrecision, lat + halfPrecision))
        positions.push(Cesium.Cartographic.fromDegrees(lon + halfPrecision, lat + halfPrecision))
      }
    }

    const updatedPositions = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, positions)

    const aspectData = []
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const baseIndex = (y * gridWidth + x) * 9
        const center = updatedPositions[baseIndex]

        if (center.height === undefined) {
          aspectData.push(0)
          continue
        }

        const west = updatedPositions[baseIndex + 1]
        const east = updatedPositions[baseIndex + 2]
        const south = updatedPositions[baseIndex + 3]
        const north = updatedPositions[baseIndex + 4]
        const southwest = updatedPositions[baseIndex + 5]
        const southeast = updatedPositions[baseIndex + 6]
        const northwest = updatedPositions[baseIndex + 7]
        const northeast = updatedPositions[baseIndex + 8]

        let maxHeightDiff = 0
        let maxDx = 0
        let maxDy = 0

        const neighbors = [
          { pos: west, dx: -1, dy: 0, dist: 1 },
          { pos: east, dx: 1, dy: 0, dist: 1 },
          { pos: south, dx: 0, dy: -1, dist: 1 },
          { pos: north, dx: 0, dy: 1, dist: 1 },
          { pos: southwest, dx: -1, dy: -1, dist: Math.SQRT2 },
          { pos: southeast, dx: 1, dy: -1, dist: Math.SQRT2 },
          { pos: northwest, dx: -1, dy: 1, dist: Math.SQRT2 },
          { pos: northeast, dx: 1, dy: 1, dist: Math.SQRT2 }
        ]

        for (const neighbor of neighbors) {
          if (neighbor.pos.height === undefined) continue

          const heightDiff = neighbor.pos.height - center.height
          const normalizedDiff = heightDiff / neighbor.dist
          if (Math.abs(normalizedDiff) > Math.abs(maxHeightDiff)) {
            maxHeightDiff = normalizedDiff
            maxDx = neighbor.dx
            maxDy = neighbor.dy
          }
        }

        if (maxHeightDiff === 0) {
          aspectData.push(0)
          continue
        }

        let aspect = 0
        if (maxHeightDiff > 0) {
          if (maxDx > 0 && maxDy > 0) aspect = 225
          else if (maxDx > 0 && maxDy === 0) aspect = 270
          else if (maxDx > 0 && maxDy < 0) aspect = 315
          else if (maxDx === 0 && maxDy < 0) aspect = 0
          else if (maxDx < 0 && maxDy < 0) aspect = 45
          else if (maxDx < 0 && maxDy === 0) aspect = 90
          else if (maxDx < 0 && maxDy > 0) aspect = 135
          else if (maxDx === 0 && maxDy > 0) aspect = 180
        } else {
          if (maxDx > 0 && maxDy > 0) aspect = 45
          else if (maxDx > 0 && maxDy === 0) aspect = 90
          else if (maxDx > 0 && maxDy < 0) aspect = 135
          else if (maxDx === 0 && maxDy < 0) aspect = 180
          else if (maxDx < 0 && maxDy < 0) aspect = 225
          else if (maxDx < 0 && maxDy === 0) aspect = 270
          else if (maxDx < 0 && maxDy > 0) aspect = 315
          else if (maxDx === 0 && maxDy > 0) aspect = 0
        }

        aspectData.push(aspect)
      }
    }

    const canvas = createAspectCanvas(aspectData, gridWidth, gridHeight)

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

    aspectPolygon = polygon

    return {
      data: aspectData,
      gridSize: { width: gridWidth, height: gridHeight },
      extent: extent,
      precision: precision,
      entity: polygon
    }
  }

  const clearAspect = () => {
    const viewer = getViewer()
    if (!viewer) return
    if (aspectPolygon) {
      viewer.entities.remove(aspectPolygon)
      aspectPolygon = null
    }
  }

  const destroyAnalysis = () => {
    clearAspect()
  }

  return {
    analyzeAspect,
    clearAspect,
    destroyAnalysis
  }
}