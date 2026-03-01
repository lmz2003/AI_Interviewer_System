import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    private reportService: InterviewReportService,
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
      relations: ['sessions', 'report'],
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

    const sessionData = {
      interviewId,
      startedAt: new Date(),
      status: 'active',
      questionCount: 0,
      messageCount: 0,
    };
    this.logger.log(`创建会话数据: ${JSON.stringify(sessionData)}`);
    
    const session = this.sessionRepository.create(sessionData);
    this.logger.log(`会话对象创建后: interviewId=${session.interviewId}, id=${session.id}`);
    
    await this.sessionRepository.save(session);

    interview.status = 'in_progress';
    await this.interviewRepository.save(interview);

    const openingMessage = await this.llmService.generateOpening(interview, resumeContent);
    await this.saveMessage(session.id, 'assistant', openingMessage, 'opening');

    this.logger.log(`面试会话开始成功 - 会话ID: ${session.id}`);

    return {
      sessionId: session.id,
      interview,
      firstMessage: openingMessage,
    };
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

    session.status = 'ended';
    session.endedAt = new Date();
    await this.sessionRepository.save(session);

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

    await this.interviewRepository.save(interview);

    const report = await this.reportService.generateReport(interview, session, messages);

    this.logger.log(`面试结束成功 - 报告ID: ${report.id}`);

    return {
      interview,
      reportId: report.id,
    };
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
      messageCount: () => 'message_count + 1',
    });

    if (role === 'assistant' && questionType && questionType !== 'follow_up') {
      await this.sessionRepository.update(sessionId, {
        questionCount: () => 'question_count + 1',
      });
    }

    return savedMessage;
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
