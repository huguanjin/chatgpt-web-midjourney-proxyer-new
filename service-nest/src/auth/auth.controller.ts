import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AuthService } from './auth.service'
import { LoginDto, RegisterDto, ChangePasswordDto, SendEmailCodeDto, EmailLoginDto } from './dto'
import { JwtAuthGuard } from './jwt-auth.guard'
import { JWT_SECRET } from './jwt.strategy'
import { EmailService } from '../email/email.service'

@Controller('v1/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name)

  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * 用户登录
   * POST /v1/auth/login
   */
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    this.logger.log(`🔐 Login attempt: ${loginDto.username}`)

    const user = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
    )

    if (!user) {
      this.logger.warn(`❌ Login failed: ${loginDto.username}`)
      throw new HttpException(
        { status: 'error', message: '用户名或密码错误' },
        HttpStatus.UNAUTHORIZED,
      )
    }

    // 生成 JWT token
    const payload = { sub: (user as any)._id.toString(), username: user.username, role: user.role }
    const token = this.jwtService.sign(payload, {
      secret: JWT_SECRET,
      expiresIn: '7d',
    })

    this.logger.log(`✅ Login success: ${user.username}`)

    return {
      status: 'success',
      data: {
        token,
        userId: (user as any)._id.toString(),
        username: user.username,
        role: user.role,
      },
    }
  }

  /**
   * 用户注册
   * POST /v1/auth/register
   */
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    this.logger.log(`📝 Register attempt: ${dto.username}`)

    try {
      const user = await this.authService.register(dto.username, dto.password)

      // 注册成功后自动生成 token
      const payload = { sub: user._id.toString(), username: user.username, role: user.role }
      const token = this.jwtService.sign(payload, {
        secret: JWT_SECRET,
        expiresIn: '7d',
      })

      this.logger.log(`✅ Register success: ${user.username}`)

      return {
        status: 'success',
        data: {
          token,
          userId: user._id.toString(),
          username: user.username,
          role: user.role,
        },
      }
    } catch (err: any) {
      this.logger.warn(`❌ Register failed: ${dto.username} - ${err.message}`)
      throw new HttpException(
        { status: 'error', message: err.message },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  /**
   * 获取当前用户信息
   * GET /v1/auth/profile
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    const { userId } = req.user
    const user = await this.authService.findById(userId)

    if (!user) {
      throw new HttpException(
        { status: 'error', message: '用户不存在' },
        HttpStatus.NOT_FOUND,
      )
    }

    return {
      status: 'success',
      data: {
        userId,
        username: user.username,
        role: user.role,
        created_at: user.created_at,
        last_login: user.last_login,
      },
    }
  }

  /**
   * 修改密码
   * PUT /v1/auth/password
   */
  @Put('password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Req() req: any,
    @Body() dto: ChangePasswordDto,
  ) {
    const { userId, username } = req.user
    this.logger.log(`🔑 Password change request: ${username} (${userId})`)

    const success = await this.authService.changePassword(
      userId,
      dto.oldPassword,
      dto.newPassword,
    )

    if (!success) {
      throw new HttpException(
        { status: 'error', message: '原密码错误' },
        HttpStatus.BAD_REQUEST,
      )
    }

    return {
      status: 'success',
      message: '密码修改成功',
    }
  }

  /**
   * 验证 token 有效性
   * GET /v1/auth/verify
   */
  @Get('verify')
  @UseGuards(JwtAuthGuard)
  async verifyToken(@Req() req: any) {
    return {
      status: 'success',
      data: {
        userId: req.user.userId,
        username: req.user.username,
        role: req.user.role,
      },
    }
  }

  // ============ 邮箱验证码登录 ============

  /**
   * 发送邮箱验证码
   * POST /v1/auth/email/send-code
   */
  @Post('email/send-code')
  async sendEmailCode(@Body() dto: SendEmailCodeDto) {
    this.logger.log(`📧 Send code request: ${dto.email}`)

    try {
      await this.emailService.sendVerificationCode(dto.email)
      return {
        status: 'success',
        message: '验证码已发送，请查收邮件',
      }
    } catch (err: any) {
      this.logger.warn(`❌ Send code failed: ${dto.email} - ${err.message}`)
      throw new HttpException(
        { status: 'error', message: err.message },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  /**
   * 邮箱验证码登录
   * POST /v1/auth/email/login
   * 验证码正确后自动登录（用户不存在则自动注册）
   */
  @Post('email/login')
  async emailLogin(@Body() dto: EmailLoginDto) {
    this.logger.log(`📧 Email login attempt: ${dto.email}`)

    // 验证验证码
    const valid = this.emailService.verifyCode(dto.email, dto.code)
    if (!valid) {
      this.logger.warn(`❌ Email login failed: invalid code for ${dto.email}`)
      throw new HttpException(
        { status: 'error', message: '验证码错误或已过期' },
        HttpStatus.UNAUTHORIZED,
      )
    }

    // 查找或创建用户
    const user = await this.authService.findOrCreateByEmail(dto.email)

    // 生成 JWT token
    const payload = {
      sub: (user as any)._id.toString(),
      username: user.username,
      role: user.role,
    }
    const token = this.jwtService.sign(payload, {
      secret: JWT_SECRET,
      expiresIn: '7d',
    })

    this.logger.log(`✅ Email login success: ${user.username} (${dto.email})`)

    return {
      status: 'success',
      data: {
        token,
        userId: (user as any)._id.toString(),
        username: user.username,
        role: user.role,
      },
    }
  }
}
