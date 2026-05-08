/**
 * useResizer.js - 拖拽调整大小的Composable
 * 
 * 功能说明：
 * 1. 提供通用的拖拽调整大小功能
 * 2. 支持水平和垂直两种拖拽方向
 * 3. 提供边界限制功能
 * 
 * 参数：
 * - direction: 'horizontal' | 'vertical'，拖拽方向
 * - minSize: 最小尺寸百分比（默认10）
 * - maxSize: 最大尺寸百分比（默认90）
 * 
 * 返回值：
 * - isDragging: 是否正在拖拽
 * - sizePercent: 当前尺寸百分比
 * - startDrag: 开始拖拽方法
 */
import { ref, onUnmounted } from 'vue'

export function useResizer(direction = 'horizontal', minSize = 10, maxSize = 90) {
  /**
   * 是否正在拖拽
   */
  const isDragging = ref(false)

  /**
   * 当前尺寸百分比
   */
  const sizePercent = ref(50)

  /**
   * 容器DOM引用
   */
  let containerRef = null

  /**
   * 设置容器引用
   * @param {HTMLElement} el - 容器元素
   */
  const setContainerRef = (el) => {
    containerRef = el
  }

  /**
   * 开始拖拽
   * @param {MouseEvent} e - 鼠标事件
   */
  const startDrag = (e) => {
    isDragging.value = true
    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', stopDrag)
    e.preventDefault()
  }

  /**
   * 拖拽过程
   * @param {MouseEvent} e - 鼠标事件
   */
  const onDrag = (e) => {
    if (!isDragging.value || !containerRef) return

    const containerRect = containerRef.getBoundingClientRect()
    let newSize

    if (direction === 'horizontal') {
      // 水平拖拽：计算左侧面板宽度
      newSize = ((e.clientX - containerRect.left) / containerRect.width) * 100
    } else {
      // 垂直拖拽：计算底部面板高度
      newSize = ((containerRect.bottom - e.clientY) / containerRect.height) * 100
    }

    // 应用边界限制
    if (newSize >= minSize && newSize <= maxSize) {
      sizePercent.value = newSize
    }
  }

  /**
   * 停止拖拽
   */
  const stopDrag = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
  }

  /**
   * 组件卸载时清理事件监听
   */
  onUnmounted(() => {
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
  })

  return {
    isDragging,
    sizePercent,
    startDrag,
    setContainerRef
  }
}