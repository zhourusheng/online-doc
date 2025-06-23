<template>
  <div class="editor-container">
    <div class="editor-header">
      <a-input
        v-model:value="title"
        class="title-input"
        placeholder="文档标题"
        @change="updateTitle"
      />
      <div class="editor-users">
        <a-tooltip v-for="(user, index) in connectedUsers" :key="index" :title="user.name + (user.isSelf ? ' (你)' : '')">
          <a-avatar
            :style="{ backgroundColor: user.color }"
            size="small"
            class="user-avatar"
            :class="{ 'self-user': user.isSelf }"
          >
            {{ user.name[0] }}
          </a-avatar>
        </a-tooltip>
        <a-badge :count="connectedUsers.length" size="small">
          <a-button type="text" size="small">
            <template #icon><UserOutlined /></template>
          </a-button>
        </a-badge>
      </div>
    </div>

    <div v-if="connectionError" class="connection-error">
      <a-alert
        message="连接错误"
        :description="connectionError"
        type="error"
        show-icon
      />
    </div>

    <div ref="editorEl" class="editor-content"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, onUnmounted, defineProps, watch } from 'vue'
import { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { UserOutlined } from '@ant-design/icons-vue'
import { useDocumentStore } from '@/stores/document'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'

const props = defineProps<{
  documentId: string
}>()

const router = useRouter()
const editorEl = ref<HTMLElement | null>(null)
const title = ref('')
const editor = ref<Editor | null>(null)
const connectedUsers = ref<{ name: string; color: string; isSelf: boolean }[]>([])
const documentStore = useDocumentStore()
const userStore = useUserStore()
const connectionError = ref<string | null>(null)

// 随机生成颜色
const getRandomColor = () => {
  const colors = [
    '#5D8C7B', '#F2D091', '#F2A679', '#D95D39', '#49111C',
    '#0C6291', '#A3BAC3', '#007500', '#6C91C2', '#6C2D2C'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

// 使用登录用户的用户名，如果未登录则使用随机用户名
const username = userStore.user ? userStore.user.username : `游客${Math.floor(Math.random() * 1000)}`
const userColor = getRandomColor()

let ydoc: Y.Doc
let provider: WebsocketProvider

const updateTitle = async () => {
  // 保存标题到服务器
  if (props.documentId && title.value) {
    try {
      const success = await documentStore.updateDocumentTitle(props.documentId, title.value)
      if (!success) {
        // 如果更新失败，恢复原来的标题
        if (documentStore.currentDocument) {
          title.value = documentStore.currentDocument.title
        }
      }
    } catch (error) {
      console.error('更新标题失败:', error)
    }
  }
}

const setupWebSocketConnection = () => {
  if (!userStore.token) {
    connectionError.value = '您需要登录才能访问此文档'
    return false
  }

  try {
    // 创建 Y.js 文档
    ydoc = new Y.Doc()
    
    // 连接到 WebSocket 服务器
    provider = new WebsocketProvider(
      'ws://localhost:3001', 
      `document-${props.documentId}`, 
      ydoc,
      {
        // 将用户认证信息添加到WebSocket连接
        params: {
          token: userStore.token
        }
      }
    )

    // 监听连接状态
    provider.on('status', (event: { status: string }) => {
      if (event.status === 'disconnected') {
        connectionError.value = '与服务器的连接已断开'
      } else if (event.status === 'connected') {
        connectionError.value = null
      }
    })

    // 监听连接错误
    provider.on('connection-error', (event: any) => {
      console.error('WebSocket连接错误:', event)
      
      // 如果是权限错误，则显示相应的消息
      if (event && event.code === 1000 && (event.reason === '未经授权' || event.reason === '无效的token')) {
        connectionError.value = '您没有权限访问此文档'
        message.error('您没有权限访问此文档')
        
        // 3秒后返回文档列表
        setTimeout(() => {
          router.push('/')
        }, 3000)
        
        return false
      }
      
      connectionError.value = '连接服务器失败，请稍后再试'
    })

    // 监听连接状态变化
    provider.awareness.setLocalStateField('user', {
      name: username,
      color: userColor,
      isSelf: true
    })

    // 监听在线用户变化
    provider.awareness.on('change', () => {
      // 使用Map来存储用户，确保每个用户名只出现一次
      const userMap = new Map<string, { name: string; color: string; isSelf: boolean }>();
      
      provider.awareness.getStates().forEach((state: any) => {
        if (state.user && state.user.name) {
          // 检查是否是当前用户
          const isSelf = state.user.name === username;
          
          // 使用用户名作为键，如果有重复的用户名，后面的会覆盖前面的
          userMap.set(state.user.name, {
            name: state.user.name,
            color: state.user.color,
            isSelf
          });
        }
      });
      
      // 将Map转换回数组，并确保当前用户排在最前面
      const users = Array.from(userMap.values());
      users.sort((a, b) => {
        // 当前用户排在最前面
        if (a.isSelf) return -1;
        if (b.isSelf) return 1;
        // 其他用户按名称字母顺序排序
        return a.name.localeCompare(b.name);
      });
      
      connectedUsers.value = users;
      
      // 调试信息
      console.log('当前在线用户:', connectedUsers.value.map(u => u.name + (u.isSelf ? ' (你)' : '')).join(', '));
    })

    return true
  } catch (error) {
    console.error('设置WebSocket连接时出错:', error)
    connectionError.value = '连接服务器失败，请稍后再试'
    return false
  }
}

onMounted(() => {
  if (!editorEl.value) return

  // 从文档存储中获取当前文档标题
  if (documentStore.currentDocument) {
    title.value = documentStore.currentDocument.title
  }

  // 设置WebSocket连接
  if (!setupWebSocketConnection()) {
    return // 如果连接失败，不初始化编辑器
  }

  // 初始化编辑器
  editor.value = new Editor({
    element: editorEl.value,
    extensions: [
      Document,
      Paragraph,
      Text,
      StarterKit.configure({
        document: false,
        paragraph: false,
        text: false,
        history: false
      }),
      Collaboration.configure({
        document: ydoc,
        field: 'content'
      }),
      CollaborationCursor.configure({
        provider,
        user: {
          name: username,
          color: userColor,
          isSelf: true
        }
      })
    ],
    autofocus: true,
  })
})

onUnmounted(() => {
  // 清理资源
  editor.value?.destroy()
  provider?.destroy()
})

// 监听当前文档变化
watch(() => documentStore.currentDocument, (newDoc) => {
  if (newDoc) {
    title.value = newDoc.title
  }
}, { immediate: true })

watch(() => props.documentId, () => {
  // 文档ID变化时重新连接
  if (provider) {
    provider.disconnect()
    
    // 重新设置WebSocket连接
    if (!setupWebSocketConnection()) {
      return // 如果连接失败，不继续处理
    }
    
    // 重新设置用户信息
    provider.awareness.setLocalStateField('user', {
      name: username,
      color: userColor,
      isSelf: true
    })
  }
})
</script>

<style lang="less" scoped>
.editor-container {
  @apply bg-white rounded-lg shadow-md p-4 w-full max-w-4xl mx-auto;
}

.editor-header {
  @apply flex justify-between items-center mb-4 pb-2 border-b;
}

.title-input {
  @apply text-xl font-bold border-none outline-none hover:bg-gray-50 rounded p-1;
  width: 300px;
}

.editor-users {
  @apply flex items-center gap-1;
}

.user-avatar {
  @apply mr-1;
  
  &.self-user {
    @apply border-2 border-blue-500;
  }
}

.editor-content {
  min-height: 500px;
}

.connection-error {
  @apply mb-4;
}
</style> 