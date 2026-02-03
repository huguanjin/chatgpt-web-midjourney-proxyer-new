import { Global, Module } from '@nestjs/common'
import { ConfigService } from './config.service'
import { ConfigController } from './config.controller'

@Global() // 全局模块，其他模块可以直接注入 ConfigService
@Module({
  controllers: [ConfigController],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
