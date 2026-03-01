import { MessageEvaluation, MessageSource } from '../entities/interview-message.entity';

export class InterviewResponseDto {
  id!: string;
  userId!: string;
  sceneType!: string;
  sceneName!: string;
  jobType?: string;
  jobName?: string;
  difficulty!: string;
  difficultyName!: string;
  resumeId?: string;
  totalScore?: number;
  duration?: number;
  status!: string;
  statusName!: string;
  title?: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class SessionResponseDto {
  id!: string;
  interviewId!: string;
  startedAt!: Date;
  endedAt?: Date;
  status!: string;
  questionCount!: number;
  messageCount!: number;
}

export class MessageResponseDto {
  id!: string;
  sessionId!: string;
  role!: string;
  content!: string;
  questionType?: string;
  evaluation?: MessageEvaluation;
  score?: number;
  timestamp!: Date;
  sources?: MessageSource[];
}

export class SceneDto {
  code!: string;
  name!: string;
  description!: string;
  icon!: string;
  questionCount!: { min: number; max: number };
}

export class JobTypeDto {
  code!: string;
  name!: string;
  keywords!: string[];
}

export class DifficultyLevelDto {
  code!: string;
  name!: string;
  description!: string;
}

export class ReportResponseDto {
  id!: string;
  interviewId!: string;
  overallScore!: number;
  dimensionScores!: {
    completeness: number;
    clarity: number;
    depth: number;
    expression: number;
    highlights: number;
  };
  strengths!: string;
  weaknesses!: string;
  suggestions!: string;
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
  createdAt!: Date;
}

export class StartSessionResultDto {
  sessionId!: string;
  interview!: InterviewResponseDto;
  firstMessage!: MessageResponseDto;
}

export class EndInterviewResultDto {
  interview!: InterviewResponseDto;
  reportId!: string;
}
