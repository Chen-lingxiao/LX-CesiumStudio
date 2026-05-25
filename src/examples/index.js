/**
 * examples/index.js - 示例配置与管理模块
 *
 * 功能说明：
 * 1. 加载示例组件和代码
 * 2. 提供示例列表
 *
 * 导出内容：
 * - examples: 示例列表数组
 */

import { extractCode } from '../utils/codeExtractor'

import ViewerBasic from './Basic/ViewerBasic.vue'
import viewerBasicCode from './Basic/ViewerBasic.vue?raw'
import CameraBasic from './Basic/CameraBasic.vue'
import cameraBasicCode from './Basic/CameraBasic.vue?raw'
import SceneBasic from './Basic/SceneBasic.vue'
import sceneBasicCode from './Basic/SceneBasic.vue?raw'
import GlobeBasic from './Basic/GlobeBasic.vue'
import globeBasicCode from './Basic/GlobeBasic.vue?raw'
// 影像
import OSMImagery from './Imagery/OSMImagery.vue'
import osmImageryCode from './Imagery/OSMImagery.vue?raw'
import MapboxImagery from './Imagery/MapboxImagery.vue'
import mapboxImageryCode from './Imagery/MapboxImagery.vue?raw'
// 地形
import TerrainBasic from './Terrain/TerrainBasic.vue'
import terrainBasicCode from './Terrain/TerrainBasic.vue?raw'
import TerrainCustom from './Terrain/TerrainCustom.vue'
import terrainCustomCode from './Terrain/TerrainCustom.vue?raw'
import TerrainElevationColor from './Terrain/TerrainElevationColor.vue'
import terrainElevationColorCode from './Terrain/TerrainElevationColor.vue?raw'
// 实体
import BasicEntity from './Entity/BasicEntity.vue'
import basicEntityCode from './Entity/BasicEntity.vue?raw'
import PointEntity from './Entity/PointEntity.vue'
import pointEntityCode from './Entity/PointEntity.vue?raw'
import PolylineEntity from './Entity/PolylineEntity.vue'
import polylineEntityCode from './Entity/PolylineEntity.vue?raw'
import PolygonEntity from './Entity/PolygonEntity.vue'
import polygonEntityCode from './Entity/PolygonEntity.vue?raw'
import ModelEntity from './Entity/ModelEntity.vue'
import modelEntityCode from './Entity/ModelEntity.vue?raw'
// 数据源
import GeoJsonDataSource from './DataSource/GeoJsonDataSource.vue'
import geoJsonDataSourceCode from './DataSource/GeoJsonDataSource.vue?raw'
import KmlDataSource from './DataSource/KmlDataSource.vue'
import kmlDataSourceCode from './DataSource/KmlDataSource.vue?raw'
// 交互
import DrawTool from './Interaction/DrawTool.vue'
import drawToolCode from './Interaction/DrawTool.vue?raw'
import DrawPoint from './Interaction/DrawPoint.vue'
import drawPointCode from './Interaction/DrawPoint.vue?raw'
import DrawPolyline from './Interaction/DrawPolyline.vue'
import drawPolylineCode from './Interaction/DrawPolyline.vue?raw'
import DrawPolygon from './Interaction/DrawPolygon.vue'
import drawPolygonCode from './Interaction/DrawPolygon.vue?raw'
// 测量
import MeasureTool from './Interaction/MeasureTool.vue'
import measureToolCode from './Interaction/MeasureTool.vue?raw'
import DistanceMeasure from './Interaction/DistanceMeasure.vue'
import distanceMeasureCode from './Interaction/DistanceMeasure.vue?raw'
import AreaMeasure from './Interaction/AreaMeasure.vue'
import areaMeasureCode from './Interaction/AreaMeasure.vue?raw'
import HeightMeasure from './Interaction/HeightMeasure.vue'
import heightMeasureCode from './Interaction/HeightMeasure.vue?raw'
import CoordinatePick from './Interaction/CoordinatePick.vue'
import coordinatePickCode from './Interaction/CoordinatePick.vue?raw'
// 分析
import SpatialAnaysis from './SpatialAnalysis/SpatialAnaysis.vue'
import spatialAnaysisCode from './SpatialAnalysis/SpatialAnaysis.vue?raw'
import SectionAnalysis from './SpatialAnalysis/SectionAnalysis.vue'
import sectionAnalysisCode from './SpatialAnalysis/SectionAnalysis.vue?raw'
import AspectAnalysis from './SpatialAnalysis/AspectAnalysis.vue'
import aspectAnalysisCode from './SpatialAnalysis/AspectAnalysis.vue?raw'
import VolumeAnalysis from './SpatialAnalysis/VolumeAnalysis.vue'
import volumeAnalysisCode from './SpatialAnalysis/VolumeAnalysis.vue?raw'
import VisibilityAnalysis from './SpatialAnalysis/VisibilityAnalysis.vue'
import visibilityAnalysisCode from './SpatialAnalysis/VisibilityAnalysis.vue?raw'

