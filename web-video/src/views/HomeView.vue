<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { soraApi, veoApi } from '@/api'
import { type VideoTask, useVideoStore } from '@/stores/video'

const store = useVideoStore()

const platform = ref<'sora' | 'veo'>('sora')
const isLoading = ref(false)

const soraForm = ref({
  model: 'sora-2',
  prompt: '',
  orientation: 'landscape' as 'landscape' | 'portrait',
  duration: 8,
})

// Sora 模型和时长的自定义输入状态
const soraModelCustom = ref(false)
const soraDurationCustom = ref(false)

const veoForm = ref({
  model: 'veo_3_1-fast',
  prompt: '',
  size: '1280x720' as '1280x720' | '720x1280',
  seconds: 8,
})

// VEO 模型自定义输入状态
const veoModelCustom = ref(false)

// VEO 参考图
const veoReferenceFiles = ref<File[]>([])
const veoFileInput = ref<HTMLInputElement | null>(null)

const statusText: Record<string, string> = {
  queued: '排队中',
  processing: '生成中',
  completed: '已完成',
  failed: '失败',
}

const recentTasks = computed(() => store.tasks.slice(0, 5))

// 创建视频
const createVideo = async () => {
  const prompt = platform.value === 'sora' ? soraForm.value.prompt : veoForm.value.prompt
  if (!prompt.trim()) {
    alert('请输入提示词')
    return
  }

  isLoading.value = true

  try {
    let response: any
    let task: VideoTask

    if (platform.value === 'sora') {
      response = await soraApi.createVideo({
        model: soraForm.value.model,
        prompt: soraForm.value.prompt,
        orientation: soraForm.value.orientation,
        duration: soraForm.value.duration,
      })

      task = {
        id: response.data.id,
        model: soraForm.value.model,
        prompt: soraForm.value.prompt,
        status: 'queued',
        progress: 0,
        created_at: Date.now(),
        platform: 'sora',
      }
    }
    else {
      response = await veoApi.createVideo({
        model: veoForm.value.model,
        prompt: veoForm.value.prompt,
        size: veoForm.value.size,
        seconds: veoForm.value.seconds,
      }, veoReferenceFiles.value)

      task = {
        id: response.data.id,
        model: veoForm.value.model,
        prompt: veoForm.value.prompt,
        status: 'queued',
        progress: 0,
        created_at: Date.now(),
        platform: 'veo',
      }
    }

    store.addTask(task)

    // 清空表单
    if (platform.value === 'sora')
      soraForm.value.prompt = ''
    else {
      veoForm.value.prompt = ''
      veoReferenceFiles.value = []
    }

    // 开始轮询
    pollTaskStatus(task.id, task.platform)
  }
  catch (error: any) {
    console.error('创建失败', error)
    alert(`创建失败: ${error.response?.data?.message || error.message}`)
  }
  finally {
    isLoading.value = false
  }
}

// VEO 参考图处理函数
const handleVeoFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files) {
    const newFiles = Array.from(input.files)
    veoReferenceFiles.value = [...veoReferenceFiles.value, ...newFiles]
  }
  // 清空 input 以便重复选择相同文件
  input.value = ''
}

const removeVeoFile = (index: number) => {
  veoReferenceFiles.value.splice(index, 1)
}

const getFilePreviewUrl = (file: File) => {
  return URL.createObjectURL(file)
}

// 轮询任务状态
const pollTaskStatus = async (taskId: string, taskPlatform: 'sora' | 'veo') => {
  const maxAttempts = 120
  let attempts = 0

  const poll = async () => {
    if (attempts >= maxAttempts)
      return
    attempts++

    try {
      const response = taskPlatform === 'sora'
        ? await soraApi.queryVideo(taskId)
        : await veoApi.queryVideo(taskId)

      const data = response.data

      if (data.status === 'completed') {
        store.updateTask(taskId, {
          status: 'completed',
          progress: 100,
          video_url: data.video_url || data.url,
        })
        return
      }
      else if (data.status === 'failed') {
        store.updateTask(taskId, { status: 'failed' })
        return
      }
      else {
        store.updateTask(taskId, {
          status: 'processing',
          progress: data.progress || 0,
        })
        setTimeout(poll, 3000)
      }
    }
    catch (error) {
      console.error('查询失败', error)
      setTimeout(poll, 5000)
    }
  }

  poll()
}

