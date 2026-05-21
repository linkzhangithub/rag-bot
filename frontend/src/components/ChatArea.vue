<template>
  <div class="chat-area">
    <div class="messages-container" ref="messagesContainer">
      <div v-if="messages.length === 0" class="welcome-screen">
        <div class="welcome-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h2 class="welcome-title">开始对话</h2>
        <p class="welcome-subtitle">上传文档后，基于内容提问获取答案</p>
        <div class="quick-questions">
          <button 
            v-for="(question, index) in quickQuestions" 
            :key="index"
            @click="handleQuickAsk(question)"
            class="quick-question-btn"
          >
            {{ question }}
          </button>
        </div>
      </div>

      <TransitionGroup name="message" tag="div" class="messages-list">
      <div 
        v-for="message in messages" 
        :key="message.id"
        :class="['message-wrapper', message.role]"
      >
          <div :class="['message', message.role]">
            <div class="avatar">
              <svg v-if="message.role === 'user'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <img v-else src="/src/assets/cat-avatar.png" alt="AI" class="ai-avatar" />
            </div>
            <div class="message-content-wrapper">
              <div class="message-text" v-html="renderMarkdown(message.content)"></div>
              
              <div v-if="message.sources && message.sources.length > 0" class="sources-section">
                <div class="sources-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                  </svg>
                  <span>参考来源</span>
                </div>
                <div class="sources-list">
                  <div 
                    v-for="(source, idx) in message.sources" 
                    :key="idx" 
                    class="source-item"
                  >
                    <div class="source-index">{{ idx + 1 }}</div>
                    <div class="source-details">
                      <div class="source-name">{{ source.name }}</div>
                      <div class="source-meta">匹配度 {{ (source.score * 100).toFixed(1) }}%</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="message-time">{{ formatTime(message.timestamp) }}</div>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <div class="input-container">
      <div class="input-wrapper">
        <textarea
          v-model="inputMessage"
          @keydown.enter.exact.prevent="handleSend"
          placeholder="输入问题..."
          class="message-input"
          :disabled="isGenerating"
          ref="inputRef"
          rows="1"
        ></textarea>
        <button 
          @click="handleSend" 
          class="send-button"
          :disabled="!inputMessage.trim() || isGenerating"
        >
          <svg v-if="isGenerating" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinner">
            <path d="M21 12a9 9 0 0 1-9 9"/>
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 2L11 13"/>
            <polygon points="22,2 15,22 11,13 2,9 22,2"/>
          </svg>
        </button>
      </div>
      <div class="input-footer">
        <span class="input-hint">按 Enter 发送</span>
        <span v-if="isGenerating" class="generating-indicator">
          <span class="indicator-dot"></span>
          <span class="indicator-text">正在处理...</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, computed } from 'vue'
import { marked } from 'marked'

// 配置 marked 选项
marked.setOptions({
  breaks: true,  // 允许 GFM 换行
  gfm: true,     // 允许 GitHub 风格的 Markdown
})

const props = defineProps({
  messages: {
    type: Array,
    default: () => []
  },
  isGenerating: {
    type: Boolean,
    default: false
  },
  documents: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['send', 'quick-ask'])

const inputMessage = ref('')
const messagesContainer = ref(null)
const inputRef = ref(null)

const quickQuestions = [
  '什么是RAG？',
  '如何解决RAG幻觉问题？',
  '文本分块策略有哪些？',
  '向量检索原理是什么？'
]

watch(() => props.messages.length, async () => {
  await nextTick()
  scrollToBottom()
})

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function handleSend() {
  if (!inputMessage.value.trim() || props.isGenerating) return
  
  emit('send', inputMessage.value.trim())
  inputMessage.value = ''
  
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus()
    }
  })
}

function handleQuickAsk(question) {
  emit('quick-ask', question)
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * 渲染 Markdown 内容
 */
function renderMarkdown(content) {
  if (!content) return ''
  try {
    return marked(content)
  } catch (e) {
    console.warn('Markdown 解析失败:', e)
    return content
  }
}

onMounted(() => {
  if (inputRef.value) {
    inputRef.value.focus()
  }
})
</script>

<style scoped>
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: var(--accent);
}

.welcome-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 20px;
}

.welcome-icon {
  width: 64px;
  height: 64px;
  background: var(--accent-bg);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  margin-bottom: 24px;
}

.welcome-title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-h);
}

.welcome-subtitle {
  margin: 0 0 32px;
  font-size: 14px;
  color: var(--text);
}

