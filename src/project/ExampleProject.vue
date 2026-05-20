<script setup lang="ts">
defineOptions({
  name: 'ExampleProject'
})

const project = {
  name: '示例项目',
  preview: '',
  description: '这是一个空白示例项目，你可以在这里添加新的项目内容。',
  techStack: [],
  responsibilities: [],
  github: '#',
  gitee: '#'
}
</script>

<template>
  <div class="project-container">
    <div class="project-card">
      <div class="card-header">
        <div class="preview-wrapper empty-preview">
          <span class="empty-icon">+</span>
        </div>
      </div>

      <div class="card-body">
        <h2 class="project-title">{{ project.name }}</h2>
        <p class="project-desc">{{ project.description }}</p>

        <div class="tech-stack">
          <span v-for="tech in project.techStack" :key="tech" class="tech-badge">
            {{ tech }}
          </span>
          <span v-if="project.techStack.length === 0" class="tech-badge empty">
            待添加
          </span>
        </div>

        <div class="responsibilities">
          <h3 class="section-title">项目描述</h3>
          <div v-for="(item, index) in project.responsibilities" :key="index" class="responsibility-item">
            <h4 class="item-title">{{ item.title }}</h4>
            <p class="item-content">{{ item.content }}</p>
          </div>
          <div v-if="project.responsibilities.length === 0" class="responsibility-item empty">
            <p class="empty-text">暂无项目描述，请添加内容。</p>
          </div>
        </div>

        <div class="project-links">
          <a :href="project.github" target="_blank" rel="noopener noreferrer" class="link-btn github">
            <svg class="link-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            GitHub
          </a>
          <a :href="project.gitee" target="_blank" rel="noopener noreferrer" class="link-btn gitee">
            <svg class="link-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10.184 0c-.944 0-1.784.39-2.423 1.018C7.34.39 6.5.78 6.5 1.535v21.323c0 .755.84 1.145 1.261.723.421-.421.763-.963.763-1.538V6.295l5.66 5.66c.193.193.451.29.708.29.258 0 .516-.097.708-.29.385-.385.385-1.012 0-1.397L10.18 5.006V1.535c0-.755-.84-1.145-1.261-.723-.421.421-.763.963-.763 1.538v16.54c0 1.018-.842 1.847-1.885 1.847-.755 0-1.368-.63-1.368-1.385V1.535C5.603.78 6.44.39 7.34.39c.902 0 1.62-.51 2.025-1.232C9.78-.51 10.5.03 11.26.03c.755 0 1.385-.54 1.385-1.295 0-.755-.63-1.385-1.385-1.385L10.184 0z"/>
            </svg>
            Gitee
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-container {
  padding: 24px;
  display: flex;
  justify-content: center;
  min-height: calc(100vh - 60px);
  background: var(--color-bg-base);
}

.project-card {
  width: 100%;
  max-width: 1200px;
  background: var(--color-bg-surface);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.card-header {
  position: relative;
}

.preview-wrapper {
  position: relative;
  width: 100%;
  height: 320px;
  overflow: hidden;
  background: var(--color-bg-elevated);
}

.empty-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-bg-elevated) 0%, var(--color-bg-hover) 100%);
  border: 2px dashed var(--color-border-muted);
}

.empty-icon {
  font-size: 64px;
  color: var(--color-text-muted);
  font-weight: 300;
}

.card-body {
  padding: 28px 32px;
}

.project-title {
  font-size: 26px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 12px;
}

.project-desc {
  font-size: 15px;
  line-height: 1.7;
  color: var(--color-text-secondary);
  margin-bottom: 20px;
}

.tech-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 28px;
}

.tech-badge {
  padding: 6px 14px;
  background: var(--color-primary-bg-light);
  color: var(--color-primary);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.tech-badge.empty {
  background: var(--color-bg-hover);
  color: var(--color-text-muted);
}

.section-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--color-border);
}

.responsibilities {
  margin-bottom: 28px;
}

.responsibility-item {
  margin-bottom: 18px;
  padding-left: 16px;
  border-left: 3px solid var(--color-primary);
  background: var(--color-bg-elevated);
  padding: 14px 18px;
  border-radius: 0 8px 8px 0;
}

.responsibility-item.empty {
  border-left-color: var(--color-border-muted);
}

.empty-text {
  color: var(--color-text-muted);
  font-style: italic;
}

.item-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: 6px;
}

.item-content {
  font-size: 14px;
  line-height: 1.65;
  color: var(--color-text-secondary);
}

.project-links {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.link-btn:hover {
  transform: translateY(-2px);
}

.link-icon {
  width: 18px;
  height: 18px;
}

.link-btn.github {
  background: #24292e;
  color: #ffffff;
}

.link-btn.github:hover {
  background: #1b1f23;
  box-shadow: 0 4px 12px rgba(36, 41, 46, 0.4);
}

.link-btn.gitee {
  background: #c71a27;
  color: #ffffff;
}

.link-btn.gitee:hover {
  background: #a01620;
  box-shadow: 0 4px 12px rgba(199, 26, 39, 0.4);
}

@media (max-width: 768px) {
  .project-container {
    padding: 16px;
  }

  .card-body {
    padding: 20px;
  }

  .preview-wrapper {
    height: 220px;
  }

  .project-title {
    font-size: 22px;
  }

  .project-links {
    flex-direction: column;
  }

  .link-btn {
    justify-content: center;
  }
}
</style>
