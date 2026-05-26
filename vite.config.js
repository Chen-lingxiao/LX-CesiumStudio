import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import cesium from 'vite-plugin-cesium'

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  return {
    base: './',
    plugins: [
      vue(),
      !isProduction && vueDevTools(),
      cesium(),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    build: {
      target: 'es2020',
      minify: 'esbuild',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/cesium')) return 'cesium-vendor'
            if (id.includes('node_modules/monaco-editor')) return 'monaco-editor'
            if (id.includes('node_modules/echarts')) return 'echarts-vendor'
          }
        }
      }
    }
  }
})