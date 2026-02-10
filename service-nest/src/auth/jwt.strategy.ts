import { Injectable, Logger } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

export const JWT_SECRET = process.env.JWT_SECRET || 'pptto-video-jwt-secret-key-2024'

export interface JwtPayload {
  sub: string      // username
  role: string     // user role
  iat?: number
  exp?: number
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name)

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    })
  }

  /**
   * JWT 验证通过后，payload 会被附加到 request.user
   */
  async validate(payload: JwtPayload) {
    return {
      username: payload.sub,
      role: payload.role,
    }
  }
}
