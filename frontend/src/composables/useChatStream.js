import { ref } from 'vue'
import { streamChat } from '../api/chat.api'

/**
 * SSE 流式对话逻辑
 * 面试可讲：AbortController 取消请求，ReadableStream 解析 SSE
 */
export function useChatStream() {
  const messages = ref([])
  const isGenerating = ref(false)
  let abortController = null
  
  // 从 localStorage 获取或生成 sessionId（使用更唯一的 ID）
  const getOrCreateSessionId = () => {
    let sessionId = localStorage.getItem('chat_session_id')
    if (!sessionId) {
      // 使用时间戳 + 随机数生成唯一 ID
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      localStorage.setItem('chat_session_id', sessionId)
    }
    return sessionId
  }
  
  const sessionId = getOrCreateSessionId()

  /**
   * 发送消息
   */
  async function sendMessage(content) {
    if (!content.trim()) return

    // 1. 添加用户消息
    messages.value.push({ 
      role: 'user', 
      content,
      timestamp: new Date()
    })
    
    // 2. 添加空的助手消息（用于流式更新）
    messages.value.push({ 
      role: 'assistant', 
      content: '',
      sources: [],
      timestamp: new Date()
    })
    
    isGenerating.value = true

    // 3. 创建 AbortController
    abortController = new AbortController()

    try {
      // 4. SSE 流式请求
      await streamChat(
        content,
        // onChunk: 接收每个数据块
        (chunk) => {
          const lastIndex = messages.value.length - 1
          const lastMessage = messages.value[lastIndex]
          // 强制触发 Vue 响应式更新
          lastMessage.content = lastMessage.content + chunk
          // 触发数组更新
          messages.value = [...messages.value]
        },
        // onComplete: 完成回调
        () => {
          isGenerating.value = false
        },
        abortController,
        // onSources: 接收来源信息
        (sources) => {
          const lastIndex = messages.value.length - 1
          const lastMessage = messages.value[lastIndex]
          lastMessage.sources = sources
          // 触发数组更新
          messages.value = [...messages.value]
        },
        sessionId // 传递 sessionId
      )
    } catch (error) {
      console.error('发送消息失败:', error)
      isGenerating.value = false
      
      // 添加错误消息
      const lastMessage = messages.value[messages.value.length - 1]
      if (lastMessage) {
        lastMessage.content = `错误：${error.message}`
      } else {
        // 如果没有任何消息，创建一条错误消息
        messages.value.push({
          role: 'assistant',
          content: `错误：${error.message}`,
          sources: [],
          timestamp: new Date()
        })
      }
    }
  }

  /**
   * 停止生成
   */
  function stop() {
    abortController?.abort()
    isGenerating.value = false
  }

  /**
   * 清空消息
   */
  function clearMessages() {
    messages.value = []
  }

  return {
    messages,
    isGenerating,
    sendMessage,
    stop,
    clearMessages
  }
}
