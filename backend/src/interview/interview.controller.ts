import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { SceneService } from './services/scene.service';
import { InterviewSessionService } from './services/interview-session.service';
import { InterviewMessageService } from './services/interview-message.service';
import { InterviewReportService } from './services/interview-report.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { Interview } from './entities/interview.entity';
import { ResumeAnalysisService } from '../resume-analysis/services/resume-analysis.service';

@Controller('interview')
export class InterviewController {
  private readonly logger = new Logger(InterviewController.name);

  constructor(
    private sceneService: SceneService,
    private sessionService: InterviewSessionService,
    private messageService: InterviewMessageService,
    private reportService: InterviewReportService,
    private resumeAnalysisService: ResumeAnalysisService,
  ) {}

  @Get('scenes')
  getSceneList() {
    return {
      success: true,
      data: this.sceneService.getSceneList(),
    };
  }

  @Get('job-types')
  getJobTypeList() {
    return {
      success: true,
      data: this.sceneService.getJobTypeList(),
    };
  }

  @Get('difficulty-levels')
  getDifficultyLevels() {
    return {
      success: true,
      data: this.sceneService.getDifficultyLevels(),
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('create')
  async createInterview(@Request() req: any, @Body() dto: CreateInterviewDto) {
    try {
      const userId = req.user.id;
      const interview = await this.sessionService.createInterview(userId, dto);

      return {
        success: true,
        data: this.toInterviewResponse(interview),
      };
    } catch (error: any) {
      this.logger.error('创建面试失败:', error);
      return {
        success: false,
        message: error.message || '创建面试失败',
      };
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('list')
  async getInterviewList(
    @Request() req: any,
    @Query('status') status?: string,
  ) {
    try {
      const userId = req.user.id;
      const interviews = await this.sessionService.getInterviewList(userId, status);

      return {
        success: true,
        data: interviews.map((interview) => this.toInterviewResponse(interview)),
      };
    } catch (error: any) {
      this.logger.error('获取面试列表失败:', error);
      return {
        success: false,
        message: error.message || '获取面试列表失败',
      };
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async getInterview(@Request() req: any, @Param('id') interviewId: string) {
    try {
      const userId = req.user.id;
      const { interview, sessions } = await this.sessionService.getInterviewWithSessions(
        interviewId,
        userId,
      );

      return {
        success: true,
        data: {
          interview: this.toInterviewResponse(interview),
          sessions: sessions.map((session) => ({
            id: session.id,
            interviewId: session.interviewId,
            startedAt: session.startedAt,
            endedAt: session.endedAt,
            status: session.status,
            questionCount: session.questionCount,
            messageCount: session.messageCount,
          })),
        },
      };
    } catch (error: any) {
      this.logger.error('获取面试详情失败:', error);
      return {
        success: false,
        message: error.message || '获取面试详情失败',
      };
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/start')
  async startInterview(
    @Request() req: any,
    @Param('id') interviewId: string,
    @Res() res: Response,
  ) {
    let requestId: string | null = null;

    try {
      const userId = req.user.id;
      requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      this.logger.log(`[开始面试] 面试ID: ${interviewId}, 用户: ${userId}`);

      const interview = await this.sessionService.getInterviewById(interviewId, userId);

      let resumeContent: string | undefined;
      if (interview.resumeId) {
        try {
          const resume = await this.resumeAnalysisService.getResumeById(
            interview.resumeId,
            userId,
          );
          resumeContent = this.extractResumeContent(resume);
        } catch (error) {
          this.logger.warn('获取简历内容失败，继续不使用简历:', error);
        }
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      res.write(
        `data: ${JSON.stringify({
          type: 'request-id',
          data: { requestId },
        })}\n\n`,
      );

      const result = await this.sessionService.startSession(
        interviewId,
        userId,
        resumeContent,
      );

      res.write(
        `data: ${JSON.stringify({
          type: 'session',
          data: {
            sessionId: result.sessionId,
            interview: this.toInterviewResponse(result.interview),
          },
        })}\n\n`,
      );

      res.write(
        `data: ${JSON.stringify({
          type: 'chunk',
          data: result.firstMessage,
        })}\n\n`,
      );

      res.write(
        `data: ${JSON.stringify({
          type: 'done',
          data: { message: '面试已开始' },
        })}\n\n`,
      );

      res.end();
    } catch (error: any) {
      this.logger.error('开始面试失败:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: error.message || '开始面试失败',
        });
      } else {
        res.write(
          `data: ${JSON.stringify({
            type: 'error',
            message: error.message || '开始面试失败',
          })}\n\n`,
        );
        res.end();
      }
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('session/:sessionId/message')
  async sendMessage(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
    @Body() body: SendMessageDto,
    @Res() res: Response,
  ) {
    let requestId: string | null = null;

    try {
      const userId = req.user.id;
      const { message } = body;
      requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      this.logger.log(
        `[发送消息] 会话ID: ${sessionId}, 用户: ${userId}, 消息: "${message.substring(0, 50)}..."`,
      );

      if (!message || message.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: '消息内容不能为空',
        });
        return;
      }

      const session = await this.sessionService.getSessionById(sessionId);
      if (!session) {
        res.status(404).json({
          success: false,
          message: '会话不存在',
        });
        return;
      }

      const interview = await this.sessionService.getInterviewById(
        session.interviewId,
        userId,
      );

      let resumeContent: string | undefined;
      if (interview.resumeId) {
        try {
          const resume = await this.resumeAnalysisService.getResumeById(
            interview.resumeId,
            userId,
          );
          resumeContent = this.extractResumeContent(resume);
        } catch (error) {
          this.logger.warn('获取简历内容失败:', error);
        }
      }

      this.messageService.registerAbortController(userId, requestId);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      res.write(
        `data: ${JSON.stringify({
          type: 'request-id',
          data: { requestId },
        })}\n\n`,
      );

      const generator = this.messageService.processMessageStream(
        sessionId,
        message,
        interview,
        resumeContent,
        requestId,
        userId,
      );

      for await (const event of generator) {
        if (this.messageService.isAborted(userId, requestId || '')) {
          this.logger.log('[发送消息] 请求已中止');
          break;
        }
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      res.end();
    } catch (error: any) {
      this.logger.error('发送消息失败:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: error.message || '发送消息失败',
        });
      } else {
        res.write(
          `data: ${JSON.stringify({
            type: 'error',
            message: error.message || '发送消息失败',
          })}\n\n`,
        );
        res.end();
      }
    } finally {
      if (requestId) {
        this.messageService.cleanupAbortController(req.user.id, requestId);
      }
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('session/:sessionId/end')
  async endInterview(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    try {
      const userId = req.user.id;

      this.logger.log(`[结束面试] 会话ID: ${sessionId}, 用户: ${userId}`);

      const session = await this.sessionService.getSessionById(sessionId);
      if (!session) {
        return {
          success: false,
          message: '会话不存在',
        };
      }

      const result = await this.sessionService.endInterview(
        session.interviewId,
        userId,
        sessionId,
      );

      return {
        success: true,
        data: {
          interview: this.toInterviewResponse(result.interview),
          reportId: result.reportId,
        },
      };
    } catch (error: any) {
      this.logger.error('结束面试失败:', error);
      return {
        success: false,
        message: error.message || '结束面试失败',
      };
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/abandon')
  async abandonInterview(@Request() req: any, @Param('id') interviewId: string) {
    try {
      const userId = req.user.id;
      await this.sessionService.abandonInterview(interviewId, userId);

      return {
        success: true,
        message: '面试已放弃',
      };
    } catch (error: any) {
      this.logger.error('放弃面试失败:', error);
      return {
        success: false,
        message: error.message || '放弃面试失败',
      };
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async deleteInterview(@Request() req: any, @Param('id') interviewId: string) {
    try {
      const userId = req.user.id;
      await this.sessionService.deleteInterview(interviewId, userId);

      return {
        success: true,
        message: '面试已删除',
      };
    } catch (error: any) {
      this.logger.error('删除面试失败:', error);
      return {
        success: false,
        message: error.message || '删除面试失败',
      };
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('session/:sessionId/messages')
  async getSessionMessages(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    try {
      const userId = req.user.id;
      const messages = await this.messageService.getMessageHistory(sessionId);

      return {
        success: true,
        data: messages.map((msg) => ({
          id: msg.id,
          sessionId: msg.sessionId,
          role: msg.role,
          content: msg.content,
          questionType: msg.questionType,
          evaluation: msg.evaluation,
          score: msg.score,
          timestamp: msg.timestamp,
          sources: msg.sources,
        })),
      };
    } catch (error: any) {
      this.logger.error('获取消息历史失败:', error);
      return {
        success: false,
        message: error.message || '获取消息历史失败',
      };
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('report/:reportId')
  async getReport(@Request() req: any, @Param('reportId') reportId: string) {
    try {
      const report = await this.reportService.getReportById(reportId);

      if (!report) {
        return {
          success: false,
          message: '报告不存在',
        };
      }

      return {
        success: true,
        data: {
          id: report.id,
          interviewId: report.interviewId,
          overallScore: report.overallScore,
          dimensionScores: report.dimensionScores,
          strengths: report.strengths,
          weaknesses: report.weaknesses,
          suggestions: report.suggestions,
          learningResources: report.learningResources,
          summary: report.summary,
          questionAnalysis: report.questionAnalysis,
          createdAt: report.createdAt,
        },
      };
    } catch (error: any) {
      this.logger.error('获取报告失败:', error);
      return {
        success: false,
        message: error.message || '获取报告失败',
      };
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/report')
  async getInterviewReport(
    @Request() req: any,
    @Param('id') interviewId: string,
  ) {
    try {
      const userId = req.user.id;
      await this.sessionService.getInterviewById(interviewId, userId);

      const report = await this.reportService.getReportByInterviewId(interviewId);

      if (!report) {
        return {
          success: false,
          message: '报告不存在',
        };
      }

      return {
        success: true,
        data: {
          id: report.id,
          interviewId: report.interviewId,
          overallScore: report.overallScore,
          dimensionScores: report.dimensionScores,
          strengths: report.strengths,
          weaknesses: report.weaknesses,
          suggestions: report.suggestions,
          learningResources: report.learningResources,
          summary: report.summary,
          questionAnalysis: report.questionAnalysis,
          createdAt: report.createdAt,
        },
      };
    } catch (error: any) {
      this.logger.error('获取面试报告失败:', error);
      return {
        success: false,
        message: error.message || '获取面试报告失败',
      };
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('message/abort')
  async abortMessage(@Request() req: any, @Body() body: any) {
    try {
      const userId = req.user.id;
      const { requestId } = body;

      if (!requestId) {
        return {
          success: false,
          message: '缺少 requestId 参数',
        };
      }

      const success = this.messageService.abortRequest(userId, requestId);

      return {
        success,
        message: success ? '消息已中止' : '未找到对应的请求',
      };
    } catch (error: any) {
      this.logger.error('中止消息失败:', error);
      return {
        success: false,
        message: error.message || '中止消息失败',
      };
    }
  }

  private toInterviewResponse(interview: Interview) {
    return {
      id: interview.id,
      userId: interview.userId,
      sceneType: interview.sceneType,
      sceneName: this.sceneService.getSceneName(interview.sceneType),
      jobType: interview.jobType,
      jobName: interview.jobType
        ? this.sceneService.getJobTypeName(interview.jobType)
        : '',
      difficulty: interview.difficulty,
      difficultyName: this.sceneService.getDifficultyName(interview.difficulty),
      resumeId: interview.resumeId,
      totalScore: interview.totalScore,
      duration: interview.duration,
      status: interview.status,
      statusName: this.sceneService.getStatusName(interview.status),
      title: interview.title,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt,
    };
  }

  private extractResumeContent(resume: any): string {
    if (resume.parsedData) {
      const parts: string[] = [];

      if (resume.parsedData.personalInfo) {
        const info = resume.parsedData.personalInfo;
        parts.push(`姓名: ${info.name || '未知'}`);
      }

      if (resume.parsedData.professionalSummary) {
        parts.push(`简介: ${resume.parsedData.professionalSummary}`);
      }

      if (resume.parsedData.skills && resume.parsedData.skills.length > 0) {
        parts.push(`技能: ${resume.parsedData.skills.join(', ')}`);
      }

      if (resume.parsedData.workExperience && resume.parsedData.workExperience.length > 0) {
        const workExp = resume.parsedData.workExperience
          .slice(0, 3)
          .map(
            (exp: any) =>
              `${exp.position} @ ${exp.company} (${exp.startDate} - ${exp.endDate})`,
          )
          .join('; ');
        parts.push(`工作经历: ${workExp}`);
      }

      if (resume.parsedData.education && resume.parsedData.education.length > 0) {
        const edu = resume.parsedData.education
          .map((e: any) => `${e.degree} - ${e.school}`)
          .join('; ');
        parts.push(`教育背景: ${edu}`);
      }

      return parts.join('\n');
    }

    return resume.content?.substring(0, 500) || '';
  }
}