// 恢复未完成任务的轮询
onMounted(() => {
  store.tasks.forEach((task) => {
    if (task.status === 'queued' || task.status === 'processing')
      pollTaskStatus(task.id, task.platform)
  })
})
</script>

<template>
  <div class="home">
    <!-- 平台选择 -->
    <div class="tabs">
      <button
        class="tab"
        :class="{ active: platform === 'sora' }"
        @click="platform = 'sora'"
      >
        🎬 Sora (OpenAI)
      </button>
      <button
        class="tab"
        :class="{ active: platform === 'veo' }"
        @click="platform = 'veo'"
      >
        🎥 VEO (Google)
      </button>
    </div>

    <div class="grid grid-2">
      <!-- 左侧：输入表单 -->
      <div class="card">
        <h2 class="card-title">
          {{ platform === 'sora' ? '🎬 Sora 视频生成' : '🎥 VEO 视频生成' }}
        </h2>

        <!-- Sora 表单 -->
        <template v-if="platform === 'sora'">
          <div class="form-group">
            <label class="form-label">模型</label>
            <div class="input-with-toggle">
              <select
                v-if="!soraModelCustom"
                v-model="soraForm.model"
                class="form-select"
              >
                <option value="sora-2">
                  sora-2
                </option>
                <option value="sora-2-pro">
                  sora-2-pro
                </option>
              </select>
              <input
                v-else
                v-model="soraForm.model"
                type="text"
                class="form-input"
                placeholder="输入自定义模型名称"
              >
              <button
                type="button"
                class="toggle-btn"
                :title="soraModelCustom ? '切换为下拉选择' : '切换为自定义输入'"
                @click="soraModelCustom = !soraModelCustom"
              >
                {{ soraModelCustom ? '📋' : '✏️' }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">提示词</label>
            <textarea
              v-model="soraForm.prompt"
              class="form-textarea"
              placeholder="描述你想要生成的视频内容..."
            />
          </div>

          <div class="form-group">
            <label class="form-label">方向</label>
            <select v-model="soraForm.orientation" class="form-select">
              <option value="landscape">
                横屏 (16:9)
              </option>
              <option value="portrait">
                竖屏 (9:16)
              </option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">时长 (秒)</label>
            <div class="input-with-toggle">
              <select
                v-if="!soraDurationCustom"
                v-model.number="soraForm.duration"
                class="form-select"
              >
                <option :value="4">
                  4 秒
                </option>
                <option :value="8">
                  8 秒
                </option>
                <option :value="12">
                  12 秒
                </option>
              </select>
              <input
                v-else
                v-model.number="soraForm.duration"
                type="number"
                class="form-input"
                min="1"
                max="60"
                placeholder="输入秒数"
              >
              <button
                type="button"
                class="toggle-btn"
                :title="soraDurationCustom ? '切换为下拉选择' : '切换为自定义输入'"
                @click="soraDurationCustom = !soraDurationCustom"
              >
                {{ soraDurationCustom ? '📋' : '✏️' }}
              </button>
            </div>
          </div>
        </template>

        <!-- VEO 表单 -->
        <template v-else>
          <div class="form-group">
            <label class="form-label">模型</label>
            <div class="input-with-toggle">
              <select
                v-if="!veoModelCustom"
                v-model="veoForm.model"
                class="form-select"
              >
                <optgroup label="✨ 高质量版本">
                  <option value="veo_3_1">veo_3_1</option>
                  <option value="veo_3_1-4K">veo_3_1-4K</option>
                </optgroup>
                <optgroup label="⚡ 快速版本">
                  <option value="veo_3_1-fast">veo_3_1-fast</option>
                  <option value="veo_3_1-fast-4K">veo_3_1-fast-4K</option>
                </optgroup>
                <optgroup label="🎨 仅参考图版本">
                  <option value="veo_3_1-components">veo_3_1-components</option>
                  <option value="veo_3_1-components-4K">veo_3_1-components-4K</option>
                  <option value="veo_3_1-fast-components">veo_3_1-fast-components</option>
                  <option value="veo_3_1-fast-components-4K">veo_3_1-fast-components-4K</option>
                </optgroup>
              </select>
              <input
                v-else
                v-model="veoForm.model"
                type="text"
                class="form-input"
                placeholder="输入自定义模型名称"
              >
              <button
                type="button"
                class="toggle-btn"
                :title="veoModelCustom ? '切换为下拉选择' : '切换为自定义输入'"
                @click="veoModelCustom = !veoModelCustom"
              >
                {{ veoModelCustom ? '📋' : '✏️' }}
              </button>
            </div>
            <small class="form-hint">4K 版本请在模型名后加 -4K；使用 -components 后缀强制参考图模式</small>
          </div>

          <div class="form-group">
            <label class="form-label">提示词</label>
            <textarea
              v-model="veoForm.prompt"
              class="form-textarea"
              placeholder="描述你想要生成的视频内容..."
            />
          </div>

          <div class="form-group">
            <label class="form-label">尺寸</label>
            <select v-model="veoForm.size" class="form-select">
              <option value="1280x720">
                横屏 (1280x720)
              </option>
              <option value="720x1280">
                竖屏 (720x1280)
              </option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">时长</label>
            <select v-model="veoForm.seconds" class="form-select">
              <option :value="8">
                8 秒
              </option>
            </select>
          </div>

          <!-- 参考图上传 -->
          <div class="form-group">
            <label class="form-label">参考图 (可选)</label>
            <div class="reference-upload">
              <input
                ref="veoFileInput"
                type="file"
                accept="image/*"
                multiple
                style="display: none"
                @change="handleVeoFileSelect"
              >
              <button
                type="button"
                class="btn btn-secondary upload-btn"
                @click="veoFileInput?.click()"
              >
                📷 选择图片
              </button>
              <span class="upload-hint">
                1张=首帧，2张=首尾帧，3张=参考图模式
              </span>
            </div>
            
            <!-- 已选图片预览 -->
            <div v-if="veoReferenceFiles.length > 0" class="reference-preview">
              <div
                v-for="(file, index) in veoReferenceFiles"
                :key="index"
                class="preview-item"
              >
                <img :src="getFilePreviewUrl(file)" :alt="file.name">
                <span class="preview-name">{{ file.name }}</span>
                <button
                  type="button"
                  class="preview-remove"
                  @click="removeVeoFile(index)"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </template>

        <button
          class="btn btn-primary"
          style="width: 100%"
          :disabled="isLoading"
          @click="createVideo"
        >
          <span v-if="isLoading" class="loading" />
          {{ isLoading ? '生成中...' : '🚀 生成视频' }}
        </button>
      </div>

      <!-- 右侧：最近任务 -->
      <div class="card">
        <h2 class="card-title">
          📋 最近任务
        </h2>

        <div v-if="recentTasks.length === 0" class="empty">
          <p>暂无任务</p>
        </div>

        <div v-else class="task-list">
          <div
            v-for="task in recentTasks"
            :key="task.id"
            class="task-item"
          >
            <div class="task-info">
              <div class="task-title">
                {{ task.prompt.slice(0, 50) }}{{ task.prompt.length > 50 ? '...' : '' }}
              </div>
              <div class="task-meta">
                <span class="status-badge" :class="`status-${task.status}`">
                  {{ statusText[task.status] }}
                </span>
                <span>{{ task.model }}</span>
              </div>
              <div v-if="task.status === 'processing'" class="progress-bar">
                <div class="progress-bar-fill" :style="{ width: `${task.progress}%` }" />
              </div>
            </div>
            <div class="task-actions">
              <a
                v-if="task.video_url"
                :href="task.video_url"
                target="_blank"
                class="btn btn-secondary"
              >
                查看
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--bg-input);
  border-radius: 8px;
}

.task-info {
  flex: 1;
  min-width: 0;
}

.task-title {
  font-size: 14px;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.task-actions {
  margin-left: 12px;
}

/* 带切换按钮的输入框组合 */
.input-with-toggle {
  display: flex;
  gap: 8px;
}

.input-with-toggle .form-select,
.input-with-toggle .form-input {
  flex: 1;
}

.toggle-btn {
  padding: 8px 12px;
  background: var(--bg-input);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.toggle-btn:hover {
  background: rgba(99, 102, 241, 0.2);
  border-color: var(--primary);
}

/* 参考图上传样式 */
.reference-upload {
  display: flex;
  align-items: center;
  gap: 12px;
}

.upload-btn {
  white-space: nowrap;
}

.upload-hint {
  font-size: 12px;
  color: var(--text-muted);
}

.reference-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.preview-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  background: var(--bg-input);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.preview-item img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
}

.preview-name {
  font-size: 10px;
  color: var(--text-muted);
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 4px;
}

.preview-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ef4444;
  color: white;
  border: none;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-remove:hover {
  background: #dc2626;
}

.form-hint {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}
</style>
