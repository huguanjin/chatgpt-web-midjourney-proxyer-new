import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { MongoClient, Db, Collection } from 'mongodb'
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'

interface MongoConfig {
  mongodb: {
    connection_string: string
    database_name: string
  }
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name)
  private client: MongoClient
  private db: Db
  private mongoConfig: MongoConfig
  private readyResolve: () => void
  private readyPromise: Promise<void>

  constructor() {
    this.mongoConfig = this.loadMongoConfig()
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve
    })
  }

  /**
   * 等待数据库连接就绪
   */
  async waitForReady(): Promise<void> {
    return this.readyPromise
  }

  /**
   * 从 YAML 文件加载 MongoDB 配置
   */
  private loadMongoConfig(): MongoConfig {
    const configPath = path.join(process.cwd(), 'mongo_config.yaml')
    const templatePath = path.join(process.cwd(), 'mongo_config.template.yaml')

    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8')
        const config = yaml.load(content) as MongoConfig
        this.logger.log(`📂 MongoDB config loaded from ${configPath}`)
        return config
      }
    } catch (error) {
      this.logger.error(`❌ Failed to load mongo_config.yaml: ${error}`)
    }

    // 回退：尝试从环境变量读取
    this.logger.warn('⚠️ mongo_config.yaml not found, using environment variables or defaults')
    this.logger.warn(`💡 Please copy mongo_config.template.yaml to mongo_config.yaml`)
    return {
      mongodb: {
        connection_string: process.env.MONGODB_URI || 'mongodb://localhost:27017/',
        database_name: process.env.MONGODB_DATABASE || 'PPTTOVideo',
      },
    }
  }

  async onModuleInit() {
    const { connection_string, database_name } = this.mongoConfig.mongodb

    this.logger.log(`🔗 Connecting to MongoDB: ${this.maskConnectionString(connection_string)}`)
    this.logger.log(`📦 Database: ${database_name}`)

    try {
      this.client = new MongoClient(connection_string)
      await this.client.connect()
      this.db = this.client.db(database_name)

      // 验证连接
      await this.db.command({ ping: 1 })
      this.logger.log('✅ MongoDB connected successfully')

      // 初始化索引
      await this.ensureIndexes()

      // 通知其他服务数据库已就绪
      this.readyResolve()
    } catch (error) {
      this.logger.error(`❌ MongoDB connection failed: ${error.message}`)
      throw error
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.close()
      this.logger.log('🔌 MongoDB connection closed')
    }
  }

  /**
   * 创建必要的索引
   */
  private async ensureIndexes() {
    try {
      // 配置集合 - 按 key 字段唯一索引
      await this.getCollection('config').createIndex(
        { key: 1 },
        { unique: true },
      )

      // Gemini 图片任务集合 - 按 taskId 唯一索引 + status 索引
      const tasksCol = this.getCollection('image_tasks')
      await tasksCol.createIndex({ taskId: 1 }, { unique: true })
      await tasksCol.createIndex({ status: 1 })
      await tasksCol.createIndex({ createdAt: -1 })

      this.logger.log('📇 MongoDB indexes ensured')
    } catch (error) {
      this.logger.warn(`⚠️ Index creation warning: ${error.message}`)
    }
  }

  /**
   * 获取数据库实例
   */
  getDb(): Db {
    return this.db
  }

  /**
   * 获取集合
   */
  getCollection<T extends Document = Document>(name: string): Collection<T> {
    return this.db.collection<T>(name)
  }

  /**
   * 隐藏连接字符串中的密码
   */
  private maskConnectionString(connStr: string): string {
    try {
      return connStr.replace(/:([^@:]+)@/, ':****@')
    } catch {
      return '****'
    }
  }
}
