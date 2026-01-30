<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

// 后端 API 地址
const BACKEND_API = 'http://localhost:3003'

// 任务 ID 和类型
const taskId = ref('')
const taskType = ref<'sora' | 'veo'>('sora')
const isLoading = ref(false)
const errorMsg = ref('')

// 查询结果
interface TaskResult {
  id: string
  object: string
  model: string
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  created_at: number
  completed_at: number
  expires_at: number
  seconds: string
  size: string
  remixed_from_video_id: string
  error?: {
    message: string
    code: string
  }
  video_url: string
}

const result = ref<TaskResult | null>(null)

// 状态文本映射
const statusText: Record<string, string> = {
  queued: '排队中',
  processing: '生成中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
}

// 状态样式映射
const statusClass = computed(() => {
  if (!result.value) return ''
  return `status-${result.value.status}`
})

// 查询任务 - 调用后端接口
const queryTask = async () => {
  if (!taskId.value.trim()) {
    errorMsg.value = '请输入任务 ID'
    return
  }

  isLoading.value = true
  errorMsg.value = ''
  result.value = null

  try {
    // 根据任务类型选择不同的 API 端点
    const endpoint = taskType.value === 'veo' ? '/v1/veo/query' : '/v1/video/query'
    
    const response = await axios.get(
      `${BACKEND_API}${endpoint}`,
      { 
        params: { id: taskId.value.trim() },
        timeout: 30000 
      }
    )

    result.value = response.data
  } catch (err: any) {
    if (err.response) {
      errorMsg.value = `查询失败: ${err.response.status} - ${err.response.data?.message || err.response.statusText}`
    } else if (err.request) {
      errorMsg.value = '网络错误，请确保后端服务已启动'
    } else {
      errorMsg.value = `查询失败: ${err.message}`
    }
  } finally {
    isLoading.value = false
  }
}

// 格式化时间戳
const formatTime = (timestamp: number) => {
  if (!timestamp) return '-'
  return new Date(timestamp * 1000).toLocaleString('zh-CN')
}

// 下载视频
const downloadVideo = () => {
  if (result.value?.video_url) {
    window.open(result.value.video_url, '_blank')
  }
}

// 复制链接
const copyVideoUrl = async () => {
  if (result.value?.video_url) {
    try {
      await navigator.clipboard.writeText(result.value.video_url)
      alert('视频链接已复制到剪贴板')
    } catch {
      // 降级方案
      const input = document.createElement('input')
      input.value = result.value.video_url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      alert('视频链接已复制到剪贴板')
    }
  }
}

// 自动刷新（当任务进行中时）
let refreshTimer: number | null = null

const startAutoRefresh = () => {
  stopAutoRefresh()
  if (result.value && ['queued', 'processing'].includes(result.value.status)) {
    refreshTimer = window.setTimeout(() => {
      queryTask()
    }, 3000)
  }
}

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
}

// 监听结果变化，启动自动刷新
const handleQueryComplete = () => {
  if (result.value && ['queued', 'processing'].includes(result.value.status)) {
    startAutoRefresh()
  }
}

// 初始化
onMounted(() => {
  // 无需配置
})

// 清理
import { onUnmounted, watch } from 'vue'

