import 'reflect-metadata'
import * as dotenv from 'dotenv'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
dotenv.config()

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // 启用 CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  })

  // 全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false,
  }))

  const port = process.env.PORT || 3003
  await app.listen(port)

  console.log(`🚀 Sora NestJS Service is running on: http://localhost:${port}`)
  console.log(`📹 Video Create API: POST http://localhost:${port}/v1/video/create`)
  console.log(`🔍 Video Query API:  GET  http://localhost:${port}/v1/video/query?id=xxx`)
}

bootstrap()
