<script setup>
import { ref, onMounted, onUnmounted, nextTick, reactive } from 'vue'
import * as echarts from 'echarts'

/**
 * 可视化大屏响应式方案
 * 设计稿尺寸：1920px × 1080px
 * 响应式策略：采用 vw/vh 单位 + 媒体查询 + echarts autoresize
 * 
 * 布局结构：
 * - 头部：60px 高度，固定在顶部
 * - 主体：calc(100vh - 60px)，分为左、中、右三列
 *   - 左侧：3个图表，竖向排列
 *   - 中间：主要可视化区域（可容纳 Cesium 等）
 *   - 右侧：3个图表，竖向排列
 */

// 存储图表实例
const chartRefs = ref([])
const chartInstances = ref([])

// 弹窗状态
const dialogVisible = ref(false)
const dialogTitle = ref('')
const dialogContent = ref('')
const dialogChartData = reactive({})

// 当前选中的数据
const selectedData = reactive({
  chartType: '',
  itemName: '',
  value: 0,
  timestamp: ''
})

/**
 * 图表点击事件处理
 * @param {string} chartType - 图表类型
 * @param {object} params - echarts 点击参数
 */
const handleChartClick = (chartType, params) => {
  selectedData.chartType = chartType
  selectedData.itemName = params.name
  selectedData.value = params.value
  selectedData.timestamp = new Date().toLocaleString('zh-CN')
  
  // 设置弹窗内容
  dialogTitle.value = `${chartType} - ${params.name}`
  dialogContent.value = `
    <div style="padding: 10px;">
      <p><strong>数据项：</strong>${params.name}</p>
      <p><strong>数值：</strong>${params.value}</p>
      <p><strong>图表类型：</strong>${chartType}</p>
      <p><strong>点击时间：</strong>${selectedData.timestamp}</p>
    </div>
  `
  dialogVisible.value = true
}

/**
 * 关闭弹窗
 */
const closeDialog = () => {
  dialogVisible.value = false
}

/**
 * 获取图表配置（通用配置）
 * @param {string} chartType - 图表类型标识
 */
const getBaseOption = (chartType) => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderColor: '#1890ff',
    textStyle: { color: '#fff' }
  },
  // 统一的点击事件
  onClick: (params) => handleChartClick(chartType, params)
})

/**
 * 柱状图 - 月度销售额
 */
const getBarOption = () => ({
  ...getBaseOption('月度销售额'),
  title: { 
    text: '月度销售额', 
    left: 'center',
    textStyle: { 
      color: '#333',
      fontSize: '16px',
      fontWeight: 'bold'
    }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: ['1月', '2月', '3月', '4月', '5月', '6月'],
    axisLine: { lineStyle: { color: '#ddd' } },
    axisLabel: { color: '#666', fontSize: '12px' }
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } },
    axisLabel: { color: '#666', fontSize: '12px' }
  },
  series: [{
    name: '销售额',
    data: [120, 200, 150, 180, 220, 170],
    type: 'bar',
    barWidth: '50%',
    itemStyle: { 
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: '#5470c6' },
        { offset: 1, color: '#91cc75' }
      ]),
      borderRadius: [4, 4, 0, 0]
    },
    emphasis: {
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#2378f7' },
          { offset: 1, color: '#72e0a3' }
        ])
      }
    }
  }]
})

/**
 * 折线图 - 用户增长趋势
 */
const getLineOption = () => ({
  ...getBaseOption('用户增长趋势'),
  title: { 
    text: '用户增长趋势', 
    left: 'center',
    textStyle: { 
      color: '#333',
      fontSize: '16px',
      fontWeight: 'bold'
    }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    axisLine: { lineStyle: { color: '#ddd' } },
    axisLabel: { color: '#666', fontSize: '12px' }
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } },
    axisLabel: { color: '#666', fontSize: '12px' }
  },
  series: [{
    name: '用户数',
    data: [100, 120, 90, 150, 130, 180, 160],
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 8,
    lineStyle: { 
      color: '#fac858',
      width: 3
    },
    itemStyle: { color: '#fac858' },
    areaStyle: {
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: 'rgba(250, 200, 88, 0.3)' },
        { offset: 1, color: 'rgba(250, 200, 88, 0.05)' }
      ])
    }
  }]
})

/**
 * 饼图 - 市场份额
 */
