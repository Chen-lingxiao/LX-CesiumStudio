<script setup>
/**
 * WeatherEffects.vue - Cesium 天气特效示例组件
 *
 * ============================================================================
 * 【功能说明】
 * ============================================================================
 *
 * 本组件演示 Cesium 中的三种天气特效实现：
 * - 雨 (rain) - 倾斜的雨滴效果
 * - 雪 (snow) - 雪花飘落效果
 * - 雾 (fog)  - 基于深度的雾效
 *
 * 特效基于 Cesium PostProcessStage（后处理阶段）实现，
 * 通过 fragmentShader 实现全屏天气渲染效果。
 *
 * ============================================================================
 * 【使用说明】
 * ============================================================================
 *
 * 1. 组件会自动创建独立的 Cesium Viewer
 * 2. 点击按钮切换不同天气效果
 * 3. 点击"关闭特效"按钮移除当前天气效果
 *
 * ============================================================================
 * 【weatherEffects 类 API】
 * ============================================================================
 *
 * 来自 weatherEffects2.js（包含完整的参数调节说明）
 *
 * 构造函数：
 *   new weatherEffects(viewer, options)
 *
 * 参数：
 *   - viewer: Cesium.Viewer 实例（必需）
 *   - options.name: string - 特效标识名称（默认：'weather'）
 *   - options.type: string - 天气类型
 *       • 'rain' - 雨滴效果
 *       • 'snow' - 雪花效果
 *       • 'fog'  - 雾效
 *
 * 方法：
 *   - removePostProcessStage()  // 移除特效
 *   - getStage()                // 获取 PostProcessStage 实例
 *
 * ============================================================================
 * 【组件集成示例】
 * ============================================================================
 *
 * 如果需要在其他组件中使用天气特效：
 *
 * ```javascript
 * import { weatherEffects } from './weatherEffects2.js'
 * import * as Cesium from 'cesium'
 *
 * export default {
 *   setup() {
 *     let viewer = null
 *     let currentWeather = null
 *
 *     const initViewer = async () => {
 *       viewer = new Cesium.Viewer('cesium-container', {
 *         terrainProvider: await Cesium.createWorldTerrainAsync()
 *       })
 *     }
 *
 *     const setWeather = (type) => {
 *       if (currentWeather) {
 *         currentWeather.removePostProcessStage()
 *       }
 *       currentWeather = new weatherEffects(viewer, {
 *         name: 'myWeather',
 *         type: type
 *       })
 *     }
 *
 *     const clearWeather = () => {
 *       if (currentWeather) {
 *         currentWeather.removePostProcessStage()
 *         currentWeather = null
 *       }
 *     }
 *
 *     onUnmounted(() => {
 *       clearWeather()
 *       if (viewer && !viewer.isDestroyed()) {
 *         viewer.destroy()
 *       }
 *     })
 *
 *     return { initViewer, setWeather, clearWeather }
 *   }
 * }
 * ```
 *
 * ============================================================================
 * 【Shader 参数调节】
 * ============================================================================
 *
 * 详细参数说明请参考 weatherEffects2.js 文件顶部注释
 *
 * 雨 (rain) - 可调：倾斜角度、密度、数量、速度、颜色、混合强度
 * 雪 (snow) - 可调：雪花层级、亮度、透明度、飘落速度、左右摆动
 * 雾 (fog)  - 可调：雾的颜色、浓度、深度范围
 *
 * ============================================================================
 * 【技术原理】
 * ============================================================================
 *
 * 1. PostProcessStage（后处理阶段）
 *    - Cesium 的后处理特效 API
 *    - 通过 fragmentShader 实现自定义渲染效果
 *    - 可添加到 scene.postProcessStages 集合
 *
 * 2. Shader 工作流程
 *    - 捕获当前帧的颜色纹理 (colorTexture)
 *    - 在 fragment shader 中叠加天气效果
 *    - 输出混合后的最终颜色
 *
 * 3. GLSL 300 es（WebGL2）
 *    - 使用 in/out 代替 varying
 *    - out vec4 fragColor 代替 gl_FragColor
 *    - texture() 代替 texture2D()
 *
 * ============================================================================
 */

import { onMounted, onUnmounted, ref } from 'vue'
import * as Cesium from 'cesium'
import { weatherEffects } from './weatherEffects2.js'

