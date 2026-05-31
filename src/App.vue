<script setup>
import { onMounted } from 'vue'
import { useSettings } from './composables/useSettings'

const { initSettings } = useSettings()
initSettings()

/**
 * 检查页面是否已完全渲染（有可见内容）
 * @returns {boolean} 是否有可见内容
 */
const isPageReady = () => {
  const appElement = document.getElementById('app')
  if (!appElement) return false
  
  // 检查是否有实际内容渲染
  const hasContent = appElement.offsetHeight > 0 || appElement.offsetWidth > 0
  
  // 检查是否有子元素且子元素有内容
  const children = appElement.children
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (child.offsetHeight > 0 || child.offsetWidth > 0) {
      return true
    }
  }
  
  return hasContent
}

/**
 * 淡出并移除 index.html 中的加载动画
 * 加载动画在 index.html 中以纯 HTML+CSS 实现，浏览器解析即显示，避免白屏
 * 等待页面内容完全渲染后再移除加载动画，避免短暂白屏
 */
onMounted(() => {
  const minLoadingTime = 800
  const maxLoadingTime = 5000 // 最大等待时间5秒
  const startTime = performance.now()
  
  // 使用 requestAnimationFrame 轮询检查页面是否就绪
  const checkAndRemoveLoader = () => {
    const elapsed = performance.now() - startTime
    
    // 如果页面已就绪或超过最大等待时间，移除加载动画
    if (isPageReady() || elapsed >= maxLoadingTime) {
      const loader = document.getElementById('app-loading')
      const appEl = document.getElementById('app')
      if (loader) {
        loader.classList.add('fade-out')
        const cleanup = () => {
          if (loader.parentElement) loader.remove()
          if (appEl) appEl.style.removeProperty('background-color')
        }
        loader.addEventListener('transitionend', cleanup, { once: true })
        setTimeout(cleanup, 600)
      }
      return
    }
    
    // 继续轮询检查
    requestAnimationFrame(checkAndRemoveLoader)
  }
  
  // 至少等待 minLoadingTime 后开始检查
  setTimeout(() => {
    checkAndRemoveLoader()
  }, minLoadingTime)
})
</script>

<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  min-height: 100vh;
}
</style>
