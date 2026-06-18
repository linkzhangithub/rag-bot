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
export async function uploadDocument(file) {
  // 使用 FormData 格式上传文件（兼容 multer）
  const formData = new FormData();
  formData.append('file', file);
  
  return api.post('/documents', formData, {
    timeout: 60000, // 上传文件可能需要更长时间
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
}

/**
 * 删除文档
 */
export function deleteDocument(name) {
  return api.delete(`/documents/${encodeURIComponent(name)}`)
}

/**
 * 获取文档内容
 * @param {string} fileName - 文档名称
 */
export function getDocumentContent(fileName) {
  return api.get(`/documents/content/${encodeURIComponent(fileName)}`)
}

/**
 * 刷新文档列表
 */
export function refreshDocuments() {
  return api.post('/documents/refresh')
}
