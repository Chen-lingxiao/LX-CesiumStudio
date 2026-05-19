<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, nextTick } from 'vue'
import * as Cesium from 'cesium'
import * as echarts from 'echarts'
// import { GetFeaturesAPI } from '@/api/geoserver.ts'
import { CircleWaveMaterialProperty } from '@/composables/CircleWaveMaterial'
// ==================== 类型定义 ====================
/**
 * GeoJSON要素类型
 * 用于解析从GeoServer获取的消防栓数据
 */
interface GeoJsonFeature {
  properties: {
    FID: string // 要素ID
    Name: string // 消防栓名称/编号
    currentStatus: string // 当前状态(normal/error/repairing)
    currentPressure: number // 当前压力值
    managementUnit: string // 管理单位
  }
}

/**
 * 消防栓数据类型
 * 用于存储和展示消防栓信息
 */
interface FireHydrantData {
  id: string // 消防栓ID
  name: string // 消防栓名称/编号
  status: string // 状态(normal/error/repairing)
  pressure: number // 压力值
  managementUnit: string // 管理单位
}

/**
 * 压力区间配置类型
 * 用于定义消防栓压力等级的区间和对应颜色
 */
interface PressureRange {
  label: string // 区间标签
  min: number // 最小值
  max: number // 最大值
  color: string // 对应颜色
}

/**
 * 控制面板状态类型
 * 用于管理电子围栏的配置参数
 */
interface ControlState {
  color: string // 围栏颜色
  speed: number // 流动速度
  height: number // 围栏高度
  opacity: number // 透明度
  showFence: boolean // 是否显示围栏
}

/**
 * 水波纹点控制面板状态类型
 * 用于管理水波纹点的配置参数
 */
interface RippleControlState {
  color: string // 波纹颜色
  speed: number // 流动速度
  size: number // 波纹大小
  count: number // 波纹数量
  showRipple: boolean // 是否显示波纹
}

/**
 * 流动光线控制面板状态类型
 * 用于管理流动光线的配置参数
 */
interface FlowLineControlState {
  color: string // 光线颜色
  speed: number // 流动速度
  intensity: number // 光线强度
  showFlowLine: boolean // 是否显示流动光线
}

/**
 * 预设颜色类型
 * 用于电子围栏颜色选择器的预设选项
 */
interface PresetColor {
  name: string // 颜色名称
  value: string // 颜色值(十六进制)
}

// ==================== 常量定义 ====================
/**
 * 环境变量配置
 * 从.env文件中读取的API令牌
 */
const cesiumToken = import.meta.env.VITE_CESIUM_TOKEN // Cesium Ion访问令牌
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN // Mapbox访问令牌

/**
 * Cesium配置
 * 设置默认访问令牌和地图样式
 */
Cesium.Ion.defaultAccessToken = cesiumToken // 设置Cesium Ion默认访问令牌
const mapboxStyleId = 'mapbox/dark-v11' // Mapbox底图样式ID

/**
 * 压力区间配置（贴合消防栓实际压力标准）
 * 用于ECharts压力分布柱状图的显示
 */
const PRESSURE_RANGES: PressureRange[] = [
  { label: '<0.15', min: -Infinity, max: 0.15, color: '#ff4d4f' }, // 压力过低（红色）
  { label: '0.15-0.3', min: 0.15, max: 0.3, color: '#52c41a' }, // 正常压力（绿色）
  { label: '0.3-0.6', min: 0.3, max: 0.6, color: '#faad14' }, // 压力偏高（黄色）
  { label: '>0.6', min: 0.6, max: Infinity, color: '#e53935' }, // 压力过高（红色）
]

/**
 * 预设颜色选项
 * 用于电子围栏颜色选择器的快速选择
 */
const presetColors: PresetColor[] = [
  { name: '青色', value: '#00FFFF' },
  { name: '红色', value: '#FF0000' },
  { name: '绿色', value: '#00FF00' },
  { name: '蓝色', value: '#0000FF' },
  { name: '黄色', value: '#FFFF00' },
  { name: '紫色', value: '#800080' },
  { name: '白色', value: '#FFFFFF' },
  { name: '橙色', value: '#FFA500' },
]
// let rippleManager: CircleWaveManager | null = null
// ==================== 响应式变量 ====================
/**
 * Cesium Viewer实例
 * 用于渲染3D地球场景
 */
const viewer = ref<Cesium.Viewer | null>(null)

/**
 * 全屏加载遮罩状态
 * 用于在Cesium初始化完成前显示加载界面
 */
const isLoading = ref(true)

/**
 * ECharts图表实例
 * 用于数据可视化展示
 */
const statusPieChart = ref<echarts.ECharts | null>(null) // 设备状态饼图
const pressureBarChart = ref<echarts.ECharts | null>(null) // 压力分布柱状图
const avgPressureLineChart = ref<echarts.ECharts | null>(null) // 平均压力变化折线图

/**
 * 消防栓数据
 * 按状态分类存储
 */
const normalFireHydrants = ref<FireHydrantData[]>([]) // 正常状态的消防栓
const errorFireHydrants = ref<FireHydrantData[]>([]) // 异常状态的消防栓
const repairingFireHydrants = ref<FireHydrantData[]>([]) // 维修中的消防栓

/**
 * ECharts数据
 * 用于图表渲染
 */
let statusPieData: { value: number; name: string }[] = [] // 状态饼图数据
let pressureBarData: {
  value: number
  name: string
  itemStyle: { color: string }
}[] = [] // 压力分布柱状图数据
const avgPressureLineData: { value: number; name: string }[] = [] // 平均压力变化折线图数据

/**
 * 弹窗状态
 * 控制消防栓信息弹窗的显示
 */
const showPopup = ref(false) // 弹窗显示状态
const selectedHydrant = ref<FireHydrantData | null>(null) // 当前选中的消防栓数据
const selectedHighlightEntity = ref<Cesium.Entity | null>(null) // 当前高亮的实体

/**
 * 控制面板显示状态
 */
const FancenPanelShow = ref(false) // 电子围栏面板显示状态
const RipplePanelShow = ref(false) // 水波纹点面板显示状态
const FlowLinePanelShow = ref(false) // 流动光线面板显示状态

/**
 * 电子围栏控制面板状态
 * 存储电子围栏的配置参数
 */
const controlState = ref<ControlState>({
  color: '#00FFFF', // 围栏颜色
  speed: 1.0, // 流动速度
  height: 100, // 围栏高度
  opacity: 0.3, // 透明度
  showFence: true, // 是否显示围栏
})

/**
 * 水波纹点控制面板状态
 * 存储水波纹点的配置参数
 */
const rippleControlState = ref<RippleControlState>({
  color: '#FF0000', // 波纹颜色
  speed: 3.0, // 流动速度
  size: 30, // 波纹大小
  count: 3, // 波纹数量
  showRipple: true, // 是否显示波纹
})

/**
 * 流动光线控制面板状态
 * 存储流动光线的配置参数
 */
const flowLineControlState = ref<FlowLineControlState>({
  color: '#52C41A', // 光线颜色
  speed: 1.0, // 流动速度
  intensity: 1.5, // 光线强度
  showFlowLine: true, // 是否显示流动光线
})

/**
 * 时钟DOM引用
 * 用于更新页面上的时间显示
 */
const dateRef = ref<HTMLElement | null>(null) // 日期显示DOM
const dayRef = ref<HTMLElement | null>(null) // 星期显示DOM
const timeRef = ref<HTMLElement | null>(null) // 时间显示DOM

// ==================== 非响应式变量 ====================
/**
 * 地图底图Provider
 * 用于加载Mapbox底图瓦片
 */
const mapboxImageryProvider = new Cesium.UrlTemplateImageryProvider({
  url: `https://api.mapbox.com/styles/v1/${mapboxStyleId}/tiles/256/{z}/{x}/{y}?access_token=${mapboxToken}`, // Mapbox瓦片URL
  credit: '© Mapbox © OpenStreetMap contributors', // 版权信息
  tilingScheme: new Cesium.WebMercatorTilingScheme(), // 瓦片投影方案
  maximumLevel: 18, // 最大缩放级别
})

/**
 * 实体映射表
 * 用于存储消防栓名称到实体的映射，方便快速查找
 */
const entityMap = new Map<string, Cesium.Entity>()

