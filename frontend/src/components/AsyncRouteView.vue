<template>
  <div class="async-route-container">
    <!-- 加载状态 -->
    <div v-if="loading" class="async-route-loading">
      <div class="async-route-spinner"></div>
      <p v-if="loadingText" class="async-route-loading-text">{{ loadingText }}</p>
    </div>
    
    <!-- 错误状态 -->
    <div v-else-if="error" class="async-route-error">
      <div class="async-route-error-icon">!</div>
      <p class="async-route-error-message">{{ errorText || '加载页面失败' }}</p>
      <button v-if="canRetry" class="async-route-retry-btn" @click="retryLoad">
        重试
      </button>
    </div>
    
    <!-- 成功加载的组件 -->
    <component v-else :is="resolvedComponent" v-bind="$attrs"></component>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, PropType } from 'vue';
import { processInChunks } from '../utils/js-optimizer';

export default defineComponent({
  name: 'AsyncRouteView',
  inheritAttrs: false,
  props: {
    component: {
      type: [Function, Object] as PropType<() => Promise<any> | any>,
      required: true
    },
    loadingText: {
      type: String,
      default: '加载中...'
    },
    errorText: {
      type: String,
      default: ''
    },
    timeout: {
      type: Number,
      default: 10000
    },
    retryCount: {
      type: Number,
      default: 1
    }
  },
  setup(props, { emit }) {
    const loading = ref(true);
    const error = ref(false);
    const retries = ref(0);
    const canRetry = ref(false);
    const resolvedComponent = ref<any>(null);
    let timeoutId: number | null = null;

    // 加载组件
    const loadComponent = async () => {
      if (!loading.value) loading.value = true;
      error.value = false;
      
      // 设置超时
      if (props.timeout > 0) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
          if (loading.value) {
            loading.value = false;
            error.value = true;
            canRetry.value = retries.value < props.retryCount;
            emit('error', new Error('Component load timeout'));
          }
        }, props.timeout);
      }
      
      try {
        // 判断是否是异步组件
        if (typeof props.component === 'function') {
          const componentModule = await props.component();
          // 处理ES模块默认导出
          resolvedComponent.value = componentModule.default || componentModule;
        } else {
          resolvedComponent.value = props.component;
        }
        
        loading.value = false;
        emit('loaded', resolvedComponent.value);
        
        // 预加载组件可能需要的资源
        setTimeout(() => {
          prefetchComponentResources();
        }, 100);
      } catch (err) {
        loading.value = false;
        error.value = true;
        canRetry.value = retries.value < props.retryCount;
        emit('error', err);
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      }
    };

    // 重试加载
    const retryLoad = () => {
      if (retries.value < props.retryCount) {
        retries.value++;
        loadComponent();
      }
    };
    
    // 预加载组件可能需要的资源
    const prefetchComponentResources = () => {
      // 查找组件中的图片和其他资源链接
      if (!resolvedComponent.value) return;
      
      // 延迟执行，避免阻塞主线程
      requestIdleCallback(() => {
        try {
          const template = resolvedComponent.value.template || '';
          const imgRegex = /src=["'](https?:\/\/[^"']+\.(?:png|jpe?g|gif|webp))["']/g;
          const matches = [...template.matchAll(imgRegex)];
          
          if (matches.length > 0) {
            const imgUrls = matches.map(match => match[1]);
            
            // 使用processInChunks预加载图片
            processInChunks(imgUrls, (url) => {
              const img = new Image();
              img.src = url;
              return img;
            }, 3, 100);
          }
        } catch (err) {
          console.warn('Failed to prefetch component resources:', err);
        }
      }, { timeout: 2000 });
    };

    onMounted(() => {
      loadComponent();
    });

    return {
      loading,
      error,
      canRetry,
      resolvedComponent,
      retryLoad
    };
  }
});
</script>

<style scoped>
.async-route-container {
  min-height: 200px;
  position: relative;
}

.async-route-loading,
.async-route-error {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.async-route-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.async-route-loading-text {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.async-route-error-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: #fff;
  border: 2px solid #ff4d4f;
  color: #ff4d4f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 16px;
}

.async-route-error-message {
  font-size: 16px;
  color: #333;
  text-align: center;
  margin: 0 0 16px;
}

.async-route-retry-btn {
  padding: 6px 16px;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.async-route-retry-btn:hover {
  background-color: #40a9ff;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 