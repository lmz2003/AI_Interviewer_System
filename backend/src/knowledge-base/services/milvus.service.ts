import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MilvusClient, DataType } from '@zilliz/milvus2-sdk-node';

@Injectable()
export class MilvusService implements OnModuleInit, OnModuleDestroy {
  private milvusClient: MilvusClient | null;
  private readonly logger = new Logger(MilvusService.name);
  private readonly collectionName = 'knowledge_vectors';
  private embeddingDim: number;

  constructor(private configService: ConfigService) {
    this.milvusClient = null;
    this.embeddingDim = this.configService.get<number>('EMBEDDING_DIM') || 1536;
  }

  async onModuleInit() {
    try {
      const milvusHost = this.configService.get<string>('MILVUS_HOST') || 'localhost';
      const milvusPort = this.configService.get<number>('MILVUS_PORT') || 19530;

      this.milvusClient = new MilvusClient({
        address: `${milvusHost}:${milvusPort}`,
        timeout: 60000,
      });

      this.logger.log(`连接到 Milvus: ${milvusHost}:${milvusPort}`);
      
      await this.initializeCollectionWithRetry();
    } catch (error) {
      this.logger.error('Milvus 连接失败:', error);
      throw error;
    }
  }

  private async initializeCollectionWithRetry(maxRetries: number = 6) {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`初始化集合 (尝试 ${attempt}/${maxRetries})`);
        await this.initializeCollection();
        this.logger.log('集合初始化成功');
        return;
      } catch (error) {
        lastError = error;
        const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
        
        if (errorMsg.includes('DEADLINE_EXCEEDED') || errorMsg.includes('Deadline exceeded')) {
          if (attempt < maxRetries) {
            const delaySeconds = attempt * 5;
            this.logger.warn(
              `初始化超时，${delaySeconds}秒后重试... (${attempt}/${maxRetries})`
            );
            await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
            continue;
          }
        }
        
        throw error;
      }
    }
    
    throw lastError;
  }

  async onModuleDestroy() {
    if (this.milvusClient) {
      await this.milvusClient.closeConnection();
      this.logger.log('Milvus 连接已关闭');
    }
  }

  private async initializeCollection() {
    if (!this.milvusClient) {
      throw new Error('Milvus client not initialized');
    }
    
    try {
      this.logger.log('正在列出现有集合...');
      const collections = await this.milvusClient.listCollections();
      const exists = collections.data?.some(
        (c: any) => c.name === this.collectionName
      );

      if (exists) {
        this.logger.log(`集合 ${this.collectionName} 已存在，检查字段结构...`);
        
        try {
          const describeRes = await this.milvusClient.describeCollection({
            collection_name: this.collectionName,
          });
          
          const fieldNames = describeRes.schema?.fields?.map((f: any) => f.name) || [];
          this.logger.log(`现有字段: ${fieldNames.join(', ')}`);
          
          if (!fieldNames.includes('libraryId')) {
            this.logger.warn(`集合缺少 libraryId 字段，需要重建集合（现有向量数据将丢失）...`);
            
            try {
              await this.milvusClient.releaseCollection({
                collection_name: this.collectionName,
              });
            } catch (e) {
              this.logger.warn('释放集合失败，继续删除');
            }
            
            await this.milvusClient.dropCollection({
              collection_name: this.collectionName,
            });
            
            this.logger.log(`旧集合已删除，将重新创建...`);
            await this.createNewCollection();
            return;
          }
        } catch (describeError) {
          this.logger.warn(`检查集合结构失败: ${describeError}，尝试重新创建...`);
          
          try {
            await this.milvusClient.dropCollection({
              collection_name: this.collectionName,
            });
          } catch (e) {
            this.logger.warn('删除集合失败');
          }
          
          await this.createNewCollection();
          return;
        }
        
        try {
          await this.milvusClient.loadCollectionSync({
            collection_name: this.collectionName,
          });
          this.logger.log(`集合 ${this.collectionName} 加载成功`);
        } catch (loadError) {
          const errorMsg = loadError instanceof Error ? loadError.message : JSON.stringify(loadError);
          this.logger.warn(`加载集合失败，尝试直接使用: ${errorMsg}`);
        }
        return;
      }

      this.logger.log(`创建集合: ${this.collectionName}`);
      await this.createNewCollection();
    } catch (error) {
      this.logger.error('初始化集合失败:', error);
      throw error;
    }
  }

  private async createNewCollection() {
    if (!this.milvusClient) {
      throw new Error('Milvus client not initialized');
    }
        
    await this.milvusClient.createCollection({
      collection_name: this.collectionName,
      fields: [
        {
          name: 'id',
          description: 'Document ID',
          data_type: 'VarChar',
          is_primary_key: true,
          max_length: 100,
        },
        {
          name: 'embedding',
          description: 'Document embedding vector',
          data_type: 'FloatVector',
          dim: this.embeddingDim,
        },
        {
          name: 'title',
          description: 'Document title',
          data_type: 'VarChar',
          max_length: 500,
        },
        {
          name: 'content',
          description: 'Document content',
          data_type: 'VarChar',
          max_length: 65535,
        },
        {
          name: 'source',
          description: 'Document source',
          data_type: 'VarChar',
          max_length: 500,
        },
        {
          name: 'userId',
          description: 'Owner user ID',
          data_type: 'VarChar',
          max_length: 100,
        },
        {
          name: 'libraryId',
          description: 'Knowledge library ID',
          data_type: 'VarChar',
          max_length: 100,
        },
        {
          name: 'timestamp',
          description: 'Creation timestamp',
          data_type: 'Int64',
        },
      ],
    });

    await this.milvusClient.createIndex({
      collection_name: this.collectionName,
      field_name: 'embedding',
      index_type: 'IVF_FLAT',
      metric_type: 'L2',
      params: {
        nlist: 1024,
      },
    });

    this.logger.log(`集合 ${this.collectionName} 创建成功`);

    await this.milvusClient.loadCollectionSync({
      collection_name: this.collectionName,
    });
  }

  async insertVector(
    id: string,
    embedding: number[],
    title: string,
    content: string,
    source: string | null,
    userId: string,
    libraryId?: string | null
  ) {
    const maxRetries = 5;
    const retryDelay = 2000;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!id || id.trim().length === 0) {
          throw new Error('向量 ID 不能为空');
        }
        if (!embedding || embedding.length === 0) {
          throw new Error('向量嵌入不能为空');
        }
        if (!title || title.trim().length === 0) {
          throw new Error('标题不能为空');
        }
        if (!content || content.trim().length === 0) {
          throw new Error('内容不能为空');
        }
        if (!userId || userId.trim().length === 0) {
          throw new Error('用户 ID 不能为空');
        }

        if (!this.milvusClient) {
          throw new Error('Milvus 客户端未初始化，请确保 Milvus 服务已启动');
        }

        this.logger.log(`插入向量: ${id}, 嵌入维度: ${embedding.length}, 内容长度: ${content.length}, libraryId: ${libraryId || 'none'} (尝试 ${attempt}/${maxRetries})`);

        const result = await this.milvusClient.insert({
          collection_name: this.collectionName,
          data: [
            {
              id: id,
              embedding: embedding,
              title: title.substring(0, 500),
              content: content.substring(0, 65535),
              source: source || '',
              userId: userId,
              libraryId: libraryId || '',
              timestamp: Date.now(),
            },
          ],
        });

        this.logger.log(`向量插入成功: ${id}`);
        return result;
      } catch (error) {
        lastError = error;
        const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
        
        if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('connect') || errorMsg.includes('ENOTFOUND')) {
          throw new Error('Milvus 服务连接失败。请确保 Milvus 已在 ' + 
            `${this.configService.get('MILVUS_HOST')}:${this.configService.get('MILVUS_PORT')} 运行`);
        }
        
        if (errorMsg.includes('NotReadyServe') || errorMsg.includes('Initializing')) {
          if (attempt < maxRetries) {
            this.logger.warn(`Milvus 服务未就绪，${retryDelay / 1000} 秒后重试 (${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
        }
        
        this.logger.error(`向量插入失败: ${errorMsg}`, error);
        throw error;
      }
    }
    
    throw lastError;
  }

  async searchSimilar(
    queryEmbedding: number[],
    userId: string,
    topK: number = 5,
    threshold: number = 0.5,
    libraryIds?: string[]
  ) {
    try {
      if (!queryEmbedding || queryEmbedding.length === 0) {
        throw new Error('查询嵌入不能为空');
      }
      if (!userId || userId.trim().length === 0) {
        throw new Error('用户 ID 不能为空');
      }
      if (topK <= 0) {
        throw new Error('topK 必须大于 0');
      }
      if (threshold < 0 || threshold > 1) {
        throw new Error('threshold 必须在 0 到 1 之间');
      }

      if (!this.milvusClient) {
        throw new Error('Milvus 客户端未初始化，请确保 Milvus 服务已启动');
      }

      this.logger.log(`搜索向量: userId=${userId}, topK=${topK}, threshold=${threshold}, libraryIds=${libraryIds?.join(',') || 'all'}`);

      let filter = `userId == "${userId}"`;
      
      if (libraryIds && libraryIds.length > 0) {
        const libraryFilter = libraryIds.map(id => `libraryId == "${id}"`).join(' || ');
        filter = `(${filter}) && (${libraryFilter})`;
      }

      const result = await this.milvusClient.search({
        collection_name: this.collectionName,
        vectors: [queryEmbedding],
        vector_type: DataType.FloatVector,
        search_params: {
          anns_field: 'embedding',
          topk: topK.toString(),
          metric_type: 'L2',
          params: JSON.stringify({ nprobe: 10 }),
        },
        output_fields: ['id', 'title', 'content', 'source', 'userId', 'libraryId'],
        filter: filter,
      });

      let searchResults: any[] = [];
      this.logger.log('Milvus search result:', JSON.stringify(result, null, 2));
      
      if (result.results && Array.isArray(result.results)) {
        if (result.results.length > 0 && Array.isArray(result.results[0])) {
          searchResults = result.results[0];
        } else if (result.results.length > 0 && typeof result.results[0] === 'object') {
          searchResults = result.results;
        }
      }

      const results = searchResults.map((item: any) => {
        let score = 0.5;
        
        if (item.score !== undefined && item.score !== null) {
          const distance = item.score;
          score = 1 / (1 + distance);
        } 
        else if (item.distance !== undefined && item.distance !== null) {
          const distance = item.distance;
          score = 1 / (1 + distance);
        }
        
        return {
          id: item.id || item.entity?.id,
          title: item.title || item.entity?.title,
          content: item.content || item.entity?.content,
          source: item.source || item.entity?.source,
          libraryId: item.libraryId || item.entity?.libraryId,
          score: Math.min(1, Math.max(0, score)),
        };
      }) || [];

      const filtered = results.filter((r: any) => r.score >= threshold);
      this.logger.log(`搜索完成: 找到 ${results.length} 个候选项，${filtered.length} 个满足阈值`);
      return filtered;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`搜索向量失败: ${errorMsg}`, error);
      
      if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('connect') || errorMsg.includes('ENOTFOUND')) {
        throw new Error('Milvus 服务连接失败。请确保 Milvus 已在 ' + 
          `${this.configService.get('MILVUS_HOST')}:${this.configService.get('MILVUS_PORT')} 运行`);
      }
      throw error;
    }
  }

  async deleteVector(id: string) {
    if (!this.milvusClient) {
      throw new Error('Milvus client not initialized');
    }
    
    try {
      if (!id || id.trim().length === 0) {
        throw new Error('向量 ID 不能为空');
      }

      const deleteExpr = `id like "${id}_%"`;
      
      this.logger.log(`删除向量: ${id}，使用表达式: ${deleteExpr}`);

      await this.milvusClient.deleteEntities({
        collection_name: this.collectionName,
        expr: deleteExpr,
      });

      this.logger.log(`向量删除成功: ${id} (删除所有分块)`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`向量删除失败: ${errorMsg}`, error);
      throw error;
    }
  }

  async deleteUserVectors(userId: string) {
    if (!this.milvusClient) {
      throw new Error('Milvus client not initialized');
    }
    
    try {
      await this.milvusClient.deleteEntities({
        collection_name: this.collectionName,
        expr: `userId == "${userId}"`,
      });

      this.logger.log(`用户 ${userId} 的向量删除成功`);
    } catch (error) {
      this.logger.error('用户向量删除失败:', error);
      throw error;
    }
  }

  async deleteLibraryVectors(libraryId: string) {
    if (!this.milvusClient) {
      throw new Error('Milvus client not initialized');
    }
    
    try {
      await this.milvusClient.deleteEntities({
        collection_name: this.collectionName,
        expr: `libraryId == "${libraryId}"`,
      });

      this.logger.log(`知识库 ${libraryId} 的向量删除成功`);
    } catch (error) {
      this.logger.error('知识库向量删除失败:', error);
      throw error;
    }
  }

  getClient(): MilvusClient {
    if (!this.milvusClient) {
      throw new Error('Milvus client not initialized');
    }
    return this.milvusClient;
  }
}
