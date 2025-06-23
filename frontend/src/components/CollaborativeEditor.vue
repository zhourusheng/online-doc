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
        <a-avatar
          v-for="(user, index) in connectedUsers"
          :key="index"
          :style="{ backgroundColor: user.color }"
          size="small"
          class="user-avatar"
        >
          {{ user.name[0] }}
        </a-avatar>
        <a-badge :count="connectedUsers.length" size="small">
          <a-button type="text" size="small">
            <template #icon><UserOutlined /></template>
          </a-button>
        </a-badge>
      </div>
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

const props = defineProps<{
  documentId: string
}>()

const editorEl = ref<HTMLElement | null>(null)
const title = ref('')
const editor = ref<Editor | null>(null)
const connectedUsers = ref<{ name: string; color: string }[]>([])
const documentStore = useDocumentStore()
const userStore = useUserStore()

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
      // 调用API更新标题
      const response = await fetch(`/api/documents/${props.documentId}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ title: title.value }) 
      });
      
      if (!response.ok) {
        throw new Error('更新标题失败');
      }
      
      // 更新本地存储的文档标题
      if (documentStore.currentDocument) {
        documentStore.currentDocument.title = title.value;
      }
    } catch (error) {
      // 错误处理
    }
  }
}

onMounted(() => {
  if (!editorEl.value) return

  // 从文档存储中获取当前文档标题
  if (documentStore.currentDocument) {
    title.value = documentStore.currentDocument.title
  }

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
        token: userStore.token || ''
      }
    }
  )

  // 监听连接状态变化
  provider.awareness.setLocalStateField('user', {
    name: username,
    color: userColor
  })

  // 监听在线用户变化
  provider.awareness.on('change', () => {
    const users: { name: string; color: string }[] = []
    provider.awareness.getStates().forEach((state: any) => {
      if (state.user) {
        users.push({
          name: state.user.name,
          color: state.user.color
        })
      }
    })
    connectedUsers.value = users
  })

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
          color: userColor
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
    provider = new WebsocketProvider(
      'ws://localhost:3001', 
      `document-${props.documentId}`, 
      ydoc,
      {
        // 将用户认证信息添加到WebSocket连接
        params: {
          token: userStore.token || ''
        }
      }
    )
    
    // 重新设置用户信息
    provider.awareness.setLocalStateField('user', {
      name: username,
      color: userColor
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
}

.editor-content {
  min-height: 500px;
}
</style> 