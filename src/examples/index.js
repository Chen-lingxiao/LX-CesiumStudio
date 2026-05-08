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

/**
 * 从Vue单文件组件代码中提取可执行代码
 * @param {string} rawCode - 原始Vue组件代码（包含template、script、style标签）
 * @returns {Object} 包含jsCode、executableCode、htmlCode、cssCode的对象
 */
const extractCode = (rawCode) => {
  // 提取script标签内容
  const scriptMatch = rawCode.match(/<script[^>]*>([\s\S]*?)<\/script>/)
  // 提取template标签内容
  const templateMatch = rawCode.match(/<template[^>]*>([\s\S]*?)<\/template>/)
  // 提取style标签内容
  const styleMatch = rawCode.match(/<style[^>]*>([\s\S]*?)<\/style>/)
  
  // 获取完整的JavaScript代码
  let fullJsCode = scriptMatch ? scriptMatch[1].trim() : ''
  
  // 初始化可执行代码为完整JS代码
  let jsCode = fullJsCode
  
  // 移除import语句（运行时不需要）
  // 使用更精确的正则表达式处理各种import语句格式
  try {
    // 匹配多种import格式：
    // - import 'module'
    // - import from 'module'
    // - import { x } from 'module'
    // - import * as x from 'module'
    // - import x from 'module'
    jsCode = jsCode.replace(/^\s*import\s+(?:[\w*{}\s,]+\s+from\s+)?['"][^'"]+['"];?\s*$/gm, '')
  } catch (e) {
    console.warn('Failed to remove import statements:', e)
  }
  
  /**
   * 从代码中提取onMounted内部的内容
   * @param {string} code - 原始代码
   * @returns {string} onMounted内部的代码内容
   */
  const extractOnMountedContent = (code) => {
    const startIndex = code.indexOf('onMounted(() => {')
    if (startIndex === -1) return code
    
    let contentStart = startIndex + 'onMounted(() => {'.length
    let depth = 1
    let result = ''
    
    // 解析花括号嵌套，正确提取onMounted内部内容
    for (let i = contentStart; i < code.length && depth > 0; i++) {
      const char = code[i]
      if (char === '{' && code[i-1] !== '\\') depth++
      if (char === '}' && code[i-1] !== '\\') depth--
      if (depth > 0) {
        result += char
      }
    }
    
    return result.trim()
  }
  
  // 提取onMounted内部内容作为可执行代码
  jsCode = extractOnMountedContent(jsCode)

  // 移除viewer声明（运行时会重新声明）
  jsCode = jsCode.replace(/let\s+viewer\s*=\s*null;/g, '')

  // 移除viewer赋值的const声明，保持为普通赋值（让外部viewer变量引用）
  jsCode = jsCode.replace(/const\s+viewer\s*=\s*new Cesium\.Viewer/g, 'viewer = new Cesium.Viewer')

  // 移除onUnmounted（由容器组件统一处理）
  jsCode = jsCode.replace(/\s*onUnmounted\s*\([\s\S]*?\)\s*/g, '')
  
  // 将容器ID替换为container变量（运行时传入）
  jsCode = jsCode.replace(/'cesium-container'/g, 'container')
  
  return {
    jsCode: fullJsCode.trim(),      // 完整的JavaScript代码（用于显示）
    executableCode: jsCode.trim(),  // 可执行的代码（用于运行）
    htmlCode: templateMatch ? templateMatch[1].trim() : '',  // HTML模板代码
    cssCode: styleMatch ? styleMatch[1].trim() : ''          // CSS样式代码
  }
}




import BasicEntity from './Entity/BasicEntity.vue'
import basicEntityCode from './Entity/BasicEntity.vue?raw'
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
    id: 'basic-entity',
    name: 'Entities 基础',
    description: '创建基础的Cesium Viewer并添加实体对象',
    tags: ['Entities', '基础'],
    thumbnail: '/thumbnails/basic-entity.png',
    component: BasicEntity,
    ...extractCode(basicEntityCode)
  },
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