import type {
  KnowledgeLibrary,
  KnowledgeDocument,
  CreateLibraryDto,
  UpdateLibraryDto,
  QueryKnowledgeDto,
  QueryResult,
  LibraryStats,
} from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL + '/knowledge-base';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

export const libraryApi = {
  async getLibraries(): Promise<KnowledgeLibrary[]> {
    const response = await fetch(`${API_BASE}/libraries`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data : [];
  },

  async getLibrary(libraryId: string): Promise<KnowledgeLibrary | null> {
    const response = await fetch(`${API_BASE}/libraries/${libraryId}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data : null;
  },

  async createLibrary(dto: CreateLibraryDto): Promise<KnowledgeLibrary> {
    const response = await fetch(`${API_BASE}/libraries`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '创建知识库失败');
    return data.data;
  },

  async updateLibrary(libraryId: string, dto: UpdateLibraryDto): Promise<KnowledgeLibrary> {
    const response = await fetch(`${API_BASE}/libraries/${libraryId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '更新知识库失败');
    return data.data;
  },

  async deleteLibrary(libraryId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/libraries/${libraryId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '删除知识库失败');
  },

  async getLibraryStats(libraryId: string): Promise<LibraryStats | null> {
    const response = await fetch(`${API_BASE}/libraries/${libraryId}/stats`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data : null;
  },
};

export const documentApi = {
  async getDocuments(libraryId?: string): Promise<KnowledgeDocument[]> {
    const url = libraryId
      ? `${API_BASE}/documents?libraryId=${libraryId}`
      : `${API_BASE}/documents`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data : [];
  },

  async getDocument(documentId: string): Promise<KnowledgeDocument | null> {
    const response = await fetch(`${API_BASE}/documents/${documentId}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data : null;
  },

  async addDocument(dto: {
    title: string;
    content: string;
    source?: string;
    libraryId?: string;
  }): Promise<KnowledgeDocument> {
    const response = await fetch(`${API_BASE}/documents`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '添加文档失败');
    return data.data;
  },

  async uploadDocument(file: File, libraryId?: string): Promise<KnowledgeDocument> {
    const formData = new FormData();
    formData.append('file', file);
    if (libraryId) {
      formData.append('libraryId', libraryId);
    }

    const token = localStorage.getItem('token');
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/upload-document`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
    } catch (fetchError) {
      throw new Error('网络错误，可能是跨域问题或文件过大，请尝试较小的文件');
    }
    if (response.status === 403) {
      throw new Error('上传被拒绝(403)，文件可能过大或服务器暂时不可用，请尝试较小的文件');
    }
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '上传文档失败');
    return data.data;
  },

  async uploadDocuments(files: File[], libraryId?: string): Promise<KnowledgeDocument[]> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (libraryId) {
      formData.append('libraryId', libraryId);
    }

    const token = localStorage.getItem('token');
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/upload-documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
    } catch (fetchError) {
      throw new Error('网络错误，可能是跨域问题或文件过大，请尝试较小的文件');
    }
    if (response.status === 403) {
      throw new Error('上传被拒绝(403)，文件可能过大或服务器暂时不可用，请尝试较小的文件');
    }
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '上传文档失败');
    return data.data || [];
  },

  async deleteDocument(documentId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/documents/${documentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '删除文档失败');
  },

  async batchDeleteDocuments(documentIds: string[]): Promise<{ deletedCount: number; failedCount: number }> {
    const response = await fetch(`${API_BASE}/documents/batch-delete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ documentIds }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '批量删除失败');
    return data.data;
  },

  async reprocessDocument(documentId: string): Promise<KnowledgeDocument> {
    const response = await fetch(`${API_BASE}/documents/${documentId}/reprocess`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '重新处理失败');
    return data.data;
  },
};

export const queryApi = {
  async queryKnowledge(dto: QueryKnowledgeDto): Promise<QueryResult[]> {
    const response = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '查询失败');
    return data.data || [];
  },

  async ragQuery(dto: QueryKnowledgeDto): Promise<{
    query: string;
    contexts: QueryResult[];
    ragPrompt: string;
  }> {
    const response = await fetch(`${API_BASE}/rag-query`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'RAG查询失败');
    return data.data;
  },

  async advancedQuery(
    query: string,
    options?: import('./types').AdvancedQueryOptions
  ): Promise<import('./types').AdvancedQueryResult[]> {
    const response = await fetch(`${API_BASE}/advanced-query`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ query, options }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '高级检索失败');
    return data.data || [];
  },

  async rebuildBM25Index(): Promise<{ success: boolean; message: string; stats: any }> {
    const response = await fetch(`${API_BASE}/rebuild-bm25-index`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data;
  },

  async getBM25Stats(): Promise<import('./types').BM25Stats> {
    const response = await fetch(`${API_BASE}/bm25-stats`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data : { totalDocs: 0, avgDocLength: 0, vocabularySize: 0 };
  },
};

export const statsApi = {
  async getStatistics(libraryId?: string): Promise<{
    totalDocuments: number;
    processedDocuments: number;
    pendingDocuments: number;
  }> {
    const url = libraryId
      ? `${API_BASE}/statistics?libraryId=${libraryId}`
      : `${API_BASE}/statistics`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data : { totalDocuments: 0, processedDocuments: 0, pendingDocuments: 0 };
  },
};
