<template>
  <div class="editor-container">
    <div class="editor-header">
      <a-input
        v-model:value="title"
        class="title-input"
        placeholder="文档标题"
        @change="updateTitle"
        :disabled="readOnly || !canEditTitle"
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

    <div ref="editorEl" class="editor-content" :class="{ 'read-only': readOnly }"></div>
    
    <div v-if="readOnly" class="read-only-indicator">
      <a-tag color="blue">只读模式</a-tag>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, onUnmounted, defineProps, watch, nextTick } from 'vue'
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
  documentId: string;
  readOnly?: boolean;
  accessToken?: string;
}>()

const router = useRouter()
const editorEl = ref<HTMLElement | null>(null)
const title = ref('')
const editor = ref<Editor | null>(null)
const connectedUsers = ref<{ name: string; color: string; isSelf: boolean }[]>([])
const documentStore = useDocumentStore()
const userStore = useUserStore()
const connectionError = ref<string | null>(null)
// 生成唯一的客户端ID，用于区分同一用户的不同会话
const clientId = ref(`${Date.now()}-${Math.floor(Math.random() * 1000)}`)

// 检查是否有权限编辑标题（仅在通过正常登录且不是只读模式时）
const canEditTitle = ref(!!userStore.token && !props.readOnly)

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
  // 保存标题到服务器，仅当用户有权限时
  if (props.documentId && title.value && canEditTitle.value) {
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
  // 检查是否有访问令牌或用户令牌
  if (!userStore.token && !props.accessToken) {
    connectionError.value = '无法建立连接，缺少认证信息'
    return false
  }

  try {
    // 创建 Y.js 文档
    ydoc = new Y.Doc()
    
    // WebSocket连接参数，使用访问令牌或用户令牌
    const params: Record<string, string> = {
      clientId: clientId.value // 添加客户端ID
    }
    
    // 优先使用访问令牌，如果没有则使用用户令牌
    if (props.accessToken) {
      params.accessToken = props.accessToken
    } else if (userStore.token) {
      params.token = userStore.token
    }
    
    // 连接到 WebSocket 服务器
    provider = new WebsocketProvider(
      import.meta.env.VITE_WS_URL || 'ws://localhost:3001', 
      `document-${props.documentId}`, 
      ydoc,
      { params }
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
        
        // 3秒后返回文档列表或登录页
        setTimeout(() => {
          if (userStore.isLoggedIn()) {
            router.push('/')
          } else {
            router.push('/login')
          }
        }, 3000)
        
        return false
      }
      
      connectionError.value = '连接服务器失败，请稍后再试'
    })

    // 清除所有现有的awareness状态
    provider.awareness.setLocalState(null)

    // 设置当前用户的状态
    provider.awareness.setLocalStateField('user', {
      name: username,
      color: userColor,
      isSelf: true,
      clientId: clientId.value // 添加客户端ID以区分同一用户的不同会话
    })

    // 监听在线用户变化
    provider.awareness.on('change', () => {
      // 使用Map来存储用户，确保每个用户名只出现一次
      const userMap = new Map<string, { name: string; color: string; isSelf: boolean }>();
      
      provider.awareness.getStates().forEach((state: any) => {
        if (state.user && state.user.name) {
          // 检查是否是当前用户
          const isSelf = state.user.clientId === clientId.value;
          
          // 使用clientId作为键，确保同一用户的不同会话被视为不同用户
          const mapKey = state.user.clientId || state.user.name;
          
          // 如果是自己的光标，但不是当前会话，则跳过
          if (state.user.name === username && !isSelf) {
            return;
          }
          
          userMap.set(mapKey, {
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

// 检测浏览器类型
const isFirefox = () => {
  return navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
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
          isSelf: true,
          clientId: clientId.value
        }
      })
    ],
    autofocus: true,
    editable: !props.readOnly,
  })
  
  // 在Firefox中，需要特别处理光标
  if (isFirefox()) {
    // 延迟一下，确保编辑器已经初始化
    nextTick(() => {
      // 清除可能存在的旧光标
      const oldCursors = document.querySelectorAll(`.collaboration-cursor__caret[data-user-name="${username}"]`);
      oldCursors.forEach(cursor => {
        if (cursor.parentNode) {
          cursor.parentNode.removeChild(cursor);
        }
      });
    });
  }

  // 监听只读属性变化
  watch(() => props.readOnly, (isReadOnly) => {
    if (editor.value) {
      editor.value.setEditable(!isReadOnly)
    }
  })
})

onUnmounted(() => {
  // 清理资源
  if (provider) {
    // 清除当前用户的状态
    provider.awareness.setLocalState(null);
    provider.destroy();
  }
  editor.value?.destroy();
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
    // 清除当前用户的状态
    provider.awareness.setLocalState(null);
    provider.disconnect();
    
    // 重新设置WebSocket连接
    if (!setupWebSocketConnection()) {
      return // 如果连接失败，不继续处理
    }
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

.read-only-indicator {
  @apply mt-4 text-center;
}
</style> 