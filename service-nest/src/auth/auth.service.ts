import { Injectable, Logger, OnApplicationBootstrap, Inject, forwardRef } from '@nestjs/common'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { DatabaseService } from '../database/database.service'
import { UserConfigService } from '../user-config/user-config.service'

export interface UserDocument {
  username: string
  password: string  // 格式: salt:hash
  role: 'admin' | 'user'
  created_at: Date
  last_login: Date | null
}

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => UserConfigService))
    private readonly userConfigService: UserConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.ensureUserIndexes()
    await this.initDefaultAdmin()
    await this.ensureAllUsersHaveConfig()
  }

  /**
   * 创建用户集合索引
   */
  private async ensureUserIndexes() {
    try {
      const collection = this.databaseService.getDb().collection('users')
      await collection.createIndex({ username: 1 }, { unique: true })
      this.logger.log('📇 Users collection indexes ensured')
    } catch (error) {
      this.logger.warn(`⚠️ User index creation warning: ${error.message}`)
    }
  }

  /**
   * 数据库初始化：如果没有任何用户，创建默认管理员
   */
  private async initDefaultAdmin() {
    const collection = this.databaseService.getDb().collection('users')
    const userCount = await collection.countDocuments()

    if (userCount > 0) {
      this.logger.log('👤 Users already exist, skipping default admin creation')
      return
    }

    // 生成随机密码 (12位字母数字)
    const rawPassword = randomBytes(6).toString('hex') // 12位随机密码
    const username = 'admin'
    const hashedPassword = this.hashPassword(rawPassword)

    const adminUser: UserDocument = {
      username,
      password: hashedPassword,
      role: 'admin',
      created_at: new Date(),
      last_login: null,
    }

    await collection.insertOne(adminUser as any)
    this.logger.log('✅ Default admin account created')

    // 为管理员初始化默认 API 配置
    await this.userConfigService.initUserConfig(username)
    this.logger.log('📋 Default API config initialized for admin')

    // 将初始账号密码写入 txt 文件
    this.writeCredentialsFile(username, rawPassword)
  }

  /**
   * 确保所有已有用户都有对应的配置记录
   */
  private async ensureAllUsersHaveConfig() {
    try {
      const usersCol = this.databaseService.getDb().collection('users')
      const users = await usersCol.find({}, { projection: { username: 1 } }).toArray()

      for (const user of users) {
        await this.userConfigService.initUserConfig((user as any).username)
      }

      this.logger.log(`📋 Ensured config exists for ${users.length} user(s)`)
    } catch (error) {
      this.logger.warn(`⚠️ Failed to ensure user configs: ${error.message}`)
    }
  }

  /**
   * 将初始凭据写入文件
   */
  private writeCredentialsFile(username: string, password: string) {
    const filePath = path.join(process.cwd(), 'initial_admin_credentials.txt')
    const content = [
      '========================================',
      '  初始管理员账号信息',
      '  Initial Admin Credentials',
      '========================================',
      '',
      `  用户名 (Username): ${username}`,
      `  密码 (Password):   ${password}`,
      '',
      '  ⚠️ 请登录后立即修改密码！',
      '  ⚠️ Please change password after first login!',
      '',
      `  生成时间: ${new Date().toISOString()}`,
      '========================================',
    ].join('\n')

    try {
      fs.writeFileSync(filePath, content, 'utf-8')
      this.logger.log(`📄 Initial credentials saved to ${filePath}`)
      this.logger.warn('⚠️ Please change the default admin password after first login!')
    } catch (error) {
      this.logger.error(`❌ Failed to write credentials file: ${error.message}`)
      // 如果文件写入失败，至少在日志中输出
      this.logger.warn(`🔑 Default admin: ${username} / ${password}`)
    }
  }

  // ===== 密码加密与验证 =====

  /**
   * 加密密码: 生成 salt + scrypt hash
   * 返回格式: salt:hash (与用户提供的示例格式一致)
   */
  hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex') // 32字符 hex salt
    const hash = scryptSync(password, salt, 32).toString('hex') // 64字符 hex hash
    return `${salt}:${hash}`
  }

  /**
   * 验证密码
   */
  verifyPassword(password: string, storedHash: string): boolean {
    try {
      const [salt, hash] = storedHash.split(':')
      if (!salt || !hash) return false

      const hashBuffer = Buffer.from(hash, 'hex')
      const derivedKey = scryptSync(password, salt, 32)

      return timingSafeEqual(hashBuffer, derivedKey)
    } catch {
      return false
    }
  }

  // ===== 用户操作 =====

  /**
   * 登录验证
   */
  async validateUser(username: string, password: string): Promise<UserDocument | null> {
    const collection = this.databaseService.getDb().collection('users')
    const user = await collection.findOne({ username }) as any

    if (!user) return null

    if (!this.verifyPassword(password, user.password)) {
      return null
    }

    // 更新最后登录时间
    await collection.updateOne(
      { username },
      { $set: { last_login: new Date() } },
    )

    return user as UserDocument
  }

  /**
   * 通过用户名查找用户
   */
  async findByUsername(username: string): Promise<UserDocument | null> {
    const collection = this.databaseService.getDb().collection('users')
    const user = await collection.findOne({ username }) as any
    return user || null
  }

  /**
   * 修改密码
   */
  async changePassword(username: string, oldPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.validateUser(username, oldPassword)
    if (!user) return false

    const hashedPassword = this.hashPassword(newPassword)
    const collection = this.databaseService.getDb().collection('users')
    await collection.updateOne(
      { username },
      { $set: { password: hashedPassword } },
    )

    this.logger.log(`🔑 Password changed for user: ${username}`)
    return true
  }
}
