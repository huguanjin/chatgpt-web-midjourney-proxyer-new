import axios from 'axios'

// NestJS 后端地址
const API_BASE = 'http://localhost:3003'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 调试：打印请求
api.interceptors.request.use((config) => {
  console.log('📤 API Request:', config.method?.toUpperCase(), config.url)
  console.log('📦 Request Data:', config.data)
  return config
})

// ============ Sora API ============

export interface CreateSoraVideoParams {
  model: string
  prompt: string
  orientation?: 'portrait' | 'landscape'
  duration?: number
  watermark?: boolean
  images?: string[]
}

export interface CreateCharacterParams {
  url?: string
  timestamps: string
  from_task?: string
}

export const soraApi = {
  // 创建视频
  createVideo: (params: CreateSoraVideoParams) =>
    api.post('/v1/video/create', params),

  // 查询视频状态
  queryVideo: (id: string) =>
    api.get(`/v1/video/query?id=${encodeURIComponent(id)}`),

  // 创建角色
  createCharacter: (params: CreateCharacterParams) =>
    api.post('/v1/video/character', params),
}

// ============ VEO API ============

export interface CreateVeoVideoParams {
  model: string
  prompt: string
  size?: '720x1280' | '1280x720'
  seconds?: number
  enable_upsample?: boolean
}

export const veoApi = {
  // 创建视频（支持参考图上传）
  createVideo: (params: CreateVeoVideoParams, files?: File[]) => {
    const formData = new FormData()
    formData.append('model', params.model)
    formData.append('prompt', params.prompt)
    if (params.size) formData.append('size', params.size)
    if (params.seconds) formData.append('seconds', String(params.seconds))
    
    // 添加参考图
    if (files && files.length > 0) {
      for (const file of files) {
        formData.append('input_reference', file)
      }
    }
    
    return api.post('/v1/veo/create', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // 查询视频状态
  queryVideo: (id: string) =>
    api.get(`/v1/veo/query?id=${encodeURIComponent(id)}`),
}

// ============ Gemini Image API ============

export interface CreateGeminiImageParams {
  model?: string
  prompt: string
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
  imageSize?: '1K' | '2K' | '4K'
}

export interface GeminiImageResult {
  id: string
  status: 'processing' | 'completed' | 'failed' | 'not_found'
  prompt?: string
  model?: string
  aspectRatio?: string
  imageSize?: string
  images?: Array<{
    mimeType: string
    data: string
  }>
  error?: string
  createdAt?: number
}

export const geminiImageApi = {
  // 创建图片（异步）
  createImage: (params: CreateGeminiImageParams, files?: File[]) => {
    // 有参考图时使用 FormData
    if (files && files.length > 0) {
      const formData = new FormData()
      formData.append('prompt', params.prompt)
      if (params.model) formData.append('model', params.model)
      if (params.aspectRatio) formData.append('aspectRatio', params.aspectRatio)
      if (params.imageSize) formData.append('imageSize', params.imageSize)
      
      for (const file of files) {
        formData.append('reference_images', file)
      }
      
      return api.post('/v1/image/create-with-ref', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    }
    
    // 无参考图时直接发 JSON
    return api.post('/v1/image/create', params)
  },

  // 同步生成图片（等待结果）
  generateImage: (params: CreateGeminiImageParams, files?: File[]) => {
    // 有参考图时使用 FormData
    if (files && files.length > 0) {
      const formData = new FormData()
      formData.append('prompt', params.prompt)
      if (params.model) formData.append('model', params.model)
      if (params.aspectRatio) formData.append('aspectRatio', params.aspectRatio)
      if (params.imageSize) formData.append('imageSize', params.imageSize)
      
      for (const file of files) {
        formData.append('reference_images', file)
      }
      
      return api.post('/v1/image/generate-with-ref', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 180000,
      })
    }
    
    // 无参考图时直接发 JSON
    return api.post('/v1/image/generate', params, {
      timeout: 180000,
    })
  },

  // 查询图片状态
  queryImage: (id: string) =>
    api.get<GeminiImageResult>(`/v1/image/query?id=${encodeURIComponent(id)}`),
}

// ============ Config API ============

export interface ServiceConfig {
  server: string
  key: string
  characterServer?: string
  characterKey?: string
}

export interface AppConfig {
  port: number
  sora: ServiceConfig
  veo: ServiceConfig
  geminiImage: ServiceConfig
}

export const configApi = {
  // 获取配置（隐藏敏感信息）
  getConfig: () =>
    api.get<{ status: string; data: AppConfig }>('/v1/config'),

  // 获取完整配置（包含 API Key）
  getFullConfig: () =>
    api.get<{ status: string; data: AppConfig }>('/v1/config/full'),

  // 更新全部配置
  updateConfig: (config: Partial<AppConfig>) =>
    api.put<{ status: string; message: string; data: AppConfig }>('/v1/config', config),

  // 更新单个服务配置
  updateServiceConfig: (service: 'sora' | 'veo' | 'geminiImage', config: Partial<ServiceConfig>) =>
    api.put<{ status: string; message: string; data: AppConfig }>(`/v1/config/${service}`, config),
}

export default api
