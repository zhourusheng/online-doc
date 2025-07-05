import type { Router } from 'vue-router';

// 用于保存router实例的单例
let router: Router;

// 设置router实例
export function setRouter(routerInstance: Router): void {
  router = routerInstance;
}

// 获取router实例
export function getRouter(): Router {
  if (!router) {
    throw new Error('Router实例尚未初始化');
  }
  return router;
} 