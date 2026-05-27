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
  // 读取文件内容
  const content = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });

  // 发送 JSON 格式
  return api.post('/documents', {
    fileName: file.name,
    content: content
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

/**
 * 删除文档
 */
export function deleteDocument(name) {
  return api.delete(`/documents/${encodeURIComponent(name)}`)
}
