import 'reflect-metadata'
import * as dotenv from 'dotenv'

import { NestFactory } from '@nestjs/core'
import { Body, Controller, Get, HttpException, HttpStatus, Injectable, Logger, Module, Post, Query, ValidationPipe } from '@nestjs/common'
import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

import type { AxiosInstance } from 'axios'
import axios from 'axios'
import * as FormData from 'form-data'
dotenv.config()

// ============ Sora DTOs ============

class CreateVideoDto {
  @IsOptional()
  @IsArray()
  images?: string[]

  @IsString()
  model: string

  @IsOptional()
  @IsString()
  @IsIn(['portrait', 'landscape'])
  orientation?: string

  @IsString()
  prompt: string

  @IsOptional()
  @IsString()
  @IsIn(['small', 'large'])
  size?: string

  @IsOptional()
  @IsNumber()
  duration?: number

  @IsOptional()
  @IsBoolean()
  watermark?: boolean

  @IsOptional()
  @IsBoolean()
  private?: boolean
}

class QueryVideoDto {
  @IsString()
  @IsNotEmpty()
  id: string
}

class CreateCharacterDto {
  @IsOptional()
  @IsString()
  url?: string // 视频地址

  @IsString()
  @IsNotEmpty()
  timestamps: string // 时间范围，如 "1,3" 表示1-3秒

  @IsOptional()
  @IsString()
  from_task?: string // 已完成的任务ID
}

// ============ VEO DTOs ============

class CreateVeoVideoDto {
  @IsString()
  model: string

  @IsString()
  prompt: string

  @IsOptional()
  @IsString()
  @IsIn(['720x1280', '1280x720'])
  size?: string

  @IsOptional()
  @IsNumber()
  seconds?: number

  @IsOptional()
  @IsString()
  input_reference?: string // 图片URL

  @IsOptional()
  @IsBoolean()
  enable_upsample?: boolean
}

class QueryVeoVideoDto {
  @IsString()
  @IsNotEmpty()
  id: string
}

// ============ Service ============

@Injectable()
class SoraService {
  private readonly logger = new Logger(SoraService.name)
  private readonly httpClient: AxiosInstance
  private readonly soraServer: string
  private readonly soraKey: string
  private readonly characterServer: string
  private readonly characterKey: string

