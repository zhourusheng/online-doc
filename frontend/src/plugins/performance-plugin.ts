/**
 * Vue性能优化插件
 * 提供组件渲染性能监控和优化功能
 */

import { App, ComponentPublicInstance, nextTick } from 'vue';
import { reportWebVitals } from '../utils/performance';

// 性能监控配置
interface PerformanceOptions {
  // 是否启用组件渲染性能监控
  enableComponentTracking?: boolean;
  // 渲染时间阈值（毫秒），超过此值将记录警告
  renderTimeThreshold?: number;
  // 是否启用Web Vitals监控
  enableWebVitals?: boolean;
  // 是否在开发环境中显示性能日志
  logInDevelopment?: boolean;
  // 是否将性能数据发送到分析服务
  sendToAnalytics?: boolean;
  // 分析服务URL
  analyticsEndpoint?: string;
}

// 默认配置
const defaultOptions: PerformanceOptions = {
  enableComponentTracking: true,
  renderTimeThreshold: 16, // 一帧的时间（约60fps）
  enableWebVitals: true,
  logInDevelopment: true,
  sendToAnalytics: false,
  analyticsEndpoint: '/api/analytics/performance'
};

// 组件渲染性能数据
interface ComponentRenderMetric {
  componentName: string;
  renderTime: number;
  timestamp: number;
}

// 存储组件渲染性能数据
const componentMetrics: ComponentRenderMetric[] = [];

// 批量发送性能数据的定时器ID
let batchSendTimerId: number | null = null;

/**
 * 发送性能数据到分析服务
 */
function sendPerformanceData(options: PerformanceOptions): void {
  if (!options.sendToAnalytics || !options.analyticsEndpoint || componentMetrics.length === 0) {
    return;
  }
  
  // 复制数据并清空缓存
  const metricsToSend = [...componentMetrics];
  componentMetrics.length = 0;
  
  // 使用Beacon API在页面卸载时也能发送数据
  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      options.analyticsEndpoint,
      JSON.stringify({ metrics: metricsToSend, type: 'component-render' })
    );
  } else {
    // 降级为fetch请求
    fetch(options.analyticsEndpoint, {
      method: 'POST',
      body: JSON.stringify({ metrics: metricsToSend, type: 'component-render' }),
      headers: {
        'Content-Type': 'application/json'
      },
      // 使用keepalive确保请求在页面卸载时仍能完成
      keepalive: true
    }).catch(() => {
      // 忽略错误
    });
  }
}

/**
 * 批量发送性能数据
 */
function scheduleBatchSend(options: PerformanceOptions): void {
  if (batchSendTimerId) {
    clearTimeout(batchSendTimerId);
  }
  
  batchSendTimerId = window.setTimeout(() => {
    sendPerformanceData(options);
    batchSendTimerId = null;
  }, 5000); // 每5秒批量发送一次
}

/**
 * 记录组件渲染性能
 */
function trackComponentRender(instance: ComponentPublicInstance, renderTime: number, options: PerformanceOptions): void {
  const componentName = instance.$.type.name || '匿名组件';
  
  // 记录性能数据
  const metric: ComponentRenderMetric = {
    componentName,
    renderTime,
    timestamp: Date.now()
  };
  
  componentMetrics.push(metric);
  
  // 如果渲染时间超过阈值，记录警告
  if (options.logInDevelopment && process.env.NODE_ENV === 'development' && renderTime > (options.renderTimeThreshold || 16)) {
    console.warn(`[性能警告] 组件 ${componentName} 渲染耗时 ${renderTime.toFixed(2)}ms，超过阈值 ${options.renderTimeThreshold}ms`);
  }
  
  // 安排批量发送
  if (options.sendToAnalytics) {
    scheduleBatchSend(options);
  }
}

/**
 * 包装组件的mounted和updated钩子，添加性能监控
 */
