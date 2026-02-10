<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { userConfigApi, type UserApiConfig, type ServiceConfig } from '@/api'

const isLoading = ref(false)
const isSaving = ref(false)
const isSyncing = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

// 配置数据（用户级）
const config = ref<UserApiConfig | null>(null)

// 默认配置同步表单
const defaultForm = ref({
  server: '',
  key: '',
})
const syncServices = ref({
  sora: true,
  veo: true,
  geminiImage: true,
  grok: true,
  grokImage: true,
})

// 编辑模式
const editMode = ref<{
  sora: boolean
  veo: boolean
  geminiImage: boolean
  grok: boolean
  grokImage: boolean
}>({
  sora: false,
  veo: false,
  geminiImage: false,
  grok: false,
  grokImage: false,
})

// 编辑表单数据
const editForm = ref<{
  sora: ServiceConfig
  veo: ServiceConfig
  geminiImage: ServiceConfig
  grok: ServiceConfig
  grokImage: ServiceConfig
}>({
  sora: { server: '', key: '', characterServer: '', characterKey: '' },
  veo: { server: '', key: '' },
  geminiImage: { server: '', key: '' },
  grok: { server: '', key: '' },
  grokImage: { server: '', key: '' },
})

// 显示消息
const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
  message.value = msg
  messageType.value = type
  setTimeout(() => {
    message.value = ''
  }, 3000)
}

// 加载配置
const loadConfig = async () => {
  isLoading.value = true
  try {
    const response = await userConfigApi.getConfig()
    config.value = response.data.data
  } catch (error: any) {
    showMessage(error.message || '加载配置失败', 'error')
  } finally {
    isLoading.value = false
  }
}

// 进入编辑模式
const enterEditMode = async (service: 'sora' | 'veo' | 'geminiImage' | 'grok' | 'grokImage') => {
  // 获取完整配置（包含 API Key）
  try {
    const response = await userConfigApi.getFullConfig()
    const fullConfig = response.data.data
    
    if (service === 'sora') {
      editForm.value.sora = { ...fullConfig.sora }
    } else if (service === 'veo') {
      editForm.value.veo = { ...fullConfig.veo }
    } else if (service === 'geminiImage') {
      editForm.value.geminiImage = { ...fullConfig.geminiImage }
    } else if (service === 'grok') {
      editForm.value.grok = { ...fullConfig.grok }
    } else if (service === 'grokImage') {
      editForm.value.grokImage = { ...fullConfig.grokImage }
    }
    
    editMode.value[service] = true
  } catch (error: any) {
    showMessage(error.message || '获取配置失败', 'error')
  }
}

// 取消编辑
const cancelEdit = (service: 'sora' | 'veo' | 'geminiImage' | 'grok' | 'grokImage') => {
  editMode.value[service] = false
}

// 保存配置
const saveConfig = async (service: 'sora' | 'veo' | 'geminiImage' | 'grok' | 'grokImage') => {
  isSaving.value = true
  try {
    const serviceConfig = editForm.value[service]
    await userConfigApi.updateServiceConfig(service, serviceConfig)
    
    // 重新加载配置
    await loadConfig()
    
    editMode.value[service] = false
    showMessage(`${getServiceName(service)} 配置已更新，立即生效！`, 'success')
  } catch (error: any) {
    showMessage(error.message || '保存配置失败', 'error')
  } finally {
    isSaving.value = false
  }
}

// 获取服务名称
const getServiceName = (service: string): string => {
  const names: Record<string, string> = {
    sora: 'Sora',
    veo: 'VEO',
    geminiImage: 'Gemini Image',
    grok: 'Grok',
    grokImage: 'Grok 生图',
  }
  return names[service] || service
}

// 测试连接
const testConnection = async (service: 'sora' | 'veo' | 'geminiImage' | 'grok' | 'grokImage') => {
  showMessage(`正在测试 ${getServiceName(service)} 连接...`, 'success')
  // TODO: 实现连接测试
  setTimeout(() => {
    showMessage(`${getServiceName(service)} 连接测试功能开发中`, 'success')
  }, 1000)
}

