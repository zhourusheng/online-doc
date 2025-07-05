/**
 * 环境配置工具
 * 用于区分开发环境和生产环境
 */

// 扩展ImportMeta接口，添加env属性
interface ImportMetaEnv {
  DEV: boolean;
  VITE_WS_URL?: string;
  VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// 判断是否为开发环境
export const isDev = (): boolean => {
  return import.meta.env.DEV === true;
};

// 获取WebSocket服务器地址
export const getWsUrl = (): string => {
  // 如果在环境变量中配置了WS_URL，则优先使用
  const configuredUrl = import.meta.env.VITE_WS_URL;
  if (configuredUrl) {
    return configuredUrl;
  }
  
  // 根据环境返回不同的WebSocket地址
  if (isDev()) {
    return 'ws://localhost:3001'; // 开发环境连接本地服务器
  } else {
    // 生产环境自动使用当前域名的WebSocket服务
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }
};

// 获取API服务器地址
export const getApiUrl = (): string => {
  // 如果在环境变量中配置了API_URL，则优先使用
  const configuredUrl = import.meta.env.VITE_API_URL;
  if (configuredUrl) {
    return configuredUrl;
  }
  
  // 根据环境返回不同的API地址
  if (isDev()) {
    return 'http://localhost:3001'; // 开发环境连接本地服务器
  } else {
    // 生产环境使用相对路径
    return '';
  }
}; 