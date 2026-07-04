<script setup lang="ts">
/**
 * SettingsPanel.vue - 设置面板组件
 * 
 * 功能说明：
 * 1. 显示设置弹窗，位于左下角
 * 2. 提供FPS显示开关
 * 3. 提供主题色预设选择
 * 4. 提供明暗模式切换
 * 
 * Props：
 * - visible: 是否显示面板
 * 
 * 事件：
 * - close: 关闭面板
 */
import { useSettings, themeColorPresets, type ThemeColorPreset } from '../composables/useSettings'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const { settings, updateSetting } = useSettings()

/**
 * 处理FPS开关切换
 */
const handleFpsToggle = () => {
  updateSetting('showFps', !settings.showFps)
}

/**
 * 处理主题色预设选择
 * @param preset 主题色预设名称
 */
const handleThemeColorSelect = (preset: ThemeColorPreset) => {
  updateSetting('themeColorPreset', preset)
}

/**
 * 处理明暗模式切换
 */
const handleDarkModeToggle = () => {
  updateSetting('isDark', !settings.isDark)
}

/**
 * 关闭面板
 */
const handleClose = () => {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="settings-container">
        <div class="settings-panel">
          <!-- 标题栏 -->
          <div class="settings-header">
            <span class="settings-title">设置</span>
            <button class="close-btn" @click="handleClose">
              <span>×</span>
            </button>
          </div>
          
          <!-- 设置内容 -->
          <div class="settings-content">
            <!-- FPS显示开关 -->
            <div class="setting-item">
              <div class="setting-label">
                <span class="iconfont icon-fps"></span>
                <span>FPS监控</span>
              </div>
              <div 
                class="toggle-switch" 
                :class="{ active: settings.showFps }"
                @click="handleFpsToggle"
              >
                <div class="toggle-thumb"></div>
              </div>
            </div>
            
            <!-- 明暗模式切换 -->
            <div class="setting-item">
              <div class="setting-label">
                <span class="iconfont" :class="settings.isDark ? 'icon-taiyang' : 'icon-yueliang'"></span>
                <span>{{ settings.isDark ? '暗色模式' : '亮色模式' }}</span>
              </div>
              <div 
                class="toggle-switch" 
                :class="{ active: settings.isDark }"
                @click="handleDarkModeToggle"
              >
                <div class="toggle-thumb"></div>
              </div>
            </div>
            
            <!-- 主题色预设 -->
            <div class="setting-section">
              <div class="section-title">主题色预设</div>
              <div class="color-presets">
                <div 
                  v-for="(config, key) in themeColorPresets" 
                  :key="key"
                  class="color-preset-item"
                  :class="{ active: settings.themeColorPreset === key }"
                  :title="config.name"
                  @click="handleThemeColorSelect(key as ThemeColorPreset)"
                >
                  <div 
                    class="color-preview"
                    :style="{ 
                      backgroundColor: config.colors.bgBase,
                      borderColor: config.colors.border 
                    }"
                  ></div>
                  <span class="color-name">{{ config.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 设置容器 */
.settings-container {
  position: fixed;
  left:60px;
  bottom: 5px;
  z-index: 1000;
}

/* 设置面板 */
.settings-panel {
  width: 320px;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: var(--shadow);
  overflow: hidden;
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 标题栏 */
.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.settings-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  background-color: var(--color-bg-elevated);
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 4px;
  transition: all var(--transition-fast);
  font-size: 16px;
}

.close-btn:hover {
  background-color: var(--color-bg-hover);
  border-color: var(--color-border-muted);
  color: var(--color-text-primary);
}

/* 设置内容 */
.settings-content {
  padding: 16px;
}

/* 设置项 */
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border-muted);
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-primary);
  font-size: 14px;
}

.setting-label .iconfont {
  font-size: 16px;
}

/* 开关按钮 */
.toggle-switch {
  width: 44px;
  height: 24px;
  background-color: var(--color-bg-elevated);
  border-radius: 12px;
  cursor: pointer;
  position: relative;
  transition: background-color var(--transition-fast);
}

.toggle-switch.active {
  background-color: #4a90d9;
}

.toggle-thumb {
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-switch.active .toggle-thumb {
  transform: translateX(20px);
}

/* 设置区块 */
.setting-section {
  margin-top: 16px;
}

.section-title {
  font-size: 12px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

/* 主题色预设列表 */
.color-presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.color-preset-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: background-color var(--transition-fast);
}

.color-preset-item:hover {
  background-color: var(--color-bg-hover);
}

.color-preset-item.active {
  background-color: var(--color-bg-hover);
}

.color-preview {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid;
  transition: transform var(--transition-fast);
}

.color-preset-item.active .color-preview {
  transform: scale(1.1);
}

.color-name {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-fast);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>