<template>
  <div class="chart-container">
    <div class="chart-header">
      <h3>2025年中国汽车销量排行榜（TOP10）</h3>
      <p class="data-source">数据来源：中商产业研究院、乘联会</p>
    </div>
    <div ref="chartRef" class="chart"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as echarts from 'echarts';

const chartRef = ref(null);
let chartInstance = null;

const salesData = [
  { name: '比亚迪股份', value: 460.2 },
  { name: '上汽集团', value: 438.7 },
  { name: '吉利控股', value: 359.8 },
  { name: '中国一汽', value: 330.2 },
  { name: '长安汽车', value: 291.3 },
  { name: '奇瑞控股', value: 280.6 },
  { name: '上汽通用五菱', value: 87.8 },
  { name: '一汽丰田', value: 80.4 },
  { name: '广汽丰田', value: 77.3 },
  { name: '长城汽车', value: 69.9 }
];

const initChart = () => {
  if (!chartRef.value) return;
  
  chartInstance = echarts.init(chartRef.value);
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params) => {
        const data = params[0];
        return `<div style="font-weight: bold; margin-bottom: 4px;">${data.name}</div>
                <div>销量：<span style="color: #5470c6; font-weight: bold;">${data.value}</span> 万辆</div>`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '销量（万辆）',
      nameLocation: 'end',
      nameTextStyle: {
        color: '#666',
        fontSize: 12
      },
      axisLine: {
        lineStyle: {
          color: '#ccc'
        }
      },
      axisTick: {
        show: false
      },
      splitLine: {
        lineStyle: {
          color: '#eee',
          type: 'dashed'
        }
      }
    },
    yAxis: {
      type: 'category',
      data: salesData.map(item => item.name),
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: '#333',
        fontSize: 12,
        width: 100,
        overflow: 'truncate'
      }
    },
    series: [
      {
        name: '销量',
        type: 'bar',
        data: salesData.map(item => item.value),
        barWidth: '60%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#5470c6' },
            { offset: 1, color: '#91cc75' }
          ]),
          borderRadius: [0, 4, 4, 0]
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{c}',
          color: '#666',
          fontSize: 12
        },
        emphasis: {
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#2378f7' },
              { offset: 1, color: '#73c0de' }
            ])
          }
        }
      }
    ]
  };
  
  chartInstance.setOption(option);
};

const handleResize = () => {
  chartInstance?.resize();
};

onMounted(() => {
  initChart();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chartInstance?.dispose();
});
</script>

<style scoped lang="scss">
.chart-container {
  width: 100%;
  height: 100%;
//   min-height: 300px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 1rem; // 16px
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.chart-header {
  text-align: center;
  margin-bottom: 1rem; // 16px
}

.chart-header h3 {
  margin: 0 0 0.5rem 0; // 8px
  font-size: 16px;
  color: #333;
  font-weight: 600;
}

.data-source {
  margin: 0;
  font-size: 11px;
  color: #999;
}

.chart {
  flex: 1;
  width: 100%;
  min-height: 200px;
}
</style>
