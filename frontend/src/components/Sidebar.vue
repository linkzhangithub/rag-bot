<template>
  <aside 
    class="sidebar" 
    :class="{ collapsed: isCollapsed, 'mobile-open': isMobileOpen }"
    role="navigation"
    aria-label="侧边栏导航"
  >
    <div class="sidebar-header">
      <button 
        v-if="isCollapsed" 
        @click="openSidebar" 
        class="sidebar-toggle-btn"
        title="展开侧边栏"
        aria-label="展开侧边栏"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="12" y1="3" x2="12" y2="21"/>
        </svg>
      </button>
      
      <template v-else>
        <div class="logo-container">
          <div class="logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
            </svg>
          </div>
          <div class="logo-text">
            <h1>知识库问答</h1>
            <span class="logo-subtitle">RAG System</span>
          </div>
        </div>
        
        <button 
          @click="closeSidebar" 
          class="collapse-btn"
          title="收起侧边栏"
          aria-label="收起侧边栏"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="12" x2="6" y2="12"/>
            <line x1="12" y1="18" x2="6" y2="12"/>
            <line x1="12" y1="6" x2="6" y2="12"/>
          </svg>
        </button>
      </template>
    </div>

    <div v-if="!isCollapsed" class="upload-section">
      <DocumentUpload @upload-success="onUploadSuccess" @upload-error="onUploadError" />
    </div>

    <div class="documents-section">
      <div v-if="!isCollapsed" class="section-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
        <h3>文档列表</h3>
        <span class="doc-count">{{ documents.length }}</span>
      </div>
      <DocumentList 
        :documents="documents" 
        :collapsed="isCollapsed"
        @delete="$emit('delete-document', $event)" 
      />
    </div>

    <div v-if="!isCollapsed" class="sidebar-footer">
      <div class="stat-row">
        <div class="stat-item">
          <span class="stat-value">{{ documents.length }}</span>
          <span class="stat-label">文档</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ totalChunks }}</span>
          <span class="stat-label">文本块</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import DocumentUpload from './DocumentUpload.vue'
import DocumentList from './DocumentList.vue'

const props = defineProps({
  documents: {
    type: Array,
    default: () => []
  },
  collapsed: {
    type: Boolean,
    default: true
  },
  mobileOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['delete-document', 'upload-success', 'upload-error', 'toggle'])

const isCollapsed = computed(() => props.collapsed)
const isMobileOpen = computed(() => props.mobileOpen)

const totalChunks = computed(() => {
  return props.documents.reduce((sum, doc) => sum + (doc.chunks || 0), 0)
})

function openSidebar() {
  emit('toggle', true)
}

function closeSidebar() {
  emit('toggle', false)
}

function onUploadSuccess() {
  emit('upload-success')
}

function onUploadError(message) {
  emit('upload-error', message)
}
</script>

<style scoped>
/* PC端样式 - 收起/展开使用丝滑动画 */
.sidebar {
  width: 64px;
  background: var(--card-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 50;
  flex-shrink: 0;
  height: 100%;
  overflow: hidden;
}

.sidebar:not(.collapsed) {
  width: 280px;
  animation: sidebarExpand 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}

.sidebar.collapsed {
  animation: sidebarCollapse 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.sidebar:not(.collapsed) .sidebar-header {
  animation: slideInFromLeft 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}

.sidebar:not(.collapsed) .upload-section {
  animation: slideInFromLeft 0.35s cubic-bezier(0.32, 0.72, 0, 1) 0.05s both;
}

.sidebar:not(.collapsed) .documents-section {
  animation: slideInFromLeft 0.35s cubic-bezier(0.32, 0.72, 0, 1) 0.1s both;
}

.sidebar:not(.collapsed) .sidebar-footer {
  animation: slideInFromLeft 0.35s cubic-bezier(0.32, 0.72, 0, 1) 0.15s both;
}

.sidebar-header {
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--border);
}

.sidebar:not(.collapsed) .sidebar-header {
  justify-content: space-between;
  padding: 16px;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: var(--accent);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
}

.logo-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.logo-text h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-h);
  line-height: 1.2;
}

