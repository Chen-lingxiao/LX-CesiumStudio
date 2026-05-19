<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const canvasRef = ref(null)
const stars = ref([])
const animationId = ref(null)
const mouse = ref({ x: 0, y: 0 })
const targetMouse = ref({ x: 0, y: 0 })
const time = ref(0)

// 3D星星类
class Star {
  constructor(canvas) {
    this.canvas = canvas
    this.reset()
  }

  reset() {
    // 3D坐标
    this.x = (Math.random() - 0.5) * 2000
    this.y = (Math.random() - 0.5) * 2000
    this.z = Math.random() * 1000 + 100
    
    // 星星属性
    this.baseSize = Math.random() * 2 + 0.5
    this.brightness = Math.random() * 0.5 + 0.5
    this.twinkleSpeed = Math.random() * 0.05 + 0.02
    this.twinkleOffset = Math.random() * Math.PI * 2
    
    // 颜色 - 白色、淡蓝、淡黄色
    const colorVariant = Math.random()
    if (colorVariant < 0.7) {
      this.color = { r: 255, g: 255, b: 255 }
    } else if (colorVariant < 0.85) {
      this.color = { r: 200, g: 220, b: 255 }
    } else {
      this.color = { r: 255, g: 250, b: 220 }
    }
  }

  project(offsetX, offsetY) {
    const scale = 500 / (this.z + 500)
    const screenX = this.canvas.width / 2 + (this.x + offsetX) * scale
    const screenY = this.canvas.height / 2 + (this.y + offsetY) * scale
    return { 
      x: screenX, 
      y: screenY, 
      size: this.baseSize * scale,
      scale: scale
    }
  }

  update(offsetX, offsetY, t) {
    // 缓慢移动
    this.z -= 0.15
    if (this.z < 10) {
      this.z = 1100
      this.x = (Math.random() - 0.5) * 2000
      this.y = (Math.random() - 0.5) * 2000
    }
  }

  draw(ctx, offsetX, offsetY, t) {
    const proj = this.project(offsetX, offsetY)
    
    // 闪烁效果
    const twinkle = Math.sin(t * this.twinkleSpeed + this.twinkleOffset) * 0.3 + 0.7
    const alpha = this.brightness * twinkle * proj.scale
    
    if (proj.x < -50 || proj.x > this.canvas.width + 50 || 
        proj.y < -50 || proj.y > this.canvas.height + 50) {
      return
    }
    
    ctx.save()
    
    // 核心星点
    const gradient = ctx.createRadialGradient(
      proj.x, proj.y, 0,
      proj.x, proj.y, proj.size * 3
    )
    gradient.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha})`)
    gradient.addColorStop(0.4, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha * 0.3})`)
    gradient.addColorStop(1, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0)`)
    
    ctx.beginPath()
    ctx.arc(proj.x, proj.y, proj.size * 3, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()
    
    // 星芒效果
    if (proj.size > 1.2) {
      ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha * 0.5})`
      ctx.lineWidth = proj.size * 0.3
      
      // 十字星芒
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI + Math.PI / 4
        const len = proj.size * 4
        ctx.beginPath()
        ctx.moveTo(proj.x - Math.cos(angle) * len, proj.y - Math.sin(angle) * len)
        ctx.lineTo(proj.x + Math.cos(angle) * len, proj.y + Math.sin(angle) * len)
        ctx.stroke()
      }
    }
    
    // 中心点
    ctx.beginPath()
    ctx.arc(proj.x, proj.y, proj.size * 0.5, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
    ctx.fill()
    
    ctx.restore()
  }
}

const init = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  // 创建星星
  const starCount = Math.min(Math.floor((canvas.width * canvas.height) / 4000), 300)
  stars.value = []
  for (let i = 0; i < starCount; i++) {
    stars.value.push(new Star(canvas))
  }
  
  // 初始化鼠标位置
  mouse.value = { x: canvas.width / 2, y: canvas.height / 2 }
  targetMouse.value = { x: canvas.width / 2, y: canvas.height / 2 }
}

const animate = () => {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  // 平滑鼠标移动
  mouse.value.x += (targetMouse.value.x - mouse.value.x) * 0.05
  mouse.value.y += (targetMouse.value.y - mouse.value.y) * 0.05

  // 计算视角偏移
  const offsetX = (mouse.value.x - canvas.width / 2) * 0.3
  const offsetY = (mouse.value.y - canvas.height / 2) * 0.3

  // 完全清除背景，更清晰
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  time.value += 0.02

  // 按z轴排序，远处先画 - 避免每帧深拷贝，直接原地排序
  stars.value.sort((a, b) => b.z - a.z)
  
  stars.value.forEach(star => {
    star.update(offsetX, offsetY, time.value)
    star.draw(ctx, offsetX, offsetY, time.value)
  })

  animationId.value = requestAnimationFrame(animate)
}

const handleMouseMove = (e) => {
  const rect = canvasRef.value.getBoundingClientRect()
  targetMouse.value.x = e.clientX - rect.left
  targetMouse.value.y = e.clientY - rect.top
}

const handleResize = () => {
  init()
}

onMounted(() => {
  init()
  animate()
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
  }
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <canvas ref="canvasRef" class="dandelion-canvas"></canvas>
</template>

<style scoped>
.dandelion-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: auto;
  background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f1628 100%);
}
</style>
