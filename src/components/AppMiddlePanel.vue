<script setup>
/**
 * AppMiddlePanel.vue - 中间面板组件
 *
 * 功能说明：
 * 1. 提供两种视图模式：
 *    - 画廊视图：展示所有示例卡片，支持搜索和分类过滤
 *    - 编辑器视图：集成Monaco代码编辑器，支持JavaScript和HTML/CSS编辑
 * 2. 处理示例加载和代码运行事件
 * 3. 响应主题变化，同步编辑器主题
 *
 * Props：
 * - modelValue: 当前视图模式（'gallery' | 'editor'）
 *
 * 事件：
 * - update:modelValue: 视图切换事件
 * - run-code: 运行代码事件，传递代码对象
 * - load-example: 加载示例事件，传递示例对象
 */
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import * as monaco from "monaco-editor";
import { examples } from "../examples";
import { useSettings, themeColorPresets } from "../composables/useSettings";

/**
 * Monaco编辑器Worker配置
 * 配置不同语言的Worker路径，确保编辑器功能正常运行
 */
self.MonacoEnvironment = {
  getWorker(_, label) {
    // JSON语言Worker
    if (label === "json") {
      return new Worker(
        new URL(
          "monaco-editor/esm/vs/language/json/json.worker.js",
          import.meta.url,
        ),
        {
          type: "module",
        },
      );
    }
    // CSS语言Worker
    if (label === "css") {
      return new Worker(
        new URL(
          "monaco-editor/esm/vs/language/css/css.worker.js",
          import.meta.url,
        ),
        {
          type: "module",
        },
      );
    }
    // HTML语言Worker
    if (label === "html") {
      return new Worker(
        new URL(
          "monaco-editor/esm/vs/language/html/html.worker.js",
          import.meta.url,
        ),
        {
          type: "module",
        },
      );
    }
    // TypeScript/JavaScript语言Worker
    if (label === "typescript" || label === "javascript") {
      return new Worker(
        new URL(
          "monaco-editor/esm/vs/language/typescript/ts.worker.js",
          import.meta.url,
        ),
        {
          type: "module",
        },
      );
    }
    // 默认编辑器Worker
    return new Worker(
      new URL("monaco-editor/esm/vs/editor/editor.worker.js", import.meta.url),
      {
        type: "module",
      },
    );
  },
};

/**
 * 组件属性定义
 */
const props = defineProps({
  modelValue: {
    type: String,
    default: "gallery",
  },
});

/**
 * 事件触发器定义
 */
const emit = defineEmits(["update:modelValue", "run-code", "load-example"]);

/**
 * 使用设置管理composable
 */
const { settings } = useSettings();

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function registerPresetMonacoThemes() {
  for (const [key, config] of Object.entries(themeColorPresets)) {
    const c = config.colors
    monaco.editor.defineTheme(`preset-${key}`, {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': c.editorBg,
        'editorWidget.background': c.editorBg,
        'editorWidget.border': c.border,
        'input.background': c.bgElevated,
        'input.border': c.border,
        'dropdown.background': c.bgElevated,
        'dropdown.border': c.border,
        'list.hoverBackground': c.bgHover,
        'focusBorder': c.borderMuted,
        'scrollbar.shadow': hexToRgba(c.borderMuted, 0.3),
        'scrollbarSlider.background': hexToRgba(c.borderMuted, 0.4),
        'scrollbarSlider.hoverBackground': hexToRgba(c.borderMuted, 0.6),
      }
    })
  }
}
registerPresetMonacoThemes()

function getMonacoThemeName() {
  if (settings.isDark) return 'vs-dark'
  if (settings.themeColorPreset !== 'default') return `preset-${settings.themeColorPreset}`
  return 'vs-light'
}

/**
 * 当前视图模式
 */
const currentView = ref(props.modelValue);

/**
 * 当前编辑器标签页：'javascript' | 'htmlcss'
 */
const currentTab = ref("javascript");

/**
 * 搜索关键词
 */
const searchQuery = ref("");

/**
 * 选中的标签
 */
const selectedTag = ref("");

/**
 * 缓存的标签列表（静态计算一次）
 * @type {Array}
 */
const allTags = (() => {
  const tags = new Set();
  examples.forEach((e) => e.tags.forEach((tag) => tags.add(tag)));
  return Array.from(tags).sort();
})();

/**
 * JavaScript代码内容
 */
const jsCode = ref("");

/**
 * HTML/CSS代码内容
 */
const htmlCssCode = ref("");

/**
 * 编辑器容器DOM引用
 */
const editorContainer = ref(null);

/**
 * Monaco编辑器实例
 */
let editor = null;

/**
 * 根据标签和搜索关键词过滤示例列表
 * @returns {Array} 过滤后的示例数组
 */
