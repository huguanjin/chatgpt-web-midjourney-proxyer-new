import { Global, Module, forwardRef } from '@nestjs/common'
import { UserConfigController } from './user-config.controller'
import { UserConfigService } from './user-config.service'
import { AuthModule } from '../auth/auth.module'

@Global() // 全局模块，其他服务模块可直接注入 UserConfigService
@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [UserConfigController],
  providers: [UserConfigService],
  exports: [UserConfigService],
})
export class UserConfigModule {}
