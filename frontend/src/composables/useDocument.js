import { ref, onMounted } from 'vue'
import { getDocuments, uploadDocument, deleteDocument } from '../api/document.api'

// 预设文档列表（用于演示环境和EdgeOne部署）
const PRESET_DOCUMENTS = [
  { name: 'AI医疗应用.txt', chunks: 0, size: 2048 },
  { name: 'RAG系统指南.md', chunks: 0, size: 4096 },
  { name: '脑机接口技术.docx', chunks: 0, size: 8192 }
]

export function useDocument() {
  const documents = ref([])
  const uploading = ref(false)
  const uploadProgress = ref(0)

  /**
   * 加载文档列表
   * 优先从API获取，失败时使用预设文档列表（适用于EdgeOne等无状态环境）
   */
  async function loadDocuments() {
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
    loadDocuments,
    handleUpload,
    handleDelete
  }
}
