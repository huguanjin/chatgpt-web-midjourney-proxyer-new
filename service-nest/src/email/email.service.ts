import { Injectable, Logger } from '@nestjs/common'
import * as nodemailer from 'nodemailer'
import { ConfigService } from '../config/config.service'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private transporter: nodemailer.Transporter | null = null

  // 内存缓存验证码: email -> { code, expiresAt }
  private codeStore = new Map<string, { code: string; expiresAt: number }>()

  // 上一次使用的 SMTP 配置签名（用于检测变更并重建 transporter）
  private lastConfigSignature = ''

  constructor(private readonly configService: ConfigService) {
    this.logger.log('📧 Email service initialized (config from MongoDB)')
  }

  /**
   * 获取或重建 SMTP transporter（配置变更时自动重建）
   */
  private getTransporter(): nodemailer.Transporter {
    const emailConfig = this.configService.getEmailConfig()
    const signature = `${emailConfig.smtpServer}:${emailConfig.smtpPort}:${emailConfig.smtpSSL}:${emailConfig.smtpAccount}:${emailConfig.smtpToken}`

    if (!this.transporter || signature !== this.lastConfigSignature) {
      this.transporter = nodemailer.createTransport({
        host: emailConfig.smtpServer,
        port: emailConfig.smtpPort,
        secure: emailConfig.smtpSSL,
        auth: {
          user: emailConfig.smtpAccount,
          pass: emailConfig.smtpToken,
        },
      })
      this.lastConfigSignature = signature
      this.logger.log(`📧 SMTP transporter (re)created: ${emailConfig.smtpServer}:${emailConfig.smtpPort}`)
    }

    return this.transporter
  }

  /**
   * 生成6位数字验证码
   */
  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  /**
   * 发送验证码邮件
   */
  async sendVerificationCode(email: string): Promise<boolean> {
    // 频率限制：同一邮箱 60 秒内只能发送一次
    const existing = this.codeStore.get(email)
    if (existing && existing.expiresAt - Date.now() > 4 * 60 * 1000) {
      // 验证码还剩 4 分钟以上有效期，说明发送不到 1 分钟
      throw new Error('发送太频繁，请60秒后再试')
    }

    const code = this.generateCode()
    // 验证码 5 分钟有效
    const expiresAt = Date.now() + 5 * 60 * 1000

    try {
      const transporter = this.getTransporter()
      const fromAddress = this.configService.getEmailConfig().smtpFrom

      await transporter.sendMail({
        from: `"AI创作中心" <${fromAddress}>`,
        to: email,
        subject: '【AI创作中心】邮箱验证码',
        html: `
          <div style="max-width: 480px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif;">
            <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🎬 AI 创作中心</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">邮箱验证码</p>
            </div>
            <div style="background: #f8fafc; padding: 32px; border: 1px solid #e2e8f0; border-top: none;">
              <p style="color: #334155; font-size: 15px; margin: 0 0 20px;">您好，您正在登录 AI 创作中心，验证码如下：</p>
              <div style="background: white; border: 2px solid #6366f1; border-radius: 10px; padding: 20px; text-align: center; margin: 0 0 20px;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #4f46e5;">${code}</span>
              </div>
              <p style="color: #64748b; font-size: 13px; margin: 0 0 8px;">⏱ 验证码 <strong>5 分钟</strong>内有效</p>
              <p style="color: #64748b; font-size: 13px; margin: 0;">⚠️ 如非本人操作，请忽略此邮件</p>
            </div>
            <div style="padding: 16px; text-align: center; border-radius: 0 0 12px 12px; background: #f1f5f9;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">Sora · VEO · Gemini · Grok</p>
            </div>
          </div>
        `,
      })

      // 存储验证码
      this.codeStore.set(email, { code, expiresAt })
      this.logger.log(`📧 Verification code sent to ${this.maskEmail(email)}`)
      return true
    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${this.maskEmail(email)}: ${error.message}`)
      throw new Error('邮件发送失败，请稍后重试')
    }
  }

  /**
   * 验证验证码
   */
  verifyCode(email: string, code: string): boolean {
    const stored = this.codeStore.get(email)
    if (!stored) return false

    // 检查是否过期
    if (Date.now() > stored.expiresAt) {
      this.codeStore.delete(email)
      return false
    }

    // 验证码匹配
    if (stored.code === code) {
      this.codeStore.delete(email) // 一次性使用
      return true
    }

    return false
  }

  /**
   * 隐藏邮箱中间部分
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@')
    if (local.length <= 3) return `${local[0]}***@${domain}`
    return `${local.slice(0, 3)}***@${domain}`
  }
}
