/**
 * API请求优化工具
 * 提供请求合并、缓存、重试和预加载功能
 */

import axios, { AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { memCache, localCache } from './cache-manager';

// 扩展AxiosResponse接口，添加cached属性
interface CachedAxiosResponse<T = any> extends AxiosResponse<T> {
  cached?: boolean;
}

// 请求配置接口
export interface ApiRequestConfig extends AxiosRequestConfig {
  // 缓存相关
  useCache?: boolean;
  cacheTTL?: number;
  cacheKey?: string;
  
  // 重试相关
  retry?: boolean;
  retryCount?: number;
  retryDelay?: number;
  
  // 批处理相关
  batchKey?: string;
  batchInterval?: number;
  
  // 预加载
  preload?: boolean;
}

// 批处理请求接口
interface BatchRequest {
  config: ApiRequestConfig;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

// 批处理请求集合
const batchRequests: Record<string, BatchRequest[]> = {};
const batchTimers: Record<string, number> = {};

// 创建优化后的axios实例
export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 请求拦截器
 * 处理缓存、批处理等逻辑
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const apiConfig = config as unknown as ApiRequestConfig;
    
    // 处理缓存逻辑
    if (apiConfig.useCache && apiConfig.method?.toLowerCase() === 'get') {
      const cacheKey = apiConfig.cacheKey || `${apiConfig.method}_${apiConfig.url}_${JSON.stringify(apiConfig.params || {})}`;
      
      // 尝试从缓存获取
      const cachedData = memCache.get(cacheKey);
      if (cachedData) {
        // 创建一个已解析的promise，跳过实际的网络请求
        return {
          ...apiConfig,
          adapter: () => {
            return Promise.resolve({
              data: cachedData,
              status: 200,
              statusText: 'OK',
              headers: {},
              config: apiConfig,
              cached: true
            });
          }
        } as InternalAxiosRequestConfig;
      }
    }
    
    // 处理批处理请求
    if (apiConfig.batchKey && apiConfig.method?.toLowerCase() === 'get') {
      return new Promise<InternalAxiosRequestConfig>((resolve, reject) => {
        if (!apiConfig.batchKey) return resolve(config);
        
        const batchKey = apiConfig.batchKey;
        
        // 添加到批处理队列
        if (!batchRequests[batchKey]) {
          batchRequests[batchKey] = [];
        }
        
        batchRequests[batchKey].push({
          config: apiConfig,
          resolve,
          reject
        });
        
        // 设置批处理定时器
        if (!batchTimers[batchKey]) {
          batchTimers[batchKey] = window.setTimeout(() => {
            processBatch(batchKey);
          }, apiConfig.batchInterval || 50);
        }
      });
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器
 * 处理缓存、错误重试等逻辑
 */
apiClient.interceptors.response.use(
  (response: CachedAxiosResponse) => {
    const config = response.config as ApiRequestConfig;
    
    // 如果是缓存数据，直接返回
    if (response.cached) {
      return response;
    }
    
    // 将成功响应存入缓存
    if (config.useCache && config.method?.toLowerCase() === 'get') {
      const cacheKey = config.cacheKey || `${config.method}_${config.url}_${JSON.stringify(config.params || {})}`;
      memCache.set(cacheKey, response.data, { ttl: config.cacheTTL || 5 * 60 * 1000 });
    }
    
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as ApiRequestConfig;
    
    // 处理重试逻辑
    if (config?.retry && (!config.retryCount || config.retryCount > 0)) {
      // 设置重试次数
      config.retryCount = config.retryCount !== undefined ? config.retryCount - 1 : 2;
      // 设置延迟
      const delay = config.retryDelay || 1000;
      
      // 延迟后重试
      await new Promise(resolve => setTimeout(resolve, delay));
      return apiClient(config);
    }
    
    return Promise.reject(error);
  }
);

/**
 * 处理批处理请求
 * @param batchKey 批处理键
 */
function processBatch(batchKey: string): void {
  const requests = batchRequests[batchKey] || [];
  delete batchRequests[batchKey];
  delete batchTimers[batchKey];
  
  if (requests.length === 0) return;
  
  // 如果只有一个请求，直接处理
  if (requests.length === 1) {
    const { config, resolve, reject } = requests[0];
    axios(config)
      .then(response => resolve(response))
      .catch(error => reject(error));
    return;
  }
  
  // 合并多个请求参数
  const params = requests.map(req => req.config.params || {});
  const firstConfig = requests[0].config;
  
  // 创建合并后的请求
  const batchConfig: ApiRequestConfig = {
    ...firstConfig,
    params: { batch: true, requests: params }
  };
  
  // 发送合并请求
  axios(batchConfig)
    .then(response => {
      // 假设服务器返回的是一个数组，对应每个请求的结果
      if (Array.isArray(response.data) && response.data.length === requests.length) {
        requests.forEach((req, index) => {
          req.resolve({
            ...response,
            data: response.data[index]
          });
        });
      } else {
        // 如果服务器没有按预期返回，则每个请求都获得完整响应
        requests.forEach(req => {
          req.resolve(response);
        });
      }
    })
    .catch(error => {
      // 所有请求都失败
      requests.forEach(req => {
        req.reject(error);
      });
    });
}

/**
 * 预加载API请求
 * @param config 请求配置
 */
export function preloadApiRequest(config: ApiRequestConfig): void {
  if (!config.url) return;
  
  // 确保使用缓存
  const preloadConfig: ApiRequestConfig = {
    ...config,
    useCache: true,
    preload: true
  };
  
  // 使用低优先级发送请求
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      apiClient(preloadConfig).catch(() => {
        // 忽略预加载错误
      });
    }, { timeout: 2000 });
  } else {
    setTimeout(() => {
      apiClient(preloadConfig).catch(() => {
        // 忽略预加载错误
      });
    }, 100);
  }
}

/**
 * 取消请求
 * @param tokenSource 取消令牌源
 */
export function cancelRequest(tokenSource: any): void {
  if (tokenSource) {
    tokenSource.cancel('请求被用户取消');
  }
}

/**
 * 创建取消令牌
 */
export function createCancelToken() {
  return axios.CancelToken.source();
}

/**
 * 清除API缓存
 * @param pattern 缓存键模式（可选）
 */
export function clearApiCache(pattern?: string): void {
  if (pattern) {
    // 清除匹配模式的缓存
    // 由于CacheManager没有keys方法，我们直接清除所有缓存
    memCache.clear();
  } else {
    // 清除所有API缓存
    memCache.clear();
  }
} 