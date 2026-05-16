import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { KnowledgeBaseService } from './services/knowledge-base.service';
import { LibraryService } from './services/library.service';
import { KnowledgeDocument } from './entities/knowledge-document.entity';
import { KnowledgeLibrary } from './entities/knowledge-library.entity';
import { MilvusService } from './services/milvus.service';
import { LangChainService } from './services/langchain.service';
import { LLMIntegrationService } from './services/llm-integration.service';
import { FileParserService } from './services/file-parser.service';
import { DocumentUploadService } from './services/document-upload.service';
import { RetrievalOptimizationService } from './services/retrieval-optimization.service';
import { BM25IndexService } from './services/bm25-index.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([KnowledgeDocument, KnowledgeLibrary]),
    UsersModule,
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB（适配 Render 免费版代理层限制）
      },
    }),
  ],
  controllers: [KnowledgeBaseController],
  providers: [
    KnowledgeBaseService,
    LibraryService,
    MilvusService,
    LangChainService,
    LLMIntegrationService,
    FileParserService,
    DocumentUploadService,
    RetrievalOptimizationService,
    BM25IndexService,
  ],
  exports: [
    KnowledgeBaseService,
    LibraryService,
    MilvusService,
    LangChainService,
    LLMIntegrationService,
    FileParserService,
    DocumentUploadService,
    RetrievalOptimizationService,
    BM25IndexService,
  ],
})
export class KnowledgeBaseModule {}
