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
