import { ref, onMounted } from 'vue'
import { getDocuments, uploadDocument, deleteDocument } from '../api/document.api'

// 预设文档列表（用于EdgeOne部署环境，因为GET路由可能有缓存问题）
// isPreset: true 表示这是预置文档，不能删除
// displayName: 侧边栏显示的名称（可选，默认使用name）
const PRESET_DOCUMENTS = [
  { name: 'AI医疗应用.txt', chunks: 6, size: 10617, isPreset: true },
  { name: 'RAG系统指南.md', chunks: 6, size: 8862, isPreset: true },
  { name: 'AI短剧设计.pdf', chunks: 8, size: 288315, isPreset: true },
  { name: '脑机接口技术.docx', chunks: 5, size: 15884, isPreset: true }
]

// localStorage key
const UPLOADED_DOCS_KEY = 'rag-bot-uploaded-docs'

export function useDocument() {
  const documents = ref([])
  const uploading = ref(false)
  const uploadProgress = ref(0)
  const loading = ref(false) // 添加加载状态

  /**
   * 从 localStorage 获取上传的文档列表
   */
  function getUploadedDocsFromStorage() {
    try {
      const stored = localStorage.getItem(UPLOADED_DOCS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('读取 localStorage 失败:', error)
      return []
    }
  }

  /**
   * 保存上传的文档列表到 localStorage
   */
  function saveUploadedDocsToStorage(docs) {
    try {
      localStorage.setItem(UPLOADED_DOCS_KEY, JSON.stringify(docs))
    } catch (error) {
      console.error('保存 localStorage 失败:', error)
    }
  }

  /**
   * 加载文档列表
   * 优先从API获取，失败时使用预设文档列表
   * 合并 localStorage 中上传的文档，并清理无效的缓存
   */
  async function loadDocuments() {
    loading.value = true // 开始加载
    try {
      const response = await getDocuments()
      const apiDocs = response.data.documents || []
      
      // 如果API返回了文档且不为空，使用API数据；否则使用预设文档
      let baseDocs = apiDocs.length > 0 ? apiDocs : PRESET_DOCUMENTS
      
      // 获取有效的文档名称列表（预置文档 + API返回的文档）
      const validDocNames = new Set([
        ...PRESET_DOCUMENTS.map(d => d.name),
        ...baseDocs.map(d => d.name)
      ])
      
      // 从 localStorage 获取上传的文档，并过滤掉无效的（不在有效列表中的）
      let uploadedDocs = getUploadedDocsFromStorage()
      const invalidDocs = uploadedDocs.filter(d => !validDocNames.has(d.name))
      
      // 如果有无效文档，清理 localStorage
      if (invalidDocs.length > 0) {
        console.log(`[INFO] 清理 ${invalidDocs.length} 个无效的缓存文档:`, invalidDocs.map(d => d.name))
        uploadedDocs = uploadedDocs.filter(d => validDocNames.has(d.name))
        saveUploadedDocsToStorage(uploadedDocs)
      }
      
      // 合并文档列表（去重）
      const uploadedNames = new Set(uploadedDocs.map(d => d.name))
      const mergedDocs = [
        ...baseDocs.filter(d => !uploadedNames.has(d.name)),
        ...uploadedDocs
      ]
      
      documents.value = mergedDocs
      console.log(`[INFO] 加载文档完成: ${mergedDocs.length} 个文档 (${baseDocs.length} 预置/API + ${uploadedDocs.length} 上传)`)
    } catch (error) {
      console.warn('加载文档失败，使用预设文档:', error.message)
      
      // 即使 API 失败，也要显示上传的文档
      const uploadedDocs = getUploadedDocsFromStorage()
      documents.value = [...PRESET_DOCUMENTS, ...uploadedDocs]
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
      
      // 上传成功后，将文档信息保存到 localStorage
      const uploadedDocs = getUploadedDocsFromStorage()
      const newDoc = {
        name: file.name,
        chunks: response.data.chunkCount || 1,
        size: file.size,
        isUploaded: true,
        uploadedAt: new Date().toISOString()
      }
      
      // 去重：如果已存在同名文档，先删除旧的
      const filtered = uploadedDocs.filter(d => d.name !== file.name)
      const updatedDocs = [...filtered, newDoc]
      
      saveUploadedDocsToStorage(updatedDocs)
      console.log(`[INFO] 文档已保存到 localStorage: ${file.name}`)
      
      // 重新加载文档列表
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
      
      // 从 localStorage 中移除
      const uploadedDocs = getUploadedDocsFromStorage()
      const filtered = uploadedDocs.filter(d => d.name !== name)
      saveUploadedDocsToStorage(filtered)
      console.log(`[INFO] 已从 localStorage 删除: ${name}`)
      
      // 重新加载文档列表
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
