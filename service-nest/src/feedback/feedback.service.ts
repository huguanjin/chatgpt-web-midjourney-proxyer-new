import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { ObjectId } from 'mongodb'
import { DatabaseService } from '../database/database.service'

export interface FeedbackDocument {
  userId: string
  username: string
  title: string
  content: string
  type: 'bug' | 'feature' | 'question' | 'other'
  status: 'open' | 'replied' | 'resolved' | 'closed'
  adminReply: string | null
  repliedAt: Date | null
  repliedBy: string | null
  createdAt: Date
  updatedAt: Date
}

@Injectable()
export class FeedbackService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FeedbackService.name)

  constructor(private readonly databaseService: DatabaseService) {}

  async onApplicationBootstrap() {
    await this.ensureIndexes()
  }

  private async ensureIndexes() {
    try {
      const col = this.databaseService.getCollection('feedbacks')
      await col.createIndex({ userId: 1, createdAt: -1 })
      await col.createIndex({ status: 1, createdAt: -1 })
      await col.createIndex({ createdAt: -1 })
      this.logger.log('📇 feedbacks indexes ensured')
    } catch (error) {
      this.logger.warn(`⚠️ feedbacks index warning: ${error.message}`)
    }
  }

  /**
   * 用户创建反馈
   */
  async create(userId: string, username: string, data: {
    title: string
    content: string
    type?: string
  }) {
    const col = this.databaseService.getCollection('feedbacks')
    const now = new Date()

    const doc: FeedbackDocument = {
      userId,
      username,
      title: data.title,
      content: data.content,
      type: (data.type as any) || 'other',
      status: 'open',
      adminReply: null,
      repliedAt: null,
      repliedBy: null,
      createdAt: now,
      updatedAt: now,
    }

    const result = await col.insertOne(doc as any)
    this.logger.log(`📝 Feedback created by ${username} (${userId}): ${data.title}`)

    return {
      _id: result.insertedId.toString(),
      ...doc,
    }
  }

  /**
   * 获取用户自己的反馈列表
   */
  async getMyFeedbacks(userId: string, options: { page: number; limit: number }) {
    const col = this.databaseService.getCollection('feedbacks')
    const page = options.page || 1
    const limit = Math.min(options.limit || 20, 100)
    const skip = (page - 1) * limit

    const [feedbacks, total] = await Promise.all([
      col.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      col.countDocuments({ userId }),
    ])

    return {
      data: feedbacks.map((f: any) => ({
        _id: f._id.toString(),
        title: f.title,
        content: f.content,
        type: f.type,
        status: f.status,
        adminReply: f.adminReply,
        repliedAt: f.repliedAt,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
      total,
      page,
      limit,
    }
  }

  /**
   * 管理员获取所有反馈（分页 + 筛选）
   */
  async getAllFeedbacks(options: {
    page: number
    limit: number
    status?: string
    type?: string
    keyword?: string
  }) {
    const col = this.databaseService.getCollection('feedbacks')
    const page = options.page || 1
    const limit = Math.min(options.limit || 20, 100)
    const skip = (page - 1) * limit

    const filter: Record<string, any> = {}
    if (options.status) filter.status = options.status
    if (options.type) filter.type = options.type
    if (options.keyword) {
      filter.$or = [
        { title: { $regex: options.keyword, $options: 'i' } },
        { content: { $regex: options.keyword, $options: 'i' } },
        { username: { $regex: options.keyword, $options: 'i' } },
      ]
    }

    const [feedbacks, total] = await Promise.all([
      col.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      col.countDocuments(filter),
    ])

    return {
      data: feedbacks.map((f: any) => ({
        _id: f._id.toString(),
        userId: f.userId,
        username: f.username,
        title: f.title,
        content: f.content,
        type: f.type,
        status: f.status,
        adminReply: f.adminReply,
        repliedAt: f.repliedAt,
        repliedBy: f.repliedBy,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
      total,
      page,
      limit,
    }
  }

  /**
   * 管理员回复/更新反馈状态
   */
  async adminReply(feedbackId: string, adminUsername: string, data: {
    reply: string
    status?: string
  }) {
    const col = this.databaseService.getCollection('feedbacks')
    const now = new Date()

    const update: Record<string, any> = {
      adminReply: data.reply,
      repliedAt: now,
      repliedBy: adminUsername,
      updatedAt: now,
    }
    if (data.status) {
      update.status = data.status
    } else {
      update.status = 'replied'
    }

    const result = await col.updateOne(
      { _id: new ObjectId(feedbackId) },
      { $set: update },
    )

    if (result.matchedCount === 0) {
      return null
    }

    this.logger.log(`💬 Admin ${adminUsername} replied to feedback ${feedbackId}`)
    return { success: true }
  }

  /**
   * 管理员更新反馈状态
   */
  async updateStatus(feedbackId: string, status: string) {
    const col = this.databaseService.getCollection('feedbacks')

    const result = await col.updateOne(
      { _id: new ObjectId(feedbackId) },
      { $set: { status, updatedAt: new Date() } },
    )

    return result.matchedCount > 0
  }

  /**
   * 反馈统计
   */
  async getStats() {
    const col = this.databaseService.getCollection('feedbacks')

    const [total, statusStats, typeStats] = await Promise.all([
      col.countDocuments(),
      col.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).toArray(),
      col.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]).toArray(),
    ])

    return {
      total,
      byStatus: Object.fromEntries((statusStats as any[]).map(s => [s._id, s.count])),
      byType: Object.fromEntries((typeStats as any[]).map(s => [s._id, s.count])),
    }
  }
}
