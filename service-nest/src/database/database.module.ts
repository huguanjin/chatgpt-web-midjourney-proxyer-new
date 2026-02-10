import { Global, Module } from '@nestjs/common'
import { DatabaseService } from './database.service'

@Global() // 全局模块，所有模块可直接注入 DatabaseService
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