  constructor() {
    this.soraServer = process.env.SORA_SERVER || 'https://magic666.top'
    this.soraKey = process.env.SORA_KEY || ''
    // 角色创建 API 可单独配置，不填则使用 SORA_SERVER
    this.characterServer = process.env.SORA_CHARACTER_SERVER || this.soraServer
    this.characterKey = process.env.SORA_CHARACTER_KEY || this.soraKey

    this.logger.log(`🔧 Sora Server: ${this.soraServer}`)
    this.logger.log(`🔑 Sora Key: ${this.soraKey ? `****${this.soraKey.slice(-8)}` : 'NOT SET'}`)
    this.logger.log(`🎭 Character Server: ${this.characterServer}`)
    this.logger.log(`🔑 Character Key: ${this.characterKey ? `****${this.characterKey.slice(-8)}` : 'NOT SET'}`)

    this.httpClient = axios.create({
      baseURL: this.soraServer,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.soraKey}`,
      },
    })

    this.httpClient.interceptors.request.use((config) => {
      this.logger.log(`➡️ Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`)
      return config
    })

    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.log(`⬅️ Response: ${response.status}`)
        return response
      },
      (error) => {
        this.logger.error(`❌ Error: ${error.response?.status} - ${error.message}`)
        throw error
      },
    )
  }

  async createVideo(dto: CreateVideoDto): Promise<any> {
    // 转换参数格式适配 magic666.top API
    // orientation -> size 映射
    let size = '1280x720' // 默认横屏
    if (dto.orientation === 'portrait')
      size = '720x1280'
    else if (dto.orientation === 'landscape')
      size = '1280x720'

    // duration -> seconds
    const seconds = dto.duration || 10

    // 使用 FormData 格式
    const formData = new FormData()
    formData.append('model', dto.model || 'sora-2')
    formData.append('prompt', dto.prompt)
    formData.append('size', size)
    formData.append('seconds', String(seconds))

    this.logger.log(`📦 Payload: model=${dto.model}, prompt=${dto.prompt}, size=${size}, seconds=${seconds}`)

    const response = await this.httpClient.post('/v1/videos', formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${this.soraKey}`,
      },
    })
    return response.data
  }

  async queryVideo(taskId: string): Promise<any> {
    const response = await this.httpClient.get(`/v1/videos/${taskId}`)
    return response.data
  }

  async createCharacter(dto: CreateCharacterDto): Promise<any> {
    // 角色创建使用独立的 API 配置（yunwu.ai 等）
    const payload: any = {
      timestamps: dto.timestamps,
    }

    // url 和 from_task 二选一
    if (dto.url)
      payload.url = dto.url

    if (dto.from_task)
      payload.from_task = dto.from_task

    this.logger.log(`🎭 Creating character with timestamps: ${dto.timestamps}`)
    this.logger.log(`📦 Character Payload: ${JSON.stringify(payload, null, 2)}`)
    this.logger.log(`➡️ Character API: POST ${this.characterServer}/sora/v1/characters`)

    try {
      const response = await axios.post(`${this.characterServer}/sora/v1/characters`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.characterKey}`,
        },
        timeout: 60000,
      })
      return response.data
    }
    catch (error: any) {
      // 打印详细错误信息
      this.logger.error(`❌ Character API Error Status: ${error.response?.status}`)
      this.logger.error(`❌ Character API Error Data: ${JSON.stringify(error.response?.data)}`)
      throw error
    }
  }
}

// ============ VEO Service ============

@Injectable()
class VeoService {
  private readonly logger = new Logger(VeoService.name)
  private readonly httpClient: AxiosInstance
  private readonly veoServer: string
  private readonly veoKey: string

  constructor() {
    this.veoServer = process.env.VEO_SERVER || 'https://magic666.top'
    this.veoKey = process.env.VEO_KEY || ''

    this.logger.log(`🔧 VEO Server: ${this.veoServer}`)
    this.logger.log(`🔑 VEO Key: ${this.veoKey ? `****${this.veoKey.slice(-8)}` : 'NOT SET'}`)

    this.httpClient = axios.create({
      baseURL: this.veoServer,
      timeout: 120000,
      headers: {
        Authorization: `Bearer ${this.veoKey}`,
      },
    })

    this.httpClient.interceptors.request.use((config) => {
      this.logger.log(`➡️ VEO Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`)
      return config
    })

    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.log(`⬅️ VEO Response: ${response.status}`)
        return response
      },
      (error) => {
        this.logger.error(`❌ VEO Error: ${error.response?.status} - ${error.message}`)
        throw error
      },
    )
  }

  async createVideo(dto: CreateVeoVideoDto): Promise<any> {
    // VEO 使用 multipart/form-data
    const formData = new FormData()
    formData.append('model', dto.model || 'veo_3_1-fast')
    formData.append('prompt', dto.prompt)

    if (dto.size)
      formData.append('size', dto.size)

    if (dto.seconds)
      formData.append('seconds', dto.seconds.toString())

    if (dto.enable_upsample !== undefined)
      formData.append('enable_upsample', dto.enable_upsample.toString())

    this.logger.log(`📦 VEO Payload: model=${dto.model}, prompt=${dto.prompt}, size=${dto.size}, seconds=${dto.seconds}`)

    const response = await this.httpClient.post('/v1/videos', formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${this.veoKey}`,
      },
    })
    return response.data
  }

  async queryVideo(taskId: string): Promise<any> {
    const response = await this.httpClient.get(`/v1/videos/${taskId}`)
    return response.data
  }
}

// ============ Sora Controller ============

@Controller('v1/video')
class SoraController {
  private readonly logger = new Logger(SoraController.name)

