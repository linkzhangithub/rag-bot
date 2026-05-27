import { ref, onMounted } from 'vue'
import { getDocuments, uploadDocument, deleteDocument } from '../api/document.api'

// 预设文档列表（用于EdgeOne部署环境，因为GET路由可能有缓存问题）
const PRESET_DOCUMENTS = [
  { name: 'AI医疗应用.txt', chunks: 5, size: 2048 },
  { name: 'RAG系统指南.md', chunks: 8, size: 4096 },
  { name: '脑机接口技术.docx', chunks: 12, size: 8192 }
]

export function useDocument() {
  const documents = ref([])
  const uploading = ref(false)
  const uploadProgress = ref(0)
  const loading = ref(false) // 添加加载状态

  /**
   * 加载文档列表
   * 优先从API获取，失败时使用预设文档列表
   */
  async function loadDocuments() {
    loading.value = true // 开始加载
    try {
      const response = await getDocuments()
      const apiDocs = response.data.documents || []
      
      // 如果API返回了文档且不为空，使用API数据；否则使用预设文档
      if (apiDocs.length > 0) {
        documents.value = apiDocs
      } else {
        documents.value = PRESET_DOCUMENTS
      }
    } catch (error) {
      console.warn('加载文档失败，使用预设文档:', error.message)
      documents.value = PRESET_DOCUMENTS
    } finally {
      loading.value = false // 加载完成
    }
  }

  /**
   * 上传文档
   */
  async function handleUpload(file) {
    uploading.value = true
    uploadProgress.value = 0
    
    try {
      const response = await uploadDocument(file)
      uploadProgress.value = 100
      await loadDocuments()
      return response.data
    } catch (error) {
      console.error('上传失败:', error)
      throw error
    } finally {
      uploading.value = false
      setTimeout(() => {
        uploadProgress.value = 0
      }, 1000)
    }
  }

  /**
   * 删除文档
   */
  async function handleDelete(name) {
    try {
      await deleteDocument(name)
      await loadDocuments()
    } catch (error) {
      console.error('删除失败:', error)
      throw error
    }
  }

  // 组件挂载时加载文档
  onMounted(() => {
    loadDocuments()
  })

  return {
    documents,
    uploading,
    uploadProgress,
    loading, // 导出加载状态
    loadDocuments,
    handleUpload,
    handleDelete
  }
}
