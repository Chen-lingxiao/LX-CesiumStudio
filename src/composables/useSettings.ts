/**
 * useSettings.ts - 设置管理Composable
 *
 * 功能说明：
 * 1. 管理应用设置状态（FPS显示开关、主题色预设等）
 * 2. 支持设置持久化到localStorage
 * 3. 提供响应式状态和修改方法
 *
 * 返回值：
 * - settings: 响应式设置对象
 * - updateSetting: 更新单个设置项
 * - resetSettings: 重置所有设置为默认值
 */
import { reactive } from 'vue'

/**
 * 主题色预设类型
 */
export type ThemeColorPreset = 'default' | 'light-purple' | 'light-green' | 'light-pink' | 'mint-green' | 'soft-blue'

/**
 * 设置接口定义
 */
export interface Settings {
  showFps: boolean
  themeColorPreset: ThemeColorPreset
  isDark: boolean
}

/**
 * 默认设置值
 */
const DEFAULT_SETTINGS: Settings = {
  showFps: true,
  themeColorPreset: 'default',
  isDark: false
}

/**
 * 设置状态（模块级别响应式对象）
 */
const settings = reactive<Settings>({ ...DEFAULT_SETTINGS })

/**
 * 初始化标志
 */
let isInitialized = false

/**
 * 主题色预设配置
 */
const themeColorPresets = {
  'default': {
    name: '默认白',
    colors: {
      bgBase: '#ffffff',
      bgSurface: '#ffffff',
      bgElevated: '#f5f5f5',
      bgHover: '#e8e8e8',
      border: '#eeeeee',
      borderMuted: '#dddddd',
      consoleBg: '#f0f0f0',
      consoleText: '#333333',
      editorBg: '#ffffff'
    }
  },
  'light-purple': {
    name: '淡紫色',
    colors: {
      bgBase: '#fff0f9',
      bgSurface: '#ffe6f7',
      bgElevated: '#fff5fb',
      bgHover: '#ffd6ed',
      border: '#f8e0f0',
      borderMuted: '#f0d0e8',
      consoleBg: '#f8f0f6',
      consoleText: '#4a3046',
      editorBg: '#fff8fc'
    }
  },
  'light-green': {
    name: '淡绿色',
    colors: {
      bgBase: '#e0ebd8',
      bgSurface: '#d0ddc8',
      bgElevated: '#e8f0e1',
      bgHover: '#c0cfb8',
      border: '#d8e4ce',
      borderMuted: '#c8d4bc',
      consoleBg: '#eef2e8',
      consoleText: '#3a4a34',
      editorBg: '#f2f7ec'
    }
  },
  'light-pink': {
    name: '淡粉色',
    colors: {
      bgBase: '#fff0f0',
      bgSurface: '#ffe6e6',
      bgElevated: '#fffafa',
      bgHover: '#ffd6d6',
      border: '#ffebe9',
      borderMuted: '#f0d8d8',
      consoleBg: '#f8f0f0',
      consoleText: '#4a3030',
      editorBg: '#fff8f8'
    }
  },
  'mint-green': {
    name: '薄荷绿',
    colors: {
      bgBase: '#e8f5f0',
      bgSurface: '#d4e8e0',
      bgElevated: '#f0faf7',
      bgHover: '#c4d8d0',
      border: '#d8ece4',
      borderMuted: '#c8dcc4',
      consoleBg: '#eef5f1',
      consoleText: '#2e4a40',
      editorBg: '#f5faf8'
    }
  },
  'soft-blue': {
    name: '柔和蓝',
    colors: {
      bgBase: '#e8f0fe',
      bgSurface: '#d4e4fc',
      bgElevated: '#f0f6ff',
      bgHover: '#c4d4ec',
      border: '#d8e4f8',
      borderMuted: '#c8d4e8',
      consoleBg: '#ecf1f8',
      consoleText: '#2e3a4a',
      editorBg: '#f5f8ff'
    }
  }
}

/**
 * 从localStorage加载设置
 */
function loadSettings() {
  const saved = localStorage.getItem('app-settings')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      Object.assign(settings, { ...DEFAULT_SETTINGS, ...parsed })
    } catch (e) {
      console.warn('Failed to load settings from localStorage')
    }
  }
}

/**
 * 保存设置到localStorage
 */
function saveSettings() {
  localStorage.setItem('app-settings', JSON.stringify(settings))
}

/**
 * 更新主题色CSS变量
 * @param preset 主题色预设名称
 */
function updateThemeColors(preset: ThemeColorPreset) {
  const colors = themeColorPresets[preset]?.colors || themeColorPresets.default.colors
  const root = document.documentElement

  if (settings.isDark) return

  Object.entries(colors).forEach(([key, color]) => {
    const cssVarName = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
    root.style.setProperty(cssVarName, color as string)
  })
}

/**
 * 更新暗色模式状态
 * @param isDark 是否为暗色模式
 */
function updateDarkMode(isDarkMode: boolean) {
  const root = document.documentElement
  const propertiesToRemove = [
    '--color-bg-base',
    '--color-bg-surface',
    '--color-bg-elevated',
    '--color-bg-hover',
    '--color-border',
    '--color-border-muted',
    '--color-console-bg',
    '--color-console-text',
    '--color-editor-bg'
  ]

  if (isDarkMode) {
    root.classList.add('dark')
    propertiesToRemove.forEach(p => {
      root.style.removeProperty(p)
    })
  } else {
    root.classList.remove('dark')
    updateThemeColors(settings.themeColorPreset)
  }

  localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
}

/**
 * 初始化设置（只在首次调用时执行）
 */
function initSettings() {
  if (isInitialized) return
  isInitialized = true

  loadSettings()
  updateThemeColors(settings.themeColorPreset)
  updateDarkMode(settings.isDark)
}

export function useSettings() {
  /**
   * 更新单个设置项
   * @param key 设置项键名
   * @param value 设置项值
   */
  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    settings[key] = value
    saveSettings()

    if (key === 'themeColorPreset') {
      updateThemeColors(value as ThemeColorPreset)
    }

    if (key === 'isDark') {
      updateDarkMode(value as boolean)
    }
  }

  /**
   * 重置所有设置为默认值
   */
  function resetSettings() {
    Object.assign(settings, { ...DEFAULT_SETTINGS })
    saveSettings()
    updateThemeColors(DEFAULT_SETTINGS.themeColorPreset)
    updateDarkMode(DEFAULT_SETTINGS.isDark)
  }

  return {
    settings,
    updateSetting,
    resetSettings,
    themeColorPresets,
    initSettings
  }
}

export { themeColorPresets }
