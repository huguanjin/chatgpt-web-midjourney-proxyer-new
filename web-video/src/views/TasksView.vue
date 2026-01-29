<script setup lang="ts">
import { computed } from 'vue'
import { useVideoStore } from '@/stores/video'

const store = useVideoStore()
const tasks = computed(() => store.tasks)

const statusText: Record<string, string> = {
  queued: '排队中',
  processing: '生成中',
  completed: '已完成',
  failed: '失败',
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const deleteTask = (id: string) => {
  if (confirm('确定删除此任务？'))
    store.deleteTask(id)
}

const clearCompleted = () => {
  if (confirm('确定清除所有已完成的任务？')) {
    store.tasks
      .filter(t => t.status === 'completed')
      .forEach(t => store.deleteTask(t.id))
  }
}
</script>

<template>
  <div class="tasks">
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">
          📋 任务列表
        </h2>
        <button v-if="tasks.length > 0" class="btn btn-secondary" @click="clearCompleted">
          清除已完成
        </button>
      </div>

      <div v-if="tasks.length === 0" class="empty">
        <p>🎬 暂无任务</p>
        <p style="margin-top: 8px">
          <router-link to="/" class="btn btn-primary">
            去生成视频
          </router-link>
        </p>
      </div>

      <div v-else class="task-grid">
        <div v-for="task in tasks" :key="task.id" class="video-card">
          <div class="video-preview">
            <video
              v-if="task.video_url"
              :src="task.video_url"
              controls
              preload="metadata"
            />
            <div v-else class="video-placeholder">
              <span v-if="task.status === 'queued'">⏳ 排队中</span>
              <span v-else-if="task.status === 'processing'">
                🔄 生成中 {{ task.progress }}%
              </span>
              <span v-else-if="task.status === 'failed'">❌ 失败</span>
            </div>
          </div>

          <div class="video-card-info">
            <div class="video-card-title" :title="task.prompt">
              {{ task.prompt }}
            </div>
            <div class="video-card-meta">
              <span class="status-badge" :class="`status-${task.status}`">
                {{ statusText[task.status] }}
              </span>
              <span>{{ task.model }}</span>
            </div>
            <div class="video-card-meta" style="margin-top: 8px">
              <span>{{ formatTime(task.created_at) }}</span>
              <span>{{ task.platform.toUpperCase() }}</span>
            </div>
            <div class="video-card-actions">
              <a
                v-if="task.video_url"
                :href="task.video_url"
                target="_blank"
                class="btn btn-secondary"
                download
              >
                下载
              </a>
              <button class="btn btn-danger" @click="deleteTask(task.id)">
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-header .card-title {
  margin-bottom: 0;
}

.task-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.video-preview {
  aspect-ratio: 16/9;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-preview video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-placeholder {
  color: var(--text-muted);
  font-size: 14px;
}

.video-card-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.video-card-actions .btn {
  flex: 1;
  justify-content: center;
  padding: 8px 12px;
  font-size: 12px;
}
</style>