/**
 * 数据源引用
 * 用于存储消防栓数据源，方便在重新加载时移除旧数据
 */
let hydrantDataSource: Cesium.GeoJsonDataSource | null = null

/**
 * 材质和动画相关
 * 用于流动线和电子围栏的视觉效果
 */
let flowMaterial: Cesium.Material | null = null // 材质实例：流量线
let wallMaterial: Cesium.Material | null = null // 材质实例：墙线
let polylineAnimationId: number | null = null // 动画ID：流量线
let wallanimationId: number | null = null // 动画ID：墙线
let polylinePrimitive: Cesium.Primitive | null = null // 原始实例：流量线
let wallPrimitive: Cesium.Primitive | null = null // 原始实例：墙线

/**
 * 定时器
 * 用于定期更新数据和UI
 */
let pressureLineChartInterval: number | null = null // 压力线图表定时器ID
let clockInterval: number | null = null // 时钟定时器ID

/**
 * 初始化Cesium Viewer
 * 创建并配置Cesium Viewer实例，设置各种参数和初始状态
 */
const initCesium = async (): Promise<void> => {
  // 创建Cesium Viewer实例，禁用不必要的UI组件
  viewer.value = new Cesium.Viewer('cesiumContainer', {
    animation: false, // 禁用动画控件
    timeline: false, // 禁用时间线控件
    baseLayerPicker: false, // 禁用底图选择器
    navigationHelpButton: false, // 禁用导航帮助按钮
    sceneModePicker: false, // 禁用场景模式选择器
    infoBox: false, // 禁用信息框
    vrButton: false, // 禁用VR按钮
    selectionIndicator: false, // 禁用选择指示器
  })

  viewer.value.scene.postProcessStages.fxaa.enabled = false // 禁用FXAA抗锯齿
  viewer.value.imageryLayers.addImageryProvider(mapboxImageryProvider) // 添加地图底图Provider

  initClickHandler() // 初始化点击事件处理器
  flyToInitialView() // 飞到初始视角
}

/**
 * 初始化点击事件处理器
 * 为Cesium场景添加点击事件监听，处理消防栓的点击操作
 */
const initClickHandler = (): void => {
  if (!viewer.value) return // 如果Viewer实例不存在，直接返回

  const handler = new Cesium.ScreenSpaceEventHandler(viewer.value.scene.canvas) // 创建屏幕空间事件处理器

  // 设置左键点击事件
  handler.setInputAction(
    (event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const pickedObjects = viewer.value?.scene.drillPick(event.position) || [] // 获取点击位置的对象
      let foundHydrant = false

      // 遍历点击到的对象，查找消防栓实体
      for (const picked of pickedObjects) {
        const entity = picked.id as Cesium.Entity | undefined
        if (entity && entity.properties && entity.properties.Name) {
          handleHydrantClick(entity) // 处理消防栓点击
          foundHydrant = true
          break
        }
      }

      if (!foundHydrant) {
        closePopup() // 如果没有点击到消防栓，关闭弹窗
      }
    },
    Cesium.ScreenSpaceEventType.LEFT_CLICK, // 左键点击事件
  )
}

/**
 * 处理消防栓点击事件
 * @param entity - 被点击的消防栓实体
 */
const handleHydrantClick = (entity: Cesium.Entity): void => {
  removeHightlight() // 移除之前的高亮效果
  addHightlight(entity) // 添加新的高亮效果

  const properties = entity.properties // 获取实体属性
  // 构建选中的消防栓数据
  selectedHydrant.value = {
    id: properties?.FID?.getValue(),
    name: properties?.Name?.getValue(),
    status: properties?.currentStatus?.getValue(),
    pressure: properties?.currentPressure?.getValue(),
    managementUnit: properties?.managementUnit?.getValue(),
  }

  showPopup.value = true // 显示消防栓信息弹窗

  const position = entity.position?.getValue(Cesium.JulianDate.now()) // 获取实体位置
  if (position) {
    flyToPosition(position) // 飞到消防栓位置
  }
}

/**
 * 飞到指定位置
 * @param position - 目标位置的Cartesian3坐标
 */
const flyToPosition = (position: Cesium.Cartesian3): void => {
  if (!viewer.value) return // 如果Viewer实例不存在，直接返回

  const cartographic = Cesium.Cartographic.fromCartesian(position) // 转换为地理坐标
  // 计算 elevated 位置，在原有高度基础上增加500米
  const elevatedPosition = Cesium.Cartesian3.fromRadians(
    cartographic.longitude,
    cartographic.latitude,
    cartographic.height + 500,
  )

  // 相机飞到目标位置
  viewer.value.camera.flyTo({
    destination: elevatedPosition, // 目标位置
    duration: 1.5, // 飞行持续时间（秒）
    orientation: {
      heading: Cesium.Math.toRadians(0.0), // 朝向（0度为正北）
      pitch: Cesium.Math.toRadians(-90.0), // 俯仰角（-90度为正下方）
      roll: 0.0, // 翻滚角
    },
  })
}

/**
 * 飞到初始视角
 * 设置相机初始位置，指向校园中心
 */
const flyToInitialView = (): void => {
  if (!viewer.value) return // 如果Viewer实例不存在，直接返回

  // 相机飞到初始位置（校园中心）
  viewer.value.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(117.1745, 36.6735, 600.0), // 目标位置（经纬度和高度）
    duration: 1.5, // 飞行持续时间（秒）
    orientation: {
      heading: Cesium.Math.toRadians(20.0), // 朝向
      pitch: Cesium.Math.toRadians(-30.0), // 俯仰角
      roll: 0.0, // 翻滚角
    },
    complete: () => {
      // 飞行完成后关闭加载遮罩
      isLoading.value = false
    },
  })
}

/**
 * 关闭弹窗
 * 关闭消防栓信息弹窗并移除高亮效果
 */
const closePopup = (): void => {
  showPopup.value = false // 隐藏弹窗
  removeHightlight() // 移除高亮效果
}

// ==================== 图层加载模块 ====================
/**
 * 获取GeoJSON数据
 * @param layerName - 图层名称
 * @returns GeoJSON数据对象
 */
