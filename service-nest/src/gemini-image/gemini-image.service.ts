import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import { randomUUID } from 'crypto'
import { CreateImageDto } from './dto/create-image.dto'
import { ConfigService } from '../config/config.service'
import { DatabaseService } from '../database/database.service'
import { FileStorageService } from '../file-storage/file-storage.service'
import { UserConfigService } from '../user-config/user-config.service'

// 图片任务接口
interface ImageTask {
  taskId: string
  username: string
  status: 'processing' | 'completed' | 'failed'
  prompt: string
  model: string
  aspectRatio: string
  imageSize: string
  images?: Array<{
    mimeType: string
    url: string      // 文件 URL 路径（替代 Base64 data）
  }>
  error?: string
  createdAt: number
}

@Injectable()
export class GeminiImageService {
  private readonly logger = new Logger(GeminiImageService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly fileStorageService: FileStorageService,
    private readonly userConfigService: UserConfigService,
  ) {
    const config = this.configService.getGeminiImageConfig()
    this.logger.log(`🔧 Gemini Image Server: ${config.server}`)
    this.logger.log(`🔑 Gemini Image Key: ${config.key ? `****${config.key.slice(-8)}` : 'NOT SET'}`)
  }

  /**
   * 获取用户级 API 配置（优先用户配置，回退全局配置）
   */
  private async getUserGeminiImageConfig(username: string) {
    try {
      const userConfig = await this.userConfigService.getUserConfig(username)
      if (userConfig.geminiImage?.server) {
        return userConfig.geminiImage
      }
    } catch (e) {
      this.logger.warn(`⚠️ Failed to load user config for ${username}, using global`)
    }
    return this.configService.getGeminiImageConfig()
  }

  private async getUserGrokImageConfig(username: string) {
    try {
      const userConfig = await this.userConfigService.getUserConfig(username)
      if (userConfig.grokImage?.server) {
        return userConfig.grokImage
      }
    } catch (e) {
      this.logger.warn(`⚠️ Failed to load user config for ${username}, using global`)
    }
    return this.configService.getGrokImageConfig()
  }

