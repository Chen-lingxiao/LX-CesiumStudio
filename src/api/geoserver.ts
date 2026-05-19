import axios from 'axios' // 引入axios库
import type { Feature } from 'geojson'

// 图层固定信息（统一维护，避免硬编码）
const LAYER_INFO = {
  baseURL: '/geoserver', // GeoServer基础URL
  workspace: 'sdjzdx', // 工作区名称
  namespace: 'http://115.29.230.69/geoserver/sdjzdx', // 工作区命名空间（需与GeoServer一致）
  geomField: 'geom', // 几何字段名
}
// --------------------------wfs 服务------------------------------------
// 从GeoServer加载要素数据
/**
 * @param none
 * @returns GeoJSON.FeatureCollection
 */
export const GetFeaturesAPI = async (layerName: string) => {
  const url = `${LAYER_INFO.baseURL}/wfs`
  // WFS GetFeature请求参数
  const params = {
    service: 'WFS',
    version: '1.1.0',
    request: 'GetFeature',
    typeName: `${LAYER_INFO.workspace}:${layerName}`, // 图层名称，格式为 workspace:layerName
    outputFormat: 'application/json',
    srsName: 'urn:ogc:def:crs:EPSG::4326',
  }
  try {
    const response = await axios.get(url, { params })
    console.log('加载要素成功:', response.data)
    // 遍历循环，分割id 图层名.id --> 1
    response.data.features.forEach((feature: Feature) => {
      if (feature.id) {
        const idParts = String(feature.id).split('.')
        feature.id = idParts.length > 1 ? idParts[1] : feature.id
      }
    })
    return response.data
  } catch (error) {
    console.error('加载要素失败:', error)
    throw error
  }
}
//----------------------------wfs-t服务------------------------------------
/**
 * @param features 要素数据
 * @param operation 操作类型
 * @param layerName 图层名称
 * @returns
 */
export const EditPointFeaturesAPI = async (
  features: GeoJSON.Feature[], // 要素数据
  operation: 'addFeature' | 'update' | 'delete', // 操作类型
  layerName: string, // 图层名称
) => {
  if (!features || !features.length) {
    console.error('请提供有效的要素数据')
    return
  }
  const url = `${LAYER_INFO.baseURL}/wfs` // WFS-T服务地址
  let TransactionFragments = '' // 存储WFS-T事务片段
  switch (operation) {
    case 'addFeature': // 插入要素操作
      TransactionFragments = features
        .map((feature) => {
          if (
            feature.geometry.type !== 'Point' ||
            !feature.geometry.coordinates
          ) {
            return ''
          }
          // GeoJSON Point 的 coordinates: [经度, 纬度] 格式（数组）
          // GML 的 gml:coordinates: "经度,纬度" 格式（字符串，逗号分隔）
          const [lng, lat] = feature.geometry.coordinates
          const pos = `${lng} ${lat}` // 经度在前，纬度在后
          const coordinates = `${lng},${lat}` // 经度,纬度（逗号分隔）
          console.log('原始坐标:', feature.geometry.coordinates)
          console.log('转换后pos:', pos)
          console.log('转换后coordinates:', coordinates)
          return `
          <wfs:Insert>
            <${layerName}>
              <${LAYER_INFO.geomField}>
                <gml:Point srsName="EPSG:4326">
                  <gml:coordinates>${coordinates}</gml:coordinates>
                </gml:Point>
              </${LAYER_INFO.geomField}>
              <!-- 以下是属性字段 -->
              <Name>${feature.properties?.Name}</Name>
              <currentStatus>${feature.properties?.currentStatus}</currentStatus>
              <currentPressure>${feature.properties?.currentPressure}</currentPressure>
              <managementUnit>${feature.properties?.managementUnit}</managementUnit>
              <installationDate>${feature.properties?.installationDate}</installationDate>
            </${layerName}>
          </wfs:Insert>`
        })
        .join('') // 拼接WFS-T事务片段
      break
    case 'update': // 更新要素操作
      TransactionFragments = features
        .map((feature) => {
          if (feature.geometry.type !== 'Point' || !feature.properties)
            // 缺少 geometry 或 properties
            return ''
          const id = feature.id // 要素id
          console.log('更新要素id:', id)
          return `
            <wfs:Update typeName="${layerName}">
              <wfs:Property>
                <wfs:Name>Name</wfs:Name>
                <wfs:Value>${feature.properties?.Name}</wfs:Value>
              </wfs:Property>
              <wfs:Property>
                <wfs:Name>currentStatus</wfs:Name>
                <wfs:Value>${feature.properties?.currentStatus}</wfs:Value>
              </wfs:Property>
              <wfs:Property>
                <wfs:Name>currentPressure</wfs:Name>
                <wfs:Value>${feature.properties?.currentPressure}</wfs:Value>
              </wfs:Property>
              <wfs:Property>
                <wfs:Name>managementUnit</wfs:Name>
                <wfs:Value>${feature.properties?.managementUnit}</wfs:Value>
              </wfs:Property>
              <wfs:Property>
                <wfs:Name>installationDate</wfs:Name>
                <wfs:Value>${feature.properties?.installationDate}</wfs:Value>
              </wfs:Property>
              <!-- 定位要更新的要素：通过 ID 过滤 -->
              <ogc:Filter>
                <ogc:FeatureId fid="${layerName}.${id}"/>
              </ogc:Filter>
            </wfs:Update>
            `
        })
        .join('')
      break
    case 'delete': // 删除要素操作
      TransactionFragments = features
        .map((feature) => {
          if (!feature.id) {
            return ''
          }
          console.log('删除要素id:', feature.id)
          return `
            <wfs:Delete typeName="${layerName}">
              <ogc:Filter>
                <ogc:FeatureId fid="${layerName}.${feature.id}"/>
              </ogc:Filter>
            </wfs:Delete>
            `
        })
        .join('')
      break
  }
  // 如果没有WFS-T事务片段
  if (!TransactionFragments) {
    console.error('请提供有效的WFS-T事务片段')
    return
  }
  // 构建事务请求xml
  const wfsTransaction = `
    <wfs:Transaction service="WFS" version="1.0.0"
      xmlns:wfs="http://www.opengis.net/wfs"
      xmlns:gml="http://www.opengis.net/gml"
       xmlns:${LAYER_INFO.workspace}="${LAYER_INFO.namespace}"
       xmlns:ogc="http://www.opengis.net/ogc">
      ${TransactionFragments}
    </wfs:Transaction>
  `
  console.log('wfs服务请求xml', wfsTransaction)
  try {
    const response = await axios.post(url, wfsTransaction, {
      headers: {
        'Content-Type': 'text/xml', // 请求数据类型为XML
        Accept: 'application/xml', // 响应数据类型为XML
      },
    })
    console.log(`WFS-T${operation}响应:`, response.data)
    return response.data
  } catch (error) {
    console.error('执行WFS-T事务失败:', error)
  }
}
