<template>
  <div class="editor-view">
    <div class="editor-nav">
      <div class="nav-left">
        <a-button @click="goBack" type="text">
          <template #icon><ArrowLeftOutlined /></template>
          返回列表
        </a-button>
      </div>
      <div class="nav-right">
        <a-popconfirm
          title="确定要删除这个文档吗？"
          description="删除后将无法恢复"
          @confirm="confirmDelete"
          ok-text="确定"
          cancel-text="取消"
        >
          <a-button type="primary" danger>
            删除文档
            <template #icon><DeleteOutlined /></template>
          </a-button>
        </a-popconfirm>
      </div>
    </div>
    
    <a-spin :spinning="loading" tip="加载文档中...">
      <collaborative-editor 
        v-if="!loading && documentId" 
        :document-id="documentId"
      />
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocumentStore } from '@/stores/document'
import { ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import CollaborativeEditor from '@/components/CollaborativeEditor.vue'
import { message } from 'ant-design-vue'

const route = useRoute()
const router = useRouter()
const documentStore = useDocumentStore()
const { fetchDocument, currentDocument, loading, deleteDocument } = documentStore

const documentId = computed(() => route.params.id as string)

const goBack = () => {
  router.push('/')
}

const confirmDelete = async () => {
  if (!documentId.value) return
  
  try {
    const success = await deleteDocument(documentId.value)
    if (success) {
      message.success('文档删除成功')
      router.push('/')
    } else {
      message.error('文档删除失败')
    }
  } catch (error) {
    console.error('删除文档出错:', error)
    message.error('删除文档时发生错误')
  }
}

onMounted(async () => {
  if (documentId.value) {
    await fetchDocument(documentId.value)
  }
})
</script>

<style lang="less" scoped>
.editor-view {
  @apply max-w-7xl mx-auto px-4 py-6;
}

.editor-nav {
  @apply mb-4 flex justify-between items-center;
}

.nav-left, .nav-right {
  @apply flex items-center gap-2;
}
</style> 