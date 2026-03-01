import type {
  Scene,
  JobType,
  DifficultyLevel,
  Interview,
  InterviewSession,
  InterviewMessage,
  InterviewReport,
  CreateInterviewDto,
  SSEEvent,
} from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const interviewApi = {
  async getScenes(): Promise<Scene[]> {
    const response = await fetch(`${API_BASE}/interview/scenes`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '获取场景列表失败');
    return data.data;
  },

  async getJobTypes(): Promise<JobType[]> {
    const response = await fetch(`${API_BASE}/interview/job-types`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '获取岗位类型失败');
    return data.data;
  },

  async getDifficultyLevels(): Promise<DifficultyLevel[]> {
    const response = await fetch(`${API_BASE}/interview/difficulty-levels`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '获取难度等级失败');
    return data.data;
  },

  async createInterview(dto: CreateInterviewDto): Promise<Interview> {
    const response = await fetch(`${API_BASE}/interview/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '创建面试失败');
    return data.data;
  },

  async getInterviewList(status?: string): Promise<Interview[]> {
    const url = status
      ? `${API_BASE}/interview/list?status=${status}`
      : `${API_BASE}/interview/list`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '获取面试列表失败');
    return data.data;
  },

  async getInterview(interviewId: string): Promise<{
    interview: Interview;
    sessions: InterviewSession[];
  }> {
    const response = await fetch(`${API_BASE}/interview/${interviewId}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '获取面试详情失败');
    return data.data;
  },

  async deleteInterview(interviewId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/interview/${interviewId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '删除面试失败');
  },

  async getSessionMessages(sessionId: string): Promise<InterviewMessage[]> {
    const response = await fetch(
      `${API_BASE}/interview/session/${sessionId}/messages`,
      {
        headers: getAuthHeaders(),
      },
    );
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '获取消息历史失败');
    return data.data;
  },

  async endInterview(sessionId: string): Promise<{
    interview: Interview;
    reportId: string;
  }> {
    const response = await fetch(`${API_BASE}/interview/session/${sessionId}/end`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '结束面试失败');
    return data.data;
  },

  async getReport(reportId: string): Promise<InterviewReport> {
    const response = await fetch(`${API_BASE}/interview/report/${reportId}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '获取报告失败');
    return data.data;
  },

  async getInterviewReport(interviewId: string): Promise<InterviewReport> {
    const response = await fetch(`${API_BASE}/interview/${interviewId}/report`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '获取面试报告失败');
    return data.data;
  },

  startInterviewStream(
    interviewId: string,
    onEvent: (event: SSEEvent) => void,
    onError: (error: Error) => void,
  ): { abort: () => void } {
    const abortController = new AbortController();

    (async () => {
      try {
        const response = await fetch(`${API_BASE}/interview/${interviewId}/start`, {
          method: 'POST',
          headers: getAuthHeaders(),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('无法读取响应流');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines[lines.length - 1];

          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim();
            if (!line || !line.startsWith('data: ')) continue;

            try {
              const jsonStr = line.substring(6);
              const event = JSON.parse(jsonStr) as SSEEvent;
              onEvent(event);
            } catch (e) {
              console.error('解析事件失败:', e);
            }
          }
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          onError(error as Error);
        }
      }
    })();

    return {
      abort: () => abortController.abort(),
    };
  },

  sendMessageStream(
    sessionId: string,
    message: string,
    onEvent: (event: SSEEvent) => void,
    onError: (error: Error) => void,
  ): { abort: () => void } {
    const abortController = new AbortController();

    (async () => {
      try {
        const response = await fetch(
          `${API_BASE}/interview/session/${sessionId}/message`,
          {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ message, sessionId }),
            signal: abortController.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('无法读取响应流');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines[lines.length - 1];

          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim();
            if (!line || !line.startsWith('data: ')) continue;

            try {
              const jsonStr = line.substring(6);
              const event = JSON.parse(jsonStr) as SSEEvent;
              onEvent(event);
            } catch (e) {
              console.error('解析事件失败:', e);
            }
          }
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          onError(error as Error);
        }
      }
    })();

    return {
      abort: () => abortController.abort(),
    };
  },
};
