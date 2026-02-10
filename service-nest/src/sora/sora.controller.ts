import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { SoraService } from './sora.service'
import { CreateVideoDto } from './dto/create-video.dto'
import { QueryVideoDto } from './dto/query-video.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { VideoTasksService } from '../video-tasks/video-tasks.service'

@Controller('v1/video')
@UseGuards(JwtAuthGuard)
export class SoraController {
  private readonly logger = new Logger(SoraController.name)

  constructor(
    private readonly soraService: SoraService,
    private readonly videoTasksService: VideoTasksService,
  ) {}

  /**
   * 创建 Sora 视频
   * POST /v1/video/create
   */
  @Post('create')
  async createVideo(@Body() createVideoDto: CreateVideoDto, @Req() req: any) {
    const username = req.user.username
    this.logger.log(`📹 Creating video with model: ${createVideoDto.model}`)
    this.logger.log(`📝 Prompt: ${createVideoDto.prompt}`)

    try {
      const result = await this.soraService.createVideo(createVideoDto, username)
      this.logger.log(`✅ Video task created: ${result.id}`)

      // 记录任务到数据库
      try {
        await this.videoTasksService.createTask(username, {
          externalTaskId: result.id,
          platform: 'sora',
          model: createVideoDto.model || 'sora',
          prompt: createVideoDto.prompt,
          params: {
            orientation: createVideoDto.orientation,
            duration: createVideoDto.duration,
            watermark: createVideoDto.watermark,
          },
          apiResponse: result,
        })
      } catch (dbErr) {
        this.logger.warn(`⚠️ Failed to save task to DB: ${dbErr.message}`)
      }

      return result
    }
    catch (error) {
      this.logger.error(`❌ Failed to create video: ${error.message}`)
      if (error.response?.data) {
        this.logger.error(`📋 API Response: ${JSON.stringify(error.response.data)}`)
      }
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
  async queryVideo(@Query() queryDto: QueryVideoDto, @Req() req: any) {
    this.logger.log(`🔍 Querying video task: ${queryDto.id}`)
    const username = req?.user?.username || 'unknown'

    try {
      const result = await this.soraService.queryVideo(queryDto.id, username)
      this.logger.log(`📊 Task status: ${result.status}`)

      // 更新数据库中的任务状态
      try {
        const updates: any = { lastQueryResponse: result }
        if (result.status === 'completed' || result.status === 'complete') {
          updates.status = 'completed'
          updates.progress = 100
          updates.video_url = result.video_url || result.output?.video_url
        } else if (result.status === 'processing' || result.status === 'in_progress') {
          updates.status = 'processing'
          updates.progress = result.progress || 50
        } else if (result.status === 'failed' || result.status === 'error') {
          updates.status = 'failed'
          updates.error = result.error || result.message
        }
        await this.videoTasksService.updateTaskByExternalId(queryDto.id, updates)
      } catch (dbErr) {
        this.logger.warn(`⚠️ Failed to update task in DB: ${dbErr.message}`)
      }

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
