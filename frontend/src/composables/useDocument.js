import { ref, onMounted } from 'vue'
import { getDocuments, uploadDocument, deleteDocument } from '../api/document.api'

// localStorage key
const UPLOADED_DOCS_KEY = 'rag-bot-uploaded-docs'

export function useDocument() {
  const documents = ref([])
  const uploading = ref(false)
  const uploadProgress = ref(0)
  const loading = ref(false)

  function getUploadedDocsFromStorage() {
    try {
      const stored = localStorage.getItem(UPLOADED_DOCS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('读取 localStorage 失败:', error)
      return []
    }
  }

  function saveUploadedDocsToStorage(docs) {
    try {
      localStorage.setItem(UPLOADED_DOCS_KEY, JSON.stringify(docs))
    } catch (error) {
      console.error('保存 localStorage 失败:', error)
    }
  }

  /**
   * 加载文档列表
   * 以 API 返回为准，合并 localStorage 中本地上传的文档
   */
  async function loadDocuments() {
    loading.value = true
    try {
      const response = await getDocuments()
      const apiDocs = (response.data.documents || []).map((doc) => ({
        ...doc,
        isPreset: doc.isPreset ?? !doc.isUploaded,
      }))

      const validDocNames = new Set(apiDocs.map((d) => d.name))

      let uploadedDocs = getUploadedDocsFromStorage()
      const invalidDocs = uploadedDocs.filter((d) => !validDocNames.has(d.name))

      if (invalidDocs.length > 0) {
        console.log(`[INFO] 清理 ${invalidDocs.length} 个无效的缓存文档:`, invalidDocs.map((d) => d.name))
        uploadedDocs = uploadedDocs.filter((d) => validDocNames.has(d.name))
        saveUploadedDocsToStorage(uploadedDocs)
      }

      const uploadedNames = new Set(uploadedDocs.map((d) => d.name))
      const mergedDocs = [
        ...apiDocs.filter((d) => !uploadedNames.has(d.name)),
        ...uploadedDocs,
      ]

      documents.value = mergedDocs
      console.log(`[INFO] 加载文档完成: ${mergedDocs.length} 个文档 (${apiDocs.length} API + ${uploadedDocs.length} 上传)`)
    } catch (error) {
      console.warn('加载文档失败:', error.message)
      documents.value = getUploadedDocsFromStorage()
    } finally {
      loading.value = false
    }
  }

  async function handleUpload(file) {
    const isProduction = import.meta.env.PROD

    if (isProduction) {
      console.warn('[云部署提示] 受部署环境限制，上传的文档仅作展示')
      throw new Error('CLOUD_UPLOAD_NOT_SUPPORTED')
    }

    uploading.value = true
    uploadProgress.value = 0

    try {
      const response = await uploadDocument(file)
      uploadProgress.value = 100

      const uploadedDocs = getUploadedDocsFromStorage()
      const newDoc = {
        name: file.name,
        chunks: response.data.chunkCount || 1,
        size: file.size,
        isUploaded: true,
        uploadedAt: new Date().toISOString(),
      }

      const filtered = uploadedDocs.filter((d) => d.name !== file.name)
      const updatedDocs = [...filtered, newDoc]

      saveUploadedDocsToStorage(updatedDocs)
      console.log(`[INFO] 文档已保存到 localStorage: ${file.name}`)

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

  async function handleDelete(name) {
    try {
      await deleteDocument(name)

      const uploadedDocs = getUploadedDocsFromStorage()
      const filtered = uploadedDocs.filter((d) => d.name !== name)
      saveUploadedDocsToStorage(filtered)
      console.log(`[INFO] 已从 localStorage 删除: ${name}`)

      await loadDocuments()
    } catch (error) {
      console.error('删除失败:', error)
      throw error
    }
  }

  onMounted(() => {
    loadDocuments()
  })

  return {
    documents,
    uploading,
    uploadProgress,
    loading,
    loadDocuments,
    handleUpload,
    handleDelete,
  }
}
