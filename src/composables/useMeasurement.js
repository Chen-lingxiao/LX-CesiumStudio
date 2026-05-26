/**
 * useMeasurement.js - Cesium 综合测量工具 Composable
 *
 * 【功能说明】
 * 提供距离测量、面积测量、高度测量和坐标拾取四大功能，支持实时预览和结果可视化。
 *
 * 【使用方式】
 * ```javascript
 * import { useMeasurement } from '@/composables/useMeasurement'
 *
 * // 创建测量管理器（方式一：传入 getViewer 函数，推荐）
 * const {
 *   startDistanceMeasure,   // 启动距离测量
 *   startAreaMeasure,      // 启动面积测量
 *   startHeightMeasure,    // 启动高度测量
 *   startCoordinatePick,   // 启动坐标拾取
 *   stopCurrentMode,       // 停止当前测量
 *   clearAll               // 清除所有测量
 * } = useMeasurement(getViewer, (msg) => { statusMessage.value = msg })
 *
 * // 创建测量管理器（方式二：直接传入 viewer 实例，兼容旧代码）
 * const measurement = useMeasurement(viewer, (msg) => { statusMessage.value = msg })
 *
 * // 距离测量
 * startDistanceMeasure()
 * // 操作：左键点击起点 → 左键点击终点 → 显示距离
 *
 * // 面积测量
 * startAreaMeasure()
 * // 操作：左键点击添加顶点（≥3个） → Enter/右键/双击完成 → 显示面积
 *
 * // 高度测量
 * startHeightMeasure()
 * // 操作：左键点击起点 → 左键点击终点 → 显示高差
 *
 * // 坐标拾取
 * startCoordinatePick()
 * // 操作：左键点击任意位置 → 显示经纬度和高度
 *
 * // 清除所有测量
 * clearAll()
 * ```
 *
 * 【测量模式操作说明】
 * - 距离测量：左键点击添加起点和终点，右键可取消
 * - 面积测量：左键点击添加顶点（至少3个），Enter/右键/双击完成，Esc取消
 * - 高度测量：左键点击添加起点和终点
 * - 坐标拾取：左键点击地图任意位置获取坐标
 *
 * 【核心技术要点】
 * 1. 使用闭包管理测量状态（顶点、预览实体、事件处理器）
 * 2. 通过 CallbackProperty 实现实时预览
 * 3. 支持地形拾取和椭球体拾取回退
 * 4. 自动格式化距离、面积、高度显示
 *
 * 【设计理念】
 * - 函数式封装：返回方法对象，无实例化
 * - 延迟获取：支持传入 getViewer 函数延迟获取 viewer
 * - 兼容设计：同时支持直接传入 viewer 实例
 * - 状态隔离：内部状态通过闭包管理，外部不可访问
 * - 回调通知：通过 statusCallback 同步状态到 UI
 */

import * as Cesium from 'cesium'

/**
 * 测量工具 Composable 核心函数
 *
 * @param {Cesium.Viewer|Function} viewerOrGetter - Cesium Viewer 实例或获取实例的函数
 * @param {Function} statusCallback - 状态回调函数，接收字符串参数更新 UI 提示信息
 * @returns {Object} 测量方法集合
 * @returns {Function} returns.startDistanceMeasure - 启动距离测量
 * @returns {Function} returns.startAreaMeasure - 启动面积测量
 * @returns {Function} returns.startHeightMeasure - 启动高度测量
 * @returns {Function} returns.startCoordinatePick - 启动坐标拾取
 * @returns {Function} returns.stopCurrentMode - 停止当前测量
 * @returns {Function} returns.clearAll - 清除所有测量
 */
