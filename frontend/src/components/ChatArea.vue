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
              <div class="message-text">
                <span v-html="renderMarkdown(message.content, isGenerating && message.role === 'assistant' && messages[messages.length - 1]?.id === message.id)"></span>
              </div>
              
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
import { ref, watch, nextTick, onMounted } from 'vue'
import { marked } from 'marked'
import '@/assets/styles/chat-area.css'

// 配置 marked 选项
marked.setOptions({
  breaks: false,
  gfm: true,
})

const props = defineProps({
  messages: { type: Array, default: () => [] },
  isGenerating: { type: Boolean, default: false },
  documents: { type: Array, default: () => [] }
})

const emit = defineEmits(['send', 'quick-ask'])
const inputMessage = ref('')
const messagesContainer = ref(null)
const inputRef = ref(null)

const quickQuestions = [
  // AI医疗应用 - 核心应用场景
  'AI在医学影像诊断中有哪些应用？',
  // RAG系统指南 - 核心原理
  'RAG系统如何解决大语言模型的知识固化问题？',
  // 脑机接口技术 - 技术概述
  '脑机接口技术的原理和主要应用场景是什么？'
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
    if (inputRef.value) inputRef.value.focus()
  })
}

function handleQuickAsk(question) {
  emit('quick-ask', question)
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function renderMarkdown(content, showIndicator = false) {
  if (!content) return ''
  try {
    const html = marked(content)
    if (showIndicator) {
      return html.replace(/<\/p>$/, '<span class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></span></p>')
    }
    return html
  } catch (e) {
    console.warn('Markdown 解析失败:', e)
    return content
  }
}

onMounted(() => {
  if (inputRef.value) inputRef.value.focus()
})
</script>
