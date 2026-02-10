import { Controller, Get, Put, Body, Param, Logger } from '@nestjs/common'
import { ConfigService } from './config.service'
import { UpdateConfigDto, UpdateServiceConfigDto } from './dto/config.dto'

@Controller('v1/config')
export class ConfigController {
  private readonly logger = new Logger(ConfigController.name)

  constructor(private readonly configService: ConfigService) {}

  /**
   * 获取所有配置（隐藏敏感信息）
   */
  @Get()
  getConfig() {
    this.logger.log('📥 Get config request')
    return {
      status: 'success',
      data: this.configService.getConfigForDisplay(),
    }
  }

  /**
   * 获取完整配置（包含 API Key，谨慎使用）
   */
  @Get('full')
  getFullConfig() {
    this.logger.log('📥 Get full config request')
    return {
      status: 'success',
      data: this.configService.getConfig(),
    }
  }

  /**
   * 更新全部配置
   */
  @Put()
  async updateConfig(@Body() updateConfigDto: UpdateConfigDto) {
    this.logger.log('📝 Update config request')
    try {
      const config = await this.configService.updateConfig(updateConfigDto as any)
      return {
        status: 'success',
        message: 'Configuration updated successfully',
        data: this.configService.getConfigForDisplay(),
      }
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message,
      }
    }
  }

  /**
   * 更新单个服务配置
   */
  @Put(':service')
  async updateServiceConfig(
    @Param('service') service: string,
    @Body() dto: UpdateServiceConfigDto,
  ) {
    this.logger.log(`📝 Update ${service} config request`)
    
    if (!['sora', 'veo', 'geminiImage', 'grok', 'grokImage'].includes(service)) {
      return {
        status: 'error',
        message: `Invalid service: ${service}. Valid services are: sora, veo, geminiImage, grok, grokImage`,
      }
    }

    try {
      await this.configService.updateServiceConfig(
        service as 'sora' | 'veo' | 'geminiImage' | 'grok' | 'grokImage',
        dto,
      )
      return {
        status: 'success',
        message: `${service} configuration updated successfully`,
        data: this.configService.getConfigForDisplay(),
      }
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message,
      }
    }
  }
}
