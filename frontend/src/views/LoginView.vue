<template>
  <div class="login-container">
    <div class="login-card">
      <h1 class="title">登录</h1>
      <a-form
        :model="formData"
        @finish="handleLogin"
        layout="vertical"
      >
        <a-form-item
          label="用户名"
          name="username"
          :rules="[{ required: true, message: '请输入用户名' }]"
        >
          <a-input v-model:value="formData.username" placeholder="请输入用户名" />
        </a-form-item>

        <a-form-item
          label="密码"
          name="password"
          :rules="[{ required: true, message: '请输入密码' }]"
        >
          <a-input-password v-model:value="formData.password" placeholder="请输入密码" />
        </a-form-item>

        <a-form-item>
          <a-button type="primary" html-type="submit" :loading="userStore.loading" block>
            登录
          </a-button>
        </a-form-item>

        <div class="form-footer">
          <p>
            还没有账号？
            <router-link to="/register">立即注册</router-link>
          </p>
        </div>
      </a-form>

      <a-alert
        v-if="userStore.error"
        :message="userStore.error"
        type="error"
        show-icon
        class="error-alert"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { message } from 'ant-design-vue'

const router = useRouter()
const userStore = useUserStore()

const formData = ref({
  username: '',
  password: ''
})

const handleLogin = async () => {
  const success = await userStore.login(formData.value.username, formData.value.password)
  if (success) {
    message.success('登录成功')
    router.push('/')
  }
}
</script>

<style lang="less" scoped>
.login-container {
  @apply min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4;
}

.login-card {
  @apply bg-white rounded-lg shadow-md p-8 max-w-md w-full;
}

.title {
  @apply text-2xl font-bold text-center mb-6 text-gray-800;
}

.form-footer {
  @apply text-center mt-4 text-gray-600;
  
  a {
    @apply text-blue-600 hover:text-blue-800;
  }
}

.error-alert {
  @apply mt-4;
}
</style>
