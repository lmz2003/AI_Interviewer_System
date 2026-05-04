import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeDocument } from '../entities/knowledge-document.entity';

interface BM25Document {
  id: string;
  title: string;
  content: string;
  source?: string;
  libraryId?: string;
  tokens: string[];
  docLength: number;
}

@Injectable()
export class BM25IndexService implements OnModuleInit {
  private readonly logger = new Logger(BM25IndexService.name);
  private documents: Map<string, BM25Document> = new Map();
  private documentFrequency: Map<string, number> = new Map();
  private avgDocLength: number = 0;
  private totalDocs: number = 0;
  
  private readonly k1 = 1.5;
  private readonly b = 0.75;

  constructor(
    @InjectRepository(KnowledgeDocument)
    private documentRepository: Repository<KnowledgeDocument>,
  ) {}

  async onModuleInit() {
    this.logger.log('初始化 BM25 索引...');
    await this.rebuildIndex();
  }

  async rebuildIndex(): Promise<void> {
    this.logger.log('重建 BM25 索引...');
    
    const documents = await this.documentRepository.find({
      where: { status: 'processed' },
    });

    this.documents.clear();
    this.documentFrequency.clear();
    this.totalDocs = 0;
    let totalLength = 0;

    for (const doc of documents) {
      const tokens = this.tokenize(doc.content || '');
      const docLength = tokens.length;

      const bm25Doc: BM25Document = {
        id: doc.id,
        title: doc.title,
        content: doc.content || '',
        source: doc.source,
        libraryId: doc.libraryId,
        tokens,
        docLength,
      };

      this.documents.set(doc.id, bm25Doc);
      totalLength += docLength;
      this.totalDocs++;

      const uniqueTokens = new Set(tokens);
      for (const token of uniqueTokens) {
        this.documentFrequency.set(token, (this.documentFrequency.get(token) || 0) + 1);
      }
    }

    this.avgDocLength = this.totalDocs > 0 ? totalLength / this.totalDocs : 0;
    this.logger.log(`BM25 索引重建完成: ${this.totalDocs} 个文档, 平均长度: ${this.avgDocLength.toFixed(2)}`);
  }

  addDocument(doc: KnowledgeDocument): void {
    if (!doc.content || doc.status !== 'processed') {
      return;
    }

    const tokens = this.tokenize(doc.content);
    const docLength = tokens.length;

    const bm25Doc: BM25Document = {
      id: doc.id,
      title: doc.title,
      content: doc.content,
      source: doc.source,
      libraryId: doc.libraryId,
      tokens,
      docLength,
    };

    const existingDoc = this.documents.get(doc.id);
    if (existingDoc) {
      const oldUniqueTokens = new Set(existingDoc.tokens);
      for (const token of oldUniqueTokens) {
        const freq = this.documentFrequency.get(token) || 0;
        if (freq > 1) {
          this.documentFrequency.set(token, freq - 1);
        } else {
          this.documentFrequency.delete(token);
        }
      }
      this.totalDocs--;
    }

    this.documents.set(doc.id, bm25Doc);
    this.totalDocs++;

    const uniqueTokens = new Set(tokens);
    for (const token of uniqueTokens) {
      this.documentFrequency.set(token, (this.documentFrequency.get(token) || 0) + 1);
    }

    this.updateAvgDocLength();
    this.logger.log(`BM25 索引添加文档: ${doc.id}`);
  }

  removeDocument(docId: string): void {
    const doc = this.documents.get(docId);
    if (!doc) return;

    const uniqueTokens = new Set(doc.tokens);
    for (const token of uniqueTokens) {
      const freq = this.documentFrequency.get(token) || 0;
      if (freq > 1) {
        this.documentFrequency.set(token, freq - 1);
      } else {
        this.documentFrequency.delete(token);
      }
    }

    this.documents.delete(docId);
    this.totalDocs--;
    this.updateAvgDocLength();
    this.logger.log(`BM25 索引移除文档: ${docId}`);
  }

  private updateAvgDocLength(): void {
    if (this.totalDocs === 0) {
      this.avgDocLength = 0;
      return;
    }

    let totalLength = 0;
    for (const doc of this.documents.values()) {
      totalLength += doc.docLength;
    }
    this.avgDocLength = totalLength / this.totalDocs;
  }

  search(
    query: string,
    options: {
      topK?: number;
      threshold?: number;
      libraryIds?: string[];
    } = {}
  ): Array<{ id: string; title: string; content: string; source?: string; libraryId?: string; score: number }> {
    const { topK = 10, threshold = 0, libraryIds } = options;
    const queryTokens = this.tokenize(query);

    if (queryTokens.length === 0) {
      return [];
    }

    const scores: Array<{ doc: BM25Document; score: number }> = [];

    for (const doc of this.documents.values()) {
      if (libraryIds && libraryIds.length > 0) {
        if (!doc.libraryId || !libraryIds.includes(doc.libraryId)) {
          continue;
        }
      }

      const score = this.calculateBM25Score(queryTokens, doc);
      if (score > threshold) {
        scores.push({ doc, score });
      }
    }

    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, topK).map(({ doc, score }) => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      source: doc.source,
      libraryId: doc.libraryId,
      score,
    }));
  }

  private calculateBM25Score(queryTokens: string[], doc: BM25Document): number {
    let score = 0;

    const docTermFreq = new Map<string, number>();
    for (const token of doc.tokens) {
      docTermFreq.set(token, (docTermFreq.get(token) || 0) + 1);
    }

    for (const term of queryTokens) {
      const tf = docTermFreq.get(term) || 0;
      if (tf === 0) continue;

      const df = this.documentFrequency.get(term) || 0;
      if (df === 0) continue;

      const idf = Math.log(1 + (this.totalDocs - df + 0.5) / (df + 0.5));

      const numerator = tf * (this.k1 + 1);
      const denominator = tf + this.k1 * (1 - this.b + this.b * (doc.docLength / this.avgDocLength));

      score += idf * (numerator / denominator);
    }

    return score;
  }

  private tokenize(text: string): string[] {
    const stopWords = new Set([
      '的', '了', '是', '在', '有', '和', '与', '或', '等', '这', '那', '我', '你', '他',
      '她', '它', '们', '什么', '怎么', '如何', '为什么', '哪', '谁', '多少', '几',
      '一个', '一些', '这种', '那种', '这个', '那个', '可以', '可能', '应该', '需要',
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'can', 'may', 'might', 'must', 'shall', 'to', 'of', 'in', 'for', 'on', 'with',
      'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after',
      'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once',
    ]);

    const tokens: string[] = [];
    
    const chineseTokens = text.match(/[\u4e00-\u9fa5]+/g) || [];
    for (const token of chineseTokens) {
      for (let i = 0; i < token.length - 1; i++) {
        const bigram = token.substring(i, i + 2);
        if (!stopWords.has(bigram)) {
          tokens.push(bigram);
        }
      }
      if (token.length >= 2 && !stopWords.has(token)) {
        tokens.push(token);
      }
    }

    const englishTokens = text
      .toLowerCase()
      .match(/[a-z]+/g) || [];
    for (const token of englishTokens) {
      if (token.length > 1 && !stopWords.has(token)) {
        tokens.push(token);
      }
    }

    const numbers = text.match(/\d+/g) || [];
    tokens.push(...numbers);

    return tokens;
  }

  getStats(): { totalDocs: number; avgDocLength: number; vocabularySize: number } {
    return {
      totalDocs: this.totalDocs,
      avgDocLength: this.avgDocLength,
      vocabularySize: this.documentFrequency.size,
    };
  }
}
