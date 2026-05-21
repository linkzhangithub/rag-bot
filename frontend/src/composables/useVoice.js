import { ref } from 'vue'
import { getAsrToken } from '../api/voice.api'

export function useVoice() {
  const isRecording = ref(false)
  const isProcessing = ref(false)

  /**
   * 开始录音（简化版，实际需要WebSocket连接）
   */
  async function startRecording() {
    isRecording.value = true
    // TODO: 实现真正的录音和WebSocket连接
  }

  /**
   * 停止录音并识别
   */
  async function stopRecording() {
    isRecording.value = false
    isProcessing.value = true
    
    try {
      // 获取ASR token
      const response = await getAsrToken()
      // TODO: 使用token进行语音识别
      return ''
    } catch (error) {
      console.error('语音识别失败:', error)
      throw error
    } finally {
      isProcessing.value = false
    }
  }

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording
  }
}
