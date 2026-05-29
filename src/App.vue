<script setup>
import { ref, onMounted } from 'vue'
import { useSettings } from './composables/useSettings'

const { initSettings } = useSettings()
initSettings()

const loadingState = ref('loading')

onMounted(() => {
  const startTime = Date.now()
  const minLoadingTime = 800
  const finishLoading = () => {
    const elapsed = Date.now() - startTime
    const remaining = Math.max(0, minLoadingTime - elapsed)
    setTimeout(() => { loadingState.value = 'done' }, remaining)
  }
  if (document.readyState === 'complete') {
    finishLoading()
  } else {
    window.addEventListener('load', finishLoading)
  }
})
</script>

<template>
  <div id="app">
    <div class="loading-overlay" :class="{ 'loading-exit': loadingState === 'done' }">
      <div class="loading-content">
        <div class="logo-text">
          <span v-for="(char, i) in 'Cesium'" :key="'c-' + i" class="logo-char" :style="{ animationDelay: i * 80 + 'ms' }">{{ char }}</span>
          <span class="logo-dot">·</span>
          <span v-for="(char, i) in 'Sandbox'" :key="'s-' + i" class="logo-char" :style="{ animationDelay: (i + 7) * 80 + 'ms' }">{{ char }}</span>
        </div>
        <div class="loading-bar">
          <div class="loading-bar-inner"></div>
        </div>
        <div class="loading-hint">正在加载Cesium三维引擎...</div>
      </div>
    </div>
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

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: #0f1525;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.5s ease, visibility 0.5s ease;
}

.loading-overlay.loading-exit {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

.logo-text {
  display: flex;
  align-items: baseline;
  gap: 2px;
  font-size: 36px;
  font-weight: 700;
  font-family: 'Segoe UI', 'PingFang SC', sans-serif;
  letter-spacing: 2px;
}

.logo-char {
  display: inline-block;
  color: #e0e6f0;
  animation: charFloat 2.4s ease-in-out infinite;
}

.logo-dot {
  display: inline-block;
  color: #4a90d9;
  margin: 0 4px;
  font-weight: 300;
}

.loading-bar {
  width: 240px;
  height: 3px;
  background-color: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
}

.loading-bar-inner {
  width: 40%;
  height: 100%;
  background: linear-gradient(90deg, transparent, #4a90d9, transparent);
  border-radius: 2px;
  animation: barSlide 1.4s ease-in-out infinite;
}

.loading-hint {
  font-size: 13px;
  color: rgba(224, 230, 240, 0.35);
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  animation: hintBreathe 2.8s ease-in-out infinite;
}

@keyframes charFloat {
  0%, 100% {
    transform: translateY(0);
    opacity: 0.7;
  }
  50% {
    transform: translateY(-6px);
    opacity: 1;
  }
}

@keyframes barSlide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(350%);
  }
}

@keyframes hintBreathe {
  0%, 100% {
    opacity: 0.35;
  }
  50% {
    opacity: 0.7;
  }
}
</style>
