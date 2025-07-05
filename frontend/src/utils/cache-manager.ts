/**
 * 缓存管理工具
 * 提供内存缓存和本地存储缓存功能
 */

// 缓存项类型定义
interface CacheItem<T> {
  value: T;
  expiry: number | null; // null表示永不过期
  timestamp: number;
}

// 缓存配置选项
interface CacheOptions {
  ttl?: number | null; // 生存时间（毫秒），默认为null（永不过期）
  storage?: 'memory' | 'local' | 'session'; // 缓存存储位置
  compress?: boolean; // 是否压缩数据（仅适用于local和session）
  version?: string; // 缓存版本，用于缓存失效
}

// 默认配置
const defaultOptions: CacheOptions = {
  ttl: null,
  storage: 'memory',
  compress: false,
  version: '1.0'
};

// 内存缓存存储
const memoryCache = new Map<string, CacheItem<any>>();

/**
 * 缓存管理类
 */
export class CacheManager {
  private options: CacheOptions;
  private prefix: string;
  
  constructor(prefix: string = 'app_cache', options: CacheOptions = {}) {
    this.prefix = prefix;
    this.options = { ...defaultOptions, ...options };
    
    // 清理过期缓存
    this.cleanExpiredCache();
  }
  
  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param options 缓存选项
   */
  set<T>(key: string, value: T, options: CacheOptions = {}): void {
    const mergedOptions = { ...this.options, ...options };
    const cacheKey = this.getCacheKey(key);
    
    const cacheItem: CacheItem<T> = {
      value,
      expiry: mergedOptions.ttl ? Date.now() + mergedOptions.ttl : null,
      timestamp: Date.now()
    };
    
    if (mergedOptions.storage === 'memory') {
      memoryCache.set(cacheKey, cacheItem);
    } else {
      const storage = mergedOptions.storage === 'local' ? localStorage : sessionStorage;
      let valueToStore: string;
      
      try {
        // 添加版本信息到缓存项
        const storageItem = {
          ...cacheItem,
          version: mergedOptions.version
        };
        
        valueToStore = JSON.stringify(storageItem);
        
        // 如果启用压缩，可以在这里添加压缩逻辑
        if (mergedOptions.compress) {
          // 简单的压缩方法，实际项目中可以使用专业的压缩库
          valueToStore = btoa(valueToStore);
        }
        
        storage.setItem(cacheKey, valueToStore);
      } catch (error) {
        console.warn('Failed to store in cache:', error);
        // 如果存储失败（例如配额超出），回退到内存缓存
        memoryCache.set(cacheKey, cacheItem);
      }
    }
  }
  
  /**
   * 获取缓存
   * @param key 缓存键
   * @param defaultValue 默认值
   * @param options 缓存选项
   */
  get<T>(key: string, defaultValue: T | null = null, options: CacheOptions = {}): T | null {
    const mergedOptions = { ...this.options, ...options };
    const cacheKey = this.getCacheKey(key);
    
    // 首先尝试从内存缓存获取
    if (memoryCache.has(cacheKey)) {
      const item = memoryCache.get(cacheKey);
      if (item && this.isValid(item)) {
        return item.value;
      } else {
        memoryCache.delete(cacheKey);
      }
    }
    
    // 如果配置为使用存储，则尝试从存储中获取
    if (mergedOptions.storage !== 'memory') {
      const storage = mergedOptions.storage === 'local' ? localStorage : sessionStorage;
      const valueFromStorage = storage.getItem(cacheKey);
      
      if (valueFromStorage) {
        try {
          let parsedValue = valueFromStorage;
          
          // 如果启用了压缩，先解压
          if (mergedOptions.compress) {
            parsedValue = atob(parsedValue);
          }
          
          const item = JSON.parse(parsedValue);
          
          // 检查版本是否匹配
          if (item.version !== mergedOptions.version) {
            storage.removeItem(cacheKey);
            return defaultValue;
          }
          
          if (this.isValid(item)) {
            // 将从存储中获取的项目也放入内存缓存，提高后续访问速度
            memoryCache.set(cacheKey, {
              value: item.value,
              expiry: item.expiry,
              timestamp: item.timestamp
            });
            return item.value;
          } else {
            storage.removeItem(cacheKey);
          }
        } catch (error) {
          console.warn('Failed to parse cache item:', error);
          storage.removeItem(cacheKey);
        }
      }
    }
    
    return defaultValue;
  }
  
  /**
   * 删除缓存
   * @param key 缓存键
   * @param options 缓存选项
   */
  remove(key: string, options: CacheOptions = {}): void {
    const mergedOptions = { ...this.options, ...options };
    const cacheKey = this.getCacheKey(key);
    
    // 从内存缓存中删除
    memoryCache.delete(cacheKey);
    
    // 从存储中删除
    if (mergedOptions.storage !== 'memory') {
      const storage = mergedOptions.storage === 'local' ? localStorage : sessionStorage;
      storage.removeItem(cacheKey);
    }
  }
  
  /**
   * 清除所有缓存
   * @param options 缓存选项
   */
  clear(options: CacheOptions = {}): void {
    const mergedOptions = { ...this.options, ...options };
    
    // 清除内存缓存
    for (const key of memoryCache.keys()) {
      if (key.startsWith(this.prefix)) {
        memoryCache.delete(key);
      }
    }
    
    // 清除存储缓存
    if (mergedOptions.storage !== 'memory') {
      const storage = mergedOptions.storage === 'local' ? localStorage : sessionStorage;
      
      for (let i = storage.length - 1; i >= 0; i--) {
        const key = storage.key(i);
        if (key && key.startsWith(this.prefix)) {
          storage.removeItem(key);
        }
      }
    }
  }
  
  /**
   * 检查缓存项是否有效（未过期）
   * @param item 缓存项
   */
  private isValid<T>(item: CacheItem<T>): boolean {
    if (!item) return false;
    
    // 如果没有过期时间，则永不过期
    if (item.expiry === null) return true;
    
    // 检查是否已过期
    return Date.now() < item.expiry;
  }
  
  /**
   * 获取带前缀的缓存键
   * @param key 原始键
   */
  private getCacheKey(key: string): string {
    return `${this.prefix}_${key}`;
  }
  
  /**
   * 清理过期缓存
   */
  private cleanExpiredCache(): void {
    // 清理内存缓存
    for (const [key, item] of memoryCache.entries()) {
      if (key.startsWith(this.prefix) && !this.isValid(item)) {
        memoryCache.delete(key);
      }
    }
    
    // 定期清理
    setTimeout(() => this.cleanExpiredCache(), 60000); // 每分钟清理一次
  }
}

// 创建默认缓存实例
export const memCache = new CacheManager('mem_cache', { storage: 'memory', ttl: 5 * 60 * 1000 }); // 5分钟
export const localCache = new CacheManager('local_cache', { storage: 'local', ttl: 24 * 60 * 60 * 1000 }); // 1天
export const sessionCache = new CacheManager('session_cache', { storage: 'session' }); // 会话期间 