const getGeojson = async (layerName: string) => {
  try {
    // 优先从本地文件加载数据
    const response = await fetch(`/static/GeoJSON/${layerName}.json`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    console.log(`从本地文件加载 ${layerName} 数据成功`)
    return data

    // 备用：如果本地文件加载失败，可以取消下面的注释使用 GeoServer API
    // const response = await GetFeaturesAPI(layerName)
    // return response
  } catch (error) {
    console.error('获取GeoJSON数据失败：', error) // 错误处理
  }
}

/**
 * 加载校园范围数据
 * @returns 校园范围的GeoJSON数据
 */
const loadCampusBoundaryData = async () => {
  try {
    const geojsonData = await getGeojson('sdjzdx_Boundary_Poly') // 获取校园边界数据
    if (geojsonData) {
      return geojsonData
    }
  } catch (error) {
    console.error('显示校园范围数据失败：', error) // 错误处理
  }
}

/**
 * 创建范围面
 * 加载并显示校园边界多边形
 */
const createRangeSurface = async (): Promise<void> => {
  const geojsonData = await loadCampusBoundaryData() // 获取校园边界数据
  if (geojsonData) {
    const dataSource = await Cesium.GeoJsonDataSource.load(geojsonData) // 加载为Cesium数据源
    dataSource.entities.values.forEach((entity) => {
      if (entity.polygon) {
        // 设置多边形材质和样式
        entity.polygon.material = new Cesium.ColorMaterialProperty(
          Cesium.Color.fromCssColorString('#1e88e5').withAlpha(0.25), // 半透明蓝色
        )
        entity.polygon.outline = new Cesium.ConstantProperty(true) // 显示轮廓
        entity.polygon.outlineColor = new Cesium.ConstantProperty(
          Cesium.Color.fromCssColorString('#64b5f6').withAlpha(0.8), // 轮廓颜色
        )
        entity.polygon.outlineWidth = new Cesium.ConstantProperty(2) // 轮廓宽度
      }
    })
    viewer.value?.dataSources.add(dataSource) // 添加到场景
  }
}

/**
 * 加载道路线数据
 * @returns 道路线的Cesium数据源
 */
const loadRoadData = async () => {
  try {
    const geojsonData = await getGeojson('sdjzdx_Road_Line') // 获取道路线数据
    if (geojsonData) {
      const dataSource = await Cesium.GeoJsonDataSource.load(geojsonData) // 加载为Cesium数据源
      return dataSource
    }
  } catch (error) {
    console.error('显示道路线数据失败：', error) // 错误处理
  }
}

/**
 * 创建流动线
 * 为道路线添加流动动画效果
 */
const createFlowLine = async (): Promise<void> => {
  const dataSource = await loadRoadData() // 获取道路线数据
  if (!dataSource || !viewer.value) return

  // 清理旧的流动线
  if (polylinePrimitive) {
    viewer.value.scene.primitives.remove(polylinePrimitive)
    polylinePrimitive = null
  }

  // 创建流动线材质
  flowMaterial = new Cesium.Material({
    fabric: {
      type: 'CustomMaterial',
      uniforms: {
        color: Cesium.Color.fromCssColorString(
          flowLineControlState.value.color,
        ).withAlpha(0.9), // 使用控制面板颜色
        time: 0.0, // 时间 uniforms
        intensity: flowLineControlState.value.intensity, // 光线强度
      },
      source: `
        uniform vec4 color;
        uniform float time;
        uniform float intensity;
        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);
          vec2 st = materialInput.st;
          float t = fract(st.s * 1.0 - time);
          float alpha = smoothstep(0.0, 1.0, t);
          material.diffuse = color.rgb;
          material.alpha = color.a * alpha;
          material.emission = color.rgb * intensity;
          return material;
        }
      `,
    },
    translucent: true,
  })

  // 创建几何实例
  const geometryInstances: Cesium.GeometryInstance[] = []
  dataSource.entities.values.forEach((entity) => {
    if (entity.polyline) {
      const position = entity.polyline.positions?.getValue() // 获取线位置
      const geometry = new Cesium.PolylineGeometry({
        positions: position,
        width: 1,
      })
      const instance = new Cesium.GeometryInstance({ geometry })
      geometryInstances.push(instance)
    }
  })

  // 创建外观
  const appearance = new Cesium.PolylineMaterialAppearance({
    material: flowMaterial,
  })

  // 创建原始实例并添加到场景
  polylinePrimitive = new Cesium.Primitive({
    geometryInstances: geometryInstances,
    appearance,
  })

  viewer.value.scene.primitives.add(polylinePrimitive)
  startLineMaterialAnimation() // 启动动画
}

/**
 * 启动流动线材质动画
 * 为流动线添加动态效果
 */
const startLineMaterialAnimation = (): void => {
  // 清理旧的动画
  if (polylineAnimationId) {
    cancelAnimationFrame(polylineAnimationId)
    polylineAnimationId = null
  }

  const startTime = Date.now()
  const duration = 1.0 / flowLineControlState.value.speed // 动画周期（秒），速度越快周期越短

  /**
   * 动画函数
   */
  const animate = (): void => {
    if (!viewer.value || viewer.value.isDestroyed() || !flowMaterial) return

    const now = Date.now()
    const elapsed = (now - startTime) / 1000
    const timeParam = (elapsed % duration) / duration // 计算时间参数
    flowMaterial.uniforms.time = timeParam // 更新材质时间 uniforms
    flowMaterial.uniforms.intensity = flowLineControlState.value.intensity // 更新光线强度

    polylineAnimationId = requestAnimationFrame(animate) // 继续动画
  }

  animate() // 启动动画
}

/**
 * 加载消防栓点数据
 * 加载并显示消防栓，根据状态设置不同的样式
 */

const loadFireHydrantData = async (): Promise<void> => {
  try {
    // 移除旧的消防栓数据源
    if (hydrantDataSource && viewer.value) {
      await viewer.value.dataSources.remove(hydrantDataSource)
      hydrantDataSource = null
      // 清空实体映射表
      entityMap.clear()
    }

    const geojsonData = await getGeojson('sdjzdx_FireHydranty_Point') // 获取消防栓数据
    if (geojsonData) {
      const dataSource = await Cesium.GeoJsonDataSource.load(geojsonData) // 加载为Cesium数据源
      dataSource.entities.values.forEach((entity) => {
        entity.billboard = undefined // 禁用默认广告牌
        entity.label = undefined // 禁用默认标签

        const currentStatus = entity.properties?.currentStatus.getValue() // 获取状态
        const name = entity.properties?.Name.getValue() // 获取名称
        const position = entity.position?.getValue(Cesium.JulianDate.now()) // 获取位置

        if (name) {
          entityMap.set(name, entity) // 添加到实体映射表
        }

        if (!position) return

        let pointColor = Cesium.Color.SKYBLUE // 默认颜色
        // let pulseColor = Cesium.Color.BLUE // 默认脉冲颜色

        // 根据状态设置颜色
        if (currentStatus === 'normal') {
          pointColor = Cesium.Color.LIMEGREEN // 正常状态为绿色
          // pulseColor = Cesium.Color.GREEN
        } else if (currentStatus === 'error') {
          pointColor = Cesium.Color.RED // 异常状态为红色
          // pulseColor = Cesium.Color.RED
        } else if (currentStatus === 'repairing') {
          pointColor = Cesium.Color.ORANGE // 维修状态为橙色
          // pulseColor = Cesium.Color.ORANGE
        }

        // 设置点样式
        entity.point = new Cesium.PointGraphics({
          color: pointColor,
          pixelSize: 8,
          outlineColor: pointColor,
          outlineWidth: 1,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        })

        // 为异常消防栓添加水波纹效果
        if (currentStatus === 'error' && rippleControlState.value.showRipple) {
          entity.ellipse = new Cesium.EllipseGraphics({
            semiMinorAxis: rippleControlState.value.size, // 椭圆半轴宽度
            semiMajorAxis: rippleControlState.value.size, // 椭圆半轴长度
            height: 0, // 椭圆高度
            material: new CircleWaveMaterialProperty({
              color: rippleControlState.value.color, // 波纹颜色
              duration: 1000 * rippleControlState.value.speed, // 波纹周期（毫秒）
              count: rippleControlState.value.count, // 波纹数量
            }),
          })
        } else {
          entity.ellipse = undefined // 禁用水波纹
        }

        // 为异常和维修状态的消防栓添加标签
        if (currentStatus === 'error' || currentStatus === 'repairing') {
          entity.label = new Cesium.LabelGraphics({
            showBackground: true,
            backgroundColor: pointColor.withAlpha(0.8),
            scale: 0.5,
            font: 'bold 32px sans-serif',
            text: name,
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 1,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -20),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          })
        }
      })

      viewer.value?.dataSources.add(dataSource) // 添加到场景
      hydrantDataSource = dataSource // 保存数据源引用
    }
  } catch (error) {
    console.error('显示消防栓点数据失败：', error) // 错误处理
  }
}

/**
 * 加载建筑物点数据
 * 加载并显示建筑物标签
 */
const loadBuildingPointData = async (): Promise<void> => {
  try {
    const geojsonData = await getGeojson('sdjzdx_Buildings_Point') // 获取建筑物数据
    if (geojsonData) {
      const dataSource = await Cesium.GeoJsonDataSource.load(geojsonData) // 加载为Cesium数据源
      dataSource.entities.values.forEach((entity) => {
        const name = entity.properties?.Name.getValue() // 获取建筑物名称
        entity.label = undefined // 禁用默认标签
        entity.billboard = undefined // 禁用默认广告牌
        // 设置自定义标签
        entity.label = new Cesium.LabelGraphics({
          showBackground: false,
          scale: 0.5,
          font: 'bold 32px sans-serif',
          text: name,
          pixelOffset: new Cesium.Cartesian2(0, -50), // 向上偏移
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        })
      })
      viewer.value?.dataSources.add(dataSource) // 添加到场景
    }
  } catch (error) {
    console.error('显示建筑物点数据失败：', error) // 错误处理
  }
}

/**
 * 加载3D Tiles图层
 * 加载并显示3D建筑物模型
 */