let viewer = null
let currentWeather = null
const isReady = ref(false)
const currentEffect = ref('无')

const initCesium = async () => {
    try {
        isReady.value = false
        viewer = new Cesium.Viewer('cesium-container', {
            terrainProvider: await Cesium.createWorldTerrainAsync()
        })

        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(116.397222, 39.9075, 10000),
            duration: 2
        })

        isReady.value = true
        console.log('WeatherEffects 初始化完成')
    } catch (error) {
        console.error('WeatherEffects 初始化失败：', error)
    }
}

const destroyCesium = () => {
    if (currentWeather) {
        currentWeather.removePostProcessStage()
        currentWeather = null
    }

    if (viewer && !viewer.isDestroyed()) {
        viewer.destroy()
        viewer = null
    }
    isReady.value = false
    console.log('WeatherEffects 销毁完成')
}

const setWeatherEffect = (type) => {
    if (!viewer) return

    try {
        if (currentWeather) {
            currentWeather.removePostProcessStage()
            currentWeather = null
        }

        currentWeather = new weatherEffects(viewer, {
            name: 'weather',
            type: type
        })

        currentEffect.value = type === 'rain' ? '雨' : type === 'snow' ? '雪' : type === 'fog' ? '雾' : '无'
        console.log('天气效果已切换为:', currentEffect.value)
    } catch (error) {
        console.warn('天气特效切换异常:', error.message)
        currentWeather = null
    }
}

const clearWeatherEffect = () => {
    try {
        if (currentWeather) {
            currentWeather.removePostProcessStage()
            currentWeather = null
            currentEffect.value = '无'
            console.log('天气效果已清除')
        }
    } catch (error) {
        console.warn('天气特效清除异常:', error.message)
        currentWeather = null
        currentEffect.value = '无'
    }
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

        <div class="control-panel">
            <div class="panel-title">天气特效</div>

            <div class="button-group">
                <button
                    class="weather-btn rain"
                    :class="{ active: currentEffect === '雨' }"
                    @click="setWeatherEffect('rain')"
                    title="倾斜45度雨滴效果"
                >
                    🌧️ 雨
                </button>

                <button
                    class="weather-btn snow"
                    :class="{ active: currentEffect === '雪' }"
                    @click="setWeatherEffect('snow')"
                    title="多层级雪花飘落效果"
                >
                    ❄️ 雪
                </button>

                <button
                    class="weather-btn fog"
                    :class="{ active: currentEffect === '雾' }"
                    @click="setWeatherEffect('fog')"
                    title="基于深度的雾效渲染"
                >
                    🌫️ 雾
                </button>
            </div>

            <button class="clear-btn" @click="clearWeatherEffect">
                关闭特效
            </button>

            <div class="status-info">
                <span class="status-label">当前效果：</span>
                <span class="status-value">{{ currentEffect }}</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.cesium-wrapper {
    width: 100%;
    height: 100vh;
    position: relative;
}

.control-panel {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 1000;
    background-color: rgba(255, 255, 255, 0.95);
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    min-width: 160px;
}

.panel-title {
    font-size: 14px;
    font-weight: 600;
    color: #333;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #eee;
}

.button-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
}

.weather-btn {
    display: block;
    width: 100%;
    padding: 10px 16px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background-color: #f8f9fa;
    color: #333;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
}

.weather-btn:hover {
    background-color: #e9ecef;
    border-color: #adb5bd;
}

.weather-btn.rain.active {
    background-color: #4a90d9;
    border-color: #4a90d9;
    color: white;
}

.weather-btn.snow.active {
    background-color: #6c757d;
    border-color: #6c757d;
    color: white;
}

.weather-btn.fog.active {
    background-color: #adb5bd;
    border-color: #adb5bd;
    color: white;
}

.clear-btn {
    display: block;
    width: 100%;
    padding: 8px 16px;
    border: 1px solid #dc3545;
    border-radius: 6px;
    background-color: #dc3545;
    color: white;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 12px;
}

.clear-btn:hover {
    background-color: #c82333;
    border-color: #bd2130;
}

.status-info {
    padding: 8px 12px;
    background-color: #f8f9fa;
    border-radius: 6px;
    font-size: 13px;
}

.status-label {
    color: #666;
}

.status-value {
    color: #333;
    font-weight: 600;
}
</style>