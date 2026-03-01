import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interview } from '../entities/interview.entity';
import { InterviewSession } from '../entities/interview-session.entity';
import { InterviewMessage, MessageEvaluation } from '../entities/interview-message.entity';
import { InterviewSessionService } from './interview-session.service';
import { InterviewLLMService } from './interview-llm.service';
import { InterviewEvaluatorService } from './interview-evaluator.service';
import { SCENE_CONFIG } from '../constants/scene-config';

export interface SSEEvent {
  type: 'chunk' | 'evaluation' | 'done' | 'error';
  data: any;
}

@Injectable()
export class InterviewMessageService {
  private readonly logger = new Logger(InterviewMessageService.name);

  private abortControllers: Map<string, AbortController> = new Map();

  constructor(
    @InjectRepository(InterviewMessage)
    private messageRepository: Repository<InterviewMessage>,
    private sessionService: InterviewSessionService,
    private llmService: InterviewLLMService,
    private evaluatorService: InterviewEvaluatorService,
  ) {}

  async getMessageHistory(sessionId: string): Promise<InterviewMessage[]> {
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
    evaluation?: MessageEvaluation,
    score?: number,
  ): Promise<InterviewMessage> {
    return this.sessionService.saveMessage(
      sessionId,
      role,
      content,
      questionType,
      evaluation,
      score,
    );
  }

  registerAbortController(userId: string, requestId: string): AbortController {
    const key = `${userId}:${requestId}`;
    const controller = new AbortController();
    this.abortControllers.set(key, controller);
    this.logger.log(`[中止管理] 注册请求: ${key}`);
    return controller;
  }

  abortRequest(userId: string, requestId: string): boolean {
    const key = `${userId}:${requestId}`;
    const controller = this.abortControllers.get(key);
    if (controller) {
      this.logger.log(`[中止管理] 中止请求: ${key}`);
      controller.abort();
      return true;
    }
    this.logger.warn(`[中止管理] 未找到请求: ${key}`);
    return false;
  }

  cleanupAbortController(userId: string, requestId: string): void {
    const key = `${userId}:${requestId}`;
    this.abortControllers.delete(key);
    this.logger.debug(`[中止管理] 清理请求: ${key}`);
  }

  isAborted(userId: string, requestId: string): boolean {
    const key = `${userId}:${requestId}`;
    const controller = this.abortControllers.get(key);
    return controller?.signal.aborted ?? false;
  }

  async *processMessageStream(
    sessionId: string,
    userMessage: string,
    interview: Interview,
    resumeContent?: string,
    requestId?: string,
    userId?: string,
  ): AsyncGenerator<SSEEvent> {
    this.logger.log(`[流式处理] 开始处理消息 - 会话: ${sessionId}`);

    const session = await this.sessionService.getSessionById(sessionId);
    if (!session) {
      yield { type: 'error', data: { message: '会话不存在' } };
      return;
    }

    const tempMessage = await this.saveMessage(sessionId, 'user', userMessage);

    const history = await this.getMessageHistory(sessionId);

    const lastAssistantMessage = [...history]
      .reverse()
      .find((msg) => msg.role === 'assistant');
    const currentQuestion = lastAssistantMessage?.content || '';

    this.evaluateAnswerAsync(
      tempMessage.id,
      currentQuestion,
      userMessage,
      interview,
    );

    const sceneConfig = SCENE_CONFIG[interview.sceneType as keyof typeof SCENE_CONFIG];
    const shouldEnd = session.questionCount >= (sceneConfig?.questionCount.max || 8);

    let responseContent = '';

    if (shouldEnd) {
      const userMessages = history.filter((msg) => msg.role === 'user' && msg.evaluation);
      const avgScore = userMessages.length > 0
        ? userMessages.reduce((sum, msg) => sum + (msg.evaluation?.overall || 0), 0) / userMessages.length
        : 0;

      responseContent = await this.llmService.generateClosing(interview, history, avgScore);
      yield { type: 'chunk', data: responseContent };

      await this.saveMessage(sessionId, 'assistant', responseContent, 'closing');

      yield {
        type: 'done',
        data: {
          shouldEnd: true,
          message: '面试已结束',
        },
      };
    } else {
      const shouldAbort = requestId && userId
        ? () => this.isAborted(userId, requestId)
        : undefined;

      responseContent = await this.llmService.generateQuestionStream(
        interview,
        history,
        session.questionCount,
        resumeContent,
        {
          onChunk: (chunk) => {
            // chunks will be yielded separately
          },
          shouldAbort,
        },
      );

      yield { type: 'chunk', data: responseContent };

      const questionType = this.determineQuestionType(session.questionCount);
      await this.saveMessage(sessionId, 'assistant', responseContent, questionType);

      yield {
        type: 'done',
        data: {
          shouldEnd: false,
          questionCount: session.questionCount + 1,
        },
      };
    }
  }

  private async evaluateAnswerAsync(
    messageId: string,
    question: string,
    answer: string,
    interview: Interview,
  ): Promise<void> {
    this.evaluatorService.evaluateAnswer(question, answer, interview)
      .then(async (evaluation) => {
        await this.messageRepository.update(
          { id: messageId },
          { evaluation, score: evaluation.overall },
        );
        this.logger.log(`[异步评估] 消息 ${messageId} 评估完成 - 评分: ${evaluation.overall.toFixed(2)}`);
      })
      .catch((error) => {
        this.logger.error(`[异步评估] 消息 ${messageId} 评估失败:`, error);
      });
  }

  async *streamOpening(
    interview: Interview,
    resumeContent?: string,
    requestId?: string,
    userId?: string,
  ): AsyncGenerator<SSEEvent> {
    this.logger.log(`[流式开场] 开始生成开场白 - 面试: ${interview.id}`);

    const shouldAbort = requestId && userId
      ? () => this.isAborted(userId, requestId)
      : undefined;

    let fullContent = '';

    const content = await this.llmService.generateOpeningStream(
      interview,
      resumeContent,
      {
        onChunk: (chunk) => {
          fullContent += chunk;
        },
        shouldAbort,
      },
    );

    yield { type: 'chunk', data: content };
    yield { type: 'done', data: { message: '开场白生成完成' } };
  }

  private determineQuestionType(questionCount: number): string {
    if (questionCount === 0) return 'opening';
    if (questionCount >= 5) return 'closing';
    return 'core';
  }
}
