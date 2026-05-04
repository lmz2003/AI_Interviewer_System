import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';

export interface ChunkMetadata {
  chunkIndex: number;
  title: string;
  source?: string;
  libraryId?: string;
  chunkType: 'semantic' | 'sentence' | 'paragraph';
  startPosition: number;
  endPosition: number;
  parentContext?: string;
}

export interface ProcessedChunk {
  chunk: string;
  embedding: number[];
  metadata: ChunkMetadata;
}

export interface QueryExpansion {
  originalQuery: string;
  expandedQueries: string[];
  rewrittenQuery: string;
  keywords: string[];
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  source?: string;
  libraryId?: string;
  score: number;
  vectorScore?: number;
  bm25Score?: number;
  rerankScore?: number;
}

@Injectable()
export class RetrievalOptimizationService {
  private readonly logger = new Logger(RetrievalOptimizationService.name);
  private llm: ChatOpenAI | null = null;

  constructor(private configService: ConfigService) {
    this.initializeLLM();
  }

  private initializeLLM() {
    const apiKey = this.configService.get<string>('LLM_API_KEY');
    const baseUrl = this.configService.get<string>('LLM_BASE_URL');
    const model = this.configService.get<string>('LLM_MODEL') || 'Qwen/Qwen2.5-7B-Instruct';

    if (apiKey) {
      this.llm = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: model,
        configuration: {
          baseURL: baseUrl || 'https://api.siliconflow.cn/v1',
        },
        temperature: 0.3,
      });
      this.logger.log(`LLM 初始化成功: ${model}`);
    } else {
      this.logger.warn('LLM API Key 未配置，查询优化功能将被禁用');
    }
  }

  async semanticChunking(
    content: string,
    title: string,
    metadata?: Record<string, any>
  ): Promise<ProcessedChunk[]> {
    const chunks: ProcessedChunk[] = [];
    
    const paragraphs = this.splitByParagraphs(content);
    
    let currentPosition = 0;
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      if (!trimmedParagraph) {
        currentPosition += paragraph.length + 1;
        continue;
      }

      const paragraphStart = content.indexOf(trimmedParagraph, currentPosition);
      
      if (trimmedParagraph.length > 1500) {
        const subChunks = await this.splitLargeParagraph(trimmedParagraph, title, chunkIndex, paragraphStart);
        for (const subChunk of subChunks) {
          chunks.push({
            ...subChunk,
            metadata: {
              ...subChunk.metadata,
              source: metadata?.source,
              libraryId: metadata?.libraryId,
            },
          });
          chunkIndex++;
        }
      } else {
        const context = this.getSurroundingContext(paragraphs, paragraphs.indexOf(paragraph));
        
        chunks.push({
          chunk: trimmedParagraph,
          embedding: [],
          metadata: {
            chunkIndex,
            title,
            source: metadata?.source,
            libraryId: metadata?.libraryId,
            chunkType: 'paragraph',
            startPosition: paragraphStart,
            endPosition: paragraphStart + trimmedParagraph.length,
            parentContext: context,
          },
        });
        chunkIndex++;
      }

      currentPosition = paragraphStart + trimmedParagraph.length + 1;
    }

    this.logger.log(`语义分块完成: ${content.length} 字符 -> ${chunks.length} 个块`);
    return chunks;
  }

  private splitByParagraphs(content: string): string[] {
    const separators = [
      /\n\n\n+/,
      /\n\n/,
      /\n(?=[一二三四五六七八九十\d]+[、.．])/,
      /\n(?=第[一二三四五六七八九十\d]+[章节条款])/,
    ];

    let paragraphs = [content];
    
    for (const separator of separators) {
      const newParagraphs: string[] = [];
      for (const p of paragraphs) {
        newParagraphs.push(...p.split(separator));
      }
      paragraphs = newParagraphs;
    }

    return paragraphs.filter(p => p.trim().length > 0);
  }

  private async splitLargeParagraph(
    paragraph: string,
    title: string,
    startIndex: number,
    basePosition: number
  ): Promise<ProcessedChunk[]> {
    const chunks: ProcessedChunk[] = [];
    
    const sentenceSeparators = /([。！？；;.!?]|\n)/g;
    const parts = paragraph.split(sentenceSeparators);
    
    const sentences: string[] = [];
    let currentSentence = '';
    
    for (let i = 0; i < parts.length; i++) {
      currentSentence += parts[i];
      if (sentenceSeparators.test(parts[i]) || i === parts.length - 1) {
        if (currentSentence.trim()) {
          sentences.push(currentSentence.trim());
        }
        currentSentence = '';
      }
    }

    const targetChunkSize = 800;
    const overlapSize = 100;
    
    let currentChunk = '';
    let chunkStart = 0;
    let localIndex = 0;

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > targetChunkSize && currentChunk.length > 0) {
        const chunkPosition = basePosition + paragraph.indexOf(currentChunk.trim());
        
        chunks.push({
          chunk: currentChunk.trim(),
          embedding: [],
          metadata: {
            chunkIndex: startIndex + localIndex,
            title,
            chunkType: 'sentence',
            startPosition: chunkPosition,
            endPosition: chunkPosition + currentChunk.trim().length,
          },
        });
        
        localIndex++;
        
        const overlapText = currentChunk.slice(-overlapSize);
        currentChunk = overlapText + sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk.trim()) {
      const chunkPosition = basePosition + paragraph.indexOf(currentChunk.trim());
      
      chunks.push({
        chunk: currentChunk.trim(),
        embedding: [],
        metadata: {
          chunkIndex: startIndex + localIndex,
          title,
          chunkType: 'sentence',
          startPosition: chunkPosition,
          endPosition: chunkPosition + currentChunk.trim().length,
        },
      });
    }

    return chunks;
  }

  private getSurroundingContext(paragraphs: string[], currentIndex: number): string {
    const contextRange = 1;
    const start = Math.max(0, currentIndex - contextRange);
    const end = Math.min(paragraphs.length, currentIndex + contextRange + 1);
    
    return paragraphs.slice(start, end).join('\n\n');
  }

  async optimizeQuery(query: string): Promise<QueryExpansion> {
    if (!this.llm) {
      this.logger.warn('LLM 未初始化，返回原始查询');
      return {
        originalQuery: query,
        expandedQueries: [],
        rewrittenQuery: query,
        keywords: this.extractKeywords(query),
      };
    }

    try {
      const prompt = `你是一个查询优化专家。请分析以下用户查询，并提供优化后的查询。

原始查询: ${query}

请以JSON格式返回以下内容：
{
  "rewrittenQuery": "改写后的查询，使其更清晰、更适合检索",
  "expandedQueries": ["扩展查询1", "扩展查询2", "扩展查询3"],
  "keywords": ["关键词1", "关键词2", "关键词3"]
}

要求：
1. rewrittenQuery: 保持原意，但更精确、更适合向量检索
2. expandedQueries: 生成3个相关但不同角度的查询，增加召回率
3. keywords: 提取3-5个最重要的关键词

只返回JSON，不要其他内容。`;

      const response = await this.llm.invoke(prompt);
      const content = response.content.toString();
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法解析LLM响应');
      }

      const result = JSON.parse(jsonMatch[0]);
      
      this.logger.log(`查询优化完成: "${query}" -> ${result.expandedQueries.length} 个扩展查询`);
      
      return {
        originalQuery: query,
        expandedQueries: result.expandedQueries || [],
        rewrittenQuery: result.rewrittenQuery || query,
        keywords: result.keywords || this.extractKeywords(query),
      };
    } catch (error) {
      this.logger.error(`查询优化失败: ${error}`);
      return {
        originalQuery: query,
        expandedQueries: [],
        rewrittenQuery: query,
        keywords: this.extractKeywords(query),
      };
    }
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      '的', '了', '是', '在', '有', '和', '与', '或', '等', '这', '那', '我', '你', '他',
      '她', '它', '们', '什么', '怎么', '如何', '为什么', '哪', '谁', '多少', '几',
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    ]);

    const words = text
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1 && !stopWords.has(word.toLowerCase()));

    const wordFreq = new Map<string, number>();
    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  calculateBM25Score(
    query: string,
    document: string,
    avgDocLength: number,
    docLength: number,
    k1: number = 1.5,
    b: number = 0.75
  ): number {
    const queryTerms = this.tokenize(query);
    const docTerms = this.tokenize(document);
    
    const docTermFreq = new Map<string, number>();
    for (const term of docTerms) {
      docTermFreq.set(term, (docTermFreq.get(term) || 0) + 1);
    }

    const N = 1;
    let score = 0;

    for (const term of queryTerms) {
      const tf = docTermFreq.get(term) || 0;
      if (tf === 0) continue;

      const idf = Math.log((N + 0.5) / 0.5);
      
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength));
      
      score += idf * (numerator / denominator);
    }

    return score;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  fuseSearchResults(
    vectorResults: SearchResult[],
    bm25Results: SearchResult[],
    k: number = 60
  ): SearchResult[] {
    const allResults = new Map<string, SearchResult>();
    const vectorRanks = new Map<string, number>();
    const bm25Ranks = new Map<string, number>();

    vectorResults.forEach((result, index) => {
      allResults.set(result.id, { ...result, vectorScore: result.score });
      vectorRanks.set(result.id, index + 1);
    });

    bm25Results.forEach((result, index) => {
      if (allResults.has(result.id)) {
        const existing = allResults.get(result.id)!;
        allResults.set(result.id, { 
          ...existing, 
          bm25Score: result.score,
          vectorScore: existing.vectorScore 
        });
      } else {
        allResults.set(result.id, { ...result, bm25Score: result.score });
      }
      bm25Ranks.set(result.id, index + 1);
    });

    const fusedResults: SearchResult[] = [];

    for (const [id, result] of allResults) {
      const vectorRank = vectorRanks.get(id) || vectorResults.length + 1;
      const bm25Rank = bm25Ranks.get(id) || bm25Results.length + 1;

      const rrfScore = 1 / (k + vectorRank) + 1 / (k + bm25Rank);
      
      fusedResults.push({
        ...result,
        score: rrfScore,
      });
    }

    fusedResults.sort((a, b) => b.score - a.score);

    this.logger.log(`RRF融合完成: ${vectorResults.length} 向量结果 + ${bm25Results.length} BM25结果 -> ${fusedResults.length} 融合结果`);

    return fusedResults;
  }

  async rerankResults(
    query: string,
    results: SearchResult[],
    topN: number = 5
  ): Promise<SearchResult[]> {
    if (!this.llm || results.length === 0) {
      return results.slice(0, topN);
    }

    try {
      const candidates = results.slice(0, Math.min(20, results.length));
      
      const prompt = `你是一个相关性评分专家。请评估以下文档片段与查询的相关性。

查询: ${query}

文档片段:
${candidates.map((r, i) => `[${i}] ${r.title}\n${r.content.substring(0, 300)}...`).join('\n\n')}

请返回一个JSON数组，包含每个文档的相关性分数(0-1):
[0.95, 0.82, 0.45, ...]

只返回JSON数组，不要其他内容。`;

      const response = await this.llm.invoke(prompt);
      const content = response.content.toString();
      
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) {
        this.logger.warn('无法解析重排序响应，使用原始排序');
        return results.slice(0, topN);
      }

      const scores = JSON.parse(jsonMatch[0]);
      
      const rerankedResults = candidates.map((result, index) => ({
        ...result,
        rerankScore: scores[index] || 0.5,
        score: scores[index] || result.score,
      }));

      rerankedResults.sort((a, b) => (b.rerankScore || 0) - (a.rerankScore || 0));

      this.logger.log(`重排序完成: ${candidates.length} 个候选 -> Top ${topN}`);

      return rerankedResults.slice(0, topN);
    } catch (error) {
      this.logger.error(`重排序失败: ${error}`);
      return results.slice(0, topN);
    }
  }

  async generateHypotheticalAnswer(query: string): Promise<string> {
    if (!this.llm) {
      return query;
    }

    try {
      const prompt = `请针对以下问题生成一个假设性的答案（不需要完全正确，但要相关）：

问题: ${query}

只返回答案内容，不要其他说明。`;

      const response = await this.llm.invoke(prompt);
      return response.content.toString();
    } catch (error) {
      this.logger.error(`生成假设答案失败: ${error}`);
      return query;
    }
  }
}
