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
  Resume,
  TranscriptionResult,
  TTSVoice,
  VoiceMessageResult,
  VideoMessageResult,
  VideoAnalysisSummary,
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

  async getResumes(): Promise<Resume[]> {
    const response = await fetch(`${API_BASE}/resume-analysis`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    // 兼容两种返回格式: { success: true, data } 或 { code: 0, data }
    if (data.code !== undefined && data.code !== 0) {
      throw new Error(data.message || '获取简历列表失败');
    }
    if (data.success !== undefined && !data.success) {
      throw new Error(data.message || '获取简历列表失败');
    }
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

  async saveProgress(
    sessionId: string,
    progress: { elapsedTime: number; currentQuestionIndex?: number },
  ): Promise<void> {
    const response = await fetch(`${API_BASE}/interview/session/${sessionId}/save-progress`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(progress),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '保存进度失败');
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

  async syncReportToKnowledge(reportId: string): Promise<{ success: boolean; message: string; documentId?: string }> {
    const response = await fetch(`${API_BASE}/interview/report/${reportId}/sync-to-knowledge`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data;
  },

  async syncReportToNotes(reportId: string): Promise<{ success: boolean; message: string; noteId?: string }> {
    const response = await fetch(`${API_BASE}/interview/report/${reportId}/sync-to-notes`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data;
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

  // =================== 语音相关 API ===================

  /**
   * 语音转文字（上传音频 Blob 文件）
   */
  async speechToText(
    audioBlob: Blob,
    language: string = 'zh',
  ): Promise<TranscriptionResult> {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');
    formData.append('language', language);

    const response = await fetch(`${API_BASE}/interview/speech-to-text`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || '语音识别失败');
    return data.data;
  },

  /**
   * 获取 TTS 可用音色列表
   */
  async getTTSVoices(): Promise<TTSVoice[]> {
    const response = await fetch(`${API_BASE}/interview/tts-voices`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || '获取音色列表失败');
    return data.data;
  },

  /**
   * 文字转语音，返回音频 Blob
   */
  async textToSpeech(
    text: string,
    voice: string = 'anna',
    speed: number = 1.0,
  ): Promise<Blob> {
    const response = await fetch(`${API_BASE}/interview/text-to-speech`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ text, voice, speed }),
    });

    if (!response.ok) {
      throw new Error('语音合成失败');
    }

    return response.blob();
  },

  /**
   * 语音通话：发送语音消息，返回AI语音回复（已废弃，请使用 sendVoiceMessageStream）
   * @deprecated 使用 sendVoiceMessageStream 替代
   */
  async sendVoiceMessage(
    sessionId: string,
    audioBase64: string,
    options: {
      mimeType?: string;
      language?: string;
      voice?: string;
    } = {},
  ): Promise<VoiceMessageResult> {
    const { mimeType = 'audio/webm', language = 'zh', voice = 'anna' } = options;

    const response = await fetch(`${API_BASE}/interview/voice-session/${sessionId}/message`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        audio: audioBase64,
        mimeType,
        language,
        voice,
      }),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || '语音通话处理失败');
    return data.data;
  },

  /**
   * 语音通话：流式发送语音消息
   * 返回 SSE 流，事件类型：
   * - transcription: 语音识别结果（可立即展示）
   * - correction: ASR 纠错结果（如果有纠正）
   * - chunk: AI 回复文本片段
   * - done: 完成，包含音频数据
   * - error: 错误
   */
  sendVoiceMessageStream(
    sessionId: string,
    audioBase64: string,
    onEvent: (event: { type: string; data: any }) => void,
    onError: (error: Error) => void,
    options: {
      mimeType?: string;
      language?: string;
      voice?: string;
    } = {},
  ): { abort: () => void } {
    const { mimeType = 'audio/webm', language = 'zh', voice = 'anna' } = options;
    const abortController = new AbortController();

    (async () => {
      try {
        const response = await fetch(`${API_BASE}/interview/voice-session/${sessionId}/message`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            audio: audioBase64,
            mimeType,
            language,
            voice,
          }),
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
              const event = JSON.parse(jsonStr);
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

  // =================== 视频相关 API ===================

  /**
   * 分析视频帧
   */
  async analyzeVideoFrame(
    imageBase64: string,
    timestamp: number,
  ): Promise<VideoMessageResult['videoAnalysis']> {
    const response = await fetch(`${API_BASE}/interview/video/analyze-frame`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        image: imageBase64,
        timestamp,
      }),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || '视频帧分析失败');
    return data.data;
  },

  /**
   * 生成视频分析总结
   */
  async generateVideoSummary(analyses: any[]): Promise<VideoAnalysisSummary> {
    const response = await fetch(`${API_BASE}/interview/video/generate-summary`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ analyses }),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || '生成视频分析总结失败');
    return data.data;
  },

  /**
   * 视频通话：发送视频和语音消息，返回AI语音回复（已废弃，请使用 sendVideoMessageStream）
   * @deprecated 使用 sendVideoMessageStream 替代
   */
  async sendVideoMessage(
    sessionId: string,
    audioBase64: string,
    options: {
      audioMimeType?: string;
      videoFrame?: string;
      videoFrames?: string[];
      voice?: string;
    } = {},
  ): Promise<VideoMessageResult> {
    const { audioMimeType = 'audio/webm', videoFrame, videoFrames, voice = 'anna' } = options;

    const response = await fetch(`${API_BASE}/interview/video-session/${sessionId}/message`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        audio: audioBase64,
        audioMimeType,
        videoFrame,
        videoFrames,
        voice,
      }),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || '视频通话处理失败');
    return data.data;
  },

  /**
   * 视频通话：流式发送视频和语音消息
   * 返回 SSE 流，事件类型：
   * - transcription: 语音识别结果（可立即展示）
   * - correction: ASR 纠错结果（如果有纠正）
   * - chunk: AI 回复文本片段
   * - done: 完成，包含音频数据和视频分析结果
   * - error: 错误
   */
  sendVideoMessageStream(
    sessionId: string,
    audioBase64: string,
    onEvent: (event: { type: string; data: any }) => void,
    onError: (error: Error) => void,
    options: {
      audioMimeType?: string;
      videoFrame?: string;
      videoFrames?: string[];
      voice?: string;
    } = {},
  ): { abort: () => void } {
    const { audioMimeType = 'audio/webm', videoFrame, videoFrames, voice = 'anna' } = options;
    const abortController = new AbortController();

    (async () => {
      try {
        const response = await fetch(`${API_BASE}/interview/video-session/${sessionId}/message`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            audio: audioBase64,
            audioMimeType,
            videoFrame,
            videoFrames,
            voice,
          }),
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
              const event = JSON.parse(jsonStr);
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
