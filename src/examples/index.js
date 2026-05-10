/**
 * examples/index.js - 示例配置与管理模块
 * 
 * 功能说明：
 * 1. 定义示例分类
 * 2. 加载示例组件和代码
 * 3. 提供示例检索方法
 * 
 * 导出内容：
 * - categories: 示例分类数组
 * - examples: 示例列表数组
 * - getExamplesByCategory: 按分类获取示例
 * - getExampleById: 按ID获取示例
 */

import { extractCode } from './utils/codeExtractor'


import ViewerBasic from './Basic/ViewerBasic.vue'
import viewerBasicCode from './Basic/ViewerBasic.vue?raw'
import CameraBasic from './Basic/CameraBasic.vue'
import cameraBasicCode from './Basic/CameraBasic.vue?raw'
import SceneBasic from './Basic/SceneBasic.vue'
import sceneBasicCode from './Basic/SceneBasic.vue?raw'
import GlobeBasic from './Basic/GlobeBasic.vue'
import globeBasicCode from './Basic/GlobeBasic.vue?raw'

import OSMImagery from './Imagery/OSMImagery.vue'
import osmImageryCode from './Imagery/OSMImagery.vue?raw'
import BasicEntity from './Entity/BasicEntity.vue'
import basicEntityCode from './Entity/BasicEntity.vue?raw'

/**
 * 示例列表
 * @type {Array<Object>}
 */
export const examples = [
  {
    id: 'viewer-basic',
    name: 'Viewer 基础',
    description: 'Cesium 应用的顶层容器类，封装 Scene、Camera、Globe、数据源及UI控件，提供声明式API简化三维应用开发',
    tags: ['Viewer', '基础'],
    thumbnail: '/thumbnails/viewer-basic.png',
    component: ViewerBasic,
    ...extractCode(viewerBasicCode)
  },
  {
    id: 'camera-basic',
    name: 'Camera 基础',
    description: '控制观察者视角的核心类，定义视锥体参数，实现场景导航、视角变换和飞行动画',
    tags: ['Camera', '基础'],
    thumbnail: '/thumbnails/camera-basic.png',
    component: CameraBasic,
    ...extractCode(cameraBasicCode)
  },
  {
    id: 'scene-basic',
    name: 'Scene 基础',
    description: '渲染管线核心类，管理所有可渲染对象（图元、实体、3D瓦片），协调帧更新和底层渲染流程',
    tags: ['Scene', '基础'],
    thumbnail: '/thumbnails/scene-basic.png',
    component: SceneBasic,
    ...extractCode(sceneBasicCode)
  },
  {
    id: 'globe-basic',
    name: 'Globe 基础',
    description: '地球模型核心类，定义地球的几何形状、材质、光照效果等',
    tags: ['Globe', '基础'],
    thumbnail: '/thumbnails/globe-basic.png',
    component: GlobeBasic,
    ...extractCode(globeBasicCode)
  },
  {
    id: 'basic-entity',
    name: 'Entities 基础',
    description: '创建基础的Cesium Viewer并添加实体对象',
    tags: ['Entities', '基础'],
    thumbnail: '/thumbnails/basic-entity.png',
    component: BasicEntity,
    ...extractCode(basicEntityCode)
  },
  // {
  //   id: 'point-entity',
  //   name: '点实体',
  //   description: '创建基础的Cesium Viewer并添加点实体对象',
  //   tags: ['Entities', 'Point'],
  //   thumbnail: '/thumbnails/point-entity.png',
  //   component: PointEntity,
  //   ...extractCode(pointEntityCode)
  // },
  // {
  //   id: 'polyline-entity',
  //   name: '折线实体',
  //   description: '创建基础的Cesium Viewer并添加折线实体对象',
  //   tags: ['Entities', 'Polyline'],
  //   thumbnail: '/thumbnails/polyline-entity.png',
  //   component: PolylineEntity,
  //   ...extractCode(polylineEntityCode)
  // },
  {
    id: 'base-imagery',
    name: 'OpenStreetMap 影像',
    description: '添加OpenStreetMap影像图层',
    tags: ['Imagery', '影像', 'OpenStreetMap'],
    thumbnail: '/thumbnails/osm-imagery.png',
    component: OSMImagery,
    ...extractCode(osmImageryCode)
  }
]


/**
 * 按ID获取示例
 * @param {string} id - 示例ID
 * @returns {Object|undefined} 匹配的示例对象
 */
export const getExampleById = (id) => {
  return examples.find(e => e.id === id)
}