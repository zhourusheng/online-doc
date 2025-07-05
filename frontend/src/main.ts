import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { setRouter } from './utils/router-helper'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import './assets/styles/main.less'
import { PerformancePlugin } from './plugins/performance-plugin'
import { memCache, localCache, sessionCache } from './utils/cache-manager'
import { apiClient } from './utils/api-optimizer'

// 检查浏览器支持的功能
const checkBrowserFeatures = () => {
  const features = {
    intersectionObserver: 'IntersectionObserver' in window,
    webWorker: 'Worker' in window,
    requestIdleCallback: 'requestIdleCallback' in window,
    performanceAPI: 'performance' in window,
    webVitals: 'PerformanceObserver' in window
  };
  
  console.debug('[性能] 浏览器功能支持检测:', features);
  return features;
};

// 预加载关键资源
const preloadCriticalResources = () => {
  const criticalImages = [
    // 添加关键图片路径
  ];
  
  const criticalScripts = [
    // 添加关键脚本路径
  ];
  
  // 预加载关键图片
  criticalImages.forEach(src => {
    if (!src) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  });
  
  // 预加载关键脚本
  criticalScripts.forEach(src => {
    if (!src) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = src;
    document.head.appendChild(link);
  });
};

// 初始化应用
const initApp = () => {
  // 保存路由实例以供全局访问
  setRouter(router);
  
  const app = createApp(App);
  
  // 注册插件
  app.use(createPinia());
  app.use(router);
  app.use(Antd);
  
  // 注册性能监控插件
  app.use(PerformancePlugin, {
    enableComponentTracking: true,
    renderTimeThreshold: 16,
    enableWebVitals: true,
    logInDevelopment: true,
    sendToAnalytics: process.env.NODE_ENV === 'production'
  });
  
  // 全局错误处理
  app.config.errorHandler = (err, instance, info) => {
    console.error('[应用错误]', err);
    // 可以将错误发送到分析服务
  };
  
  // 全局属性
  app.config.globalProperties.$cache = {
    memory: memCache,
    local: localCache,
    session: sessionCache
  };
  
  app.config.globalProperties.$http = apiClient;
  
  // 挂载应用
  app.mount('#app');
  
  // 记录应用启动时间
  const appStartupTime = performance.now();
  console.debug(`[性能] 应用启动耗时: ${appStartupTime.toFixed(2)}ms`);
  
  return app;
};

// 检查浏览器功能
checkBrowserFeatures();

// 预加载关键资源
preloadCriticalResources();

// 初始化应用
const app = initApp();

// 在空闲时间预加载非关键资源
if ('requestIdleCallback' in window) {
  (window as any).requestIdleCallback(() => {
    // 预加载非关键组件或资源
  }, { timeout: 2000 });
} 