.quick-questions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  max-width: 600px;
}

.quick-question-btn {
  padding: 12px 20px;
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
  border-radius: 20px;
  font-size: 14px;
  color: var(--text-h);
  cursor: pointer;
  transition: all 0.15s ease;
}

.quick-question-btn:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.message-wrapper {
  display: flex;
}

.message-wrapper.user {
  justify-content: flex-end;
}

.message-wrapper.assistant {
  justify-content: flex-start;
}

.message {
  display: flex;
  gap: 12px;
  max-width: 75%;
}

.message.user {
  flex-direction: row-reverse;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.message.user .avatar {
  background: var(--accent);
  color: white;
}

.message.assistant .avatar {
  background: var(--accent-bg);
  color: var(--accent);
}

.ai-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.message-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-text {
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.6;
  font-size: 14px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* Markdown 样式 */
.message-text :deep(h1),
.message-text :deep(h2),
.message-text :deep(h3) {
  margin: 0.5em 0;
  font-weight: 600;
}

.message-text :deep(p) {
  margin: 0.5em 0;
}

.message-text :deep(ul),
.message-text :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.message-text :deep(li) {
  margin: 0.25em 0;
}

.message-text :deep(code) {
  background: rgba(0, 0, 0, 0.06);
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9em;
}

.message-text :deep(pre) {
  background: rgba(0, 0, 0, 0.06);
  padding: 0.5em;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0.5em 0;
}

.message-text :deep(pre code) {
  background: transparent;
  padding: 0;
}

.message-text :deep(blockquote) {
  border-left: 3px solid rgba(0, 0, 0, 0.1);
  margin: 0.5em 0;
  padding-left: 1em;
  color: #666;
}

.message-text :deep(hr) {
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  margin: 1em 0;
}

.message-text :deep(a) {
  color: var(--accent);
  text-decoration: none;
}

.message-text :deep(a:hover) {
  text-decoration: underline;
}

.message-text :deep(strong) {
  font-weight: 600;
}

.message.user .message-text {
  background: var(--accent);
  color: white;
  border-radius: 12px 12px 4px 12px;
}

.message.assistant .message-text {
  background: var(--accent-bg);
  color: var(--text-h);
  border: 1px solid var(--accent-border);
  border-radius: 12px 12px 12px 4px;
}

.message-time {
  font-size: 11px;
  color: var(--text);
  padding: 0 4px;
}

.message.user .message-time {
  text-align: right;
}

.sources-section {
  margin-top: 8px;
  padding: 12px;
  background: var(--accent-bg);
  border-radius: 8px;
  border-left: 3px solid var(--accent);
}

.sources-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-h);
  margin-bottom: 10px;
}

.sources-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.source-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--card-bg);
  border: 1px solid var(--accent-border);
  border-radius: 6px;
}

.source-index {
  width: 22px;
  height: 22px;
  background: var(--accent-bg);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  flex-shrink: 0;
}

.source-details {
  flex: 1;
  min-width: 0;
}

.source-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-h);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.source-meta {
  font-size: 11px;
  color: var(--text);
  margin-top: 2px;
}

.input-container {
  padding: 16px 24px 20px;
  background: var(--card-bg);
  border-top: 1px solid var(--border);
}

.input-wrapper {
  display: flex;
  gap: 12px;
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
  border-radius: 12px;
  padding: 10px 12px;
  transition: all 0.15s ease;
  align-items: flex-end;
}

.input-wrapper:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.15);
}

.message-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  padding: 6px 4px;
  color: var(--text-h);
  font-size: 14px;
  line-height: 1.5;
  font-family: inherit;
}

.message-input::placeholder {
  color: var(--text);
}

.message-input:disabled {
  opacity: 0.5;
}

.send-button {
  width: 40px;
  height: 40px;
  background: var(--accent);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.send-button:hover:not(:disabled) {
  background: var(--accent-hover);
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.input-hint {
  font-size: 11px;
  color: var(--text);
}

.generating-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text);
}

.indicator-dot {
  width: 6px;
  height: 6px;
  background: var(--accent);
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.message-enter-active,
.message-leave-active {
  transition: all 0.2s ease;
}

.message-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.message-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

@media (max-width: 768px) {
  .quick-questions {
    flex-direction: column;
    width: 100%;
    padding: 0 16px;
  }

  .quick-question-btn {
    width: 100%;
  }

  .message {
    max-width: 90%;
  }

  .messages-container {
    padding: 16px;
  }

  .input-container {
    padding: 12px 16px 16px;
  }
}
</style>