function wrapComponentHooks(app: App, options: PerformanceOptions): void {
  if (!options.enableComponentTracking) return;
  
  const originalMount = app.mount;
  
  app.mount = function (...args): ComponentPublicInstance {
    const instance = originalMount.call(this, ...args);
    
    // 在下一个tick中获取所有组件实例
    nextTick(() => {
      // 递归处理所有组件
      function processComponent(instance: ComponentPublicInstance): void {
        // 包装组件的beforeUpdate和updated钩子
        const originalBeforeUpdate = instance.$.vnode.type.beforeUpdate;
        const originalUpdated = instance.$.vnode.type.updated;
        let startTime = 0;
        
        instance.$.vnode.type.beforeUpdate = function(this: any, ...args: any[]) {
          startTime = performance.now();
          if (originalBeforeUpdate) {
            originalBeforeUpdate.apply(this, args);
          }
        };
        
        instance.$.vnode.type.updated = function(this: any, ...args: any[]) {
          const endTime = performance.now();
          const renderTime = endTime - startTime;
          
          trackComponentRender(instance, renderTime, options);
          
          if (originalUpdated) {
            originalUpdated.apply(this, args);
          }
        };
        
        // 处理子组件
        if (instance.$$ && instance.$$.subTree) {
          const childComponents = instance.$$.subTree.component;
          if (childComponents) {
            if (Array.isArray(childComponents)) {
              childComponents.forEach(child => {
                if (child) processComponent(child);
              });
            } else {
              processComponent(childComponents);
            }
          }
        }
      }
      
      // 处理根组件
      processComponent(instance);
    });
    
    return instance;
  };
}

/**
 * 监听路由变化，记录页面加载性能
 */
function trackPageLoads(app: App, options: PerformanceOptions): void {
  // 在路由变化时记录性能
  if (app.config.globalProperties.$router) {
    const router = app.config.globalProperties.$router;
    
    router.beforeEach((to, from, next) => {
      // 记录导航开始时间
      (window as any).__navigationStart = performance.now();
      next();
    });
    
    router.afterEach((to) => {
      // 使用requestAnimationFrame确保在页面渲染后测量
      requestAnimationFrame(() => {
        const navigationTime = performance.now() - ((window as any).__navigationStart || 0);
        
        if (options.logInDevelopment && process.env.NODE_ENV === 'development') {
          console.log(`[性能] 页面 ${to.path} 加载耗时: ${navigationTime.toFixed(2)}ms`);
        }
        
        if (options.sendToAnalytics && options.analyticsEndpoint) {
          fetch(options.analyticsEndpoint, {
            method: 'POST',
            body: JSON.stringify({
              type: 'page-load',
              path: to.path,
              loadTime: navigationTime,
              timestamp: Date.now()
            }),
            headers: {
              'Content-Type': 'application/json'
            }
          }).catch(() => {
            // 忽略错误
          });
        }
      });
    });
  }
}

/**
 * 性能优化插件
 */
export const PerformancePlugin = {
  install(app: App, options: PerformanceOptions = {}): void {
    const mergedOptions = { ...defaultOptions, ...options };
    
    // 监控组件渲染性能
    wrapComponentHooks(app, mergedOptions);
    
    // 监控页面加载性能
    trackPageLoads(app, mergedOptions);
    
    // 初始化Web Vitals监控
    if (mergedOptions.enableWebVitals) {
      reportWebVitals();
    }
    
    // 在页面卸载前发送剩余性能数据
    window.addEventListener('beforeunload', () => {
      sendPerformanceData(mergedOptions);
    });
    
    // 提供全局API
    app.config.globalProperties.$performance = {
      // 手动记录性能指标
      mark: (name: string) => {
        performance.mark(name);
      },
      // 测量两个标记之间的性能
      measure: (name: string, startMark: string, endMark: string) => {
        try {
          performance.measure(name, startMark, endMark);
          const measures = performance.getEntriesByName(name, 'measure');
          const lastMeasure = measures[measures.length - 1];
          
          if (mergedOptions.logInDevelopment && process.env.NODE_ENV === 'development') {
            console.log(`[性能] ${name}: ${lastMeasure.duration.toFixed(2)}ms`);
          }
          
          return lastMeasure.duration;
        } catch (e) {
          console.error(`[性能] 测量失败: ${e}`);
          return 0;
        }
      }
    };
  }
}; 