const getPieOption = () => ({
  ...getBaseOption('市场份额'),
  title: { 
    text: '市场份额', 
    left: 'center',
    textStyle: { 
      color: '#333',
      fontSize: '16px',
      fontWeight: 'bold'
    }
  },
  legend: {
    orient: 'horizontal',
    bottom: '5%',
    textStyle: { color: '#666', fontSize: '11px' }
  },
  series: [{
    name: '市场份额',
    type: 'pie',
    radius: ['45%', '70%'],
    center: ['50%', '45%'],
    avoidLabelOverlap: false,
    itemStyle: {
      borderRadius: 8,
      borderColor: '#fff',
      borderWidth: 2
    },
    label: {
      show: true,
      formatter: '{b}: {d}%',
      fontSize: '11px',
      color: '#666'
    },
    emphasis: {
      label: {
        show: true,
        fontSize: '14px',
        fontWeight: 'bold'
      },
      itemStyle: {
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowColor: 'rgba(0, 0, 0, 0.3)'
      }
    },
    labelLine: {
      show: true,
      length: 15,
      length2: 10
    },
    data: [
      { value: 35, name: '华东区', itemStyle: { color: '#5470c6' } },
      { value: 25, name: '华南区', itemStyle: { color: '#91cc75' } },
      { value: 20, name: '华北区', itemStyle: { color: '#fac858' } },
      { value: 12, name: '西南区', itemStyle: { color: '#ee6666' } },
      { value: 8, name: '其他', itemStyle: { color: '#73c0de' } }
    ]
  }]
})

/**
 * 柱状图2 - 产品销量
 */
const getBarOption2 = () => ({
  ...getBaseOption('产品销量'),
  title: { 
    text: '产品销量', 
    left: 'center',
    textStyle: { 
      color: '#333',
      fontSize: '16px',
      fontWeight: 'bold'
    }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: ['A产品', 'B产品', 'C产品', 'D产品'],
    axisLine: { lineStyle: { color: '#ddd' } },
    axisLabel: { color: '#666', fontSize: '12px' }
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } },
    axisLabel: { color: '#666', fontSize: '12px' }
  },
  series: [{
    name: '销量',
    data: [320, 180, 240, 190],
    type: 'bar',
    barWidth: '60%',
    itemStyle: { 
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: '#91cc75' },
        { offset: 1, color: '#73c0de' }
      ]),
      borderRadius: [4, 4, 0, 0]
    }
  }]
})

/**
 * 折线图2 - 流量统计
 */
const getLineOption2 = () => ({
  ...getBaseOption('流量统计'),
  title: { 
    text: '流量统计', 
    left: 'center',
    textStyle: { 
      color: '#333',
      fontSize: '16px',
      fontWeight: 'bold'
    }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: ['Q1', 'Q2', 'Q3', 'Q4'],
    axisLine: { lineStyle: { color: '#ddd' } },
    axisLabel: { color: '#666', fontSize: '12px' }
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } },
    axisLabel: { color: '#666', fontSize: '12px' }
  },
  series: [{
    name: '流量(万)',
    data: [500, 680, 720, 850],
    type: 'line',
    smooth: true,
    symbol: 'diamond',
    symbolSize: 10,
    lineStyle: { 
      color: '#ee6666',
      width: 3
    },
    itemStyle: { color: '#ee6666' },
    areaStyle: {
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: 'rgba(238, 102, 102, 0.3)' },
        { offset: 1, color: 'rgba(238, 102, 102, 0.05)' }
      ])
    }
  }]
})

/**
 * 饼图2 - 用户分布
 */
const getPieOption2 = () => ({
  ...getBaseOption('用户分布'),
  title: { 
    text: '用户分布', 
    left: 'center',
    textStyle: { 
      color: '#333',
      fontSize: '16px',
      fontWeight: 'bold'
    }
  },
  legend: {
    orient: 'horizontal',
    bottom: '5%',
    textStyle: { color: '#666', fontSize: '11px' }
  },
  series: [{
    name: '用户分布',
    type: 'pie',
    radius: '60%',
    center: ['50%', '45%'],
    avoidLabelOverlap: false,
    itemStyle: {
      borderRadius: 6,
      borderColor: '#fff',
      borderWidth: 2
    },
    label: {
      show: true,
      formatter: '{b}: {d}%',
      fontSize: '11px',
      color: '#666'
    },
    emphasis: {
      label: {
        show: true,
        fontSize: '14px',
        fontWeight: 'bold'
      }
    },
    labelLine: {
      show: true,
      length: 12,
      length2: 8
    },
    data: [
      { value: 45, name: '25-34岁', itemStyle: { color: '#73c0de' } },
      { value: 28, name: '18-24岁', itemStyle: { color: '#3ba272' } },
      { value: 15, name: '35-44岁', itemStyle: { color: '#fc8452' } },
      { value: 12, name: '45岁以上', itemStyle: { color: '#9a60b4' } }
    ]
  }]
})

