import { IsString, MinLength, MaxLength, Matches } from 'class-validator'

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
