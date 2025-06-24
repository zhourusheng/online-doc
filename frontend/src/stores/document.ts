import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useUserStore } from './user'
import { message } from 'ant-design-vue'

interface Document {
  id: string
  title: string
  content?: string
  owner: string
  ownerName?: string
  permission?: 'read' | 'comment' | 'edit'
  createdAt: Date
  updatedAt: Date
}

// 定义从API返回的文档类型
interface ApiDocument {
  _id: string
  title: string
  content?: string
  owner?: string | { _id: string, username?: string }  // MongoDB模式下的owner
  ownerId?: string                  // 内存模式下的ownerId
  ownerName?: string               // 所有者名称
  permission?: 'read' | 'comment' | 'edit'  // 协作者权限
  createdAt: string
  updatedAt: string
}

export const useDocumentStore = defineStore('document', () => {
  const documents = ref<Document[]>([])
  const currentDocument = ref<Document | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const userStore = useUserStore()

  const fetchDocuments = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch('/api/documents', {
        headers: {
          ...userStore.getAuthHeader()
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '获取文档列表失败');
      }
      
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
          // 处理owner字段，可能是字符串ID、对象或ownerId
          let ownerId = '';
          if (doc.owner) {
            ownerId = typeof doc.owner === 'string' ? doc.owner : doc.owner._id;
          } else if (doc.ownerId) {
            ownerId = doc.ownerId;
          }
          
          const transformed: Document = {
            id: doc._id,
            title: doc.title || '无标题',
            content: doc.content,
            owner: ownerId,
            ownerName: doc.ownerName || (typeof doc.owner !== 'string' && doc.owner?.username) || '',
            permission: doc.permission,
            createdAt: new Date(doc.createdAt || Date.now()),
            updatedAt: new Date(doc.updatedAt || Date.now())
          }
          return transformed
        })
      
      // 使用push方法添加文档，而不是替换整个数组
      transformedDocs.forEach(doc => {
        documents.value.push(doc)
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取文档列表失败';
      error.value = errorMessage;
      message.error(errorMessage);
    } finally {
      loading.value = false
    }
  }

  const fetchDocument = async (id: string): Promise<boolean> => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`/api/documents/${id}`, {
        headers: {
          ...userStore.getAuthHeader()
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '获取文档失败');
      }
      
      const doc = await response.json() as ApiDocument
      
      if (!doc || !doc._id) {
        throw new Error('文档数据不完整');
      }
      
      // 处理owner字段，可能是字符串ID、对象或ownerId
      let ownerId = '';
      if (doc.owner) {
        ownerId = typeof doc.owner === 'string' ? doc.owner : doc.owner._id;
      } else if (doc.ownerId) {
        ownerId = doc.ownerId;
      }
      
      currentDocument.value = {
        id: doc._id,
        title: doc.title || '无标题',
        content: doc.content,
        owner: ownerId,
        ownerName: doc.ownerName || (typeof doc.owner !== 'string' && doc.owner?.username) || '',
        permission: doc.permission,
        createdAt: new Date(doc.createdAt || Date.now()),
        updatedAt: new Date(doc.updatedAt || Date.now())
      }
      
      return true; // 成功获取文档
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取文档失败';
      error.value = errorMessage;
      message.error(errorMessage);
      currentDocument.value = null;
      return false; // 获取文档失败
    } finally {
      loading.value = false
    }
  }

  const createDocument = async (title: string) => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...userStore.getAuthHeader()
        },
        body: JSON.stringify({ title })
      })
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '创建文档失败');
      }
      
      const doc = await response.json() as ApiDocument
      
      if (!doc || !doc._id) {
        throw new Error('创建文档失败，返回数据不完整');
      }
      
      const newDoc: Document = {
        id: doc._id,
        title: doc.title || '无标题',
        content: doc.content,
        owner: doc.owner || userStore.user?.id || '',
        ownerName: doc.ownerName || (typeof doc.owner !== 'string' && doc.owner?.username) || '',
        permission: doc.permission,
        createdAt: new Date(doc.createdAt || Date.now()),
        updatedAt: new Date(doc.updatedAt || Date.now())
      }
      
      documents.value.push(newDoc)
      return newDoc
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '创建文档失败';
      error.value = errorMessage;
      message.error(errorMessage);
      return null
    } finally {
      loading.value = false
    }
  }

  const deleteDocument = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: {
          ...userStore.getAuthHeader()
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '删除文档失败');
      }
      
      // 从本地列表中删除文档
      const index = documents.value.findIndex(doc => doc.id === id)
      if (index !== -1) {
        documents.value.splice(index, 1)
      }
      
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除文档失败';
      error.value = errorMessage;
      message.error(errorMessage);
      return false
    } finally {
      loading.value = false
    }
  }

  // 更新文档标题
  const updateDocumentTitle = async (id: string, title: string) => {
    error.value = null
    try {
      const response = await fetch(`/api/documents/${id}`, { 
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json',
          ...userStore.getAuthHeader()
        }, 
        body: JSON.stringify({ title }) 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '更新标题失败');
      }
      
      // 更新本地存储的文档标题
      if (currentDocument.value && currentDocument.value.id === id) {
        currentDocument.value.title = title;
      }
      
      // 更新文档列表中的标题
      const docIndex = documents.value.findIndex(doc => doc.id === id);
      if (docIndex !== -1) {
        documents.value[docIndex].title = title;
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新标题失败';
      error.value = errorMessage;
      message.error(errorMessage);
      return false;
    }
  }

  return {
    documents,
    currentDocument,
    loading,
    error,
    fetchDocuments,
    fetchDocument,
    createDocument,
    deleteDocument,
    updateDocumentTitle
  }
}) 