  /**
   * 创建 HTTP 客户端（Gemini，使用用户配置）
   */
  private createHttpClientWithConfig(config: { server: string; key: string }) {
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
   * 创建 HTTP 客户端（Grok/OpenAI 兼容，使用用户配置）
   */
  private createGrokHttpClientWithConfig(config: { server: string; key: string }) {
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
   * 判断是否为 Grok/OpenAI 图片模型
   */
  private isGrokImageModel(model: string): boolean {
    return model.startsWith('grok-') && model.includes('image')
      || model.startsWith('gpt-image')
  }

  /**
   * 创建图片生成任务
   */
  async createImage(dto: CreateImageDto, username: string): Promise<{ id: string; status: string }> {
    const taskId = randomUUID()
    const model = dto.model || 'gemini-3-pro-image-preview'
    const aspectRatio = dto.aspectRatio || '1:1'
    const imageSize = dto.imageSize || '1K'

    // 创建任务记录到 MongoDB
    const task: ImageTask = {
      taskId,
      username,
      status: 'processing',
      prompt: dto.prompt,
      model,
      aspectRatio,
      imageSize,
      createdAt: Date.now(),
    }
    await this.saveTask(task)

    this.logger.log(`📤 Creating image task: ${taskId} for user: ${username}`)
    this.logger.log(`📝 Prompt: ${dto.prompt}`)
    this.logger.log(`📐 Aspect Ratio: ${aspectRatio}, Size: ${imageSize}`)

    // 异步处理图片生成
    this.processImageGeneration(taskId, dto, username).catch((error) => {
      this.logger.error(`❌ Image generation failed: ${error.message}`)
    })

    return { id: taskId, status: 'processing' }
  }

  /**
   * 异步处理图片生成
   */
  private async processImageGeneration(taskId: string, dto: CreateImageDto, username: string): Promise<void> {
    const task = await this.getTask(taskId)
    if (!task) return

    try {
      const model = dto.model || 'gemini-3-pro-image-preview'

      let rawImages: Array<{ mimeType: string; data: string }>

      if (this.isGrokImageModel(model)) {
        rawImages = await this.callGrokImageApi(dto, username)
      } else {
        rawImages = await this.callGeminiImageApi(dto, username)
      }

      if (rawImages.length > 0) {
        const savedImages = this.fileStorageService.saveBase64Images(username, rawImages, taskId)
        task.status = 'completed'
        task.images = savedImages
        this.logger.log(`✅ Task ${taskId} completed with ${savedImages.length} image(s) saved to disk`)
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

    await this.saveTask(task)
  }

  /**
   * 调用 Gemini API 生成图片
   */
  private async callGeminiImageApi(dto: CreateImageDto, username: string): Promise<Array<{ mimeType: string; data: string }>> {
    const model = dto.model || 'gemini-3-pro-image-preview'
    const aspectRatio = dto.aspectRatio || '1:1'
    const imageSize = dto.imageSize || '1K'

    const parts: any[] = [{ text: dto.prompt }]

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
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio, imageSize },
      },
    }

    this.logger.log(`📤 Sending request to Gemini API, model: ${model}`)
    const geminiConfig = await this.getUserGeminiImageConfig(username)
    const httpClient = this.createHttpClientWithConfig(geminiConfig)
    const response = await httpClient.post(`/v1beta/models/${model}:generateContent`, payload)
    this.logger.log(`✅ Gemini API response received`)

    return this.extractImages(response.data)
  }

  /**
   * 调用 Grok/OpenAI 兼容图片 API
   * 请求格式: { model, size, n, prompt, image? }
   * 响应格式: { data: [{ b64_json, url }] }
   */
  private async callGrokImageApi(dto: CreateImageDto, username: string): Promise<Array<{ mimeType: string; data: string }>> {
    const model = dto.model || 'grok-4-1-image'
    const size = dto.size || '1024x1024'
    const n = dto.n || 1

    const payload: any = {
      model,
      size,
      n,
      prompt: dto.prompt,
      response_format: 'b64_json',
    }

    // 如果有参考图片（垫图），转为 base64 URL 数组
    if (dto.referenceImages && dto.referenceImages.length > 0) {
      payload.image = dto.referenceImages.map(
        img => `data:${img.mimeType};base64,${img.data}`,
      )
    }

    this.logger.log(`📤 Sending request to Grok Image API, model: ${model}, size: ${size}, n: ${n}`)
    const grokConfig = await this.getUserGrokImageConfig(username)
    this.logger.log(`🔧 Grok Image Server: ${grokConfig.server}`)
    const httpClient = this.createGrokHttpClientWithConfig(grokConfig)

    // 先尝试一次请求，如果 API 服务商不支持 n 参数（只返回 1 张），则并发补发剩余请求
    const response = await httpClient.post('/v1/images/generations', payload)
    this.logger.log(`✅ Grok Image API response received`)

    const firstBatch = this.extractGrokImages(response.data)

    if (n > 1 && firstBatch.length < n) {
      this.logger.log(`⚠️ API returned ${firstBatch.length}/${n} images, sending ${n - firstBatch.length} parallel requests`)
      const remaining = n - firstBatch.length
      const singlePayload = { ...payload, n: 1 }
      const promises = Array.from({ length: remaining }, () =>
        httpClient.post('/v1/images/generations', singlePayload)
          .then(r => this.extractGrokImages(r.data))
          .catch(err => {
            this.logger.warn(`⚠️ Parallel request failed: ${err.message}`)
            return [] as Array<{ mimeType: string; data: string }>
          }),
      )
      const extraResults = await Promise.all(promises)
      for (const imgs of extraResults) {
        firstBatch.push(...imgs)
      }
      this.logger.log(`✅ Total images collected: ${firstBatch.length}`)
    }

    return firstBatch
  }

  /**
   * 从 Grok/OpenAI 图片响应中提取图片
   * 响应格式: { data: [{ b64_json?, url?, revised_prompt? }] }
   */
  private extractGrokImages(responseData: any): Array<{ mimeType: string; data: string }> {
    const images: Array<{ mimeType: string; data: string }> = []

    try {
      const dataList = responseData?.data || []
      for (const item of dataList) {
        if (item.b64_json) {
          images.push({
            mimeType: 'image/png',
            data: item.b64_json,
          })
        } else if (item.url) {
          // URL 模式暂不处理，记录日志
          this.logger.log(`📎 Grok returned image URL: ${item.url}`)
        }
      }
    } catch (error) {
      this.logger.error(`❌ Error extracting Grok images: ${error}`)
    }

    return images
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

    const task = await this.getTask(taskId)
    if (!task) {
      return {
        id: taskId,
        status: 'not_found',
        error: 'Task not found',
      }
    }

    const result: any = {
      id: task.taskId,
      status: task.status,
      prompt: task.prompt,
      model: task.model,
      aspectRatio: task.aspectRatio,
      imageSize: task.imageSize,
      username: task.username,
      createdAt: task.createdAt,
    }

    if (task.status === 'completed' && task.images) {
      // 返回文件 URL（不再是 Base64）
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
  async generateImageSync(dto: CreateImageDto, username: string): Promise<any> {
    const taskId = randomUUID()
    const model = dto.model || 'gemini-3-pro-image-preview'

    this.logger.log(`📤 Generating image synchronously for user: ${username}`)
    this.logger.log(`📝 Prompt: ${dto.prompt}`)
    this.logger.log(`🤖 Model: ${model}`)

    let rawImages: Array<{ mimeType: string; data: string }>

    if (this.isGrokImageModel(model)) {
      rawImages = await this.callGrokImageApi(dto, username)
    } else {
      rawImages = await this.callGeminiImageApi(dto, username)
    }

    // 将 Base64 图片保存为文件
    const savedImages = rawImages.length > 0
      ? this.fileStorageService.saveBase64Images(username, rawImages, taskId)
      : []

    const status = savedImages.length > 0 ? 'completed' : 'failed'

    // 同步模式也记录到 MongoDB image_tasks
    const task: ImageTask = {
      taskId,
      username,
      status: status as 'completed' | 'failed',
      prompt: dto.prompt || '',
      model,
      aspectRatio: dto.aspectRatio || dto.size || '1:1',
      imageSize: dto.imageSize || dto.size || '1K',
      images: savedImages.length > 0 ? savedImages : undefined,
      error: savedImages.length === 0 ? 'No images generated' : undefined,
      createdAt: Date.now(),
    }
    await this.saveTask(task)
    this.logger.log(`📝 Sync task ${taskId} saved to MongoDB (${status})`)

    return {
      id: taskId,
      status,
      images: savedImages,
    }
  }

  // ===== MongoDB 存储方法 =====

  /**
   * 保存任务到 MongoDB
   */
  private async saveTask(task: ImageTask): Promise<void> {
    const collection = this.databaseService.getDb().collection('image_tasks')
    await collection.updateOne(
      { taskId: task.taskId },
      { $set: task as any },
      { upsert: true },
    )
  }

  /**
   * 从 MongoDB 获取任务
   */
  private async getTask(taskId: string): Promise<ImageTask | null> {
    const collection = this.databaseService.getDb().collection('image_tasks')
    const doc = await collection.findOne({ taskId }) as any
    if (!doc) return null
    return {
      taskId: doc.taskId,
      username: doc.username || 'unknown',
      status: doc.status,
      prompt: doc.prompt,
      model: doc.model,
      aspectRatio: doc.aspectRatio,
      imageSize: doc.imageSize,
      images: doc.images,
      error: doc.error,
      createdAt: doc.createdAt,
    }
  }
}
