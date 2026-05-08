# CesiumStudio-LX

一个基于 Vue 3 + Cesium 的交互式地理信息可视化工作台，提供丰富的代码示例和实时预览功能。

## 目录

- [项目概述](#项目概述)
- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [环境要求](#环境要求)
- [安装步骤](#安装步骤)
- [使用指南](#使用指南)
- [项目结构](#项目结构)
- [添加新示例](#添加新示例)
- [配置说明](#配置说明)
- [贡献规范](#贡献规范)
- [许可证](#许可证)
- [致谢](#致谢)

---

## 项目概述

CesiumStudio-LX 是一个面向开发者的 Cesium 学习与演示平台，旨在帮助开发者快速掌握 Cesium 地理可视化技术。平台提供直观的代码编辑器和实时预览功能，让学习和调试 Cesium 代码变得更加高效。

---

## 功能特性

| 功能 | 描述 |
|------|------|
| **代码编辑** | 集成 Monaco Editor，支持 JavaScript/HTML/CSS 语法高亮 |
| **实时预览** | 左侧代码编辑，右侧 Cesium 场景即时渲染 |
| **示例画廊** | 提供多种 Cesium 功能示例，支持搜索和标签筛选 |
| **主题切换** | 支持亮色/暗色模式，适应不同开发环境 |
| **多主题色** | 提供多种主题色预设，个性化界面风格 |
| **FPS监控** | 可选的帧率监控显示，便于性能调试 |
| **Console面板** | 内置控制台日志输出，便于调试代码 |
| **布局调整** | 支持面板宽度和控制台高度的拖拽调整 |

---

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Vue | 3.5.x |
| 构建工具 | Vite | 8.0.x |
| 地理可视化 | Cesium | 1.141.x |
| 代码编辑器 | Monaco Editor | 0.55.x |
| 样式预处理 | Sass | 1.99.x |
| 包管理器 | pnpm | 推荐 |

---

## 环境要求

- **Node.js**: ^20.19.0 或 >=22.12.0
- **pnpm**: ^8.0.0（推荐）或 npm/yarn

---

## 安装步骤

### 1. 克隆项目

```bash
git clone <repository-url>
cd CesiumStudio-LX
```

### 2. 配置环境变量

创建 `.env` 文件并配置必要的环境变量：

```bash
# 创建 .env 文件
touch .env
```

编辑 `.env` 文件，添加以下配置：

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `VITE_CESIUM_TOKEN` | Cesium Ion 访问令牌 | [Cesium Ion 控制台](https://cesium.com/ion/) |

**获取 Cesium Ion 令牌：**

1. 访问 [Cesium Ion 控制台](https://cesium.com/ion/)
2. 注册或登录账号
3. 在 `Access Tokens` 页面创建新令牌
4. 将令牌复制到 `.env` 文件中

### 3. 安装依赖

```bash
pnpm install
```

### 4. 启动开发服务器

```bash
pnpm dev
```

### 5. 构建生产版本

```bash
pnpm build
```

### 6. 预览生产构建

```bash
pnpm preview
```

---

## 使用指南

### 界面布局

```
┌─────────────────────────────────────────────────────────┐
│                      AppHeader                          │
├────┬────────────────────────────────────┬───────────────┤
│    │         AppMiddlePanel              │              │
│    │      Monaco Editor                  │ AppRightPanel│
│ App│          代码编辑区                   │  Cesium预览   │
│Side│                                     │              │
│ bar│                                     │──────────────┤
│    │                                     │              │
│    │                                     │  Console     │
│    │                                     │  (控制台)     │
└────┴────────────────────────────────────┴──────────────┘
```

### 功能入口

| 图标 | 功能 | 说明 |
|------|------|------|
| 画廊 | 画廊视图 | 浏览所有示例卡片 |
| 代码编辑 | 编辑器视图 | 编写和运行代码 |
| 新建 | 新建示例 | 创建新的代码文件 |
| 文档 | 帮助文档 | 访问 Cesium 官方文档 |
| 设置 | 应用设置 | 调整应用偏好 |
| 主题 | 明暗模式 | 切换应用主题 |
| 邮箱 | 联系作者 | 发送反馈邮件 |
| GitHub | 项目仓库 | 访问源代码 |

### 运行代码

1. 在编辑器中编写或修改代码
2. 点击右上角 **▶ Run** 按钮
3. 右侧 Cesium 预览区将显示运行结果
4. 控制台输出日志信息

### 布局调整

- **水平拖拽**：拖拽中间面板和右侧面板之间的分隔线调整宽度
- **垂直拖拽**：拖拽 Cesium 区域和 Console 之间的分隔线调整高度

---

## 项目结构

```
CesiumStudio-LX/
├── public/                          # 静态资源目录
│   ├── favicon.ico                  # 网站图标
│   └── thumbnails/                   # 示例缩略图
│       └── basic-entity.png          # 示例缩略图文件
│
├── src/                             # 源代码目录
│   ├── assets/                       # 资源文件
│   │   ├── fonts/                    # 字体文件
│   │   │   ├── iconfont.css          # 图标字体样式
│   │   │   ├── iconfont.js           # 图标字体数据
│   │   │   ├── iconfont.json         # 图标配置
│   │   │   └── iconfont.*            # 字体文件（woff/ttf）
│   │   └── styles/                   # 样式文件
│   │       └── main.scss             # 全局样式与主题变量
│   │
│   ├── components/                   # Vue 组件
│   │   ├── AppHeader.vue             # 顶部导航栏
│   │   ├── AppSidebar.vue            # 左侧功能栏
│   │   ├── AppMiddlePanel.vue        # 中间面板（编辑器/画廊）
│   │   ├── AppRightPanel.vue         # 右侧面板（Cesium预览）
│   │   ├── SettingsPanel.vue         # 设置面板
│   │   └── FPSMonitor.vue            # FPS监控组件
│   │
│   ├── composables/                  # 可组合函数
│   │   ├── useSettings.ts            # 设置管理
│   │   └── useResizer.js             # 拖拽调整逻辑
│   │
│   ├── examples/                     # Cesium 示例
│   │   ├── index.js                  # 示例配置与数据管理
│   │   ├── Basic/                    # 基础示例目录
│   │   │   └── BasicCesium.vue       # 基础Cesium示例
│   │   ├── Entity/                   # 实体示例目录
│   │   │   └── Basic.vue             # Entities基础示例
│   │   └── Imagery/                  # 影像示例目录
│   │       └── BaseImagery.vue       # 影像管理示例
│   │
│   ├── App.vue                       # 根组件（布局管理）
│   └── main.js                       # 应用入口文件
│
├── index.html                        # HTML 入口文件
├── vite.config.js                    # Vite 配置
├── package.json                      # 项目依赖配置
├── jsconfig.json                     # JavaScript 配置
└── .gitignore                        # Git 忽略配置
```

---

## 添加新示例

### 步骤概览

```
1. 创建 .vue 文件
2. 在 src/examples/index.js 中注册示例
3. 添加缩略图（可选）推荐 180 * 120 像素
4. 测试验证
```

### 详细步骤

#### 第一步：创建示例组件

**文件位置**：`src/examples/{分类目录}/{文件名}.vue`

**分类目录**：
- `Basic/` - 基础功能示例
- `Entity/` - 实体相关示例（点、线、面等）
- `Imagery/` - 影像图层相关示例
- 其他分类可按需创建新目录

**文件结构**：

```vue
<script setup>
/**
 * {文件名}.vue - {示例名称}
 * 
 * 功能说明：
 * 1. {功能点1}
 * 2. {功能点2}
 * 
 * 技术要点：
 * - {技术细节1}
 * - {技术细节2}
 */
import { onMounted, onUnmounted } from 'vue'
import * as Cesium from 'cesium'

let viewer = null

const initCesium = () => {
  viewer = new Cesium.Viewer('cesium-container', {})
  // 添加功能代码...
}

onMounted(() => {
  initCesium()
})

onUnmounted(() => {
  if (viewer) {
    viewer.destroy()
    viewer = null
  }
})
</script>

<template>
  <div id="cesium-container"></div>
</template>

<style scoped>
#cesium-container {
  width: 100%;
  height: 100%;
}
</style>
```

#### 第二步：注册示例

**文件位置**：`src/examples/index.js`

```javascript
// 添加导入
import YourExample from './YourCategory/YourExample.vue'
import yourExampleCode from './YourCategory/YourExample.vue?raw'

// 在 examples 数组中添加配置
{
  id: 'your-example-id',
  name: '示例名称',
  description: '示例功能描述',
  tags: ['Tag1', 'Tag2'],
  thumbnail: '/thumbnails/your-example.png',
  component: YourExample,
  ...extractCode(yourExampleCode)
}
```

---

## 配置说明

### 环境变量

| 变量名 | 必填 | 说明 | 默认值 |
|--------|------|------|--------|
| `VITE_CESIUM_TOKEN` | 是 | Cesium Ion 访问令牌 | 无 |

### 设置面板

设置面板提供以下配置选项：

| 设置项 | 说明 | 默认值 |
|--------|------|--------|
| FPS监控 | 显示/隐藏帧率监控 | 开启 |
| 明暗模式 | 切换亮色/暗色主题 | 亮色 |
| 主题色预设 | 选择界面主题色 | 默认白 |

---

## 贡献规范

### 代码风格

1. 使用 Vue 3 Composition API
2. 使用中文注释
3. 遵循项目代码规范

### 提交信息格式

```
type: subject

body (可选)

footer (可选)
```

**type 类型**：
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 样式调整
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具变更

**示例**：
```bash
git commit -m "feat: 添加影像图层管理示例

- 添加BaseImagery组件
- 支持切换默认影像源
- 添加图层控制UI"
```

### 问题反馈

通过 GitHub Issues 反馈问题时，请包含：
- 清晰的标题和描述
- 复现步骤
- 预期 vs 实际行为
- 环境信息（浏览器、Node版本等）

---

## 许可证

MIT License

---

## 致谢

- [Cesium](https://cesium.com/cesiumjs/) - 地理可视化引擎
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - 代码编辑器
- [Vue.js](https://vuejs.org/) - 前端框架
- [Vite](https://vitejs.dev/) - 构建工具
