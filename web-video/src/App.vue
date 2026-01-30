<template>
  <div class="app">
    <header class="header">
      <div class="header-content">
        <div class="logo">🎬 AI 视频生成器</div>
        <nav class="nav">
          <router-link to="/" class="nav-link">生成视频</router-link>
          <router-link to="/tasks" class="nav-link">任务列表</router-link>
          <router-link to="/characters" class="nav-link">角色管理</router-link>
          <router-link to="/query" class="nav-link">任务查询</router-link>
        </nav>
      </div>
    </header>
    <main class="container">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
</script>
