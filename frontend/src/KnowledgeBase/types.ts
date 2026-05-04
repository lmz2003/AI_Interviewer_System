export interface KnowledgeLibrary {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  documents?: KnowledgeDocument[];
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  source?: string;
  documentType: string;
  isProcessed: boolean;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  processingError?: string;
  ownerId: string;
  libraryId?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  fileUrl?: string;
  uploadType: string;
  createdAt: string;
  updatedAt: string;
  library?: KnowledgeLibrary;
}

export interface CreateLibraryDto {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateLibraryDto {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

export interface QueryKnowledgeDto {
  query: string;
  topK?: number;
  threshold?: number;
  libraryIds?: string[];
  searchMode?: 'specific' | 'all';
}

export interface QueryResult {
  id: string;
  title: string;
  content: string;
  source?: string;
  libraryId?: string;
  score: number;
}

export interface LibraryStats {
  libraryId: string;
  libraryName: string;
  totalDocuments: number;
  processedDocuments: number;
  pendingDocuments: number;
  failedDocuments: number;
}

export interface AdvancedQueryOptions {
  useHybridSearch?: boolean;
  useQueryOptimization?: boolean;
  useReranking?: boolean;
  useHyDE?: boolean;
  topK?: number;
  threshold?: number;
  rerankTopN?: number;
  libraryIds?: string[];
}

export interface AdvancedQueryResult {
  id: string;
  title: string;
  content: string;
  source?: string;
  libraryId?: string;
  score: number;
  vectorScore?: number;
  bm25Score?: number;
  rerankScore?: number;
  queryExpansion?: {
    originalQuery: string;
    rewrittenQuery: string;
    expandedQueries: string[];
    keywords: string[];
  };
  searchStrategy: string;
}

export interface BM25Stats {
  totalDocs: number;
  avgDocLength: number;
  vocabularySize: number;
}
