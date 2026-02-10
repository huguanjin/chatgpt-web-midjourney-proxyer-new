import {
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { VideoTasksService } from './video-tasks.service'
import { QueryVideoTaskDto } from './dto/query-video-task.dto'

@Controller('v1/tasks')
@UseGuards(JwtAuthGuard)
export class VideoTasksController {
  private readonly logger = new Logger(VideoTasksController.name)

  constructor(private readonly videoTasksService: VideoTasksService) {}

  /**
   * 获取当前用户的任务列表
   * GET /v1/tasks?platform=sora&status=completed&page=1&limit=50
   */
  @Get()
  async getUserTasks(@Req() req: any, @Query() query: QueryVideoTaskDto) {
    const username = req.user.username
    this.logger.log(`📋 Getting tasks for user: ${username}`)

    try {
      const result = await this.videoTasksService.getUserTasks(username, {
        platform: query.platform,
        status: query.status,
        page: query.page ? parseInt(query.page, 10) : 1,
        limit: query.limit ? parseInt(query.limit, 10) : 50,
      })

      return {
        status: 'success',
        data: result.tasks,
        total: result.total,
        page: query.page ? parseInt(query.page, 10) : 1,
        limit: query.limit ? parseInt(query.limit, 10) : 50,
      }
    } catch (error) {
      this.logger.error(`❌ Failed to get tasks: ${error.message}`)
      throw new HttpException(
        { status: 'error', message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * 删除某个任务
   * DELETE /v1/tasks/:externalTaskId
   */
  @Delete(':externalTaskId')
  async deleteTask(@Req() req: any, @Param('externalTaskId') externalTaskId: string) {
    const username = req.user.username
    this.logger.log(`🗑️ Deleting task ${externalTaskId} for user ${username}`)

    const deleted = await this.videoTasksService.deleteTask(username, externalTaskId)
    if (!deleted) {
      throw new HttpException(
        { status: 'error', message: '任务不存在或无权删除' },
        HttpStatus.NOT_FOUND,
      )
    }

    return { status: 'success', message: '任务已删除' }
  }

  /**
   * 清除当前用户所有已完成的任务
   * DELETE /v1/tasks/completed/clear
   */
  @Delete('completed/clear')
  async clearCompletedTasks(@Req() req: any) {
    const username = req.user.username
    this.logger.log(`🧹 Clearing completed tasks for user ${username}`)

    const count = await this.videoTasksService.deleteCompletedTasks(username)
    return {
      status: 'success',
      message: `已清除 ${count} 个已完成的任务`,
      deletedCount: count,
    }
  }
}
