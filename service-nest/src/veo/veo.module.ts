import { Module } from '@nestjs/common'
import { VeoController } from './veo.controller'
import { VeoService } from './veo.service'

@Module({
  controllers: [VeoController],
  providers: [VeoService],
  exports: [VeoService],
})
export class VeoModule {}
