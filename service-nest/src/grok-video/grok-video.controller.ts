import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { GrokVideoService } from './grok-video.service'
import { CreateGrokVideoDto } from './dto/create-grok-video.dto'
import { QueryGrokVideoDto } from './dto/query-grok-video.dto'

@Controller('v1/grok')
export class GrokVideoController {
  private readonly logger = new Logger(GrokVideoController.name)

  constructor(private readonly grokVideoService: GrokVideoService) {}

  /**
   * 创建 Grok 视频
   * POST /v1/grok/create
   * 支持 multipart/form-data 上传参考图
   */
  @Post('create')
  @UseInterceptors(FilesInterceptor('input_reference', 10))
  async createVideo(
    @Body() createVideoDto: CreateGrokVideoDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    this.logger.log(`📹 Creating Grok video with model: ${createVideoDto.model}`)
    this.logger.log(`📝 Prompt: ${createVideoDto.prompt}`)
    if (files && files.length > 0) {
      this.logger.log(`🖼️ Reference images: ${files.length}`)
    }

    try {
      const result = await this.grokVideoService.createVideo(createVideoDto, files)
      this.logger.log(`✅ Grok video task created: ${result.id}`)
      return result
    }
    catch (error) {
      this.logger.error(`❌ Failed to create Grok video: ${error.message}`)
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
   * 查询 Grok 视频任务状态
   * GET /v1/grok/query?id=xxx
   */
  @Get('query')
  async queryVideo(@Query() queryDto: QueryGrokVideoDto) {
    this.logger.log(`🔍 Querying Grok video task: ${queryDto.id}`)

    try {
      const result = await this.grokVideoService.queryVideo(queryDto.id)
      this.logger.log(`📊 Grok task status: ${result.status}`)
      return result
    }
    catch (error) {
      this.logger.error(`❌ Failed to query Grok video: ${error.message}`)
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
