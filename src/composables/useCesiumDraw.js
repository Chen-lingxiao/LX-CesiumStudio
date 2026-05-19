import * as Cesium from 'cesium'

/**
 * Cesium 图形绘制 Hook
 * @description 支持绘制线、多边形、矩形，并返回标准化的绘制结果
 * @param {Function} viewerProvider - 获取 Cesium Viewer 实例的函数
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
export function useCesiumDraw(viewerProvider) {
  /** 屏幕空间事件处理器，用于监听鼠标点击、移动等事件 */
  let handler = null
  /** 当前正在绘制的形状的顶点数组，存储 Cartesian3 坐标 */
  let activeShapePoints = []
  /** 动态预览的形状实体，在绘制过程中实时显示 */
  let activeShape = null
  /** 跟随鼠标移动的浮动点，用于视觉反馈 */
  let floatingPoint = null
  /** 当前绘制模式：'none' | 'line' | 'polygon' | 'rectangle' */
  let drawingMode = 'none'
  /** Promise 解析函数，用于在绘制完成时返回结果 */
  let drawPromiseResolve = null

  /** 已绘制完成的实体 ID 集合，用于后续清除操作 */
  const drawnEntities = new Set()
  /** 临时顶点实体 ID 集合，绘制过程中显示的点，完成后会清除 */
  const tempPointEntities = new Set()

  /**
   * 坐标拾取函数
   * @description 从屏幕坐标拾取三维坐标，优先拾取地形表面，若无地形则拾取椭球体表面
   * @param {Cesium.Cartesian2} position - 屏幕坐标（鼠标点击位置）
   * @param {Cesium.Viewer} viewer - Cesium Viewer 实例
   * @returns {Cesium.Cartesian3|null} 拾取到的三维笛卡尔坐标，拾取失败返回 null
   */
  const getPickedPosition = (position, viewer) => {
    // 从相机位置向点击位置发出射线
    const ray = viewer.scene.camera.getPickRay(position)
    if (!ray) return null
    // 优先拾取地形表面坐标
    const terrainPosition = viewer.scene.globe.pick(ray, viewer.scene)
    if (terrainPosition) return terrainPosition
    // 若无地形，拾取椭球体表面坐标
    return viewer.scene.camera.pickEllipsoid(position, viewer.scene.globe.ellipsoid)
  }

  /**
   * 重置绘制状态
   * @description 清理所有临时状态，恢复光标样式
   * @param {Cesium.Viewer} viewer - Cesium Viewer 实例
   */
  const resetState = (viewer) => {
    // 清空所有绘制相关的临时变量
    activeShape = null
    floatingPoint = null
    activeShapePoints = []
    drawingMode = 'none'
    drawPromiseResolve = null
    // 销毁事件处理器，避免内存泄漏
    if (handler) {
      handler.destroy()
      handler = null
    }
    // 恢复默认光标样式
    viewer.scene.canvas.style.cursor = 'default'
    // 请求场景重新渲染
    viewer.scene.requestRender()
  }

  /**
   * 处理绘制结果
   * @description 将笛卡尔坐标转换为经纬度坐标、WKT 格式字符串以及四至范围
   * @param {Cesium.Cartesian3[]} positions - 笛卡尔坐标数组
   * @param {string} mode - 绘制类型：'point' | 'line' | 'polygon' | 'rectangle'
   * @returns {Object|null} 标准化的绘制结果对象，包含 type、positions、lnglats、wkt、boundingBox
   */
  const processDrawResult = (positions, mode) => {
    const viewer = viewerProvider()
    if (!viewer) return null

    // 初始化四至范围
    let minX = 180  // 最西端经度
    let maxX = -180 // 最东端经度
    let minY = 90   // 最南端纬度
    let maxY = -90  // 最北端纬度

    // 将 Cartesian3 坐标转换为经纬度坐标（弧度转角度）
    const lnglats = positions.map((p) => {
      const cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(p)
      const lon = Number(Cesium.Math.toDegrees(cartographic.longitude).toFixed(8))
      const lat = Number(Cesium.Math.toDegrees(cartographic.latitude).toFixed(8))
      return [lon, lat]
    })

    // 生成 WKT (Well-Known Text) 格式字符串
    let wkt = ''

    if (mode === 'point' && lnglats.length >= 1) {
      // 点类型：POINT (x y)
      const [lon, lat] = lnglats[0]
      minX = maxX = lon
      minY = maxY = lat
      wkt = `POINT (${lon} ${lat})`
    } else if (mode === 'rectangle' && lnglats.length >= 2) {
      // 矩形类型：取前两个点作为对角点，生成闭合多边形 WKT
      const [first, second] = [lnglats[0], lnglats[1]]
      minX = Math.min(first[0], second[0])
      maxX = Math.max(first[0], second[0])
      minY = Math.min(first[1], second[1])
      maxY = Math.max(first[1], second[1])
      // 矩形需要闭合：左上 -> 右上 -> 右下 -> 左下 -> 左上
      wkt = `POLYGON ((${minX} ${maxY}, ${maxX} ${maxY}, ${maxX} ${minY}, ${minX} ${minY}, ${minX} ${maxY}))`
    } else {
      // 线或多边形类型：遍历所有点计算四至范围
      lnglats.forEach(p => {
        minX = Math.min(minX, p[0])
        maxX = Math.max(maxX, p[0])
        minY = Math.min(minY, p[1])
        maxY = Math.max(maxY, p[1])
      })
      if (mode === 'line') {
        // 线类型：LINESTRING (x1 y1, x2 y2, ...)
        wkt = `LINESTRING (${lnglats.map(p => p.join(' ')).join(', ')})`
      } else if (mode === 'polygon') {
        // 多边形类型：需要闭合，最后回到起点
        const closedLnglats = [...lnglats, lnglats[0]]
        wkt = `POLYGON ((${closedLnglats.map(p => p.join(' ')).join(', ')}))`
      }
    }

    // 返回标准化的绘制结果
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
   * @description 清理临时实体，创建最终的绘制形状，返回绘制结果
   */
  const terminateShape = () => {
    if (!activeShape) return
    const viewer = viewerProvider()
    if (!viewer) return

    // 保存最终的顶点坐标（防止后续操作修改 activeShapePoints）
    const finalPositions = [...activeShapePoints]

    // 清理临时的绘制预览实体
    viewer.entities.remove(activeShape)
    // 清理临时的顶点标记点
    tempPointEntities.forEach(id => viewer.entities.removeById(id))
    tempPointEntities.clear()

    // 验证绘制是否有效（需要足够的顶点数）
    if ((drawingMode === 'polygon' && finalPositions.length < 3) ||
      (drawingMode === 'line' && finalPositions.length < 2)) {
      // 顶点不足，重置状态并返回 null
      resetState(viewer)
      if (drawPromiseResolve) drawPromiseResolve(null)
      return
    }

    const currentMode = drawingMode
    const generatedEntities = []

    // 根据绘制模式创建对应的最终实体
    if (currentMode === 'polygon') {
      // 创建多边形面（半透明填充）
      generatedEntities.push(viewer.entities.add({
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(finalPositions),
          material: Cesium.Color.fromCssColorString('rgba(245, 63, 63, 0.4)'),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          clampToGround: true,
          zIndex: 10
        }
      }))
      // 创建多边形边框线（红色实线）
      generatedEntities.push(viewer.entities.add({
        polyline: {
          positions: [...finalPositions, finalPositions[0]],
          width: 3,
          material: Cesium.Color.fromCssColorString('#F53F3F'),
          clampToGround: true
        }
      }))
    } else if (currentMode === 'line') {
      // 创建线实体（黄色实线）
      generatedEntities.push(viewer.entities.add({
        polyline: { positions: finalPositions, clampToGround: true, width: 3, material: Cesium.Color.YELLOW }
      }))
    } else if (currentMode === 'rectangle') {
      // 创建矩形实体（青色半透明填充）
      const rectangleCoordinates = Cesium.Rectangle.fromCartesianArray(finalPositions)
      generatedEntities.push(viewer.entities.add({
        rectangle: { coordinates: rectangleCoordinates, material: Cesium.Color.CYAN.withAlpha(0.4) }
      }))
    }

    // 记录生成的实体 ID，以便后续清除
    generatedEntities.forEach(entity => drawnEntities.add(entity.id))

    // 返回绘制结果
    if (drawPromiseResolve && currentMode !== 'none') {
      drawPromiseResolve(processDrawResult(finalPositions, currentMode))
    }
    // 重置状态
    resetState(viewer)
  }

  /**
   * 开始绘制
   * @description 初始化绘制流程，注册鼠标事件监听
   * @param {string} mode - 绘制模式：'line' | 'polygon' | 'rectangle'
   * @returns {Promise} Promise，绘制完成时解析为绘制结果对象
   */
  const startDrawing = (mode) => {
    return new Promise((resolve) => {
      const viewer = viewerProvider()
      if (!viewer) {
        resolve(null)
        return
      }

      // 如果已有正在进行的绘制，先终止它
      if (drawingMode !== 'none') terminateShape()

      // 初始化绘制状态
      drawingMode = mode
      drawPromiseResolve = resolve
      viewer.scene.canvas.style.cursor = 'crosshair'  // 十字光标

      // 创建屏幕空间事件处理器
      handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

      /**
       * 左键点击事件：添加顶点
       */
      handler.setInputAction((event) => {
        const earthPosition = getPickedPosition(event.position, viewer)
        if (!earthPosition) return

        // 第一次点击：初始化绘制
        if (activeShapePoints.length === 0) {
          // 创建浮动点（跟随鼠标）
          floatingPoint = viewer.entities.add({
            position: earthPosition,
            point: { color: Cesium.Color.WHITE, pixelSize: 6 }
          })
          tempPointEntities.add(floatingPoint.id)
          activeShapePoints.push(earthPosition)

          // 创建动态位置回调属性，用于实时更新绘制预览
          const dynamicPositions = new Cesium.CallbackProperty(() => {
            if (drawingMode === 'polygon') {
              // 多边形需要 PolygonHierarchy
              return new Cesium.PolygonHierarchy(activeShapePoints)
            }
            if (drawingMode === 'rectangle') {
              // 矩形需要至少两个点才能确定
              return activeShapePoints.length < 2
                ? undefined
                : Cesium.Rectangle.fromCartesianArray(activeShapePoints)
            }
            // 线直接使用坐标数组
            return activeShapePoints
          }, false)

          // 根据绘制模式创建对应的预览实体
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

          // 添加预览实体到场景
          activeShape = viewer.entities.add(shapeConfig)
        }

        // 添加新的顶点
        activeShapePoints.push(earthPosition)
        // 创建顶点标记点
        const pt = viewer.entities.add({ position: earthPosition, point: { color: Cesium.Color.WHITE, pixelSize: 6 } })
        tempPointEntities.add(pt.id)

        // 矩形绘制：点击两次后自动完成（第三个点触发终止）
        if (drawingMode === 'rectangle' && activeShapePoints.length === 3) terminateShape()
        viewer.scene.requestRender()
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

      /**
       * 鼠标移动事件：更新浮动点位置和预览形状
       */
      handler.setInputAction((event) => {
        if (!floatingPoint) return
        const newPosition = getPickedPosition(event.endPosition, viewer)
        if (!newPosition) return
        // 更新浮动点位置
        floatingPoint.position = new Cesium.ConstantPositionProperty(newPosition)
        // 更新预览形状的最后一个顶点
        activeShapePoints.pop()
        activeShapePoints.push(newPosition)
        viewer.scene.requestRender()
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

      /**
       * 右键点击事件：完成绘制（适用于线和多边形）
       */
      handler.setInputAction(() => {
        if (drawingMode === 'polygon' || drawingMode === 'line') {
          // 移除最后一个由鼠标移动添加的临时顶点
          activeShapePoints.pop()
          terminateShape()
        }
      }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    })
  }

  /**
   * 取消当前绘制
   * @description 终止正在进行的绘制操作，不保存结果
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
   * @description 移除场景中所有已绘制完成的实体
   */
  const clearDrawings = () => {
    const viewer = viewerProvider()
    if (!viewer) return
    // 如果正在绘制，先终止它
    if (drawingMode !== 'none') terminateShape()
    // 清除所有已绘制的实体
    drawnEntities.forEach(id => viewer.entities.removeById(id))
    drawnEntities.clear()
    viewer.scene.requestRender()
  }

  // 公开的方法接口
  return {
    drawLine: () => startDrawing('line'),
    drawPolygon: () => startDrawing('polygon'),
    drawRectangle: () => startDrawing('rectangle'),
    clearDrawings,
    cancelCurrentDrawing,
    destroyDraw: clearDrawings
  }
}
