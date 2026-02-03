import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import * as FormData from 'form-data'
import { CreateVeoVideoDto } from './dto/create-veo-video.dto'
import { ConfigService } from '../config/config.service'

@Injectable()
export class VeoService {
  private readonly logger = new Logger(VeoService.name)

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.getVeoConfig()
    this.logger.log(`🔧 VEO Server: ${config.server}`)
    this.logger.log(`🔑 VEO Key: ${config.key ? `****${config.key.slice(-8)}` : 'NOT SET'}`)
  }

  /**
   * 创建 VEO 视频任务（支持参考图）
   */
  async createVideo(dto: CreateVeoVideoDto, files?: Express.Multer.File[]): Promise<any> {
    const config = this.configService.getVeoConfig()
    
    this.logger.log(`📤 Creating VEO video with model: ${dto.model}`)
    this.logger.log(`📝 Prompt: ${dto.prompt}`)

    const formData = new FormData()
    
    // 添加基础参数
    formData.append('model', dto.model || 'veo_3_1-fast')
    formData.append('prompt', dto.prompt)
    
    if (dto.size) {
      formData.append('size', dto.size)
    }
    
    if (dto.seconds) {
      formData.append('seconds', String(dto.seconds))
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
      }
    )

    return response.data
  }

  /**
   * 查询 VEO 视频任务状态
   */
  async queryVideo(taskId: string): Promise<any> {
    const config = this.configService.getVeoConfig()
    
    this.logger.log(`📤 Querying VEO task: ${taskId}`)

    const response = await axios.get(
      `${config.server}/v1/videos/${encodeURIComponent(taskId)}`,
      {
        headers: {
          'Authorization': `Bearer ${config.key}`,
        },
        timeout: 30000,
      }
    )

    return response.data
  }
}
