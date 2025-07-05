/**
 * CSS优化工具
 * 提供关键CSS内联和非关键CSS延迟加载功能
 */

/**
 * 动态加载CSS文件
 * @param href CSS文件URL
 * @param options 加载选项
 * @returns Promise，解析为加载状态
 */
export function loadCSS(
  href: string, 
  options: {
    media?: string;
    rel?: string;
    onload?: () => void;
    onerror?: (error: Error) => void;
  } = {}
): Promise<HTMLLinkElement> {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = options.rel || 'stylesheet';
    link.href = href;
    
    if (options.media) {
      link.media = options.media;
    }
    
    link.onload = () => {
      if (options.onload) options.onload();
      resolve(link);
    };
    
    link.onerror = () => {
      const error = new Error(`Failed to load CSS: ${href}`);
      if (options.onerror) options.onerror(error);
      reject(error);
    };
    
    document.head.appendChild(link);
  });
}

/**
 * 预加载CSS文件
 * @param href CSS文件URL
 * @returns Promise，解析为加载状态
 */
export function preloadCSS(href: string): Promise<HTMLLinkElement> {
  return loadCSS(href, {
    rel: 'preload',
    media: 'print',
    onload: () => {
      // 加载完成后切换为stylesheet
      const link = document.querySelector(`link[href="${href}"]`) as HTMLLinkElement;
      if (link) {
        link.media = 'all';
        link.rel = 'stylesheet';
      }
    }
  });
}

/**
 * 内联关键CSS
 * @param css CSS内容
 * @param id 样式标签ID
 */
export function inlineCSS(css: string, id?: string): void {
  const style = document.createElement('style');
  if (id) style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}

/**
 * 延迟加载非关键CSS
 * @param hrefs CSS文件URL数组
 * @returns Promise，解析为所有CSS加载完成
 */
export function loadDeferredCSS(hrefs: string[]): Promise<HTMLLinkElement[]> {
  // 使用requestIdleCallback在浏览器空闲时加载CSS
  return new Promise((resolve) => {
    const loadedLinks: HTMLLinkElement[] = [];
    
    const loadNext = (index: number) => {
      if (index >= hrefs.length) {
        resolve(loadedLinks);
        return;
      }
      
      loadCSS(hrefs[index])
        .then((link) => {
          loadedLinks.push(link);
          loadNext(index + 1);
        })
        .catch(() => {
          // 即使加载失败也继续下一个
          loadNext(index + 1);
        });
    };
    
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        loadNext(0);
      });
    } else {
      // 降级处理
      setTimeout(() => {
        loadNext(0);
      }, 200);
    }
  });
}

/**
 * 移除未使用的CSS规则
 * @param styleElement 样式元素
 * @param rootElement 根元素，用于检查选择器是否匹配
 */
export function purgeUnusedCSS(
  styleElement: HTMLStyleElement | CSSStyleSheet, 
  rootElement: Element = document.body
): void {
  try {
    const styleSheet = styleElement instanceof HTMLStyleElement 
      ? styleElement.sheet as CSSStyleSheet
      : styleElement;
      
    if (!styleSheet || !styleSheet.cssRules) return;
    
    // 从后向前遍历，以便安全删除
    for (let i = styleSheet.cssRules.length - 1; i >= 0; i--) {
      const rule = styleSheet.cssRules[i];
      
      // 只处理样式规则
      if (rule.type === 1) { // CSSRule.STYLE_RULE
        const cssRule = rule as CSSStyleRule;
        try {
          // 检查选择器是否匹配任何元素
          const matches = rootElement.querySelectorAll(cssRule.selectorText);
          if (matches.length === 0) {
            styleSheet.deleteRule(i);
          }
        } catch (e) {
          // 忽略无效选择器
          console.warn('Invalid selector:', cssRule.selectorText);
        }
      }
    }
  } catch (e) {
    console.error('Failed to purge unused CSS:', e);
  }
} 