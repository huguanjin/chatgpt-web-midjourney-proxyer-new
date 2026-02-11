<script setup lang="ts">
import { computed, ref } from 'vue'
import { geminiImageApi, type GeminiImageResult } from '@/api'

const isLoading = ref(false)
const imageForm = ref({
  model: 'gemini-3-pro-image-preview',
  prompt: '',
  aspectRatio: '1:1' as string,
  imageSize: '1K' as string,
  // Grok/GPT 模型参数
  size: '1024x1024' as string,
  n: 1,
})

// 判断当前模型是否为 Grok/GPT 图片模型
const isGrokModel = computed(() => {
  const m = imageForm.value.model
  return (m.startsWith('grok-') && m.includes('image')) || m.startsWith('gpt-image')
})

// 自定义模型输入
const modelCustom = ref(false)

// 参考图片
const referenceFiles = ref<File[]>([])
const fileInput = ref<HTMLInputElement | null>(null)

// 生成的图片结果（url: 后端文件路径，data: 兼容旧格式 Base64）
const generatedImages = ref<Array<{ mimeType: string; url?: string; data?: string }>>([])
const currentTaskId = ref<string | null>(null)
const taskStatus = ref<string>('')
const errorMessage = ref<string>('')

// 历史记录
interface ImageHistory {
  id: string
  prompt: string
  aspectRatio: string
  imageSize: string
  images: Array<{ mimeType: string; url?: string; data?: string }>
  createdAt: number
}
const imageHistory = ref<ImageHistory[]>([])

// 从 localStorage 加载历史
const loadHistory = () => {
  const saved = localStorage.getItem('gemini_image_history')
  if (saved) {
    try {
      imageHistory.value = JSON.parse(saved)
    } catch (e) {
      imageHistory.value = []
    }
  }
}

// 保存历史到 localStorage
const saveHistory = () => {
  localStorage.setItem('gemini_image_history', JSON.stringify(imageHistory.value))
}

// 初始化加载历史
loadHistory()

// 处理参考图片选择
const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files) {
    const newFiles = Array.from(input.files)
    referenceFiles.value = [...referenceFiles.value, ...newFiles]
  }
  input.value = ''
}

const removeFile = (index: number) => {
  referenceFiles.value.splice(index, 1)
}

const getFilePreviewUrl = (file: File) => {
  return URL.createObjectURL(file)
}

// 生成图片（同步方式）
const generateImage = async () => {
  if (!imageForm.value.prompt.trim()) {
    alert('请输入提示词')
    return
  }

  isLoading.value = true
  generatedImages.value = []
  errorMessage.value = ''
  taskStatus.value = '生成中...'

  try {
    const params: any = {
      model: imageForm.value.model,
      prompt: imageForm.value.prompt,
    }
    if (isGrokModel.value) {
      params.size = imageForm.value.size
      params.n = imageForm.value.n
    } else {
      params.aspectRatio = imageForm.value.aspectRatio
      params.imageSize = imageForm.value.imageSize
    }
    const response = await geminiImageApi.generateImage(
      params,
      referenceFiles.value.length > 0 ? referenceFiles.value : undefined,
    )

    const data = response.data

    if (data.status === 'completed' && data.images?.length > 0) {
      generatedImages.value = data.images
      taskStatus.value = '生成完成'

      // 保存到历史
      const historyItem: ImageHistory = {
        id: Date.now().toString(),
        prompt: imageForm.value.prompt,
        aspectRatio: imageForm.value.aspectRatio,
        imageSize: imageForm.value.imageSize,
        images: data.images,
        createdAt: Date.now(),
      }
      imageHistory.value.unshift(historyItem)
      // 只保留最近 20 条
      if (imageHistory.value.length > 20) {
        imageHistory.value = imageHistory.value.slice(0, 20)
      }
      saveHistory()

      // 清空表单
      imageForm.value.prompt = ''
      referenceFiles.value = []
    } else {
      taskStatus.value = '生成失败'
      errorMessage.value = '未能生成图片'
    }
  } catch (error: any) {
    console.error('生成失败', error)
    taskStatus.value = '生成失败'
    errorMessage.value = error.response?.data?.message || error.message
  } finally {
    isLoading.value = false
  }
}

