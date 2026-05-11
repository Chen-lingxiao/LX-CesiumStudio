import * as Cesium from 'cesium'

/**
 * Cesium 图形绘制 Hook
 * @description 支持绘制线、多边形、矩形，并返回标准化的绘制结果
 * @param {Function} getViewer - 获取 Cesium Viewer 实例的函数
 * @returns {Object} 包含 drawLine、drawPolygon、drawRectangle、clearDrawings、cancelCurrentDrawing、destroyDraw 的 Hook 对象
 *
 * @example
 * const { getViewer, initmap } = useCesium('cesiumContainer')
 * const { drawLine, clearDrawings } = useCesiumDraw(getViewer)
 *
 * onMounted(async () => {
 *   await initmap()
 *   const result = await drawLine()
 *   if (result) {
 *     console.log('绘制结果:', result.wkt)
 *   }
 * })
 */
export function useCesiumDraw(getViewer) {
  /** 屏幕空间事件处理器 */
  let handler = null
  /** 当前绘制形状的顶点数组 */
  let activeShapePoints = []
  /** 动态预览的形状实体 */
  let activeShape = null
  /** 跟随鼠标移动的浮动点 */
  let floatingPoint = null
  /** 当前绘制模式 */
  let drawingMode = 'none'
  /** Promise 解析函数，用于返回绘制结果 */
  let drawPromiseResolve = null

  /** 已绘制完成的实体 ID 集合 */
  const drawnEntities = new Set()
  /** 临时顶点实体 ID 集合 */
  const tempPointEntities = new Set()

  /**
   * 坐标拾取
   * @description 优先拾取地形表面坐标，其次拾取椭球体表面坐标
   * @param {Cesium.Cartesian2} position - 屏幕坐标
   * @param {Cesium.Viewer} viewer - Cesium Viewer 实例
   * @returns {Cesium.Cartesian3|null} 拾取到的笛卡尔坐标或 null
   */
  const getPickedPosition = (position, viewer) => {
    const ray = viewer.scene.camera.getPickRay(position)
    if (!ray) return null
    return viewer.scene.globe.pick(ray, viewer.scene)
      || viewer.scene.camera.pickEllipsoid(position, viewer.scene.globe.ellipsoid)
  }

  /**
   * 处理绘制结果
   * @description 将笛卡尔坐标转换为经纬度、WKT 格式和四至范围
   * @param {Cesium.Cartesian3[]} positions - 笛卡尔坐标数组
   * @param {string} mode - 绘制类型 ('point' | 'line' | 'polygon' | 'rectangle')
   * @returns {Object|null} 标准化的绘制结果或 null
   */
  const processDrawResult = (positions, mode) => {
    const viewer = getViewer()
    if (!viewer) return null

    let minX = 180, maxX = -180, minY = 90, maxY = -90

    const lnglats = positions.map((p) => {
      const cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(p)
      const lon = Number(Cesium.Math.toDegrees(cartographic.longitude).toFixed(8))
      const lat = Number(Cesium.Math.toDegrees(cartographic.latitude).toFixed(8))
      return [lon, lat]
    })

    let wkt = ''

    if (mode === 'point' && lnglats.length >= 1) {
      const [lon, lat] = lnglats[0]
      minX = maxX = lon
      minY = maxY = lat
      wkt = `POINT (${lon} ${lat})`
    } else if (mode === 'rectangle' && lnglats.length >= 2) {
      const [first, second] = [lnglats[0], lnglats[1]]
      minX = Math.min(first[0], second[0]); maxX = Math.max(first[0], second[0])
      minY = Math.min(first[1], second[1]); maxY = Math.max(first[1], second[1])
      wkt = `POLYGON ((${minX} ${maxY}, ${maxX} ${maxY}, ${maxX} ${minY}, ${minX} ${minY}, ${minX} ${maxY}))`
    } else {
      lnglats.forEach(p => {
        minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0])
        minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1])
      })
      if (mode === 'line') {
        wkt = `LINESTRING (${lnglats.map(p => p.join(' ')).join(', ')})`
      } else if (mode === 'polygon') {
        const closedLnglats = [...lnglats, lnglats[0]]
        wkt = `POLYGON ((${closedLnglats.map(p => p.join(' ')).join(', ')}))`
      }
    }

    return { type: mode, positions, lnglats, wkt, boundingBox: { west: minX, south: minY, east: maxX, north: maxY } }
  }

  /**
   * 开始绘制
   * @description 初始化绘制流程，注册鼠标事件监听
   * @param {string} mode - 绘制模式 ('line' | 'polygon' | 'rectangle')
   * @returns {Promise} Promise，解析为绘制结果或 null
   */
  const startDrawing = (mode) => {
    return new Promise((resolve) => {
      const viewer = getViewer()
      if (!viewer) { resolve(null); return }

      if (drawingMode !== 'none') terminateShape()

      drawingMode = mode
      drawPromiseResolve = resolve
      viewer.scene.canvas.style.cursor = 'crosshair'

      handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

      handler.setInputAction((event) => {
        const earthPosition = getPickedPosition(event.position, viewer)
        if (!earthPosition) return

        if (activeShapePoints.length === 0) {
          floatingPoint = viewer.entities.add({
            position: earthPosition,
            point: { color: Cesium.Color.WHITE, pixelSize: 6 }
          })
          tempPointEntities.add(floatingPoint.id)
          activeShapePoints.push(earthPosition)

          const dynamicPositions = new Cesium.CallbackProperty(() => {
            if (drawingMode === 'polygon') return new Cesium.PolygonHierarchy(activeShapePoints)
            if (drawingMode === 'rectangle') return activeShapePoints.length < 2
              ? undefined
              : Cesium.Rectangle.fromCartesianArray(activeShapePoints)
            return activeShapePoints
          }, false)

          const shapeConfig = {}
          if (mode === 'line') shapeConfig.polyline = { positions: dynamicPositions, width: 3, material: Cesium.Color.YELLOW, clampToGround: true }
          if (mode === 'polygon') shapeConfig.polygon = { hierarchy: dynamicPositions, material: Cesium.Color.YELLOW.withAlpha(0.4) }
          if (mode === 'rectangle') shapeConfig.rectangle = { coordinates: dynamicPositions, material: Cesium.Color.CYAN.withAlpha(0.4) }

          activeShape = viewer.entities.add(shapeConfig)
        }

        activeShapePoints.push(earthPosition)
        const pt = viewer.entities.add({ position: earthPosition, point: { color: Cesium.Color.WHITE, pixelSize: 6 } })
        tempPointEntities.add(pt.id)

        if (drawingMode === 'rectangle' && activeShapePoints.length === 3) terminateShape()
        viewer.scene.requestRender()
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

      handler.setInputAction((event) => {
        if (!floatingPoint) return
        const newPosition = getPickedPosition(event.endPosition, viewer)
        if (!newPosition) return
        floatingPoint.position = new Cesium.ConstantPositionProperty(newPosition)
        activeShapePoints.pop()
        activeShapePoints.push(newPosition)
        viewer.scene.requestRender()
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

      handler.setInputAction(() => {
        if (drawingMode === 'polygon' || drawingMode === 'line') {
          activeShapePoints.pop()
          terminateShape()
        }
      }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    })
  }

  /**
   * 结束绘制并创建最终实体
   * @description 清理临时实体，创建最终绘制形状，返回绘制结果
   */
  const terminateShape = () => {
    if (!activeShape) return
    const viewer = getViewer()
    if (!viewer) return

    const finalPositions = [...activeShapePoints]
    viewer.entities.remove(activeShape)
    tempPointEntities.forEach(id => viewer.entities.removeById(id))
    tempPointEntities.clear()

    if ((drawingMode === 'polygon' && finalPositions.length < 3) ||
      (drawingMode === 'line' && finalPositions.length < 2)) {
      resetState(viewer)
      if (drawPromiseResolve) drawPromiseResolve(null)
      return
    }

    const currentMode = drawingMode
    const generatedEntities = []

    if (currentMode === 'polygon') {
      generatedEntities.push(viewer.entities.add({
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(finalPositions),
          material: Cesium.Color.fromCssColorString('rgba(245, 63, 63, 0.4)'),
          height: 0, heightReference: Cesium.HeightReference.CLAMP_TO_GROUND, zIndex: 10
        }
      }))
      generatedEntities.push(viewer.entities.add({
        polyline: {
          positions: [...finalPositions, finalPositions[0]],
          width: 3, material: Cesium.Color.fromCssColorString('#F53F3F'), clampToGround: true
        }
      }))
    } else if (currentMode === 'line') {
      generatedEntities.push(viewer.entities.add({
        polyline: { positions: finalPositions, clampToGround: true, width: 3, material: Cesium.Color.YELLOW }
      }))
    } else if (currentMode === 'rectangle') {
      const rectangleCoordinates = Cesium.Rectangle.fromCartesianArray(finalPositions)
      generatedEntities.push(viewer.entities.add({
        rectangle: { coordinates: rectangleCoordinates, material: Cesium.Color.CYAN.withAlpha(0.4) }
      }))
    }

    generatedEntities.forEach(entity => drawnEntities.add(entity.id))

    if (drawPromiseResolve && currentMode !== 'none') {
      drawPromiseResolve(processDrawResult(finalPositions, currentMode))
    }
    resetState(viewer)
  }

  /**
   * 重置绘制状态
   * @description 清理所有临时状态，恢复光标
   * @param {Cesium.Viewer} viewer - Cesium Viewer 实例
   */
  const resetState = (viewer) => {
    activeShape = null; floatingPoint = null; activeShapePoints = []
    drawingMode = 'none'; drawPromiseResolve = null
    if (handler) { handler.destroy(); handler = null }
    viewer.scene.canvas.style.cursor = 'default'
    viewer.scene.requestRender()
  }

  /**
   * 取消当前绘制
   * @description 终止当前绘制流程，不保存结果
   */
  const cancelCurrentDrawing = () => {
    const viewer = getViewer()
    if (!viewer) return
    if (drawingMode !== 'none') {
      resetState(viewer)
      if (drawPromiseResolve) {
        drawPromiseResolve(null)
      }
    }
  }

  /**
   * 清除所有绘制
   * @description 移除所有已绘制的实体
   */
  const clearDrawings = () => {
    const viewer = getViewer()
    if (!viewer) return
    if (drawingMode !== 'none') terminateShape()
    drawnEntities.forEach(id => viewer.entities.removeById(id))
    drawnEntities.clear()
    viewer.scene.requestRender()
  }

  return {
    drawLine: () => startDrawing('line'),
    drawPolygon: () => startDrawing('polygon'),
    drawRectangle: () => startDrawing('rectangle'),
    clearDrawings,
    cancelCurrentDrawing,
    destroyDraw: clearDrawings
  }
}