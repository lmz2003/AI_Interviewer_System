import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from 'langchain/document';
import { RetrievalOptimizationService, ProcessedChunk } from './retrieval-optimization.service';

export interface ChunkResult {
  chunk: string;
  embedding: number[];
  metadata: {
    title: string;
    chunkIndex: number;
    totalChunks: number;
    source?: string;
    libraryId?: string;
    chunkType?: string;
    startPosition?: number;
    endPosition?: number;
    parentContext?: string;
  };
}

@Injectable()
export class LangChainService {
  private embeddings: any;
  private readonly logger = new Logger(LangChainService.name);
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor(
    private configService: ConfigService,
    private retrievalOptimizationService: RetrievalOptimizationService
  ) {
    const embeddingProvider = this.configService.get<string>('EMBEDDING_PROVIDER');
    const apiKey = this.configService.get<string>('LLM_API_KEY');
    const baseUrl = this.configService.get<string>('LLM_BASE_URL');
    const modelName = this.configService.get<string>('EMBEDDING_MODEL');

    if (embeddingProvider === 'siliconflow') {
      if (!apiKey) {
        this.logger.warn('硅基流动 API 密钥未配置，请在 .env 文件中设置 LLM_API_KEY');
      }
      this.logger.log(`使用硅基流动 Embeddings: ${modelName}`);
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: apiKey,
        modelName: modelName,
        configuration: {
          baseURL: baseUrl || 'https://api.siliconflow.cn/v1',
        },
      });
    }

    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 2000,
      chunkOverlap: 400,
      separators: ['\n\n', '\n', '。', '！', '？', '，', ' ', ''],
    });
  }

  /**
   * 生成文本的向量嵌入
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('输入文本不能为空');
      }
      
      const embedding = await this.embeddings.embedQuery(text);
      return embedding;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`生成嵌入失败: ${errorMsg}`, error);
      
      // 检查是否是 API 密钥/权限/余额问题
      if (errorMsg.includes('401') || errorMsg.includes('Unauthorized') || errorMsg.includes('API key')) {
        throw new Error('API 密钥无效或未配置，请检查环境变量 LLM_API_KEY');
      }
      if (errorMsg.includes('403') || errorMsg.includes('Forbidden') || errorMsg.includes('insufficient') || errorMsg.includes('balance')) {
        throw new Error('API 账户余额不足或无权限访问该模型，请前往硅基流动控制台充值或检查模型权限');
      }
      throw error;
    }
  }

  /**
   * 生成多个文本的向量嵌入
   */
  private async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      if (!texts || texts.length === 0) {
        throw new Error('文本列表不能为空');
      }
      
      if (texts.some(t => !t || t.trim().length === 0)) {
        throw new Error('文本列表中存在空文本');
      }
      
      this.logger.log(`开始批量生成 ${texts.length} 个文本的嵌入...`);
      const embeddings = await this.embeddings.embedDocuments(texts);
      this.logger.log(`批量生成嵌入完成: ${texts.length} 个向量`);
      return embeddings;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`批量生成嵌入失败: ${errorMsg}`, error);
      
      if (errorMsg.includes('401') || errorMsg.includes('Unauthorized') || errorMsg.includes('API key')) {
        throw new Error('API 密钥无效或未配置，请检查环境变量 LLM_API_KEY');
      }
      if (errorMsg.includes('403') || errorMsg.includes('Forbidden') || errorMsg.includes('insufficient') || errorMsg.includes('balance')) {
        throw new Error('API 账户余额不足或无权限访问该模型，请前往硅基流动控制台充值或检查模型权限');
      }
      throw error;
    }
  }

  /**
   * 分割文本为块
   */
  async splitText(text: string): Promise<Document[]> {
    try {
      let docs = await this.textSplitter.createDocuments([text]);
      
      // 如果分割后文本块数量太少（小于3），尝试更激进的分割
      if (docs.length < 3 && text.length > 5000) {
        this.logger.warn(`文本分割块数过少 (${docs.length})，使用更激进的分割策略`);
        
        // 尝试使用更小的 chunkSize
        const aggressiveSplitter = new RecursiveCharacterTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 200,
          separators: ['\n\n', '\n', '。', '！', '？', '，', ' ', ''],
        });
        
        docs = await aggressiveSplitter.createDocuments([text]);
        this.logger.log(`使用激进策略后，文本分割完成，共 ${docs.length} 个块`);
      }
      
      if (docs.length === 0) {
        // 如果分割完全失败，至少返回整个文本作为一个块
        this.logger.warn('文本分割结果为空，将整个文本作为一个块');
        docs = [new Document({ pageContent: text })];
      }
      
      this.logger.log(`文本分割完成，共 ${docs.length} 个块`);
      return docs;
    } catch (error) {
      this.logger.error('文本分割失败:', error);
      throw error;
    }
  }

  /**
   * 处理文档：分割 + 生成嵌入
   */
  async processDocument(
    content: string,
    title: string,
    metadata?: Record<string, any>
  ): Promise<Array<{ chunk: string; embedding: number[]; metadata: any }>> {
    try {
      if (!content || content.trim().length === 0) {
        throw new Error('文档内容不能为空');
      }

      if (!title || title.trim().length === 0) {
        throw new Error('文档标题不能为空');
      }

      this.logger.log(`开始处理文档: ${title}`);
      
      // 分割文本
      const docs = await this.splitText(content);

      if (docs.length === 0) {
        throw new Error('文本分割后没有得到任何块');
      }

      // 提取文本块
      const chunks = docs.map((doc) => doc.pageContent);
      this.logger.log(`文本分割完成: ${chunks.length} 个块`);

      // 生成嵌入
      this.logger.log(`开始为 ${chunks.length} 个块生成嵌入...`);
      const embeddings = await this.generateEmbeddings(chunks);

      if (embeddings.length !== chunks.length) {
        throw new Error(`生成的嵌入数量 (${embeddings.length}) 与文本块数量 (${chunks.length}) 不匹配`);
      }

      // 组合结果
      const results = chunks.map((chunk, index) => ({
        chunk,
        embedding: embeddings[index],
        metadata: {
          ...metadata,
          title,
          chunkIndex: index,
          totalChunks: chunks.length,
        },
      }));

      this.logger.log(`文档处理完成: ${title} (${results.length} 个块)`);
      return results;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`文档处理失败: ${title} - ${errorMsg}`, error);
      throw error;
    }
  }

  async processDocumentWithSemanticChunking(
    content: string,
    title: string,
    metadata?: Record<string, any>
  ): Promise<ChunkResult[]> {
    try {
      if (!content || content.trim().length === 0) {
        throw new Error('文档内容不能为空');
      }

      if (!title || title.trim().length === 0) {
        throw new Error('文档标题不能为空');
      }

      this.logger.log(`开始语义分块处理文档: ${title}`);

      const semanticChunks = await this.retrievalOptimizationService.semanticChunking(
        content,
        title,
        metadata
      );

      if (semanticChunks.length === 0) {
        throw new Error('语义分块后没有得到任何块');
      }

      const chunks = semanticChunks.map(c => c.chunk);
      this.logger.log(`语义分块完成: ${chunks.length} 个块`);

      this.logger.log(`开始为 ${chunks.length} 个块生成嵌入...`);
      const embeddings = await this.generateEmbeddings(chunks);

      if (embeddings.length !== chunks.length) {
        throw new Error(`生成的嵌入数量 (${embeddings.length}) 与文本块数量 (${chunks.length}) 不匹配`);
      }

      const results: ChunkResult[] = semanticChunks.map((semanticChunk, index) => ({
        chunk: semanticChunk.chunk,
        embedding: embeddings[index],
        metadata: {
          title,
          chunkIndex: semanticChunk.metadata.chunkIndex,
          totalChunks: semanticChunks.length,
          source: semanticChunk.metadata.source,
          libraryId: semanticChunk.metadata.libraryId,
          chunkType: semanticChunk.metadata.chunkType,
          startPosition: semanticChunk.metadata.startPosition,
          endPosition: semanticChunk.metadata.endPosition,
          parentContext: semanticChunk.metadata.parentContext,
        },
      }));

      this.logger.log(`语义分块文档处理完成: ${title} (${results.length} 个块)`);
      return results;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`语义分块文档处理失败: ${title} - ${errorMsg}`, error);
      throw error;
    }
  }

  async generateQueryEmbedding(query: string): Promise<number[]> {
    return this.generateEmbedding(query);
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    return this.generateEmbeddings(texts);
  }

  /**
   * 使用 RAG 进行查询
   * @param query 查询文本
   * @param contexts 检索到的上下文
   * @returns 增强后的提示词
   */
  buildRAGPrompt(query: string, contexts: Array<{ content: string; title: string; score: number }>): string {
    const contextText = contexts
      .map(
        (ctx, index) =>
          `[文档 ${index + 1}] 标题: ${ctx.title}\n相似度: ${(ctx.score * 100).toFixed(2)}%\n内容:\n${ctx.content}`
      )
      .join('\n\n---\n\n');

    const prompt = `根据以下文档内容回答问题。如果文档中没有相关信息，请说明。

文档内容:
${contextText}

问题: ${query}

请基于上述文档内容提供详细的回答。`;

    return prompt;
  }

  /**
   * 获取 Embeddings 实例
   */
  getEmbeddings(): OpenAIEmbeddings {
    return this.embeddings;
  }
}
