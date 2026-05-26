/**
 * useCesiumDraw.js - Cesium 图形绘制 Composable
 *
 * 【功能说明】
 * 提供点、线、多边形、矩形的交互式绘制功能，支持实时预览和结果标准化输出。
 *
 * 【使用方式】
 * ```javascript
 * import { useCesiumDraw } from '@/composables/useCesiumDraw'
 *
 * // 创建绘制管理器
 * const { drawLine, drawPolygon, drawRectangle, clearDrawings, cancelCurrentDrawing } = useCesiumDraw(getViewer)
 *
 * // 绘制折线
 * const lineResult = await drawLine()
 * if (lineResult) {
 *   console.log('折线 WKT:', lineResult.wkt)
 *   console.log('顶点坐标:', lineResult.lnglats)
 * }
 *
 * // 绘制多边形
 * const polygonResult = await drawPolygon()
 * if (polygonResult) {
 *   console.log('多边形 WKT:', polygonResult.wkt)
 *   console.log('边界框:', polygonResult.boundingBox)
 * }
 *
 * // 绘制矩形（点击两个对角点）
 * const rectResult = await drawRectangle()
 * if (rectResult) {
 *   console.log('矩形 WKT:', rectResult.wkt)
 * }
 *
 * // 清除所有绘制
 * clearDrawings()
 *
 * // 取消当前绘制
 * cancelCurrentDrawing()
 * ```
 *
 * 【绘制结果格式】
 * ```javascript
 * {
 *   type: 'polyline' | 'polygon' | 'rectangle',  // 图形类型
 *   positions: [Cesium.Cartesian3, ...],        // 笛卡尔坐标数组
 *   lnglats: [[lon, lat], ...],                  // 经纬度坐标数组
 *   wkt: 'LINESTRING (...)' | 'POLYGON (...)',   // WKT 格式字符串
 *   boundingBox: { west, south, east, north }   // 边界框
 * }
 * ```
 *
 * 【操作说明】
 * - 折线绘制：左键点击添加顶点（≥2个），右键完成
 * - 多边形绘制：左键点击添加顶点（≥3个），右键完成
 * - 矩形绘制：左键点击两个对角点，自动完成
 * - 取消绘制：调用 `cancelCurrentDrawing()` 或切换模式
 *
 * 【核心技术要点】
 * 1. 使用闭包管理绘制状态（顶点、预览实体、事件处理器）
 * 2. 通过 CallbackProperty 实现实时预览
 * 3. 支持地形拾取和椭球体拾取回退
 * 4. 自动生成 WKT 格式和边界框
 *
 * 【设计理念】
 * - 函数式封装：返回方法对象，无实例化
 * - 延迟获取：通过 viewerProvider 函数获取 viewer
 * - 状态隔离：内部状态通过闭包管理，外部不可访问
 * - Promise 异步：绘制过程返回 Promise，支持 async/await
 */

import * as Cesium from 'cesium'

/**
 * Cesium 图形绘制 Composable
 *
 * @param {Function} viewerProvider - 获取 Cesium Viewer 实例的函数
 * @returns {Object} 绘制方法集合
 * @returns {Function} returns.drawLine - 绘制折线，返回 Promise<Result>
 * @returns {Function} returns.drawPolygon - 绘制多边形，返回 Promise<Result>
 * @returns {Function} returns.drawRectangle - 绘制矩形，返回 Promise<Result>
 * @returns {Function} returns.clearDrawings - 清除所有已绘制图形
 * @returns {Function} returns.cancelCurrentDrawing - 取消当前绘制操作
 */
