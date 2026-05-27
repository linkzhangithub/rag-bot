/**
 * SSE 流式对话 API
 * 面试可讲：使用 ReadableStream 解析 SSE，AbortController 取消请求
 */

/**
 * 流式发送消息
 * @param {string} question - 用户问题
 * @param {Function} onChunk - 每个数据块的回调
 * @param {Function} onComplete - 完成回调
 * @param {AbortController} abortController - 用于取消请求
 * @param {Function} onSources - 接收来源信息的回调
 * @param {string} sessionId - 会话ID
 */
export async function streamChat(question, onChunk, onComplete, abortController, onSources, sessionId) {
  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ question, sessionId }),
      signal: abortController?.signal
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      
      if (done) {
        onComplete?.()
        break
      }

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        const trimmedLine = line.trim()
        
        // 跳过空行和注释行（心跳）
        if (!trimmedLine || trimmedLine.startsWith(':')) {
          continue
        }
        
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6)
          
          if (data === '[DONE]') {
            onComplete?.()
            return
          }

          try {
            const parsed = JSON.parse(data)
            
            // 处理来源信息
            if (parsed.type === 'sources' && parsed.sources) {
              onSources?.(parsed.sources)
            }
            // 处理内容块
            else if (parsed.content) {
              onChunk?.(parsed.content)
            }
            // 处理错误
            if (parsed.error) {
              throw new Error(parsed.error)
            }
          } catch (e) {
            console.warn('SSE 数据解析失败:', e, '原始数据:', data)
          }
        }
      }
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('请求已取消')
    } else {
      console.error('SSE 请求失败:', error)
      throw error
    }
  }
}