const load3DTilesLayer = async (): Promise<void> => {
  try {
    // 加载3D Tiles模型（从本地文件）
    const tileset = await Cesium.Cesium3DTileset.fromUrl(
      '/static/3dTiles/school/tileset.json',
      {
        maximumScreenSpaceError: 4, // 最大屏幕空间误差
        show: true, // 显示图层
      },
    )

    // 备用：如果本地文件加载失败，可以取消下面的注释使用原始路径
    // const tileset = await Cesium.Cesium3DTileset.fromUrl(
    //   '/output_tiles/tileset.json',
    //   {
    //     maximumScreenSpaceError: 4,
    //     show: true,
    //   },
    // )

    // 创建自定义着色器
    const customShader = new Cesium.CustomShader({
      fragmentShaderText: `
        void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
          vec3 positionMC = fsInput.attributes.positionMC;
          float heightFactor = positionMC.z * 0.02;
          material.diffuse = vec3(0.0, 1.0 - heightFactor, 1.0 - heightFactor * 0.6);
          float baseHeight = 0.0;
          float buildingHeight = 25.0;
          float glowWidth = 1.0;
          float moveSpeed = 300.0;
          float currentHeight = positionMC.z - baseHeight;
          float glowPosition = fract(czm_frameNumber / moveSpeed);
          float normalizedHeight = clamp(currentHeight / buildingHeight, 0.0, 1.0);
          float distanceToGlow = abs(normalizedHeight - glowPosition);
          float glowIntensity = 1.0 - smoothstep(0.0, glowWidth / buildingHeight, distanceToGlow);
          vec3 glowColor = vec3(0.0, 0.8, 1.0);
          material.diffuse = mix(material.diffuse, glowColor, glowIntensity * 0.9);
          material.diffuse += material.diffuse * glowIntensity * 1.0;
        }
      `,
    })

    tileset.customShader = customShader // 应用自定义着色器
    viewer.value?.scene.primitives.add(tileset) // 添加到场景
  } catch (error) {
    console.error('加载3D Tiles图层失败：', error) // 错误处理
  }
}

/**
 * 加载并显示所有图层
 * 按顺序加载各个图层
 */
const loadLayers = async (): Promise<void> => {
  await createRangeSurface() // 加载校园范围
  await loadRoadData() // 加载道路数据
  await loadBuildingPointData() // 加载建筑物数据
  await load3DTilesLayer() // 加载3D建筑物模型
  await loadFireHydrantData() // 加载消防栓数据
}

// ==================== 电子围栏模块 ====================
/**
 * 创建电子围栏
 * 根据校园边界数据创建动态电子围栏
 */
const createElectronicFence = async (): Promise<void> => {
  const geojsonData = await loadCampusBoundaryData() // 获取校园边界数据
  if (!geojsonData || !viewer.value) return

  // 清理旧的电子围栏
  if (wallPrimitive) {
    viewer.value.scene.primitives.remove(wallPrimitive)
    wallPrimitive = null
  }

  // 如果不显示围栏，直接返回
  if (!controlState.value.showFence) return

  // 处理坐标数据
  const coordinates = geojsonData.features[0].geometry.coordinates[0] // 获取边界坐标
  const degreesArray: number[] = []
  coordinates.forEach((coord: [number, number]) => {
    degreesArray.push(coord[0], coord[1]) // 转换为Cesium需要的格式
  })
  const fencePositions = Cesium.Cartesian3.fromDegreesArray(degreesArray) // 转换为笛卡尔坐标

  // 创建围栏材质
  wallMaterial = new Cesium.Material({
    fabric: {
      type: 'DynamicWall',
      uniforms: {
        color: Cesium.Color.fromCssColorString(
          controlState.value.color,
        ).withAlpha(controlState.value.opacity), // 围栏颜色
        speed: controlState.value.speed, // 动画速度
        time: 0.0, // 时间 uniforms
      },
      source: `
        uniform vec4 color;
        uniform float speed;
        uniform float time;
        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);
          vec2 st = materialInput.st;
          float timeParam = time;
          float position = fract(st.t - timeParam * speed);
          float glow = pow(position, 6.0);
          float baseAlpha = 0.1;
          material.diffuse = color.rgb;
          material.alpha = color.a * (glow + baseAlpha);
          material.emission = material.diffuse * 0.8;
          return material;
        }
      `,
    },
    translucent: true, // 半透明
  })

  // 设置围栏高度
  const minimumHeights = new Array(fencePositions.length).fill(0) // 最小高度
  const maximumHeights = new Array(fencePositions.length).fill(
    controlState.value.height, // 最大高度
  )

  // 创建围栏几何
  const wallGeometry = new Cesium.WallGeometry({
    positions: fencePositions,
    minimumHeights: minimumHeights,
    maximumHeights: maximumHeights,
  })

  // 创建几何实例
  const geometryInstance = new Cesium.GeometryInstance({
    geometry: wallGeometry,
  })

  // 创建外观
  const appearance = new Cesium.MaterialAppearance({
    material: wallMaterial,
    translucent: true,
  })

  // 创建原始实例
  wallPrimitive = new Cesium.Primitive({
    geometryInstances: geometryInstance,
    appearance: appearance,
    asynchronous: false, // 同步创建
  })

  // 添加到场景并启动动画
  viewer.value.scene.primitives.add(wallPrimitive)
  startWallMaterialAnimation()
}

/**
 * 启动电子围栏材质动画
 * 为电子围栏添加动态效果
 */
const startWallMaterialAnimation = (): void => {
  // 清理旧的动画
  if (wallanimationId) {
    cancelAnimationFrame(wallanimationId)
    wallanimationId = null
  }

  const startTime = Date.now()

  /**
   * 动画函数
   */
  const animate = (): void => {
    if (!viewer.value || viewer.value.isDestroyed() || !wallMaterial) return

    const now = Date.now()
    const elapsed = (now - startTime) / 1000 // 计算经过的时间
    wallMaterial.uniforms.time = elapsed // 更新材质时间 uniforms

    wallanimationId = requestAnimationFrame(animate) // 继续动画
  }

  animate() // 启动动画
}

/**
 * 更新电子围栏参数
 * @param paramType - 参数类型
 * @param value - 参数值（可选）
 */
const updateFenceParam = (
  paramType: 'color' | 'opacity' | 'height' | 'speed' | 'visibility',
  value?: string | number,
): void => {
  // 更新颜色参数
  if (paramType === 'color' && value) {
    controlState.value.color = value as string
  }

  // 实时更新材质参数（如果材质已存在）
  if (wallMaterial) {
    if (paramType === 'color' || paramType === 'opacity') {
      wallMaterial.uniforms.color = Cesium.Color.fromCssColorString(
        controlState.value.color,
      ).withAlpha(controlState.value.opacity) // 更新颜色和透明度
    } else if (paramType === 'speed' && value !== undefined) {
      wallMaterial.uniforms.speed = value as number // 更新动画速度
    }
  }

  // 对于需要重建围栏的参数（颜色、高度、可见性），重新创建电子围栏
  if (
    paramType === 'color' ||
    paramType === 'height' ||
    paramType === 'visibility'
  ) {
    createElectronicFence()
  }
}

/**
 * 更新电子围栏颜色
 */
const updateColor = (): void => {
  updateFenceParam('color') // 调用更新参数函数，更新颜色
}

/**
 * 更新电子围栏速度
 */
const updateSpeed = (): void => {
  updateFenceParam('speed', controlState.value.speed) // 调用更新参数函数，更新速度
}

/**
 * 更新电子围栏高度
 */
const updateHeight = (): void => {
  updateFenceParam('height') // 调用更新参数函数，更新高度
}

/**
 * 更新电子围栏透明度
 */
const updateOpacity = (): void => {
  updateFenceParam('color') // 调用更新参数函数，更新透明度（通过颜色参数一起更新）
}

/**
 * 切换电子围栏显示
 */
const toggleFence = (): void => {
  updateFenceParam('visibility') // 调用更新参数函数，切换围栏可见性
}

/**
 * 选择预设颜色
 * @param colorValue - 颜色值
 */
const selectPresetColor = (colorValue: string): void => {
  updateFenceParam('color', colorValue) // 调用更新参数函数，设置预设颜色
}

/**
 * 切换电子围栏面板
 */
const toggleFencePanel = (): void => {
  FancenPanelShow.value = !FancenPanelShow.value // 切换电子围栏面板显示状态
  RipplePanelShow.value = false // 关闭其他面板
  FlowLinePanelShow.value = false
}

/**
 * 切换水波纹点面板
 */
