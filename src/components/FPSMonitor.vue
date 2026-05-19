<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useSettings } from '../composables/useSettings'

const { settings } = useSettings()
const fps = ref(0)
let frameCount = 0
let lastTimestamp = 0
let animationFrameId: number | null = null
let isPageVisible = true

const calculateFps = (timestamp: number) => {
  if (!isPageVisible || !settings.showFps) {
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
  <div v-if="settings.showFps" class="fps-monitor">
    {{ fps }} FPS
  </div>
</template>

<style scoped>
.fps-monitor {
  position: fixed;
  top: 35px;
  right: 10px;
  color:green;
  font-size: 12px;
  font-weight: bold;
  font-family: monospace;
  background-color: rgba(0, 0, 0, 0.0);
  padding: 2px 8px;
  z-index: 9999;
  pointer-events: none;
  user-select: none;
}
</style>
