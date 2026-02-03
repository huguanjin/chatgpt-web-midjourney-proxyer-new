import { IsArray, IsIn, IsOptional, IsString } from 'class-validator'

/**
 * 创建图片 DTO
 * POST /v1/image/create
 */
export class CreateImageDto {
  /**
   * 模型名称
   * 默认: gemini-3-pro-image-preview
   */
  @IsOptional()
  @IsString()
  model?: string

  /**
   * 提示词
   */
  @IsString()
  prompt: string

  /**
   * 宽高比
   * 支持: 1:1, 16:9, 9:16, 4:3, 3:4
   */
  @IsOptional()
  @IsString()
  @IsIn(['1:1', '16:9', '9:16', '4:3', '3:4'])
  aspectRatio?: string

  /**
   * 图片尺寸/清晰度
   * 支持: 1K, 2K, 4K
   */
  @IsOptional()
  @IsString()
  @IsIn(['1K', '2K', '4K'])
  imageSize?: string

  /**
   * 参考图片（Base64 编码）
   * 用于图片编辑/修改
   */
  @IsOptional()
  @IsArray()
  referenceImages?: Array<{
    mimeType: string
    data: string
  }>
}
