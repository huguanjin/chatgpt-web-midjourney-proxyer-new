import { IsString, IsNotEmpty } from 'class-validator';

/**
 * 查询视频任务 DTO
 * GET /v1/video/query?id=xxx
 */
export class QueryVideoDto {
  /**
   * 任务ID
   * 例如: sora-2:task_01kbfq03gpe0wr9ge11z09xqrj
   */
  @IsString()
  @IsNotEmpty()
  id: string;
}
