import { Module } from '@nestjs/common'
import { VeoController } from './veo.controller'
import { VeoService } from './veo.service'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [AuthModule],
  controllers: [VeoController],
  providers: [VeoService],
  exports: [VeoService],
})
export class VeoModule {}
