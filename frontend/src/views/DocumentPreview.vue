<template>
  <div class="document-preview">
    <header class="preview-header">
      <div class="header-left"></div>
      <div class="header-center">
        <h1>{{ documentName }}</h1>
      </div>
      <div class="header-right"></div>
    </header>

    <div class="preview-content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>正在加载文档...</p>
      </div>

      <!-- PDF 预览 -->
      <div v-else-if="documentType === 'pdf'" class="pdf-container">
        <iframe 
          :src="pdfUrl" 
          class="pdf-frame"
          title="PDF预览"
        ></iframe>
      </div>

      <!-- 文本内容预览 -->
      <div v-else-if="documentType === 'text'" class="text-container">
        <div class="text-content" v-html="formattedContent"></div>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error-container">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>{{ error }}</p>
        <button @click="loadDocument" class="retry-btn">重试</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getDocumentContent } from '../api/document.api'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const documentType = ref('')
const documentName = ref('')
const content = ref('')
const pdfUrl = ref('')
const error = ref('')

const formattedContent = computed(() => {
  // 根据内容类型进行格式化
  if (!content.value) return ''
  
  // 如果是 Markdown 内容，进行简单的高亮
  if (documentName.value.endsWith('.md')) {
    // 简单的 Markdown 预览
    return content.value
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/\n/gim, '<br>')
  }
  
  // TXT 文件直接显示，保持换行
  return content.value.replace(/\n/g, '<br>')
})

const goBack = () => {
  router.back()
}

const loadDocument = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const fileName = route.query.name || ''
    if (!fileName) {
      throw new Error('未指定文档名称')
    }
    
    documentName.value = fileName
    
    const response = await getDocumentContent(fileName)
    const data = response.data
    
    if (!data.success) {
      throw new Error(data.error || '加载文档失败')
    }
    
    documentType.value = data.type
    
    if (data.type === 'pdf') {
      // PDF 文件使用 iframe 预览，拼接完整的后端地址
      const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
      pdfUrl.value = `${apiBase}${data.filePath}`
    } else {
      // 文本文件直接显示内容
      content.value = data.content
    }
    
    loading.value = false
  } catch (err) {
    console.error('加载文档失败:', err)
    error.value = err.message || '加载文档失败'
    loading.value = false
  }
}

onMounted(() => {
  loadDocument()
})
</script>

<style scoped>
.document-preview {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.header-left,
.header-right {
  flex: 1;
}

.header-center {
  flex: 2;
  text-align: center;
}

.header-center h1 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-h);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 400px;
  margin: 0 auto;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.back-btn:hover {
  background: var(--accent-bg);
  border-color: var(--accent);
  color: var(--accent);
}

.preview-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.loading-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.pdf-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: var(--bg);
}

.pdf-frame {
  flex: 1;
  width: 100%;
  border: none;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.text-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: var(--bg);
}

.text-content {
  max-width: 800px;
  margin: 0 auto;
  background: var(--card-bg);
  border-radius: 12px;
  padding: 32px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--text);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.text-content :deep(h1) {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-h);
  margin: 24px 0 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--accent);
}

.text-content :deep(h2) {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-h);
  margin: 20px 0 12px;
}

.text-content :deep(h3) {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-h);
  margin: 16px 0 8px;
}

.text-content :deep(strong) {
  font-weight: 600;
  color: var(--accent);
}

.text-content :deep(em) {
  font-style: italic;
  color: var(--text);
}

.error-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text);
}

.error-container svg {
  color: var(--error);
}

.retry-btn {
  padding: 8px 24px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.retry-btn:hover {
  background: var(--accent-dark);
  transform: translateY(-1px);
}
</style>
