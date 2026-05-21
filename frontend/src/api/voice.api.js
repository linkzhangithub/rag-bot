import axios from 'axios'

const api = axios.create({
  baseURL: '/api/voice',
  timeout: 10000
})

/**
 * 获取 ASR token（语音识别）
 */
export function getAsrToken() {
  return api.get('/asr-token')
}

/**
 * 获取 TTS token（语音合成）
 */
export function getTtsToken() {
  return api.get('/tts-token')
}
