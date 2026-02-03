import { Module } from '@nestjs/common'
import { ConfigModule as NestConfigModule } from '@nestjs/config'
import { SoraModule } from './sora/sora.module'
import { VeoModule } from './veo/veo.module'
import { GeminiImageModule } from './gemini-image/gemini-image.module'
import { ConfigModule } from './config/config.module'

@Module({
  imports: [
    // NestJS 配置模块 - 加载 .env 文件（启动时使用）
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // 自定义配置模块 - 支持动态更新
    ConfigModule,
    // Sora 视频生成模块
    SoraModule,
    // VEO 视频生成模块
    VeoModule,
    // Gemini 图片生成模块
    GeminiImageModule,
  ],
})
export class AppModule {}