// 创建异步任务
const createImageTask = async () => {
  if (!imageForm.value.prompt.trim()) {
    alert('请输入提示词')
    return
  }

  isLoading.value = true
  generatedImages.value = []
  errorMessage.value = ''
  taskStatus.value = '任务创建中...'

  try {
    const createParams: any = {
      model: imageForm.value.model,
      prompt: imageForm.value.prompt,
    }
    if (isGrokModel.value) {
      createParams.size = imageForm.value.size
      createParams.n = imageForm.value.n
    } else {
      createParams.aspectRatio = imageForm.value.aspectRatio
      createParams.imageSize = imageForm.value.imageSize
    }
    const response = await geminiImageApi.createImage(
      createParams,
      referenceFiles.value.length > 0 ? referenceFiles.value : undefined,
    )

    currentTaskId.value = response.data.id
    taskStatus.value = '处理中...'

    // 开始轮询
    pollTaskStatus(response.data.id)
  } catch (error: any) {
    console.error('创建任务失败', error)
    taskStatus.value = '创建失败'
    errorMessage.value = error.response?.data?.message || error.message
    isLoading.value = false
  }
}

// 轮询任务状态
const pollTaskStatus = async (taskId: string) => {
  const maxAttempts = 60
  let attempts = 0

  const poll = async () => {
    if (attempts >= maxAttempts) {
      taskStatus.value = '超时'
      errorMessage.value = '任务处理超时'
      isLoading.value = false
      return
    }
    attempts++

    try {
      const response = await geminiImageApi.queryImage(taskId)
      const data = response.data

      if (data.status === 'completed') {
        if (data.images && data.images.length > 0) {
          generatedImages.value = data.images
          taskStatus.value = '生成完成'

          // 保存到历史
          const historyItem: ImageHistory = {
            id: taskId,
            prompt: data.prompt || imageForm.value.prompt,
            aspectRatio: data.aspectRatio || imageForm.value.aspectRatio,
            imageSize: data.imageSize || imageForm.value.imageSize,
            images: data.images,
            createdAt: data.createdAt || Date.now(),
          }
          imageHistory.value.unshift(historyItem)
          if (imageHistory.value.length > 20) {
            imageHistory.value = imageHistory.value.slice(0, 20)
          }
          saveHistory()

          // 清空表单
          imageForm.value.prompt = ''
          referenceFiles.value = []
        } else {
          taskStatus.value = '生成失败'
          errorMessage.value = '未能生成图片'
        }
        isLoading.value = false
        return
      } else if (data.status === 'failed') {
        taskStatus.value = '生成失败'
        errorMessage.value = data.error || '未知错误'
        isLoading.value = false
        return
      } else {
        taskStatus.value = '处理中...'
        setTimeout(poll, 2000)
      }
    } catch (error) {
      console.error('查询失败', error)
      setTimeout(poll, 3000)
    }
  }

  poll()
}

// 下载图片 - 支持多种格式
const downloadImage = (image: { mimeType: string; url?: string; data?: string }, index: number, format: 'original' | 'jpg' | 'png' = 'original') => {
  if (format === 'original') {
    // 原始格式直接下载
    const link = document.createElement('a')
    link.href = getImageSrc(image)
    const ext = image.mimeType.split('/')[1] || 'png'
    link.download = `gemini-image-${Date.now()}-${index}.${ext}`
    link.click()
  } else {
    // 转换格式后下载
    convertAndDownload(image, index, format)
  }
}

// 转换图片格式并下载
const convertAndDownload = (image: { mimeType: string; url?: string; data?: string }, index: number, format: 'jpg' | 'png') => {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    
    if (format === 'jpg') {
      // JPG 不支持透明，填充白色背景
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    
    ctx.drawImage(img, 0, 0)
    
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg'
    const quality = format === 'jpg' ? 0.95 : undefined
    
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `gemini-image-${Date.now()}-${index}.${format}`
        link.click()
        URL.revokeObjectURL(url)
      }
    }, mimeType, quality)
  }
  img.src = getImageSrc(image)
}

// 下载格式选择状态
const showDownloadMenu = ref<number | null>(null)

const toggleDownloadMenu = (index: number) => {
  showDownloadMenu.value = showDownloadMenu.value === index ? null : index
}

// 点击外部关闭菜单
const closeDownloadMenu = () => {
  showDownloadMenu.value = null
}

// 从历史加载
const loadFromHistory = (item: ImageHistory) => {
  generatedImages.value = item.images
  taskStatus.value = '从历史加载'
}

// 删除历史记录
const deleteHistory = (id: string) => {
  imageHistory.value = imageHistory.value.filter(h => h.id !== id)
  saveHistory()
}

// 清空所有历史
const clearAllHistory = () => {
  if (confirm('确定要清空所有历史记录吗？')) {
    imageHistory.value = []
    saveHistory()
  }
}

// 格式化时间
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString()
}

// 获取图片 src - 支持 URL（文件存储）和 Base64（旧兼容）
const getImageSrc = (image: { mimeType: string; url?: string; data?: string }) => {
  if (image.url) {
    // 文件存储模式：使用与 API 相同的 base URL（开发模式走代理，生产模式走 Nginx）
    const base = import.meta.env.VITE_API_BASE || ''
    return `${base}${image.url}`
  }
  // 旧 Base64 模式兼容
  return `data:${image.mimeType};base64,${image.data}`
}
</script>

