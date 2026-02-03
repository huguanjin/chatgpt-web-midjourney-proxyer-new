import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import { randomUUID } from 'crypto'
import type { CreateImageDto } from './dto/create-image.dto'
import { ConfigService } from '../config/config.service'

// 内存存储图片任务
interface ImageTask {
  id: string
  status: 'processing' | 'completed' | 'failed'
  prompt: string
  model: string
  aspectRatio: string
  imageSize: string
  images?: Array<{
    mimeType: string
    data: string
  }>
  error?: string
  createdAt: number
}

@Injectable()
export class GeminiImageService {
  private readonly logger = new Logger(GeminiImageService.name)
  
  // 内存存储任务
  private tasks: Map<string, ImageTask> = new Map()

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.getGeminiImageConfig()
    this.logger.log(`🔧 Gemini Image Server: ${config.server}`)
    this.logger.log(`🔑 Gemini Image Key: ${config.key ? `****${config.key.slice(-8)}` : 'NOT SET'}`)
  }

  /**
   * 创建 HTTP 客户端（每次使用最新配置）
   */
  private createHttpClient() {
    const config = this.configService.getGeminiImageConfig()
    return axios.create({
      baseURL: config.server,
      timeout: 120000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${config.key}`,
      },
    })
  }

  /**
   * 创建图片生成任务
   */
  async createImage(dto: CreateImageDto): Promise<{ id: string; status: string }> {
    const taskId = randomUUID()
    const model = dto.model || 'gemini-3-pro-image-preview'
    const aspectRatio = dto.aspectRatio || '1:1'
    const imageSize = dto.imageSize || '1K'

    // 创建任务记录
    const task: ImageTask = {
      id: taskId,
      status: 'processing',
      prompt: dto.prompt,
      model,
      aspectRatio,
      imageSize,
      createdAt: Date.now(),
    }
    this.tasks.set(taskId, task)

    this.logger.log(`📤 Creating image task: ${taskId}`)
    this.logger.log(`📝 Prompt: ${dto.prompt}`)
    this.logger.log(`📐 Aspect Ratio: ${aspectRatio}, Size: ${imageSize}`)

    // 异步处理图片生成
    this.processImageGeneration(taskId, dto).catch((error) => {
      this.logger.error(`❌ Image generation failed: ${error.message}`)
    })

    return { id: taskId, status: 'processing' }
  }

  /**
   * 异步处理图片生成
   */
  private async processImageGeneration(taskId: string, dto: CreateImageDto): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) return

    try {
      const model = dto.model || 'gemini-3-pro-image-preview'
      const aspectRatio = dto.aspectRatio || '1:1'
      const imageSize = dto.imageSize || '1K'

      // 构建请求内容
      const parts: any[] = [{ text: dto.prompt }]

      // 如果有参考图片，添加到请求中
      if (dto.referenceImages && dto.referenceImages.length > 0) {
        for (const img of dto.referenceImages) {
          parts.push({
            inline_data: {
              mime_type: img.mimeType,
              data: img.data,
            },
          })
        }
      }

      const payload = {
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio,
            imageSize,
          },
        },
      }

      this.logger.log(`📤 Sending request to Gemini API for task: ${taskId}`)

      const httpClient = this.createHttpClient()
      const response = await httpClient.post(
        `/v1beta/models/${model}:generateContent`,
        payload,
      )

      this.logger.log(`✅ Gemini API response received for task: ${taskId}`)

      // 解析响应，提取图片
      const images = this.extractImages(response.data)

      if (images.length > 0) {
        task.status = 'completed'
        task.images = images
        this.logger.log(`✅ Task ${taskId} completed with ${images.length} image(s)`)
      } else {
        task.status = 'failed'
        task.error = 'No images generated'
        this.logger.warn(`⚠️ Task ${taskId} completed but no images found`)
      }
    } catch (error: any) {
      task.status = 'failed'
      task.error = error.response?.data?.error?.message || error.message
      this.logger.error(`❌ Task ${taskId} failed: ${task.error}`)
    }

    this.tasks.set(taskId, task)
  }

  /**
   * 从 Gemini 响应中提取图片
   * 支持两种格式：inlineData（驼峰）和 inline_data（下划线）
   */
  private extractImages(responseData: any): Array<{ mimeType: string; data: string }> {
    const images: Array<{ mimeType: string; data: string }> = []

    try {
      const candidates = responseData?.candidates || []
      for (const candidate of candidates) {
        const content = candidate?.content
        if (content?.parts) {
          for (const part of content.parts) {
            // 支持驼峰命名 (inlineData) 和下划线命名 (inline_data)
            const inlineData = part.inlineData || part.inline_data
            if (inlineData) {
              images.push({
                mimeType: inlineData.mimeType || inlineData.mime_type,
                data: inlineData.data,
              })
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`❌ Error extracting images: ${error}`)
    }

    return images
  }

  /**
   * 查询图片任务状态
   */
  async queryImage(taskId: string): Promise<any> {
    this.logger.log(`🔍 Querying image task: ${taskId}`)

    const task = this.tasks.get(taskId)
    if (!task) {
      return {
        id: taskId,
        status: 'not_found',
        error: 'Task not found',
      }
    }

    const result: any = {
      id: task.id,
      status: task.status,
      prompt: task.prompt,
      model: task.model,
      aspectRatio: task.aspectRatio,
      imageSize: task.imageSize,
      createdAt: task.createdAt,
    }

    if (task.status === 'completed' && task.images) {
      result.images = task.images
    }

    if (task.status === 'failed' && task.error) {
      result.error = task.error
    }

    return result
  }

  /**
   * 直接生成图片（同步方式，返回完整结果）
   */
  async generateImageSync(dto: CreateImageDto): Promise<any> {
    const model = dto.model || 'gemini-3-pro-image-preview'
    const aspectRatio = dto.aspectRatio || '1:1'
    const imageSize = dto.imageSize || '1K'

    this.logger.log(`📤 Generating image synchronously`)
    this.logger.log(`📝 Prompt: ${dto.prompt}`)
    this.logger.log(`📐 Aspect Ratio: ${aspectRatio}, Size: ${imageSize}`)

    // 构建请求内容
    const parts: any[] = []

    // 添加文本提示词
    if (dto.prompt) {
      parts.push({ text: dto.prompt })
    }

    // 如果有参考图片，添加到请求中（用于图片编辑）
    if (dto.referenceImages && dto.referenceImages.length > 0) {
      for (const img of dto.referenceImages) {
        parts.push({
          inline_data: {
            mime_type: img.mimeType,
            data: img.data,
          },
        })
      }
    }

    // 确保 parts 不为空
    if (parts.length === 0) {
      throw new Error('Prompt is required')
    }

    const payload = {
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio,
          imageSize,
        },
      },
    }

    this.logger.debug(`📦 Full Payload: ${JSON.stringify(payload, null, 2)}`)

    // 使用动态配置创建 HTTP 客户端
    const httpClient = this.createHttpClient()
    const response = await httpClient.post(
      `/v1beta/models/${model}:generateContent`,
      payload,
    )

    const images = this.extractImages(response.data)

    return {
      status: images.length > 0 ? 'completed' : 'failed',
      images,
      raw: response.data,
    }
  }
}
