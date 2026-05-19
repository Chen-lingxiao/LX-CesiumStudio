<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const projectList = [
  {
    index: '/project/digital-campus',
    title: '校园消防栓 GIS 可视化管理系统'
  },
  {
    index: '/project/graduation-project',
    title: '微信小程序市政消防栓管理系统'
  },
  {
    index: '/project/example',
    title: '示例项目'
  }
]

const handleSelect = (index: string) => {
  router.push(index)
}

const activeMenu = ref(route.path)

onMounted(() => {
  if (route.path === '/project') {
    router.push('/project/digital-campus')
  }
})
</script>

<template>
  <div class="project-layout">
    <el-aside width="220px" class="project-aside">
      <div class="aside-header">
        <h2 class="aside-title">项目示例</h2>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="project-menu"
        @select="handleSelect"
      >
        <el-menu-item v-for="item in projectList" :key="item.index" :index="item.index">
          <template #title>
            <span>{{ item.title }}</span>
          </template>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <main class="project-main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.project-layout {
  display: flex;
  height: calc(100vh - 60px);
  background: var(--color-bg-base);
}

.project-aside {
  width: 220px;
  background: var(--color-bg-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}

.aside-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--color-border);
}

.aside-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.project-menu {
  flex: 1;
  border-right: none;
  background: transparent;
}

.project-menu .el-menu-item {
  height: 56px;
  line-height: 56px;
  color: var(--color-text-secondary);
}

.project-menu .el-menu-item:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.project-menu .el-menu-item.is-active {
  background: var(--color-primary-bg-light);
  color: var(--color-primary);
}

.project-main {
  flex: 1;
  overflow-y: auto;
  background: var(--color-bg-base);
}
</style>
