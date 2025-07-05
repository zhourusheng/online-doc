import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useUserStore } from '../stores/user'
import { defineAsyncComponent } from 'vue'

// 优化的路由懒加载
const lazyLoadView = (viewPath: string) => {
  return defineAsyncComponent({
    loader: () => import(`../views/${viewPath}.vue`),
    loadingComponent: () => import('../components/AsyncRouteView.vue'),
    delay: 200,
    timeout: 10000
  })
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: { 
      requiresAuth: true,
      keepAlive: true // 缓存首页组件
    }
  },
  {
    path: '/editor/:id',
    name: 'editor',
    component: () => import('../views/EditorView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/shared/:id',
    name: 'shared-document',
    component: () => import('../views/SharedDocumentView.vue')
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { guest: true }
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/RegisterView.vue'),
    meta: { guest: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  // 滚动行为优化
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      // 如果有保存的位置，延迟恢复滚动位置以确保DOM已更新
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(savedPosition)
        }, 300)
      })
    } else if (to.hash) {
      // 如果有锚点，滚动到锚点
      return { el: to.hash, behavior: 'smooth' }
    } else {
      // 默认滚动到顶部
      return { top: 0 }
    }
  }
})

// 预加载相关路由
router.beforeResolve((to, from, next) => {
  // 当进入首页时，预加载编辑器组件
  if (to.name === 'home') {
    import('../views/EditorView.vue')
  }
  next()
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  // 初始化用户状态（从localStorage加载）
  if (!userStore.user) {
    userStore.initUserState()
  }
  
  // 需要登录的路由
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!userStore.isLoggedIn()) {
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
    } else {
      next()
    }
  } 
  // 游客路由（已登录用户不应访问）
  else if (to.matched.some(record => record.meta.guest)) {
    if (userStore.isLoggedIn()) {
      next({ path: '/' })
    } else {
      next()
    }
  } else {
    next()
  }
})

// 性能监控
router.afterEach((to) => {
  // 记录路由切换时间
  const navigationStart = performance.now()
  window.addEventListener('load', () => {
    const navigationTime = performance.now() - navigationStart
    console.debug(`路由 ${to.path} 加载耗时: ${navigationTime.toFixed(2)}ms`)
    
    // 可以将这些数据发送到分析服务
    if (process.env.NODE_ENV === 'production') {
      // sendToAnalytics({ routePath: to.path, navigationTime })
    }
  })
})

export default router 