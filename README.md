# Cesium Studio

一个基于 Vue 3 + Cesium 的在线地理信息可视化编辑器，提供丰富的代码示例和实时预览功能。

## 目录

- [项目概述](#项目概述)
- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [环境要求](#环境要求)
- [安装步骤](#安装步骤)
- [使用指南](#使用指南)
- [示例列表](#示例列表)
- [项目结构](#项目结构)
- [添加新示例](#添加新示例)
- [配置说明](#配置说明)
- [贡献规范](#贡献规范)
- [许可证](#许可证)

---

## 项目概述

Cesium Studio 是一个面向开发者的 Cesium 学习与演示平台，旨在帮助开发者快速掌握 Cesium 地理可视化技术。平台提供直观的代码编辑器和实时预览功能，让学习和调试 Cesium 代码变得更加高效。

---

## 功能特性

| 功能 | 描述 |
|------|------|
| **代码编辑** | 集成 Monaco Editor，支持 JavaScript 语法高亮 |
| **实时预览** | 左侧代码编辑，右侧 Cesium 场景即时渲染 |
| **示例画廊** | 提供多种 Cesium 功能示例，支持搜索和标签筛选 |
| **主题切换** | 支持亮色/暗色模式，适应不同开发环境 |
| **多主题色** | 提供 6 种主题色预设（默认白、淡紫、淡绿、淡粉、薄荷绿、柔和蓝） |
| **FPS监控** | 可选的帧率监控显示，便于性能调试 |
| **Console面板** | 内置控制台日志输出，便于调试代码 |
| **布局调整** | 支持面板宽度和控制台高度的拖拽调整 |
| **绘制工具** | 交互式绘制点、线、多边形、矩形等几何图形 |
| **测量工具** | 支持距离测量、面积测量、高度测量和坐标拾取 |
| **空间分析** | 提供剖面分析、坡向分析、方量分析、可见性分析等功能 |

---

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Vue | 3.5.x |
| 构建工具 | Vite | 8.0.x |
| 地理可视化 | Cesium | 1.141.x |
| 代码编辑器 | Monaco Editor | 0.55.x |
| 样式预处理 | Sass | 1.99.x |
| 路由管理 | Vue Router | 5.0.x |
| 图表库 | ECharts | 6.0.x |
| 地理计算 | Turf.js | 3.0.x |
| 类型检查 | TypeScript | 6.0.x |
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
cd cesium-studio
```

### 2. 配置环境变量

创建 `.env` 文件并配置必要的环境变量：

```bash
# 创建 .env 文件
touch .env
```

编辑 `.env` 文件，添加以下配置：

| 变量名 | 说明 | 获取方式 | 必填 |
|--------|------|----------|------|
| `VITE_CESIUM_TOKEN` | Cesium Ion 访问令牌 | [Cesium Ion 控制台](https://cesium.com/ion/) | 是 |
| `VITE_TIANDITU_TOKEN` | 天地图服务令牌 | [天地图开发者平台](https://www.tianditu.gov.cn/) | 否 |
| `VITE_MAPBOX_TOKEN` | Mapbox 访问令牌 | [Mapbox 控制台](https://account.mapbox.com/) | 否 |

**获取令牌：**

- **Cesium Ion 令牌（必填）**：
  1. 访问 [Cesium Ion 控制台](https://cesium.com/ion/)
  2. 注册或登录账号
  3. 在 `Access Tokens` 页面创建新令牌
  4. 将令牌复制到 `.env` 文件中

- **天地图令牌（可选）**：
  1. 访问 [天地图开发者平台](https://www.tianditu.gov.cn/)
  2. 注册账号并申请开发者权限
  3. 创建应用获取服务令牌
  4. 将令牌复制到 `.env` 文件中

- **Mapbox 令牌（可选）**：
  1. 访问 [Mapbox 控制台](https://account.mapbox.com/)
  2. 注册或登录账号
  3. 在 `Access tokens` 页面获取默认令牌或创建新令牌
  4. 将令牌复制到 `.env` 文件中

> **说明**：天地图和 Mapbox 令牌用于影像图层功能，如不配置则相关示例可能无法正常显示。

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
┌────┬────────────────────────────────────┬───────────────┐
│    │         AppMiddlePanel              │              │
│ App│      Monaco Editor                  │ AppRightPanel│
│Side│          代码编辑区                   │  Cesium预览   │
│ bar│                                     │              │
│    │                                     │──────────────┤
│    │                                     │              │
│    │                                     │  Console     │
│    │                                     │  (控制台)     │
└────┴────────────────────────────────────┴──────────────┘
```

### 功能入口

**顶部功能区**

| 图标 | 功能 | 说明 |
|------|------|------|
| 图片 | 画廊视图 | 浏览所有示例卡片 |
| 代码 | 编辑器视图 | 编写和运行代码 |
| 添加 | 新建示例 | 创建新的代码文件 |
| 文档 | 帮助文档 | 访问 Cesium 官方文档 |

**底部功能区**

| 图标 | 功能 | 说明 |
|------|------|------|
| GitHub | 项目仓库 | 访问源代码 |
| 邮箱 | 联系作者 | 发送邮件 |
| 月亮/太阳 | 明暗模式 | 切换应用主题 |
| 设置 | 应用设置 | 调整应用偏好（主题色预设、FPS监控等） |

### 运行代码

1. 在编辑器中编写或修改代码
2. 点击右上角 **▶ Run** 按钮
3. 右侧 Cesium 预览区将显示运行结果
4. 控制台输出日志信息

### 布局调整

- **水平拖拽**：拖拽中间面板和右侧面板之间的分隔线调整宽度
- **垂直拖拽**：拖拽 Cesium 区域和 Console 之间的分隔线调整高度

---

## 示例列表

项目提供以下 Cesium 示例，涵盖基础功能、实体管理、影像图层、地形、数据源、交互绘制、测量工具、空间分析和特殊效果等方面：

### 基础功能（Basic）

| 示例名称 | 描述 | 标签 |
|---------|------|------|
| Viewer 基础 | 创建基础 Viewer 实例，配置控件、添加实体、演示相机飞行到指定位置 | Viewer、基础类 |
| Camera 基础 | 演示相机操作方法（flyTo、setView、lookAt 等），实现视角倾斜、旋转、缩放等控制 | Camera、基础类 |
| Scene 基础 | 演示 Scene 配置选项（场景模式、大气、雾效、光照、地形夸张等），提供交互式控制面板 | Scene、基础类 |
| Globe 基础 | 演示 Globe 类配置（地球外观、地形、光照、深度测试、大气效果等），控制地球渲染 | Globe、基础类 |
| Color 颜色 | 演示 5 种颜色创建方式（内置常量、RGBA、RGB字节、十六进制、CSS颜色名），在地图展示 | Color、基础类 |
| Coordinate 坐标系 | 演示四种坐标系及转换方法（地理经纬度、地理弧度、屏幕、笛卡尔），控制台输出结果 | Coordinate、基础类 |
| ScreenSpaceEvent 屏幕空间事件 | 演示屏幕空间事件监听和场景拾取，点击创建点标记并显示自定义弹窗 | ScreenSpaceEvent、基础类 |

### 实体管理（Entity）

| 示例名称 | 描述 | 标签 |
|---------|------|------|
| Entities 基础 | 创建基础的Cesium Viewer实例，演示如何添加包含点标记、广告牌和文字标签的完整实体对象 | Entities、基础类 |
| 点实体 | 创建点实体对象，设置点的颜色、大小、高度参考和深度测试等属性 | Entities、Point |
| 折线实体 | 创建折线实体对象，设置折线的宽度、颜色材质、是否贴地等属性 | Entities、Polyline |
| 多边形实体 | 创建多边形实体对象，设置多边形的颜色、大小、高度参考和深度测试等属性 | Entities、Polygon |
| 模型实体 | 创建模型实体对象，加载3D模型文件，设置模型的位置、旋转、缩放等属性 | Entities、Model |

### 影像图层（Imagery）

| 示例名称 | 描述 | 标签 |
|---------|------|------|
| OpenStreetMap 影像 | 添加 OpenStreetMap 影像图层 | Imagery、影像、OpenStreetMap |
| Mapbox 影像 | 添加 Mapbox 影像图层 | Imagery、影像、Mapbox |

### 地形（Terrain）

| 示例名称 | 描述 | 标签 |
|---------|------|------|
| 地形基础 | 添加基础地形图层 | Terrain、基础 |
| 地形自定义 | 添加自定义地形图层 | Terrain、自定义 |
| 地形高程分层设色 | 根据地形高程分层设置颜色 | Terrain、地形高程分层设色 |

### 数据源（DataSource）

| 示例名称 | 描述 | 标签 |
|---------|------|------|
| GeoJSON 数据源 | 加载 GeoJSON 数据，显示在地图上 | DataSource、GeoJSON |
| KML 数据源 | 加载 KML 数据，显示在地图上 | DataSource、KML |

### 交互绘制（Interaction）

| 示例名称 | 描述 | 标签 |
|---------|------|------|
| 绘制工具合集 | 交互式绘制工具：使用 useCesiumDraw composable，支持点、线、多边形、矩形的绘制，左键添加顶点，右键完成绘制 | Interaction、绘制 |
| 绘制点 | 交互式点绘制工具，点击地图添加点位，支持清除绘制内容 | Interaction、绘制、Point |
| 绘制折线 | 交互式折线绘制工具，点击添加顶点、右键完成绘制，支持清除 | Interaction、绘制、Polyline |
| 绘制多边形 | 交互式多边形绘制工具，点击添加顶点、右键闭合绘制，支持清除 | Interaction、绘制、Polygon |

### 测量工具（Measurement）

| 示例名称 | 描述 | 标签 |
|---------|------|------|
| 测量工具合集 | 交互式测量工具：使用 useMeasurement composable，支持距离测量、面积测量、高度测量和坐标拾取 | Interaction、测量 |
| 距离测量 | 独立实现的距离测量示例：点击添加两点，计算并显示两点间距离 | Interaction、测量、距离 |
| 面积测量 | 独立实现的面积测量示例：点击添加顶点（至少3个），右键完成，计算面积 | Interaction、测量、面积 |
| 高度测量 | 独立实现的高度测量示例：点击选择两点，计算地形高度差 | Interaction、测量、高度 |
| 坐标拾取 | 独立实现的坐标拾取示例：点击地图显示经纬度和高度信息 | Interaction、测量、坐标 |

### 空间分析（SpatialAnalysis）

| 示例名称 | 描述 | 标签 |
|---------|------|------|
| 空间分析合集 | 综合空间分析示例：使用 useSectionAnalysis、useAspectAnalysis、useSlopeAnalysis、useMeasureVolume composable，集成剖面、坡向、坡度、方量、可见性分析 | SpatialAnalysis、空间分析 |
| 剖面分析 | 地形剖面分析示例：绘制路径，生成地形剖面图 | SpatialAnalysis、剖面分析 |
| 坡向分析 | 地形坡向分析示例：绘制区域，分析坡面朝向分布 | SpatialAnalysis、坡向分析 |
| 坡度分析 | 地形坡度分析示例：绘制区域，分析坡面倾斜角度分布 | SpatialAnalysis、坡度分析 |
| 方量分析 | 挖填方方量分析示例：绘制区域，计算挖方填方量 | SpatialAnalysis、方量分析 |
| 可见性分析 | 视线可见性分析示例：设置观察点和目标点，判断通视性 | SpatialAnalysis、可见性分析 |

### 特殊效果（SpecialEffects）

| 示例名称 | 描述 | 标签 |
|---------|------|------|
| 天气效果 | 模拟雨、雪、雾等天气效果，支持参数调节 | SpecialEffects、天气效果 |

---

## 项目结构

```
CesiumStudio/
├── public/                              # 静态资源目录
│   ├── favicon.ico                      # 网站图标
│   └── thumbnails/                      # 示例缩略图
│       └── *.png                        # 示例缩略图文件
│
├── src/                                 # 源代码目录
│   ├── assets/                          # 资源文件
│   │   ├── fonts/                       # 字体文件
│   │   │   ├── iconfont.css             # 图标字体样式
│   │   │   ├── iconfont.js              # 图标字体数据
│   │   │   ├── iconfont.json            # 图标配置
│   │   │   └── iconfont.*               # 字体文件（woff/ttf）
│   │   └── styles/                      # 样式文件
│   │       └── main.scss                # 全局样式与主题变量
│   │
│   ├── components/                      # Vue 组件
│   │   ├── AppSidebar.vue               # 左侧功能栏
│   │   ├── AppMiddlePanel.vue           # 中间面板（编辑器/画廊）
│   │   ├── AppRightPanel.vue            # 右侧面板（Cesium预览）
│   │   ├── SettingsPanel.vue            # 设置面板
│   │   └── FPSMonitor.vue               # FPS监控组件
│   │
│   ├── composables/                     # 可组合函数（Composables）
│   │   ├── useSettings.ts               # 设置管理（主题、暗色模式等）
│   │   ├── useResizer.js                # 拖拽调整逻辑
│   │   ├── useCesiumDraw.js             # Cesium 绘制工具（点、线、面、矩形）
│   │   ├── useMeasurement.js            # Cesium 测量工具（距离、面积、高度、坐标）
│   │   ├── useAspectAnalysis.js         # 坡向分析
│   │   ├── useSlopeAnalysis.js          # 坡度分析
│   │   ├── useSectionAnalysis.js        # 地形剖面分析
│   │   └── useMeasureVolume.js          # 方量计算
│   │
│   ├── examples/                        # Cesium 示例
│   │   ├── index.js                     # 示例配置与数据管理
│   │   ├── examples.vue                 # 示例页面主组件
│   │   ├── Basic/                       # 基础示例
│   │   │   ├── ViewerBasic.vue          # Viewer基础示例
│   │   │   ├── CameraBasic.vue          # 相机控制示例
│   │   │   ├── SceneBasic.vue           # 场景配置示例
│   │   │   ├── GlobeBasic.vue           # 地球配置示例
│   │   │   ├── ColorBasic.vue           # 颜色示例
│   │   │   ├── CoordinateBasic.vue      # 坐标系示例
│   │   │   └── ScreenSpaceEventBasic.vue # 屏幕空间事件示例
│   │   ├── Entity/                      # 实体示例
│   │   │   ├── BasicEntity.vue          # Entities基础示例
│   │   │   ├── PointEntity.vue          # 点实体示例
│   │   │   ├── PolylineEntity.vue       # 折线实体示例
│   │   │   ├── PolygonEntity.vue        # 多边形实体示例
│   │   │   └── ModelEntity.vue          # 模型实体示例
│   │   ├── Imagery/                     # 影像示例
│   │   │   ├── OSMImagery.vue           # OpenStreetMap影像示例
│   │   │   └── MapboxImagery.vue        # Mapbox影像示例
│   │   ├── Terrain/                     # 地形示例
│   │   │   ├── TerrainBasic.vue         # 地形基础示例
│   │   │   ├── TerrainCustom.vue        # 地形自定义示例
│   │   │   └── TerrainElevationColor.vue # 地形高程分层设色示例
│   │   ├── DataSource/                  # 数据源示例
│   │   │   ├── GeoJsonDataSource.vue    # GeoJSON数据源示例
│   │   │   └── KmlDataSource.vue        # KML数据源示例
│   │   ├── Interaction/                 # 交互示例
│   │   │   ├── DrawTool.vue             # 绘制工具合集
│   │   │   ├── DrawPoint.vue            # 绘制点
│   │   │   ├── DrawPolyline.vue         # 绘制折线
│   │   │   ├── DrawPolygon.vue          # 绘制多边形
│   │   │   ├── MeasureTool.vue          # 测量工具合集
│   │   │   ├── DistanceMeasure.vue      # 距离测量
│   │   │   ├── AreaMeasure.vue          # 面积测量
│   │   │   ├── HeightMeasure.vue        # 高度测量
│   │   │   └── CoordinatePick.vue       # 坐标拾取
│   │   ├── SpatialAnalysis/             # 空间分析示例
│   │   │   ├── SpatialAnaysis.vue       # 空间分析合集
│   │   │   ├── SectionAnalysis.vue      # 剖面分析
│   │   │   ├── AspectAnalysis.vue       # 坡向分析
│   │   │   ├── SlopeAnalysis.vue        # 坡度分析
│   │   │   ├── VolumeAnalysis.vue       # 方量分析
│   │   │   └── VisibilityAnalysis.vue   # 可见性分析
│   │   └── SpecialEffects/              # 特殊效果示例
│   │       ├── WeatherEffects.vue       # 天气效果
│   │       ├── weatherEffects.js        # 天气效果工具函数
│   │       └── weatherEffects2.js       # 天气效果工具函数
│   │
│   ├── router/                          # 路由配置
│   │   └── index.js                     # 路由配置文件
│   │
│   ├── utils/                           # 工具函数
│   │   └── codeExtractor.js             # 代码提取工具
│   │
│   ├── App.vue                          # 根组件
│   ├── main.js                          # 应用入口文件
│   └── env.d.ts                         # TypeScript 环境声明
│
├── index.html                           # HTML 入口文件
├── vite.config.js                       # Vite 配置
├── package.json                         # 项目依赖配置
├── tsconfig.json                        # TypeScript 配置
└── .gitignore                           # Git 忽略配置
```

---

## 添加新示例

### 步骤概览

```
1. 创建 .vue 文件
2. 在 src/examples/index.js 中注册示例
3. 添加缩略图（可选）推荐 180 × 120 像素
4. 测试验证
```

### 详细步骤

#### 第一步：创建示例组件

**文件位置**：`src/examples/{分类目录}/{文件名}.vue`

**分类目录**：
- `Basic/` - 基础功能示例（Viewer、Camera、Scene、Globe）
- `Entity/` - 实体相关示例（点、线、面、模型等）
- `Imagery/` - 影像图层相关示例（OSM、Mapbox等）
- `Terrain/` - 地形相关示例（地形加载、高程颜色等）
- `Interaction/` - 交互相关示例（绘制、测量等）
- `SpatialAnalysis/` - 空间分析示例（剖面、坡向、方量、可见性等）
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
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'

let viewer = null
const isReady = ref(false)

const initCesium = async () => {
  try {
    isReady.value = false
    viewer = new Cesium.Viewer('cesium-container')
    // 添加功能代码...
    isReady.value = true
    console.log('Cesium 初始化完成')
  } catch (error) {
    console.error('Cesium 初始化失败：', error)
  }
}

const destroyCesium = () => {
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
    viewer = null
  }
  isReady.value = false
  console.log('Cesium 销毁完成')
}

onMounted(() => {
  initCesium()
})

onUnmounted(() => {
  destroyCesium()
})
</script>

<template>
  <div class="cesium-wrapper">
    <div id="cesium-container"></div>
    <div v-if="!isReady" class="loading-overlay">加载中...</div>
  </div>
</template>

<style scoped>
.cesium-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
}

#cesium-container {
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  z-index: 1000;
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
| 主题色预设 | 选择界面主题色（默认白、淡紫、淡绿、淡粉、薄荷绿、柔和蓝） | 默认白 |

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
- [ECharts](https://echarts.apache.org/) - 图表库
- [Turf.js](https://turfjs.org/) - 地理空间分析库
