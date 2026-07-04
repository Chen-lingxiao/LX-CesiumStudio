<script setup>
/**
 * ModelEntity.vue - Cesium 3D 模型实体示例组件
 *
 * 【功能说明】
 * 1. 演示如何在 Cesium 中加载和展示 3D 模型（glTF/glb 格式）
 * 2. 展示 Model 实体的多种配置选项：缩放、动画、阴影、轮廓线等
 * 3. 演示模型的颜色混合模式和姿态控制（朝向、俯仰、翻滚）
 * 4. 通过 SpaceX 星舰模型实例，展示复杂 3D 模型的完整配置流程
 *
 * 【核心技术要点】
 *
 * 1. 模型加载基础
 *    - uri: 模型资源路径，支持 glTF(.gltf) 和 glTF Binary(.glb) 格式
 *    - scale: 模型缩放比例（1=原始大小，0.5=一半，2=两倍）
 *    - minimumPixelSize: 最小像素尺寸，防止远距离时模型过小不可见
 *    - maximumScale: 最大缩放比例限制，防止近距离时模型过大
 *
 * 2. 纹理与动画
 *    - incrementallyLoadTextures: 增量加载纹理（后台渐进式加载，提升首屏速度）
 *    - runAnimations: 运行模型内置动画（如机械臂运动、舱门开合等）
 *    - clampAnimations: 强制动画播放（动画时间超出时停留在最后一帧）
 *
 * 3. 光照与阴影
 *    - shadows: 阴影模式
 *      · Cesium.ShadowMode.ENABLED：启用阴影投射
 *      · Cesium.ShadowMode.DISABLED：禁用阴影
 *      · Cesium.ShadowMode.CAST_ONLY：仅投射阴影
 *      · Cesium.ShadowMode.RECEIVE_ONLY：仅接收阴影
 *
 * 4. 高度参考（与 PointEntity 一致）
 *    - HeightReference.NONE：绝对高度
 *    - HeightReference.RELATIVE_TO_GROUND：相对地面高度
 *    - HeightReference.CLAMP_TO_GROUND：贴地
 *
 * 5. 轮廓线效果（Silhouette）
 *    - silhouetteColor: 轮廓线颜色
 *    - silhouetteSize: 轮廓线宽度（像素）
 *    - 适用：选中高亮、边界强调、X 光效果
 *
 * 6. 颜色混合模式（ColorBlendMode）
 *    - MIX：混合颜色（默认），与 colorBlendAmount 配合控制混合比例
 *    - REPLACE：替换颜色，完全覆盖模型原色
 *    - HIGHLIGHT：高亮颜色，增强模型亮度
 *    - colorBlendAmount: 混合比例（0-1），0=原色，1=完全混合色
 *
 * 7. 模型姿态控制
 *    - orientation: 模型朝向，使用四元数（Quaternion）表示
 *    - 生成方法：
 *      · Transforms.headingPitchRollQuaternion(位置，HeadingPitchRoll)
 *      · HeadingPitchRoll(heading, pitch, roll)：朝向、俯仰、翻滚（弧度制）
 *      · Cesium.Math.toRadians(角度)：角度转弧度
 *
 * 【三个模型实例详解】
 *
 * 模型 1 - Super Heavy 助推器
 * - 位置：美国得克萨斯州 SpaceX 发射场（-97.190367°E, 25.985713°N）
 * - 高度：35 米（RELATIVE_TO_GROUND，地面以上 35 米）
 * - 配置：标准模型，启用阴影，无特殊效果
 * - 说明：展示基础模型加载和配置
 *
 * 模型 2 - Star Ship 星舰（带轮廓线）
 * - 位置：发射场东侧（-97.190140°E, 25.985901°N）
 * - 高度：25 米
 * - 特殊效果：蓝色轮廓线（silhouetteColor/size）
 * - 说明：展示轮廓线高亮效果，适用于选中状态
 *
 * 模型 3 - Star Ship 星舰（姿态 + 颜色混合）
 * - 位置：更东侧（-97.189851°E, 25.986203°N）
 * - 高度：25 米
 * - 姿态：heading=90°（朝东），pitch=90°（垂直向上），roll=45°（翻滚 45 度）
 * - 颜色：红色半透明混合（colorBlendMode=MIX, alpha=0.4）
 * - 说明：展示模型姿态控制和颜色混合效果
 *
 * 【实现步骤】
 * 1. 定义模型路径常量（便于复用和维护）
 * 2. 创建 Viewer 实例（本例未加载地形，可根据需要添加）
 * 3. 依次创建三个模型实体，每个展示不同特性
 * 4. 配置每个模型的 model 属性（uri、scale、shadows 等）
 * 5. 为特殊模型添加轮廓线、颜色混合、姿态控制
 * 6. 添加 description 描述信息（支持 HTML，点击显示）
 * 7. 相机飞行到最佳观察位置（俯视角度，同时看到三个模型）
 *
 * 【重要注意事项】
 * - 模型路径必须是相对路径或绝对 URL，确保资源可访问
 * - glTF/glb 格式支持最佳，其他格式可能不兼容
 * - 大型模型（>10MB）建议启用 incrementallyLoadTextures 提升加载体验
 * - 阴影会显著增加性能开销，大量模型时建议关闭或限制数量
 * - orientation 使用四元数，不要直接使用欧拉角
 * - 颜色混合需要模型支持透明度，否则 alpha 值无效
 * - 模型坐标原点通常在底部中心，如需调整可使用 position 偏移
 *
 * 【性能优化建议】
 * - 使用 Draco 压缩的 glTF 模型（减小文件体积）
 * - 合并多个模型为单个 glTF（减少 HTTP 请求）
 * - 远距离时使用 billboard 代替模型（性能更优）
 * - 使用 LOD（Level of Detail）技术，根据距离切换不同精度模型
 *
 * 【使用场景】
 * - 城市规划：建筑物、桥梁、塔吊等 3D 可视化
 * - 工业仿真：机械设备、工厂产线、机器人
 * - 交通运输：飞机、船舶、车辆模型展示
 * - 军事应用：武器装备、军事设施、战场仿真
 * - 文化旅游：古迹建筑、文物展示、虚拟导游
 * - 房地产：楼盘沙盘、户型展示、室内导航
 */