/**
 * 根据索引获取图表配置
 */
const getChartOption = (index) => {
  const chartTypes = [
    getBarOption(),    // 0: 左侧-柱状图
    getLineOption(),   // 1: 左侧-折线图
    getPieOption(),    // 2: 左侧-饼图
    getBarOption2(),   // 3: 右侧-柱状图
    getLineOption2(),  // 4: 右侧-折线图
    getPieOption2()    // 5: 右侧-饼图
  ]
  return chartTypes[index] || getBarOption()
}

/**
 * 初始化图表
 */
const initCharts = () => {
  chartRefs.value.forEach((el, index) => {
    if (el) {
      const chart = echarts.init(el)
      chartInstances.value.push(chart)
      
      // 设置图表配置
      const option = getChartOption(index)
      chart.setOption(option)
    }
  })
}

/**
 * 响应式处理 - 窗口大小变化时重绘图表
 */
const handleResize = () => {
  chartInstances.value.forEach(chart => {
    if (chart) {
      chart.resize()
    }
  })
}

/**
 * 生命周期：挂载完成
 */
onMounted(() => {
  // 使用 nextTick 确保 DOM 渲染完成后再初始化图表
  nextTick(() => {
    initCharts()
  })
  
  // 添加窗口大小变化监听
  window.addEventListener('resize', handleResize)
})

/**
 * 刷新图表数据
 */
const refreshCharts = () => {
  // 销毁现有图表
  chartInstances.value.forEach(chart => {
    if (chart) {
      chart.dispose()
    }
  })
  chartInstances.value = []
  
  // 重新初始化
  nextTick(() => {
    initCharts()
  })
  
  // 显示提示
  dialogTitle.value = '刷新成功'
  dialogContent.value = '<div style="padding: 10px; text-align: center;">所有图表已刷新完成！</div>'
  dialogVisible.value = true
}

/**
 * 显示信息弹窗
 */
const showInfo = () => {
  dialogTitle.value = '关于大屏'
  dialogContent.value = `
    <div style="padding: 10px;">
      <p><strong>设计稿尺寸：</strong>1920px × 1080px</p>
      <p><strong>技术栈：</strong>Vue 3 + ECharts</p>
      <p><strong>中间区域：</strong>预留 Cesium 3D 可视化</p>
      <p><strong>响应式：</strong>支持多屏幕尺寸自适应</p>
    </div>
  `
  dialogVisible.value = true
}

/**
 * 显示统计详情
 * @param {string} type - 统计类型
 */
const showStatDetail = (type) => {
  const details = {
    total: {
      title: '总用户统计',
      content: '总用户数为 12,345 人，同比增长 12.5%。'
    },
    active: {
      title: '活跃用户统计',
      content: '活跃用户数为 5,678 人，环比增长 8.3%。'
    },
    conversion: {
      title: '转化率统计',
      content: '当前转化率为 89.2%，较上月下降 2.1%。'
    }
  }
  
  const detail = details[type] || details.total
  dialogTitle.value = detail.title
  dialogContent.value = `<div style="padding: 10px;"><p>${detail.content}</p></div>`
  dialogVisible.value = true
}

/**
 * 弹窗确认操作
 */
const handleDialogAction = () => {
  alert('查看详细数据功能开发中...')
  closeDialog()
}

/**
 * 生命周期：卸载前清理
 */
