<script setup>
/**
 * ColorBasic.vue - Cesium 颜色创建方式示例组件
 *
 * 【功能说明】
 * 1. 演示 Cesium 中 5 种常用的颜色创建方式
 * 2. 在地图上展示不同颜色创建方式的点标记
 * 3. 每个点标记带有标签说明其颜色创建方式
 *
 * 【核心技术要点】
 *
 * 1. Cesium 内置颜色常量
 *    - 直接通过 Cesium.Color.XXX 调用
 *    - 常用颜色：RED, BLUE, GREEN, YELLOW, WHITE, BLACK, CYAN, MAGENTA 等
 *    - 示例：Cesium.Color.RED, Cesium.Color.BLUE
 *
 * 2. 通过 RGBA 浮点数创建（最常用）
 *    - 使用 new Cesium.Color(red, green, blue, alpha)
 *    - 参数范围：0.0 ~ 1.0 的浮点数
 *    - 示例：new Cesium.Color(0.165, 1, 0.165, 0.8)
 *
 * 3. 从 0~255 的 RGB 值转换（更符合直觉）
 *    - 使用 Cesium.Color.fromBytes(red, green, blue, alpha)
 *    - 参数范围：0 ~ 255 的整数
 *    - 示例：Cesium.Color.fromBytes(255, 128, 0, 255)
 *
 * 4. 从十六进制字符串创建（如 CSS 颜色）
 *    - 使用 Cesium.Color.fromCssColorString()
 *    - 支持 #RRGGBB 或 #RRGGBBAA 格式
 *    - 示例：Cesium.Color.fromCssColorString("#ff8000")
 *
 * 5. 从 CSS 颜色名创建
 *    - 使用 Cesium.Color.fromCssColorString()
 *    - 支持常见 CSS 颜色名（如 "red"、"skyblue"、"transparent"）
 *    - 示例：Cesium.Color.fromCssColorString("skyblue")
 *
 * 【颜色属性说明】
 * - withAlpha(alpha)：设置透明度，返回新颜色对象
 * - fromRandom(options)：生成随机颜色
 * - toCssColorString()：转换为 CSS 颜色字符串
 * - toBytes()：转换为 0~255 的字节数组
 *
 * 【使用场景】
 * - 实体颜色：point.color, polyline.material, polygon.material
 * - 标签颜色：label.fillColor, label.outlineColor
 * - 地形颜色：ElevationBandMaterial
 * - 可视化效果：热力图、分类渲染、状态标识
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'

let viewer = null // Cesium 实例
const isReady = ref(false) // 初始化状态

const initCesium = async () => {
    try {
        isReady.value = false
        viewer = new Cesium.Viewer('cesium-container')

        const baseLon = -75.166493
        const baseLat = 39.9060534
        const lonOffset = 0.02

        viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(baseLon, baseLat),
            point: {
                pixelSize: 50,
                color: Cesium.Color.RED,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 3
            },
            label: {
                text: '1. 内置颜色常量\nCesium.Color.RED',
                font: '14px 微软雅黑',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                pixelOffset: new Cesium.Cartesian2(0, -60),
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        });

        viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(baseLon + lonOffset, baseLat),
            point: {
                pixelSize: 50,
                color: new Cesium.Color(0.165, 1, 0.165, 0.8),
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 3
            },
            label: {
                text: '2. RGBA 浮点数\nnew Color(0.165, 1, 0.165, 0.8)',
                font: '14px 微软雅黑',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                pixelOffset: new Cesium.Cartesian2(0, -60),
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        });

        viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(baseLon + lonOffset * 2, baseLat),
            point: {
                pixelSize: 50,
                color: Cesium.Color.fromBytes(255, 128, 0, 255),
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 3
            },
            label: {
                text: '3. RGB 0~255 值\nfromBytes(255, 128, 0, 255)',
                font: '14px 微软雅黑',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                pixelOffset: new Cesium.Cartesian2(0, -60),
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        });

        viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(baseLon + lonOffset * 3, baseLat),
            point: {
                pixelSize: 50,
                color: Cesium.Color.fromCssColorString("#ff00ff"),
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 3
            },
            label: {
                text: '4. 十六进制字符串\nfromCssColorString("#ff00ff")',
                font: '14px 微软雅黑',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                pixelOffset: new Cesium.Cartesian2(0, -60),
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        });

        viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(baseLon + lonOffset * 4, baseLat),
            point: {
                pixelSize: 50,
                color: Cesium.Color.fromCssColorString("skyblue"),
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 3
            },
            label: {
                text: '5. CSS 颜色名\nfromCssColorString("skyblue")',
                font: '14px 微软雅黑',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                pixelOffset: new Cesium.Cartesian2(0, -60),
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        });

        viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(baseLon + lonOffset * 5, baseLat),
            point: {
                pixelSize: 50,
                color: Cesium.Color.BLUE.withAlpha(0.5),
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 3
            },
            label: {
                text: '6. withAlpha() 方法\nBLUE.withAlpha(0.5)',
                font: '14px 微软雅黑',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                pixelOffset: new Cesium.Cartesian2(0, -60),
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        });

        viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(baseLon + lonOffset * 6, baseLat),
            point: {
                pixelSize: 50,
                color: Cesium.Color.fromRandom({ alpha: 0.8 }),
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 3
            },
            label: {
                text: '7. fromRandom() 方法\nfromRandom({ alpha: 0.8 })',
                font: '14px 微软雅黑',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                pixelOffset: new Cesium.Cartesian2(0, -60),
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        });

        viewer.zoomTo(viewer.entities);
        isReady.value = true
        console.log('ColorBasic 初始化完成')
    } catch (error) {
        console.error('ColorBasic 初始化失败：', error)
    }
}
// 销毁 Cesium 实例
const destroyCesium = () => {
    if (viewer && !viewer.isDestroyed()) {
        viewer.destroy()
        viewer = null
    }
    isReady.value = false
    console.log('ColorBasic 销毁完成')
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
