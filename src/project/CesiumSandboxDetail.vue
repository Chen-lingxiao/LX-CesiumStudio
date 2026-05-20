<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const project = {
  name: 'Cesium 在线沙盒编辑器',
  url: '',
  description: '一款面向 Cesium 开发者的在线示例沙盒平台，提供了丰富的三维 GIS 开发示例，支持按标签分类检索、代码实时预览与运行，帮助开发者快速学习 Cesium 核心 API 与三维可视化开发流程。',
  techStack: ['Vue 3', 'TypeScript', 'Vite', 'CesiumJS', 'Monaco Editor', 'Tailwind CSS'],
  responsibilities: [
    {
      title: '沙盒平台整体架构设计',
      content: '设计并实现示例沙盒的核心架构，集成 Monaco Editor 代码编辑器与 Cesium 三维场景渲染容器；实现示例列表、标签分类筛选、代码预览与实时运行的联动逻辑，打造一体化开发学习环境'
    },
    {
      title: 'Cesium 示例库开发与封装',
      content: '基于 CesiumJS 开发了多个单独示例，覆盖 Viewer/Scene/Camera/Entities/Imagery/Terrain/SpatialAnalysis 等核心模块；封装可复用的地图绘制、测量工具、空间分析组件，沉淀三维 GIS 开发通用方案'
    },
    {
      title: '交互与用户体验优化',
      content: '实现按标签、关键词的示例检索功能；优化代码编辑器与三维场景的交互体验，支持一键运行、控制台日志输出；针对 Cesium 相机控制、实体渲染、地形加载等场景做了性能与兼容性优化'
    },
    {
      title: '组件化与工程化建设',
      content: '使用 Vue 3 + TypeScript 构建组件化项目，实现示例卡片、标签下拉、代码运行面板等通用组件的复用；配置 ESLint、Prettier 规范代码风格，通过 Vite 构建优化打包体积与加载速度'
    }
  ],
  github: '',
  gitee: ''
}

const images = [
  '../Preview/CesiumSandbox/CesiumSandbox1.png',
  '../Preview/CesiumSandbox/CesiumSandbox2.png',
  '../Preview/CesiumSandbox/CesiumSandbox3.png',
  '../Preview/CesiumSandbox/CesiumSandbox4.png',
  '../Preview/CesiumSandbox/CesiumSandbox5.png'
]

const currentIndex = ref(0)
const isTransitioning = ref(false)
let autoPlayTimer: ReturnType<typeof setInterval> | null = null

const totalImages = computed(() => images.length)

const prevIndex = computed(() => {
  return (currentIndex.value - 1 + totalImages.value) % totalImages.value
})

const nextIndex = computed(() => {
  return (currentIndex.value + 1) % totalImages.value
})

const visibleImages = computed(() => {
  return {
    prev: images[prevIndex.value],
    current: images[currentIndex.value],
    next: images[nextIndex.value]
  }
})

const goToNext = () => {
  if (isTransitioning.value) return
  isTransitioning.value = true
  currentIndex.value = nextIndex.value
  setTimeout(() => {
    isTransitioning.value = false
  }, 500)
}

const goToPrev = () => {
  if (isTransitioning.value) return
  isTransitioning.value = true
  currentIndex.value = prevIndex.value
  setTimeout(() => {
    isTransitioning.value = false
  }, 500)
}

const goToSlide = (index: number) => {
  if (isTransitioning.value || index === currentIndex.value) return
  isTransitioning.value = true
  currentIndex.value = index
  setTimeout(() => {
    isTransitioning.value = false
  }, 500)
}

const startAutoPlay = () => {
  autoPlayTimer = setInterval(goToNext, 5000)
}

const stopAutoPlay = () => {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer)
    autoPlayTimer = null
  }
}

onMounted(() => {
  startAutoPlay()
})

onUnmounted(() => {
  stopAutoPlay()
})
</script>

