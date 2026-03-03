import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Interview } from '../entities/interview.entity';
import { InterviewSession } from '../entities/interview-session.entity';
import { InterviewMessage } from '../entities/interview-message.entity';
import { CreateInterviewDto } from '../dto/create-interview.dto';
import { SceneService } from './scene.service';
import { InterviewLLMService } from './interview-llm.service';
import { InterviewReportService } from './interview-report.service';

export interface StartSessionResult {
  sessionId: string;
  interview: Interview;
  firstMessage: string;
}

export interface EndInterviewResult {
  interview: Interview;
  reportId: string;
}

@Injectable()
export class InterviewSessionService {
  private readonly logger = new Logger(InterviewSessionService.name);

  constructor(
    @InjectRepository(Interview)
    private interviewRepository: Repository<Interview>,
    @InjectRepository(InterviewSession)
    private sessionRepository: Repository<InterviewSession>,
    @InjectRepository(InterviewMessage)
    private messageRepository: Repository<InterviewMessage>,
    private sceneService: SceneService,
    private llmService: InterviewLLMService,
    @Inject(forwardRef(() => InterviewReportService))
    private reportService: InterviewReportService,
    private dataSource: DataSource,
  ) {}

  async createInterview(userId: string, dto: CreateInterviewDto): Promise<Interview> {
    this.logger.log(`创建面试 - 用户: ${userId}, 场景: ${dto.sceneType}`);

    const sceneConfig = this.sceneService.getSceneConfig(dto.sceneType);
    if (!sceneConfig) {
      throw new BadRequestException(`未知的面试场景: ${dto.sceneType}`);
    }

    const interview = this.interviewRepository.create({
      userId,
      sceneType: dto.sceneType,
      jobType: dto.jobType || 'general',
      difficulty: dto.difficulty || 'medium',
      resumeId: dto.resumeId,
      status: 'pending',
      mode: dto.mode || 'text',
      title: dto.title || `${sceneConfig.name} - ${new Date().toLocaleDateString('zh-CN')}`,
    });

    const savedInterview = await this.interviewRepository.save(interview);
    this.logger.log(`面试创建成功 - ID: ${savedInterview.id}`);

    return savedInterview;
  }

  async getInterviewList(userId: string, status?: string): Promise<Interview[]> {
    const queryBuilder = this.interviewRepository
      .createQueryBuilder('interview')
      .where('interview.userId = :userId', { userId })
      .orderBy('interview.createdAt', 'DESC');

    if (status) {
      queryBuilder.andWhere('interview.status = :status', { status });
    }

    return queryBuilder.getMany();
  }

  async getInterviewById(interviewId: string, userId: string): Promise<Interview> {
    const interview = await this.interviewRepository.findOne({
      where: { id: interviewId, userId },
      relations: ['report'],
    });

    if (!interview) {
      throw new NotFoundException('面试不存在');
    }

    return interview;
  }

