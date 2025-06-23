import { defineStore } from 'pinia'
import { ref } from 'vue'

interface Document {
  id: string
  title: string
  content?: string
  createdAt: Date
  updatedAt: Date
}

// 定义从API返回的文档类型
interface ApiDocument {
  _id: string
  title: string
  content?: string
  createdAt: string
  updatedAt: string
}

export const useDocumentStore = defineStore('document', () => {
  const documents = ref<Document[]>([])
  const currentDocument = ref<Document | null>(null)
  const loading = ref(false)

  const fetchDocuments = async () => {
    loading.value = true
    try {
      const response = await fetch('/api/documents')
      const data = await response.json()
      console.log('后端返回的原始数据:', data)
      
      if (!Array.isArray(data)) {
        console.error('后端返回的数据不是数组:', data)
        return
      }
      
      // 先清空数组，确保响应式系统能检测到变化
      documents.value.length = 0
      
      // 转换数据并添加到数组
      const transformedDocs = data
        .filter((doc: any): doc is ApiDocument => doc && doc._id)
        .map((doc: ApiDocument) => {
          const transformed: Document = {
            id: doc._id,
            title: doc.title || '无标题',
            content: doc.content,
            createdAt: new Date(doc.createdAt || Date.now()),
            updatedAt: new Date(doc.updatedAt || Date.now())
          }
          console.log('转换后的文档:', transformed)
          return transformed
        })
      
      // 使用push方法添加文档，而不是替换整个数组
      transformedDocs.forEach(doc => {
        documents.value.push(doc)
      })
      
      console.log('最终的文档列表:', documents.value)
      console.log('文档数量:', documents.value.length)
    } catch (error) {
      console.error('获取文档列表失败:', error)
    } finally {
      loading.value = false
    }
  }

  const fetchDocument = async (id: string) => {
    loading.value = true
    try {
      const response = await fetch(`/api/documents/${id}`)
      const doc = await response.json() as ApiDocument
      
      if (!doc || !doc._id) {
        console.error('获取文档失败: 无效的文档数据', doc)
        return
      }
      
      currentDocument.value = {
        id: doc._id,
        title: doc.title || '无标题',
        content: doc.content,
        createdAt: new Date(doc.createdAt || Date.now()),
        updatedAt: new Date(doc.updatedAt || Date.now())
      }
      
      console.log('获取到的文档:', currentDocument.value)
    } catch (error) {
      console.error('获取文档失败:', error)
    } finally {
      loading.value = false
    }
  }

  const createDocument = async (title: string) => {
    loading.value = true
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title })
      })
      const doc = await response.json() as ApiDocument
      
      if (!doc || !doc._id) {
        console.error('创建文档失败: 无效的文档数据', doc)
        return null
      }
      
      const newDoc: Document = {
        id: doc._id,
        title: doc.title || '无标题',
        content: doc.content,
        createdAt: new Date(doc.createdAt || Date.now()),
        updatedAt: new Date(doc.updatedAt || Date.now())
      }
      
      documents.value.push(newDoc)
      console.log('创建的新文档:', newDoc)
      return newDoc
    } catch (error) {
      console.error('创建文档失败:', error)
      return null
    } finally {
      loading.value = false
    }
  }

  const deleteDocument = async (id: string) => {
    loading.value = true
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('删除文档失败')
      }
      
      // 从本地列表中删除文档
      const index = documents.value.findIndex(doc => doc.id === id)
      if (index !== -1) {
        documents.value.splice(index, 1)
      }
      
      return true
    } catch (error) {
      console.error('删除文档失败:', error)
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    documents,
    currentDocument,
    loading,
    fetchDocuments,
    fetchDocument,
    createDocument,
    deleteDocument
  }
}) 