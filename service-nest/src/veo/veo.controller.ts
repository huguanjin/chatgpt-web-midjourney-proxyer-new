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
import { VeoService } from './veo.service'
import { CreateVeoVideoDto } from './dto/create-veo-video.dto'
import { QueryVeoVideoDto } from './dto/query-veo-video.dto'

@Controller('v1/veo')
export class VeoController {
  private readonly logger = new Logger(VeoController.name)

  constructor(private readonly veoService: VeoService) {}

  /**
   * 创建 VEO 视频
   * POST /v1/veo/create
   * 支持 multipart/form-data 上传参考图
   */
  @Post('create')
  @UseInterceptors(FilesInterceptor('input_reference', 10)) // 最多 10 张参考图
  async createVideo(
    @Body() createVideoDto: CreateVeoVideoDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    this.logger.log(`📹 Creating VEO video with model: ${createVideoDto.model}`)
    this.logger.log(`📝 Prompt: ${createVideoDto.prompt}`)
    if (files && files.length > 0) {
      this.logger.log(`🖼️ Reference images: ${files.length}`)
    }

    try {
      const result = await this.veoService.createVideo(createVideoDto, files)
      this.logger.log(`✅ VEO video task created: ${result.id}`)
      return result
    }
    catch (error) {
      this.logger.error(`❌ Failed to create VEO video: ${error.message}`)
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
   * 查询 VEO 视频任务状态
   * GET /v1/veo/query?id=xxx
   */
  @Get('query')
  async queryVideo(@Query() queryDto: QueryVeoVideoDto) {
    this.logger.log(`🔍 Querying VEO video task: ${queryDto.id}`)

    try {
      const result = await this.veoService.queryVideo(queryDto.id)
      this.logger.log(`📊 VEO task status: ${result.status}`)
      return result
    }
    catch (error) {
      this.logger.error(`❌ Failed to query VEO video: ${error.message}`)
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
