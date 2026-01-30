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

export default api
