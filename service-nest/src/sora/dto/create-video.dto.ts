import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator'

/**
 * 创建 Sora 视频 DTO
 * POST /v1/video/create
 */
export class CreateVideoDto {
  /**
   * 图片链接数组
   */
  @IsOptional()
  @IsArray()
  images?: string[]

  /**
   * 模型名称
   * sora-2 | sora-2-pro
   */
  @IsString()
  model: string

  /**
   * 视频方向
   * portrait - 竖屏
   * landscape - 横屏
   */
  @IsOptional()
  @IsString()
  @IsIn(['portrait', 'landscape'])
  orientation?: string

  /**
   * 提示词
   */
  @IsString()
  prompt: string

  /**
   * 视频尺寸
   * small - 一般720p
   * large - 更高分辨率
   */
  @IsOptional()
  @IsString()
  @IsIn(['small', 'large'])
  size?: string

  /**
   * 视频时长（秒）
   * 支持 10, 15, 20 等
   */
  @IsOptional()
  @IsNumber()
  duration?: number

  /**
   * 是否添加水印
   * true - 会优先无水印，出错则兜底有水印
   * false - 强制无水印，错误会自动重试
   */
  @IsOptional()
  @IsBoolean()
  watermark?: boolean

  /**
   * 是否隐藏视频
   * true - 视频不会发布，无法remix
   * false - 默认值
   */
  @IsOptional()
  @IsBoolean()
  private?: boolean
}
