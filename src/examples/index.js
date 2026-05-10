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

import BasicEntity from './Entity/BasicEntity.vue'
import basicEntityCode from './Entity/BasicEntity.vue?raw'
// import PointEntity from './Entity/PointEntity.vue'
// import pointEntityCode from './Entity/PointEntity.vue?raw'
// import PolylineEntity from './Entity/PolylineEntity.vue'
// import polylineEntityCode from './Entity/PolylineEntity.vue?raw'
import CameraBasic from './Basic/CameraBasic.vue'
import cameraBasicCode from './Basic/CameraBasic.vue?raw'

import OSMImagery from './Imagery/OSMImagery.vue'
import osmImageryCode from './Imagery/OSMImagery.vue?raw'
import BasicCesium from './Basic/BasicCesium.vue'
import basicCesiumCode from './Basic/BasicCesium.vue?raw'


/**
 * 示例列表
 * @type {Array<Object>}
 */
export const examples = [
  {
    id: 'basic-cesium',
    name: 'Cesium 基础',
    description: '创建基础的Cesium Viewer并添加实体对象',
    tags: ['Basic', '基础'],
    thumbnail: '/thumbnails/basic-cesium.png',
    component: BasicCesium,
    ...extractCode(basicCesiumCode)
  },
  {
    id: 'camera-basic',
    name: '相机基础',
    description: '创建基础的Cesium Viewer并添加相机对象',
    tags: ['Camera', '基础'],
    thumbnail: '/thumbnails/camera-basic.png',
    component: CameraBasic,
    ...extractCode(cameraBasicCode)
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