<template>
  <div class="image-generator">
    <h1>🎨 AI 图片创作</h1>

    <div class="main-content">
      <!-- 左侧：表单 -->
      <div class="form-panel">
        <div class="form-group">
          <label>模型</label>
          <div class="model-select">
            <select v-if="!modelCustom" v-model="imageForm.model">
              <optgroup label="Gemini">
                <option value="gemini-3-pro-image-preview">gemini-3-pro-image-preview</option>
                <option value="gemini-2.0-flash-exp-image-generation">gemini-2.0-flash-exp</option>
              </optgroup>
              <optgroup label="Grok">
                <option value="grok-4-1-image">grok-4-1-image</option>
              </optgroup>
              <optgroup label="GPT">
                <option value="gpt-image-1.5">gpt-image-1.5</option>
              </optgroup>
            </select>
            <input
              v-else
              v-model="imageForm.model"
              type="text"
              placeholder="输入自定义模型名称"
            />
            <button class="toggle-btn" @click="modelCustom = !modelCustom">
              {{ modelCustom ? '选择' : '自定义' }}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>提示词</label>
          <textarea
            v-model="imageForm.prompt"
            rows="4"
            placeholder="描述你想要生成的图片内容..."
          ></textarea>
        </div>

        <!-- Gemini 模型参数 -->
        <div v-if="!isGrokModel" class="form-row">
          <div class="form-group">
            <label>宽高比</label>
            <select v-model="imageForm.aspectRatio">
              <option value="1:1">1:1 (正方形)</option>
              <option value="16:9">16:9 (横屏)</option>
              <option value="9:16">9:16 (竖屏)</option>
              <option value="4:3">4:3</option>
              <option value="3:4">3:4</option>
            </select>
          </div>

          <div class="form-group">
            <label>图片尺寸</label>
            <select v-model="imageForm.imageSize">
              <option value="1K">1K (标准)</option>
              <option value="2K">2K (高清)</option>
              <option value="4K">4K (超清)</option>
            </select>
          </div>
        </div>

        <!-- Grok/GPT 模型参数 -->
        <div v-else class="form-row">
          <div class="form-group">
            <label>图片尺寸</label>
            <select v-model="imageForm.size">
              <option value="1024x1024">1024×1024 (正方形)</option>
              <option value="1536x1024">1536×1024 (横屏)</option>
              <option value="1024x1536">1024×1536 (竖屏)</option>
            </select>
          </div>

          <div class="form-group">
            <label>生成数量</label>
            <select v-model.number="imageForm.n">
              <option :value="1">1 张</option>
              <option :value="2">2 张</option>
              <option :value="3">3 张</option>
              <option :value="4">4 张</option>
            </select>
          </div>
        </div>

        <!-- 参考图片上传 -->
        <div class="form-group">
          <label>参考图片 (可选，用于图片编辑)</label>
          <div class="file-upload">
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              multiple
              @change="handleFileSelect"
              style="display: none"
            />
            <button class="upload-btn" @click="fileInput?.click()">
              📎 添加参考图
            </button>
            <span class="file-hint">支持 JPG、PNG 格式</span>
          </div>
          <div v-if="referenceFiles.length > 0" class="file-preview-list">
            <div v-for="(file, index) in referenceFiles" :key="index" class="file-preview-item">
              <img :src="getFilePreviewUrl(file)" :alt="file.name" />
              <button class="remove-btn" @click="removeFile(index)">×</button>
            </div>
          </div>
        </div>

        <div class="action-buttons">
          <button
            class="generate-btn"
            :disabled="isLoading || !imageForm.prompt.trim()"
            @click="generateImage"
          >
            {{ isLoading ? '生成中...' : '🚀 立即生成' }}
          </button>
        </div>

        <div v-if="taskStatus" class="status-info">
          <span class="status-text">状态: {{ taskStatus }}</span>
          <span v-if="errorMessage" class="error-text">{{ errorMessage }}</span>
        </div>
      </div>

      <!-- 右侧：结果展示 -->
      <div class="result-panel">
        <h2>生成结果</h2>
        
        <div v-if="generatedImages.length > 0" class="image-grid">
          <div v-for="(image, index) in generatedImages" :key="index" class="image-item">
            <img :src="getImageSrc(image)" :alt="`生成图片 ${index + 1}`" />
            <div class="image-actions">
              <div class="download-dropdown">
                <button @click="toggleDownloadMenu(index)">📥 下载 ▼</button>
                <div v-if="showDownloadMenu === index" class="dropdown-menu" @mouseleave="closeDownloadMenu">
                  <button @click="downloadImage(image, index, 'original'); closeDownloadMenu()">
                    原始格式 ({{ image.mimeType.split('/')[1]?.toUpperCase() || 'IMG' }})
                  </button>
                  <button @click="downloadImage(image, index, 'jpg'); closeDownloadMenu()">
                    JPG 格式
                  </button>
                  <button @click="downloadImage(image, index, 'png'); closeDownloadMenu()">
                    PNG 格式
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="empty-result">
          <p>暂无生成结果</p>
          <p class="hint">输入提示词开始创作</p>
        </div>
      </div>
    </div>

    <!-- 历史记录 -->
    <div class="history-section">
      <div class="history-header">
        <h2>📜 历史记录</h2>
        <button v-if="imageHistory.length > 0" class="clear-btn" @click="clearAllHistory">
          清空全部
        </button>
      </div>

      <div v-if="imageHistory.length > 0" class="history-list">
        <div v-for="item in imageHistory" :key="item.id" class="history-item">
          <div class="history-preview">
            <img
              v-if="item.images[0]"
              :src="getImageSrc(item.images[0])"
              alt="历史图片"
              @click="loadFromHistory(item)"
            />
          </div>
          <div class="history-info">
            <p class="history-prompt">{{ item.prompt }}</p>
            <p class="history-meta">
              {{ item.aspectRatio }} | {{ item.imageSize }} | {{ formatTime(item.createdAt) }}
            </p>
          </div>
          <div class="history-actions">
            <button @click="loadFromHistory(item)">查看</button>
            <button class="delete-btn" @click="deleteHistory(item.id)">删除</button>
          </div>
        </div>
      </div>

      <div v-else class="empty-history">
        <p>暂无历史记录</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-generator {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

.main-content {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 30px;
  margin-bottom: 40px;
}

.form-panel {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.model-select {
  display: flex;
  gap: 8px;
}

.model-select select,
.model-select input {
  flex: 1;
}

.toggle-btn {
  padding: 10px 16px;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background: #e0e0e0;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.file-upload {
  display: flex;
  align-items: center;
  gap: 12px;
}

.upload-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: transform 0.2s;
}

.upload-btn:hover {
  transform: translateY(-1px);
}

.file-hint {
  font-size: 12px;
  color: #888;
}

.file-preview-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.file-preview-item {
  position: relative;
  width: 80px;
  height: 80px;
}

.file-preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.file-preview-item .remove-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ff4757;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}

