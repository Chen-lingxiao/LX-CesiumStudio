/**
 * @file weatherEffects.js - Cesium 天气特效实现
 * @description 基于 PostProcessStage 的全屏天气渲染特效
 * @category 特效
 * 
 * ============================================================================
 * 【使用说明】
 * ============================================================================
 * 
 * 1. 基础导入
 * ```javascript
 * import { weatherEffects } from './weatherEffects.js'
 * ```
 * 
 * 2. 创建天气特效实例
 * ```javascript
 * const weather = new weatherEffects(viewer, {
 *   name: 'myWeather',   // 特效名称（用于标识和移除）
 *   type: 'rain'         // 天气类型：'rain' | 'snow' | 'fog'
 * })
 * ```
 * 
 * 3. 移除特效
 * ```javascript
 * weather.removePostProcessStage()
 * ```
 * 
 * 4. 切换不同天气
 * ```javascript
 * // 先移除旧的
 * weather.removePostProcessStage()
 * // 再创建新的
 * const newWeather = new weatherEffects(viewer, {
 *   name: 'weather',
 *   type: 'snow'
 * })
 * ```
 * 
 * ============================================================================
 * 【参数说明】
 * ============================================================================
 * 
 * constructor(viewer, options)
 * - viewer: Cesium.Viewer 实例（必需）
 * - options.name: string - 特效标识名称，用于 getStage() 查找（默认：'weather'）
 * - options.type: string - 天气类型
 *   - 'rain': 倾斜雨滴效果
 *   - 'snow': 雪花飘落效果
 *   - 'fog':  全屏雾效
 * 
 * ============================================================================
 * 【Shader 效果参数调整】
 * ============================================================================
 * 
 * ⚠️ 注意：Shader 参数调整需要修改 shader 源代码
 * 
 * --------------------------------------------------------------------
 * 【雨 (rain) - 可调参数】
 * --------------------------------------------------------------------
 * 位置：fs_rain() 方法
 * 
 * 1. 雨滴倾斜角度（行 9-10）
 *    float a = -0.4;  // 角度值，负数表示向左倾斜
 *    // 调整范围：-0.8 ~ 0.0
 *    // -0.8 = 几乎水平，0.0 = 垂直
 * 
 * 2. 雨滴密度/长度（行 10）
 *    uv *= length(uv + vec2(0.0, 4.9)) * 0.3 + 1.0;
 *    // vec2(0.0, 4.9) - 垂直方向偏移，影响雨滴长度
 *    // * 0.3 - 密度系数，越大雨滴越密越短
 * 
 * 3. 雨滴数量（行 11）
 *    float v = 1.0 - sin(hash(floor(uv.x * 100.0)) * 2.0);
 *    // uv.x * 100.0 - 数值越大，雨滴数量越多
 * 
 * 4. 雨滴速度（行 12）
 *    float b = clamp(abs(sin(20.0 * time * v + uv.y * (5.0 / (2.0 + v)))) - 0.95, 0.0, 1.0) * 20.0;
 *    // 20.0 * time - 系数越大，雨滴运动越快
 * 
 * 5. 雨滴颜色（行 8）
 *    vec3 c = vec3(0.6, 0.7, 0.8);  // RGB 颜色值
 *    // vec3(0.6, 0.7, 0.8) = 浅蓝灰色
 * 
 * 6. 混合强度（行 13）
 *    fragColor = mix(texture(colorTexture, v_textureCoordinates), vec4(c, 1.0), 0.5);
 *    // 最后一个参数 0.5 - 混合强度，0.0=透明，1.0=完全遮挡
 * 
 * --------------------------------------------------------------------
 * 【雪 (snow) - 可调参数】
 * --------------------------------------------------------------------
 * 位置：fs_snow() 方法
 * 
 * 1. 雪花大小层级（行 9-14）
 *    c += snow(uv, 30.0) * 0.0;  // 第1层：极小雪花（已禁用*0.0）
 *    c += snow(uv, 20.0) * 0.0;  // 第2层：小雪花（已禁用）
 *    c += snow(uv, 15.0) * 0.0;  // 第3层：中小雪花（已禁用）
 *    c += snow(uv, 10.0);        // 第4层：中等雪花 ← 启用
 *    c += snow(uv, 8.0);         // 第5层：中大雪花 ← 启用
 *    c += snow(uv, 6.0);          // 第6层：大雪花 ← 启用
 *    c += snow(uv, 5.0);          // 第7层：特大雪花 ← 启用
 * 
 * 2. 雪花亮度（行 17）
 *    finalColor = finalColor * 1.2;  // 亮度系数
 *    // 1.0 = 原始亮度，1.5 = 更亮，0.5 = 更暗
 * 
 * 3. 雪花透明度（行 18）
 *    fragColor = mix(..., vec4(finalColor, 1.0), 0.2);
 *    // 0.2 = 透明度，0.0=完全透明，1.0=完全不透明
 * 
 * 4. 雪花飘落速度（行 4-6）
 *    float time = float(czm_frameNumber) / 60.0;
 *    uv.y += time * 2.0 / scale;  // 2.0 越大下落越快
 * 
 * 5. 雪花左右飘动幅度（行 7）
 *    uv.x += sin(uv.y + time * 0.5) / scale;
 *    // time * 0.5 - 系数越大，左右摆动越明显
 * 
 * --------------------------------------------------------------------
 * 【雾 (fog) - 可调参数】
 * --------------------------------------------------------------------
 * 位置：fs_fog() 方法
 * 
 * 1. 雾的颜色（行 8）
 *    vec4 fogcolor = vec4(0.8, 0.8, 0.8, 0.5);
 *    // RGB: (0.8, 0.8, 0.8) = 浅灰色
 *    // A: 0.5 = 透明度
 *    // 常见雾色：
 *    //   vec4(0.8, 0.8, 0.8, 0.5) = 白色薄雾
 *    //   vec4(0.5, 0.5, 0.5, 0.7) = 灰色浓雾
 *    //   vec4(0.9, 0.9, 0.8, 0.3) = 米黄色薄雾
 * 
 * 2. 雾的浓度（行 12）
 *    fragColor = mix(origcolor, fogcolor, 0.8);
 *    // 0.8 = 混合比例，越大雾越浓
 *    // 0.2 = 几乎无雾，0.9 = 浓雾
 * 
 * 3. 深度范围（行 10-11）
 *    float f = (depthcolor.r - 0.22) / 0.2;
 *    // 0.22 = 雾开始距离（近）
 *    // 0.2 = 雾的深度范围
 *    // 值越小雾越近，越大雾越远
 * 
 * ============================================================================
 * 【完整示例】
 * ============================================================================
 * 
 * ```javascript
 * import { weatherEffects } from './weatherEffects.js'
 * 
 * // 创建雨效
 * const rainEffect = new weatherEffects(viewer, {
 *   name: 'rain',
 *   type: 'rain'
 * })
 * 
 * // 3秒后切换到雪效
 * setTimeout(() => {
 *   rainEffect.removePostProcessStage()
 *   const snowEffect = new weatherEffects(viewer, {
 *     name: 'snow',
 *     type: 'snow'
 *   })
 * }, 3000)
 * 
 * // 3秒后切换到雾效
 * setTimeout(() => {
 *   snowEffect.removePostProcessStage()
 *   const fogEffect = new weatherEffects(viewer, {
 *     name: 'fog',
 *     type: 'fog'
 *   })
 * }, 6000)
 * 
 * // 3秒后清除所有特效
 * setTimeout(() => {
 *   fogEffect.removePostProcessStage()
 * }, 9000)
 * ```
 * 
 * ============================================================================
 * 【技术原理】
 * ============================================================================
 * 
 * 1. PostProcessStage
 *    - Cesium 的后处理特效 API
 *    - 通过 fragmentShader 实现自定义渲染
 *    - 全屏覆盖，不影响实际场景几何
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

import * as Cesium from 'cesium'

export class weatherEffects{
   constructor(viewer, options){
     this.viewer = viewer;
     var opt = options || {};
     this.name = opt.name || 'weather';
     this.type = opt.type || 'rain';
     
     let existingStage = this.getStage();
     if (existingStage) {
       return;
     }
     
     let fs = null;
     switch(this.type){
       case "snow":
         fs = this.fs_snow();
       break;
       case "rain":
         fs = this.fs_rain();
       break;
       case "fog":
         fs = this.fs_fog();
       break;
     }
     
     let stage = new Cesium.PostProcessStage({
           name : this.name,
           fragmentShader:fs,
           uniforms : {
             color: Cesium.Color.fromAlpha(Cesium.Color.BLACK, parseFloat(1)),
           }
     });
     
     viewer.scene.postProcessStages.add(stage);
   }
   
   /**
    * @method removePostProcessStage
    * @description 移除当前天气特效
    * @example
    * const weather = new weatherEffects(viewer, { type: 'rain' })
    * weather.removePostProcessStage() // 移除雨效
    */
   removePostProcessStage(){
    let stage = this.getStage();
    if(stage){
      this.viewer.scene.postProcessStages.remove(stage);
    }
   }
   
   /**
    * @method getStage
    * @description 获取当前特效的 PostProcessStage 实例
    * @returns {Cesium.PostProcessStage|null}
    */
   getStage(){
     let stage = null,
         stages = this.viewer.scene.postProcessStages;
     for(let i = 0; i < stages._stages.length; i++){
       let tmp = stages.get(i);
       if(tmp != undefined && tmp.name == this.name){
         stage = tmp;
         break;
       }
     }
     return stage;
   }
   
   /**
    * @method fs_snow
    * @description 雪花 Shader（多层级雪花飘落效果）
    * @returns {string} GLSL 300 es 格式的 fragment shader
    * 
    * 【效果特点】
    * - 7个大小不同的雪花层级
    * - 雪花左右摇摆飘落
    * - 可调整亮度、透明度、飘落速度
    */
   fs_snow(){
     return `#version 300 es
precision highp float;

uniform sampler2D colorTexture;
in vec2 v_textureCoordinates;
out vec4 fragColor;

float snow(vec2 uv, float scale) {
  float time = float(czm_frameNumber) / 60.0;
  float w = smoothstep(1.0, 0.0, -uv.y * (scale / 10.0));
  if (w < 0.1) return 0.0;
  uv += time / scale;
  uv.y += time * 2.0 / scale;
  uv.x += sin(uv.y + time * 0.5) / scale;
  uv *= scale;
  vec2 s = floor(uv), f = fract(uv), p;
  float k = 3.0, d;
  p = 0.5 + 0.35 * sin(11.0 * fract(sin((s + p + scale) * mat2(7, 3, 6, 5)) * 5.0)) - f;
  d = length(p);
  k = min(d, k);
  k = smoothstep(0.0, k, sin(f.x + f.y) * 0.01);
  return k * w;
}

void main() {
  vec2 resolution = czm_viewport.zw;
  vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
  vec3 finalColor = vec3(0.0);
  float c = 0.0;
  c += snow(uv, 30.0) * 0.0;  // 极小雪花（已禁用）
  c += snow(uv, 20.0) * 0.0;  // 小雪花（已禁用）
  c += snow(uv, 15.0) * 0.0;  // 中小雪花（已禁用）
  c += snow(uv, 10.0);        // 中等雪花
  c += snow(uv, 8.0);         // 中大雪花
  c += snow(uv, 6.0);          // 大雪花
  c += snow(uv, 5.0);          // 特大雪花
  finalColor = vec3(c);
  
  finalColor = finalColor * 1.2;  // 调整雪花亮度
  
  fragColor = mix(texture(colorTexture, v_textureCoordinates), vec4(finalColor, 1.0), 0.2);
}`;
   }
   
   /**
    * @method fs_rain
    * @description 雨滴 Shader（倾斜雨滴效果）
    * @returns {string} GLSL 300 es 格式的 fragment shader
    * 
    * 【效果特点】
    * - 倾斜45度雨丝效果
    * - 运动模糊效果
    * - 可调整角度、密度、速度、颜色
    */
   fs_rain(){
     return `#version 300 es
precision highp float;

uniform sampler2D colorTexture;
in vec2 v_textureCoordinates;
out vec4 fragColor;

float hash(float x){
    return fract(sin(x * 133.3) * 13.13);
}

void main() {
    float time = czm_frameNumber / 60.0;
    vec2 resolution = czm_viewport.zw;
    vec2 uv = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
    vec3 c = vec3(0.6, 0.7, 0.8);  // 雨滴颜色
    
    float a = -0.4;  // 雨丝倾斜角度
    float si = sin(a), co = cos(a);
    uv *= mat2(co, -si, si, co);
    uv *= length(uv + vec2(0.0, 4.9)) * 0.3 + 1.0;  // 雨丝长度密度
    
    float v = 1.0 - sin(hash(floor(uv.x * 100.0)) * 2.0);  // 雨滴数量
    float b = clamp(abs(sin(20.0 * time * v + uv.y * (5.0 / (2.0 + v)))) - 0.95, 0.0, 1.0) * 20.0;
    
    c *= v * b;
    fragColor = mix(texture(colorTexture, v_textureCoordinates), vec4(c, 1.0), 0.5);
}`;
   }
   
   /**
    * @method fs_fog
    * @description 雾效 Shader（基于深度的雾效）
    * @returns {string} GLSL 300 es 格式的 fragment shader
    * 
    * 【效果特点】
    * - 基于深度的雾效渲染
    * - 可调整雾的颜色和浓度
    * - 远处物体更模糊
    */
   fs_fog(){
     return `#version 300 es
precision highp float;

uniform sampler2D colorTexture;
uniform sampler2D depthTexture;
in vec2 v_textureCoordinates;
out vec4 fragColor;

void main() {
    vec4 origcolor = texture(colorTexture, v_textureCoordinates);
    vec4 fogcolor = vec4(0.8, 0.8, 0.8, 0.5);  // 雾的颜色和透明度
    
    float depth = czm_readDepth(depthTexture, v_textureCoordinates);
    vec4 depthcolor = texture(depthTexture, v_textureCoordinates);
    
    float f = (depthcolor.r - 0.22) / 0.2;  // 雾的深度范围
    if (f < 0.0) f = 0.0;
    else if (f > 1.0) f = 1.0;
    
    fragColor = mix(origcolor, fogcolor, 0.8);  // 雾的浓度
}`;
   }
}