const toggleRipplePanel = (): void => {
  RipplePanelShow.value = !RipplePanelShow.value // 切换水波纹点面板显示状态
  FancenPanelShow.value = false // 关闭其他面板
  FlowLinePanelShow.value = false
}

/**
 * 切换流动光线面板
 */
const toggleFlowLinePanel = (): void => {
  FlowLinePanelShow.value = !FlowLinePanelShow.value // 切换流动光线面板显示状态
  FancenPanelShow.value = false // 关闭其他面板
  RipplePanelShow.value = false
}

/**
 * 更新水波纹点参数
 * @param paramType - 参数类型
 * @param value - 参数值（可选）
 */
const updateRippleParam = (
  paramType: 'color' | 'speed' | 'size' | 'count' | 'visibility',
  value?: string | number,
): void => {
  // 更新颜色参数
  if (paramType === 'color' && value) {
    rippleControlState.value.color = value as string
  }

  // 对于需要重建水波纹的参数，重新创建水波纹
  if (
    paramType === 'color' ||
    paramType === 'speed' ||
    paramType === 'size' ||
    paramType === 'count' ||
    paramType === 'visibility'
  ) {
    // 这里需要重新加载消防栓数据来应用新的水波纹参数
    loadFireHydrantData()
  }
}

/**
 * 更新水波纹点颜色
 */
const updateRippleColor = (): void => {
  updateRippleParam('color') // 调用更新参数函数，更新颜色
}

/**
 * 更新水波纹点速度
 */
const updateRippleSpeed = (): void => {
  updateRippleParam('speed', rippleControlState.value.speed) // 调用更新参数函数，更新速度
}

/**
 * 更新水波纹点大小
 */
const updateRippleSize = (): void => {
  updateRippleParam('size') // 调用更新参数函数，更新大小
}

/**
 * 更新水波纹点数量
 */
const updateRippleCount = (): void => {
  updateRippleParam('count') // 调用更新参数函数，更新数量
}

/**
 * 切换水波纹点显示
 */
const toggleRipple = (): void => {
  updateRippleParam('visibility') // 调用更新参数函数，切换水波纹可见性
}

/**
 * 选择水波纹点预设颜色
 * @param colorValue - 颜色值
 */
const selectRipplePresetColor = (colorValue: string): void => {
  updateRippleParam('color', colorValue) // 调用更新参数函数，设置预设颜色
}

/**
 * 更新流动光线参数
 * @param paramType - 参数类型
 * @param value - 参数值（可选）
 */
const updateFlowLineParam = (
  paramType: 'color' | 'speed' | 'intensity' | 'visibility',
  value?: string | number,
): void => {
  // 更新颜色参数
  if (paramType === 'color' && value) {
    flowLineControlState.value.color = value as string
  }

  // 实时更新材质参数（如果材质已存在）
  if (flowMaterial) {
    if (paramType === 'color' || paramType === 'intensity') {
      flowMaterial.uniforms.color = Cesium.Color.fromCssColorString(
        flowLineControlState.value.color,
      ).withAlpha(0.9) // 更新颜色
    } else if (paramType === 'speed' && value !== undefined) {
      // 流动光线的速度通过动画函数控制，这里需要重新启动动画
      startLineMaterialAnimation()
    }
  }

  // 对于需要重建流动光线的参数，重新创建流动光线
  if (
    paramType === 'color' ||
    paramType === 'intensity' ||
    paramType === 'visibility'
  ) {
    createFlowLine()
  }
}

/**
 * 更新流动光线颜色
 */
const updateFlowLineColor = (): void => {
  updateFlowLineParam('color') // 调用更新参数函数，更新颜色
}

/**
 * 更新流动光线速度
 */
const updateFlowLineSpeed = (): void => {
  updateFlowLineParam('speed', flowLineControlState.value.speed) // 调用更新参数函数，更新速度
}

/**
 * 更新流动光线强度
 */
const updateFlowLineIntensity = (): void => {
  updateFlowLineParam('intensity') // 调用更新参数函数，更新强度
}

/**
 * 切换流动光线显示
 */
const toggleFlowLine = (): void => {
  updateFlowLineParam('visibility') // 调用更新参数函数，切换流动光线可见性
}

/**
 * 选择流动光线预设颜色
 * @param colorValue - 颜色值
 */
const selectFlowLinePresetColor = (colorValue: string): void => {
  updateFlowLineParam('color', colorValue) // 调用更新参数函数，设置预设颜色
}

// ==================== 高亮模块 ====================
/**
 * 添加高亮效果
 * @param entity - 要高亮的实体
 */
const addHightlight = (entity: Cesium.Entity): void => {
  const position = entity.position?.getValue(Cesium.JulianDate.now()) // 获取实体位置
  if (position && viewer.value) {
    // 创建高亮实体
    const highlightEntity = new Cesium.Entity({
      position: position,
      point: new Cesium.PointGraphics({
        color: Cesium.Color.fromCssColorString('#339af0'), // 高亮颜色
        pixelSize: 32, // 点大小
        outlineColor: Cesium.Color.WHITE, // 轮廓颜色
        outlineWidth: 1, // 轮廓宽度
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND, // 高度参考
        disableDepthTestDistance: Number.POSITIVE_INFINITY, // 禁用深度测试
      }),
    })
    viewer.value.entities.add(highlightEntity) // 添加到场景
    selectedHighlightEntity.value = highlightEntity // 保存高亮实体引用
  }
}

/**
 * 移除高亮效果
 */
const removeHightlight = (): void => {
  if (selectedHighlightEntity.value && viewer.value) {
    viewer.value.entities.remove(selectedHighlightEntity.value) // 从场景中移除高亮实体
    selectedHighlightEntity.value = null // 清空高亮实体引用
  }
}

// ==================== ECharts模块 ====================
/**
 * 加载ECharts数据
 * 从GeoServer获取消防栓数据并处理为ECharts所需格式
 */
const loadEcharts = async (): Promise<void> => {
  try {
    const geojsonData = await getGeojson('sdjzdx_FireHydranty_Point') // 获取消防栓数据
    if (geojsonData) {
      // 处理数据格式
      const data = geojsonData.features.map((feature: GeoJsonFeature) => ({
        id: feature.properties.FID,
        name: feature.properties.Name,
        status: feature.properties.currentStatus,
        pressure: feature.properties.currentPressure,
        managementUnit: feature.properties.managementUnit,
      }))

      // 按状态过滤数据
      normalFireHydrants.value = data.filter(
        (item: FireHydrantData) => item.status === 'normal', // 正常状态
      )
      errorFireHydrants.value = data.filter(
        (item: FireHydrantData) => item.status === 'error', // 异常状态
      )
      repairingFireHydrants.value = data.filter(
        (item: FireHydrantData) => item.status === 'repairing', // 维修状态
      )

      // 准备饼图数据
      statusPieData = [
        { value: normalFireHydrants.value.length, name: '正常' },
        { value: errorFireHydrants.value.length, name: '异常' },
        { value: repairingFireHydrants.value.length, name: '维修' },
      ]

      // 准备柱状图数据
      pressureBarData = PRESSURE_RANGES.map((range) => {
        const filteredData = data.filter(
          (item: FireHydrantData) =>
            item.pressure >= range.min && item.pressure <= range.max, // 按压力范围过滤
        )
        return {
          value: filteredData.length,
          name: range.label,
          itemStyle: { color: range.color },
        }
      })

      // 计算平均压力并添加到折线图数据
      const avgPressure = (
        data.reduce(
          (acc: number, item: FireHydrantData) => acc + item.pressure,
          0,
        ) / data.length
      ).toFixed(2)
      avgPressureLineData.push({
        value: Number(avgPressure),
        name: new Date().toLocaleTimeString(),
      })

      // 清理旧的定时器
      if (pressureLineChartInterval) {
        clearInterval(pressureLineChartInterval)
      }

      // 设置定时器，每10秒更新一次折线图数据
      pressureLineChartInterval = window.setInterval(() => {
        const randomNum = Number((0.2 + Math.random() * (0.8 - 0.2)).toFixed(2)) // 生成随机压力值
        avgPressureLineData.push({
          value: randomNum,
          name: new Date().toLocaleTimeString(),
        })
        // 保持数据点数量不超过8个
        if (avgPressureLineData.length > 8) {
          avgPressureLineData.shift()
        }
        // 更新图表
        if (avgPressureLineChart.value) {
          avgPressureLineChart.value.setOption({
            xAxis: {
              data: avgPressureLineData.map((item) => item.name),
            },
            series: [
              {
                data: avgPressureLineData.map((item) => item.value),
              },
            ],
          })
        }
      }, 10000)
    }
  } catch (error) {
    console.error('加载消防栓点数据失败：', error) // 错误处理
  }
}

