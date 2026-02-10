import { Module } from '@nestjs/common'
import { GeminiImageController } from './gemini-image.controller'
import { GeminiImageService } from './gemini-image.service'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [AuthModule],
  controllers: [GeminiImageController],
  providers: [GeminiImageService],
  exports: [GeminiImageService],
})
export class GeminiImageModule {}
