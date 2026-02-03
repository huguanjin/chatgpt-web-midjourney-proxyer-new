import { Module } from '@nestjs/common'
import { GeminiImageController } from './gemini-image.controller'
import { GeminiImageService } from './gemini-image.service'

@Module({
  controllers: [GeminiImageController],
  providers: [GeminiImageService],
  exports: [GeminiImageService],
})
export class GeminiImageModule {}