export function useMeasurement(viewerOrGetter, statusCallback) {
  // 统一为函数式获取 viewer，兼容两种调用方式
  const getViewer = typeof viewerOrGetter === 'function' 
    ? viewerOrGetter 
    : () => viewerOrGetter

  // ======================== 内部状态 ========================

  let currentMode = 'none'           // 当前测量模式
  let handler = null                 // 屏幕空间事件处理器
  let activePoints = []              // 已确认的测量点数组
  let mousePosition = null           // 鼠标实时位置
  let activeShape = null             // 动态预览形状实体
  let floatingPoint = null           // 浮动标记点实体
  let tempEntities = new Set()       // 临时实体 ID 集合
  let resultEntities = new Set()     // 结果实体 ID 集合
  let currentKeyDownHandler = null   // 当前键盘事件处理函数

  // ======================== 公共工具函数 ========================

  /**
   * 获取屏幕坐标对应的笛卡尔坐标
   * @description 优先拾取地形表面坐标，其次回退到椭球体表面
   * @param {Cesium.Cartesian2} screenPos - 屏幕坐标
   * @returns {Cesium.Cartesian3|null} 笛卡尔坐标，拾取失败返回 null
   */
  const getPosition = (screenPos) => {
    const viewer = getViewer()
    if (!viewer) return null

    const ray = viewer.scene.camera.getPickRay(screenPos)
    if (!ray) return null

    const terrainPos = viewer.scene.globe.pick(ray, viewer.scene)
    if (terrainPos) return terrainPos

    return viewer.scene.camera.pickEllipsoid(screenPos, viewer.scene.globe.ellipsoid)
  }

  /**
   * 将笛卡尔坐标转换为经纬度高度信息
   * @param {Cesium.Cartesian3} cartesian - 笛卡尔坐标
   * @returns {{ lon: string, lat: string, height: string }|null} 格式化后的坐标信息
   */
  const getPositionInfo = (cartesian) => {
    if (!cartesian) return null

    const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
    return {
      lon: Cesium.Math.toDegrees(cartographic.longitude).toFixed(6),
      lat: Cesium.Math.toDegrees(cartographic.latitude).toFixed(6),
      height: cartographic.height.toFixed(2)
    }
  }

  /**
   * 将米制距离格式化为人类可读字符串
   * @description 超过 1 公里自动转为公里单位
   * @param {number} meters - 距离（米）
   * @returns {string} 格式化后的距离字符串
   */
  const formatDistance = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} 公里`
    }
    return `${meters.toFixed(2)} 米`
  }

  /**
   * 将平方米面积格式化为人类可读字符串
   * @description 根据数值大小自动选择单位
   * @param {number} sqMeters - 面积（平方米）
   * @returns {string} 格式化后的面积字符串
   */
  const formatArea = (sqMeters) => {
    if (sqMeters >= 1000000) {
      return `${(sqMeters / 1000000).toFixed(4)} 平方公里`
    }
    if (sqMeters >= 10000) {
      return `${(sqMeters / 10000).toFixed(2)} 公顷`
    }
    return `${sqMeters.toFixed(2)} 平方米`
  }

  /**
   * 将角度转换为弧度
   * @param {number} degrees - 角度值
   * @returns {number} 对应的弧度值
   */
  const toRad = (degrees) => degrees * Math.PI / 180

  // ======================== 实体创建工具 ========================

  /**
   * 在指定位置创建标记点实体
   * @param {Cesium.Cartesian3} position - 标记位置
   * @param {Cesium.Color} color - 点填充颜色
   * @param {number} [size=8] - 点像素大小
   * @returns {Cesium.Entity|null} 创建的标记点实体
   */
  const addMarkerPoint = (position, color, size = 8) => {
    const viewer = getViewer()
    if (!viewer) return null

    const entity = viewer.entities.add({
      position,
      point: {
        pixelSize: size,
        color,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2
      }
    })
    resultEntities.add(entity.id)
    return entity
  }

  /**
   * 创建浮动标记点实体（跟随鼠标移动）
   * @param {Cesium.Cartesian3} position - 初始位置
   * @returns {Cesium.Entity|null} 浮动点实体
   */
  const createFloatingPoint = (position) => {
    const viewer = getViewer()
    if (!viewer) return null

    const entity = viewer.entities.add({
      position,
      point: {
        pixelSize: 6,
        color: Cesium.Color.WHITE
      }
    })
    tempEntities.add(entity.id)
    return entity
  }

  /**
   * 更新浮动点位置
   * @param {Cesium.Cartesian3} newPos - 新的笛卡尔坐标
   */
  const updateFloatingPoint = (newPos) => {
    if (floatingPoint) {
      floatingPoint.position = new Cesium.ConstantPositionProperty(newPos)
    }
  }

  // ======================== 交互状态清理 ========================

  /**
   * 清理交互状态
   * @description 销毁事件处理器、移除预览实体、清除临时标记点、重置内部状态
   */
  const cleanupInteraction = () => {
    const viewer = getViewer()
    if (!viewer) return

    if (handler) {
      handler.destroy()
      handler = null
    }

    if (activeShape) {
      viewer.entities.remove(activeShape)
      activeShape = null
    }

    tempEntities.forEach((id) => {
      const entity = viewer.entities.getById(id)
      if (entity) {
        viewer.entities.remove(entity)
      }
    })
    tempEntities.clear()

    window.removeEventListener('keydown', currentKeyDownHandler)

    activePoints = []
    mousePosition = null
    floatingPoint = null

    viewer.scene.canvas.style.cursor = 'default'
    viewer.scene.requestRender()
  }

  /**
   * 停止当前测量模式
   */
  const stopCurrentMode = () => {
    if (currentMode !== 'none') {
      cleanupInteraction()
      currentMode = 'none'
      if (statusCallback) statusCallback('已停止测量')
    }
  }

  /**
   * 清除所有测量结果
   * @description 移除所有测量实体，重置所有状态
   */
  const clearAll = () => {
    stopCurrentMode()
    const viewer = getViewer()
    if (!viewer) return

    viewer.entities.removeAll()
    resultEntities.clear()
    tempEntities.clear()
    currentMode = 'none'
    if (statusCallback) statusCallback('已清除所有测量结果')
    viewer.scene.requestRender()
  }

  // ======================== 距离测量模块 ========================

  /**
   * 获取距离测量的动态位置（用于 CallbackProperty）
   */
  const getDistancePositions = () => {
    const positions = [...activePoints]
    if (mousePosition) {
      positions.push(mousePosition)
    }
    return positions
  }

  /**
   * 距离测量左键点击处理
   */
  const handleDistanceClick = (event) => {
    const pos = getPosition(event.position)
    if (!pos) {
      if (statusCallback) statusCallback('无法获取坐标，请重试')
      return
    }

    activePoints.push(pos)

    const viewer = getViewer()
    if (!viewer) return

    if (activePoints.length === 1) {
      addMarkerPoint(pos, Cesium.Color.RED)

      activeShape = viewer.entities.add({
        polyline: {
          positions: new Cesium.CallbackProperty(getDistancePositions, false),
          width: 3,
          material: Cesium.Color.CYAN,
          clampToGround: true
        }
      })

      floatingPoint = createFloatingPoint(pos)
      if (statusCallback) statusCallback('距离测量：点击添加终点，右键取消')
    } else {
      addMarkerPoint(pos, Cesium.Color.RED)

      const distance = Cesium.Cartesian3.distance(activePoints[0], activePoints[1])

      viewer.entities.add({
        polyline: {
          positions: [activePoints[0], activePoints[1]],
          width: 3,
          material: Cesium.Color.CYAN,
          clampToGround: true
        }
      })

      const midPos = Cesium.Cartesian3.lerp(activePoints[0], activePoints[1], 0.5, new Cesium.Cartesian3())
      viewer.entities.add({
        position: midPos,
        label: {
          text: formatDistance(distance),
          font: '16px 微软雅黑',
          fillColor: Cesium.Color.YELLOW,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          pixelOffset: new Cesium.Cartesian2(0, -20)
        }
      })

      if (statusCallback) statusCallback(`距离测量完成：${formatDistance(distance)}`)
      cleanupInteraction()
      currentMode = 'none'
    }

    viewer.scene.requestRender()
  }

  /**
   * 启动距离测量
   */
  const startDistanceMeasure = () => {
    stopCurrentMode()
    currentMode = 'distance'

    const viewer = getViewer()
    if (!viewer) return

    viewer.scene.canvas.style.cursor = 'crosshair'
    handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

    handler.setInputAction(handleDistanceClick, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    handler.setInputAction((event) => {
      if (!floatingPoint) return
      const newPos = getPosition(event.endPosition)
      if (!newPos) return
      updateFloatingPoint(newPos)
      mousePosition = newPos
      viewer.scene.requestRender()
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    handler.setInputAction(() => {
      cleanupInteraction()
      currentMode = 'none'
      if (statusCallback) statusCallback('距离测量已取消')
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)

    if (statusCallback) statusCallback('距离测量：点击添加起点')
  }

  // ======================== 面积测量模块 ========================

  /**
   * 获取面积测量的动态位置（用于 CallbackProperty）
   */
  const getAreaPositions = () => {
    const positions = [...activePoints]
    if (mousePosition && positions.length > 0) {
      positions.push(mousePosition)
    }
    return new Cesium.PolygonHierarchy(positions)
  }

  /**
   * 计算多边形面积（球面面积）
   */
  const calculateArea = (positions) => {
    if (positions.length < 3) return 0

    let area = 0
    const ellipsoid = getViewer()?.scene.globe.ellipsoid || Cesium.Ellipsoid.WGS84
    const radius = ellipsoid.maximumRadius

    for (let i = 0; i < positions.length; i++) {
      const j = (i + 1) % positions.length
      const cartographic1 = ellipsoid.cartesianToCartographic(positions[i])
      const cartographic2 = ellipsoid.cartesianToCartographic(positions[j])

      if (!cartographic1 || !cartographic2) continue

      const lat1 = toRad(Cesium.Math.toDegrees(cartographic1.latitude))
      const lon1 = toRad(Cesium.Math.toDegrees(cartographic1.longitude))
      const lat2 = toRad(Cesium.Math.toDegrees(cartographic2.latitude))
      const lon2 = toRad(Cesium.Math.toDegrees(cartographic2.longitude))

      area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2))
    }

    return Math.abs(area * radius * radius / 2)
  }

  /**
   * 完成面积测量
   */
  const finishAreaMeasure = () => {
    if (activePoints.length < 3) {
      if (statusCallback) statusCallback('面积测量需要至少3个点')
      return
    }

    const viewer = getViewer()
    if (!viewer) return

    const area = calculateArea(activePoints)

    viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(activePoints),
        material: Cesium.Color.GREEN.withAlpha(0.3),
        outline: true,
        outlineColor: Cesium.Color.GREEN,
        clampToGround: true
      }
    })

    viewer.entities.add({
      polyline: {
        positions: [...activePoints, activePoints[0]],
        width: 2,
        material: Cesium.Color.GREEN,
        clampToGround: true
      }
    })

    const center = Cesium.BoundingSphere.fromPoints(activePoints).center
    viewer.entities.add({
      position: center,
      label: {
        text: formatArea(area),
        font: '16px 微软雅黑',
        fillColor: Cesium.Color.GREEN,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        pixelOffset: new Cesium.Cartesian2(0, -20)
      }
    })

    if (statusCallback) statusCallback(`面积测量完成：${formatArea(area)}`)
    cleanupInteraction()
    currentMode = 'none'
  }

  /**
   * 启动面积测量
   */
  const startAreaMeasure = () => {
    stopCurrentMode()
    currentMode = 'area'

    const viewer = getViewer()
    if (!viewer) return

    viewer.scene.canvas.style.cursor = 'crosshair'
    handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

    handler.setInputAction((event) => {
      const pos = getPosition(event.position)
      if (!pos) {
        if (statusCallback) statusCallback('无法获取坐标，请重试')
        return
      }

      activePoints.push(pos)
      addMarkerPoint(pos, Cesium.Color.BLUE)

      if (activePoints.length === 1) {
        activeShape = viewer.entities.add({
          polygon: {
            hierarchy: new Cesium.CallbackProperty(getAreaPositions, false),
            material: Cesium.Color.BLUE.withAlpha(0.2),
            outline: true,
            outlineColor: Cesium.Color.BLUE
          }
        })
        floatingPoint = createFloatingPoint(pos)
        if (statusCallback) statusCallback('面积测量：点击添加顶点，Enter/右键/双击完成')
      }

      viewer.scene.requestRender()
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    handler.setInputAction((event) => {
      if (!floatingPoint) return
      const newPos = getPosition(event.endPosition)
      if (!newPos) return
      updateFloatingPoint(newPos)
      mousePosition = newPos
      viewer.scene.requestRender()
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    handler.setInputAction(() => {
      finishAreaMeasure()
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)

    handler.setInputAction(() => {
      finishAreaMeasure()
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)

    currentKeyDownHandler = (event) => {
      if (event.key === 'Enter') {
        finishAreaMeasure()
      } else if (event.key === 'Escape') {
        cleanupInteraction()
        currentMode = 'none'
        if (statusCallback) statusCallback('面积测量已取消')
      }
    }
    window.addEventListener('keydown', currentKeyDownHandler)

    if (statusCallback) statusCallback('面积测量：点击添加起点')
  }

  // ======================== 高度测量模块 ========================

  /**
   * 启动高度测量
   */
  const startHeightMeasure = () => {
    stopCurrentMode()
    currentMode = 'height'

    const viewer = getViewer()
    if (!viewer) return

    viewer.scene.canvas.style.cursor = 'crosshair'
    handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

    handler.setInputAction((event) => {
      const pos = getPosition(event.position)
      if (!pos) {
        if (statusCallback) statusCallback('无法获取坐标，请重试')
        return
      }

      activePoints.push(pos)
      const info = getPositionInfo(pos)

      if (activePoints.length === 1) {
        addMarkerPoint(pos, Cesium.Color.PURPLE)
        floatingPoint = createFloatingPoint(pos)
        if (statusCallback) statusCallback(`高度测量：起点 (${info.lon}, ${info.lat}, ${info.height}m)，点击添加终点`)
      } else {
        addMarkerPoint(pos, Cesium.Color.PURPLE)

        const heightDiff = parseFloat(getPositionInfo(activePoints[1]).height) - 
                          parseFloat(getPositionInfo(activePoints[0]).height)

        viewer.entities.add({
          polyline: {
            positions: [activePoints[0], activePoints[1]],
            width: 3,
            material: Cesium.Color.PURPLE,
            clampToGround: true
          }
        })

        const midPos = Cesium.Cartesian3.lerp(activePoints[0], activePoints[1], 0.5, new Cesium.Cartesian3())
        viewer.entities.add({
          position: midPos,
          label: {
            text: heightDiff >= 0 ? `+${heightDiff.toFixed(2)} 米` : `${heightDiff.toFixed(2)} 米`,
            font: '16px 微软雅黑',
            fillColor: heightDiff >= 0 ? Cesium.Color.GREEN : Cesium.Color.RED,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            pixelOffset: new Cesium.Cartesian2(0, -20)
          }
        })

        if (statusCallback) statusCallback(`高度测量完成：高差 ${heightDiff >= 0 ? '+' : ''}${heightDiff.toFixed(2)} 米`)
        cleanupInteraction()
        currentMode = 'none'
      }

      viewer.scene.requestRender()
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    handler.setInputAction((event) => {
      if (!floatingPoint) return
      const newPos = getPosition(event.endPosition)
      if (!newPos) return
      updateFloatingPoint(newPos)
      mousePosition = newPos
      viewer.scene.requestRender()
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    handler.setInputAction(() => {
      cleanupInteraction()
      currentMode = 'none'
      if (statusCallback) statusCallback('高度测量已取消')
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)

    if (statusCallback) statusCallback('高度测量：点击添加起点')
  }

  // ======================== 坐标拾取模块 ========================

  /**
   * 启动坐标拾取
   */
  const startCoordinatePick = () => {
    stopCurrentMode()
    currentMode = 'coordinate'

    const viewer = getViewer()
    if (!viewer) return

    viewer.scene.canvas.style.cursor = 'crosshair'
    handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

    handler.setInputAction((event) => {
      const pos = getPosition(event.position)
      if (!pos) {
        if (statusCallback) statusCallback('无法获取坐标，请重试')
        return
      }

      const info = getPositionInfo(pos)
      addMarkerPoint(pos, Cesium.Color.ORANGE)

      viewer.entities.add({
        position: pos,
        label: {
          text: `(${info.lon}, ${info.lat}, ${info.height}m)`,
          font: '14px 微软雅黑',
          fillColor: Cesium.Color.ORANGE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          pixelOffset: new Cesium.Cartesian2(0, -15)
        }
      })

      if (statusCallback) statusCallback(`坐标拾取：(${info.lon}, ${info.lat}, ${info.height}米)`)
      viewer.scene.requestRender()
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    handler.setInputAction(() => {
      cleanupInteraction()
      currentMode = 'none'
      if (statusCallback) statusCallback('坐标拾取已停止')
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)

    if (statusCallback) statusCallback('坐标拾取：点击获取坐标')
  }

  // ======================== 公开 API ========================

  return {
    startDistanceMeasure,
    startAreaMeasure,
    startHeightMeasure,
    startCoordinatePick,
    stopCurrentMode,
    clearAll
  }
}