const filteredExamples = computed(() => {
  let result = examples;

  // 按标签过滤
  if (selectedTag.value) {
    result = result.filter((e) => e.tags.includes(selectedTag.value));
  }

  // 按搜索关键词过滤（不区分大小写，支持搜索标签）
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.description.toLowerCase().includes(query) ||
        e.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
  }

  return result;
});

/**
 * 监听外部视图模式变化
 * 当视图切换到编辑器模式时，延迟初始化编辑器
 */
watch(
  () => props.modelValue,
  (newVal) => {
    currentView.value = newVal;
    if (newVal === "editor") {
      setTimeout(() => {
        // 先销毁旧编辑器，避免内存泄漏
        if (editor) {
          editor.dispose();
          editor = null;
        }
        initEditor();
      }, 50);
    }
  },
);

/**
 * 初始化Monaco编辑器
 */
const initEditor = () => {
  if (!editorContainer.value) return;

  // 根据当前标签页获取初始代码
  const initialValue =
    currentTab.value === "javascript" ? jsCode.value : htmlCssCode.value;

  // 创建编辑器实例
  editor = monaco.editor.create(editorContainer.value, {
    value: initialValue || "// 在此输入代码",
    language: currentTab.value === "javascript" ? "javascript" : "html",
    theme: getMonacoThemeName(),
    fontSize: 14,
    lineNumbers: "on",
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
  });
};

/**
 * 更新编辑器语言模式
 */
const updateEditorLanguage = () => {
  if (!editor) return;

  // 根据当前标签页切换语言
  const language = currentTab.value === "javascript" ? "javascript" : "html";
  const value =
    currentTab.value === "javascript" ? jsCode.value : htmlCssCode.value;

  // 设置编辑器语言和内容
  monaco.editor.setModelLanguage(editor.getModel(), language);
  editor.setValue(value);
};

/**
 * 监听标签页切换
 * 切换前保存当前代码内容
 */
watch(currentTab, (newTab, oldTab) => {
  if (editor) {
    // 获取当前编辑器内容
    const currentValue = editor.getValue();

    // 根据原标签页保存代码
    if (oldTab === "javascript") {
      jsCode.value = currentValue;
    } else {
      htmlCssCode.value = currentValue;
    }

    // 更新编辑器语言模式
    updateEditorLanguage();
  }
});

function applyEditorTheme() {
  if (editor) {
    monaco.editor.setTheme('vs-light')
    setTimeout(() => {
      monaco.editor.setTheme(getMonacoThemeName())
    }, 50)
  }
}

watch(
  () => settings.isDark,
  () => applyEditorTheme(),
)

watch(
  () => settings.themeColorPreset,
  () => applyEditorTheme(),
)

/**
 * 处理运行代码按钮点击
 * 收集当前代码并触发运行事件
 */
const handleRun = () => {
  // 如果编辑器存在，保存当前代码
  if (editor) {
    if (currentTab.value === "javascript") {
      jsCode.value = editor.getValue();
    } else {
      htmlCssCode.value = editor.getValue();
    }
  }

  // 触发运行代码事件
  emit("run-code", {
    js: jsCode.value,
    htmlCss: htmlCssCode.value,
  });
};

/**
 * 处理示例卡片点击
 * 加载示例代码到编辑器
 * @param {Object} example - 示例对象
 */
const handleExampleClick = (example) => {
  // 更新代码内容
  jsCode.value = example.jsCode;
  htmlCssCode.value = example.htmlCode + "\n\n" + example.cssCode;

  // 触发加载示例事件
  emit("load-example", example);

  // 如果当前是编辑器视图，更新编辑器内容
  if (currentView.value === "editor" && editor) {
    editor.setValue(jsCode.value);
  }
};

/**
 * 组件挂载时初始化编辑器（如果当前是编辑器视图）
 */
onMounted(() => {
  if (currentView.value === "editor") {
    nextTick(initEditor);
  }
});

/**
 * 组件卸载时销毁编辑器，释放资源
 */
onUnmounted(() => {
  if (editor) {
    editor.dispose();
  }
});

/**
 * 处理缩略图加载失败
 * @param {Event} e - 错误事件
 * @param {Object} example - 示例对象
 */
const handleThumbnailError = (e, example) => {
  console.warn(
    `Failed to load thumbnail for ${example.name}: ${example.thumbnail}`,
  );
  e.target.style.display = "none";
  e.target.nextElementSibling?.classList.remove("hidden");
};

/**
 * 加载新建示例（基础的Cesium模板）
 */
const loadNewExample = () => {
  const basicExample = examples.find((e) => e.id === "viewer-basic");
  if (basicExample) {
    jsCode.value = basicExample.jsCode;
    htmlCssCode.value = basicExample.htmlCode + "\n\n" + basicExample.cssCode;
    emit("load-example", basicExample);
    if (currentView.value === "editor" && editor) {
      editor.setValue(jsCode.value);
    }
  }
};

defineExpose({
  loadNewExample,
});
</script>

