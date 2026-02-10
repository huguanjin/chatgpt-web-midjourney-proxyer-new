import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { CreateVideoTaskDto } from './dto/create-video-task.dto'

/**
 * MongoDB 视频任务文档接口
 */
export interface VideoTaskDocument {
  /** 内部唯一 ID（由 MongoDB 生成） */
  _id?: any

  /** 外部任务 ID（第三方 API 返回的 ID） */
  externalTaskId: string

  /** 所属用户 ID（MongoDB _id） */
  userId: string

  /** 平台: sora / veo / grok */
  platform: 'sora' | 'veo' | 'grok'

  /** 使用的模型 */
  model: string

  /** 生成提示词 */
  prompt: string

  /** 创建时的请求参数快照 */
  params?: Record<string, any>

  /** 任务状态 */
  status: 'queued' | 'processing' | 'completed' | 'failed'

  /** 进度百分比 */
  progress: number

  /** 生成的视频 URL */
  video_url?: string

  /** 缩略图 URL */
  thumbnail_url?: string

  /** 失败原因 */
  error?: string

  /** 最近一次查询 API 的原始响应 */
  lastQueryResponse?: Record<string, any>

  /** 创建时间戳 */
  createdAt: number

  /** 最后更新时间戳 */
  updatedAt: number
}

@Injectable()
export class VideoTasksService implements OnApplicationBootstrap {
  private readonly logger = new Logger(VideoTasksService.name)
  private readonly COLLECTION = 'video_tasks'

  constructor(private readonly databaseService: DatabaseService) {}

  async onApplicationBootstrap() {
    await this.ensureIndexes()
    this.logger.log('✅ VideoTasksService initialized')
  }

  /**
   * 创建索引
   */
  private async ensureIndexes() {
    try {
      const col = this.databaseService.getCollection(this.COLLECTION)
      await col.createIndex({ externalTaskId: 1 }, { unique: true })
      await col.createIndex({ userId: 1, createdAt: -1 })
      await col.createIndex({ userId: 1, platform: 1 })
      await col.createIndex({ status: 1 })
      await col.createIndex({ createdAt: -1 })
      this.logger.log('📇 video_tasks indexes ensured')
    } catch (error) {
      this.logger.warn(`⚠️ video_tasks index warning: ${error.message}`)
    }
  }

  /**
   * 创建任务记录
   */
  async createTask(userId: string, dto: CreateVideoTaskDto): Promise<VideoTaskDocument> {
    const now = Date.now()
    const doc: VideoTaskDocument = {
      externalTaskId: dto.externalTaskId,
      userId,
      platform: dto.platform,
      model: dto.model,
      prompt: dto.prompt,
      params: dto.params || {},
      status: 'queued',
      progress: 0,
      createdAt: now,
      updatedAt: now,
    }

    // 如果 API 响应中有 status 信息，直接使用
    if (dto.apiResponse) {
      const apiStatus = dto.apiResponse.status
      if (apiStatus === 'completed' || apiStatus === 'complete') {
        doc.status = 'completed'
        doc.progress = 100
      } else if (apiStatus === 'processing' || apiStatus === 'in_progress') {
        doc.status = 'processing'
      } else if (apiStatus === 'failed' || apiStatus === 'error') {
        doc.status = 'failed'
        doc.error = dto.apiResponse.error || dto.apiResponse.message
      }
      doc.video_url = dto.apiResponse.video_url || dto.apiResponse.output?.video_url
    }

    const col = this.databaseService.getCollection(this.COLLECTION)
    await col.insertOne(doc as any)

    this.logger.log(`📝 Task created: ${dto.externalTaskId} [${dto.platform}] for userId ${userId}`)
    return doc
  }

  /**
   * 根据外部任务 ID 更新任务状态
   */
  async updateTaskByExternalId(
    externalTaskId: string,
    updates: Partial<Pick<VideoTaskDocument, 'status' | 'progress' | 'video_url' | 'thumbnail_url' | 'error' | 'lastQueryResponse'>>,
  ): Promise<VideoTaskDocument | null> {
    const col = this.databaseService.getCollection(this.COLLECTION)
    const result = await col.findOneAndUpdate(
      { externalTaskId },
      { $set: { ...updates, updatedAt: Date.now() } },
      { returnDocument: 'after' },
    )
    return result as unknown as VideoTaskDocument | null
  }

  /**
   * 根据外部任务 ID 查找任务
   */
  async findByExternalId(externalTaskId: string): Promise<VideoTaskDocument | null> {
    const col = this.databaseService.getCollection(this.COLLECTION)
    return col.findOne({ externalTaskId }) as unknown as VideoTaskDocument | null
  }

  /**
   * 获取用户的任务列表（分页）
   */
  async getUserTasks(
    userId: string,
    options?: {
      platform?: 'sora' | 'veo' | 'grok'
      status?: string
      page?: number
      limit?: number
    },
  ): Promise<{ tasks: VideoTaskDocument[]; total: number }> {
    const col = this.databaseService.getCollection(this.COLLECTION)
    const filter: Record<string, any> = { userId }

    if (options?.platform) {
      filter.platform = options.platform
    }
    if (options?.status) {
      filter.status = options.status
    }

    const page = options?.page || 1
    const limit = options?.limit || 50
    const skip = (page - 1) * limit

    const [tasks, total] = await Promise.all([
      col
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      col.countDocuments(filter),
    ])

    return {
      tasks: tasks as unknown as VideoTaskDocument[],
      total,
    }
  }

  /**
   * 删除用户的某个任务
   */
  async deleteTask(userId: string, externalTaskId: string): Promise<boolean> {
    const col = this.databaseService.getCollection(this.COLLECTION)
    const result = await col.deleteOne({ userId, externalTaskId })
    return result.deletedCount > 0
  }

  /**
   * 批量删除用户已完成的任务
   */
  async deleteCompletedTasks(userId: string): Promise<number> {
    const col = this.databaseService.getCollection(this.COLLECTION)
    const result = await col.deleteMany({ userId, status: 'completed' })
    return result.deletedCount
  }
}
