<template>
  <div class="collaboration-manager">
    <h3 class="text-lg font-medium mb-4">文档协作管理</h3>
    
    <!-- 添加协作者部分 -->
    <div class="mb-6 p-4 bg-gray-50 rounded-lg">
      <h4 class="text-md font-medium mb-2">添加协作者</h4>
      <div class="flex gap-2 mb-2">
        <input 
          v-model="collaboratorUsername" 
          class="flex-1 border rounded-md px-3 py-2" 
          placeholder="输入用户名" 
        />
        <select 
          v-model="selectedPermission" 
          class="border rounded-md px-3 py-2"
        >
          <option value="read">只读</option>
          <option value="comment">评论</option>
          <option value="edit">编辑</option>
        </select>
        <button 
          @click="searchUser" 
          class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          搜索用户
        </button>
      </div>
      
      <!-- 搜索到的用户列表 -->
      <div v-if="searchResults.length > 0" class="mt-2 border rounded-md">
        <div v-for="user in searchResults" :key="user._id" class="p-2 border-b flex justify-between items-center">
          <div>{{ user.username }}</div>
          <button 
            @click="addCollaborator(user._id)" 
            class="text-xs bg-green-500 text-white px-2 py-1 rounded-md hover:bg-green-600"
          >
            添加
          </button>
        </div>
      </div>
    </div>
    
    <!-- 现有协作者列表 -->
    <div class="mb-6">
      <h4 class="text-md font-medium mb-2">当前协作者</h4>
      <div v-if="loading" class="text-center py-4">
        <span>加载中...</span>
      </div>
      <div v-else-if="collaborators.length === 0" class="text-center py-4 text-gray-500">
        没有协作者
      </div>
      <div v-else class="border rounded-md">
        <div 
          v-for="collaborator in collaborators" 
          :key="collaborator.user._id" 
          class="p-2 border-b flex justify-between items-center"
        >
          <div>
            <span>{{ collaborator.user.username }}</span>
            <span class="ml-2 text-xs px-2 py-1 bg-gray-100 rounded-full">
              {{ getPermissionText(collaborator.permission) }}
            </span>
          </div>
          <div class="flex gap-2">
            <select 
              v-model="collaborator.permission" 
              @change="updateCollaboratorPermission(collaborator.user._id, collaborator.permission)"
              class="text-xs border rounded-md px-2 py-1"
            >
              <option value="read">只读</option>
              <option value="comment">评论</option>
              <option value="edit">编辑</option>
            </select>
            <button 
              @click="removeCollaborator(collaborator.user._id)"
              class="text-xs bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600"
            >
              移除
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 共享链接部分 -->
    <div class="mb-6 p-4 bg-gray-50 rounded-lg">
      <h4 class="text-md font-medium mb-2">文档共享链接</h4>
      
      <div v-if="hasAccessLink" class="mb-4">
        <div class="flex gap-2 mb-2">
          <input 
            type="text" 
            :value="accessLinkUrl" 
            readonly
            class="flex-1 border rounded-md px-3 py-2 bg-gray-100"
          />
          <button 
            @click="copyLinkToClipboard" 
            class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            复制链接
          </button>
        </div>
        <div class="flex justify-between items-center text-sm">
          <div>
            <span>权限：{{ getPermissionText(accessLink.permission) }}</span>
            <span class="ml-4">
              {{ accessLink.expiresAt ? `过期时间：${formatDate(accessLink.expiresAt)}` : '永不过期' }}
            </span>
          </div>
          <button 
            @click="deleteAccessLink"
            class="text-xs text-red-500 hover:text-red-600"
          >
            删除链接
          </button>
        </div>
      </div>
      
      <div v-else>
        <div class="flex gap-2 mb-2">
          <select 
            v-model="newLinkPermission" 
            class="flex-1 border rounded-md px-3 py-2"
          >
            <option value="read">只读权限</option>
            <option value="comment">评论权限</option>
            <option value="edit">编辑权限</option>
          </select>
          <select 
            v-model="newLinkExpiration" 
            class="flex-1 border rounded-md px-3 py-2"
          >
            <option value="0">永不过期</option>
            <option value="24">1天</option>
            <option value="168">7天</option>
            <option value="720">30天</option>
          </select>
          <button 
            @click="createAccessLink" 
            class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            创建链接
          </button>
        </div>
      </div>
    </div>
    
    <!-- 状态消息 -->
    <div v-if="statusMessage" class="mt-4 p-2 rounded-md" :class="statusMessageType === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'">
      {{ statusMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import { useUserStore } from '@/stores/user';

const props = defineProps<{
  documentId: string;
}>();

// 获取用户store，用于获取认证头
const userStore = useUserStore();

// 状态变量
const loading = ref(true);
const collaborators = ref<any[]>([]);
const collaboratorUsername = ref('');
const selectedPermission = ref('read');
const searchResults = ref<any[]>([]);
const accessLink = ref<any>(null);
const newLinkPermission = ref('read');
const newLinkExpiration = ref('168'); // 默认7天
const statusMessage = ref('');
const statusMessageType = ref('success');

// 计算属性
const hasAccessLink = computed(() => accessLink.value !== null);
const accessLinkUrl = computed(() => {
  if (!accessLink.value) return '';
  
  // 构建完整的前端访问URL
  const baseUrl = window.location.origin;
  return `${baseUrl}/shared/${props.documentId}?accessToken=${accessLink.value.token}`;
});

// 获取认证头
const getAuthHeaders = () => {
  return {
    headers: {
      ...userStore.getAuthHeader()
    }
  };
};

// 生命周期钩子
onMounted(async () => {
  try {
    await loadCollaborators();
    await checkAccessLink();
  } catch (error) {
    console.error('加载协作信息失败', error);
    showStatusMessage('加载协作信息失败', 'error');
  } finally {
    loading.value = false;
  }
});

// 方法
async function loadCollaborators() {
  try {
    const response = await axios.get(`/api/collaboration/${props.documentId}/collaborators`, getAuthHeaders());
    collaborators.value = response.data.collaborators || [];
  } catch (error) {
    console.error('获取协作者失败', error);
    showStatusMessage('获取协作者失败', 'error');
  }
}

async function searchUser() {
  if (!collaboratorUsername.value.trim()) {
    showStatusMessage('请输入用户名', 'error');
    return;
  }
  
  try {
    const response = await axios.get(`/api/auth/search?username=${collaboratorUsername.value}`, getAuthHeaders());
    searchResults.value = response.data.users || [];
    
    if (searchResults.value.length === 0) {
      showStatusMessage('未找到匹配的用户', 'error');
    }
  } catch (error) {
    console.error('搜索用户失败', error);
    showStatusMessage('搜索用户失败', 'error');
  }
}

async function addCollaborator(userId: string) {
  try {
    await axios.post(`/api/collaboration/${props.documentId}/collaborators`, {
      userId,
      permission: selectedPermission.value
    }, getAuthHeaders());
    
    // 重新加载协作者列表
    await loadCollaborators();
    
    // 清空搜索结果
    searchResults.value = [];
    collaboratorUsername.value = '';
    
    showStatusMessage('协作者添加成功', 'success');
  } catch (error) {
    console.error('添加协作者失败', error);
    showStatusMessage('添加协作者失败', 'error');
  }
}

async function removeCollaborator(userId: string) {
  try {
    await axios.delete(`/api/collaboration/${props.documentId}/collaborators/${userId}`, getAuthHeaders());
    
    // 重新加载协作者列表
    await loadCollaborators();
    
    showStatusMessage('协作者已移除', 'success');
  } catch (error) {
    console.error('移除协作者失败', error);
    showStatusMessage('移除协作者失败', 'error');
  }
}

async function updateCollaboratorPermission(userId: string, permission: string) {
  try {
    await axios.post(`/api/collaboration/${props.documentId}/collaborators`, {
      userId,
      permission
    }, getAuthHeaders());
    
    showStatusMessage('权限已更新', 'success');
  } catch (error) {
    console.error('更新权限失败', error);
    showStatusMessage('更新权限失败', 'error');
    
    // 重新加载协作者列表以还原UI状态
    await loadCollaborators();
  }
}

async function checkAccessLink() {
  try {
    const response = await axios.get(`/api/collaboration/${props.documentId}/access-link`, getAuthHeaders());
    accessLink.value = response.data.accessLink || null;
  } catch (error) {
    console.error('获取访问链接信息失败', error);
    accessLink.value = null;
  }
}

async function createAccessLink() {
  try {
    const response = await axios.post(`/api/collaboration/${props.documentId}/access-link`, {
      permission: newLinkPermission.value,
      expiresInHours: newLinkExpiration.value === '0' ? undefined : parseInt(newLinkExpiration.value)
    }, getAuthHeaders());
    
    accessLink.value = response.data.accessLink;
    showStatusMessage('访问链接已创建', 'success');
  } catch (error) {
    console.error('创建访问链接失败', error);
    showStatusMessage('创建访问链接失败', 'error');
  }
}

async function deleteAccessLink() {
  try {
    await axios.delete(`/api/collaboration/${props.documentId}/access-link`, getAuthHeaders());
    
    accessLink.value = null;
    showStatusMessage('访问链接已删除', 'success');
  } catch (error) {
    console.error('删除访问链接失败', error);
    showStatusMessage('删除访问链接失败', 'error');
  }
}

function copyLinkToClipboard() {
  if (!accessLinkUrl.value) return;
  
  navigator.clipboard.writeText(accessLinkUrl.value)
    .then(() => {
      showStatusMessage('链接已复制到剪贴板', 'success');
    })
    .catch((error) => {
      console.error('复制链接失败', error);
      showStatusMessage('复制链接失败', 'error');
    });
}

function getPermissionText(permission: string) {
  switch (permission) {
    case 'read': return '只读';
    case 'comment': return '评论';
    case 'edit': return '编辑';
    default: return permission;
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function showStatusMessage(message: string, type: 'success' | 'error' = 'success') {
  statusMessage.value = message;
  statusMessageType.value = type;
  
  // 3秒后清除消息
  setTimeout(() => {
    statusMessage.value = '';
  }, 3000);
}
</script> 