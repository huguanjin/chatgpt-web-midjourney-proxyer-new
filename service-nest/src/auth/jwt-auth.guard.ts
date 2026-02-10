import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { JWT_SECRET, JwtPayload } from './jwt.strategy'
import { DatabaseService } from '../database/database.service'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name)

  constructor(
    private readonly jwtService: JwtService,
    private readonly databaseService: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const token = this.extractTokenFromHeader(request)

    if (!token) {
      throw new UnauthorizedException('未提供认证令牌')
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: JWT_SECRET,
      })

      // 新格式 token: sub 是 24 位 userId (MongoDB ObjectId hex)
      if (payload.sub && payload.sub.length === 24) {
        request.user = {
          userId: payload.sub,
          username: payload.username || payload.sub,
          role: payload.role,
        }
        return true
      }

      // 旧格式 token: sub 不存在或 sub 是用户名，需要从数据库获取 userId
      const username = payload.username || payload.sub
      if (username) {
        try {
          const collection = this.databaseService.getDb().collection('users')
          const user = await collection.findOne({ username })
          if (user) {
            this.logger.warn(`🔄 旧格式 token 兼容: ${username} -> userId: ${user._id.toString()}`)
            request.user = {
              userId: user._id.toString(),
              username,
              role: payload.role,
            }
            return true
          }
        } catch (err) {
          this.logger.error(`Legacy token lookup failed: ${err}`)
        }
      }

      throw new UnauthorizedException('无法解析用户身份')
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err
      throw new UnauthorizedException('认证令牌无效或已过期')
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authorization = request.headers?.authorization
    if (!authorization) return undefined
    const [type, token] = authorization.split(' ')
    return type === 'Bearer' ? token : undefined
  }
}
