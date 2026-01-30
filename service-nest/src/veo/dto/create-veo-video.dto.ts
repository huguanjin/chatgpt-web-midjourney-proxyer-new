import { IsString, IsOptional, IsBoolean } from 'class-validator'
import { Transform } from 'class-transformer'

export class CreateVeoVideoDto {
  @IsString()
  model: string

  @IsString()
  prompt: string

  @IsOptional()
  @IsString()
  size?: '720x1280' | '1280x720'

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  seconds?: number

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  enable_upsample?: boolean
}