// 同步默认配置到所有服务
const syncDefault = async () => {
  if (!defaultForm.value.server && !defaultForm.value.key) {
    showMessage('请至少填写 API 地址或 API Key', 'error')
    return
  }

  const selectedServices = Object.entries(syncServices.value)
    .filter(([_, checked]) => checked)
    .map(([service]) => service)

  if (selectedServices.length === 0) {
    showMessage('请至少选择一个要同步的服务', 'error')
    return
  }

  isSyncing.value = true
  try {
    const res = await userConfigApi.syncDefault(
      defaultForm.value.server,
      defaultForm.value.key,
      selectedServices,
    )
    await loadConfig()
    showMessage(res.data.message || '同步成功！配置已更新', 'success')
  } catch (error: any) {
    showMessage(error.response?.data?.message || error.message || '同步失败', 'error')
  } finally {
    isSyncing.value = false
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<template>
  <div class="config-page">
    <h1>⚙️ 我的 API 配置</h1>
    
    <!-- 消息提示 -->
    <div v-if="message" :class="['message', messageType]">
      {{ message }}
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading">
      加载中...
    </div>

    <div v-else-if="config" class="config-sections">
      <!-- 默认配置快捷同步 -->
      <div class="config-section sync-section">
        <div class="section-header">
          <h2>🔗 快捷配置同步</h2>
        </div>
        <p class="sync-desc">
          如果您的 API 服务商使用同一个地址和密钥即可调用所有模型，可在此统一设置后一键同步到下方所有服务配置，同步后仍可单独修改任意一项。
        </p>
        <div class="config-edit">
          <div class="form-group">
            <label>默认 API 地址</label>
            <input v-model="defaultForm.server" type="text" placeholder="https://api.example.com" />
          </div>
          <div class="form-group">
            <label>默认 API Key</label>
            <input v-model="defaultForm.key" type="text" placeholder="sk-..." />
          </div>
          <div class="form-group">
            <label>同步到以下服务</label>
            <div class="sync-checkboxes">
              <label class="checkbox-label">
                <input v-model="syncServices.sora" type="checkbox" /> Sora
              </label>
              <label class="checkbox-label">
                <input v-model="syncServices.veo" type="checkbox" /> VEO
              </label>
              <label class="checkbox-label">
                <input v-model="syncServices.geminiImage" type="checkbox" /> Gemini Image
              </label>
              <label class="checkbox-label">
                <input v-model="syncServices.grok" type="checkbox" /> Grok 视频
              </label>
              <label class="checkbox-label">
                <input v-model="syncServices.grokImage" type="checkbox" /> Grok 生图
              </label>
            </div>
          </div>
          <div class="button-group">
            <button class="save-btn sync-btn" :disabled="isSyncing" @click="syncDefault">
              {{ isSyncing ? '同步中...' : '🔄 一键同步到所选服务' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Sora 配置 -->
      <div class="config-section">
        <div class="section-header">
          <h2>🎬 Sora 视频生成</h2>
          <button 
            v-if="!editMode.sora" 
            class="edit-btn"
            @click="enterEditMode('sora')"
          >
            ✏️ 编辑
          </button>
        </div>
        
        <div v-if="!editMode.sora" class="config-display">
          <div class="config-item">
            <label>API 地址</label>
            <span class="value">{{ config.sora.server }}</span>
          </div>
          <div class="config-item">
            <label>API Key</label>
            <span class="value masked">{{ config.sora.key }}</span>
          </div>
          <div class="config-item">
            <label>角色服务地址</label>
            <span class="value">{{ config.sora.characterServer || '(未设置)' }}</span>
          </div>
          <div class="config-item">
            <label>角色服务 Key</label>
            <span class="value masked">{{ config.sora.characterKey || '(未设置)' }}</span>
          </div>
        </div>

        <div v-else class="config-edit">
          <div class="form-group">
            <label>API 地址</label>
            <input v-model="editForm.sora.server" type="text" placeholder="https://..." />
          </div>
          <div class="form-group">
            <label>API Key</label>
            <input v-model="editForm.sora.key" type="text" placeholder="sk-..." />
          </div>
          <div class="form-group">
            <label>角色服务地址</label>
            <input v-model="editForm.sora.characterServer" type="text" placeholder="https://..." />
          </div>
          <div class="form-group">
            <label>角色服务 Key</label>
            <input v-model="editForm.sora.characterKey" type="text" placeholder="sk-..." />
          </div>
          <div class="button-group">
            <button class="save-btn" :disabled="isSaving" @click="saveConfig('sora')">
              {{ isSaving ? '保存中...' : '💾 保存' }}
            </button>
            <button class="cancel-btn" @click="cancelEdit('sora')">取消</button>
          </div>
        </div>
      </div>

      <!-- VEO 配置 -->
      <div class="config-section">
        <div class="section-header">
          <h2>🎥 VEO 视频生成</h2>
          <button 
            v-if="!editMode.veo" 
            class="edit-btn"
            @click="enterEditMode('veo')"
          >
            ✏️ 编辑
          </button>
        </div>
        
        <div v-if="!editMode.veo" class="config-display">
          <div class="config-item">
            <label>API 地址</label>
            <span class="value">{{ config.veo.server }}</span>
          </div>
          <div class="config-item">
            <label>API Key</label>
            <span class="value masked">{{ config.veo.key }}</span>
          </div>
        </div>

        <div v-else class="config-edit">
          <div class="form-group">
            <label>API 地址</label>
            <input v-model="editForm.veo.server" type="text" placeholder="https://..." />
          </div>
          <div class="form-group">
            <label>API Key</label>
            <input v-model="editForm.veo.key" type="text" placeholder="sk-..." />
          </div>
          <div class="button-group">
            <button class="save-btn" :disabled="isSaving" @click="saveConfig('veo')">
              {{ isSaving ? '保存中...' : '💾 保存' }}
            </button>
            <button class="cancel-btn" @click="cancelEdit('veo')">取消</button>
          </div>
        </div>
      </div>

      <!-- Gemini Image 配置 -->
      <div class="config-section">
        <div class="section-header">
          <h2>🎨 Gemini 图片生成</h2>
          <button 
            v-if="!editMode.geminiImage" 
            class="edit-btn"
            @click="enterEditMode('geminiImage')"
          >
            ✏️ 编辑
          </button>
        </div>
        
        <div v-if="!editMode.geminiImage" class="config-display">
          <div class="config-item">
            <label>API 地址</label>
            <span class="value">{{ config.geminiImage.server }}</span>
          </div>
          <div class="config-item">
            <label>API Key</label>
            <span class="value masked">{{ config.geminiImage.key }}</span>
          </div>
        </div>

        <div v-else class="config-edit">
          <div class="form-group">
            <label>API 地址</label>
            <input v-model="editForm.geminiImage.server" type="text" placeholder="https://..." />
          </div>
          <div class="form-group">
            <label>API Key</label>
            <input v-model="editForm.geminiImage.key" type="text" placeholder="sk-..." />
          </div>
          <div class="button-group">
            <button class="save-btn" :disabled="isSaving" @click="saveConfig('geminiImage')">
              {{ isSaving ? '保存中...' : '💾 保存' }}
            </button>
            <button class="cancel-btn" @click="cancelEdit('geminiImage')">取消</button>
          </div>
        </div>
      </div>

      <!-- 说明 -->
      <div class="config-section">
        <div class="section-header">
          <h2>⚡ Grok 视频生成</h2>
          <button 
            v-if="!editMode.grok" 
            class="edit-btn"
            @click="enterEditMode('grok')"
          >
            ✏️ 编辑
          </button>
        </div>
        
        <div v-if="!editMode.grok" class="config-display">
          <div class="config-item">
            <label>API 地址</label>
            <span class="value">{{ config.grok?.server || '(未设置)' }}</span>
          </div>
          <div class="config-item">
            <label>API Key</label>
            <span class="value masked">{{ config.grok?.key || '(未设置)' }}</span>
          </div>
        </div>

        <div v-else class="config-edit">
          <div class="form-group">
            <label>API 地址</label>
            <input v-model="editForm.grok.server" type="text" placeholder="https://..." />
          </div>
          <div class="form-group">
            <label>API Key</label>
            <input v-model="editForm.grok.key" type="text" placeholder="sk-..." />
          </div>
          <div class="button-group">
            <button class="save-btn" :disabled="isSaving" @click="saveConfig('grok')">
              {{ isSaving ? '保存中...' : '💾 保存' }}
            </button>
            <button class="cancel-btn" @click="cancelEdit('grok')">取消</button>
          </div>
        </div>
      </div>

      <!-- Grok 图片生成配置 -->
      <div class="config-section">
        <div class="section-header">
          <h2>🎨 Grok 图片生成</h2>
          <button 
            v-if="!editMode.grokImage" 
            class="edit-btn"
            @click="enterEditMode('grokImage')"
          >
            ✏️ 编辑
          </button>
        </div>
        
        <div v-if="!editMode.grokImage" class="config-display">
          <div class="config-item">
            <label>API 地址</label>
            <span class="value">{{ config.grokImage?.server || '(未设置)' }}</span>
          </div>
          <div class="config-item">
            <label>API Key</label>
            <span class="value masked">{{ config.grokImage?.key || '(未设置)' }}</span>
          </div>
        </div>

        <div v-else class="config-edit">
          <div class="form-group">
            <label>API 地址</label>
            <input v-model="editForm.grokImage.server" type="text" placeholder="https://..." />
          </div>
          <div class="form-group">
            <label>API Key</label>
            <input v-model="editForm.grokImage.key" type="text" placeholder="sk-..." />
          </div>
          <div class="button-group">
            <button class="save-btn" :disabled="isSaving" @click="saveConfig('grokImage')">
              {{ isSaving ? '保存中...' : '💾 保存' }}
            </button>
            <button class="cancel-btn" @click="cancelEdit('grokImage')">取消</button>
          </div>
        </div>
      </div>

      <!-- 说明 -->
      <div class="info-section">
        <h3>📝 说明</h3>
        <ul>
          <li>每个用户拥有独立的 API 配置，修改后<strong>立即生效</strong></li>
          <li>API Key 以脱敏方式显示，编辑时可查看完整内容</li>
          <li>新用户的配置自动从模板初始化，配置存储在 MongoDB 中</li>
          <li><strong>快捷同步：</strong>如果 API 服务商共用地址和密钥，可使用顶部「快捷配置同步」一键填充，同步后仍可单独修改</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.config-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}

.message {
  padding: 12px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
  font-weight: 500;
}

.message.success {
  background: #d4edda;
  color: #155724;
}

.message.error {
  background: #f8d7da;
  color: #721c24;
}

.loading {
  text-align: center;
  padding: 60px;
  color: #666;
  font-size: 18px;
}

.config-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.config-section {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.section-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.edit-btn {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.edit-btn:hover {
  background: #5a6fd6;
}

.config-display {
  display: grid;
  gap: 16px;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.config-item label {
  min-width: 120px;
  font-weight: 500;
  color: #555;
}

.config-item .value {
  flex: 1;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-family: monospace;
  color: #333;
  word-break: break-all;
}

.config-item .value.masked {
  color: #888;
}

.config-edit {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-weight: 500;
  color: #555;
  font-size: 14px;
}

.form-group input {
  padding: 10px 14px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  font-family: monospace;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.button-group {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.save-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: transform 0.2s, box-shadow 0.2s;
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancel-btn {
  padding: 10px 24px;
  background: #f0f0f0;
  color: #666;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.cancel-btn:hover {
  background: #e0e0e0;
}

.info-section {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px 24px;
}

.info-section h3 {
  margin: 0 0 12px;
  font-size: 16px;
  color: #333;
}

.info-section ul {
  margin: 0;
  padding-left: 20px;
}

.info-section li {
  color: #666;
  line-height: 1.8;
}

.info-section code {
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}

.sync-section {
  border: 2px dashed #667eea;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
}

.sync-desc {
  color: #666;
  font-size: 14px;
  line-height: 1.6;
  margin: 0 0 16px;
}

.sync-checkboxes {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #444;
  cursor: pointer;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #667eea;
  cursor: pointer;
}

.sync-btn {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%) !important;
  color: #1a1a2e !important;
  font-weight: 600 !important;
}

@media (max-width: 600px) {
  .config-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .config-item label {
    min-width: auto;
  }
  
  .config-item .value {
    width: 100%;
  }
}
</style>
