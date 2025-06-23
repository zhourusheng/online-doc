<template>
  <div class="register-container">
    <div class="register-card">
      <h1 class="title">注册</h1>
      <a-form
        :model="formData"
        @finish="handleRegister"
        layout="vertical"
      >
        <a-form-item
          label="用户名"
          name="username"
          :rules="[
            { required: true, message: '请输入用户名' },
            { min: 3, message: '用户名不能少于3个字符' },
            { max: 20, message: '用户名不能超过20个字符' }
          ]"
        >
          <a-input v-model:value="formData.username" placeholder="请输入用户名" />
        </a-form-item>

        <a-form-item
          label="密码"
          name="password"
          :rules="[
            { required: true, message: '请输入密码' },
            { min: 6, message: '密码不能少于6个字符' }
          ]"
        >
          <a-input-password v-model:value="formData.password" placeholder="请输入密码" />
        </a-form-item>

        <a-form-item
          label="确认密码"
          name="confirmPassword"
          :rules="[
            { required: true, message: '请确认密码' },
            { validator: validateConfirmPassword }
          ]"
        >
          <a-input-password v-model:value="formData.confirmPassword" placeholder="请确认密码" />
        </a-form-item>

        <a-form-item>
          <a-button type="primary" html-type="submit" :loading="userStore.loading" block>
            注册
          </a-button>
        </a-form-item>

        <div class="form-footer">
          <p>
            已有账号？
            <router-link to="/login">立即登录</router-link>
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
  password: '',
  confirmPassword: ''
})

const validateConfirmPassword = (_rule: any, value: string) => {
  if (value !== formData.value.password) {
    return Promise.reject('两次输入的密码不一致')
  }
  return Promise.resolve()
}

const handleRegister = async () => {
  const success = await userStore.register(
    formData.value.username,
    formData.value.password,
    formData.value.confirmPassword
  )
  
  if (success) {
    message.success('注册成功')
    router.push('/')
  }
}
</script>

<style lang="less" scoped>
.register-container {
  @apply min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4;
}

.register-card {
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