onUnmounted(() => {
  // 移除监听
  window.removeEventListener('resize', handleResize)
  
  // 销毁所有图表实例，释放内存
  chartInstances.value.forEach(chart => {
    if (chart) {
      chart.dispose()
    }
  })
  chartInstances.value = []
})
</script>
<template>
  <!-- 
    可视化大屏布局结构
    设计稿尺寸：1920px × 1080px
    整体布局：头部(60px) + 主体(calc(100vh - 60px))
  -->
  <div class="dashboard">
    <!-- 
      头部区域：固定高度60px
      包含标题、时间、操作按钮等
    -->
    <header class="header">
      <div class="header-left">
        <h1 class="title">数据可视化大屏</h1>
        <span class="subtitle">Data Visualization Dashboard</span>
      </div>
      <div class="header-center">
        <div class="date-display">
          <span class="date-icon">📅</span>
          <span class="date-text">{{ new Date().toLocaleDateString('zh-CN') }}</span>
        </div>
        <div class="time-display">
          <span class="time-icon">🕐</span>
          <span class="time-text">{{ new Date().toLocaleTimeString('zh-CN') }}</span>
        </div>
      </div>
      <div class="header-right">
        <button class="btn btn-primary" @click="showInfo">信息</button>
        <button class="btn btn-secondary" @click="refreshCharts">刷新</button>
      </div>
    </header>

    <!-- 
      主体区域：高度 = 视口高度 - 头部高度(60px)
      采用 Flex 三列布局：左(30%) | 中(40%) | 右(30%)
    -->
    <main class="main-content">
      <!-- 左侧区域：3个图表，竖向排列 -->
      <aside class="sidebar-left">
        <!-- 图表卡片 -->
        <div class="chart-card">
          <div class="card-header">
            <span class="card-title">月度销售额</span>
            <span class="card-badge">实时</span>
          </div>
          <div class="card-body">
            <div ref="chartRefs" class="chart"></div>
          </div>
        </div>

        <div class="chart-card">
          <div class="card-header">
            <span class="card-title">用户增长趋势</span>
            <span class="card-badge">周统计</span>
          </div>
          <div class="card-body">
            <div ref="chartRefs" class="chart"></div>
          </div>
        </div>

        <div class="chart-card">
          <div class="card-header">
            <span class="card-title">市场份额</span>
            <span class="card-badge">占比</span>
          </div>
          <div class="card-body">
            <div ref="chartRefs" class="chart"></div>
          </div>
        </div>
      </aside>

      <!-- 
        中间区域：主要可视化区域
        预留用于 Cesium 地图或其他大型可视化组件
      -->
      <section class="center-panel">
        <div class="center-container">
          <div class="center-header">
            <h2 class="center-title">核心可视化区域</h2>
            <span class="center-subtitle">Cesium / 3D 可视化 / 数据看板</span>
          </div>
          
          <!-- 模拟 Cesium 容器 -->
          <div class="visualization-area">
            <div class="cesium-placeholder">
              <div class="placeholder-icon">🗺️</div>
              <p class="placeholder-text">Cesium 地图容器</p>
              <p class="placeholder-hint">点击图表查看详情 →</p>
            </div>
          </div>

          <!-- 快速统计卡片 -->
          <div class="quick-stats">
            <div class="stat-card" @click="showStatDetail('total')">
              <div class="stat-icon">👥</div>
              <div class="stat-info">
                <span class="stat-number">12,345</span>
                <span class="stat-name">总用户</span>
              </div>
              <div class="stat-trend positive">+12.5%</div>
            </div>
            <div class="stat-card" @click="showStatDetail('active')">
              <div class="stat-icon">✨</div>
              <div class="stat-info">
                <span class="stat-number">5,678</span>
                <span class="stat-name">活跃用户</span>
              </div>
              <div class="stat-trend positive">+8.3%</div>
            </div>
            <div class="stat-card" @click="showStatDetail('conversion')">
              <div class="stat-icon">📈</div>
              <div class="stat-info">
                <span class="stat-number">89.2%</span>
                <span class="stat-name">转化率</span>
              </div>
              <div class="stat-trend negative">-2.1%</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 右侧区域：3个图表，竖向排列 -->
      <aside class="sidebar-right">
        <div class="chart-card">
          <div class="card-header">
            <span class="card-title">产品销量</span>
            <span class="card-badge">对比</span>
          </div>
          <div class="card-body">
            <div ref="chartRefs" class="chart"></div>
          </div>
        </div>

        <div class="chart-card">
          <div class="card-header">
            <span class="card-title">流量统计</span>
            <span class="card-badge">季度</span>
          </div>
          <div class="card-body">
            <div ref="chartRefs" class="chart"></div>
          </div>
        </div>

        <div class="chart-card">
          <div class="card-header">
            <span class="card-title">用户分布</span>
            <span class="card-badge">年龄</span>
          </div>
          <div class="card-body">
            <div ref="chartRefs" class="chart"></div>
          </div>
        </div>
      </aside>
    </main>

    <!-- 
      弹窗组件：用于展示图表点击详情
      使用 CSS 动画实现平滑过渡效果
    -->
    <Teleport to="body">
      <div v-if="dialogVisible" class="modal-overlay" @click.self="closeDialog">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">{{ dialogTitle }}</h3>
            <button class="modal-close" @click="closeDialog">×</button>
          </div>
          <div class="modal-body" v-html="dialogContent"></div>
          <div class="modal-footer">
            <button class="btn btn-default" @click="closeDialog">关闭</button>
            <button class="btn btn-primary" @click="handleDialogAction">查看详情</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
