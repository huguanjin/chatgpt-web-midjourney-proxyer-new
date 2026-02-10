<template>
  <div class="app">
    <header v-if="showHeader" class="header">
      <div class="header-content">
        <div class="logo">🎬 AI 创作中心</div>
        <nav class="nav">
          <router-link to="/" class="nav-link">视频生成</router-link>
          <router-link to="/image" class="nav-link">图片创作</router-link>
          <router-link to="/tasks" class="nav-link">任务列表</router-link>
          <router-link to="/characters" class="nav-link">角色管理</router-link>
          <router-link to="/query" class="nav-link">任务查询</router-link>
          <router-link to="/config" class="nav-link">⚙️ 配置</router-link>
        </nav>
        <div class="user-area">
          <span class="username">👤 {{ authStore.username }}</span>
          <button class="logout-btn" @click="handleLogout">退出登录</button>
        </div>
      </div>
    </header>
    <main class="container">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const showHeader = computed(() => route.name !== 'login')

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.user-area {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.username {
  color: #ccc;
  font-size: 14px;
  white-space: nowrap;
}

.logout-btn {
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.1);
  color: #ccc;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  white-space: nowrap;
}

.logout-btn:hover {
  background: rgba(255, 80, 80, 0.3);
  border-color: rgba(255, 80, 80, 0.5);
  color: #fff;
}
</style>
