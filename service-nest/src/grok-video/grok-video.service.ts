import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import * as FormData from 'form-data'
import { CreateGrokVideoDto } from './dto/create-grok-video.dto'
import { ConfigService } from '../config/config.service'

@Injectable()
export class GrokVideoService {
  private readonly logger = new Logger(GrokVideoService.name)

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.getGrokConfig()
    this.logger.log(`🔧 Grok Server: ${config.server}`)
    this.logger.log(`🔑 Grok Key: ${config.key ? `****${config.key.slice(-8)}` : 'NOT SET'}`)
  }

  /**
   * 创建 Grok 视频任务（支持参考图）
   * API: POST /v1/videos (multipart/form-data)
   */
  async createVideo(dto: CreateGrokVideoDto, files?: Express.Multer.File[]): Promise<any> {
    const config = this.configService.getGrokConfig()

    this.logger.log(`📤 Creating Grok video with model: ${dto.model}`)
    this.logger.log(`📝 Prompt: ${dto.prompt}`)

    const formData = new FormData()

    // 添加基础参数
    formData.append('model', dto.model || 'grok-video-3')
    formData.append('prompt', dto.prompt)

    if (dto.aspect_ratio) {
      formData.append('aspect_ratio', dto.aspect_ratio)
    }

    if (dto.seconds) {
      formData.append('seconds', String(dto.seconds))
    }

    if (dto.size) {
      formData.append('size', dto.size)
    }

    // 添加参考图（如果有）
    if (files && files.length > 0) {
      this.logger.log(`🖼️ Adding ${files.length} reference images`)
      for (const file of files) {
        formData.append('input_reference', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        })
      }
    }

    const response = await axios.post(
      `${config.server}/v1/videos`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${config.key}`,
        },
        timeout: 120000,
      },
    )

    return response.data
  }

  /**
   * 查询 Grok 视频任务状态
   * API: GET /v1/videos/{taskId}
   */
  async queryVideo(taskId: string): Promise<any> {
    const config = this.configService.getGrokConfig()

    this.logger.log(`📤 Querying Grok task: ${taskId}`)

    const response = await axios.get(
      `${config.server}/v1/videos/${encodeURIComponent(taskId)}`,
      {
        headers: {
          'Authorization': `Bearer ${config.key}`,
        },
        timeout: 30000,
      },
    )

    return response.data
  }
}
