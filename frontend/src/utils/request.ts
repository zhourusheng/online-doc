import axios from 'axios';
import { useUserStore } from '../stores/user';
import { getRouter } from './router-helper';
import { getApiUrl } from './env';

// 创建axios实例
const request = axios.create({
  baseURL: getApiUrl(),
  timeout: 30000,
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const userStore = useUserStore();
    // 如果已登录，添加token到请求头
    if (userStore.isLoggedIn()) {
      config.headers.Authorization = `Bearer ${userStore.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 判断错误是否为401 Unauthorized
    if (error.response && error.response.status === 401) {
      const errorMsg = error.response.data?.message || '';
      
      // 如果错误信息中包含"无效的token"或"请重新登录"，执行登出操作
      if (errorMsg.includes('无效的token') || errorMsg.includes('请重新登录')) {
        console.log('检测到token失效，执行自动登出');
        
        // 登出处理
        const userStore = useUserStore();
        userStore.logout();
        
        // 获取router实例
        const router = getRouter();
        
        // 保存当前路径，用于登录后重定向
        const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
        
        // 跳转到登录页
        router.push(`/login?redirect=${currentPath}`);
      }
    }
    
    return Promise.reject(error);
  }
);

export default request; 