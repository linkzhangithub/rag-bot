import { ref, onMounted } from 'vue'
import { getDocuments, uploadDocument, deleteDocument } from '../api/document.api'

export function useDocument() {
  const documents = ref([])
  const uploading = ref(false)
  const uploadProgress = ref(0)

  /**
   * 加载文档列表
   */
  async function loadDocuments() {
    try {
      const response = await getDocuments()
      documents.value = response.data.documents || []
    } catch (error) {
      console.error('加载文档失败:', error)
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
