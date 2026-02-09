import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import type { CreateVideoDto } from './dto/create-video.dto'
import { ConfigService } from '../config/config.service'

@Injectable()
export class SoraService {
  private readonly logger = new Logger(SoraService.name)

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.getSoraConfig()
    this.logger.log(`🔧 Sora Server: ${config.server}`)
    this.logger.log(`🔑 Sora Key: ${config.key ? `****${config.key.slice(-8)}` : 'NOT SET'}`)
  }

  /**
   * 创建 HTTP 客户端（每次使用最新配置）
   */
  private createHttpClient() {
    const config = this.configService.getSoraConfig()
    return axios.create({
      baseURL: config.server,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${config.key}`,
      },
    })
  }

  /**
   * 创建视频任务
   */
  async createVideo(dto: CreateVideoDto): Promise<any> {
    const config = this.configService.getSoraConfig()
    const payload = {
      images: dto.images || [],
      model: dto.model || 'sora-2',
      orientation: dto.orientation || 'landscape',
      prompt: dto.prompt,
      size: dto.size || 'small',
      duration: dto.duration || 10,
      watermark: dto.watermark ?? true,
      private: dto.private ?? false,
    }

    this.logger.log(`📤 Sending create request to: ${config.server}/v1/video/create`)
    this.logger.log(`📦 Payload: ${JSON.stringify(payload, null, 2)}`)

    const httpClient = this.createHttpClient()
    const response = await httpClient.post('/v1/video/create', payload)
    return response.data
  }

  /**
   * 查询视频任务状态
   */
  async queryVideo(taskId: string): Promise<any> {
    const config = this.configService.getSoraConfig()
    const url = `/v1/videos/${encodeURIComponent(taskId)}`
    
    this.logger.log(`📤 Sending query request for task: ${taskId}`)
    this.logger.log(`🔗 Full URL: ${config.server}${url}`)

    try {
      const httpClient = this.createHttpClient()
      const response = await httpClient.get(url)
      return response.data
    } catch (error) {
      // 输出更详细的错误信息
      this.logger.error(`❌ Query failed for task: ${taskId}`)
      this.logger.error(`📋 Status: ${error.response?.status}`)
      this.logger.error(`📋 Response data: ${JSON.stringify(error.response?.data, null, 2)}`)
      throw error
    }
  }
}