<template>
  <div class="middle-panel">
    <!-- 编辑器视图 -->
    <div v-if="currentView === 'editor'" class="editor-view">
      <div class="editor-header">
        <div class="tabs">
          <button
            :class="['tab-btn', { active: currentTab === 'javascript' }]"
            @click="currentTab = 'javascript'"
          >
            JavaScript
          </button>
          <button
            :class="['tab-btn', { active: currentTab === 'htmlcss' }]"
            @click="currentTab = 'htmlcss'"
          >
            HTML/CSS
          </button>
        </div>
        <button class="run-btn" @click="handleRun">▶ Run</button>
      </div>
      <div ref="editorContainer" class="editor-container"></div>
    </div>

    <!-- 画廊视图 -->
    <div v-else class="gallery-view">
      <div class="gallery-header">
        <input
          type="text"
          v-model="searchQuery"
          class="search-input"
          placeholder="搜索示例..."
        />
        <select v-model="selectedTag" class="tag-select">
          <option value="">全部标签</option>
          <option v-for="tag in allTags" :key="tag" :value="tag">
            {{ tag }}
          </option>
        </select>
      </div>
      <div class="examples-grid">
        <div
          v-for="example in filteredExamples"
          :key="example.id"
          class="example-card"
          @click="handleExampleClick(example)"
        >
          <div class="card-thumbnail">
            <img
              v-if="example.thumbnail"
              :src="example.thumbnail"
              :alt="example.name"
              class="thumbnail-image"
              @error="handleThumbnailError($event, example)"
            />
            <div v-else class="thumbnail-placeholder">
              <span class="iconfont icon-tupian"></span>
            </div>
          </div>
          <div class="card-content">
            <h4 class="card-title">{{ example.name }}</h4>
            <p class="card-description">{{ example.description }}</p>
            <div class="card-footer">
              <div class="card-tags">
                <span v-for="tag in example.tags" :key="tag" class="tag">
                  {{ tag }}
                </span>
              </div>
              <span class="line-count"
                >{{ example.jsCode.split("\n").length }} 行</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 中间面板基础样式 */
.middle-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--color-bg-elevated);
}

/* 编辑器视图样式 */
.editor-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 编辑器头部 */
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: var(--color-bg-surface);
  border-bottom: 1px solid var(--color-border);
}

/* 标签页容器 */
.tabs {
  display: flex;
  gap: 4px;
}

/* 标签页按钮 */
.tab-btn {
  padding: 6px 16px;
  border: none;
  background-color: transparent;
  color: var(--color-text-secondary);
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.tab-btn:hover {
  background-color: var(--color-bg-hover);
}

.tab-btn.active {
  background-color: var(--color-bg-elevated);
  color: var(--color-text-primary);
  font-weight: 500;
}

/* 运行按钮 */
.run-btn {
  padding: 6px 20px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.run-btn:hover {
  background-color: #45a049;
}

/* 编辑器容器 */
.editor-container {
  flex: 1;
  min-height: 0;
  background-color: var(--color-bg-surface);
}

/* 画廊视图样式 */
.gallery-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 画廊头部 */
.gallery-header {
  display: flex;
  gap: 12px;
  padding: 12px;
  background-color: var(--color-bg-surface);
  border-bottom: 1px solid var(--color-border);
}

/* 搜索输入框 */
.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-bg-elevated);
  color: var(--color-text-primary);
  font-size: 13px;
}

.search-input::placeholder {
  color: var(--color-text-secondary);
}

/* 标签选择框 */
.tag-select {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-bg-elevated);
  color: var(--color-text-primary);
  font-size: 13px;
  cursor: pointer;
}

/* 示例网格 */
.examples-grid {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: grid;
  align-content: start;
  grid-template-columns: 1fr;
  gap: 8px;
}

/* 示例卡片 */
.example-card {
  display: flex;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  height: 120px;
}

.example-card:hover {
  border-color: var(--color-text-secondary);
  box-shadow: var(--shadow);
}

/* 卡片缩略图 */
.card-thumbnail {
  width: 180px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background-color: var(--color-bg-elevated);
}

/* 缩略图占位符 */
.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  font-size: 32px;
}

.thumbnail-placeholder.hidden {
  display: none;
}

/* 缩略图图片 */
.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 卡片内容 */
.card-content {
  flex: 1;
  padding: 12px 12px 5px;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* 卡片标题 */
.card-title {
  margin: 0 0 6px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

/* 卡片描述 */
.card-description {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 标签容器 */
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 0px;
}

/* 标签样式 */
.tag {
  padding: 2px 8px;
  background-color: var(--color-bg-hover);
  color: var(--color-text-secondary);
  border-radius: 4px;
  font-size: 11px;
}

/* 卡片底部 */
.card-footer {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 代码行数 */
.line-count {
  font-size: 11px;
  color: var(--color-text-secondary);
}
</style>
