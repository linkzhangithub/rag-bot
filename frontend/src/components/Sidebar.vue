<template>
  <aside class="sidebar" :class="{ collapsed: isCollapsed, 'mobile-open': isMobileOpen }" role="navigation" aria-label="侧边栏导航">
    <div class="sidebar-header">
      <button v-if="isCollapsed" @click="openSidebar" class="sidebar-toggle-btn" title="展开侧边栏" aria-label="展开侧边栏">
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
        <button @click="closeSidebar" class="collapse-btn" title="收起侧边栏" aria-label="收起侧边栏">
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
        <button @click="onRefresh" class="refresh-btn" title="刷新文档列表" aria-label="刷新文档列表">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>
      </div>
      <DocumentList :documents="documents" :collapsed="isCollapsed" @delete="$emit('delete-document', $event)" />
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
import DocumentUpload from '@/components/DocumentUpload.vue'
import DocumentList from '@/components/DocumentList.vue'
import '@/assets/styles/sidebar.css'

const props = defineProps({
  documents: { type: Array, default: () => [] },
  collapsed: { type: Boolean, default: true },
  mobileOpen: { type: Boolean, default: false }
})

const emit = defineEmits(['delete-document', 'upload-success', 'upload-error', 'toggle', 'refresh'])

const isCollapsed = computed(() => props.collapsed)
const isMobileOpen = computed(() => props.mobileOpen)

const totalChunks = computed(() => {
  return props.documents.reduce((sum, doc) => sum + (doc.chunks || 0), 0)
})

function openSidebar() { emit('toggle', true) }
function closeSidebar() { emit('toggle', false) }
function onUploadSuccess() { emit('upload-success') }
function onUploadError(message) { emit('upload-error', message) }
function onRefresh() { emit('refresh') }
</script>