<template>
  <div class="project-container">
    <div class="project-card">
      <div class="card-header">
        <div class="carousel-wrapper" @mouseenter="stopAutoPlay" @mouseleave="startAutoPlay">
          <button class="nav-btn prev-btn" @click="goToPrev" aria-label="上一张">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
            </svg>
          </button>
          
          <div class="carousel-container">
            <div class="carousel-track">
              <div 
                class="slide prev-slide" 
                :class="{ 'transitioning': isTransitioning }"
                @click="goToPrev"
              >
                <img :src="visibleImages.prev" :alt="'预览图 ' + prevIndex" class="slide-image" />
              </div>
              <div 
                class="slide current-slide"
                :class="{ 'transitioning': isTransitioning }"
              >
                <img :src="visibleImages.current" :alt="'预览图 ' + currentIndex" class="slide-image" />
                <div class="slide-overlay">
                  <a v-if="project.url" :href="project.url" target="_blank" rel="noopener noreferrer" class="visit-btn">
                    访问项目
                  </a>
                </div>
              </div>
              <div 
                class="slide next-slide" 
                :class="{ 'transitioning': isTransitioning }"
                @click="goToNext"
              >
                <img :src="visibleImages.next" :alt="'预览图 ' + nextIndex" class="slide-image" />
              </div>
            </div>
          </div>
          
          <button class="nav-btn next-btn" @click="goToNext" aria-label="下一张">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
            </svg>
          </button>
          
          <div class="carousel-indicators">
            <button 
              v-for="(image, index) in images" 
              :key="index"
              class="indicator"
              :class="{ active: index === currentIndex }"
              @click="goToSlide(index)"
              :aria-label="'切换到第 ' + (index + 1) + ' 张'"
            ></button>
          </div>
        </div>
      </div>

      <div class="card-body">
        <div class="project-header">
          <h2 class="project-title">{{ project.name }}</h2>
          <div class="project-links" v-if="project.github || project.gitee">
            <a v-if="project.github" :href="project.github" target="_blank" rel="noopener noreferrer" class="link-btn github">
              <svg class="link-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </a>
            <a v-if="project.gitee" :href="project.gitee" target="_blank" rel="noopener noreferrer" class="link-btn gitee">
              <svg class="link-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10.184 0c-.944 0-1.784.39-2.423 1.018C7.34.39 6.5.78 6.5 1.535v21.323c0 .755.84 1.145 1.261.723.421-.421.763-.963.763-1.538V6.295l5.66 5.66c.193.193.451.29.708.29.258 0 .516-.097.708-.29.385-.385.385-1.012 0-1.397L10.18 5.006V1.535c0-.755-.84-1.145-1.261-.723-.421.421-.763.963-.763 1.538v16.54c0 1.018-.842 1.847-1.885 1.847-.755 0-1.368-.63-1.368-1.385V1.535C5.603.78 6.44.39 7.34.39c.902 0 1.62-.51 2.025-1.232C9.78-.51 10.5.03 11.26.03c.755 0 1.385-.54 1.385-1.295 0-.755-.63-1.385-1.385-1.385L10.184 0z"/>
              </svg>
              Gitee
            </a>
          </div>
        </div>
        <p class="project-desc">{{ project.description }}</p>

        <div class="tech-stack">
          <span v-for="tech in project.techStack" :key="tech" class="tech-badge">
            {{ tech }}
          </span>
        </div>

        <div class="responsibilities">
          <h3 class="section-title">核心职责与成果</h3>
          <div v-for="(item, index) in project.responsibilities" :key="index" class="responsibility-item">
            <h4 class="item-title">{{ item.title }}</h4>
            <p class="item-content">{{ item.content }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-container {
  padding: 24px;
  display: flex;
  justify-content: center;
  min-height: calc(100vh - 60px);
  background: var(--color-bg-base);
}

.project-card {
  width: 100%;
  max-width: 1200px;
  background: var(--color-bg-surface);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow);
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.card-header {
  position: relative;
}

.carousel-wrapper {
  position: relative;
  width: 100%;
  height: 450px;
  overflow: hidden;
  background: var(--color-bg-elevated);
}

.carousel-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.carousel-track {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 8px;
  padding: 0 20px;
}

.slide {
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.prev-slide {
  width: 8%;
  height: 60%;
  opacity: 0.5;
  transform: translateX(15%) scale(0.85);
}

.current-slide {
  width: 85%;
  height: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  z-index: 10;
}

.next-slide {
  width: 8%;
  height: 60%;
  opacity: 0.5;
  transform: translateX(-15%) scale(0.85);
}

.slide-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.slide:hover .slide-image {
  transform: scale(1.05);
}

.slide-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.current-slide:hover .slide-overlay {
  opacity: 1;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-primary);
  transition: all 0.3s ease;
  z-index: 20;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

.nav-btn svg {
  width: 20px;
  height: 20px;
}

.nav-btn:hover {
  background: var(--color-primary);
  color: white;
  transform: translateY(-50%) scale(1.1);
}

.prev-btn {
  left: 12px;
}

.next-btn {
  right: 12px;
}

.carousel-indicators {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 20;
}

.indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.5);
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
}

