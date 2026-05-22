<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="handleCancel" role="dialog" aria-modal="true" :aria-labelledby="titleId">
        <div class="modal-container">
          <div class="modal-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>

          <h3 :id="titleId" class="modal-title">{{ title }}</h3>

          <p class="modal-description">
            确定要删除文档 <span class="doc-name-highlight">{{ documentName }}</span> 吗？此操作无法撤销。
          </p>

          <div class="modal-actions">
            <button class="btn btn-cancel" @click="handleCancel" :disabled="loading">
              取消
            </button>
            <button class="btn btn-delete" @click="handleConfirm" :disabled="loading">
              <span v-if="loading" class="spinner"></span>
              <span v-else>删除</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  documentName: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'confirm', 'cancel'])

const titleId = 'delete-modal-title'
const uniqueId = computed(() => `delete-modal-${Math.random().toString(36).substr(2, 9)}`)

const title = '删除文档'

// 关闭弹窗
function handleCancel() {
  if (props.loading) return
  emit('update:visible', false)
  emit('cancel')
}

// 确认删除
function handleConfirm() {
  if (props.loading) return
  emit('confirm')
}

// ESC 键关闭
function handleKeydown(e) {
  if (e.key === 'Escape' && props.visible) {
    handleCancel()
  }
}

// 监听 ESC 键
watch(() => props.visible, (val) => {
  if (val) {
    document.addEventListener('keydown', handleKeydown)
  } else {
    document.removeEventListener('keydown', handleKeydown)
  }
}, { immediate: true })

// 组件卸载时移除监听
import { onUnmounted } from 'vue'
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-container {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 28px;
  width: 100%;
  max-width: 400px;
  box-shadow: var(--shadow);
  animation: modalSlideIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-icon {
  width: 48px;
  height: 48px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--error);
  margin-bottom: 16px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-h);
  margin: 0 0 8px;
}

.modal-description {
  font-size: 14px;
  color: var(--text);
  line-height: 1.5;
  margin: 0 0 24px;
}

.doc-name-highlight {
  color: var(--text-h);
  font-weight: 500;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  min-width: 80px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel {
  background: var(--accent-bg);
  color: var(--text-h);
}

.btn-cancel:hover:not(:disabled) {
  background: var(--border);
}

.btn-delete {
  background: var(--error);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-delete:hover:not(:disabled) {
  background: #DC2626;
  transform: translateY(-1px);
}

.btn-delete:active:not(:disabled) {
  transform: translateY(0);
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 过渡动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95) translateY(-10px);
}
</style>