/**
 * 初始化设备状态数量饼图
 * @param data - 饼图数据
 */
const initStatusPieChart = (data: { value: number; name: string }[]): void => {
  const chartDom = document.getElementById('status-pie-chart') // 获取图表容器
  if (!chartDom) return

  statusPieChart.value = echarts.init(chartDom) // 初始化ECharts实例

  // 处理数据，确保有数据
  const processedData =
    data && data.length > 0
      ? data.map((item) => ({ value: item.value, name: item.name }))
      : [{ value: 0, name: '暂无数据' }]

  // 图表配置
  const option = {
    title: {
      text: '设备状态数量',
      left: 'center',
      textStyle: {
        fontSize: 14,
        color: '#ffffff',
      },
    },
    tooltip: {
      trigger: 'item',
      textStyle: {
        color: '#000000',
      },
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      textStyle: {
        fontSize: 12,
        color: '#ffffff',
      },
    },
    series: [
      {
        name: '设备状态',
        type: 'pie',
        radius: ['30%', '55%'], // 环形饼图
        data: processedData,
        color: ['#52c41a', '#ff0000', '#ffa500'], // 正常、异常、维修颜色
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        label: {
          color: '#ffffff',
        },
      },
    ],
  }

  statusPieChart.value.setOption(option) // 设置图表配置
}

/**
 * 初始化压力分布柱状图
 * @param data - 柱状图数据
 */
const initPressureBarChart = (
  data: { value: number; name: string; itemStyle: { color: string } }[],
): void => {
  const chartDom = document.getElementById('pressure-bar-chart') // 获取图表容器
  if (!chartDom) return

  pressureBarChart.value = echarts.init(chartDom) // 初始化ECharts实例

  // 处理数据，确保有数据
  const processedData =
    data && data.length > 0
      ? data
      : [{ value: 0, name: '暂无数据', itemStyle: { color: '#999999' } }]

  // 图表配置
  const option = {
    title: {
      text: '压力分布柱状图',
      left: 'center',
      textStyle: {
        fontSize: 14,
        color: '#ffffff',
      },
    },
    tooltip: {
      trigger: 'item',
      textStyle: {
        color: '#000000',
      },
    },
    xAxis: {
      type: 'category',
      data: processedData.map((item) => item.name),
      axisLabel: {
        fontSize: 10,
        color: '#ffffff',
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 10,
        color: '#ffffff',
      },
    },
    series: [
      {
        data: processedData.map((item) => ({
          value: item.value,
          itemStyle: item.itemStyle,
        })),
        type: 'bar',
        label: {
          show: true,
          position: 'top',
          color: '#ffffff',
        },
      },
    ],
  }

  pressureBarChart.value.setOption(option) // 设置图表配置
}

/**
 * 初始化平均压力变化折线图
 * @param data - 折线图数据
 */
const initPressureLineChart = (
  data: { value: number; name: string }[],
): void => {
  const chartDom = document.getElementById('avg-pressure-line-chart') // 获取图表容器
  if (!chartDom) return

  avgPressureLineChart.value = echarts.init(chartDom) // 初始化ECharts实例

  // 图表配置
  const option = {
    title: {
      text: '平均压力变化折线图',
      subtext: '(模拟数据)',
      left: 'center',
      textStyle: {
        fontSize: 14,
        color: '#ffffff',
      },
    },
    tooltip: {
      trigger: 'item',
      textStyle: {
        color: '#000000',
      },
    },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.name),
      axisLabel: {
        color: '#ffffff',
      },
    },
    yAxis: {
      type: 'value',
      name: '压力值 (MPa)',
      nameTextStyle: {
        color: '#ffffff',
      },
      axisLabel: {
        color: '#ffffff',
      },
    },
    series: [
      {
        data: data.map((item) => item.value),
        type: 'line',
        smooth: false,
        symbolSize: 8,
        label: {
          show: true,
          position: 'top',
          formatter: '{c} MPa', // 显示单位
          color: '#ffffff',
        },
        lineStyle: {
          color: '#ffffff',
        },
        itemStyle: {
          color: '#ffffff',
        },
      },
    ],
  }

  avgPressureLineChart.value.setOption(option) // 设置图表配置
}

/**
 * 初始化所有ECharts图表
 */
const initEcharts = (): void => {
  initStatusPieChart(statusPieData) // 初始化设备状态饼图
  initPressureBarChart(pressureBarData) // 初始化压力分布柱状图
  initPressureLineChart(avgPressureLineData) // 初始化平均压力变化折线图
}

/**
 * 处理窗口大小变化，调整ECharts
 */
const handleResize = (): void => {
  statusPieChart.value?.resize() // 调整设备状态饼图大小
  pressureBarChart.value?.resize() // 调整压力分布柱状图大小
  avgPressureLineChart.value?.resize() // 调整平均压力变化折线图大小
}

// ==================== 时钟模块 ====================
/**
 * 更新时钟显示
 * 更新日期、星期和时间显示
 */
const updateClock = (): void => {
  const now = new Date() // 获取当前时间
  const year = now.getFullYear() // 年份
  const month = String(now.getMonth() + 1).padStart(2, '0') // 月份（补零）
  const day = String(now.getDate()).padStart(2, '0') // 日期（补零）
  const days = [
    '星期日',
    '星期一',
    '星期二',
    '星期三',
    '星期四',
    '星期五',
    '星期六',
  ]
  const weekday = days[now.getDay()] // 星期
  const hours = String(now.getHours()).padStart(2, '0') // 小时（补零）
  const minutes = String(now.getMinutes()).padStart(2, '0') // 分钟（补零）
  const seconds = String(now.getSeconds()).padStart(2, '0') // 秒（补零）

  // 更新日期显示
  if (dateRef.value) {
    dateRef.value.innerText = `${year}年${month}月${day}日`
  }
  // 更新星期显示
  if (dayRef.value) {
    dayRef.value.innerText = `${weekday}`
  }
  // 更新时间显示
  if (timeRef.value) {
    timeRef.value.innerText = `${hours}:${minutes}:${seconds}`
  }
}

// ==================== 表格操作模块 ====================
/**
 * 处理表格查看按钮点击
 * @param row - 消防栓数据行
 */
const handleClick = (row: FireHydrantData): void => {
  console.log(row) // 打印行数据
  const entity = entityMap.get(row.name) // 根据名称获取实体
  if (entity && viewer.value) {
    handleHydrantClick(entity) // 处理消防栓点击事件
  } else {
    console.warn(`未找到name为 ${row.name} 的实体`) // 未找到实体时的警告
  }
}

// ==================== 资源清理模块 ====================
/**
 * 清理Cesium资源
 * 释放Cesium实例和相关定时器资源
 */
const destroyCesium = (): void => {
  // 销毁Cesium实例
  if (viewer.value) {
    viewer.value.destroy()
    viewer.value = null
  }

  // 清理压力折线图定时器
  if (pressureLineChartInterval) {
    clearInterval(pressureLineChartInterval)
    pressureLineChartInterval = null
  }
}

// ==================== 生命周期钩子 ====================
/**
 * 组件挂载
 * 初始化Cesium、加载图层、初始化图表等
 */
onMounted(async () => {
  await initCesium() // 初始化Cesium
  await loadLayers() // 加载所有图层
  await loadEcharts() // 加载ECharts数据

  await nextTick() // 等待DOM更新
  initEcharts() // 初始化ECharts图表

  updateClock() // 更新时钟显示
  await createElectronicFence() // 创建电子围栏
  await createFlowLine() // 创建流动线

  clockInterval = window.setInterval(updateClock, 1000) // 设置时钟定时器
  window.addEventListener('resize', handleResize) // 添加窗口大小变化监听
  // 2. 创建水波纹管理器（全局唯一）
  // rippleManager = new CircleWaveManager(viewer)
})

/**
 * 组件卸载
 * 清理所有资源和定时器
 */
