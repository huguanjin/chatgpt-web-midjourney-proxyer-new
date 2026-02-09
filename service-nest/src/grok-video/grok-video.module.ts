import { Module } from '@nestjs/common'
import { GrokVideoController } from './grok-video.controller'
import { GrokVideoService } from './grok-video.service'

@Module({
  controllers: [GrokVideoController],
  providers: [GrokVideoService],
  exports: [GrokVideoService],
})
export class GrokVideoModule {}
