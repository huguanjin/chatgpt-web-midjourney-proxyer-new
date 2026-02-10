import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common'
import { UserConfigService } from './user-config.service'
import { UpdateUserServiceConfigDto } from './dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('v1/user-config')
@UseGuards(JwtAuthGuard)
export class UserConfigController {
  private readonly logger = new Logger(UserConfigController.name)

  constructor(private readonly userConfigService: UserConfigService) {}

  /**
   * 获取当前用户的配置（隐藏敏感信息）
   * GET /v1/user-config
   */
  @Get()
  async getMyConfig(@Req() req: any) {
    const { username } = req.user
    this.logger.log(`📥 Get user config: ${username}`)
    const config = await this.userConfigService.getUserConfigForDisplay(username)
    return {
      status: 'success',
      data: config,
    }
  }

  /**
   * 获取当前用户的完整配置（包含 API Key）
   * GET /v1/user-config/full
   */
  @Get('full')
  async getMyFullConfig(@Req() req: any) {
    const { username } = req.user
    this.logger.log(`📥 Get user full config: ${username}`)
    const config = await this.userConfigService.getUserConfig(username)
    return {
      status: 'success',
      data: config,
    }
  }

  /**
   * 同步默认配置到所有服务
   * PUT /v1/user-config/sync-default
   * Body: { server: string, key: string, services?: string[] }
   */
  @Put('sync-default')
  async syncDefault(
    @Req() req: any,
    @Body() body: { server: string; key: string; services?: string[] },
  ) {
    const { username } = req.user
    this.logger.log(`🔄 Sync default config for user: ${username}`)

    try {
      const validServices = (body.services || ['sora', 'veo', 'geminiImage', 'grok', 'grokImage'])
        .filter(s => ['sora', 'veo', 'geminiImage', 'grok', 'grokImage'].includes(s)) as Array<'sora' | 'veo' | 'geminiImage' | 'grok' | 'grokImage'>

      await this.userConfigService.syncDefaultToAll(
        username,
        body.server,
        body.key,
        { services: validServices },
      )

      const displayConfig = await this.userConfigService.getUserConfigForDisplay(username)
      return {
        status: 'success',
        message: `已同步到 ${validServices.join(', ')}`,
        data: displayConfig,
      }
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message,
      }
    }
  }

  /**
   * 更新当前用户单个服务的配置
   * PUT /v1/user-config/:service
   */
  @Put(':service')
  async updateMyServiceConfig(
    @Req() req: any,
    @Param('service') service: string,
    @Body() dto: UpdateUserServiceConfigDto,
  ) {
    const { username } = req.user
    this.logger.log(`📝 Update user ${service} config: ${username}`)

    if (!['sora', 'veo', 'geminiImage', 'grok', 'grokImage'].includes(service)) {
      return {
        status: 'error',
        message: `Invalid service: ${service}. Valid: sora, veo, geminiImage, grok, grokImage`,
      }
    }

    try {
      await this.userConfigService.updateUserServiceConfig(
        username,
        service as 'sora' | 'veo' | 'geminiImage' | 'grok' | 'grokImage',
        dto,
      )
      const displayConfig = await this.userConfigService.getUserConfigForDisplay(username)
      return {
        status: 'success',
        message: `${service} 配置已更新`,
        data: displayConfig,
      }
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message,
      }
    }
  }
}
