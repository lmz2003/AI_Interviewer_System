import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Readable } from 'stream';

interface RAGContext {
  query: string;
  contexts: Array<{ content: string; title: string; score: number }>;
  ragPrompt: string;
}

interface LLMResponse {
  query: string;
  answer: string;
  contexts: Array<{ title: string; score: number }>;
  model: string;
  tokensUsed?: number;
}

@Injectable()
export class LLMIntegrationService {
  private llm: ChatOpenAI;
  private readonly logger = new Logger(LLMIntegrationService.name);
  private modelName = this.configService.get<string>('LLM_MODEL') || 'gpt-3.5-turbo';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('LLM_API_KEY');
    const baseUrl = this.configService.get<string>('LLM_BASE_URL');
    const provider = this.configService.get<string>('LLM_PROVIDER') || 'openai';

    if (!apiKey) {
      this.logger.warn('API Key 未配置，请设置 OPENAI_API_KEY');
    }

    if (provider === 'siliconflow') {
      this.logger.log(`使用硅基流动 LLM: ${this.modelName}`);
      this.llm = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: this.modelName,
        configuration: {
          baseURL: baseUrl || 'https://api.siliconflow.cn/v1',
        },
        temperature: 0.7,
        maxTokens: 4000, // 增加最大 token 数量，允许更长的回答
      });
    } else {
      this.logger.log(`使用 OpenAI LLM: ${this.modelName}`);
      this.llm = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: this.modelName,
        configuration: baseUrl ? {
          baseURL: baseUrl,
        } : undefined,
        temperature: 0.7,
        maxTokens: 4000, // 增加最大 token 数量，允许更长的回答
      });
    }
  }

  /**
   * 使用 RAG 上下文生成答案
   */
  async generateRAGAnswer(ragContext: RAGContext): Promise<LLMResponse> {
    try {
      if (!this.llm) {
        throw new Error('LLM 未正确初始化');
      }

      // 调用 LLM
      const response = await this.llm.invoke([
        new HumanMessage(ragContext.ragPrompt),
      ]);

      return {
        query: ragContext.query,
        answer: response.content as string,
        contexts: ragContext.contexts.map((c) => ({
          title: c.title,
          score: c.score,
        })),
        model: this.modelName,
      };
    } catch (error) {
      this.logger.error('LLM 调用失败:', error);
      throw error;
    }
  }

  /**
   * 总结文档
   */
  async summarizeDocument(content: string, maxLength: number = 200): Promise<string> {
    try {
      if (!this.llm) {
        throw new Error('LLM 未正确初始化');
      }

      const prompt = `请用不超过 ${maxLength} 个字符总结以下文档内容：\n\n${content}`;
      const response = await this.llm.invoke([
        new HumanMessage(prompt),
      ]);

      return response.content as string;
    } catch (error) {
      this.logger.error('文档总结失败:', error);
      throw error;
    }
  }

  /**
   * 评估答案质量
   */
  async evaluateAnswer(
    question: string,
    answer: string,
    context: string
  ): Promise<{ score: number; feedback: string }> {
    try {
      if (!this.llm) {
        throw new Error('LLM 未正确初始化');
      }

      const prompt = `请评估以下答案的质量（1-10分），并提供反馈。

问题：${question}
答案：${answer}
上下文：${context}

请按以下格式回答：
分数：[1-10]
反馈：[您的反馈]`;

      const response = await this.llm.invoke([
        new HumanMessage(prompt),
      ]);

      // 解析响应
      const responseText = response.content as string;
      const scoreMatch = responseText.match(/分数：(\d+)/);
      const feedbackMatch = responseText.match(/反馈：(.+)/);

      const score = scoreMatch ? parseInt(scoreMatch[1]) / 10 : 0.5;
      const feedback = feedbackMatch ? feedbackMatch[1].trim() : '';

      return { score, feedback };
    } catch (error) {
      this.logger.error('答案评估失败:', error);
      throw error;
    }
  }

  /**
   * 流式生成 RAG 答案
   * @param ragContext RAG 上下文
   * @param onChunk 每次接收到数据块时的回调
   * @param shouldAbort 中止检查函数
   * @returns Promise<LLMResponse>
   */
  async generateRAGAnswerStream(
    ragContext: RAGContext,
    onChunk: (chunk: string) => void,
    shouldAbort?: () => boolean,
  ): Promise<LLMResponse> {
    try {
      if (!this.llm) {
        throw new Error('LLM 未正确初始化');
      }

      let fullAnswer = '';
      let chunkCount = 0;

      const stream = await this.llm.stream([
        new HumanMessage(ragContext.ragPrompt),
      ]);

      this.logger.log('[LLM流式输出] 开始流式生成答案...');

      for await (const chunk of stream) {
        // 检查是否需要中止
        if (shouldAbort && shouldAbort()) {
          this.logger.log('[LLM流式输出] 检测到中止信号，停止流式生成');
          break;
        }

        this.logger.log('[LLM流式输出] 收到数据块:', JSON.stringify(chunk));
        try {
          const content = this.extractChunkContent(chunk);
          if (content && content.length > 0) {
            fullAnswer += content;
            chunkCount++;

            if (chunkCount % 10 === 0) {
              this.logger.debug(`[LLM流式输出] 已收到 ${chunkCount} 个数据块，当前内容长度: ${fullAnswer.length}`);
            }

            onChunk(content);
          }
        } catch (parseError) {
          this.logger.debug('数据块处理错误，已忽略', parseError);
        }
      }

      this.logger.log(`[LLM流式输出] 流式生成完成，共收到 ${chunkCount} 个数据块，总长度: ${fullAnswer.length}`);

      return {
        query: ragContext.query,
        answer: fullAnswer,
        contexts: ragContext.contexts.map((c) => ({
          title: c.title,
          score: c.score,
        })),
        model: this.modelName,
      };
    } catch (error) {
      this.logger.error('LLM 流式调用失败:', error);
      throw error;
    }
  }

  private extractChunkContent(chunk: unknown): string | null {
    if (!chunk) {
      return null;
    }
    
    try {
      const chunkObj = chunk as Record<string, unknown>;
      
      // 判断这是否是一个只包含 metadata 的数据块（无实际内容）
      const isMetadataOnlyChunk = this.isMetadataOnlyChunk(chunkObj);
      if (isMetadataOnlyChunk) {
        this.logger.debug('[extractChunkContent] 跳过纯 metadata 数据块');
        return null;
      }
      
      // 尝试从 content 属性提取
      if ('content' in chunkObj) {
        const content = chunkObj.content;
        if (typeof content === 'string' && content.length > 0) {
          return content;
        }
        if (Array.isArray(content)) {
          // 如果 content 是数组，提取所有文本内容
          const extractedContent = content
            .map((item: unknown) => {
              if (typeof item === 'string') {
                return item;
              }
              if (item && typeof item === 'object') {
                const itemObj = item as Record<string, unknown>;
                if ('text' in itemObj && typeof itemObj.text === 'string') {
                  return itemObj.text;
                }
                if ('type' in itemObj && itemObj.type === 'text' && 'text' in itemObj) {
                  return String(itemObj.text || '');
                }
              }
              return '';
            })
            .join('');
          
          if (extractedContent.length > 0) {
            return extractedContent;
          }
        }
      }
      
      // 尝试从 kwargs 中提取
      if ('kwargs' in chunkObj && chunkObj.kwargs && typeof chunkObj.kwargs === 'object') {
        const kwargs = chunkObj.kwargs as Record<string, unknown>;
        
        // 检查这是否是纯 metadata 的 kwargs 对象
        if (this.isMetadataOnlyKwargs(kwargs)) {
          this.logger.debug('[extractChunkContent] 跳过纯 metadata kwargs 数据块');
          return null;
        }
        
        if ('content' in kwargs && typeof kwargs.content === 'string' && kwargs.content.length > 0) {
          return kwargs.content;
        }
      }
      
      return null;
    } catch (error) {
      this.logger.warn('[extractChunkContent] 提取内容失败:', error);
      return null;
    }
  }

  /**
   * 判断是否是纯 metadata 的数据块（不包含实际文本内容）
   */
  private isMetadataOnlyChunk(chunk: Record<string, unknown>): boolean {
    // 如果只有 kwargs 且 kwargs 只包含 metadata 信息，则是纯 metadata 块
    if ('kwargs' in chunk && Object.keys(chunk).length === 1) {
      const kwargs = chunk.kwargs;
      if (kwargs && typeof kwargs === 'object') {
        return this.isMetadataOnlyKwargs(kwargs as Record<string, unknown>);
      }
    }
    return false;
  }

  /**
   * 判断 kwargs 是否只包含 metadata 信息
   */
  private isMetadataOnlyKwargs(kwargs: Record<string, unknown>): boolean {
    // 检查是否只有 response_metadata 这个字段，或者只有 response_metadata 和其他非内容字段
    const contentFields = ['content', 'text'];
    const hasContent = Object.keys(kwargs).some(key => {
      const value = kwargs[key];
      if (contentFields.includes(key) && typeof value === 'string' && value.length > 0) {
        return true;
      }
      return false;
    });
    
    return !hasContent;
  }
}