.indicator:hover {
  border-color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.3);
}

.indicator.active {
  background: white;
  border-color: white;
  transform: scale(1.2);
}

.visit-btn {
  padding: 12px 32px;
  background: linear-gradient(135deg, var(--color-primary) 0%, #1a7de0 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.visit-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(30, 144, 255, 0.4);
}

.card-body {
  padding: 28px 32px;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 12px;
}

.project-title {
  font-size: 26px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  flex: 1;
  min-width: 200px;
}

.project-desc {
  font-size: 15px;
  line-height: 1.7;
  color: var(--color-text-secondary);
  margin-bottom: 20px;
}

.tech-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 28px;
}

.tech-badge {
  padding: 6px 14px;
  background: var(--color-primary-bg-light);
  color: var(--color-primary);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.2s ease, transform 0.2s ease;
}

.tech-badge:hover {
  background: var(--color-primary-bg-hover);
  transform: translateY(-1px);
}

.section-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--color-border);
}

.responsibilities {
  margin-bottom: 28px;
}

.responsibility-item {
  margin-bottom: 18px;
  padding-left: 16px;
  border-left: 3px solid var(--color-primary);
  background: var(--color-bg-elevated);
  padding: 14px 18px;
  border-radius: 0 8px 8px 0;
  transition: background 0.2s ease;
}

.responsibility-item:hover {
  background: var(--color-bg-hover);
}

.responsibility-item:last-child {
  margin-bottom: 0;
}

.item-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: 6px;
}

.item-content {
  font-size: 14px;
  line-height: 1.65;
  color: var(--color-text-secondary);
}

.project-links {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.link-btn:hover {
  transform: translateY(-2px);
}

.link-icon {
  width: 18px;
  height: 18px;
}

.link-btn.github {
  background: #24292e;
  color: #ffffff;
}

.link-btn.github:hover {
  background: #1b1f23;
  box-shadow: 0 4px 12px rgba(36, 41, 46, 0.4);
}

.link-btn.gitee {
  background: #c71a27;
  color: #ffffff;
}

.link-btn.gitee:hover {
  background: #a01620;
  box-shadow: 0 4px 12px rgba(199, 26, 39, 0.4);
}

@media (max-width: 768px) {
  .project-container {
    padding: 16px;
  }

  .card-body {
    padding: 20px;
  }

  .carousel-wrapper {
    height: 220px;
  }

  .carousel-track {
    padding: 0 40px;
    gap: 8px;
  }

  .prev-slide,
  .next-slide {
    display: none;
  }

  .current-slide {
    width: 100%;
  }

  .nav-btn {
    width: 36px;
    height: 36px;
  }

  .nav-btn svg {
    width: 16px;
    height: 16px;
  }

  .project-title {
    font-size: 22px;
  }

  .project-links {
    flex-direction: column;
  }

  .link-btn {
    justify-content: center;
  }
}
</style>