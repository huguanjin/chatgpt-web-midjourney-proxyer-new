import { Global, Module } from '@nestjs/common'
import { VideoTasksService } from './video-tasks.service'
import { VideoTasksController } from './video-tasks.controller'
import { AuthModule } from '../auth/auth.module'

@Global()
@Module({
  imports: [AuthModule],
  controllers: [VideoTasksController],
  providers: [VideoTasksService],
  exports: [VideoTasksService],
})
export class VideoTasksModule {}
