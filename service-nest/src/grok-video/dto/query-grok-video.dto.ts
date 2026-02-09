import { IsString } from 'class-validator'

/**
 * 查询 Grok 视频任务 DTO
 * GET /v1/grok/query?id=xxx
 */
export class QueryGrokVideoDto {
  @IsString()
  id: string
}
