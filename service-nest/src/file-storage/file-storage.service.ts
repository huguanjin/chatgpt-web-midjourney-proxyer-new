import { Injectable, Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name)
  private readonly baseDir: string

  constructor() {
    this.baseDir = path.join(process.cwd(), 'uploads', 'images')
    this.ensureBaseDir()
  }

  /**
   * 确保基础目录存在
   */
  private ensureBaseDir() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true })
      this.logger.log(`📁 Created uploads directory: ${this.baseDir}`)
    }
  }

  /**
   * 确保用户目录存在
   */
  private ensureUserDir(username: string): string {
    // 安全处理用户名（只保留字母数字下划线横杠）
    const safeUsername = username.replace(/[^a-zA-Z0-9_\-]/g, '_')
    const userDir = path.join(this.baseDir, safeUsername)
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true })
      this.logger.log(`📁 Created user image directory: ${userDir}`)
    }
    return userDir
  }

  /**
   * 将 Base64 图片数据保存为文件
   * @returns 文件的相对 URL 路径（如 /uploads/images/admin/xxxxx.png）
   */
  saveBase64Image(
    username: string,
    base64Data: string,
    mimeType: string,
    filename: string,
  ): string {
    const userDir = this.ensureUserDir(username)

    // 去除 data URI 前缀（如 "data:image/png;base64,"）
    let cleanBase64 = base64Data
    let detectedMime = mimeType
    const dataUriMatch = base64Data.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/s)
    if (dataUriMatch) {
      detectedMime = dataUriMatch[1]
      cleanBase64 = dataUriMatch[2]
      this.logger.log(`🔍 Stripped data URI prefix, detected MIME: ${detectedMime}`)
    }

    // 写入文件
    const buffer = Buffer.from(cleanBase64, 'base64')

    // 从文件头字节检测实际格式
    const actualMime = this.detectMimeFromBuffer(buffer) || detectedMime
    const ext = this.getExtension(actualMime)
    const finalFilename = `${filename}.${ext}`
    const filePath = path.join(userDir, finalFilename)

    fs.writeFileSync(filePath, new Uint8Array(buffer))

    const safeUsername = username.replace(/[^a-zA-Z0-9_\-]/g, '_')
    const urlPath = `/uploads/images/${safeUsername}/${finalFilename}`

    this.logger.log(`💾 Saved image: ${filePath} (${(buffer.length / 1024).toFixed(1)} KB, ${actualMime})`)
    return urlPath
  }

  /**
   * 批量保存图片
   * @returns 保存后的文件 URL 路径数组
   */
  saveBase64Images(
    username: string,
    images: Array<{ mimeType: string; data: string }>,
    taskId: string,
  ): Array<{ mimeType: string; url: string }> {
    return images.map((img, index) => {
      const filename = `${taskId}_${index}`
      const url = this.saveBase64Image(username, img.data, img.mimeType, filename)
      return { mimeType: img.mimeType, url }
    })
  }

  /**
   * 删除用户的某个图片文件
   */
  deleteImage(urlPath: string): boolean {
    const filePath = path.join(process.cwd(), urlPath)
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        return true
      }
    } catch (error) {
      this.logger.warn(`⚠️ Failed to delete image: ${filePath}`)
    }
    return false
  }

  /**
   * 根据 MIME 类型获取文件扩展名
   */
  private getExtension(mimeType: string): string {
    const map: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/bmp': 'bmp',
      'image/svg+xml': 'svg',
    }
    return map[mimeType] || 'png'
  }

  /**
   * 从文件头字节检测实际 MIME 类型
   */
  private detectMimeFromBuffer(buffer: Buffer): string | null {
    if (buffer.length < 4) return null
    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'image/jpeg'
    }
    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return 'image/png'
    }
    // GIF: 47 49 46
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      return 'image/gif'
    }
    // WebP: 52 49 46 46 ... 57 45 42 50
    if (buffer.length >= 12 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[8] === 0x57 && buffer[9] === 0x45) {
      return 'image/webp'
    }
    return null
  }
}
