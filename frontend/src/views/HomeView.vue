<template>
  <div class="home-container">
    <div class="header">
      <h1 class="title">协同文档编辑系统</h1>
      <a-button type="primary" @click="showCreateModal">
        新建文档
        <template #icon><PlusOutlined /></template>
      </a-button>
    </div>

    <a-spin :spinning="loading">
      <div v-if="documentStore.documents.length > 0" class="document-list">
        <a-card
          v-for="doc in documentStore.documents"
          :key="doc.id"
          class="document-card"
        >
          <template #cover>
            <div class="document-cover">
              <FileTextOutlined class="document-icon" />
            </div>
          </template>
          <a-card-meta :title="doc.title">
            <template #description>
              <p>创建时间: {{ formatDate(doc.createdAt) }}</p>
              <p>更新时间: {{ formatDate(doc.updatedAt) }}</p>
            </template>
          </a-card-meta>
          <div class="document-actions">
            <a-button type="primary" @click.stop="openDocument(doc.id)">
              打开
              <template #icon><EditOutlined /></template>
            </a-button>
            <a-popconfirm
              title="确定要删除这个文档吗？"
              description="删除后将无法恢复"
              @confirm="confirmDelete(doc.id)"
              ok-text="确定"
              cancel-text="取消"
            >
              <a-button type="primary" danger @click.stop>
                删除
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </a-popconfirm>
          </div>
        </a-card>
      </div>

      <a-empty v-else description="暂无文档，点击右上角创建新文档">
        <template #image>
          <FileTextOutlined style="font-size: 48px; color: #ccc;" />
        </template>
      </a-empty>
    </a-spin>

    <a-modal
      v-model:open="createModalVisible"
      title="新建文档"
      @ok="createDocument"
      :confirmLoading="creating"
    >
      <a-form :model="formData">
        <a-form-item label="文档标题" name="title">
          <a-input v-model:value="formData.title" placeholder="请输入文档标题" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDocumentStore } from '@/stores/document'
import { PlusOutlined, FileTextOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

const router = useRouter()
const documentStore = useDocumentStore()
const { loading, fetchDocuments, createDocument: storeCreateDocument, deleteDocument } = documentStore

const createModalVisible = ref(false)
const creating = ref(false)
const formData = ref({
  title: ''
})

const formatDate = (date: Date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN', { 
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const showCreateModal = () => {
  formData.value.title = ''
  createModalVisible.value = true
}

const createDocument = async () => {
  if (!formData.value.title) {
    message.warning('请输入文档标题')
    return
  }

  creating.value = true
  try {
    const newDoc = await storeCreateDocument(formData.value.title)
    if (newDoc) {
      createModalVisible.value = false
      message.success('文档创建成功')
      router.push(`/editor/${newDoc.id}`)
    }
  } finally {
    creating.value = false
  }
}

const openDocument = (id: string) => {
  if (!id) {
    console.error('文档ID为空')
    message.error('文档ID无效，无法打开')
    return
  }
  
  router.push(`/editor/${id}`)
}

const confirmDelete = async (id: string) => {
  try {
    const success = await deleteDocument(id)
    if (success) {
      message.success('文档删除成功')
    } else {
      message.error('文档删除失败')
    }
  } catch (error) {
    console.error('删除文档出错:', error)
    message.error('删除文档时发生错误')
  }
}

onMounted(() => {
  fetchDocuments()
})
</script>

<style lang="less" scoped>
.home-container {
  @apply max-w-5xl mx-auto p-6;
}

.header {
  @apply flex justify-between items-center mb-6;
}

.title {
  @apply text-2xl font-bold text-gray-800 m-0;
}

.document-list {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4;
}

.document-card {
  @apply transition-all duration-300;
  &:hover {
    @apply transform -translate-y-1;
  }
}

.document-cover {
  @apply h-32 bg-gray-100 flex items-center justify-center flex-col;
}

.document-icon {
  @apply text-4xl text-gray-500;
}

.document-actions {
  @apply flex justify-between mt-4 gap-2;
}

.document-id {
  @apply text-xs text-gray-500 mt-2;
}
</style> 