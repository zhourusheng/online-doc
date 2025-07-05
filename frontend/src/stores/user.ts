import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '../utils/request'

interface User {
  id: string
  username: string
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 初始化用户状态
  const initUserState = () => {
    // 从localStorage获取用户信息和token
    const storedUser = localStorage.getItem('user')
    const storedToken = localStorage.getItem('token')
    
    if (storedUser && storedToken) {
      user.value = JSON.parse(storedUser)
      token.value = storedToken
    }
  }

  // 注册新用户
  const register = async (username: string, password: string, confirmPassword: string) => {
    // 验证密码确认
    if (password !== confirmPassword) {
      error.value = '两次输入的密码不一致'
      return false
    }
    
    loading.value = true
    error.value = null
    
    try {
      const response = await request.post('/api/auth/register', {
        username, password
      })
      
      const data = response.data
      
      // 保存用户信息和token
      user.value = data.user
      token.value = data.token
      
      // 存储到localStorage
      localStorage.setItem('user', JSON.stringify(data.user))
      localStorage.setItem('token', data.token)
      
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || '注册过程中发生错误'
      return false
    } finally {
      loading.value = false
    }
  }

  // 用户登录
  const login = async (username: string, password: string) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await request.post('/api/auth/login', {
        username, password
      })
      
      const data = response.data
      
      // 保存用户信息和token
      user.value = data.user
      token.value = data.token
      
      // 存储到localStorage
      localStorage.setItem('user', JSON.stringify(data.user))
      localStorage.setItem('token', data.token)
      
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || '登录过程中发生错误'
      return false
    } finally {
      loading.value = false
    }
  }

  // 用户登出
  const logout = () => {
    user.value = null
    token.value = null
    
    // 清除localStorage
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  }

  // 获取认证头
  const getAuthHeader = (): Record<string, string> => {
    if (token.value) {
      return { Authorization: `Bearer ${token.value}` }
    }
    return {}
  }

  // 检查是否已登录
  const isLoggedIn = () => {
    return !!user.value && !!token.value
  }

  return {
    user,
    token,
    loading,
    error,
    initUserState,
    register,
    login,
    logout,
    getAuthHeader,
    isLoggedIn
  }
}) 