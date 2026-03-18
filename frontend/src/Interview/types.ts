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

export interface VideoBehaviorScores {
  /** 眼神接触评分 0-100 */
  eyeContactScore: number;
  /** 情绪稳定性评分 0-100 */
  emotionStabilityScore: number;
  /** 视线稳定性评分 0-100 */
  gazeStabilityScore: number;
  /** 人脸可见度评分 0-100 */
  faceVisibilityScore: number;
  /** 视频行为综合评分 0-100 */
  overallVideoScore: number;
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
  videoBehaviorScores?: VideoBehaviorScores;
  strengths: string;
  weaknesses: string;
  suggestions: string;
  videoBehaviorFeedback?: string;
  learningResources?: Array<{
    type: string;
    title: string;
    url: string;
    /** LLM 生成的个性化推荐理由 */
    reason?: string;
  }>;
  summary?: string;
  questionAnalysis?: Array<{
    question: string;
    answer: string;
    score: number;
    feedback: string;
  }>;
  knowledgeDocumentId?: string;
  syncedToKnowledgeAt?: string;
  noteId?: string;
  syncedToNoteAt?: string;
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
  type: 'request-id' | 'session' | 'chunk' | 'done' | 'error' | 'history';
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
export type InterviewMode = 'text' | 'voice' | 'video';

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
  transcript: string;
  isMuted: boolean;
}

// 视频帧分析结果
export interface VideoFrameAnalysis {
  timestamp: number;
  emotions: {
    neutral: number;
    happy: number;
    sad: number;
    angry: number;
    fearful: number;
    disgusted: number;
    surprised: number;
  };
  gazeDirection: 'center' | 'left' | 'right' | 'up' | 'down';
  eyeContact: boolean;
  faceDetected: boolean;
  confidence: number;
}

// 视频分析总结
export interface VideoAnalysisSummary {
  totalFrames: number;
  averageEmotions: Record<string, number>;
  dominantEmotion: string;
  eyeContactRatio: number;
  gazeDistribution: Record<string, number>;
  faceDetectionRatio: number;
  overallScore: number;
  feedback: string[];
}

// 视频通话消息结果中的视频分析（单帧或多帧摘要均兼容）
export interface VideoAnalysisInMessage extends Partial<VideoFrameAnalysis> {
  /** 多帧分析时的摘要，含主导情绪等聚合数据 */
  summary?: VideoAnalysisSummary;
  /** 单帧分析时直接挂在顶层，多帧时可在 summary 中取 */
  dominantEmotion?: string;
  frames?: VideoFrameAnalysis[];
}

// 视频通话消息结果
export interface VideoMessageResult {
  userText: string;
  aiText: string;
  audioBase64: string;
  audioFormat: string;
  shouldEnd: boolean;
  videoAnalysis?: VideoAnalysisInMessage;
}

// 视频通话状态
export type VideoCallStatus = 'idle' | 'connecting' | 'recording' | 'processing' | 'playing' | 'ended' | 'error';

// 视频通话会话信息
export interface VideoSessionInfo {
  sessionId: string;
  status: VideoCallStatus;
  transcript: string;
  isMuted: boolean;
  isCameraOff: boolean;
}
