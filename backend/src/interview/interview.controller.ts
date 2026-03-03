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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { SceneService } from './services/scene.service';
import { InterviewSessionService } from './services/interview-session.service';
import { InterviewMessageService } from './services/interview-message.service';
import { InterviewReportService } from './services/interview-report.service';
import { SpeechRecognitionService } from './services/speech-recognition.service';
import { SpeechSynthesisService } from './services/speech-synthesis.service';
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
    private speechRecognitionService: SpeechRecognitionService,
    private speechSynthesisService: SpeechSynthesisService,
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
      
      // 检查并结束超时会话
      await this.sessionService.checkAndEndInactiveSessions();
      
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
            elapsedTime: session.elapsedTime || 0,
            lastActiveAt: session.lastActiveAt,
            currentQuestionIndex: session.currentQuestionIndex || 0,
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
  @Post('session/:sessionId/save-progress')
  async saveProgress(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
    @Body() body: { elapsedTime: number; currentQuestionIndex?: number },
  ) {
    try {
      const userId = req.user.id;
      const { elapsedTime, currentQuestionIndex } = body;

      await this.sessionService.saveProgress(sessionId, userId, {
        elapsedTime,
        currentQuestionIndex,
      });

      return {
        success: true,
        message: '进度已保存',
      };
    } catch (error: any) {
      this.logger.error('保存进度失败:', error);
      return {
        success: false,
        message: error.message || '保存进度失败',
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

  // =================== 语音相关接口 ===================

  /**
   * 语音转文字（上传音频文件）
   * POST /interview/speech-to-text
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('speech-to-text')
  @UseInterceptors(FileInterceptor('audio'))
  async speechToText(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('language') language?: string,
  ) {
    try {
      if (!file) {
        return {
          success: false,
          message: '请上传音频文件',
        };
      }

      const result = await this.speechRecognitionService.transcribeAudio(
        file.buffer,
        {
          language: language || 'zh',
          fileName: file.originalname || 'audio.webm',
          mimeType: file.mimetype || 'audio/webm',
        },
      );

      return {
        success: true,
        data: {
          text: result.text,
          confidence: result.confidence,
          duration: result.duration,
          language: result.language,
        },
      };
    } catch (error: any) {
      this.logger.error('语音识别失败:', error);
      return {
        success: false,
        message: error.message || '语音识别失败',
      };
    }
  }

  /**
   * 语音转文字（Base64 编码，用于语音通话）
   * POST /interview/speech-to-text/base64
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('speech-to-text/base64')
  async speechToTextBase64(
    @Request() req: any,
    @Body() body: { audio: string; mimeType?: string },
  ) {
    try {
      const { audio, mimeType = 'audio/webm' } = body;

      if (!audio) {
        return {
          success: false,
          message: '请提供音频数据',
        };
      }

      const result = await this.speechRecognitionService.transcribeBase64Audio(audio, {
        mimeType,
      });

      return {
        success: true,
        data: {
          text: result.text,
          confidence: result.confidence,
          duration: result.duration,
          language: result.language,
        },
      };
    } catch (error: any) {
      this.logger.error('语音识别(base64)失败:', error);
      return {
        success: false,
        message: error.message || '语音识别失败',
      };
    }
  }

  /**
   * 文字转语音
   * POST /interview/text-to-speech
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('text-to-speech')
  async textToSpeech(
    @Request() req: any,
    @Body() body: { text: string; voice?: string; speed?: number },
    @Res() res: Response,
  ) {
    try {
      const { text, voice, speed } = body;

      if (!text || text.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: '请提供要合成的文本',
        });
        return;
      }

      const result = await this.speechSynthesisService.synthesizeSpeech(text, {
        voice: voice as any,
        speed,
      });

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', result.audioBuffer.length);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(result.audioBuffer);
    } catch (error: any) {
      this.logger.error('语音合成失败:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: error.message || '语音合成失败',
        });
      }
    }
  }

  /**
   * 获取可用TTS音色列表
   * GET /interview/tts-voices
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('tts-voices')
  getTTSVoices() {
    return {
      success: true,
      data: this.speechSynthesisService.getAvailableVoices(),
    };
  }

  /**
   * 语音通话会话 - 处理用户语音并返回AI回复（包含TTS音频）
   * POST /interview/voice-session/:sessionId/message
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('voice-session/:sessionId/message')
  async sendVoiceMessage(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
    @Body() body: { audio: string; mimeType?: string; voice?: string },
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      const { audio, mimeType = 'audio/webm', voice = 'anna' } = body;

      if (!audio) {
        res.status(400).json({ success: false, message: '请提供音频数据' });
        return;
      }

      // 1. 语音识别 - 将用户语音转为文字
      this.logger.log(`[语音通话] 开始处理语音消息，会话: ${sessionId}`);
      const transcriptionResult = await this.speechRecognitionService.transcribeBase64Audio(
        audio,
        { mimeType },
      );

      const userText = transcriptionResult.text;
      if (!userText || userText.trim().length === 0) {
        res.status(400).json({ success: false, message: '未能识别到语音内容' });
        return;
      }

      this.logger.log(`[语音通话] 识别文本: "${userText.substring(0, 50)}"`);

      // 2. 获取会话和面试信息
      const session = await this.sessionService.getSessionById(sessionId);
      if (!session) {
        res.status(404).json({ success: false, message: '会话不存在' });
        return;
      }

      const interview = await this.sessionService.getInterviewById(session.interviewId, userId);

      let resumeContent: string | undefined;
      if (interview.resumeId) {
        try {
          const resume = await this.resumeAnalysisService.getResumeById(interview.resumeId, userId);
          resumeContent = this.extractResumeContent(resume);
        } catch (error) {
          this.logger.warn('获取简历内容失败:', error);
        }
      }

      // 3. 发送给 LLM 处理，收集完整 AI 回复
      const requestId = `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.messageService.registerAbortController(userId, requestId);

      let aiText = '';
      let shouldEnd = false;

      res.setHeader('Content-Type', 'application/json');

      const generator = this.messageService.processMessageStream(
        sessionId,
        userText,
        interview,
        resumeContent,
        requestId,
        userId,
      );

      for await (const event of generator) {
        if (event.type === 'chunk') {
          aiText += event.data as string;
        } else if (event.type === 'done') {
          shouldEnd = (event.data as any)?.shouldEnd || false;
        }
      }

      this.messageService.cleanupAbortController(userId, requestId);

      // 4. 将 AI 回复合成语音
      this.logger.log(`[语音通话] AI 回复: "${aiText.substring(0, 50)}", 合成语音...`);
      const ttsResult = await this.speechSynthesisService.synthesizeSpeech(aiText, {
        voice: voice as any,
        speed: 1.0,
      });

      // 5. 返回结果（用户文本 + AI文本 + AI音频的base64）
      res.json({
        success: true,
        data: {
          userText,
          aiText,
          audioBase64: ttsResult.audioBuffer.toString('base64'),
          audioFormat: ttsResult.format,
          shouldEnd,
        },
      });
    } catch (error: any) {
      this.logger.error('语音通话处理失败:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: error.message || '语音通话处理失败',
        });
      }
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
      mode: interview.mode || 'text',
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
