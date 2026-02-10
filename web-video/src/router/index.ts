import { createRouter, createWebHistory } from 'vue-router'

/**
 * 解析 JWT 的 payload，检查是否过期
 */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return true
    const payload = JSON.parse(atob(parts[1]))
    if (!payload.exp) return false
    // exp 是秒级时间戳，留 60 秒缓冲
    return Date.now() >= (payload.exp - 60) * 1000
  } catch {
    return true
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue')
    },
    {
      path: '/image',
      name: 'image',
      component: () => import('@/views/ImageView.vue')
    },
    {
      path: '/tasks',
      name: 'tasks',
      component: () => import('@/views/TasksView.vue')
    },
    {
      path: '/characters',
      name: 'characters',
      component: () => import('@/views/CharactersView.vue')
    },
    {
      path: '/query',
      name: 'query',
      component: () => import('@/views/QueryView.vue')
    },
    {
      path: '/config',
      name: 'config',
      component: () => import('@/views/ConfigView.vue')
    }
  ]
})

// 路由守卫：未登录跳转登录页
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('auth_token')

  // 访问登录页
  if (to.name === 'login') {
    // 已登录且 token 未过期则跳转首页
    if (token && !isTokenExpired(token)) {
      next({ name: 'home' })
    } else {
      // token 过期或不存在，清理残留
      if (token) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_username')
        localStorage.removeItem('auth_role')
      }
      next()
    }
    return
  }

  // 访问其他页面，检查是否登录
  if (!token || isTokenExpired(token)) {
    // token 不存在或已过期，清理并跳转登录
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_username')
    localStorage.removeItem('auth_role')
    next({ name: 'login' })
    return
  }

  next()
})

export default router
