<script setup>
/**
 * BasicEntity.vue - Cesium Entity 基础示例组件
 *
 * 功能说明：
 * 1. 创建基础的 Cesium Viewer 实例
 * 2. 添加一个完整的实体对象（包含点标记、广告牌、文字标签）
 * 3. 演示如何使用 Cesium Entities API 创建和管理地理实体
 *
 * 技术要点：
 * - Entity 支持多种可视化属性：point、billboard、label、polyline、polygon 等
 * - heightReference: 高度参考（NONE/RELATIVE_TO_GROUND/CLAMP_TO_GROUND）
 * - disableDepthTestDistance: 禁用深度测试，使标注始终显示在最前方
 * - distanceDisplayCondition: 根据距离控制显示范围
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'

let viewer = null // Cesium 实例
const isReady = ref(false) // 初始化状态
const dataurl = '/static/GeoJSON/China.geojson'
async function loadBasicGeoJSON(url) {
    try {
        // 加载数据并配置默认样式
        const dataSource = await Cesium.GeoJsonDataSource.load(url, {
            id: "china-data", // 自定义数据源ID，方便后续查询
            stroke: Cesium.Color.BLACK, // 线/面轮廓颜色
            strokeWidth: 2, // 轮廓宽度
            fill: Cesium.Color.BLUE.withAlpha(0.5), // 面填充色
            clampToGround: true, // 贴地显示（默认false）
        });
        dataSource.entities.values.forEach(entity => {
            //  获取名称属性
            if (entity.properties.name && entity.properties.center) {
                const name = entity.properties.name.getValue()
                const center = entity.properties.center.getValue()
                console.log(center, name)
                const position = Cesium.Cartesian3.fromDegrees(center[0], center[1], 0)
                entity.position = position
                entity.label = new Cesium.LabelGraphics({
                    text: name,
                    font: "16px Microsoft YaHei",  // 字体
                    pixelOffset: new Cesium.Cartesian2(0, -10),
                    verticalOrigin: Cesium.VerticalOrigin.CENTER,
                    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                    fillColor: Cesium.Color.WHITE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    scale: 0.8,
                    show: true,
                })
                const randomColor = Cesium.Color.fromRandom({ alpha: 0.4 });
                entity.polygon.material = randomColor;
                entity.polygon.outline = true;
                entity.polygon.outlineColor = Cesium.Color.BLACK;
                entity.polygon.outlineWidth = 1;
            }
        })
        // 添加到数据源管理器
        viewer.dataSources.add(dataSource);

        // 获取加载后的实体集合，可进一步操作
        const entities = dataSource.entities.values;

        // 相机飞行到数据范围（自动适配视角）
        await viewer.flyTo(dataSource);

        console.log(`GeoJSON加载完成，共${entities.length}个实体`);
        return dataSource;
    } catch (error) {
        console.error("GeoJSON加载失败：", error);
        throw error;
    }
}
const initCesium = async () => {
    try {
        isReady.value = false
        viewer = new Cesium.Viewer('cesium-container', {
            // terrainProvider: await Cesium.createWorldTerrainAsync(),
        })
        await loadBasicGeoJSON(dataurl) // 加载GeoJSON数据

        isReady.value = true
        console.log('BasicEntity 初始化完成')
    } catch (error) {
        console.error('BasicEntity 初始化失败：', error)
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

<style scoped></style>
