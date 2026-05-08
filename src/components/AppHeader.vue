<script setup>
/**
 * AppHeader.vue - 应用头部组件
 * 
 * 功能说明：
 * 1. 显示应用标题和 Cesium 版本
 * 2. 提供统一的顶部导航栏样式
 */
</script>

<template>
  <header class="app-header">
    <div class="header-content">
      <h1 class="header-title">Cesium 示例</h1>
      <span class="header-version">v1.141.0</span>
    </div>
  </header>
</template>

<style scoped>
/* 头部导航栏样式 */
.app-header {
  height: 50px;
  background-color: var(--color-bg-surface);
  border-bottom: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  padding: 0 20px;
  box-shadow: var(--shadow);
  transition: background-color 0.3s, border-color 0.3s;
}

/* 内容区域 */
.header-content {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

/* 标题样式 */
.header-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

/* 版本样式 */
.header-version {
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>