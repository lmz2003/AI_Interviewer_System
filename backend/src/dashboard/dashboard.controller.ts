import {
  Controller,
  Get,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';

interface AuthRequest extends Request {
  user?: {
    id: string;
    githubId: string;
    githubUsername?: string;
    name?: string;
    avatar?: string;
    email?: string;
  };
}

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getDashboardStats(@Request() req: AuthRequest) {
    try {
      const userId = req.user?.id as string;
      if (!userId) {
        throw new HttpException(
          { success: false, message: '未授权的请求，请先登录' },
          HttpStatus.UNAUTHORIZED,
        );
      }

      const stats = await this.dashboardService.getDashboardStats(userId);

      return {
        success: true,
        message: '获取成功',
        data: stats,
      };
    } catch (error: any) {
      this.logger.error('获取仪表盘统计数据失败:', error);
      const status =
        error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        {
          success: false,
          message: error.message || '获取统计数据失败',
        },
        status,
      );
    }
  }
}
