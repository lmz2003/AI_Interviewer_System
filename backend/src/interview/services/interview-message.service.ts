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
    videoAnalysis?: any,
  ): Promise<InterviewMessage> {
    return this.sessionService.saveMessage(
      sessionId,
      role,
      content,
      questionType,
      evaluation,
      score,
      videoAnalysis,
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
    videoAnalysis?: any,
  ): AsyncGenerator<SSEEvent> {
    this.logger.log(`[流式处理] 开始处理消息 - 会话: ${sessionId}`);

    const session = await this.sessionService.getSessionById(sessionId);
    if (!session) {
      yield { type: 'error', data: { message: '会话不存在' } };
      return;
    }

    const tempMessage = await this.saveMessage(sessionId, 'user', userMessage, undefined, undefined, undefined, videoAnalysis);

    const history = await this.getMessageHistory(sessionId);

    const lastAssistantMessage = [...history]
      .reverse()
      .find((msg) => msg.role === 'assistant');
    const currentQuestion = lastAssistantMessage?.content || '';

    // 将视频帧分析数据一并传入评估，使评分参考候选人的视频行为表现
    this.evaluateAnswerAsync(
      tempMessage.id,
      currentQuestion,
      userMessage,
      interview,
      videoAnalysis,
    );

    const sceneConfig = SCENE_CONFIG[interview.sceneType as keyof typeof SCENE_CONFIG];
    const shouldEnd = session.questionCount >= (sceneConfig?.questionCount.max || 8);

    let responseContent = '';

    if (shouldEnd) {
      const userMessages = history.filter((msg) => msg.role === 'user' && msg.evaluation);
      const avgScore = userMessages.length > 0
        ? userMessages.reduce((sum, msg) => sum + (msg.evaluation?.overall || 0), 0) / userMessages.length
        : 0;

      const closingPrompt = this.buildClosingPrompt(interview, history, avgScore);
      const shouldAbort = requestId && userId ? () => this.isAborted(userId, requestId) : undefined;

      for await (const chunk of this.llmService.streamGenerateAsync('', closingPrompt, shouldAbort)) {
        if (chunk.done) break;
        responseContent += chunk.content;
        yield { type: 'chunk', data: chunk.content };
      }

      await this.saveMessage(sessionId, 'assistant', responseContent, 'closing');

      yield {
        type: 'done',
        data: {
          shouldEnd: true,
          message: '面试已结束',
        },
      };
    } else {
      const questionPrompt = this.buildQuestionPrompt(interview, history, session.questionCount, resumeContent);
      const shouldAbort = requestId && userId ? () => this.isAborted(userId, requestId) : undefined;

      for await (const chunk of this.llmService.streamGenerateAsync(
        SCENE_CONFIG[interview.sceneType as keyof typeof SCENE_CONFIG]?.systemPrompt || '',
        questionPrompt,
        shouldAbort,
      )) {
        if (chunk.done) break;
        responseContent += chunk.content;
        yield { type: 'chunk', data: chunk.content };
      }

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

  private buildQuestionPrompt(
    interview: Interview,
    history: InterviewMessage[],
    questionCount: number,
    resumeContent?: string,
  ): string {
    const sceneConfig = SCENE_CONFIG[interview.sceneType as keyof typeof SCENE_CONFIG];
    const historyText = this.formatHistory(history);

    return `面试进行中，当前是第${questionCount + 1}个问题。

面试信息：
- 面试场景：${sceneConfig?.name || interview.sceneType}
- 岗位类型：${interview.jobType || '通用岗位'}
- 难度等级：${interview.difficulty || 'medium'}
- 已提问数量：${questionCount}
- 剩余问题数量：${(sceneConfig?.questionCount.max || 8) - questionCount}

${resumeContent ? `候选人简历摘要：\n${resumeContent}\n` : ''}

历史对话：
${historyText}

请生成下一个面试问题。要求：
1. 问题应该与面试场景和岗位相关
2. 根据候选人的回答情况，可以追问或提出新问题
3. 问题要有针对性和深度
4. 不要使用markdown格式，直接输出纯文本`;
  }

  private buildClosingPrompt(
    interview: Interview,
    history: InterviewMessage[],
    averageScore: number,
  ): string {
    const sceneConfig = SCENE_CONFIG[interview.sceneType as keyof typeof SCENE_CONFIG];
    const historyText = this.formatHistory(history);

    return `面试即将结束，请生成结束语。

面试信息：
- 面试场景：${sceneConfig?.name || interview.sceneType}
- 岗位类型：${interview.jobType || '通用岗位'}
- 候选人整体表现评分：${averageScore.toFixed(1)}/10

历史对话摘要：
${historyText.substring(0, 1000)}...

请生成一个结束语，包括：
1. 感谢候选人参加面试
2. 简要说明后续流程
3. 给予候选人一些鼓励

要求：
- 语气专业友善
- 简洁明了，不超过100字
- 不要使用markdown格式，直接输出纯文本`;
  }

  private formatHistory(history: InterviewMessage[]): string {
    return history
      .map((msg) => `${msg.role === 'user' ? '候选人' : '面试官'}：${msg.content}`)
      .join('\n');
  }

  private async evaluateAnswerAsync(
    messageId: string,
    question: string,
    answer: string,
    interview: Interview,
    videoAnalysis?: any,
  ): Promise<void> {
    this.evaluatorService.evaluateAnswer(question, answer, interview, videoAnalysis)
      .then(async (evaluation) => {
        await this.messageRepository.update(
          { id: messageId },
          { evaluation, score: evaluation.overall },
        );
        this.logger.log(`[异步评估] 消息 ${messageId} 评估完成 - 评分: ${evaluation.overall.toFixed(2)}${videoAnalysis ? '（含视频分析）' : ''}`);
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

    const sceneConfig = SCENE_CONFIG[interview.sceneType as keyof typeof SCENE_CONFIG];
    const openingPrompt = this.buildOpeningPrompt(interview, resumeContent);

    for await (const chunk of this.llmService.streamGenerateAsync(
      sceneConfig?.systemPrompt || '',
      openingPrompt,
      shouldAbort,
    )) {
      if (chunk.done) break;
      yield { type: 'chunk', data: chunk.content };
    }

    yield { type: 'done', data: { message: '开场白生成完成' } };
  }

  private buildOpeningPrompt(interview: Interview, resumeContent?: string): string {
    const sceneConfig = SCENE_CONFIG[interview.sceneType as keyof typeof SCENE_CONFIG];

    return `你是一位面试官，现在要开始一场${sceneConfig?.name || interview.sceneType}。

面试信息：
- 面试场景：${sceneConfig?.name || interview.sceneType}
- 岗位类型：${interview.jobType || '通用岗位'}
- 难度等级：${interview.difficulty || 'medium'}
- 预计问题数量：${sceneConfig?.questionCount.min || 5}-${sceneConfig?.questionCount.max || 8}个

${resumeContent ? `候选人简历摘要：\n${resumeContent}\n` : ''}

请生成一个开场白，包括：
1. 简短的自我介绍（作为面试官）
2. 简单说明今天的面试流程
3. 请候选人进行自我介绍

要求：
- 语气专业友善
- 简洁明了，不超过100字
- 不要使用markdown格式，直接输出纯文本`;
  }

  private determineQuestionType(questionCount: number): string {
    if (questionCount === 0) return 'opening';
    if (questionCount >= 5) return 'closing';
    return 'core';
  }
}
