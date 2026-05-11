/**
 * useMeasurement.js - Cesium 综合测量工具 Composable
 *
 * 功能说明：
 * 提供距离测量、面积测量、高度测量和坐标拾取四大功能的可复用逻辑。
 * 通过闭包封装状态，对外暴露简洁的 API 接口。
 *
 * 模块结构：
 * 1. 公共工具函数（坐标拾取、格式化、实体创建）
 * 2. 交互状态清理
 * 3. 距离测量模块
 * 4. 面积测量模块（支持 Enter / 右键 / 双击 / Esc）
 * 5. 高度测量模块
 * 6. 坐标拾取模块
 *
 * 修复历史：
 * - 修复浮动点覆盖已提交顶点的 Bug（mousePosition 独立于 activePoints）
 * - 修复高度测量结果实体被 resetState 误清理的问题
 * - 修复面积多边形动态预览时机构建异常
 *
 * @example
 * import { useMeasurement } from '@/composables/useMeasurement'
 *
 * const {
 *   startDistanceMeasure,
 *   startAreaMeasure,
 *   startHeightMeasure,
 *   startCoordinatePick,
 *   stopCurrentMode,
 *   clearAll
 * } = useMeasurement(viewer, (msg) => { statusMessage.value = msg })
 */
import * as Cesium from 'cesium'

/**
 * 测量工具 Composable 核心函数
 *
 * @param {Cesium.Viewer} viewer - Cesium Viewer 实例，必须已初始化并挂载到 DOM
 * @param {Function} statusCallback - 状态回调函数，接收字符串参数更新 UI 提示信息
 * @returns {Object} 测量方法集合，包含启动各模式、停止和清除方法
 */
