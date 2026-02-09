import { Injectable, Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'

export interface AppConfig {
  port: number
  sora: {
    server: string
    key: string
    characterServer: string
    characterKey: string
  }
  veo: {
    server: string
    key: string
  }
  geminiImage: {
    server: string
    key: string
  }
  grok: {
    server: string
    key: string
  }
}

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name)
  private readonly configPath: string
  private config: AppConfig

  constructor() {
    this.configPath = path.join(process.cwd(), 'config.json')
    this.config = this.loadConfig()
    this.logger.log('✅ Config service initialized')
  }

  /**
   * 从文件加载配置
   */
  private loadConfig(): AppConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf-8')
        const config = JSON.parse(content)
        this.logger.log(`📂 Config loaded from ${this.configPath}`)
        return config
      }
    } catch (error) {
      this.logger.error(`❌ Failed to load config: ${error}`)
    }

    // 返回默认配置（从环境变量）
    return this.getDefaultConfig()
  }

  /**
   * 从环境变量获取默认配置
   */
  private getDefaultConfig(): AppConfig {
    return {
      port: parseInt(process.env.PORT || '3003', 10),
      sora: {
        server: process.env.SORA_SERVER || '',
        key: process.env.SORA_KEY || '',
        characterServer: process.env.SORA_CHARACTER_SERVER || '',
        characterKey: process.env.SORA_CHARACTER_KEY || '',
      },
      veo: {
        server: process.env.VEO_SERVER || '',
        key: process.env.VEO_KEY || '',
      },
      geminiImage: {
        server: process.env.GEMINI_IMAGE_SERVER || '',
        key: process.env.GEMINI_IMAGE_KEY || '',
      },
      grok: {
        server: process.env.GROK_SERVER || '',
        key: process.env.GROK_KEY || '',
      },
    }
  }

  /**
   * 获取完整配置（实时从文件读取）
   */
  getConfig(): AppConfig {
    // 每次都从文件读取，确保获取最新配置
    this.config = this.loadConfig()
    return this.config
  }

  /**
   * 获取配置（供前端显示，隐藏敏感信息）
   */
  getConfigForDisplay(): any {
    const config = this.getConfig()
    return {
      port: config.port,
      sora: {
        server: config.sora.server,
        key: this.maskKey(config.sora.key),
        characterServer: config.sora.characterServer,
        characterKey: this.maskKey(config.sora.characterKey),
      },
      veo: {
        server: config.veo.server,
        key: this.maskKey(config.veo.key),
      },
      geminiImage: {
        server: config.geminiImage.server,
        key: this.maskKey(config.geminiImage.key),
      },
      grok: {
        server: config.grok.server,
        key: this.maskKey(config.grok.key),
      },
    }
  }

  /**
   * 隐藏 API Key 中间部分
   */
  private maskKey(key: string): string {
    if (!key || key.length < 12) return key ? '****' : ''
    return `${key.slice(0, 6)}****${key.slice(-6)}`
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<AppConfig>): AppConfig {
    const currentConfig = this.getConfig()
    
    // 深度合并配置
    this.config = this.deepMerge(currentConfig, newConfig)
    
    // 保存到文件
    this.saveConfig()
    
    this.logger.log('✅ Config updated and saved')
    return this.config
  }

  /**
   * 更新单个服务配置
   */
  updateServiceConfig(
    service: 'sora' | 'veo' | 'geminiImage' | 'grok',
    config: { server?: string; key?: string; characterServer?: string; characterKey?: string },
  ): AppConfig {
    const currentConfig = this.getConfig()
    
    if (service === 'sora') {
      if (config.server !== undefined) currentConfig.sora.server = config.server
      if (config.key !== undefined) currentConfig.sora.key = config.key
      if (config.characterServer !== undefined) currentConfig.sora.characterServer = config.characterServer
      if (config.characterKey !== undefined) currentConfig.sora.characterKey = config.characterKey
    } else if (service === 'veo') {
      if (config.server !== undefined) currentConfig.veo.server = config.server
      if (config.key !== undefined) currentConfig.veo.key = config.key
    } else if (service === 'geminiImage') {
      if (config.server !== undefined) currentConfig.geminiImage.server = config.server
      if (config.key !== undefined) currentConfig.geminiImage.key = config.key
    } else if (service === 'grok') {
      if (config.server !== undefined) currentConfig.grok.server = config.server
      if (config.key !== undefined) currentConfig.grok.key = config.key
    }

    this.config = currentConfig
    this.saveConfig()
    
    this.logger.log(`✅ ${service} config updated`)
    return this.config
  }

  /**
   * 保存配置到文件
   */
  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8')
      this.logger.log(`💾 Config saved to ${this.configPath}`)
    } catch (error) {
      this.logger.error(`❌ Failed to save config: ${error}`)
      throw error
    }
  }

  /**
   * 深度合并对象
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target }
    for (const key in source) {
      if (source[key] instanceof Object && key in target) {
        result[key] = this.deepMerge(target[key], source[key])
      } else {
        result[key] = source[key]
      }
    }
    return result
  }

  // ===== 便捷获取方法 =====

  getSoraConfig() {
    return this.getConfig().sora
  }

  getVeoConfig() {
    return this.getConfig().veo
  }

  getGeminiImageConfig() {
    return this.getConfig().geminiImage
  }

  getGrokConfig() {
    return this.getConfig().grok
  }
}