/**
 * 示例列表
 * @type {Array<Object>}
 */
export const examples = [
  {
    id: 'viewer-basic',
    name: 'Viewer 基础类',
    description: 'Cesium 应用的顶层容器类，封装 Scene、Camera、Globe、数据源及UI控件，提供声明式API简化三维应用开发',
    tags: ['Viewer', '基础类'],
    thumbnail: '/thumbnails/viewer-basic.png',
    component: ViewerBasic,
    ...extractCode(viewerBasicCode)
  },
  {
    id: 'camera-basic',
    name: 'Camera 基础类',
    description: '控制观察者视角的核心类，定义视锥体参数，实现场景导航、视角变换和飞行动画',
    tags: ['Camera', '基础类'],
    thumbnail: '/thumbnails/camera-basic.png',
    component: CameraBasic,
    ...extractCode(cameraBasicCode)
  },
  {
    id: 'scene-basic',
    name: 'Scene 基础类',
    description: '渲染管线核心类，管理所有可渲染对象（图元、实体、3D瓦片），协调帧更新和底层渲染流程',
    tags: ['Scene', '基础类'],
    thumbnail: '/thumbnails/scene-basic.png',
    component: SceneBasic,
    ...extractCode(sceneBasicCode)
  },
  {
    id: 'globe-basic',
    name: 'Globe 基础类',
    description: '地球模型核心类，定义地球的几何形状、椭球体参数、地表材质、地形渲染和光照效果',
    tags: ['Globe', '基础类'],
    thumbnail: '/thumbnails/globe-basic.png',
    component: GlobeBasic,
    ...extractCode(globeBasicCode)
  },
  {
    id: 'basic-entity',
    name: 'Entities 基础类',
    description: '创建基础的Cesium Viewer实例，演示如何添加包含点标记、广告牌和文字标签的完整实体对象',
    tags: ['Entities', '基础类'],
    thumbnail: '/thumbnails/basic-entity.png',
    component: BasicEntity,
    ...extractCode(basicEntityCode)
  },
  {
    id: 'point-entity',
    name: '点实体',
    description: '创建点实体对象，设置点的颜色、大小、高度参考和深度测试等属性',
    tags: ['Entities', 'Point'],
    thumbnail: '/thumbnails/point-entity.png',
    component: PointEntity,
    ...extractCode(pointEntityCode)
  },
  {
    id: 'polyline-entity',
    name: '折线实体',
    description: '创建折线实体对象，设置折线的宽度、颜色材质、是否贴地等属性',
    tags: ['Entities', 'Polyline'],
    thumbnail: '/thumbnails/polyline-entity.png',
    component: PolylineEntity,
    ...extractCode(polylineEntityCode)
  },
  {
    id: 'polygon-entity',
    name: '多边形实体',
    description: '创建多边形实体对象，设置多边形的颜色、大小、高度参考和深度测试等属性',
    tags: ['Entities', 'Polygon'],
    thumbnail: '/thumbnails/polygon-entity.png',
    component: PolygonEntity,
    ...extractCode(polygonEntityCode)
  },
  {
    id: 'model-entity',
    name: '模型实体',
    description: '创建模型实体对象，加载3D模型文件，设置模型的位置、旋转、缩放等属性',
    tags: ['Entities', 'Model'],
    thumbnail: '/thumbnails/model-entity.png',
    component: ModelEntity,
    ...extractCode(modelEntityCode)
  },
  {
    id: 'base-imagery',
    name: 'OpenStreetMap 影像',
    description: '添加OpenStreetMap影像图层',
    tags: ['Imagery', '影像', 'OpenStreetMap'],
    thumbnail: '/thumbnails/osm-imagery.png',
    component: OSMImagery,
    ...extractCode(osmImageryCode)
  },
  {
    id: 'mapbox-imagery',
    name: 'Mapbox 影像',
    description: '添加Mapbox影像图层',
    tags: ['Imagery', '影像', 'Mapbox'],
    thumbnail: '/thumbnails/mapbox-imagery.png',
    component: MapboxImagery,
    ...extractCode(mapboxImageryCode)
  },
  {
    id: 'terrain-basic',
    name: '地形基础',
    description: '添加基础地形图层',
    tags: ['Terrain', '基础'],
    thumbnail: '/thumbnails/terrain-basic.png',
    component: TerrainBasic,
    ...extractCode(terrainBasicCode)
  },
  {
    id: 'terrain-custom',
    name: '地形自定义',
    description: '添加自定义地形图层',
    tags: ['Terrain', '自定义'],
    thumbnail: '/thumbnails/terrain-custom.png',
    component: TerrainCustom,
    ...extractCode(terrainCustomCode)
  },
  {
    id: 'terrain-elevation-color',
    name: '地形高程分层设色',
    description: '根据地形高程分层设置颜色',
    tags: ['Terrain', '地形高程分层设色'],
    thumbnail: '/thumbnails/terrain-elevation-color.png',
    component: TerrainElevationColor,
    ...extractCode(terrainElevationColorCode)
  },
  // 数据源
  {
    id: 'geojson-data-source',
    name: 'GeoJSON 数据源',
    description: '加载GeoJSON数据，显示在地图上',
    tags: ['DataSource', 'GeoJSON'],
    thumbnail: '/thumbnails/geojson-data-source.png',
    component: GeoJsonDataSource,
    ...extractCode(geoJsonDataSourceCode)
  },
  {
    id: 'kml-data-source',
    name: 'KML 数据源',
    description: '加载KML数据，显示在地图上',
    tags: ['DataSource', 'KML'],
    thumbnail: '/thumbnails/kml-data-source.png',
    component: KmlDataSource,
    ...extractCode(kmlDataSourceCode)
  },
  {
    id: 'draw-tool',
    name: '绘制工具合集',
    description: '交互式绘制工具：使用 useCesiumDraw composable，支持点、线、多边形、矩形的绘制，左键添加顶点，右键完成绘制，支持清除所有绘制内容',
    tags: ['Interaction', '绘制'],
    thumbnail: '/thumbnails/draw-tool.png',
    component: DrawTool,
    ...extractCode(drawToolCode)
  },
  {
    id: 'draw-point',
    name: '绘制点',
    description: '交互式点绘制工具，点击地图添加点位，支持清除绘制内容',
    tags: ['Interaction', '绘制', 'Point'],
    thumbnail: '/thumbnails/draw-point.png',
    component: DrawPoint,
    ...extractCode(drawPointCode)
  },
  {
    id: 'draw-polyline',
    name: '绘制折线',
    description: '交互式折线绘制工具，点击添加顶点、右键完成绘制，支持清除',
    tags: ['Interaction', '绘制', 'Polyline'],
    thumbnail: '/thumbnails/draw-polyline.png',
    component: DrawPolyline,
    ...extractCode(drawPolylineCode)
  },
  {
    id: 'draw-polygon',
    name: '绘制多边形',
    description: '交互式多边形绘制工具，点击添加顶点、右键闭合绘制，支持清除',
    tags: ['Interaction', '绘制', 'Polygon'],
    thumbnail: '/thumbnails/draw-polygon.png',
    component: DrawPolygon,
    ...extractCode(drawPolygonCode)
  },
  {
    id: 'measure-tool',
    name: '测量工具合集',
    description: '交互式测量工具：使用 useMeasurement composable，支持距离测量、面积测量、高度测量和坐标拾取',
    tags: ['Interaction', '测量'],
    thumbnail: '/thumbnails/measure-tool.png',
    component: MeasureTool,
    ...extractCode(measureToolCode)
  },
  {
    id: 'distance-measure',
    name: '距离测量',
    description: '独立实现的距离测量示例：点击添加两点，计算并显示两点间距离',
    tags: ['Interaction', '测量', '距离'],
    thumbnail: '/thumbnails/distance-measure.png',
    component: DistanceMeasure,
    ...extractCode(distanceMeasureCode)
  },
  {
    id: 'area-measure',
    name: '面积测量',
    description: '独立实现的面积测量示例：点击添加顶点（至少3个），右键完成，计算面积',
    tags: ['Interaction', '测量', '面积'],
    thumbnail: '/thumbnails/area-measure.png',
    component: AreaMeasure,
    ...extractCode(areaMeasureCode)
  },
  {
    id: 'height-measure',
    name: '高度测量',
    description: '独立实现的高度测量示例：点击选择两点，计算地形高度差',
    tags: ['Interaction', '测量', '高度'],
    thumbnail: '/thumbnails/height-measure.png',  
    component: HeightMeasure,
    ...extractCode(heightMeasureCode)
  },
  {
    id: 'coordinate-pick',
    name: '坐标拾取',
    description: '独立实现的坐标拾取示例：点击地图显示经纬度和高度信息',
    tags: ['Interaction', '测量', '坐标'],
    thumbnail: '/thumbnails/coordinate-pick.png',
    component: CoordinatePick,
    ...extractCode(coordinatePickCode)
  },
  {
    id: 'spatial-analysis',
    name: '空间分析合集',
    description: '独立实现的空间分析示例：点击地图显示空间分析结果',
    tags: ['SpatialAnalysis', '空间分析'],
    thumbnail: '/thumbnails/spatial-analysis.png',
    component: SpatialAnaysis,
    ...extractCode(spatialAnaysisCode)
  },
  {
    id: 'section-analysis',
    name: '剖面分析',
    description: '独立实现的剖面分析示例：点击地图显示剖面分析结果',
    tags: ['SpatialAnalysis', '空间分析', '剖面分析'],
    thumbnail: '/thumbnails/section-analysis.png',
    component: SectionAnalysis,
    ...extractCode(sectionAnalysisCode)
  },
  {
    id: 'aspect-analysis',
    name: '坡向分析',
    description: '独立实现的坡向分析示例：点击地图显示坡向分析结果',
    tags: ['SpatialAnalysis', '空间分析', '坡向分析'],
    thumbnail: '/thumbnails/aspect-analysis.png',
    component: AspectAnalysis,
    ...extractCode(aspectAnalysisCode)
  },
  {
    id: 'volume-analysis',
    name: '方量分析',
    description: '独立实现的方量分析示例：点击地图显示方量分析结果',
    tags: ['SpatialAnalysis', '空间分析', '方量分析'],
    thumbnail: '/thumbnails/volume-analysis.png',
    component: VolumeAnalysis,
    ...extractCode(volumeAnalysisCode)
  },
  {
    id: 'visibility-analysis',
    name: '可见性分析',
    description: '独立实现的可见性分析示例：点击地图显示可见性分析结果',
    tags: ['SpatialAnalysis', '空间分析', '可见性分析'],
    thumbnail: '/thumbnails/visibility-analysis.png',
    component: VisibilityAnalysis,
    ...extractCode(visibilityAnalysisCode)
  }
]