<style scoped lang="scss">
/**
 * 可视化大屏样式 - 响应式方案
 * 设计稿尺寸：1920px × 1080px
 * 单位策略：使用 px 作为主要单位（大屏场景下更精确）
 *          配合百分比和 vw/vh 实现响应式适配
 * 
 * 布局结构：
 * - header: 60px 高度，固定顶部
 * - main-content: calc(100vh - 60px)，三列 flex 布局
 *   - sidebar-left: 30% 宽度
 *   - center-panel: 40% 宽度
 *   - sidebar-right: 30% 宽度
 */

/* ========== 全局重置与基础样式 ========== */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  overflow: hidden;
}

/* ========== 整体布局容器 ========== */
.dashboard {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f0f2f5;
}

/* ========== 头部区域 ========== */
.header {
  /* 固定高度60px，与设计稿一致 */
  height: 60px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 100;
}

.header-left {
  display: flex;
  flex-direction: column;
}

.title {
  font-size: 20px;
  font-weight: bold;
  color: #fff;
  letter-spacing: 2px;
}

.subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
}

.header-center {
  display: flex;
  gap: 32px;
}

.date-display,
.time-display {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 14px;
}

.date-icon,
.time-icon {
  font-size: 16px;
}

.header-right {
  display: flex;
  gap: 12px;
}

/* ========== 按钮样式 ========== */
.btn {
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}

.btn-default {
  background: #f5f5f5;
  color: #666;
}

.btn-default:hover {
  background: #e8e8e8;
}

/* ========== 主体内容区域 ========== */
.main-content {
  /* 主体高度 = 视口高度 - 头部高度 */
  height: calc(100vh - 60px);
  display: flex;
  gap: 16px;
  padding: 16px;
  overflow: hidden;
}

