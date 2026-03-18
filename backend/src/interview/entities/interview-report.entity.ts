import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Interview } from './interview.entity';

export interface DimensionScores {
  completeness: number;
  clarity: number;
  depth: number;
  expression: number;
  highlights: number;
}

export interface VideoBehaviorScores {
  eyeContactScore: number;
  emotionStabilityScore: number;
  gazeStabilityScore: number;
  faceVisibilityScore: number;
  overallVideoScore: number;
}

export interface LearningSuggestion {
  category: 'knowledge' | 'skill' | 'technique' | 'practice' | 'mindset';
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  relatedDimension?: string;
}

@Entity('interview_reports')
export class InterviewReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  interviewId!: string;

  @Column({ type: 'float' })
  overallScore!: number;

  @Column({ type: 'jsonb' })
  dimensionScores!: DimensionScores;

  @Column({ type: 'jsonb', nullable: true })
  videoBehaviorScores?: VideoBehaviorScores;

  @Column({ type: 'text' })
  strengths!: string;

  @Column({ type: 'text' })
  weaknesses!: string;

  @Column({ type: 'text' })
  suggestions!: string;

  @Column({ type: 'text', nullable: true })
  videoBehaviorFeedback?: string;

  @Column({ type: 'jsonb', nullable: true })
  learningSuggestions?: LearningSuggestion[];

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @Column({ type: 'jsonb', nullable: true })
  questionAnalysis?: Array<{
    question: string;
    answer: string;
    score: number;
    feedback: string;
  }>;

  @Column({ nullable: true })
  knowledgeDocumentId?: string;

  @Column({ type: 'timestamp', nullable: true })
  syncedToKnowledgeAt?: Date;

  @Column({ nullable: true })
  noteId?: string;

  @Column({ type: 'timestamp', nullable: true })
  syncedToNoteAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToOne(() => Interview, (interview) => interview.report, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'interviewId' })
  interview?: Interview;
}
