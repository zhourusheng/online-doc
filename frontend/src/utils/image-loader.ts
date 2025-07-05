/**
 * 图片加载优化工具
 * 提供懒加载和渐进式加载功能
 */

// 图片加载状态
export enum ImageLoadState {
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error'
}

interface ImageLoaderOptions {
  // 加载失败时的重试次数
  retries?: number;
  // 重试间隔(毫秒)
  retryDelay?: number;
  // 加载超时时间(毫秒)
  timeout?: number;
  // 加载成功回调
  onLoad?: (src: string) => void;
  // 加载失败回调
  onError?: (error: Error, src: string) => void;
}

/**
 * 预加载图片
 * @param src 图片URL
 * @param options 加载选项
 * @returns Promise，解析为加载状态
 */
export function preloadImage(src: string, options: ImageLoaderOptions = {}): Promise<ImageLoadState> {
  const {
    retries = 2,
    retryDelay = 1000,
    timeout = 10000,
    onLoad,
    onError
  } = options;

  return new Promise((resolve, reject) => {
    let retryCount = 0;
    let timeoutId: number | null = null;

    const loadImage = () => {
      const img = new Image();
      
      // 设置超时
      if (timeout > 0) {
        timeoutId = window.setTimeout(() => {
          img.src = '';
          const error = new Error(`Image load timeout: ${src}`);
          
          if (retryCount < retries) {
            retryCount++;
            setTimeout(loadImage, retryDelay);
          } else {
            onError?.(error, src);
            reject(error);
          }
        }, timeout);
      }

      img.onload = () => {
        if (timeoutId) clearTimeout(timeoutId);
        onLoad?.(src);
        resolve(ImageLoadState.LOADED);
      };

      img.onerror = () => {
        if (timeoutId) clearTimeout(timeoutId);
        
        if (retryCount < retries) {
          retryCount++;
          setTimeout(loadImage, retryDelay);
        } else {
          const error = new Error(`Failed to load image: ${src}`);
          onError?.(error, src);
          reject(error);
        }
      };

      img.src = src;
    };

    loadImage();
  });
}

/**
 * 创建Intersection Observer以实现图片懒加载
 * @param callback 元素可见时的回调
 * @param options IntersectionObserver选项
 * @returns IntersectionObserver实例
 */
export function createLazyLoadObserver(
  callback: (entry: IntersectionObserverEntry) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  return new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback(entry);
      }
    });
  }, {
    root: null,
    rootMargin: '0px',
    threshold: 0.1,
    ...options
  });
}

/**
 * 获取图片的主色调
 * @param imgSrc 图片URL
 * @returns Promise，解析为十六进制颜色值
 */
export async function getDominantColor(imgSrc: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // 缩小图片以提高性能
      canvas.width = 50;
      canvas.height = 50;
      
      ctx.drawImage(img, 0, 0, 50, 50);
      
      try {
        const imageData = ctx.getImageData(0, 0, 50, 50).data;
        let r = 0, g = 0, b = 0;
        
        // 计算平均颜色
        for (let i = 0; i < imageData.length; i += 4) {
          r += imageData[i];
          g += imageData[i + 1];
          b += imageData[i + 2];
        }
        
        const pixelCount = imageData.length / 4;
        r = Math.floor(r / pixelCount);
        g = Math.floor(g / pixelCount);
        b = Math.floor(b / pixelCount);
        
        resolve(`#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imgSrc;
  });
} 