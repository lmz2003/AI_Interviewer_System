import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIAssistantSession } from '../entities/ai-assistant-session.entity';
import { AIAssistantMessage } from '../entities/ai-assistant-message.entity';
import { LLMIntegrationService } from '../../knowledge-base/services/llm-integration.service';
import { KnowledgeBaseService } from '../../knowledge-base/services/knowledge-base.service';

@Injectable()
export class AIAssistantService {
  private readonly logger = new Logger(AIAssistantService.name);
  
  // 存储用于中止流式生成的 AbortSignal，key 为 `${userId}:${sessionId}`
  private abortSignals: Map<string, AbortController> = new Map();

  constructor(
    @InjectRepository(AIAssistantSession)
    private sessionRepository: Repository<AIAssistantSession>,
    @InjectRepository(AIAssistantMessage)
    private messageRepository: Repository<AIAssistantMessage>,
    private llmIntegrationService: LLMIntegrationService,
    private knowledgeBaseService: KnowledgeBaseService,
  ) {}

  // 获取用户的会话列表
  async getSessions(userId: string): Promise<AIAssistantSession[]> {
    try {
      return await this.sessionRepository.find({
        where: { userId },
        order: { updatedAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error('获取会话列表失败:', error);
      throw new BadRequestException('获取会话列表失败');
    }
  }

  // 创建新会话并生成标题
  async createSession(userId: string, initialMessage: string): Promise<AIAssistantSession> {
    try {
      // 生成会话标题
      const title = await this.generateSessionTitle(initialMessage);

      // 创建会话
      const session = this.sessionRepository.create({
        userId,
        title,
        messageCount: 0,
      });

      const savedSession = await this.sessionRepository.save(session);
      this.logger.log(`会话创建成功: ${savedSession.id}, 标题: ${title}`);

      return savedSession;
    } catch (error) {
      this.logger.error('创建会话失败:', error);
      throw new BadRequestException('创建会话失败');
    }
  }

  // 获取会话详情和消息
  async getSession(sessionId: string, userId: string): Promise<{
    session: AIAssistantSession;
    messages: AIAssistantMessage[];
  }> {
    try {
      // 查找会话
      const session = await this.sessionRepository.findOne({
        where: { id: sessionId, userId },
      });

      if (!session) {
        throw new NotFoundException('会话不存在');
      }

      // 查找会话的消息
      const messages = await this.messageRepository.find({
        where: { sessionId },
        order: { timestamp: 'ASC' },
      });

      return { session, messages };
    } catch (error) {
      this.logger.error('获取会话详情失败:', error);
      throw error;
    }
  }

  // 删除会话
  async deleteSession(sessionId: string, userId: string): Promise<void> {
    try {
      // 查找会话
      const session = await this.sessionRepository.findOne({
        where: { id: sessionId, userId },
      });

      if (!session) {
        throw new NotFoundException('会话不存在');
      }

      // 删除会话的所有消息
      await this.messageRepository.delete({ sessionId });

      // 删除会话
      await this.sessionRepository.remove(session);

      this.logger.log(`会话删除成功: ${sessionId}`);
    } catch (error) {
      this.logger.error('删除会话失败:', error);
      throw error;
    }
  }

  // 添加消息
  async addMessage(
    sessionId: string,
    userId: string,
    content: string,
    role: 'user' | 'assistant',
    sources?: Array<{ title: string; score: number }>,
  ): Promise<AIAssistantMessage> {
    try {
      // 创建消息
      const message = this.messageRepository.create({
        sessionId,
        userId,
        content,
        role,
        sources: sources || null,
      });

      const savedMessage = await this.messageRepository.save(message);

      // 更新会话的消息数量
      await this.updateSessionMessageCount(sessionId);

      this.logger.log(`消息添加成功: ${savedMessage.id}, 角色: ${role}`);

      return savedMessage;
    } catch (error) {
      this.logger.error('添加消息失败:', error);
      throw new BadRequestException('添加消息失败');
    }
  }

  // 更新会话的消息数量
  private async updateSessionMessageCount(sessionId: string): Promise<void> {
    try {
      // 计算消息数量
      const messageCount = await this.messageRepository.count({
        where: { sessionId },
      });

      // 更新会话
      await this.sessionRepository.update(sessionId, {
        messageCount,
      });
    } catch (error) {
      this.logger.error('更新会话消息数量失败:', error);
    }
  }

  /**
   * 注册一个请求的中止控制器
   */
  registerAbortController(userId: string, requestId: string): AbortController {
    const key = `${userId}:${requestId}`;
    const controller = new AbortController();
    this.abortSignals.set(key, controller);
    this.logger.log(`[中止管理] 注册请求: ${key}`);
    return controller;
  }

  /**
   * 中止一个请求
   */
  abortRequest(userId: string, requestId: string): boolean {
    const key = `${userId}:${requestId}`;
    const controller = this.abortSignals.get(key);
    if (controller) {
      this.logger.log(`[中止管理] 中止请求: ${key}`);
      controller.abort();
      return true;
    }
    this.logger.warn(`[中止管理] 未找到请求: ${key}`);
    return false;
  }

  /**
   * 清理一个请求的资源
   */
  cleanupAbortController(userId: string, requestId: string): void {
    const key = `${userId}:${requestId}`;
    this.abortSignals.delete(key);
    this.logger.debug(`[中止管理] 清理请求: ${key}`);
  }

  /**
   * 检查一个请求是否已中止
   */
  isAborted(userId: string, requestId: string): boolean {
    const key = `${userId}:${requestId}`;
    const controller = this.abortSignals.get(key);
    return controller?.signal.aborted ?? false;
  }

  // 生成会话标题
  private async generateSessionTitle(message: string): Promise<string> {
    try {
      // 使用LLM生成标题
      const prompt = `请从以下消息中提炼出一个简洁的标题，不超过50个字符，用于AI助手的会话标识：\n\n${message}`;

      // 调用LLM服务
      const response = await this.llmIntegrationService.generateRAGAnswer({
        query: '生成会话标题',
        contexts: [],
        ragPrompt: prompt,
      });

      let title = response.answer.trim();

      // 清理标题
      title = title.replace(/^"|"$/g, ''); // 移除引号
      title = title.substring(0, 50); // 限制长度

      // 如果生成失败，使用默认标题
      if (!title || title.length === 0) {
        title = '新会话';
      }

      return title;
    } catch (error) {
      this.logger.warn('生成会话标题失败，使用默认标题:', error);
      return '新会话';
    }
  }


  /**
   * 流式生成 AI 答案
   */
  async generateAnswerStream(
    message: string,
    userId: string,
    useRAG: boolean = true,
    topK: number = 5,
    threshold: number = 0.5,
    onChunk: (chunk: string) => void,
    sessionId?: string,
    requestId?: string,
    libraryIds?: string[],
  ): Promise<{
    answer: string;
    sources: Array<{ title: string; score: number }>;
  }> {
    let sources: Array<{ title: string; score: number }> = [];

    this.logger.log(`[流式生成] 开始生成答案 - 用户: ${userId}, 会话: ${sessionId || '无'}, RAG: ${useRAG}, 知识库: ${libraryIds?.join(',') || '全部'}`);

    try {
      let conversationHistory = '';
      if (sessionId) {
        try {
          this.logger.log('[流式生成] 获取会话历史...');
          const { messages: sessionMessages } = await this.getSession(sessionId, userId);
          
          if (sessionMessages && sessionMessages.length > 0) {
            const historyMessages = sessionMessages.slice(0, -1);
            
            if (historyMessages.length > 0) {
              conversationHistory = '以前的对话记录如下：\n\n';
              historyMessages.forEach((msg, index) => {
                const role = msg.role === 'user' ? '用户' : 'AI助手';
                const content = msg.content.length > 500 
                  ? msg.content.substring(0, 500) + '...' 
                  : msg.content;
                conversationHistory += `${role}：${content}\n\n`;
              });
              conversationHistory += '---\n\n当前用户的新问题：\n';
              this.logger.log(`[流式生成] 获取了 ${historyMessages.length} 条历史消息`);
            }
          }
        } catch (error) {
          this.logger.warn('获取会话历史失败，继续不使用历史:', error);
        }
      }

      if (useRAG) {
        let highQualityContexts: any[] = [];
        let hasRagError = false;

        try {
          this.logger.log('[流式生成] 开始高级检索...');
          
          const advancedResults = await this.knowledgeBaseService.advancedQuery(
            message,
            userId,
            {
              useHybridSearch: true,
              useQueryOptimization: true,
              useReranking: true,
              topK: topK * 2,
              threshold: threshold,
              rerankTopN: topK,
              libraryIds,
            },
          );

          const qualityThreshold = 0.5;
          highQualityContexts = advancedResults.filter(r => r.score > qualityThreshold);
          
          this.logger.log(`[流式生成] 高级检索完成: ${advancedResults.length} 条结果, ${highQualityContexts.length} 条高质量结果`);
        } catch (ragError) {
          this.logger.warn('高级检索失败，尝试普通检索:', ragError);
          
          try {
            let ragResult: any;
            if (libraryIds && libraryIds.length > 0) {
              ragResult = await this.knowledgeBaseService.ragQuery(
                { query: message, topK, threshold, libraryIds },
                userId,
              );
            } else {
              ragResult = await this.knowledgeBaseService.ragQuery(
                { query: message, topK, threshold },
                userId,
              );
            }
            if (ragResult?.contexts) {
              highQualityContexts = ragResult.contexts.filter((ctx: any) => ctx.score > 0.5);
            }
            this.logger.log(`[流式生成] 普通检索完成: ${highQualityContexts.length} 条高质量结果`);
          } catch (fallbackError) {
            this.logger.warn('普通检索也失败，使用通用知识回答:', fallbackError);
            hasRagError = true;
          }
        }

        let ragPrompt = '';
        
        if (!hasRagError && highQualityContexts.length > 0) {
          const contextsText = highQualityContexts
            .slice(0, 5)
            .map((ctx: any, idx: number) => 
              `[${idx + 1}] (相关性: ${(ctx.score * 100).toFixed(0)}%) ${ctx.title}:\n${ctx.content?.substring(0, 800) || ctx.chunk?.substring(0, 800) || ''}`
            )
            .join('\n\n');

          ragPrompt = `你是一个有帮助的AI助手。

${conversationHistory}

用户问题：${message}

【可选参考】以下是从知识库检索到的相关内容，仅当与问题高度相关时才参考使用：
${contextsText}

回答指南：
- 优先使用你的通用知识回答问题
- 如果检索内容与问题高度相关且有帮助，可以参考补充
- 如果检索内容与问题无关或质量不高，请忽略，直接基于你的知识回答
- 回答要准确、有帮助、条理清晰
- 不需要提及"根据参考资料"等话术`;

          sources = highQualityContexts.slice(0, 5).map((ctx: any) => ({
            title: ctx.title,
            score: ctx.score,
          }));
          this.logger.log(`[流式生成] 使用 ${sources.length} 条高质量参考内容`);
        } else {
          if (hasRagError) {
            this.logger.log('知识库检索失败，使用通用知识回答');
          } else {
            this.logger.log('知识库未找到高质量相关内容，使用通用知识回答');
          }
          ragPrompt = `${conversationHistory}

用户问题：${message}

请基于你的知识直接回答上述问题，要准确、有帮助、条理清晰。`;
          sources = [];
        }

        try {
          this.logger.log('[流式生成] 开始调用 LLM 流式生成...');
          
          const response = await this.llmIntegrationService.generateRAGAnswerStream(
            {
              query: message,
              contexts: highQualityContexts.map(ctx => ({
                title: ctx.title,
                content: ctx.content || ctx.chunk,
                score: ctx.score,
              })),
              ragPrompt,
            },
            onChunk,
            requestId ? () => this.isAborted(userId, requestId) : undefined,
          );
          this.logger.log(`[流式生成] LLM 流式生成完成，答案长度: ${response.answer.length}`);
          return { answer: response.answer, sources };
        } catch (error) {
          if (requestId && this.isAborted(userId, requestId)) {
            this.logger.log('[流式生成] 请求已中止，不返回错误消息');
            return { answer: '', sources };
          }
          
          this.logger.warn('LLM 流式调用失败，错误信息:', error);
          const errorMessage = `我收到了你的问题："${message}"，但暂时无法给出回答。`;
          onChunk(errorMessage);
          return { answer: errorMessage, sources };
        }
      } else {
        this.logger.log('[流式生成] 不使用知识库，直接调用 LLM...');
        try {
          const response = await this.llmIntegrationService.generateRAGAnswerStream(
            {
              query: message,
              contexts: [],
              ragPrompt: `${conversationHistory}${message}\n\n请直接回答上述问题。`,
            },
            onChunk,
            requestId ? () => this.isAborted(userId, requestId) : undefined,
          );
          this.logger.log(`[流式生成] LLM 流式生成完成，答案长度: ${response.answer.length}`);
          return { answer: response.answer, sources };
        } catch (error) {
          if (requestId && this.isAborted(userId, requestId)) {
            this.logger.log('[流式生成] 请求已中止，不返回错误消息');
            return { answer: '', sources };
          }
          
          this.logger.warn('LLM 流式调用失败，错误信息:', error);
          const errorMessage = `我收到了你的问题："${message}"，但暂时无法给出回答。`;
          onChunk(errorMessage);
          return { answer: errorMessage, sources };
        }
      }
    } catch (error) {
      this.logger.error('流式生成答案失败:', error);
      throw new BadRequestException('流式生成答案失败');
    }
  }

  /**
   * 处理流式用户消息
   */
  async processMessageStream(
    userId: string,
    message: string,
    sessionId?: string,
    useRAG: boolean = true,
    topK: number = 5,
    threshold: number = 0.5,
    onChunk?: (chunk: string) => void,
    requestId?: string,
    libraryIds?: string[],
  ): Promise<{
    answer: string;
    sources: Array<{ title: string; score: number }>;
    sessionId: string;
  }> {
    this.logger.log(`[流式处理] 开始处理消息 - 用户: ${userId}, 消息: "${message.substring(0, 50)}...", 知识库: ${libraryIds?.join(',') || '全部'}`);
    
    try {
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        this.logger.log('[流式处理] 创建新会话...');
        const session = await this.createSession(userId, message);
        currentSessionId = session.id;
        this.logger.log(`[流式处理] 新会话创建成功: ${currentSessionId}`);
      } else {
        this.logger.log(`[流式处理] 使用现有会话: ${currentSessionId}`);
      }

      this.logger.log('[流式处理] 存储用户消息...');
      await this.addMessage(currentSessionId, userId, message, 'user');

      const { answer, sources } = await this.generateAnswerStream(
        message,
        userId,
        useRAG,
        topK,
        threshold,
        (chunk: string) => {
          if (chunk && chunk.trim().length > 0) {
            if (onChunk) {
              onChunk(chunk);
            }
          }
        },
        currentSessionId,
        requestId,
        libraryIds,
      );

      if (answer && answer.trim().length > 0) {
        this.logger.log('[流式处理] 存储 AI 回复...');
        await this.addMessage(currentSessionId, userId, answer, 'assistant', sources);
        this.logger.log('[流式处理] AI 回复存储成功');
      } else if (requestId && this.isAborted(userId, requestId)) {
        this.logger.log('[流式处理] 请求已被中止，跳过存储空消息');
      }

      return {
        answer,
        sources,
        sessionId: currentSessionId,
      };
    } catch (error) {
      this.logger.error('流式处理消息失败:', error);
      throw error;
    }
  }
}
