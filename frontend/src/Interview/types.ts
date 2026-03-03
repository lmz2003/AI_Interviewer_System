export interface Scene {
  code: string;
  name: string;
  description: string;
  icon: string;
  questionCount: {
    min: number;
    max: number;
  };
}

export interface JobType {
  code: string;
  name: string;
  keywords: string[];
}

export interface DifficultyLevel {
  code: string;
  name: string;
  description: string;
}

export interface Interview {
  id: string;
  userId: string;
  sceneType: string;
  sceneName: string;
  jobType?: string;
  jobName?: string;
  difficulty: string;
  difficultyName: string;
  resumeId?: string;
  totalScore?: number;
  duration?: number;
  status: string;
  statusName: string;
  mode: InterviewMode;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterviewSession {
  id: string;
  interviewId: string;
  startedAt: Date;
  endedAt?: Date;
  status: string;
  questionCount: number;
  messageCount: number;
  elapsedTime: number;
  lastActiveAt?: Date;
  currentQuestionIndex: number;
}

export interface MessageEvaluation {
  completeness: number;
  clarity: number;
  depth: number;
  expression: number;
  highlights: number;
  overall: number;
  suggestions: string[];
}

export interface InterviewMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  questionType?: string;
  evaluation?: MessageEvaluation;
  score?: number;
  timestamp: Date;
  sources?: Array<{
    documentId: string;
    content: string;
    score: number;
  }>;
}

export interface InterviewReport {
  id: string;
  interviewId: string;
  overallScore: number;
  dimensionScores: {
    completeness: number;
    clarity: number;
    depth: number;
    expression: number;
    highlights: number;
  };
  strengths: string;
  weaknesses: string;
  suggestions: string;
  learningResources?: Array<{
    type: string;
    title: string;
    url: string;
  }>;
  summary?: string;
  questionAnalysis?: Array<{
    question: string;
    answer: string;
    score: number;
    feedback: string;
  }>;
  createdAt: Date;
}

export interface CreateInterviewDto {
  sceneType: string;
  jobType?: string;
  difficulty?: string;
  resumeId?: string;
  mode?: InterviewMode;
  title?: string;
}

export interface StartSessionResult {
  sessionId: string;
  interview: Interview;
  firstMessage: string;
}

export interface SSEEvent {
  type: 'request-id' | 'session' | 'chunk' | 'done' | 'error';
  data: any;
}

export interface Resume {
  id: string;
  title: string;
  fileType: string;
  fileName?: string;
  createdAt: string;
  isProcessed: boolean;
  overallScore?: number;
}

// 面试形式
export type InterviewMode = 'text' | 'voice';

export interface InterviewModeOption {
  code: InterviewMode;
  name: string;
  description: string;
  icon: string;
  requirements: string[];
  available: boolean;
}

// 语音识别结果
export interface TranscriptionResult {
  text: string;
  confidence?: number;
  duration?: number;
  language?: string;
}

// TTS 音色
export interface TTSVoice {
  id: string;
  name: string;
  description: string;
  gender: string;
}

// 语音通话消息结果
export interface VoiceMessageResult {
  userText: string;
  aiText: string;
  audioBase64: string;
  audioFormat: string;
  shouldEnd: boolean;
}

// 语音通话状态
export type VoiceCallStatus = 'idle' | 'connecting' | 'recording' | 'processing' | 'playing' | 'ended' | 'error';

// 语音通话会话信息
export interface VoiceSessionInfo {
  sessionId: string;
  status: VoiceCallStatus;
  transcript: string; // 最新的用户文本
  aiResponse: string;  // 最新的AI回复文本
  isMuted: boolean;
}
