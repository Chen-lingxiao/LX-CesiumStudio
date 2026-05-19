/**
 * 水波纹材质工具 (CircleWaveMaterial.js)
 */

import * as Cesium from 'cesium'

const CircleWaveMaterialType = 'CircleWaveMaterial'

const CircleWaveSource = `
  czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);
    material.diffuse = color.rgb * brightness;
    vec2 st = materialInput.st;
    vec3 str = materialInput.str;
    float dis = distance(st, vec2(0.5, 0.5));
    float per = fract(time);

    if (abs(str.z) > 0.001) discard;
    if (dis > 0.5) discard;

    float perDis = 0.5 / count;
    float bl = 0.0;
    float waveWidthScaled = waveWidth * perDis;

    for (int i = 0; i <= 9; i++) {
      if (float(i) <= count) {
        float disNum = perDis * float(i) - dis + per / count;
        if (disNum > 0.0 && disNum < waveWidthScaled * 2.0) {
          float t = disNum / waveWidthScaled;
          float waveAlpha = 1.0 - abs(1.0 - t);
          bl = max(bl, waveAlpha);
        }
      }
    }

    material.alpha = bl * baseAlpha;
    float edgeFade = smoothstep(0.5 - edgeFadeWidth, 0.5, dis);
    material.alpha *= (1.0 - edgeFade);

    return material;
  }
`

let materialRegistered = false

function registerMaterial(): void {
  if (materialRegistered) return
  const materialCache = (Cesium.Material as any)._materialCache
  if (materialCache) {
    materialCache.addMaterial(CircleWaveMaterialType, {
      fabric: {
        type: CircleWaveMaterialType,
        uniforms: {
          color: new Cesium.Color(181 / 255, 241 / 255, 254 / 255, 1),
          time: 1,
          count: 1,
          brightness: 1.5,
          waveWidth: 1.0,
          baseAlpha: 0.8,
          edgeFadeWidth: 0.05,
        },
        source: CircleWaveSource,
      },
      translucent: () => true,
    })
    materialRegistered = true
  }
}

export interface CircleWaveMaterialOptions {
  color?: string
  duration?: number
  count?: number
}

export class CircleWaveMaterialProperty {
  private readonly _definitionChanged: Cesium.Event
  private readonly _time: number
  readonly color: Cesium.Color
  readonly duration: number
  readonly count: number

  constructor(options: CircleWaveMaterialOptions = {}) {
    this._definitionChanged = new Cesium.Event()
    this._time = Date.now()
    this.color = options.color
      ? Cesium.Color.fromCssColorString(options.color)
      : Cesium.Color.RED
    this.duration = options.duration ?? 3000
    this.count = Math.max(1, options.count ?? 3)
    registerMaterial()
  }

  get isConstant(): boolean {
    return false
  }

  get definitionChanged(): Cesium.Event {
    return this._definitionChanged
  }

  getType(): string {
    return CircleWaveMaterialType
  }

  getValue(
    _time: Cesium.JulianDate,
    result: Record<string, unknown> = {},
  ): Record<string, unknown> {
    result.color = this.color
    result.time = ((Date.now() - this._time) % this.duration) / this.duration
    result.count = this.count
    result.brightness = 1.5 // 亮度
    result.waveWidth = 1.0 // 波浪宽度
    result.baseAlpha = 0.8 // 基础透明度
    result.edgeFadeWidth = 0.05 // 边缘淡出宽度
    return result
  }

  equals(other: CircleWaveMaterialProperty): boolean {
    return (
      this === other ||
      (other instanceof CircleWaveMaterialProperty &&
        this.color.equals(other.color) &&
        this.duration === other.duration &&
        this.count === other.count)
    )
  }
}