/* ========== 左侧边栏 ========== */
.sidebar-left {
  /* 设计稿比例：左侧占35% */
  width: calc(35% - 8px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

/* ========== 中间面板 ========== */
.center-panel {
  /* 设计稿比例：中间占30% */
  width: 30%;
  display: flex;
  align-items: stretch;
  justify-content: center;
  height: 100%;
}

.center-container {
  width: 100%;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.center-header {
  text-align: center;
  margin-bottom: 10px;
}

.center-title {
  font-size: 16px;
  color: #333;
  margin-bottom: 2px;
}

.center-subtitle {
  font-size: 12px;
  color: #999;
}

/* Cesium 可视化区域 */
.visualization-area {
  flex: 0 0 45%;
  max-height: 250px;
  background: linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  position: relative;
  overflow: hidden;
}

.visualization-area::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 80%, rgba(102, 126, 234, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(118, 75, 162, 0.15) 0%, transparent 50%);
}

.cesium-placeholder {
  text-align: center;
  z-index: 1;
}

.placeholder-icon {
  font-size: 64px;
  margin-bottom: 16px;
  animation: float 3s ease-in-out infinite;
}

.placeholder-text {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 8px;
}

.placeholder-hint {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
}

/* 快速统计卡片 */
.quick-stats {
  display: flex;
  gap: 12px;
}

.stat-card {
  flex: 1;
  min-height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

.stat-icon {
  font-size: 32px;
}

.stat-info {
  flex: 1;
}

.stat-number {
  display: block;
  font-size: 20px;
  font-weight: bold;
  color: #fff;
}

.stat-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.stat-trend {
  font-size: 12px;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 12px;
}

.stat-trend.positive {
  background: rgba(255, 255, 255, 0.2);
  color: #90ee90;
}

.stat-trend.negative {
  background: rgba(255, 255, 255, 0.2);
  color: #ff6b6b;
}

/* ========== 右侧边栏 ========== */
.sidebar-right {
  /* 设计稿比例：右侧占35% */
  width: calc(35% - 8px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

/* ========== 图表卡片 ========== */
.chart-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
  flex: 1;
  min-height: 220px;
  display: flex;
  flex-direction: column;
}

.chart-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.card-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.card-body {
  padding: 8px;
  height: calc(100% - 45px);
}

.chart {
  width: 100%;
  height: 100%;
  min-height: 180px;
}

/* ========== 弹窗组件 ========== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  width: 480px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 20px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.modal-body {
  padding: 20px;
  font-size: 14px;
  color: #666;
  line-height: 1.8;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
}

/* ========== 动画效果 ========== */
@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========== 响应式断点配置 ========== */

/**
 * 响应式策略说明：
 * 1. 基准设计稿：1920px × 1080px
 * 2. 采用固定像素 + 百分比混合方案
 * 3. 关键断点：
 *    - 1920px+：全屏显示，保持设计稿比例
 *    - 1600px：开始压缩间距
 *    - 1200px：调整布局比例
 *    - 900px：切换为两列布局
 *    - 600px：切换为单列布局
 */

/* 超宽屏（> 2560px）- 增加内边距 */
@media screen and (min-width: 2560px) {
  .main-content {
    padding: 24px;
    gap: 24px;
  }
  
  .chart-card {
    border-radius: 12px;
  }
  
  .card-header {
    padding: 16px 20px;
  }
  
  .card-title {
    font-size: 16px;
  }
}

/* 大屏幕（1920px - 2560px）- 正常显示 */
@media screen and (min-width: 1920px) and (max-width: 2560px) {
  /* 保持设计稿比例 */
}

/* 中等屏幕（1600px - 1920px）- 压缩间距 */
@media screen and (max-width: 1920px) {
  .header {
    padding: 0 16px;
  }
  
  .main-content {
    padding: 12px;
    gap: 12px;
  }
  
  .center-container {
    padding: 16px;
  }
}

/* 小屏幕（1200px - 1600px）- 调整布局比例 */
@media screen and (max-width: 1600px) {
  .sidebar-left,
  .sidebar-right {
    width: calc(33% - 6px);
  }
  
  .center-panel {
    width: 34%;
  }
  
  .chart {
    min-height: 150px;
  }
}

/* 平板横屏（900px - 1200px）- 切换为两列布局 */
@media screen and (max-width: 1200px) {
  .main-content {
    flex-direction: column;
    overflow-y: auto;
  }
  
  .sidebar-left,
  .center-panel,
  .sidebar-right {
    width: 100%;
    height: auto;
  }
  
  .sidebar-left,
  .sidebar-right {
    flex-direction: row;
  }
  
  .chart-card {
    flex: 1;
    min-width: 300px;
  }
  
  .center-panel {
    order: -1; /* 中间区域移到顶部 */
    min-height: 300px;
  }
  
  .quick-stats {
    flex-wrap: wrap;
  }
  
  .stat-card {
    min-width: calc(50% - 6px);
  }
}

/* 平板竖屏（600px - 900px）- 单列布局 */
@media screen and (max-width: 900px) {
  .sidebar-left,
  .sidebar-right {
    flex-direction: column;
  }
  
  .chart-card {
    min-width: 100%;
  }
  
  .stat-card {
    min-width: 100%;
  }
  
  .header-center {
    display: none; /* 隐藏日期时间 */
  }
  
  .title {
    font-size: 16px;
  }
}

/* 手机屏幕（< 600px）- 紧凑布局 */
@media screen and (max-width: 600px) {
  .header {
    height: 50px;
    padding: 0 12px;
  }
  
  .main-content {
    height: calc(100vh - 50px);
  }
  
  .title {
    font-size: 14px;
  }
  
  .subtitle {
    display: none;
  }
  
  .btn {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .card-header {
    padding: 10px 12px;
  }
  
  .card-title {
    font-size: 12px;
  }
  
  .chart {
    min-height: 120px;
  }
  
  .modal-content {
    width: calc(100% - 24px);
    margin: 0 12px;
  }
}

/* 超小屏幕（< 400px） */
@media screen and (max-width: 400px) {
  .quick-stats {
    flex-direction: column;
  }
  
  .center-title {
    font-size: 16px;
  }
  
  .placeholder-text {
    font-size: 14px;
  }
}
</style>
