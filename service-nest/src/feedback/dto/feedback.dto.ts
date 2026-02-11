import { IsString, IsOptional, MinLength, MaxLength, IsIn } from 'class-validator'

export class CreateFeedbackDto {
  @IsString()
  @MinLength(1, { message: '反馈标题不能为空' })
  @MaxLength(100, { message: '标题最多 100 个字符' })
  title: string

  @IsString()
  @MinLength(1, { message: '反馈内容不能为空' })
  @MaxLength(2000, { message: '内容最多 2000 个字符' })
  content: string

  @IsOptional()
  @IsString()
  @IsIn(['bug', 'feature', 'question', 'other'], { message: '无效的反馈类型' })
  type?: 'bug' | 'feature' | 'question' | 'other'
}

export class AdminReplyFeedbackDto {
  @IsString()
  @MinLength(1, { message: '回复内容不能为空' })
  @MaxLength(2000, { message: '回复最多 2000 个字符' })
  reply: string

  @IsOptional()
  @IsString()
  @IsIn(['open', 'replied', 'resolved', 'closed'], { message: '无效的状态' })
  status?: 'open' | 'replied' | 'resolved' | 'closed'
}