import { onMounted, onUnmounted, ref } from "vue";
import * as Cesium from "cesium";

let viewer = null; // Cesium 实例
const isReady = ref(false); // 初始化状态
const modelPath_SuperHeavy = import.meta.env.BASE_URL + "static/3Dmodel/Rocket/SuperHeavy.glb";
const modelPath_StarShip = import.meta.env.BASE_URL + "static/3Dmodel/Rocket/starShip.glb";
const initCesium = async () => {
  try {
    isReady.value = false;
    viewer = new Cesium.Viewer("cesium-container", {
      // terrainProvider: await Cesium.createWorldTerrainAsync(),
    });

    // 添加 3D 模型实体
    viewer.entities.add({
      id: "SuperHeavy",
      name: "Super Heavy",
      description: `
        星舰的Super Heavy助推器是星舰系统的第一级，高度为69米，直径为9米，空重200吨，满载重3600吨，是有史以来最大最强大的火箭一级。
        助推器上安装了33台猛禽发动机，其中20台是外圈的“Raptor Boost”型号，13台是内圈的“Raptor Sea Level”型号。
        装载了3400吨的液氧和液甲烷作为推进剂，在全流量级联燃烧循环中工作，提供高效的比冲和推力。助推器的总推力约7.4万千牛`,
      // 模型位置：25.985705°N, 97.190388°E，高度 0 米
      position: Cesium.Cartesian3.fromDegrees(-97.190367, 25.985713, 35),
      // 模型图形配置
      model: {
        uri: modelPath_SuperHeavy, // 模型资源路径（gltf/glb 格式）
        scale: 1, // 模型缩放比例（1 表示原始大小）
        // minimumPixelSize: 128, // 模型最小像素尺寸（防止远距离时过小不可见）
        maximumScale: 20000, // 模型最大缩放比例限制
        incrementallyLoadTextures: true, // 增量加载纹理（后台渐进式加载）
        runAnimations: true, // 运行模型内置动画（如有）
        clampAnimations: true, // 强制动画播放（动画时间超出时停留在最后一帧）
        shadows: Cesium.ShadowMode.ENABLED, // 开启阴影投射
        // 高度参考：RELATIVE_TO_GROUND 表示高度相对于地面高度
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      },
    });
    // 添加 3D 模型实体
    viewer.entities.add({
      id: "StarShip",
      name: "Star Ship",
      description: `
        V2版星舰二级于2025年初的第七次飞行测试（IFT-7）开始使用，实际用于飞行的仅有五架。在星舰第11次飞行后，V2版星舰二级退役。
        V2版星舰二级由Block.2版星舰组合体使用，编号范围为S33~S38。
        V2版星舰二级高52.1米（增加了约1.8米，即一个环的高度），起飞总重1585吨，其中推进剂装载量1500吨（比前代增加了25%），6台发动机总推力提升至1400吨`,
      // 模型位置：25.985705°N, 97.190388°E，高度 0 米
      position: Cesium.Cartesian3.fromDegrees(-97.190140, 25.985901, 25),
      // 模型图形配置
      model: {
        uri: modelPath_StarShip, // 模型资源路径（gltf/glb 格式）
        scale: 1, // 模型缩放比例（1 表示原始大小）
        // minimumPixelSize: 128, // 模型最小像素尺寸（防止远距离时过小不可见）
        maximumScale: 20000, // 模型最大缩放比例限制
        incrementallyLoadTextures: true, // 增量加载纹理（后台渐进式加载）
        runAnimations: true, // 运行模型内置动画（如有）
        clampAnimations: true, // 强制动画播放（动画时间超出时停留在最后一帧）
        shadows: Cesium.ShadowMode.ENABLED, // 开启阴影投射
        // 高度参考：RELATIVE_TO_GROUND 表示高度相对于地面高度
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        // 轮廓线
        silhouetteColor: Cesium.Color.BLUE, // 轮廓颜色
        silhouetteSize: 2,              // 轮廓大小
      },
    });
    // 添加 3D 模型实体
    viewer.entities.add({
      id: "StarShip1",
      name: "Star Ship1",
      description: `
        V2版星舰二级于2025年初的第七次飞行测试（IFT-7）开始使用，实际用于飞行的仅有五架。在星舰第11次飞行后，V2版星舰二级退役。
        V2版星舰二级由Block.2版星舰组合体使用，编号范围为S33~S38。
        V2版星舰二级高52.1米（增加了约1.8米，即一个环的高度），起飞总重1585吨，其中推进剂装载量1500吨（比前代增加了25%），6台发动机总推力提升至1400吨`,
      // 模型位置：25.985705°N, 97.190388°E，高度 0 米
      position: Cesium.Cartesian3.fromDegrees(-97.189851, 25.986203, 25),
      // orientation: Cesium.Quaternion.fromHeadingPitchRoll(new Cesium.HeadingPitchRoll(0, 0, 0)),
      orientation: Cesium.Transforms.headingPitchRollQuaternion(
        Cesium.Cartesian3.fromDegrees(-97.189851, 25.986203, 25), 
        new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(90), Cesium.Math.toRadians(90), Cesium.Math.toRadians(45))
      ),
      // 模型图形配置
      model: {
        uri: modelPath_StarShip, // 模型资源路径（gltf/glb 格式）
        scale: 1, // 模型缩放比例（1 表示原始大小）
        // minimumPixelSize: 128, // 模型最小像素尺寸（防止远距离时过小不可见）
        maximumScale: 20000, // 模型最大缩放比例限制
        incrementallyLoadTextures: true, // 增量加载纹理（后台渐进式加载）
        runAnimations: true, // 运行模型内置动画（如有）
        clampAnimations: true, // 强制动画播放（动画时间超出时停留在最后一帧）
        shadows: Cesium.ShadowMode.ENABLED, // 开启阴影投射
        // 高度参考：RELATIVE_TO_GROUND 表示高度相对于地面高度
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        // 模型颜色混合
        color: Cesium.Color.RED.withAlpha(0.4), // 指定与模型渲染颜色融合的颜色
        colorBlendMode: Cesium.ColorBlendMode.MIX, // 混合模式 （MIX 表示混合颜色） REPLACE 表示替换颜色 HIGHLIGHT 表示高亮颜色 MIX 表示混合颜色 配合 colorBlendAmount 使用
        colorBlendAmount: 0.5, // 混合比例 （0-1）
      },
    });
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-97.1895, 25.984, 200),
      orientation: {
        heading: Cesium.Math.toRadians(0), // 水平朝向
        pitch: Cesium.Math.toRadians(-45), // 向下倾斜 45 度
      },
      duration: 1,
    })
    isReady.value = true;
    console.log("ModelEntity 初始化完成");
  } catch (error) {
    console.error("ModelEntity 初始化失败：", error);
  }
};
const destroyCesium = () => {
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy();
    viewer = null;
  }
  isReady.value = false;
  console.log("ModelEntity 销毁完成");
};

onMounted(() => {
  initCesium();
});

onUnmounted(() => {
  destroyCesium();
});
</script>

<template>
  <div class="cesium-wrapper">
    <div id="cesium-container"></div>
    <div v-if="!isReady" class="loading-overlay">加载中...</div>
  </div>
</template>

<style scoped></style>
