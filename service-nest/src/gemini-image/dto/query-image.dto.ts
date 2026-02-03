import { IsString } from 'class-validator'

/**
 * 查询图片任务 DTO
 */
export class QueryImageDto {
  @IsString()
  id: string
}
