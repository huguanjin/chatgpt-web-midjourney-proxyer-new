import { IsString, MinLength, MaxLength, IsEmail, Length } from 'class-validator'

export class LoginDto {
  @IsString()
  username: string

  @IsString()
  @MinLength(6)
  password: string
}

export class RegisterDto {
  @IsString()
  @MinLength(1, { message: '用户名至少 1 个字符' })
  @MaxLength(20, { message: '用户名最多 20 个字符' })
  username: string

  @IsString()
  @MinLength(6, { message: '密码至少 6 个字符' })
  password: string
}

export class ChangePasswordDto {
  @IsString()
  oldPassword: string

  @IsString()
  @MinLength(6)
  newPassword: string
}

/** 发送邮箱验证码 */
export class SendEmailCodeDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string
}

/** 邮箱验证码登录 */
export class EmailLoginDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string

  @IsString()
  @Length(6, 6, { message: '验证码为6位数字' })
  code: string
}
