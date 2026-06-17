<template>
  <div class="document-list" :class="{ collapsed: collapsed }">
    <TransitionGroup name="list" tag="div" class="list-container">
      <div
        v-for="document in documents"
        :key="document.name"
        class="document-item"
      >
        <div class="doc-icon" :title="document.name">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            />
            <polyline points="14,2 14,8 20,8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10,9 9,9 8,9" />
          </svg>
        </div>
        <div class="doc-info">
          <span class="doc-name">{{ document.displayName || document.name }}</span>
          <span class="doc-meta">
            <span class="meta-segment">{{ document.chunks }} 文本块</span>
            <span class="meta-separator">·</span>
            <span class="meta-segment">{{ formatSize(document.size) }}</span>
          </span>
        </div>
        <button
          @click="handleDelete(document.name)"
          class="delete-btn"
          :class="{ 'disabled': !document.isUploaded }"
          :title="document.isUploaded ? `删除 ${document.name}` : '预置文档不可删除'"
          :disabled="!document.isUploaded"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <polyline points="3,6 5,6 21,6" />
            <path
              d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
            />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      </div>
    </TransitionGroup>

    <div v-if="documents.length === 0 && !collapsed" class="empty-state">
      <div class="empty-icon">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
          />
          <polyline points="14,2 14,8 20,8" />
        </svg>
      </div>
      <span class="empty-text">暂无文档</span>
      <span class="empty-hint">上传文档开始使用</span>
    </div>

    <!-- 删除确认弹窗 -->
    <DeleteConfirmModal
      v-model:visible="showDeleteModal"
      :document-name="documentToDelete"
      :loading="isDeleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import DeleteConfirmModal from "./DeleteConfirmModal.vue";

const props = defineProps({
  documents: {
    type: Array,
    default: () => [],
  },
  collapsed: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["delete"]);

// 删除弹窗状态
const showDeleteModal = ref(false);
const documentToDelete = ref("");
const isDeleting = ref(false);

function formatSize(bytes) {
  if (!bytes) return "未知";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

async function handleDelete(name) {
  if (!name || typeof name !== "string") {
    console.error("无效的文档名称:", name);
    return;
  }

  // 查找文档对象，检查是否为预置文档（isPreset: true 表示预置文档不可删除）
  const doc = props.documents.find(d => d.name === name);
  if (doc && doc.isPreset) {
    console.warn(`[WARN] 尝试删除预置文档: ${name}`);
    // 不显示弹窗，直接返回
    return;
  }

  documentToDelete.value = name;
  showDeleteModal.value = true;
}

// 确认删除
function confirmDelete() {
  if (!documentToDelete.value) return;
  isDeleting.value = true;
  emit("delete", documentToDelete.value);
  
  // 设置超时保护，防止一直转圈
  setTimeout(() => {
    if (isDeleting.value) {
      console.warn('[WARN] 删除操作超时，自动重置状态');
      resetDeleteState();
    }
  }, 5000); // 5秒超时
}

// 取消删除
function cancelDelete() {
  resetDeleteState();
}

// 重置删除状态
function resetDeleteState() {
  isDeleting.value = false;
  documentToDelete.value = "";
  showDeleteModal.value = false;
}

// 监听文档列表变化，删除成功后自动重置弹窗状态
watch(
  () => props.documents,
  () => {
    if (isDeleting.value) {
      resetDeleteState();
    }
  },
  { deep: true },
);

// 暴露方法给父组件
defineExpose({
  resetDeleteState,
});
</script>

<style scoped>
.document-list {
  display: flex;
  flex-direction: column;
}

.document-list.collapsed {
  padding: 4px 0;
}

.document-list.collapsed .list-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.document-list.collapsed .document-item {
  width: 44px;
  height: 44px;
  padding: 0;
  justify-content: center;
  border-radius: 10px;
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
}

.document-list.collapsed .document-item:hover {
  background: var(--accent);
  border-color: var(--accent);
}

.document-list.collapsed .document-item:hover .doc-icon {
  color: white;
}

.document-list.collapsed .doc-info,
.document-list.collapsed .delete-btn,
.document-list.collapsed .doc-meta {
  display: none;
}

.document-list.collapsed .doc-icon {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  margin: 0;
}

.list-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.document-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.document-item:hover {
  background: var(--accent-bg);
  border-color: var(--accent);
  transform: translateX(4px);
}

.document-item:hover .delete-btn {
  opacity: 1;
}

.doc-icon {
  width: 36px;
  height: 36px;
  background: var(--accent-bg);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.document-item:hover .doc-icon {
  background: var(--accent);
  color: white;
}

.doc-info {
  flex: 1;
  min-width: 0;
}

.doc-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-h);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
  max-width: 100%;
}

.doc-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text);
  margin-top: 3px;
}

.meta-separator {
  color: var(--border);
}

.delete-btn {
  width: 30px;
  height: 30px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--error);
  opacity: 0;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.delete-btn:hover:not(.disabled) {
  background: rgba(239, 68, 68, 0.1);
}

.delete-btn.disabled {
  opacity: 0.3;
  cursor: not-allowed;
  color: var(--text);
}

.document-item:hover .delete-btn.disabled {
  opacity: 0.3;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 16px;
  gap: 8px;
}

.empty-icon {
  color: var(--border);
  margin-bottom: 4px;
}

.empty-text {
  font-size: 13px;
  color: var(--text);
  font-weight: 500;
}

.empty-hint {
  font-size: 11px;
  color: var(--text);
}

.list-enter-active,
.list-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-12px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

.list-move {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
