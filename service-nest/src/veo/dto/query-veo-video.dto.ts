import { IsString } from 'class-validator'

export class QueryVeoVideoDto {
  @IsString()
  id: string
}
