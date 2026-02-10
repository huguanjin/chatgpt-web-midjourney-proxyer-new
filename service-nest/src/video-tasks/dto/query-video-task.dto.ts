import { IsOptional, IsString, IsIn } from 'class-validator'

export class QueryVideoTaskDto {
  @IsOptional()
  @IsIn(['sora', 'veo', 'grok'])
  platform?: 'sora' | 'veo' | 'grok'

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsString()
  page?: string

  @IsOptional()
  @IsString()
  limit?: string
}
