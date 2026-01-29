<script setup lang="ts">
import { computed, ref } from 'vue'
import { soraApi } from '@/api'
import { useVideoStore } from '@/stores/video'

const store = useVideoStore()
const characters = computed(() => store.characters)

const showCreateModal = ref(false)
const createMethod = ref<'url' | 'task'>('url')
const isCreating = ref(false)

const createForm = ref({
  url: '',
  from_task: '',
  timestamps: '1,3',
})

const createCharacter = async () => {
  if (createMethod.value === 'url' && !createForm.value.url) {
    alert('请输入视频 URL')
    return
  }
  if (createMethod.value === 'task' && !createForm.value.from_task) {
    alert('请输入任务 ID')
    return
  }
  if (!createForm.value.timestamps) {
    alert('请输入时间范围')
    return
  }

  isCreating.value = true

  try {
    const params: any = {
      timestamps: createForm.value.timestamps,
    }

    if (createMethod.value === 'url')
      params.url = createForm.value.url
    else
      params.from_task = createForm.value.from_task

    const response = await soraApi.createCharacter(params)
    const data = response.data

    if (data && data.id) {
      store.addCharacter({
        id: data.id,
        username: data.username,
        permalink: data.permalink,
        profile_picture_url: data.profile_picture_url,
        created_at: new Date().toLocaleString('zh-CN'),
      })

      showCreateModal.value = false
      createForm.value = { url: '', from_task: '', timestamps: '1,3' }
      alert('角色创建成功！')
    }
    else {
      alert(`创建失败: ${data?.message || '未知错误'}`)
    }
  }
  catch (error: any) {
    console.error('创建角色失败', error)
    alert(`创建失败: ${error.response?.data?.message || error.message}`)
  }
  finally {
    isCreating.value = false
  }
}

const copyUsername = (username: string) => {
  navigator.clipboard.writeText(`@${username}`)
  alert(`已复制: @${username}`)
}

const deleteCharacter = (id: string) => {
  if (confirm('确定删除此角色？'))
    store.deleteCharacter(id)
}
</script>

<template>
  <div class="characters">
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">
          🎭 Sora 角色管理
        </h2>
        <button class="btn btn-primary" @click="showCreateModal = true">
          + 创建角色
        </button>
      </div>

      <div class="info-box">
        <p>💡 角色可以用于在 Sora 视频中保持一致的人物形象。创建角色后，在提示词中使用 <code>@{角色名}</code> 即可引用。</p>
      </div>

      <div v-if="characters.length === 0" class="empty">
        <p>🎭 暂无角色</p>
        <p style="margin-top: 8px">
          从视频中提取角色，让 AI 在不同视频中保持一致的形象
        </p>
      </div>

      <div v-else class="character-grid">
        <div v-for="char in characters" :key="char.id" class="character-card">
          <img :src="char.profile_picture_url" :alt="char.username" class="character-avatar">
          <div class="character-info">
            <div class="character-name">
              @{{ char.username }}
            </div>
            <div class="character-id">
              {{ char.id }}
            </div>
            <div class="character-date">
              {{ char.created_at }}
            </div>
          </div>
          <div class="character-actions">
            <button class="btn btn-secondary" @click="copyUsername(char.username)">
              复制
            </button>
            <a :href="char.permalink" target="_blank" class="btn btn-secondary">
              查看
            </a>
            <button class="btn btn-danger" @click="deleteCharacter(char.id)">
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建角色弹窗 -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal">
        <h3 class="modal-title">
          🎭 创建新角色
        </h3>

        <div class="tabs" style="margin-bottom: 16px">
          <button
            class="tab"
            :class="{ active: createMethod === 'url' }"
            @click="createMethod = 'url'"
          >
            通过视频 URL
          </button>
          <button
            class="tab"
            :class="{ active: createMethod === 'task' }"
            @click="createMethod = 'task'"
          >
            通过任务 ID
          </button>
        </div>

        <div v-if="createMethod === 'url'" class="form-group">
          <label class="form-label">视频 URL</label>
          <input
            v-model="createForm.url"
            type="text"
            class="form-input"
            placeholder="https://example.com/video.mp4"
          >
        </div>

        <div v-else class="form-group">
          <label class="form-label">Sora 任务 ID</label>
          <input
            v-model="createForm.from_task"
            type="text"
            class="form-input"
            placeholder="video_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          >
        </div>

        <div class="form-group">
          <label class="form-label">时间范围 (秒)</label>
          <input
            v-model="createForm.timestamps"
            type="text"
            class="form-input"
            placeholder="1,3 (表示视频的 1-3 秒)"
          >
          <p class="form-hint">
            指定视频中角色出现的时间范围，差值最小 1 秒，最大 3 秒
          </p>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showCreateModal = false">
            取消
          </button>
          <button
            class="btn btn-primary"
            :disabled="isCreating"
            @click="createCharacter"
          >
            <span v-if="isCreating" class="loading" />
            {{ isCreating ? '创建中...' : '创建角色' }}
          </button>
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

.info-box {
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 20px;
  font-size: 14px;
  color: var(--text-muted);
}

.info-box code {
  background: var(--bg-input);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--primary);
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.character-card {
  background: var(--bg-input);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.character-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 12px;
  border: 3px solid var(--primary);
}

.character-info {
  margin-bottom: 12px;
}

.character-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--primary);
  margin-bottom: 4px;
}

.character-id {
  font-size: 11px;
  color: var(--text-muted);
  word-break: break-all;
  margin-bottom: 4px;
}

.character-date {
  font-size: 12px;
  color: var(--text-muted);
}

.character-actions {
  display: flex;
  gap: 8px;
  width: 100%;
}

.character-actions .btn {
  flex: 1;
  padding: 8px;
  font-size: 12px;
  justify-content: center;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 480px;
  margin: 20px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.form-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 6px;
}
</style>
