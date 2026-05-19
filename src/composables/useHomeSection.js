/**
 * useHomeSection.js - 首页Section状态管理Composable
 *
 * 功能说明：
 * 1. 跟踪首页当前可见的section（0: hero, 1: about, 2: projects）
 * 2. 在首页滚动时向AppHeader提供当前section信息
 * 3. 用于动态调整Header样式（暗黑/亮色主题切换）
 */
import { reactive, computed } from 'vue'

const state = reactive({
  currentSection: 0,
  isOnHome: true
})

export function useHomeSection() {
  const setCurrentSection = (section) => {
    state.currentSection = section
  }

  const setIsOnHome = (value) => {
    state.isOnHome = value
  }

  const isHeroSection = computed(() => state.isOnHome && state.currentSection === 0)

  return {
    state,
    setCurrentSection,
    setIsOnHome,
    isHeroSection
  }
}