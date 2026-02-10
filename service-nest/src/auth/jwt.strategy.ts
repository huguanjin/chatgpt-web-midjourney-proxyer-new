import { Injectable, Logger } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { DatabaseService } from '../database/database.service'

export const JWT_SECRET = process.env.JWT_SECRET || 'pptto-video-jwt-secret-key-2024'

export interface JwtPayload {
  sub?: string     // userId (MongoDB _id) — 新格式 token
  username?: string // 用户名（显示用）— 新格式有此字段，旧格式也有（作为主标识）
  role: string     // user role
  iat?: number
  exp?: number
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name)

  constructor(private readonly databaseService: DatabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    })
  }

  /**
   * JWT 验证通过后，payload 会被附加到 request.user
   * 兼容旧 token 格式: { username, role } （没有 sub 字段）
   * 新 token 格式: { sub: userId, username, role }
   */
  async validate(payload: JwtPayload) {
    // 新格式 token: sub 是 userId (MongoDB _id hex string)
    if (payload.sub && payload.sub.length === 24) {
      return {
        userId: payload.sub,
        username: payload.username || payload.sub,
        role: payload.role,
      }
    }

    // 旧格式 token: 没有 sub 或 sub 是用户名，需要从数据库查找 userId
    const username = payload.username || payload.sub
    if (username) {
      try {
        const collection = this.databaseService.getDb().collection('users')
        const user = await collection.findOne({ username })
        if (user) {
          this.logger.warn(`🔄 旧格式 token 兼容: ${username} -> userId: ${user._id.toString()}`)
          return {
            userId: user._id.toString(),
            username,
            role: payload.role,
          }
        }
      } catch (err) {
        this.logger.error(`Failed to lookup user for legacy token: ${err}`)
      }
    }

    // 无法解析的 token
    this.logger.error(`Invalid JWT payload: ${JSON.stringify(payload)}`)
    return {
      userId: undefined,
      username: username || 'unknown',
      role: payload.role,
    }
  }
}
