import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 响应拦截器 - 统一错误处理
api.interceptors.response.use(
  response => response,
  error => {
    const message = error.response?.data?.error || error.message || '请求失败'
    console.error('API 错误:', message)
    return Promise.reject(new Error(message))
  }
)

/**
 * 获取文档列表
 */
export function getDocuments() {
  return api.get('/documents')
}

/**
 * 上传文档
 */
export function uploadDocument(file) {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/documents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 删除文档
 */
export function deleteDocument(name) {
  return api.delete(`/documents/${encodeURIComponent(name)}`)
}

/**
 * 刷新文档
 */
export function refreshDocuments() {
  return api.post('/documents/refresh')
}