export function useCesiumDraw(viewerProvider) {
  // ==================== 内部状态 ====================
  
  let handler = null                  // 屏幕空间事件处理器
  let activeShapePoints = []          // 当前绘制的顶点数组
  let activeShape = null              // 动态预览实体
  let floatingPoint = null            // 浮动标记点
  let drawingMode = 'none'            // 当前绘制模式
  let drawPromiseResolve = null       // Promise 解析函数

  const drawnEntities = new Set()     // 已绘制实体 ID 集合
  const tempPointEntities = new Set() // 临时顶点实体 ID 集合

  // ==================== 工具函数 ====================

  /**
   * 从屏幕坐标拾取三维坐标
   * @description 优先拾取地形表面，无地形时回退到椭球体表面
   * @param {Cesium.Cartesian2} position - 屏幕坐标
   * @returns {Cesium.Cartesian3|null} 三维笛卡尔坐标
   */
  const getPickedPosition = (position, viewer) => {
    const ray = viewer.scene.camera.getPickRay(position)
    if (!ray) return null
    const terrainPosition = viewer.scene.globe.pick(ray, viewer.scene)
    if (terrainPosition) return terrainPosition
    return viewer.scene.camera.pickEllipsoid(position, viewer.scene.globe.ellipsoid)
  }

  /**
   * 重置绘制状态
   * @description 清理临时状态，恢复光标样式
   */
  const resetState = (viewer) => {
    activeShape = null
    floatingPoint = null
    activeShapePoints = []
    drawingMode = 'none'
    drawPromiseResolve = null
    
    if (handler) {
      handler.destroy()
      handler = null
    }
    
    viewer.scene.canvas.style.cursor = 'default'
    viewer.scene.requestRender()
  }

  /**
   * 处理绘制结果
   * @description 将笛卡尔坐标转换为经纬度、WKT 和边界框
   * @param {Cesium.Cartesian3[]} positions - 笛卡尔坐标数组
   * @param {string} mode - 绘制类型
   * @returns {Object|null} 标准化结果对象
   */
  const processDrawResult = (positions, mode) => {
    const viewer = viewerProvider()
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
      minX = Math.min(first[0], second[0])
      maxX = Math.max(first[0], second[0])
      minY = Math.min(first[1], second[1])
      maxY = Math.max(first[1], second[1])
      wkt = `POLYGON ((${minX} ${maxY}, ${maxX} ${maxY}, ${maxX} ${minY}, ${minX} ${minY}, ${minX} ${maxY}))`
    } else {
      lnglats.forEach(p => {
        minX = Math.min(minX, p[0])
        maxX = Math.max(maxX, p[0])
        minY = Math.min(minY, p[1])
        maxY = Math.max(maxY, p[1])
      })
      if (mode === 'line') {
        wkt = `LINESTRING (${lnglats.map(p => p.join(' ')).join(', ')})`
      } else if (mode === 'polygon') {
        const closedLnglats = [...lnglats, lnglats[0]]
        wkt = `POLYGON ((${closedLnglats.map(p => p.join(' ')).join(', ')}))`
      }
    }

    return {
      type: mode,
      positions,
      lnglats,
      wkt,
      boundingBox: { west: minX, south: minY, east: maxX, north: maxY }
    }
  }

  /**
   * 结束绘制并创建最终实体
   * @description 清理临时实体，创建最终形状，返回结果
   */
  const terminateShape = () => {
    if (!activeShape) return
    const viewer = viewerProvider()
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
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          clampToGround: true,
          zIndex: 10
        }
      }))
      generatedEntities.push(viewer.entities.add({
        polyline: {
          positions: [...finalPositions, finalPositions[0]],
          width: 3,
          material: Cesium.Color.fromCssColorString('#F53F3F'),
          clampToGround: true
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
   * 开始绘制
   * @description 初始化绘制流程，注册鼠标事件
   * @param {string} mode - 绘制模式
   * @returns {Promise} Promise，绘制完成时解析为结果对象
   */
  const startDrawing = (mode) => {
    return new Promise((resolve) => {
      const viewer = viewerProvider()
      if (!viewer) {
        resolve(null)
        return
      }

      if (drawingMode !== 'none') terminateShape()

      drawingMode = mode
      drawPromiseResolve = resolve
      viewer.scene.canvas.style.cursor = 'crosshair'

      handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

      // 左键点击：添加顶点
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
            if (drawingMode === 'polygon') {
              return new Cesium.PolygonHierarchy(activeShapePoints)
            }
            if (drawingMode === 'rectangle') {
              return activeShapePoints.length < 2
                ? undefined
                : Cesium.Rectangle.fromCartesianArray(activeShapePoints)
            }
            return activeShapePoints
          }, false)

          const shapeConfig = {}
          if (mode === 'line') {
            shapeConfig.polyline = { positions: dynamicPositions, width: 3, material: Cesium.Color.YELLOW, clampToGround: true }
          }
          if (mode === 'polygon') {
            shapeConfig.polygon = { hierarchy: dynamicPositions, material: Cesium.Color.YELLOW.withAlpha(0.4) }
          }
          if (mode === 'rectangle') {
            shapeConfig.rectangle = { coordinates: dynamicPositions, material: Cesium.Color.CYAN.withAlpha(0.4) }
          }

          activeShape = viewer.entities.add(shapeConfig)
        }

        activeShapePoints.push(earthPosition)
        const pt = viewer.entities.add({ position: earthPosition, point: { color: Cesium.Color.WHITE, pixelSize: 6 } })
        tempPointEntities.add(pt.id)

        if (drawingMode === 'rectangle' && activeShapePoints.length === 3) terminateShape()
        viewer.scene.requestRender()
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

      // 鼠标移动：更新浮动点和预览
      handler.setInputAction((event) => {
        if (!floatingPoint) return
        const newPosition = getPickedPosition(event.endPosition, viewer)
        if (!newPosition) return
        floatingPoint.position = new Cesium.ConstantPositionProperty(newPosition)
        activeShapePoints.pop()
        activeShapePoints.push(newPosition)
        viewer.scene.requestRender()
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

      // 右键点击：完成绘制
      handler.setInputAction(() => {
        if (drawingMode === 'polygon' || drawingMode === 'line') {
          activeShapePoints.pop()
          terminateShape()
        }
      }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    })
  }

  /**
   * 取消当前绘制
   * @description 终止正在进行的绘制，不保存结果
   */
  const cancelCurrentDrawing = () => {
    const viewer = viewerProvider()
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
   * @description 移除场景中所有已绘制的实体
   */
  const clearDrawings = () => {
    const viewer = viewerProvider()
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