/**
 * JavaScript优化工具
 * 提供脚本延迟加载和执行优化功能
 */

/**
 * 动态加载JavaScript文件
 * @param src 脚本URL
 * @param options 加载选项
 * @returns Promise，解析为加载状态
 */
export function loadScript(
  src: string,
  options: {
    async?: boolean;
    defer?: boolean;
    type?: string;
    onload?: () => void;
    onerror?: (error: Error) => void;
  } = {}
): Promise<HTMLScriptElement> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    
    if (options.async !== undefined) script.async = options.async;
    if (options.defer !== undefined) script.defer = options.defer;
    if (options.type) script.type = options.type;
    
    script.onload = () => {
      if (options.onload) options.onload();
      resolve(script);
    };
    
    script.onerror = () => {
      const error = new Error(`Failed to load script: ${src}`);
      if (options.onerror) options.onerror(error);
      reject(error);
    };
    
    document.head.appendChild(script);
  });
}

/**
 * 预加载JavaScript文件
 * @param src 脚本URL
 * @returns Promise，解析为加载状态
 */
export function preloadScript(src: string): Promise<HTMLLinkElement> {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = src;
    
    link.onload = () => resolve(link);
    link.onerror = () => reject(new Error(`Failed to preload script: ${src}`));
    
    document.head.appendChild(link);
  });
}

/**
 * 延迟加载非关键JavaScript
 * @param srcs 脚本URL数组
 * @returns Promise，解析为所有脚本加载完成
 */
export function loadDeferredScripts(srcs: string[]): Promise<HTMLScriptElement[]> {
  return new Promise((resolve) => {
    const loadedScripts: HTMLScriptElement[] = [];
    
    const loadNext = (index: number) => {
      if (index >= srcs.length) {
        resolve(loadedScripts);
        return;
      }
      
      loadScript(srcs[index], { defer: true })
        .then((script) => {
          loadedScripts.push(script);
          loadNext(index + 1);
        })
        .catch(() => {
          // 即使加载失败也继续下一个
          loadNext(index + 1);
        });
    };
    
    // 使用Intersection Observer检测页面滚动到底部时加载
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadNext(0);
        observer.disconnect();
      }
    });
    
    // 监视页面底部
    const footer = document.querySelector('footer') || document.body;
    observer.observe(footer);
    
    // 如果用户没有滚动，在页面加载完成后的空闲时间加载
    window.addEventListener('load', () => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          loadNext(0);
          observer.disconnect();
        }, { timeout: 5000 });
      } else {
        // 降级处理
        setTimeout(() => {
          loadNext(0);
          observer.disconnect();
        }, 2000);
      }
    });
  });
}

/**
 * 使用Web Worker执行耗时操作
 * @param fn 要在Worker中执行的函数
 * @param data 传递给函数的数据
 * @returns Promise，解析为函数执行结果
 */
export function runInWorker<T, R>(fn: (data: T) => R, data: T): Promise<R> {
  // 创建函数字符串
  const fnString = fn.toString();
  const workerScript = `
    self.onmessage = function(e) {
      const fn = ${fnString};
      const result = fn(e.data);
      self.postMessage(result);
    }
  `;
  
  // 创建Blob URL
  const blob = new Blob([workerScript], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  
  return new Promise((resolve, reject) => {
    const worker = new Worker(url);
    
    worker.onmessage = (e) => {
      resolve(e.data);
      worker.terminate();
      URL.revokeObjectURL(url);
    };
    
    worker.onerror = (e) => {
      reject(new Error(`Worker error: ${e.message}`));
      worker.terminate();
      URL.revokeObjectURL(url);
    };
    
    worker.postMessage(data);
  });
}

/**
 * 将长任务分割成小块，避免阻塞主线程
 * @param items 要处理的项目数组
 * @param processFn 处理每个项目的函数
 * @param chunkSize 每个块的大小
 * @param delay 块之间的延迟(毫秒)
 * @returns Promise，解析为所有项目处理完成
 */
export function processInChunks<T, R>(
  items: T[],
  processFn: (item: T) => R,
  chunkSize: number = 5,
  delay: number = 0
): Promise<R[]> {
  return new Promise((resolve) => {
    const results: R[] = [];
    let index = 0;
    
    function processNextChunk() {
      const chunk = items.slice(index, index + chunkSize);
      index += chunkSize;
      
      // 处理当前块
      chunk.forEach((item) => {
        results.push(processFn(item));
      });
      
      // 检查是否完成
      if (index >= items.length) {
        resolve(results);
        return;
      }
      
      // 安排下一个块
      if (delay > 0) {
        setTimeout(processNextChunk, delay);
      } else {
        // 使用requestAnimationFrame避免阻塞渲染
        requestAnimationFrame(processNextChunk);
      }
    }
    
    processNextChunk();
  });
} 