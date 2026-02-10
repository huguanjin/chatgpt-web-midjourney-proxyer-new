import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { JWT_SECRET, JwtPayload } from './jwt.strategy'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const token = this.extractTokenFromHeader(request)

    if (!token) {
      throw new UnauthorizedException('未提供认证令牌')
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: JWT_SECRET,
      })
      // 将用户信息附加到 request
      request.user = {
        username: payload.sub,
        role: payload.role,
      }
      return true
    } catch {
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