watch(result, handleQueryComplete)

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div class="query-page">
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">🔍 任务查询</h2>
      </div>

      <!-- 查询表单 -->
      <div class="query-form">
        <div class="form-group">
          <label>任务类型</label>
          <div class="type-selector">
            <label class="type-option">
              <input type="radio" v-model="taskType" value="sora" />
              <span>Sora</span>
            </label>
            <label class="type-option">
              <input type="radio" v-model="taskType" value="veo" />
              <span>VEO</span>
            </label>
          </div>
        </div>
        <div class="form-group">
          <label>任务 ID</label>
          <div class="input-group">
            <input
              v-model="taskId"
              type="text"
              class="form-control"
              placeholder="例如: video_28f531c0-cd63-4b2d-a19a-019d46f3a9ae"
              @keyup.enter="queryTask"
            />
            <button 
              class="btn btn-primary" 
              :disabled="isLoading"
              @click="queryTask"
            >
              {{ isLoading ? '查询中...' : '查询' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 错误信息 -->
      <div v-if="errorMsg" class="error-msg">
        ❌ {{ errorMsg }}
      </div>

      <!-- 查询结果 -->
      <div v-if="result" class="result-panel">
        <h3 class="result-title">📊 查询结果</h3>
        
        <!-- 状态卡片 -->
        <div class="status-card" :class="statusClass">
          <div class="status-main">
            <span class="status-label">状态</span>
            <span class="status-value">{{ statusText[result.status] || result.status }}</span>
          </div>
          <div v-if="result.progress !== undefined" class="progress-info">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${result.progress}%` }"></div>
            </div>
            <span class="progress-text">{{ result.progress }}%</span>
          </div>
        </div>

        <!-- 自动刷新提示 -->
        <div v-if="['queued', 'processing'].includes(result.status)" class="auto-refresh-hint">
          🔄 任务进行中，每3秒自动刷新...
        </div>

        <!-- 视频预览 -->
        <div v-if="result.video_url && result.status === 'completed'" class="video-section">
          <h4>🎬 视频预览</h4>
          <div class="video-container">
            <video
              :src="result.video_url"
              controls
              preload="metadata"
            ></video>
          </div>
          <div class="video-actions">
            <button class="btn btn-primary" @click="downloadVideo">
              ⬇️ 下载视频
            </button>
            <button class="btn btn-secondary" @click="copyVideoUrl">
              📋 复制链接
            </button>
          </div>
        </div>

        <!-- 错误信息 -->
        <div v-if="result.error && result.status === 'failed'" class="error-detail">
          <h4>❌ 错误信息</h4>
          <p><strong>错误码:</strong> {{ result.error.code }}</p>
          <p><strong>错误描述:</strong> {{ result.error.message }}</p>
        </div>

        <!-- 详细信息 -->
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">任务 ID</span>
            <span class="detail-value">{{ result.id }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">模型</span>
            <span class="detail-value">{{ result.model }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">时长</span>
            <span class="detail-value">{{ result.seconds || '-' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">尺寸</span>
            <span class="detail-value">{{ result.size || '-' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">创建时间</span>
            <span class="detail-value">{{ formatTime(result.created_at) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">完成时间</span>
            <span class="detail-value">{{ formatTime(result.completed_at) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">过期时间</span>
            <span class="detail-value">{{ formatTime(result.expires_at) }}</span>
          </div>
          <div v-if="result.remixed_from_video_id" class="detail-item">
            <span class="detail-label">来源视频</span>
            <span class="detail-value">{{ result.remixed_from_video_id }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.query-page {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-header .card-title {
  margin-bottom: 0;
}

.config-panel {
  background: var(--bg-input);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.config-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.form-hint {
  color: var(--text-muted);
  font-size: 12px;
  margin-top: 4px;
  display: block;
}

.query-form {
  margin-bottom: 20px;
}

.type-selector {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.type-option {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 14px;
}

.type-option input[type="radio"] {
  cursor: pointer;
}

.input-group {
  display: flex;
  gap: 10px;
}

.input-group .form-control {
  flex: 1;
}

.error-msg {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--error);
  color: var(--error);
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.result-panel {
  margin-top: 20px;
}

.result-title {
  font-size: 16px;
  margin-bottom: 16px;
}

.status-card {
  background: var(--bg-input);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}

.status-card.status-completed {
  border-left: 4px solid var(--success);
}

.status-card.status-failed,
.status-card.status-cancelled {
  border-left: 4px solid var(--error);
}

.status-card.status-processing,
.status-card.status-queued {
  border-left: 4px solid var(--warning);
}

.status-main {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.status-label {
  color: var(--text-muted);
  font-size: 14px;
}

.status-value {
  font-size: 18px;
  font-weight: 600;
}

.status-completed .status-value {
  color: var(--success);
}

.status-failed .status-value,
.status-cancelled .status-value {
  color: var(--error);
}

.status-processing .status-value,
.status-queued .status-value {
  color: var(--warning);
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--bg);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  color: var(--text-muted);
  min-width: 40px;
}

.auto-refresh-hint {
  background: rgba(245, 158, 11, 0.1);
  color: var(--warning);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 16px;
}

.video-section {
  margin-bottom: 20px;
}

.video-section h4 {
  font-size: 14px;
  margin-bottom: 12px;
  color: var(--text-muted);
}

.video-container {
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;
}

.video-container video {
  width: 100%;
  max-height: 400px;
  display: block;
}

.video-actions {
  display: flex;
  gap: 10px;
}

.error-detail {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--error);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.error-detail h4 {
  color: var(--error);
  margin-bottom: 12px;
  font-size: 14px;
}

.error-detail p {
  font-size: 13px;
  margin-bottom: 8px;
}

.error-detail p:last-child {
  margin-bottom: 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  background: var(--bg-input);
  border-radius: 8px;
  padding: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 12px;
  color: var(--text-muted);
}

.detail-value {
  font-size: 14px;
  word-break: break-all;
}

@media (max-width: 640px) {
  .input-group {
    flex-direction: column;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .video-actions {
    flex-direction: column;
  }
}
</style>