.action-buttons {
  margin-top: 24px;
}

.generate-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-info {
  margin-top: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.status-text {
  display: block;
  color: #666;
}

.error-text {
  display: block;
  color: #ff4757;
  margin-top: 8px;
  font-size: 14px;
}

.result-panel {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.result-panel h2 {
  margin-bottom: 20px;
  color: #333;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.image-item {
  background: #f8f9fa;
  border-radius: 12px;
  overflow: hidden;
}

.image-item img {
  width: 100%;
  display: block;
}

.image-actions {
  padding: 12px;
  display: flex;
  justify-content: center;
  gap: 12px;
}

.image-actions button {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.image-actions button:hover {
  background: #5a6fd6;
}

/* 下载格式下拉菜单 */
.download-dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-menu {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 100;
  min-width: 160px;
}

.dropdown-menu button {
  display: block;
  width: 100%;
  padding: 10px 16px;
  background: white;
  color: #333;
  border: none;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  font-size: 14px;
  text-align: left;
  transition: background 0.2s;
}

.dropdown-menu button:last-child {
  border-bottom: none;
}

.dropdown-menu button:hover {
  background: #f5f7ff;
  color: #667eea;
}

.empty-result {
  text-align: center;
  padding: 60px 20px;
  color: #888;
}

.empty-result .hint {
  font-size: 14px;
  margin-top: 8px;
}

.history-section {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.history-header h2 {
  margin: 0;
  color: #333;
}

.clear-btn {
  padding: 8px 16px;
  background: #ff4757;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.clear-btn:hover {
  background: #ff3344;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 10px;
  align-items: center;
}

.history-preview {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
}

.history-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.history-preview img:hover {
  transform: scale(1.05);
}

.history-info {
  flex: 1;
  min-width: 0;
}

.history-prompt {
  margin: 0 0 8px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-meta {
  margin: 0;
  font-size: 12px;
  color: #888;
}

.history-actions {
  display: flex;
  gap: 8px;
}

.history-actions button {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  background: #667eea;
  color: white;
}

.history-actions .delete-btn {
  background: #ff4757;
}

.empty-history {
  text-align: center;
  padding: 40px;
  color: #888;
}

@media (max-width: 900px) {
  .main-content {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
