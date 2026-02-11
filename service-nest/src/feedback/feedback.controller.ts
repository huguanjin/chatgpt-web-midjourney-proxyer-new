import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { FeedbackService } from './feedback.service'
import { CreateFeedbackDto, AdminReplyFeedbackDto } from './dto'

@Controller('v1/feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  private readonly logger = new Logger(FeedbackController.name)

  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * 管理员角色检查
   */
  private ensureAdmin(req: any) {
    if (req.user?.role !== 'admin') {
      throw new HttpException(
        { status: 'error', message: '需要管理员权限' },
        HttpStatus.FORBIDDEN,
      )
    }
  }

  // ==================== 用户接口 ====================

  /**
   * 用户提交反馈
   * POST /v1/feedback
   */
  @Post()
  async create(@Req() req: any, @Body() dto: CreateFeedbackDto) {
    const { userId, username } = req.user
    this.logger.log(`📝 User ${username} submitting feedback: ${dto.title}`)

    const feedback = await this.feedbackService.create(userId, username, {
      title: dto.title,
      content: dto.content,
      type: dto.type,
    })

    return { status: 'success', data: feedback }
  }

  /**
   * 用户查看自己的反馈列表
   * GET /v1/feedback/my?page=1&limit=20
   */
  @Get('my')
  async getMyFeedbacks(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const { userId } = req.user

    const result = await this.feedbackService.getMyFeedbacks(userId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    })

    return { status: 'success', ...result }
  }

  // ==================== 管理员接口 ====================

  /**
   * 管理员查看所有反馈
   * GET /v1/feedback/admin/all?page=1&limit=20&status=open&type=bug&keyword=xxx
   */
  @Get('admin/all')
  async getAllFeedbacks(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('keyword') keyword?: string,
  ) {
    this.ensureAdmin(req)

    const result = await this.feedbackService.getAllFeedbacks({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      type,
      keyword,
    })

    return { status: 'success', ...result }
  }

  /**
   * 管理员回复反馈
   * PUT /v1/feedback/admin/:feedbackId/reply
   */
  @Put('admin/:feedbackId/reply')
  async replyFeedback(
    @Req() req: any,
    @Param('feedbackId') feedbackId: string,
    @Body() dto: AdminReplyFeedbackDto,
  ) {
    this.ensureAdmin(req)

    const result = await this.feedbackService.adminReply(
      feedbackId,
      req.user.username,
      { reply: dto.reply, status: dto.status },
    )

    if (!result) {
      throw new HttpException(
        { status: 'error', message: '反馈不存在' },
        HttpStatus.NOT_FOUND,
      )
    }

    this.logger.log(`💬 Admin ${req.user.username} replied to feedback ${feedbackId}`)
    return { status: 'success', message: '回复成功' }
  }

  /**
   * 管理员更新反馈状态
   * PUT /v1/feedback/admin/:feedbackId/status
   */
  @Put('admin/:feedbackId/status')
  async updateStatus(
    @Req() req: any,
    @Param('feedbackId') feedbackId: string,
    @Body() body: { status: string },
  ) {
    this.ensureAdmin(req)

    if (!['open', 'replied', 'resolved', 'closed'].includes(body.status)) {
      throw new HttpException(
        { status: 'error', message: '无效的状态值' },
        HttpStatus.BAD_REQUEST,
      )
    }

    const success = await this.feedbackService.updateStatus(feedbackId, body.status)
    if (!success) {
      throw new HttpException(
        { status: 'error', message: '反馈不存在' },
        HttpStatus.NOT_FOUND,
      )
    }

    return { status: 'success', message: '状态更新成功' }
  }

  /**
   * 管理员获取反馈统计
   * GET /v1/feedback/admin/stats
   */
  @Get('admin/stats')
  async getStats(@Req() req: any) {
    this.ensureAdmin(req)
    const stats = await this.feedbackService.getStats()
    return { status: 'success', data: stats }
  }
}
