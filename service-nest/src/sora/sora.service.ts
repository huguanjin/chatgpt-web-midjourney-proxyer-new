import { Injectable, Logger } from '@nestjs/common'
import type { AxiosInstance } from 'axios'
import axios from 'axios'
import type { CreateVideoDto } from './dto/create-video.dto'

@Injectable()
export class SoraService {
  private readonly logger = new Logger(SoraService.name)
  private readonly httpClient: AxiosInstance
  private readonly soraServer: string
  private readonly soraKey: string

  constructor() {
    this.soraServer = process.env.SORA_SERVER || 'https://magic666.top'
    this.soraKey = process.env.SORA_KEY || ''

    this.logger.log(`🔧 Sora Server: ${this.soraServer}`)
    this.logger.log(`🔑 Sora Key: ${this.soraKey ? `****${this.soraKey.slice(-8)}` : 'NOT SET'}`)

    // 创建 Axios 实例
    this.httpClient = axios.create({
      baseURL: this.soraServer,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.soraKey}`,
      },
    })

    // 请求拦截器 - 打印请求信息
    this.httpClient.interceptors.request.use((config) => {
      this.logger.debug(`➡️ Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`)
      this.logger.debug(`📦 Request Body: ${JSON.stringify(config.data)}`)
      return config
    })

    // 响应拦截器 - 打印响应信息
    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.debug(`⬅️ Response: ${response.status} ${response.statusText}`)
        return response
      },
      (error) => {
        this.logger.error(`❌ Response Error: ${error.response?.status} - ${error.message}`)
        this.logger.error(`📦 Error Data: ${JSON.stringify(error.response?.data)}`)
        throw error
      },
    )
  }

  /**
   * 创建视频任务
   */
  async createVideo(dto: CreateVideoDto): Promise<any> {
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

    this.logger.log(`📤 Sending create request to: ${this.soraServer}/v1/video/create`)
    this.logger.log(`📦 Payload: ${JSON.stringify(payload, null, 2)}`)

    const response = await this.httpClient.post('/v1/video/create', payload)
    return response.data
  }

  /**
   * 查询视频任务状态
   */
  async queryVideo(taskId: string): Promise<any> {
    this.logger.log(`📤 Sending query request for task: ${taskId}`)

    const response = await this.httpClient.get(`/v1/videos/${encodeURIComponent(taskId)}`)
    return response.data
  }
}