export function useMeasurement(viewer, statusCallback) {
  // ======================== 内部状态 ========================

  /** 当前测量模式，可选值：'none' | 'distance' | 'area' | 'height' | 'coordinate' */
  let currentMode = 'none'

  /** 屏幕空间事件处理器，每次切换模式时销毁重建 */
  let handler = null

  /** 已确认的测量点数组（用户点击提交的坐标） */
  let activePoints = []

  /**
   * 鼠标实时位置（独立于 activePoints）
   * 核心设计：浮动点通过此变量动态拼接，绝不修改 activePoints 中已提交的顶点
   */
  let mousePosition = null

  /** 动态预览形状实体（距离测量的预览线段、面积测量的预览多边形） */
  let activeShape = null

  /** 浮动标记点实体（跟随鼠标移动，给用户即时视觉反馈） */
  let floatingPoint = null

  /** 临时实体 ID 集合，测量过程中创建的标记点需在切换/清理时移除 */
  let tempEntities = new Set()

  /** 当前键盘事件处理函数引用，用于安全移除 window 级别的 keydown 监听 */
  let currentKeyDownHandler = null

  // ======================== 公共工具函数 ========================

  /**
   * 获取屏幕坐标对应的笛卡尔坐标
   * 优先拾取地形表面坐标，其次回退到椭球体表面
   *
   * @param {Cesium.Cartesian2} screenPos - 屏幕坐标
   * @returns {Cesium.Cartesian3|null} 笛卡尔坐标，拾取失败返回 null
   */
  const getPosition = (screenPos) => {
    const ray = viewer.scene.camera.getPickRay(screenPos)
    if (!ray) return null

    // 优先地形拾取，支持地形起伏场景
    const terrainPos = viewer.scene.globe.pick(ray, viewer.scene)
    if (terrainPos) return terrainPos

    // 回退到椭球体表面（无地形数据时使用）
    return viewer.scene.camera.pickEllipsoid(screenPos, viewer.scene.globe.ellipsoid)
  }

  /**
   * 将笛卡尔坐标转换为经纬度高度信息
   *
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
   * 超过 1 公里自动转为公里单位
   *
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
   * 根据数值大小自动选择 平方米 / 公顷 / 平方公里 单位
   *
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
   *
   * @param {number} degrees - 角度值
   * @returns {number} 对应的弧度值
   */
  const toRad = (degrees) => degrees * Math.PI / 180

  // ======================== 实体创建工具 ========================

  /**
   * 在指定位置创建标记点实体
   *
   * @param {Cesium.Cartesian3} position - 标记位置
   * @param {Cesium.Color} color - 点填充颜色
   * @param {number} [size=8] - 点像素大小
   * @returns {Cesium.Entity} 创建的标记点实体
   */
  const addMarkerPoint = (position, color, size = 8) => {
    return viewer.entities.add({
      position,
      point: {
        pixelSize: size,
        color,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2
      }
    })
  }

  /**
   * 创建浮动标记点实体（跟随鼠标移动）
   * 浮动点用于给用户实时视觉反馈，表示下一个点击将落在此位置
   *
   * @param {Cesium.Cartesian3} position - 初始位置
   * @returns {Cesium.Entity} 浮动点实体（自动加入临时实体集合）
   */
  const createFloatingPoint = (position) => {
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
   *
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
   * 销毁事件处理器、移除预览实体、清除临时标记点、重置内部状态
   * 注意：不会清理已确认的测量结果实体（标记点、连线、标签等）
   */
  const cleanupInteraction = () => {
    if (handler) {
      handler.destroy()
      handler = null
    }

    if (activeShape) {
      viewer.entities.remove(activeShape)
      activeShape = null
    }

    // 清理测量过程中创建的临时标记点
    tempEntities.forEach((id) => {
      const entity = viewer.entities.getById(id)
      if (entity) {
        viewer.entities.remove(entity)
      }
    })
    tempEntities.clear()

    // 移除键盘事件监听
    window.removeEventListener('keydown', currentKeyDownHandler)

    // 重置交互状态
    activePoints = []
    mousePosition = null
    floatingPoint = null

    if (viewer) {
      viewer.scene.canvas.style.cursor = 'default'
      viewer.scene.requestRender()
    }
  }

  /**
   * 停止当前测量模式并清理交互状态
   */
  const stopCurrentMode = () => {
    if (currentMode !== 'none') {
      cleanupInteraction()
      currentMode = 'none'
      statusCallback('已停止测量')
    }
  }

  /**
   * 清除所有测量结果（包含已确认的实体和交互状态）
   */
  const clearAll = () => {
    stopCurrentMode()
    viewer.entities.removeAll()
    statusCallback('已清除所有测量结果')
  }

  // ======================== 鼠标移动处理（公共） ========================

  /**
   * 统一的鼠标移动处理函数
   * 适用于距离测量和面积测量，更新浮动点位置以提供实时视觉反馈
   *
   * @param {Object} event - Cesium 屏幕空间事件对象
   */
  const onMouseMove = (event) => {
    if (activePoints.length === 0) return

    const newPos = getPosition(event.endPosition)
    if (!newPos) return

    mousePosition = newPos
    updateFloatingPoint(newPos)
    viewer.scene.requestRender()
  }

  // ======================== 距离测量模块 ========================

  /**
   * 获取距离测量预览线段的完整位置列表
   * 通过 CallbackProperty 动态调用，实现线段末端跟随鼠标移动的效果
   *
   * @returns {Cesium.Cartesian3[]} 包含浮动点的完整位置数组
   */
  const getDistancePositions = () => {
    return mousePosition ? [...activePoints, mousePosition] : [...activePoints]
  }

  /**
   * 距离测量 - 左键点击处理
   *
   * 第一次点击：设置起点，创建预览线段和浮动点
   * 第二次点击：设置终点，计算距离，生成结果实体（标记点、连线、标签）
   *
   * 设计要点：结果实体（标记点、连线、标签）不加入 tempEntities，
   * 确保测量完成后仍然保留显示，只有 clearAll 或 stopCurrentMode 才会清理
   *
   * @param {Object} event - Cesium 屏幕空间事件对象
   */
  const onDistanceLeftClick = (event) => {
    const pos = getPosition(event.position)
    if (!pos) {
      statusCallback('无法获取坐标，请重试')
      return
    }

    activePoints.push(pos)

    if (activePoints.length === 1) {
      // 第一个点：添加起点标记，创建动态预览线段和浮动点
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
      statusCallback('距离测量：点击添加终点，右键取消')
    } else {
      // 第二个点：完成测量，生成最终结果实体
      addMarkerPoint(pos, Cesium.Color.RED)

      const distance = Cesium.Cartesian3.distance(activePoints[0], activePoints[1])

      // 最终连线（固定坐标，不再跟随鼠标）
      viewer.entities.add({
        polyline: {
          positions: [activePoints[0], activePoints[1]],
          width: 3,
          material: Cesium.Color.CYAN,
          clampToGround: true
        }
      })

      // 距离标签（位于连线中点上方）
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

      statusCallback(`距离测量完成：${formatDistance(distance)}`)
      cleanupInteraction()
      currentMode = 'none'
    }

    viewer.scene.requestRender()
  }

  /**
   * 启动距离测量模式
   *
   * 操作流程：点击添加起点 → 预览线段跟随鼠标 → 再次点击完成
   * 右键在只有起点时取消测量
   */
  const startDistanceMeasure = () => {
    cleanupInteraction()
    currentMode = 'distance'
    viewer.scene.canvas.style.cursor = 'crosshair'
    statusCallback('距离测量：点击添加起点')

    handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    handler.setInputAction(onDistanceLeftClick, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    handler.setInputAction(onMouseMove, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    // 右键取消：仅在已有起点但未完成时生效
    handler.setInputAction(() => {
      if (activePoints.length === 1) {
        statusCallback('距离测量已取消')
        cleanupInteraction()
        currentMode = 'none'
      }
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
  }

  // ======================== 面积测量模块 ========================

  /**
   * 获取面积测量预览多边形的层级数据
   * 通过 CallbackProperty 动态调用，实现多边形跟随鼠标变形的效果
   *
   * @returns {Cesium.PolygonHierarchy} 多边形层级（含浮动点）
   */
  const getAreaHierarchy = () => {
    const pts = mousePosition ? [...activePoints, mousePosition] : [...activePoints]
    return new Cesium.PolygonHierarchy(pts)
  }

  /**
   * 获取面积测量预览闭合边界线位置
   * 从最后一个顶点到起点的闭合线，确保多边形轮廓可视化
   *
   * @returns {Cesium.Cartesian3[]} 闭合的边界线坐标数组
   */
  const getAreaBoundaryPositions = () => {
    const pts = mousePosition ? [...activePoints, mousePosition] : [...activePoints]
    return pts.length >= 2 ? [...pts, pts[0]] : pts
  }

  /**
   * 创建面积测量的动态预览实体
   * 包含半透明填充多边形和绿色边界线，提供实时面积形状预览
   * 仅在添加第二个顶点后创建（需要至少两点才能形成可见形状）
   */
  const createAreaPreviewShape = () => {
    if (activeShape) return

    activeShape = viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.CallbackProperty(getAreaHierarchy, false),
        material: Cesium.Color.GREEN.withAlpha(0.3),
        outline: true,
        outlineColor: Cesium.Color.GREEN,
        outlineWidth: 2,
        arcType: Cesium.ArcType.RHUMB
      },
      polyline: {
        positions: new Cesium.CallbackProperty(getAreaBoundaryPositions, false),
        width: 2,
        material: Cesium.Color.GREEN,
        clampToGround: true
      }
    })
  }

  /**
   * 面积测量 - 左键点击处理
   *
   * 每次点击添加一个顶点，第二个顶点后开始显示多边形预览。
   * 顶点标记和浮动点加入临时实体集合，以便取消时清理。
   *
   * @param {Object} event - Cesium 屏幕空间事件对象
   */
  const onAreaLeftClick = (event) => {
    const pos = getPosition(event.position)
    if (!pos) {
      statusCallback('无法获取坐标，请重试')
      return
    }

    // 添加顶点标记点（临时实体）
    const point = viewer.entities.add({
      position: pos,
      point: {
        pixelSize: 6,
        color: Cesium.Color.WHITE
      }
    })
    tempEntities.add(point.id)

    activePoints.push(pos)

    // 更新或创建浮动点
    if (floatingPoint) {
      floatingPoint.position = new Cesium.ConstantPositionProperty(pos)
    } else {
      floatingPoint = createFloatingPoint(pos)
    }

    // 第二个顶点后开始显示多边形预览
    if (activePoints.length >= 2) {
      createAreaPreviewShape()
    }

    statusCallback(`面积测量：已添加 ${activePoints.length} 个顶点（≥3 后可完成）`)
    viewer.scene.requestRender()
  }

  /**
   * 完成面积测量，生成最终多边形和面积标签
   *
   * 要求至少 3 个顶点才能构成有效多边形。
   * 使用 Chamberlain-Duquette 球面公式计算面积，与 turf.area 算法一致。
   *
   * @returns {boolean} 是否成功完成（顶点不足 3 个时返回 false）
   */
  const finishAreaMeasure = () => {
    if (activePoints.length < 3) {
      statusCallback('至少需要 3 个顶点才能构成多边形')
      return false
    }

    const finalPoints = [...activePoints]
    const area = calculateArea(finalPoints)

    // 最终多边形实体（固定坐标，不再跟随鼠标）
    viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(finalPoints),
        material: Cesium.Color.GREEN.withAlpha(0.3),
        outline: true,
        outlineColor: Cesium.Color.GREEN,
        outlineWidth: 2,
        arcType: Cesium.ArcType.RHUMB
      }
    })

    // 面积标签（位于多边形中心上方）
    const center = Cesium.BoundingSphere.fromPoints(finalPoints).center
    viewer.entities.add({
      position: center,
      label: {
        text: formatArea(area),
        font: '16px 微软雅黑',
        fillColor: Cesium.Color.RED,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        pixelOffset: new Cesium.Cartesian2(0, -20)
      }
    })

    statusCallback(`面积测量完成：${formatArea(area)}`)
    cleanupInteraction()
    currentMode = 'none'
    viewer.scene.requestRender()
    return true
  }

  /**
   * 取消面积测量，清除所有临时绘制内容
   */
  const cancelAreaMeasure = () => {
    statusCallback('面积测量已取消')
    cleanupInteraction()
    currentMode = 'none'
  }

  /**
   * 面积测量 - 键盘事件处理
   * Enter 完成 | Escape 取消
   *
   * @param {KeyboardEvent} e - 键盘事件对象
   */
  const onAreaKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      finishAreaMeasure()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelAreaMeasure()
    }
  }

  /**
   * 使用 Chamberlain-Duquette 球面公式计算环形区域面积
   * 该算法考虑了地球曲率，在大范围多边形上比平面投影算法更精确
   *
   * @param {number[][]} coords - 经纬度坐标数组 [[lon, lat], ...]，首尾不需要闭合
   * @returns {number} 面积（平方米）
   */
  const ringArea = (coords) => {
    const len = coords.length
    if (len <= 2) return 0

    const R = 6378137 // WGS-84 地球长半轴（米）
    let area = 0

    for (let i = 0; i < len; i++) {
      const p1 = coords[i]
      const p2 = coords[(i + 1) % len]
      const p3 = coords[(i + 2) % len]

      area += (toRad(p3[0]) - toRad(p1[0])) * Math.sin(toRad(p2[1]))
    }

    return Math.abs(area * R * R / 2)
  }

  /**
   * 计算多边形面积（平方米）
   * 将笛卡尔坐标转为经纬度后，使用 Chamberlain-Duquette 球面公式计算
   *
   * @param {Cesium.Cartesian3[]} positions - 顶点坐标数组
   * @returns {number} 面积（平方米）
   */
  const calculateArea = (positions) => {
    if (positions.length < 3) return 0

    const coordinates = positions.map((pos) => {
      const cartographic = Cesium.Cartographic.fromCartesian(pos)
      return [
        Cesium.Math.toDegrees(cartographic.longitude),
        Cesium.Math.toDegrees(cartographic.latitude)
      ]
    })
    coordinates.push(coordinates[0]) // 闭合环

    return ringArea(coordinates)
  }

  /**
   * 面积测量 - 双击完成处理
   * 双击时会先触发两次单击（添加一个顶点），然后触发双击事件完成测量
   *
   * @param {Object} event - Cesium 屏幕空间事件对象
   */
  const onAreaDoubleClick = (event) => {
    finishAreaMeasure()
  }

  /**
   * 启动面积测量模式
   *
   * 操作流程：点击添加顶点 → 多边形实时预览 → Enter / 右键 / 双击完成 | Esc 取消
   * 支持三种完成方式：
   * - Enter 键：通过键盘完成
   * - 右键：通过鼠标右键完成（需 ≥3 个顶点）
   * - 双击：快速完成（最后一个双击点会额外添加一个顶点）
   */
  const startAreaMeasure = () => {
    cleanupInteraction()
    currentMode = 'area'
    viewer.scene.canvas.style.cursor = 'crosshair'
    statusCallback('面积测量：点击添加顶点，Enter / 右键 / 双击完成，Esc 取消')

    window.addEventListener('keydown', onAreaKeyDown)
    currentKeyDownHandler = onAreaKeyDown

    handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    handler.setInputAction(onAreaLeftClick, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    handler.setInputAction(onMouseMove, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    handler.setInputAction(finishAreaMeasure, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    handler.setInputAction(onAreaDoubleClick, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
  }

  // ======================== 高度测量模块 ========================

  /**
   * 高度测量 - 左键点击处理
   *
   * 第一次点击：设置起点，显示该点的高度信息
   * 第二次点击：设置终点，计算两点间的地形高差，生成连接线和高差标签
   *
   * 设计要点：结果实体不加入 tempEntities，避免被清理时误删
   *
   * @param {Object} event - Cesium 屏幕空间事件对象
   */
  const onHeightLeftClick = (event) => {
    const pos = getPosition(event.position)
    if (!pos) {
      statusCallback('无法获取坐标，请重试')
      return
    }

    activePoints.push(pos)

    const info = getPositionInfo(pos)
    const pointColor = activePoints.length === 1
      ? Cesium.Color.BLUE
      : Cesium.Color.ORANGE

    // 添加标记点（含高度标签）
    viewer.entities.add({
      position: pos,
      point: {
        pixelSize: 8,
        color: pointColor,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2
      },
      label: {
        text: `H: ${info.height}m`,
        font: '12px 微软雅黑',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        pixelOffset: new Cesium.Cartesian2(0, -15),
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    })

    if (activePoints.length === 1) {
      statusCallback('高度测量：点击选择终点')
    } else {
      // 第二个点：计算高差并生成结果
      const info1 = getPositionInfo(activePoints[0])
      const info2 = getPositionInfo(activePoints[1])
      const heightDiff = Math.abs(parseFloat(info1.height) - parseFloat(info2.height))

      // 连接线（不贴地，直线显示空间高差）
      viewer.entities.add({
        polyline: {
          positions: activePoints,
          width: 3,
          material: Cesium.Color.MAGENTA,
          clampToGround: false
        }
      })

      // 高差标签（位于连线中点上方）
      const midPos = Cesium.Cartesian3.lerp(activePoints[0], activePoints[1], 0.5, new Cesium.Cartesian3())
      viewer.entities.add({
        position: midPos,
        label: {
          text: `高差: ${heightDiff.toFixed(2)}m`,
          font: '16px 微软雅黑',
          fillColor: Cesium.Color.MAGENTA,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          pixelOffset: new Cesium.Cartesian2(0, -20)
        }
      })

      statusCallback(
        `高度测量完成：起点 ${info1.height}m，终点 ${info2.height}m，高差 ${heightDiff.toFixed(2)}m`
      )
      cleanupInteraction()
      currentMode = 'none'
    }

    viewer.scene.requestRender()
  }

  /**
   * 启动高度测量模式
   *
   * 操作流程：点击选择起点 → 再次点击选择终点 → 计算并显示地形高差
   */
  const startHeightMeasure = () => {
    cleanupInteraction()
    currentMode = 'height'
    viewer.scene.canvas.style.cursor = 'crosshair'
    statusCallback('高度测量：点击选择起点')

    handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    handler.setInputAction(onHeightLeftClick, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  }

  // ======================== 坐标拾取模块 ========================

  /**
   * 坐标拾取 - 左键点击处理
   * 在点击位置创建标记点，并显示经纬度和高度信息的标签
   *
   * @param {Object} event - Cesium 屏幕空间事件对象
   */
  const onCoordinateLeftClick = (event) => {
    const pos = getPosition(event.position)
    if (!pos) {
      statusCallback('无法获取坐标，请重试')
      return
    }

    const info = getPositionInfo(pos)
    if (!info) return

    // 坐标标记点（永久保留）
    viewer.entities.add({
      position: pos,
      point: {
        pixelSize: 6,
        color: Cesium.Color.YELLOW,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2
      },
      label: {
        text: `N${info.lat}° E${info.lon}°\nH:${info.height}m`,
        font: '12px 微软雅黑',
        fillColor: Cesium.Color.YELLOW,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        pixelOffset: new Cesium.Cartesian2(0, -20)
      }
    })

    statusCallback(`坐标：N${info.lat}° E${info.lon}°，高度：${info.height}m`)
    viewer.scene.requestRender()
  }

  /**
   * 启动坐标拾取模式
   *
   * 操作流程：点击地图任意位置查看经纬度和高度信息
   * 每次点击生成一个标记点和信息标签，可连续拾取多个坐标
   */
  const startCoordinatePick = () => {
    cleanupInteraction()
    currentMode = 'coordinate'
    viewer.scene.canvas.style.cursor = 'crosshair'
    statusCallback('坐标拾取：点击地图任意位置查看坐标')

    handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    handler.setInputAction(onCoordinateLeftClick, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  }

  // ======================== 返回公共 API ========================

  return {
    /** 启动距离测量模式 */
    startDistanceMeasure,
    /** 启动面积测量模式 */
    startAreaMeasure,
    /** 启动高度测量模式 */
    startHeightMeasure,
    /** 启动坐标拾取模式 */
    startCoordinatePick,
    /** 停止当前测量模式并清理交互状态 */
    stopCurrentMode,
    /** 清除所有测量结果 */
    clearAll
  }
}
