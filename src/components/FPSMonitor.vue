<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const fps = ref(0)
let frameCount = 0
let lastTimestamp = 0
let animationFrameId: number | null = null
let isPageVisible = true

const calculateFps = (timestamp: number) => {
  if (!isPageVisible) {
    animationFrameId = requestAnimationFrame(calculateFps)
    return
  }

  frameCount++
  const elapsed = timestamp - lastTimestamp

  if (elapsed >= 1000) {
    fps.value = Math.round((frameCount * 1000) / elapsed)
    frameCount = 0
    lastTimestamp = timestamp
  }

  animationFrameId = requestAnimationFrame(calculateFps)
}

const handleVisibilityChange = () => {
  isPageVisible = !document.hidden
  if (isPageVisible) {
    lastTimestamp = performance.now()
    frameCount = 0
  }
}

onMounted(() => {
  lastTimestamp = performance.now()
  animationFrameId = requestAnimationFrame(calculateFps)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <div class="fps-monitor">
    {{ fps }} FPS
  </div>
</template>

<style scoped>
.fps-monitor {
  position: fixed;
  top: 10px;
  right: 10px;
  color: green;
  font-size: 14px;
  font-weight: bold;
  font-family: monospace;
  background-color: transparent;
  padding: 5px 10px;
  border-radius: 3px;
  z-index: 9999;
  pointer-events: none;
  user-select: none;
}
</style>
