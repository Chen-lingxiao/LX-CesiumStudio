<script setup>
import { ref, onMounted } from "vue";
import HorizontalBar from "@/components/HorizonraBar.vue";
</script>

<template>
  <div class="container">
    <div class="left">
      <div class="echarts-container">
        <HorizontalBar />
      </div>
      <div class="echarts-container">
        <HorizontalBar />
      </div>
      <div class="echarts-container">
        <HorizontalBar />
      </div>
    </div>
    <div class="center"></div>
    <div class="right"></div>
  </div>
</template>

<style scoped lang="scss">
.container {
  display: flex;
  height: 100%;
  width: 100%;
}
.left {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin: 1.25rem; // 20px
  background-color: #f5f5f5;
}
.center {
  flex: 2;
}
.right {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin: 1.25rem; // 20px
  background-color: #f5f5f5;
}
.echarts-container {
  flex: 1;
  width: 100%;
  margin-bottom: 1.25rem; // 20px
}
</style>
