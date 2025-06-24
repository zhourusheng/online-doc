<template>
  <div class="editor-view">
    <div class="editor-nav">
      <div class="nav-left">
        <a-button @click="goBack" type="text" class="back-button">
          <template #icon><ArrowLeftOutlined /></template>
          <span class="button-text">返回列表</span>
        </a-button>
      </div>
      <div class="nav-right" v-if="hasAccess">
        <a-button 
          v-if="isOwner"
          @click="showCollaborationDrawer = true" 
          type="primary"
          class="collaborate-button"
        >
          <template #icon><TeamOutlined /></template>
          <span class="button-text">协作管理</span>
        </a-button>
        
        <a-popconfirm
          v-if="isOwner || currentDocument?.permission === 'edit'"
          title="确定要删除这个文档吗？"
          description="删除后将无法恢复"
          @confirm="confirmDelete"
          ok-text="确定"
          cancel-text="取消"
        >
          <DeleteOutlined class="delete-icon" />
        </a-popconfirm>
      </div>
    </div>
    
    <a-spin :spinning="loading" tip="加载文档中...">
      <div v-if="!hasAccess && !loading" class="error-container">
        <a-result
          status="403"
          title="没有访问权限"
          sub-title="您没有权限访问此文档，或者文档不存在"
        >
          <template #extra>
            <a-button type="primary" @click="goBack">
              返回文档列表
            </a-button>
          </template>
        </a-result>
      </div>
      <collaborative-editor 
        v-else-if="!loading && documentId && hasAccess" 
        :document-id="documentId"
        :read-only="!isOwner && currentDocument?.permission !== 'edit'"
      />
    </a-spin>
    
    <a-drawer
      v-if="isOwner"
      v-model:open="showCollaborationDrawer"
      title="文档协作管理"
      placement="right"
      :width="400"
    >
      <collaboration-manager :document-id="documentId" />
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocumentStore } from '@/stores/document'
import { useUserStore } from '@/stores/user'
import { ArrowLeftOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons-vue'
import CollaborativeEditor from '@/components/CollaborativeEditor.vue'
import CollaborationManager from '@/components/CollaborationManager.vue'
import { message } from 'ant-design-vue'

const route = useRoute()
const router = useRouter()
const documentStore = useDocumentStore()
const userStore = useUserStore()

const { fetchDocument, loading } = documentStore
const currentDocument = computed(() => documentStore.currentDocument)
const currentUserId = computed(() => userStore.user?.id || '')

const documentId = computed(() => route.params.id as string)
const hasAccess = ref(false)
const showCollaborationDrawer = ref(false)

// 检查当前用户是否是文档所有者
const isOwner = computed(() => {
  if (!currentDocument.value || !currentUserId.value) return false
  return currentDocument.value.owner === currentUserId.value
})

const goBack = () => {
  router.push('/')
}

const confirmDelete = async () => {
  if (!documentId.value || !hasAccess.value) return
  
  try {
    const success = await documentStore.deleteDocument(documentId.value)
    if (success) {
      message.success('文档删除成功')
      router.push('/')
    } else {
      message.error('文档删除失败')
    }
  } catch (error) {
    message.error('删除文档时发生错误')
  }
}

onMounted(async () => {
  if (documentId.value) {
    // 尝试获取文档，并根据结果设置访问权限
    const success = await fetchDocument(documentId.value)
    hasAccess.value = success
    
    // 如果没有访问权限，显示错误信息
    if (!success) {
      console.log('没有权限访问此文档或文档不存在')
      message.error('没有权限访问此文档或文档不存在')
    } else {
      // 调试信息
      console.log('文档信息:', currentDocument.value)
      console.log('当前用户ID:', currentUserId.value)
      console.log('是否为文档所有者:', isOwner.value)
      console.log('用户权限:', currentDocument.value?.permission)
      console.log('编辑器只读状态:', !isOwner.value && currentDocument.value?.permission !== 'edit')
    }
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

.back-button {
  @apply flex items-center;
}

.button-text {
  @apply inline-flex items-center;
  line-height: 1;
  vertical-align: middle;
}

.collaborate-button {
  @apply flex items-center;
}

.delete-icon {
  @apply text-lg p-2 rounded-full bg-white text-red-500 shadow-sm cursor-pointer;
  &:hover {
    @apply bg-red-50;
  }
}

.error-container {
  @apply py-8;
}
</style> 