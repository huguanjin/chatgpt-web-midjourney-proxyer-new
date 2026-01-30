import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SoraModule } from './sora/sora.module'
import { VeoModule } from './veo/veo.module'

@Module({
  imports: [
    // 配置模块 - 加载 .env 文件
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Sora 视频生成模块
    SoraModule,
    // VEO 视频生成模块
    VeoModule,
  ],
})
export class AppModule {}