.logo-subtitle {
  font-size: 12px;
  color: var(--text);
  margin-top: 2px;
}

.sidebar-toggle-btn {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  border: none;
  border-radius: 12px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  box-shadow: 0 4px 12px rgba(167, 139, 250, 0.35);
}

.sidebar-toggle-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 16px rgba(167, 139, 250, 0.45);
}

.sidebar-toggle-btn:active {
  transform: scale(0.98);
}

.sidebar-toggle-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.collapse-btn {
  width: 34px;
  height: 34px;
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
  border-radius: 10px;
  color: var(--accent);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  flex-shrink: 0;
}

.collapse-btn:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.upload-section {
  padding: 16px;
}

.documents-section {
  flex: 1;
  padding: 8px;
  overflow-y: auto;
  min-height: 0;
}

.sidebar:not(.collapsed) .documents-section {
  padding: 0 16px 16px;
}

.documents-section::-webkit-scrollbar {
  width: 4px;
}

.documents-section::-webkit-scrollbar-track {
  background: transparent;
}

.documents-section::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 2px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.section-header svg {
  color: var(--text);
  flex-shrink: 0;
}

.section-header h3 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-h);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.doc-count {
  margin-left: auto;
  background: var(--accent-bg);
  color: var(--accent);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border);
}

.stat-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
}

.stat-label {
  font-size: 12px;
  color: var(--text);
}

.stat-divider {
  width: 1px;
  height: 28px;
  background: var(--border);
}

/* 移动端样式 - 使用 transform 滑动 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 56px;
    height: calc(100vh - 56px);
    width: 280px;
    transform: translateX(-100%) scale(0.95);
    opacity: 0;
    z-index: 110;
    box-shadow: none;
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s cubic-bezier(0.32, 0.72, 0, 1);
    border-top: 1px solid var(--border);
    pointer-events: none;
  }

  .sidebar.collapsed,
  .sidebar.mobile-open {
    pointer-events: auto;
  }

  .sidebar.collapsed {
    width: 56px;
    transform: translateX(0) scale(1);
    opacity: 1;
    z-index: 50;
    height: calc(100vh - 56px);
    box-shadow: none;
  }

  .sidebar.mobile-open {
    transform: translateX(0) scale(1);
    opacity: 1;
    box-shadow: 
      0 10px 40px rgba(0, 0, 0, 0.15),
      0 2px 10px rgba(0, 0, 0, 0.1);
    z-index: 110;
  }

  .sidebar.collapsed .sidebar-toggle-btn {
    display: flex;
    animation: bounceIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .sidebar-toggle-btn {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    margin: 0 auto;
  }

  .sidebar.collapsed .sidebar-header {
    padding: 10px;
    border-bottom: none;
  }

  .sidebar.collapsed .documents-section {
    padding: 4px;
  }

  .sidebar.mobile-open .sidebar-header {
    animation: slideInFromLeft 0.4s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .sidebar.mobile-open .upload-section {
    animation: slideInFromLeft 0.4s cubic-bezier(0.32, 0.72, 0, 1) 0.05s both;
  }

  .sidebar.mobile-open .documents-section {
    animation: slideInFromLeft 0.4s cubic-bezier(0.32, 0.72, 0, 1) 0.1s both;
  }

  .sidebar.mobile-open .sidebar-footer {
    animation: slideInFromLeft 0.4s cubic-bezier(0.32, 0.72, 0, 1) 0.15s both;
  }
}

@keyframes bounceIn {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes slideInFromLeft {
  from {
    transform: translateX(-20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes sidebarExpand {
  0% {
    width: 64px;
  }
  100% {
    width: 280px;
  }
}

@keyframes sidebarCollapse {
  0% {
    width: 280px;
  }
  100% {
    width: 64px;
  }
}
</style>
