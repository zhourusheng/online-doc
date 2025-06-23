import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/editor/:id',
    name: 'editor',
    component: () => import('../views/EditorView.vue'),
    meta: { requiresAuth: true }
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
  routes
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

export default router 