  async startSession(
    interviewId: string,
    userId: string,
    resumeContent?: string,
  ): Promise<StartSessionResult> {
    this.logger.log(`开始面试会话 - 面试ID: ${interviewId}`);

    const interview = await this.getInterviewById(interviewId, userId);

    if (interview.status === 'in_progress') {
      const activeSession = await this.getActiveSession(interviewId);
      if (activeSession) {
        const messages = await this.getSessionMessages(activeSession.id);
        const lastMessage = messages[messages.length - 1];
        return {
          sessionId: activeSession.id,
          interview,
          firstMessage: lastMessage?.content || '',
        };
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 直接使用 queryBuilder 插入，完全绕过 TypeORM 的实体映射
      await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(InterviewSession)
        .values({
          interviewId: interviewId,
          startedAt: new Date(),
          status: 'active',
          questionCount: 0,
          messageCount: 0,
        })
        .execute();
      
      // 重新查询获取保存后的实体（包含生成的 ID）
      const savedSession = await queryRunner.manager.findOne(InterviewSession, {
        where: { interviewId },
        order: { startedAt: 'DESC' },
      });
      
      if (!savedSession) {
        throw new Error('Failed to retrieve saved session');
      }
      
      this.logger.log(`会话保存后：interviewId=${savedSession.interviewId}, id=${savedSession.id}`);

      interview.status = 'in_progress';
      await queryRunner.manager.save(interview);

      const openingMessage = await this.llmService.generateOpening(interview, resumeContent);
      
      // 在事务中直接保存消息
      const message = queryRunner.manager.create(InterviewMessage, {
        sessionId: savedSession.id,
        role: 'assistant',
        content: openingMessage,
        questionType: 'opening',
        timestamp: new Date(),
      });
      await queryRunner.manager.save(message);
      
      // 更新会话的消息计数
      savedSession.messageCount = 1;
      await queryRunner.manager.save(savedSession);

      await queryRunner.commitTransaction();

      this.logger.log(`面试会话开始成功 - 会话ID: ${savedSession.id}`);

      return {
        sessionId: savedSession.id,
        interview,
        firstMessage: openingMessage,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`开始面试失败: ${error}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async endInterview(
    interviewId: string,
    userId: string,
    sessionId: string,
  ): Promise<EndInterviewResult> {
    this.logger.log(`结束面试 - 面试ID: ${interviewId}, 会话ID: ${sessionId}`);

    const interview = await this.getInterviewById(interviewId, userId);
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, interviewId },
    });

    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      session.status = 'ended';
      session.endedAt = new Date();
      await queryRunner.manager.save(session);

      const messages = await this.getSessionMessages(sessionId);

      interview.status = 'completed';
      interview.duration = Math.floor(
        (session.endedAt.getTime() - session.startedAt.getTime()) / 1000,
      );

      const userMessages = messages.filter((msg) => msg.role === 'user' && msg.evaluation);
      if (userMessages.length > 0) {
        const totalScore = userMessages.reduce(
          (sum, msg) => sum + (msg.evaluation?.overall || 0),
          0,
        );
        interview.totalScore = totalScore / userMessages.length;
      }

      await queryRunner.manager.save(interview);

      const report = await this.reportService.generateReport(interview, session, messages);

      await queryRunner.commitTransaction();

      this.logger.log(`面试结束成功 - 报告ID: ${report.id}`);

      return {
        interview,
        reportId: report.id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`结束面试失败: ${error}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async abandonInterview(interviewId: string, userId: string): Promise<void> {
    const interview = await this.getInterviewById(interviewId, userId);

    interview.status = 'abandoned';
    await this.interviewRepository.save(interview);

    const activeSession = await this.getActiveSession(interviewId);
    if (activeSession) {
      activeSession.status = 'ended';
      activeSession.endedAt = new Date();
      await this.sessionRepository.save(activeSession);
    }

    this.logger.log(`面试已放弃 - 面试ID: ${interviewId}`);
  }

  async deleteInterview(interviewId: string, userId: string): Promise<void> {
    const interview = await this.getInterviewById(interviewId, userId);

    await this.interviewRepository.remove(interview);

    this.logger.log(`面试已删除 - 面试ID: ${interviewId}`);
  }

  async getActiveSession(interviewId: string): Promise<InterviewSession | null> {
    return this.sessionRepository.findOne({
      where: { interviewId, status: 'active' },
    });
  }

  async getSessionById(sessionId: string): Promise<InterviewSession | null> {
    return this.sessionRepository.findOne({
      where: { id: sessionId },
    });
  }

  async getSessionMessages(sessionId: string): Promise<InterviewMessage[]> {
    return this.messageRepository.find({
      where: { sessionId },
      order: { timestamp: 'ASC' },
    });
  }

  async saveMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    questionType?: string,
    evaluation?: any,
    score?: number,
  ): Promise<InterviewMessage> {
    const message = this.messageRepository.create({
      sessionId,
      role,
      content,
      questionType,
      evaluation,
      score,
      timestamp: new Date(),
    });

    const savedMessage = await this.messageRepository.save(message);

    await this.sessionRepository.update(sessionId, {
      messageCount: () => '"messageCount" + 1',
    });

    if (role === 'assistant' && questionType && questionType !== 'follow_up') {
      await this.sessionRepository.update(sessionId, {
        questionCount: () => '"questionCount" + 1',
      });
    }

    return savedMessage;
  }

  async saveProgress(
    sessionId: string,
    userId: string,
    progress: { elapsedTime: number; currentQuestionIndex?: number },
  ): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['interview'],
    });

    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    if (session.interview && session.interview.userId !== userId) {
      throw new BadRequestException('无权限操作此会话');
    }

    session.elapsedTime = progress.elapsedTime;
    session.lastActiveAt = new Date();
    if (progress.currentQuestionIndex !== undefined) {
      session.currentQuestionIndex = progress.currentQuestionIndex;
    }

    await this.sessionRepository.save(session);
    this.logger.log(`进度已保存 - 会话ID: ${sessionId}, 已用时间: ${progress.elapsedTime}s`);
  }

  async checkAndEndInactiveSessions(): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const inactiveSessions = await this.sessionRepository
      .createQueryBuilder('session')
      .innerJoinAndSelect('session.interview', 'interview')
      .where('session.status = :status', { status: 'active' })
      .andWhere('session.lastActiveAt < :threshold', { threshold: fiveMinutesAgo })
      .getMany();

    for (const session of inactiveSessions) {
      this.logger.log(`自动结束超时会话: ${session.id}`);
      
      session.status = 'ended';
      session.endedAt = new Date();
      await this.sessionRepository.save(session);

      if (session.interview) {
        session.interview.status = 'completed';
        session.interview.duration = session.elapsedTime || Math.floor(
          (session.endedAt.getTime() - session.startedAt.getTime()) / 1000,
        );
        await this.interviewRepository.save(session.interview);
      }
    }
  }

  async getInterviewWithSessions(interviewId: string, userId: string): Promise<{
    interview: Interview;
    sessions: InterviewSession[];
  }> {
    const interview = await this.getInterviewById(interviewId, userId);

    const sessions = await this.sessionRepository.find({
      where: { interviewId },
      order: { startedAt: 'DESC' },
    });

    return { interview, sessions };
  }
}