  constructor(private readonly soraService: SoraService) {}

  @Post('create')
  async createVideo(@Body() dto: CreateVideoDto) {
    this.logger.log(`📹 Creating video: ${dto.model} - ${dto.prompt}`)
    try {
      const result = await this.soraService.createVideo(dto)
      this.logger.log(`✅ Task created: ${result.id}`)
      return result
    }
    catch (error) {
      this.logger.error(`❌ Failed: ${error.message}`)
      throw new HttpException({
        status: 'error',
        message: error.message,
        details: error.response?.data || null,
      }, error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get('query')
  async queryVideo(@Query() dto: QueryVideoDto) {
    this.logger.log(`🔍 Querying: ${dto.id}`)
    try {
      const result = await this.soraService.queryVideo(dto.id)
      this.logger.log(`📊 Status: ${result.status}`)
      return result
    }
    catch (error) {
      this.logger.error(`❌ Failed: ${error.message}`)
      throw new HttpException({
        status: 'error',
        message: error.message,
        details: error.response?.data || null,
      }, error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Post('character')
  async createCharacter(@Body() dto: CreateCharacterDto) {
    this.logger.log(`🎭 Creating character from: ${dto.url || dto.from_task}, timestamps: ${dto.timestamps}`)
    try {
      const result = await this.soraService.createCharacter(dto)
      this.logger.log(`✅ Character created: ${result.username} (${result.id})`)
      return result
    }
    catch (error) {
      this.logger.error(`❌ Character creation failed: ${error.message}`)
      throw new HttpException({
        status: 'error',
        message: error.message,
        details: error.response?.data || null,
      }, error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}

// ============ VEO Controller ============

@Controller('v1/veo')
class VeoController {
  private readonly logger = new Logger(VeoController.name)

  constructor(private readonly veoService: VeoService) {}

  @Post('create')
  async createVideo(@Body() dto: CreateVeoVideoDto) {
    this.logger.log(`📹 Creating VEO video: ${dto.model} - ${dto.prompt}`)
    try {
      const result = await this.veoService.createVideo(dto)
      this.logger.log(`✅ VEO Task created: ${result.id || JSON.stringify(result)}`)
      return result
    }
    catch (error) {
      this.logger.error(`❌ VEO Failed: ${error.message}`)
      throw new HttpException({
        status: 'error',
        message: error.message,
        details: error.response?.data || null,
      }, error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get('query')
  async queryVideo(@Query() dto: QueryVeoVideoDto) {
    this.logger.log(`🔍 VEO Querying: ${dto.id}`)
    try {
      const result = await this.veoService.queryVideo(dto.id)
      this.logger.log(`📊 VEO Status: ${result.status || JSON.stringify(result)}`)
      return result
    }
    catch (error) {
      this.logger.error(`❌ VEO Query Failed: ${error.message}`)
      throw new HttpException({
        status: 'error',
        message: error.message,
        details: error.response?.data || null,
      }, error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}

// ============ Module ============

@Module({
  controllers: [SoraController, VeoController],
  providers: [SoraService, VeoService],
})
class AppModule {}

// ============ Bootstrap ============

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  })

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false,
  }))

  const port = process.env.PORT || 3003
  await app.listen(port)

  console.log(`\n🚀 Video Generation NestJS Service is running on: http://localhost:${port}`)
  console.log('')
  console.log('📹 === Sora API ===')
  console.log(`   Create Video:     POST http://localhost:${port}/v1/video/create`)
  console.log(`   Query Video:      GET  http://localhost:${port}/v1/video/query?id=xxx`)
  console.log(`   Create Character: POST http://localhost:${port}/v1/video/character`)
  console.log('')
  console.log('🎬 === VEO API ===')
  console.log(`   Create: POST http://localhost:${port}/v1/veo/create`)
  console.log(`   Query:  GET  http://localhost:${port}/v1/veo/query?id=xxx\n`)
}

bootstrap()
