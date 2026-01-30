import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Query,
} from '@nestjs/common'
import { SoraService } from './sora.service'
import type { CreateVideoDto } from './dto/create-video.dto'
import type { QueryVideoDto } from './dto/query-video.dto'

@Controller('v1/video')
export class SoraController {
  private readonly logger = new Logger(SoraController.name)

  constructor(private readonly soraService: SoraService) {}

  /**
   * 创建 Sora 视频
   * POST /v1/video/create
   */
  @Post('create')
  async createVideo(@Body() createVideoDto: CreateVideoDto) {
    this.logger.log(`📹 Creating video with model: ${createVideoDto.model}`)
    this.logger.log(`📝 Prompt: ${createVideoDto.prompt}`)

    try {
      const result = await this.soraService.createVideo(createVideoDto)
      this.logger.log(`✅ Video task created: ${result.id}`)
      return result
    }
    catch (error) {
      this.logger.error(`❌ Failed to create video: ${error.message}`)
      throw new HttpException(
        {
          status: 'error',
          message: error.message,
          details: error.response?.data || null,
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * 查询视频任务状态
   * GET /v1/video/query?id=xxx
   */
  @Get('query')
  async queryVideo(@Query() queryDto: QueryVideoDto) {
    this.logger.log(`🔍 Querying video task: ${queryDto.id}`)

    try {
      const result = await this.soraService.queryVideo(queryDto.id)
      this.logger.log(`📊 Task status: ${result.status}`)
      return result
    }
    catch (error) {
      this.logger.error(`❌ Failed to query video: ${error.message}`)
      throw new HttpException(
        {
          status: 'error',
          message: error.message,
          details: error.response?.data || null,
        },
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }
}
