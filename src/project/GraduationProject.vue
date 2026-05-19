<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const project = {
  name: '基于微信小程序的市政消防栓管理系统',
  subtitle: '本科毕业设计',
  url: '#',
  description: '独立设计并开发了一个面向公众与运维人员的移动端GIS应用，旨在解决传统消防栓管理中的信息不透明、巡检效率低、公众参与度不足等问题。系统实现了消防栓的数字化、空间化与移动化管理。',
  techStack: ['微信小程序', 'Mapbox GL JS', 'Turf.js', 'TypeScript', 'Node.js', 'PostgreSQL', 'PostGIS'],
  responsibilities: [
    {
      title: '移动端GIS开发',
      content: '基于微信小程序原生框架与 Mapbox GL JS，开发了集成天地图底图与WMS服务的地图模块；实现了数据展示、地图浏览、实时定位、点击/扫码查询、故障上报等核心交互功能'
    },
    {
      title: '空间分析功能',
      content: '利用 Turf.js 地理空间分析库，实现了「附近消防栓查询」功能，支持以用户位置为中心、自定义半径的空间范围搜索地理要素与结果可视化'
    }
  ],
  github: 'https://github.com/Chen-lingxiao/GraduationProject',
  gitee: '#'
}

const images = [
  '/Preview/WxFireHydrant/WxFireHydrant1.png',
  '/Preview/WxFireHydrant/WxFireHydrant2.png',
  '/Preview/WxFireHydrant/WxFireHydrant3.png',
  '/Preview/WxFireHydrant/WxFireHydrant4.png',
  '/Preview/WxFireHydrant/WxFireHydrant5.png'
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
                  <span class="device-label">手机截图</span>
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
          <div class="title-section">
            <h2 class="project-title">{{ project.name }}</h2>
            <span class="project-subtitle">{{ project.subtitle }}</span>
          </div>
          <div class="project-links">
            <a :href="project.github" target="_blank" rel="noopener noreferrer" class="link-btn github">
              <svg class="link-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
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
  max-width: 800px;
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
  height: 420px;
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
  padding: 0 40px;
}

.slide {
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.prev-slide {
  width: 15%;
  height: 55%;
  opacity: 0.4;
  transform: translateX(20%) scale(0.8);
}

.current-slide {
  width: 45%;
  height: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  z-index: 10;
}

.next-slide {
  width: 15%;
  height: 55%;
  opacity: 0.4;
  transform: translateX(-20%) scale(0.8);
}

.slide-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.5s ease;
  background: #1a1a1a;
}

.slide:hover .slide-image {
  transform: scale(1.02);
}

.slide-overlay {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.6);
  padding: 6px 12px;
  border-radius: 20px;
}

.device-label {
  font-size: 12px;
  color: white;
  font-weight: 500;
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

.title-section {
  flex: 1;
  min-width: 280px;
}

.project-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 6px 0;
  line-height: 1.4;
}

.project-subtitle {
  font-size: 14px;
  color: var(--color-primary);
  font-weight: 500;
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

@media (max-width: 768px) {
  .project-container {
    padding: 16px;
  }

  .card-body {
    padding: 20px;
  }

  .carousel-wrapper {
    height: 300px;
  }

  .carousel-track {
    padding: 0 30px;
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
    font-size: 20px;
  }

  .project-links {
    flex-direction: column;
  }

  .link-btn {
    justify-content: center;
  }
}
</style>