onBeforeUnmount(() => {
  destroyCesium() // 清理Cesium资源

  // 清理时钟定时器
  if (clockInterval) {
    clearInterval(clockInterval)
  } // 销毁ECharts实例
  statusPieChart.value?.dispose()
  pressureBarChart.value?.dispose()
  avgPressureLineChart.value?.dispose()

  // 清理水波纹管理器
  // if (rippleManager) {
  //   rippleManager.destroy()
  //   rippleManager = null
  // }

  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="cesium-container">
    <!-- 全屏加载遮罩 -->
    <div v-if="isLoading" class="loading-mask">
      <div class="loading-spinner">
        <div class="spinner-circle"></div>
        <div class="spinner-text">地图加载中...</div>
      </div>
    </div>

    <div class="cesium-viewer" id="cesiumContainer"></div>

    <!-- 消防栓信息弹窗 -->
    <div v-if="showPopup && selectedHydrant" class="hydrant-popup">
      <div class="popup-content">
        <h3>消防栓信息</h3>
        <div class="info-row">
          <span class="label">编号:</span>
          <span class="value">{{ selectedHydrant.name }}</span>
        </div>
        <div class="info-row">
          <span class="label">状态:</span>
          <span class="value">{{ selectedHydrant.status }}</span>
        </div>
        <div class="info-row">
          <span class="label">压力:</span>
          <span class="value">{{ selectedHydrant.pressure }} MPa</span>
        </div>
        <div class="info-row">
          <span class="label">管理单位:</span>
          <span class="value">{{ selectedHydrant.managementUnit }}</span>
        </div>
        <button class="close-btn" @click="closePopup">×</button>
      </div>
    </div>

    <!-- 左侧信息面板 -->
    <div class="left-info">
      <div class="echarts-card">
        <div id="status-pie-chart" class="echarts-container"></div>
      </div>
      <div class="echarts-card">
        <div id="avg-pressure-line-chart" class="echarts-container"></div>
      </div>
      <div class="echarts-card">
        <div id="pressure-bar-chart" class="echarts-container"></div>
      </div>
    </div>

    <!-- 右侧信息面板 -->
    <div class="right-info">
      <div class="info-card">
        <h3>系统信息</h3>
        <div class="info-main">
          <div class="info-system">
            <div class="info-item">
              <p class="info-label">正常消防栓数量</p>
              <p class="info-value">{{ normalFireHydrants.length }}</p>
            </div>
            <div class="info-item">
              <p class="info-label">压力异常消防栓数量</p>
              <p class="info-value error">{{ errorFireHydrants.length }}</p>
            </div>
            <div class="info-item">
              <p class="info-label">维修中消防栓数量</p>
              <p class="info-value warning">
                {{ repairingFireHydrants.length }}
              </p>
            </div>
          </div>
          <div id="clock" class="info-time">
            <div id="date" ref="dateRef" class="date-text">2023年10月15日</div>
            <div id="day" ref="dayRef" class="day-text">星期日</div>
            <div id="time" ref="timeRef" class="time-text">12:00:00</div>
          </div>
        </div>
        <div class="control-btn">
          <el-button type="primary" @click="toggleFencePanel"
            >电子围栏控制面板</el-button
          >
          <el-button type="primary" @click="toggleRipplePanel"
            >水波纹点控制面板</el-button
          >
          <el-button type="primary" @click="toggleFlowLinePanel"
            >流动光线控制面板</el-button
          >
        </div>
      </div>
      <div class="table-card">
        <h3>故障消防栓列表</h3>
        <el-table :data="errorFireHydrants" style="width: 100%" height="230px">
          <el-table-column prop="name" label="编号" min-width="100" />
          <el-table-column
            prop="managementUnit"
            label="管理单位"
            min-width="100"
          />
          <el-table-column prop="pressure" label="MPa" min-width="50" />
          <el-table-column fixed="right" label="操作" min-width="50">
            <template #default="scope">
              <el-button
                link
                type="primary"
                size="small"
                @click="handleClick(scope.row)"
              >
                查看
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="table-card">
        <h3>维修消防栓信息</h3>
        <el-table
          :data="repairingFireHydrants"
          style="width: 100%"
          height="230px"
        >
          <el-table-column prop="name" label="编号" min-width="100" />
          <el-table-column
            prop="managementUnit"
            label="管理单位"
            min-width="100"
          />
          <el-table-column prop="pressure" label="MPa" min-width="50" />
          <el-table-column fixed="right" label="操作" min-width="50">
            <template #default="scope">
              <el-button
                link
                type="primary"
                size="small"
                @click="handleClick(scope.row)"
              >
                查看
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>

  <!-- 电子围栏控制面板 -->
  <div class="control-panel" v-if="FancenPanelShow">
    <div class="panel-header">
      <h3>电子围栏控制面板</h3>
      <button class="close-btn" @click="toggleFencePanel">×</button>
    </div>

    <div class="control-section">
      <h4>显示控制</h4>
      <div class="control-item">
        <label>
          <input
            type="checkbox"
            v-model="controlState.showFence"
            @change="toggleFence"
          />
          显示围栏
        </label>
      </div>
    </div>

    <div class="control-section">
      <h4>样式设置</h4>
      <div class="control-item">
        <label for="fence-color">颜色:</label>
        <input
          id="fence-color"
          type="color"
          v-model="controlState.color"
          @change="updateColor"
        />
      </div>

      <div class="control-item preset-colors">
        <label>预设颜色:</label>
        <div class="color-presets">
          <div
            v-for="color in presetColors"
            :key="color.value"
            class="color-preset"
            :style="{ backgroundColor: color.value }"
            :title="color.name"
            @click="selectPresetColor(color.value)"
          ></div>
        </div>
      </div>

      <div class="control-item">
        <label for="fence-opacity">透明度:</label>
        <input
          id="fence-opacity"
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          v-model.number="controlState.opacity"
          @input="updateOpacity"
        />
        <span>{{ controlState.opacity.toFixed(1) }}</span>
      </div>
    </div>

    <div class="control-section">
      <h4>围栏参数</h4>
      <div class="control-item">
        <label for="fence-height">墙体高度(m):</label>
        <input
          id="fence-height"
          type="range"
          min="10"
          max="500"
          step="10"
          v-model.number="controlState.height"
          @input="updateHeight"
        />
        <span>{{ controlState.height }}</span>
      </div>

      <div class="control-item">
        <label for="fence-speed">流动速度:</label>
        <input
          id="fence-speed"
          type="range"
          min="0.5"
          max="5"
          step="0.1"
          v-model.number="controlState.speed"
          @input="updateSpeed"
        />
        <span>{{ controlState.speed }}</span>
      </div>
    </div>
  </div>

  <!-- 水波纹点控制面板 -->
  <div class="control-panel" v-if="RipplePanelShow">
    <div class="panel-header">
      <h3>水波纹点控制面板</h3>
      <button class="close-btn" @click="toggleRipplePanel">×</button>
    </div>

    <div class="control-section">
      <h4>显示控制</h4>
      <div class="control-item">
        <label>
          <input
            type="checkbox"
            v-model="rippleControlState.showRipple"
            @change="toggleRipple"
          />
          显示水波纹
        </label>
      </div>
    </div>

    <div class="control-section">
      <h4>样式设置</h4>
      <div class="control-item">
        <label for="ripple-color">颜色:</label>
        <input
          id="ripple-color"
          type="color"
          v-model="rippleControlState.color"
          @change="updateRippleColor"
        />
      </div>

      <div class="control-item preset-colors">
        <label>预设颜色:</label>
        <div class="color-presets">
          <div
            v-for="color in presetColors"
            :key="color.value"
            class="color-preset"
            :style="{ backgroundColor: color.value }"
            :title="color.name"
            @click="selectRipplePresetColor(color.value)"
          ></div>
        </div>
      </div>
    </div>

    <div class="control-section">
      <h4>水波纹参数</h4>
      <div class="control-item">
        <label for="ripple-size">波纹大小:</label>
        <input
          id="ripple-size"
          type="range"
          min="10"
          max="100"
          step="5"
          v-model.number="rippleControlState.size"
          @input="updateRippleSize"
        />
        <span>{{ rippleControlState.size }}</span>
      </div>

      <div class="control-item">
        <label for="ripple-speed">流动速度:</label>
        <input
          id="ripple-speed"
          type="range"
          min="0.5"
          max="5"
          step="0.1"
          v-model.number="rippleControlState.speed"
          @input="updateRippleSpeed"
        />
        <span>{{ rippleControlState.speed }}</span>
      </div>

      <div class="control-item">
        <label for="ripple-count">波纹数量:</label>
        <input
          id="ripple-count"
          type="range"
          min="1"
          max="10"
          step="1"
          v-model.number="rippleControlState.count"
          @input="updateRippleCount"
        />
        <span>{{ rippleControlState.count }}</span>
      </div>
    </div>
  </div>

  <!-- 流动光线控制面板 -->
  <div class="control-panel" v-if="FlowLinePanelShow">
    <div class="panel-header">
      <h3>流动光线控制面板</h3>
      <button class="close-btn" @click="toggleFlowLinePanel">×</button>
    </div>

    <div class="control-section">
      <h4>显示控制</h4>
      <div class="control-item">
        <label>
          <input
            type="checkbox"
            v-model="flowLineControlState.showFlowLine"
            @change="toggleFlowLine"
          />
          显示流动光线
        </label>
      </div>
    </div>

    <div class="control-section">
      <h4>样式设置</h4>
      <div class="control-item">
        <label for="flowline-color">颜色:</label>
        <input
          id="flowline-color"
          type="color"
          v-model="flowLineControlState.color"
          @change="updateFlowLineColor"
        />
      </div>

      <div class="control-item preset-colors">
        <label>预设颜色:</label>
        <div class="color-presets">
          <div
            v-for="color in presetColors"
            :key="color.value"
            class="color-preset"
            :style="{ backgroundColor: color.value }"
            :title="color.name"
            @click="selectFlowLinePresetColor(color.value)"
          ></div>
        </div>
      </div>
    </div>

    <div class="control-section">
      <h4>光线参数</h4>
      <div class="control-item">
        <label for="flowline-speed">流动速度:</label>
        <input
          id="flowline-speed"
          type="range"
          min="0.5"
          max="5"
          step="0.1"
          v-model.number="flowLineControlState.speed"
          @input="updateFlowLineSpeed"
        />
        <span>{{ flowLineControlState.speed }}</span>
      </div>

      <div class="control-item">
        <label for="flowline-intensity">光线强度:</label>
        <input
          id="flowline-intensity"
          type="range"
          min="0.5"
          max="3"
          step="0.1"
          v-model.number="flowLineControlState.intensity"
          @input="updateFlowLineIntensity"
        />
        <span>{{ flowLineControlState.intensity.toFixed(1) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
// 基础变量
$card-padding: 16px;
$card-margin: 16px;
$primary-color: #00ffff;

// 主容器
.cesium-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;

  .cesium-viewer {
    width: 100%;
    height: 100%;
  }
}

// 全屏加载遮罩
.loading-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  background: linear-gradient(135deg, #000c1d 0%, #1a2a4a 50%, #000c1d 100%);
  display: flex;
  align-items: center;
  justify-content: center;

  .loading-spinner {
    text-align: center;

    .spinner-circle {
      width: 60px;
      height: 60px;
      margin: 0 auto 20px;
      border: 4px solid rgba(0, 255, 255, 0.2);
      border-top-color: #00ffff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .spinner-text {
      color: #00ffff;
      font-size: 18px;
      font-weight: 500;
      letter-spacing: 2px;
      animation: pulse 2s ease-in-out infinite;
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

// 左侧面板
.left-info {
  width: 400px;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
  background: linear-gradient(to right, #000c1d, #2740584d);
  border: 1px solid var(--card-border);
  display: flex;
  flex-direction: column;
  padding: $card-padding;
  box-sizing: border-box;
  gap: $card-margin;

  .echarts-card {
    flex: 1;
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    padding: 10px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    min-height: 0;

    .echarts-container {
      flex: 1;
      min-height: 280px;
      width: 100%;
    }
  }
}

// 右侧面板
.right-info {
  width: 400px;
  height: 100%;
  position: absolute;
  top: 0;
  right: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
  background: linear-gradient(to left, #000c1d, #2740584d);
  border: 1px solid var(--card-border);
  padding: $card-padding;
  box-sizing: border-box;
  color: white;
  display: flex;
  flex-direction: column;
  gap: $card-margin;

  .table-card,
  .info-card {
    flex: 1;
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    padding: $card-padding;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    min-height: 0;

    h3 {
      margin: 0 0 16px 0;
      color: white;
      font-size: 16px;
      font-weight: bold;
    }
  }

  .info-card {
    .info-main {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex: 1;
      padding: 0 $card-padding;
    }

    .info-system {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .info-label {
        margin: 0;
        color: #aaa;
        font-size: 14px;
      }

      .info-value {
        margin: 0;
        color: #fff;
        font-size: 20px;
        font-weight: bold;
      }

      .info-value.error {
        color: #ff4d4f;
      }

      .info-value.warning {
        color: #faad14;
      }
    }

    .info-time {
      text-align: center;
      min-width: 120px;

      .date-text {
        font-size: 20px;
        margin-bottom: 5px;
      }

      .day-text {
        font-size: 16px;
        margin-bottom: 10px;
      }

      .time-text {
        font-size: 32px;
        font-weight: bold;
        letter-spacing: 1px;
      }
    }

    .control-btn {
      position: absolute;
      top: 16px;
      right: 410px;
      text-align: center;
      padding: 0 $card-padding 0;
      .el-button {
        margin-bottom: 12px;
        margin-left: 0;
      }
    }
  }

  // Element UI 表格样式
  :deep(.el-table) {
    background-color: transparent;
    color: white;
    --el-table-header-bg-color: rgba(0, 0, 0, 0.3);
  }

  :deep(.el-table__body-wrapper) {
    background-color: rgba(0, 0, 0, 0.2);
  }

  :deep(.el-table th) {
    background-color: rgba(0, 0, 0, 0.3);
    color: white;
  }

  :deep(.el-table tr) {
    background-color: transparent;
    color: white;
  }

  :deep(.el-table .el-table__row:hover) {
    background-color: rgba(255, 255, 255, 0.1);
    color: #000c1d;
  }
}

// 消防栓弹窗
.hydrant-popup {
  position: absolute;
  top: 20%;
  right: 416px;
  transform: translate(-50%, -50%);
  background: #0b192748;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  padding: 20px;
  min-width: 280px;
  z-index: 1000;

  .popup-content h3 {
    margin: 0 0 16px 0;
    color: #fff;
    text-align: center;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f0f0f0;

    .label {
      font-weight: bold;
      color: #fff;
    }

    .value {
      color: #fff;
    }
  }

  .close-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 24px;
    height: 24px;
    background: #0b1927;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    text-align: center;
    line-height: 24px;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    background: #40a9ff;
  }
}

// 电子围栏控制面板
.control-panel {
  position: absolute;
  top: 70px;
  right: 416px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: $card-padding;
  border-radius: 8px;
  z-index: 1000;
  min-width: 280px;
  max-width: 320px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    color: $primary-color;
    font-size: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    padding-bottom: 12px;

    h3 {
      margin: 0;
      color: $primary-color;
      font-size: 16px;
    }

    .close-btn {
      width: 24px;
      height: 24px;
      background: rgba(0, 0, 0, 0.3);
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .control-section {
    margin-bottom: 24px;
  }

  .control-section h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #ccc;
  }

  .control-item {
    margin-bottom: 14px;
    display: flex;
    align-items: center;
  }

  .control-item label {
    width: 80px;
    font-size: 12px;
    color: #ddd;
  }

  .control-item input[type='color'] {
    height: 32px;
    width: 64px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    cursor: pointer;
    background: transparent;
  }

  .control-item input[type='range'] {
    flex: 1;
    margin: 0 12px;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    outline: none;
  }

  .control-item input[type='range']::-webkit-slider-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: $primary-color;
    cursor: pointer;
  }

  .control-item span {
    width: 44px;
    text-align: right;
    font-size: 12px;
    font-family: monospace;
  }

  .preset-colors {
    flex-direction: column;
    align-items: flex-start;
  }

  .color-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 6px;
  }

  .color-preset {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.2s ease;
  }

  .color-preset:hover {
    transform: scale(1.25);
    border-color: white;
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.6);
  }
}
</style>
