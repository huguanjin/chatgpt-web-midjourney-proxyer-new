import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import { CreateVideoDto } from './dto/create-video.dto'
import { ConfigService } from '../config/config.service'
import { UserConfigService } from '../user-config/user-config.service'

@Injectable()
export class SoraService {
  private readonly logger = new Logger(SoraService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly userConfigService: UserConfigService,
  ) {
    const config = this.configService.getSoraConfig()
    this.logger.log(`🔧 Sora Server: ${config.server}`)
    this.logger.log(`🔑 Sora Key: ${config.key ? `****${config.key.slice(-8)}` : 'NOT SET'}`)
  }

  /**
   * 获取用户级 Sora 配置（优先用户配置，回退全局配置）
   */
  private async getUserSoraConfig(username: string) {
    try {
      const userConfig = await this.userConfigService.getUserConfig(username)
      if (userConfig.sora?.server) {
        return userConfig.sora
      }
    } catch (e) {
      this.logger.warn(`⚠️ Failed to load user config for ${username}, using global`)
    }
    return this.configService.getSoraConfig()
  }

  /**
   * 创建 HTTP 客户端（使用指定配置）
   */
  private createHttpClientWithConfig(config: { server: string; key: string }) {
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
  async createVideo(dto: CreateVideoDto, username: string): Promise<any> {
    const config = await this.getUserSoraConfig(username)
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

    const httpClient = this.createHttpClientWithConfig(config)
    const response = await httpClient.post('/v1/video/create', payload)
    return response.data
  }

  /**
   * 查询视频任务状态
   */
  async queryVideo(taskId: string, username: string): Promise<any> {
    const config = await this.getUserSoraConfig(username)
    const url = `/v1/videos/${encodeURIComponent(taskId)}`
    
    this.logger.log(`📤 Sending query request for task: ${taskId}`)
    this.logger.log(`🔗 Full URL: ${config.server}${url}`)

    try {
      const httpClient = this.createHttpClientWithConfig(config)
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
