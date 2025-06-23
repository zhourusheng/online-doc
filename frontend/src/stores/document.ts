import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useUserStore } from './user'

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
  const userStore = useUserStore()

  const fetchDocuments = async () => {
    loading.value = true
    try {
      const response = await fetch('/api/documents', {
        headers: {
          ...userStore.getAuthHeader()
        }
      })
      const data = await response.json()
      
      if (!Array.isArray(data)) {
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
          return transformed
        })
      
      // 使用push方法添加文档，而不是替换整个数组
      transformedDocs.forEach(doc => {
        documents.value.push(doc)
      })
    } catch (error) {
      // 错误处理
    } finally {
      loading.value = false
    }
  }

  const fetchDocument = async (id: string) => {
    loading.value = true
    try {
      const response = await fetch(`/api/documents/${id}`, {
        headers: {
          ...userStore.getAuthHeader()
        }
      })
      const doc = await response.json() as ApiDocument
      
      if (!doc || !doc._id) {
        return
      }
      
      currentDocument.value = {
        id: doc._id,
        title: doc.title || '无标题',
        content: doc.content,
        createdAt: new Date(doc.createdAt || Date.now()),
        updatedAt: new Date(doc.updatedAt || Date.now())
      }
    } catch (error) {
      // 错误处理
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
          'Content-Type': 'application/json',
          ...userStore.getAuthHeader()
        },
        body: JSON.stringify({ title })
      })
      const doc = await response.json() as ApiDocument
      
      if (!doc || !doc._id) {
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
      return newDoc
    } catch (error) {
      return null
    } finally {
      loading.value = false
    }
  }

  const deleteDocument = async (id: string) => {
    loading.value = true
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: {
          ...userStore.getAuthHeader()
        }
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