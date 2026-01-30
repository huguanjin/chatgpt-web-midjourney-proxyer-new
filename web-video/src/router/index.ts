import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue')
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
    }
  ]
})

export default router
