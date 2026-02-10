import { Module } from '@nestjs/common'
import { GrokVideoController } from './grok-video.controller'
import { GrokVideoService } from './grok-video.service'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [AuthModule],
  controllers: [GrokVideoController],
  providers: [GrokVideoService],
  exports: [GrokVideoService],
})
export class GrokVideoModule {}
