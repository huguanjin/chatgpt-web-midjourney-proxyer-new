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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { Request } from 'express'
import { GeminiImageService } from './gemini-image.service'
import { CreateImageDto } from './dto/create-image.dto'
import { QueryImageDto } from './dto/query-image.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('v1/image')
@UseGuards(JwtAuthGuard)
export class GeminiImageController {
  private readonly logger = new Logger(GeminiImageController.name)

  constructor(private readonly geminiImageService: GeminiImageService) {}

  /**
   * 创建图片生成任务（异步，JSON 格式）
   * POST /v1/image/create
   */
  @Post('create')
  async createImage(@Body() createImageDto: CreateImageDto, @Req() req: Request) {
    const userId = (req as any).user?.userId || 'anonymous'
    this.logger.log(`🖼️ Creating image with model: ${createImageDto.model || 'gemini-3-pro-image-preview'}`)
    this.logger.log(`📝 Prompt: ${createImageDto.prompt}`)
    this.logger.log(`📐 Aspect Ratio: ${createImageDto.aspectRatio || '1:1'}`)
    this.logger.log(`📐 Image Size: ${createImageDto.imageSize || '1K'}`)
    this.logger.log(`👤 UserId: ${userId}`)

    try {
      const result = await this.geminiImageService.createImage(createImageDto, userId)
      this.logger.log(`✅ Image task created: ${result.id}`)
      return result
    }
    catch (error) {
      this.logger.error(`❌ Failed to create image: ${error.message}`)
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
   * 创建图片生成任务（异步，支持文件上传）
   * POST /v1/image/create-with-ref
   */
  @Post('create-with-ref')
  @UseInterceptors(FilesInterceptor('reference_images', 5))
  async createImageWithRef(
    @Body() createImageDto: CreateImageDto,
    @Req() req: Request,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const userId = (req as any).user?.userId || 'anonymous'
    this.logger.log(`🖼️ Creating image with reference`)
    this.logger.log(`📝 Prompt: ${createImageDto.prompt}`)
    this.logger.log(`👤 UserId: ${userId}`)

    try {
      if (files && files.length > 0) {
        createImageDto.referenceImages = files.map(file => ({
          mimeType: file.mimetype,
          data: file.buffer.toString('base64'),
        }))
        this.logger.log(`📎 Reference images: ${files.length}`)
      }

      const result = await this.geminiImageService.createImage(createImageDto, userId)
      this.logger.log(`✅ Image task created: ${result.id}`)
      return result
    }
    catch (error) {
      this.logger.error(`❌ Failed to create image: ${error.message}`)
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
   * 同步生成图片（等待结果，JSON 格式）
   * POST /v1/image/generate
   */
  @Post('generate')
  async generateImage(@Body() createImageDto: CreateImageDto, @Req() req: Request) {
    const userId = (req as any).user?.userId || 'anonymous'
    this.logger.log(`🖼️ Generating image synchronously`)
    this.logger.log(`📦 Raw Body: ${JSON.stringify(req.body)}`)
    this.logger.log(`📦 DTO: ${JSON.stringify(createImageDto)}`)
    this.logger.log(`📝 Prompt: ${createImageDto.prompt}`)
    this.logger.log(`📐 Aspect Ratio: ${createImageDto.aspectRatio || '1:1'}`)
    this.logger.log(`📐 Image Size: ${createImageDto.imageSize || '1K'}`)
    this.logger.log(`👤 UserId: ${userId}`)

    try {
      const result = await this.geminiImageService.generateImageSync(createImageDto, userId)
      this.logger.log(`✅ Image generated: ${result.images?.length || 0} image(s)`)
      return result
    }
    catch (error) {
      this.logger.error(`❌ Failed to generate image: ${error.message}`)
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
   * 同步生成图片（支持文件上传）
   * POST /v1/image/generate-with-ref
   */
  @Post('generate-with-ref')
  @UseInterceptors(FilesInterceptor('reference_images', 5))
  async generateImageWithRef(
    @Body() createImageDto: CreateImageDto,
    @Req() req: Request,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const userId = (req as any).user?.userId || 'anonymous'
    this.logger.log(`🖼️ Generating image with reference`)
    this.logger.log(`📝 Prompt: ${createImageDto.prompt}`)
    this.logger.log(`👤 UserId: ${userId}`)

    try {
      if (files && files.length > 0) {
        createImageDto.referenceImages = files.map(file => ({
          mimeType: file.mimetype,
          data: file.buffer.toString('base64'),
        }))
      }

      const result = await this.geminiImageService.generateImageSync(createImageDto, userId)
      this.logger.log(`✅ Image generated: ${result.images?.length || 0} image(s)`)
      return result
    }
    catch (error) {
      this.logger.error(`❌ Failed to generate image: ${error.message}`)
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
   * 查询图片任务状态
   * GET /v1/image/query?id=xxx
   */
  @Get('query')
  async queryImage(@Query() queryDto: QueryImageDto) {
    this.logger.log(`🔍 Querying image task: ${queryDto.id}`)

    try {
      const result = await this.geminiImageService.queryImage(queryDto.id)
      this.logger.log(`📊 Task status: ${result.status}`)
      return result
    }
    catch (error) {
      this.logger.error(`❌ Failed to query image: ${error.message}`)
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
