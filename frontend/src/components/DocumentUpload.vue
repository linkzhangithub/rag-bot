<template>
  <div 
    class="upload-container"
    :class="{ 'drag-over': isDragOver, 'uploading': props.uploading }"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <label class="upload-label">
      <input 
        type="file" 
        accept=".md,.txt,.pdf,.docx" 
        @change="onFileSelect"
        :disabled="props.uploading"
        class="file-input"
      />
      <div class="upload-content" v-if="!props.uploading">
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
          <div class="progress-bar" :style="{ width: props.uploadProgress + '%' }"></div>
        </div>
      </div>
    </label>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'

const props = defineProps({
  uploading: { type: Boolean, default: false },
  uploadProgress: { type: Number, default: 0 }
})

const emit = defineEmits(['upload', 'upload-error'])

const isDragOver = ref(false)
let uploadInterval = null

async function onFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return
  emit('upload', file)  // 向父组件发送上传事件
  event.target.value = ''
}

async function onDrop(event) {
  isDragOver.value = false
  const file = event.dataTransfer.files[0]
  if (!file) return
  emit('upload', file)  // 向父组件发送上传事件
}

function onDragOver() {
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
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