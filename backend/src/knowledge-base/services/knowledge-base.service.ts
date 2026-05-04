import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { KnowledgeDocument } from '../entities/knowledge-document.entity';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { QueryKnowledgeDto } from '../dto/query-knowledge.dto';
import { MilvusService } from './milvus.service';
import { LangChainService } from './langchain.service';
import { RetrievalOptimizationService, SearchResult } from './retrieval-optimization.service';
import { BM25IndexService } from './bm25-index.service';

export interface AdvancedQueryOptions {
  useHybridSearch?: boolean;
  useQueryOptimization?: boolean;
  useReranking?: boolean;
  useHyDE?: boolean;
  semanticChunking?: boolean;
  topK?: number;
  threshold?: number;
  rerankTopN?: number;
  libraryIds?: string[];
}

export interface AdvancedQueryResult extends SearchResult {
  queryExpansion?: {
    originalQuery: string;
    rewrittenQuery: string;
    expandedQueries: string[];
    keywords: string[];
  };
  searchStrategy: string;
}

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(
    @InjectRepository(KnowledgeDocument)
    private documentRepository: Repository<KnowledgeDocument>,
    private milvusService: MilvusService,
    private langChainService: LangChainService,
    private retrievalOptimizationService: RetrievalOptimizationService,
    private bm25IndexService: BM25IndexService
  ) {}

  async addDocument(
    createDocumentDto: CreateDocumentDto,
    userId: string
  ): Promise<KnowledgeDocument> {
    try {
      const document = this.documentRepository.create({
        title: createDocumentDto.title,
        content: createDocumentDto.content,
        source: createDocumentDto.source,
        documentType: createDocumentDto.documentType || 'text',
        metadata: createDocumentDto.metadata,
        ownerId: userId,
        libraryId: createDocumentDto.libraryId || undefined,
      });

      const savedDocument = await this.documentRepository.save(document);
      this.logger.log(`文档已保存: ${savedDocument.id}, libraryId: ${savedDocument.libraryId || 'none'}`);

      try {
        const chunks = await this.langChainService.processDocument(
          createDocumentDto.content,
          createDocumentDto.title,
          {
            source: createDocumentDto.source,
            libraryId: createDocumentDto.libraryId,
            ...createDocumentDto.metadata,
          }
        );

        for (const chunk of chunks) {
          await this.milvusService.insertVector(
            `${savedDocument.id}_${chunk.metadata.chunkIndex}`,
            chunk.embedding,
            chunk.metadata.title,
            chunk.chunk,
            chunk.metadata.source || null,
            userId,
            savedDocument.libraryId
          );
        }

        savedDocument.isProcessed = true;
        savedDocument.vectorId = savedDocument.id;
        savedDocument.status = 'processed';
        await this.documentRepository.save(savedDocument);

        this.bm25IndexService.addDocument(savedDocument);

        this.logger.log(`文档处理完成: ${savedDocument.id} (${chunks.length} 个向量)`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
        this.logger.error(`文档向量处理失败: ${savedDocument.id} - ${errorMsg}`, error);
        
        savedDocument.isProcessed = false;
        savedDocument.status = 'failed';
        savedDocument.processingError = errorMsg;
        await this.documentRepository.save(savedDocument);
        
        this.logger.warn(`文档已保存但未处理向量: ${savedDocument.id}。错误: ${errorMsg}`);
      }

      return savedDocument;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error('添加文档失败:', error);
      throw new BadRequestException(`添加文档失败: ${errorMsg}`);
    }
  }

  async addDocumentAsync(
    createDocumentDto: CreateDocumentDto,
    userId: string
  ): Promise<KnowledgeDocument> {
    try {
      const document = this.documentRepository.create({
        title: createDocumentDto.title,
        content: createDocumentDto.content,
        source: createDocumentDto.source,
        documentType: createDocumentDto.documentType || 'text',
        metadata: createDocumentDto.metadata,
        ownerId: userId,
        isProcessed: false,
        status: 'uploaded',
        libraryId: createDocumentDto.libraryId || undefined,
      });

      const savedDocument = await this.documentRepository.save(document);
      this.logger.log(`文档已保存: ${savedDocument.id}，等待后台处理...`);

      this.processDocumentInBackground(savedDocument.id, createDocumentDto, userId)
        .catch((error) => {
          this.logger.error(`后台处理文档失败: ${savedDocument.id}`, error);
        });

      return savedDocument;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error('添加文档失败:', error);
      throw new BadRequestException(`添加文档失败: ${errorMsg}`);
    }
  }

  private async processDocumentInBackground(
    documentId: string,
    createDocumentDto: CreateDocumentDto,
    userId: string
  ): Promise<void> {
    try {
      const document = await this.documentRepository.findOne({
        where: { id: documentId },
      });

      if (!document) {
        this.logger.warn(`文档不存在，无法处理: ${documentId}`);
        return;
      }

      try {
        document.status = 'processing';
        await this.documentRepository.save(document);
        this.logger.log(`开始处理文档: ${documentId}`);

        const chunks = await this.langChainService.processDocument(
          createDocumentDto.content,
          createDocumentDto.title,
          {
            source: createDocumentDto.source,
            libraryId: createDocumentDto.libraryId,
            ...createDocumentDto.metadata,
          }
        );

        for (const chunk of chunks) {
          await this.milvusService.insertVector(
            `${documentId}_${chunk.metadata.chunkIndex}`,
            chunk.embedding,
            chunk.metadata.title,
            chunk.chunk,
            chunk.metadata.source || null,
            userId,
            document.libraryId
          );
        }

        document.isProcessed = true;
        document.status = 'processed';
        document.vectorId = documentId;
        document.processingError = undefined;
        await this.documentRepository.save(document);

        this.logger.log(`后台处理完成: ${documentId} (${chunks.length} 个向量)`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
        this.logger.error(`文档向量处理失败: ${documentId} - ${errorMsg}`, error);

        document.isProcessed = false;
        document.status = 'failed';
        document.processingError = errorMsg;
        await this.documentRepository.save(document);

        this.logger.warn(`文档处理失败，标记为失败: ${documentId}。错误: ${errorMsg}`);
      }
    } catch (error) {
      this.logger.error(`后台处理文档异常: ${documentId}`, error);
    }
  }

  async queryKnowledge(
    queryDto: QueryKnowledgeDto,
    userId: string
  ): Promise<Array<{ id: string; title: string; content: string; source?: string; libraryId?: string; score: number }>> {
    try {
      const topK = queryDto.topK || 5;
      const threshold = queryDto.threshold ?? 0.5;
      const libraryIds = queryDto.libraryIds;

      const queryEmbedding = await this.langChainService.generateEmbedding(queryDto.query);

      const results = await this.milvusService.searchSimilar(
        queryEmbedding,
        userId,
        topK,
        threshold,
        libraryIds
      );

      this.logger.log(`查询完成: 找到 ${results.length} 个相关文档`);
      return results;
    } catch (error) {
      this.logger.error('查询失败:', error);
      throw new BadRequestException('查询失败');
    }
  }

  async advancedQuery(
    query: string,
    userId: string,
    options: AdvancedQueryOptions = {}
  ): Promise<AdvancedQueryResult[]> {
    const {
      useHybridSearch = true,
      useQueryOptimization = true,
      useReranking = true,
      useHyDE = false,
      topK = 10,
      threshold = 0.3,
      rerankTopN = 5,
      libraryIds,
    } = options;

    this.logger.log(`高级检索开始: query="${query}", hybrid=${useHybridSearch}, optimize=${useQueryOptimization}, rerank=${useReranking}`);

    let searchQueries = [query];
    let queryExpansion: AdvancedQueryResult['queryExpansion'];

    if (useQueryOptimization) {
      const expansion = await this.retrievalOptimizationService.optimizeQuery(query);
      queryExpansion = {
        originalQuery: query,
        rewrittenQuery: expansion.rewrittenQuery,
        expandedQueries: expansion.expandedQueries,
        keywords: expansion.keywords,
      };
      
      searchQueries = [expansion.rewrittenQuery, ...expansion.expandedQueries].slice(0, 3);
      this.logger.log(`查询优化: ${searchQueries.length} 个查询变体`);
    }

    if (useHyDE && searchQueries.length === 1) {
      const hypotheticalAnswer = await this.retrievalOptimizationService.generateHypotheticalAnswer(query);
      searchQueries.push(hypotheticalAnswer.substring(0, 500));
      this.logger.log('HyDE: 已生成假设性答案用于检索');
    }

    let allVectorResults: SearchResult[] = [];
    let allBM25Results: SearchResult[] = [];

    for (const searchQuery of searchQueries) {
      const queryEmbedding = await this.langChainService.generateEmbedding(searchQuery);

      const vectorResults = await this.milvusService.searchSimilar(
        queryEmbedding,
        userId,
        topK * 2,
        threshold,
        libraryIds
      );

      allVectorResults.push(...vectorResults.map(r => ({ ...r, vectorScore: r.score })));

      if (useHybridSearch) {
        const bm25Results = this.bm25IndexService.search(searchQuery, {
          topK: topK * 2,
          threshold: 0,
          libraryIds,
        });

        allBM25Results.push(...bm25Results.map(r => ({ ...r, bm25Score: r.score })));
      }
    }

    const seenIds = new Set<string>();
    const uniqueVectorResults: SearchResult[] = [];
    for (const result of allVectorResults) {
      if (!seenIds.has(result.id)) {
        seenIds.add(result.id);
        uniqueVectorResults.push(result);
      }
    }

    const uniqueBM25Results: SearchResult[] = [];
    for (const result of allBM25Results) {
      if (!seenIds.has(result.id)) {
        seenIds.add(result.id);
        uniqueBM25Results.push(result);
      }
    }

    let fusedResults: SearchResult[];

    if (useHybridSearch && uniqueBM25Results.length > 0) {
      fusedResults = this.retrievalOptimizationService.fuseSearchResults(
        uniqueVectorResults.slice(0, topK * 2),
        uniqueBM25Results.slice(0, topK * 2)
      );
      this.logger.log(`混合检索融合: ${uniqueVectorResults.length} 向量 + ${uniqueBM25Results.length} BM25 -> ${fusedResults.length} 结果`);
    } else {
      fusedResults = uniqueVectorResults.sort((a, b) => b.score - a.score);
    }

    let finalResults: SearchResult[];

    if (useReranking && fusedResults.length > 0) {
      finalResults = await this.retrievalOptimizationService.rerankResults(
        query,
        fusedResults,
        rerankTopN
      );
      this.logger.log(`重排序完成: ${fusedResults.length} -> ${finalResults.length} 结果`);
    } else {
      finalResults = fusedResults.slice(0, rerankTopN);
    }

    const searchStrategy = [
      useQueryOptimization ? 'query_optimization' : null,
      useHybridSearch ? 'hybrid_search' : 'vector_only',
      useReranking ? 'reranking' : null,
      useHyDE ? 'hyde' : null,
    ].filter(Boolean).join('+');

    this.logger.log(`高级检索完成: 策略=${searchStrategy}, 结果数=${finalResults.length}`);

    return finalResults.map(result => ({
      ...result,
      queryExpansion,
      searchStrategy,
    }));
  }

  async rebuildBM25Index(): Promise<{ success: boolean; message: string; stats: any }> {
    try {
      await this.bm25IndexService.rebuildIndex();
      const stats = this.bm25IndexService.getStats();
      return {
        success: true,
        message: 'BM25 索引重建成功',
        stats,
      };
    } catch (error) {
      this.logger.error('BM25 索引重建失败:', error);
      return {
        success: false,
        message: `索引重建失败: ${error instanceof Error ? error.message : '未知错误'}`,
        stats: null,
      };
    }
  }

  getBM25Stats(): { totalDocs: number; avgDocLength: number; vocabularySize: number } {
    return this.bm25IndexService.getStats();
  }

  async ragQuery(
    queryDto: QueryKnowledgeDto,
    userId: string
  ): Promise<{ query: string; contexts: any[]; ragPrompt: string }> {
    try {
      const contexts = await this.queryKnowledge(queryDto, userId);

      const ragPrompt = this.langChainService.buildRAGPrompt(
        queryDto.query,
        contexts.map((c) => ({
          content: c.content,
          title: c.title,
          score: c.score,
        }))
      );

      return {
        query: queryDto.query,
        contexts,
        ragPrompt,
      };
    } catch (error) {
      this.logger.error('RAG 查询失败:', error);
      throw new BadRequestException('RAG 查询失败');
    }
  }

  async getUserDocuments(userId: string, libraryId?: string): Promise<KnowledgeDocument[]> {
    try {
      const whereCondition: any = { ownerId: userId };
      if (libraryId) {
        whereCondition.libraryId = libraryId;
      }
      
      return await this.documentRepository.find({
        where: whereCondition,
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error('获取文档列表失败:', error);
      throw new BadRequestException('获取文档列表失败');
    }
  }

  async getDocumentsByLibrary(libraryId: string, userId: string): Promise<KnowledgeDocument[]> {
    try {
      return await this.documentRepository.find({
        where: { libraryId, ownerId: userId },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error('获取知识库文档列表失败:', error);
      throw new BadRequestException('获取知识库文档列表失败');
    }
  }

  async getDocumentsByLibraries(libraryIds: string[], userId: string): Promise<KnowledgeDocument[]> {
    try {
      if (!libraryIds || libraryIds.length === 0) {
        return [];
      }
      
      return await this.documentRepository.find({
        where: { libraryId: In(libraryIds), ownerId: userId },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error('获取多知识库文档列表失败:', error);
      throw new BadRequestException('获取多知识库文档列表失败');
    }
  }

  async getDocument(documentId: string, userId: string): Promise<KnowledgeDocument> {
    try {
      const document = await this.documentRepository.findOne({
        where: {
          id: documentId,
          ownerId: userId,
        },
      });

      if (!document) {
        throw new NotFoundException('文档不存在');
      }

      return document;
    } catch (error) {
      this.logger.error('获取文档失败:', error);
      throw error;
    }
  }

  async checkDocumentExists(documentId: string, userId: string): Promise<boolean> {
    try {
      const document = await this.documentRepository.findOne({
        where: {
          id: documentId,
          ownerId: userId,
        },
      });
      return !!document;
    } catch (error) {
      this.logger.error('检查文档存在失败:', error);
      return false;
    }
  }

  async updateDocument(
    documentId: string,
    updateData: Partial<CreateDocumentDto>,
    userId: string
  ): Promise<KnowledgeDocument> {
    try {
      const document = await this.getDocument(documentId, userId);

      if (updateData.content && updateData.content !== document.content) {
        await this.milvusService.deleteVector(documentId);

        const chunks = await this.langChainService.processDocument(
          updateData.content,
          updateData.title || document.title,
          {
            source: updateData.source || document.source,
            libraryId: updateData.libraryId || document.libraryId,
            ...updateData.metadata,
          }
        );

        for (const chunk of chunks) {
          await this.milvusService.insertVector(
            `${documentId}_${chunk.metadata.chunkIndex}`,
            chunk.embedding,
            chunk.metadata.title,
            chunk.chunk,
            chunk.metadata.source || null,
            userId,
            updateData.libraryId || document.libraryId
          );
        }

        document.isProcessed = true;
        document.status = 'processed';
      }

      Object.assign(document, updateData);
      const updated = await this.documentRepository.save(document);

      this.logger.log(`文档已更新: ${documentId}`);
      return updated;
    } catch (error) {
      this.logger.error('更新文档失败:', error);
      throw error;
    }
  }

  async reprocessDocument(documentId: string, userId: string): Promise<KnowledgeDocument> {
    try {
      const document = await this.getDocument(documentId, userId);

      if (!document.content) {
        throw new BadRequestException('文档内容为空，无法处理');
      }

      try {
        await this.milvusService.deleteVector(documentId);
      } catch (error) {
        this.logger.warn(`删除旧向量失败: ${documentId}`, error);
      }

      document.status = 'processing';
      await this.documentRepository.save(document);

      try {
        const chunks = await this.langChainService.processDocument(
          document.content,
          document.title,
          {
            source: document.source,
            libraryId: document.libraryId,
            ...document.metadata,
          }
        );

        for (const chunk of chunks) {
          await this.milvusService.insertVector(
            `${documentId}_${chunk.metadata.chunkIndex}`,
            chunk.embedding,
            chunk.metadata.title,
            chunk.chunk,
            chunk.metadata.source || null,
            userId,
            document.libraryId
          );
        }

        document.isProcessed = true;
        document.status = 'processed';
        document.vectorId = documentId;
        document.processingError = undefined;
        const updated = await this.documentRepository.save(document);

        this.logger.log(`文档已重新处理: ${documentId} (${chunks.length} 个向量)`);
        return updated;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
        this.logger.error(`文档向量处理失败: ${documentId} - ${errorMsg}`, error);

        document.isProcessed = false;
        document.status = 'failed';
        document.processingError = errorMsg;
        await this.documentRepository.save(document);

        throw new BadRequestException(`文档处理失败: ${errorMsg}`);
      }
    } catch (error) {
      this.logger.error('重新处理文档失败:', error);
      throw error;
    }
  }

  async deleteDocument(documentId: string, userId: string): Promise<void> {
    try {
      const document = await this.getDocument(documentId, userId);

      await this.milvusService.deleteVector(documentId);
      this.bm25IndexService.removeDocument(documentId);
      await this.documentRepository.remove(document);

      this.logger.log(`文档已删除: ${documentId}`);
    } catch (error) {
      this.logger.error('删除文档失败:', error);
      throw error;
    }
  }

  async batchDeleteDocuments(
    documentIds: string[],
    userId: string
  ): Promise<{ deletedCount: number; failedCount: number }> {
    try {
      if (!documentIds || documentIds.length === 0) {
        throw new BadRequestException('未指定要删除的文档');
      }

      let deletedCount = 0;
      let failedCount = 0;

      for (const documentId of documentIds) {
        try {
          const document = await this.getDocument(documentId, userId);

          try {
            await this.milvusService.deleteVector(documentId);
          } catch (error) {
            this.logger.warn(`删除向量失败: ${documentId}`, error);
          }

          await this.documentRepository.remove(document);
          deletedCount++;
          this.logger.log(`文档已删除: ${documentId}`);
        } catch (error) {
          failedCount++;
          this.logger.warn(`删除文档失败: ${documentId}`, error);
        }
      }

      this.logger.log(`批量删除完成: 成功 ${deletedCount} 个，失败 ${failedCount} 个`);
      return { deletedCount, failedCount };
    } catch (error) {
      this.logger.error('批量删除文档失败:', error);
      throw error;
    }
  }

  async getStatistics(userId: string, libraryId?: string): Promise<{
    totalDocuments: number;
    processedDocuments: number;
    pendingDocuments: number;
  }> {
    try {
      const documents = await this.getUserDocuments(userId, libraryId);

      return {
        totalDocuments: documents.length,
        processedDocuments: documents.filter((d) => d.isProcessed).length,
        pendingDocuments: documents.filter((d) => !d.isProcessed).length,
      };
    } catch (error) {
      this.logger.error('获取统计信息失败:', error);
      throw new BadRequestException('获取统计信息失败');
    }
  }
}
