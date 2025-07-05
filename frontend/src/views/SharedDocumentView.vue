<template>
  <div class="shared-document-view">
    <div class="document-header">
      <h1 class="document-title">{{ document?.title || '共享文档' }}</h1>
      <div class="permission-badge" v-if="document">
        <span :class="['badge', permissionClass]">{{ permissionText }}</span>
      </div>
    </div>
    
    <a-spin :spinning="loading" tip="加载文档中...">
      <div v-if="error" class="error-container">
        <a-result
          status="error"
          :title="errorTitle"
          :sub-title="errorMessage"
        >
          <template #extra>
            <a-button type="primary" @click="goToLogin">
              去登录
            </a-button>
          </template>
        </a-result>
      </div>
      <div v-else-if="document">
        <!-- 只读模式显示文档内容 -->
        <div v-if="document.permission === 'read'" class="document-content-readonly">
          <div v-html="formattedContent"></div>
        </div>
        <!-- 评论和编辑模式使用协作编辑器 -->
        <collaborative-editor 
          v-else
          :document-id="documentId"
          :access-token="accessToken"
          :read-only="document.permission === 'comment'"
        />
        
        <!-- 如果用户未登录，显示登录提示 -->
        <div v-if="!userLoggedIn" class="login-prompt">
          <a-alert
            message="您正在以访客身份查看此文档"
            description="登录后可获得更多权限，如创建自己的文档、添加评论等"
            type="info"
            show-icon
          >
            <template #action>
              <a-button size="small" type="primary" @click="goToLogin">
                登录
              </a-button>
            </template>
          </a-alert>
        </div>
      </div>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import request from '../utils/request'
import CollaborativeEditor from '@/components/CollaborativeEditor.vue'
import { Spin, Result, Button, Alert } from 'ant-design-vue'
import { marked } from 'marked'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const documentId = computed(() => route.params.id as string)
const accessToken = computed(() => route.query.accessToken as string)
const userLoggedIn = computed(() => userStore.isLoggedIn)

const loading = ref(false)
const error = ref(false)
const errorTitle = ref('文档访问失败')
const errorMessage = ref('此链接无效或已过期')
const document = ref<any>(null)

// 根据权限返回对应的类和文本
const permissionClass = computed(() => {
  switch (document.value?.permission) {
    case 'read': return 'read'
    case 'comment': return 'comment'
    case 'edit': return 'edit'
    default: return ''
  }
})

const permissionText = computed(() => {
  switch (document.value?.permission) {
    case 'read': return '只读权限'
    case 'comment': return '评论权限'
    case 'edit': return '编辑权限'
    default: return '无权限'
  }
})

// 格式化文档内容为HTML (用于只读模式)
const formattedContent = computed(() => {
  if (!document.value?.content) return ''
  try {
    return marked(document.value.content)
  } catch (e) {
    return document.value.content
  }
})

// 跳转到登录页
const goToLogin = () => {
  const currentPath = encodeURIComponent(window.location.pathname + window.location.search)
  router.push(`/login?redirect=${currentPath}`)
}

// 加载共享文档
const loadSharedDocument = async () => {
  if (!documentId.value || !accessToken.value) {
    error.value = true
    errorTitle.value = '链接无效'
    errorMessage.value = '此共享链接不包含必要的访问信息'
    return
  }
  
  loading.value = true
  error.value = false
  
  try {
    const response = await request.get(`/api/collaboration/${documentId.value}/shared`, {
      params: { accessToken: accessToken.value }
    })
    
    document.value = response.data.document
  } catch (err: any) {
    error.value = true
    
    if (err.response) {
      if (err.response.status === 403) {
        errorTitle.value = '访问被拒绝'
        errorMessage.value = err.response.data.message || '此链接可能已过期或无效'
      } else if (err.response.status === 404) {
        errorTitle.value = '文档不存在'
        errorMessage.value = '此文档可能已被删除'
      } else {
        errorTitle.value = '访问失败'
        errorMessage.value = err.response.data.message || '无法访问此文档，请稍后再试'
      }
    } else {
      errorTitle.value = '访问失败'
      errorMessage.value = '发生未知错误，请稍后再试'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadSharedDocument()
})
</script>

<style lang="less" scoped>
.shared-document-view {
  @apply max-w-4xl mx-auto px-4 py-8;
}

.document-header {
  @apply flex justify-between items-center mb-8 pb-4 border-b;
}

.document-title {
  @apply text-2xl font-bold;
}

.permission-badge {
  .badge {
    @apply px-3 py-1 rounded-full text-sm;
    
    &.read {
      @apply bg-blue-100 text-blue-800;
    }
    
    &.comment {
      @apply bg-green-100 text-green-800;
    }
    
    &.edit {
      @apply bg-purple-100 text-purple-800;
    }
  }
}

.document-content-readonly {
  @apply prose max-w-none;
}

.login-prompt {
  @apply mt-8;
}

.error-container {
  @apply py-8;
}
</style> 