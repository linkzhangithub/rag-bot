<template>
  <div 
    class="upload-container"
    :class="{ 'drag-over': isDragOver, 'uploading': isUploading }"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <label class="upload-label">
      <input 
        type="file" 
        accept=".md,.txt,.pdf,.docx" 
        @change="onFileSelect"
        :disabled="isUploading"
        class="file-input"
      />
      <div class="upload-content" v-if="!isUploading">
        <div class="upload-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17,8 12,3 7,8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div class="upload-text">
          <span class="upload-main-text">{{ isDragOver ? '释放以上传' : '上传文档' }}</span>
          <span class="upload-subtext">支持 .md, .txt, .pdf, .docx</span>
        </div>
      </div>
      <div class="uploading-content" v-else>
        <div class="spinner"></div>
        <div class="uploading-text">正在处理...</div>
        <div class="progress-container">
          <div class="progress-bar" :style="{ width: uploadProgress + '%' }"></div>
        </div>
      </div>
    </label>

    <Transition name="fade">
      <div v-if="showSuccess" class="success-toast">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22,4 12,14.01 9,11.01"/>
        </svg>
        <span>{{ successMessage }}</span>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { uploadDocument } from '../api/document.api'

const emit = defineEmits(['upload-success', 'upload-error'])

const isDragOver = ref(false)
const isUploading = ref(false)
const uploadProgress = ref(0)
const showSuccess = ref(false)
const successMessage = ref('')
let uploadInterval = null

async function onFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return
  await handleUpload(file)
  event.target.value = ''
}

async function onDrop(event) {
  isDragOver.value = false
  const file = event.dataTransfer.files[0]
  if (!file) return
  await handleUpload(file)
}

function onDragOver() {
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}

async function handleUpload(file) {
  isUploading.value = true
  uploadProgress.value = 0

  try {
    uploadInterval = setInterval(() => {
      if (uploadProgress.value < 90) {
        uploadProgress.value += Math.random() * 15
      }
    }, 200)

    const response = await uploadDocument(file)

    if (uploadInterval) {
      clearInterval(uploadInterval)
      uploadInterval = null
    }

    if (response.data.success) {
      uploadProgress.value = 100
      successMessage.value = `已上传 ${file.name}`
      showSuccess.value = true
      emit('upload-success')

      setTimeout(() => {
        showSuccess.value = false
        uploadProgress.value = 0
        isUploading.value = false
      }, 2000)
    } else {
      throw new Error(response.data.error || '上传失败')
    }
  } catch (error) {
    console.error('上传失败:', error)
    if (uploadInterval) {
      clearInterval(uploadInterval)
      uploadInterval = null
    }
    emit('upload-error', error.message)
    isUploading.value = false
    uploadProgress.value = 0
  }
}

onUnmounted(() => {
  if (uploadInterval) {
    clearInterval(uploadInterval)
  }
})
</script>

<style scoped>
.upload-container {
  border: 2px dashed var(--accent-border);
  border-radius: 12px;
  padding: 24px 20px;
  background: var(--accent-bg);
  position: relative;
  transition: all 0.15s ease;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-container:hover:not(.uploading) {
  border-color: var(--accent);
  background: var(--card-bg);
}

.upload-container.drag-over {
  border-color: var(--accent);
  background: var(--accent-bg);
  box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.15);
}

.upload-container.uploading {
  border-color: var(--accent);
  background: var(--card-bg);
}

.file-input {
  display: none;
}

.upload-label {
  display: block;
  cursor: pointer;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.upload-icon {
  width: 56px;
  height: 56px;
  background: var(--accent-bg);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}

.upload-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.upload-main-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-h);
}

.upload-subtext {
  font-size: 12px;
  color: var(--text);
}

.uploading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.uploading-text {
  font-size: 13px;
  color: var(--accent);
  font-weight: 500;
}

.progress-container {
  width: 100%;
  max-width: 160px;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.success-toast {
  position: absolute;
  top: 12px;
  right: 12px;
  background: var(--success);
  color: white;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>