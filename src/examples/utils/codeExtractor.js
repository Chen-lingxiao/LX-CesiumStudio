/**
 * examples/utils/codeExtractor.js - Vue组件代码提取工具
 *
 * 功能说明：
 * 提供从Vue单文件组件代码中提取可执行代码的工具函数
 */

/**
 * 从Vue单文件组件代码中提取可执行代码
 * @param {string} rawCode - 原始Vue组件代码（包含template、script、style标签）
 * @returns {Object} 包含jsCode、executableCode、htmlCode、cssCode的对象
 */
export const extractCode = (rawCode) => {
  // 提取script标签内容
  const scriptMatch = rawCode.match(/<script[^>]*>([\s\S]*?)<\/script>/)
  // 提取template标签内容
  const templateMatch = rawCode.match(/<template[^>]*>([\s\S]*?)<\/template>/)
  // 提取style标签内容
  const styleMatch = rawCode.match(/<style[^>]*>([\s\S]*?)<\/style>/)

  // 获取完整的JavaScript代码（用于编辑器显示）
  let fullJsCode = scriptMatch ? scriptMatch[1].trim() : ''

  // 初始化可执行代码
  let executableCode = fullJsCode

  // 移除import语句（运行时不需要）
  executableCode = executableCode.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"]\s*[;\n]/g, '')
  executableCode = executableCode.replace(/import\s+['"][^'"]+['"]\s*[;\n]/g, '')

  // 移除export语句
  executableCode = executableCode.replace(/export\s+default\s+[\s\S]*?(?=\n|$)/g, '')
  executableCode = executableCode.replace(/export\s+[\s\S]*?[;\n]/g, '')

  // 移除defineProps和defineEmits
  executableCode = executableCode.replace(/defineProps\s*\([\s\S]*?\)\s*/g, '')
  executableCode = executableCode.replace(/defineEmits\s*\([\s\S]*?\)\s*/g, '')

  // 处理onMounted：提取内部内容并立即执行
  const onMountedIndex = executableCode.indexOf('onMounted(() => {')
  if (onMountedIndex !== -1) {
    // 获取onMounted之前的内容（函数定义、变量声明等）
    const beforeOnMounted = executableCode.substring(0, onMountedIndex).trim()

    // 提取onMounted内部内容
    let contentStart = onMountedIndex + 'onMounted(() => {'.length
    let depth = 1
    let onMountedContent = ''

    for (let i = contentStart; i < executableCode.length && depth > 0; i++) {
      const char = executableCode[i]
      if (char === '{' && executableCode[i-1] !== '\\') depth++
      if (char === '}' && executableCode[i-1] !== '\\') depth--
      if (depth > 0) {
        onMountedContent += char
      }
    }

    // 合并：保留函数定义 + onMounted内部调用
    executableCode = (beforeOnMounted + '\n\n' + onMountedContent).trim()
  }

  // 移除onUnmounted（销毁由容器统一处理）
  executableCode = executableCode.replace(/\s*onUnmounted\s*\([\s\S]*?\)\s*/g, '')

  // 移除let viewer声明，改用全局viewer变量
  executableCode = executableCode.replace(/let\s+viewer\s*=\s*null;/g, '')

  // 将const/let viewer声明转换为普通赋值
  executableCode = executableCode.replace(/const\s+viewer\s*=\s*new Cesium\.Viewer/g, 'viewer = new Cesium.Viewer')
  executableCode = executableCode.replace(/let\s+viewer\s*=\s*new Cesium\.Viewer/g, 'viewer = new Cesium.Viewer')

  // 将容器ID替换为container变量（运行时传入）
  executableCode = executableCode.replace(/['"]cesium-container['"]/g, 'container')

  // 移除多余的空行和空白
  executableCode = executableCode.replace(/\n{3,}/g, '\n\n').trim()

  return {
    jsCode: fullJsCode.trim(),      // 完整的JavaScript代码（用于显示）
    executableCode: executableCode.trim(),  // 可执行的代码（用于运行）
    htmlCode: templateMatch ? templateMatch[1].trim() : '',  // HTML模板代码
    cssCode: styleMatch ? styleMatch[1].trim() : ''          // CSS样式代码
  }
}
