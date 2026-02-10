import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { ObjectId } from 'mongodb'
import { DatabaseService } from '../database/database.service'

@Injectable()
export class AdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminService.name)

  constructor(private readonly databaseService: DatabaseService) {}

  async onApplicationBootstrap() {
    await this.ensureImageTaskIndexes()
  }

  /**
   * 为 image_tasks 集合补充索引
   */
  private async ensureImageTaskIndexes() {
    try {
      const col = this.databaseService.getCollection('image_tasks')
      await col.createIndex({ userId: 1, createdAt: -1 })
      await col.createIndex({ taskId: 1 }, { unique: true })
      this.logger.log('📇 image_tasks indexes ensured')
    } catch (error) {
      this.logger.warn(`⚠️ image_tasks index warning: ${error.message}`)
    }
  }

  /**
   * 获取用户列表（分页）
   */
  async getUsers(options: { page: number; limit: number; role?: string; keyword?: string }) {
    const col = this.databaseService.getCollection('users')
    const page = options.page || 1
    const limit = Math.min(options.limit || 50, 100)
    const skip = (page - 1) * limit

    // 构建过滤条件
    const filter: Record<string, any> = {}
    if (options.role) filter.role = options.role
    if (options.keyword) {
      filter.username = { $regex: options.keyword, $options: 'i' }
    }

    const [users, total] = await Promise.all([
      col.find(filter, { projection: { password: 0 } })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      col.countDocuments(filter),
    ])

    // 为每个用户附加任务统计
    const enriched = await Promise.all(
      users.map(async (user: any) => {
        const userId = user._id.toString()
        const [videoCount, imageCount] = await Promise.all([
          this.databaseService.getCollection('video_tasks').countDocuments({ userId }),
          this.databaseService.getCollection('image_tasks').countDocuments({ userId }),
        ])
        return {
          _id: userId,
          username: user.username,
          role: user.role,
          created_at: user.created_at,
          last_login: user.last_login,
          videoTaskCount: videoCount,
          imageTaskCount: imageCount,
        }
      }),
    )

    return { data: enriched, total, page, limit }
  }

  /**
   * 获取用户详情（含配置信息，key 脱敏）
   */
  async getUserDetail(userId: string) {
    const userCol = this.databaseService.getCollection('users')
    let user: any
    try {
      user = await userCol.findOne(
        { _id: new ObjectId(userId) },
        { projection: { password: 0 } },
      )
    } catch {
      return null
    }
    if (!user) return null

    // 获取用户配置（脱敏）
    const configCol = this.databaseService.getCollection('user_configs')
    const configDoc: any = await configCol.findOne({ userId })
    const config = configDoc?.config || null
    const maskedConfig = config ? this.maskKeys(config) : null

    // 任务统计
    const [videoCount, imageCount] = await Promise.all([
      this.databaseService.getCollection('video_tasks').countDocuments({ userId }),
      this.databaseService.getCollection('image_tasks').countDocuments({ userId }),
    ])

    return {
      user: {
        _id: user._id.toString(),
        username: user.username,
        role: user.role,
        created_at: user.created_at,
        last_login: user.last_login,
      },
      config: maskedConfig,
      videoTaskCount: videoCount,
      imageTaskCount: imageCount,
    }
  }

  /**
   * 获取指定用户的视频任务
   */
  async getUserVideoTasks(
    userId: string,
    options: { page: number; limit: number; platform?: string; status?: string },
  ) {
    const col = this.databaseService.getCollection('video_tasks')
    const filter: Record<string, any> = { userId }
    if (options.platform) filter.platform = options.platform
    if (options.status) filter.status = options.status

    const page = options.page || 1
    const limit = Math.min(options.limit || 20, 100)
    const skip = (page - 1) * limit

    const [tasks, total] = await Promise.all([
      col.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments(filter),
    ])

    return {
      data: tasks.map((t: any) => ({
        _id: t._id?.toString(),
        externalTaskId: t.externalTaskId,
        userId: t.userId,
        platform: t.platform,
        model: t.model,
        prompt: t.prompt,
        status: t.status,
        progress: t.progress,
        video_url: t.video_url,
        thumbnail_url: t.thumbnail_url,
        error: t.error,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      total,
      page,
      limit,
    }
  }

  /**
   * 获取指定用户的图片任务
   */
  async getUserImageTasks(
    userId: string,
    options: { page: number; limit: number },
  ) {
    const col = this.databaseService.getCollection('image_tasks')
    const filter: Record<string, any> = { userId }

    const page = options.page || 1
    const limit = Math.min(options.limit || 20, 100)
    const skip = (page - 1) * limit

    const [tasks, total] = await Promise.all([
      col.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments(filter),
    ])

    return {
      data: tasks.map((t: any) => ({
        _id: t._id?.toString(),
        taskId: t.taskId,
        userId: t.userId,
        status: t.status,
        prompt: t.prompt,
        model: t.model,
        aspectRatio: t.aspectRatio,
        imageSize: t.imageSize,
        images: t.images,
        error: t.error,
        createdAt: t.createdAt,
      })),
      total,
      page,
      limit,
    }
  }

  /**
   * 获取平台概览统计
   */
  async getStats() {
    const db = this.databaseService.getDb()

    const [userCount, videoTaskCount, imageTaskCount] = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('video_tasks').countDocuments(),
      db.collection('image_tasks').countDocuments(),
    ])

    // 视频任务按平台统计
    const videoPlatformStats = await db.collection('video_tasks').aggregate([
      { $group: { _id: '$platform', count: { $sum: 1 } } },
    ]).toArray()

    // 视频任务按状态统计
    const videoStatusStats = await db.collection('video_tasks').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).toArray()

    // 图片任务按状态统计
    const imageStatusStats = await db.collection('image_tasks').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).toArray()

    return {
      totalUsers: userCount,
      totalVideoTasks: videoTaskCount,
      totalImageTasks: imageTaskCount,
      videoByPlatform: Object.fromEntries(videoPlatformStats.map((s: any) => [s._id, s.count])),
      videoByStatus: Object.fromEntries(videoStatusStats.map((s: any) => [s._id, s.count])),
      imageByStatus: Object.fromEntries(imageStatusStats.map((s: any) => [s._id, s.count])),
    }
  }

  /**
   * 对 API key 脱敏
   */
  private maskKeys(config: any): any {
    const masked: any = {}
    for (const [service, svcConfig] of Object.entries(config)) {
      if (svcConfig && typeof svcConfig === 'object') {
        masked[service] = { ...(svcConfig as any) }
        if (masked[service].key) {
          const key = masked[service].key as string
          masked[service].key = key.length > 8
            ? '****' + key.slice(-6)
            : '****'
        }
      }
    }
    return masked
  }
}
