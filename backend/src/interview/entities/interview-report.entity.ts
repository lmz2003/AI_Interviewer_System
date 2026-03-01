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

export interface LearningResource {
  type: string;
  title: string;
  url: string;
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

  @Column({ type: 'text' })
  strengths!: string;

  @Column({ type: 'text' })
  weaknesses!: string;

  @Column({ type: 'text' })
  suggestions!: string;

  @Column({ type: 'jsonb', nullable: true })
  learningResources?: LearningResource[];

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @Column({ type: 'jsonb', nullable: true })
  questionAnalysis?: Array<{
    question: string;
    answer: string;
    score: number;
    feedback: string;
  }>;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToOne(() => Interview, (interview) => interview.report)
  @JoinColumn({ name: 'interviewId' })
  interview?: Interview;
}
