import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InterviewSession } from './interview-session.entity';

export interface MessageEvaluation {
  completeness: number;
  clarity: number;
  depth: number;
  expression: number;
  highlights: number;
  overall: number;
  suggestions: string[];
}

export interface MessageSource {
  documentId: string;
  content: string;
  score: number;
}

@Entity('interview_messages')
export class InterviewMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  sessionId!: string;

  @Column({ type: 'varchar', length: 20 })
  role!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  questionType?: string;

  @Column({ type: 'jsonb', nullable: true })
  evaluation?: MessageEvaluation;

  @Column({ type: 'float', nullable: true })
  score?: number;

  @Column({ type: 'timestamp' })
  timestamp!: Date;

  @Column({ type: 'jsonb', nullable: true })
  sources?: MessageSource[];

  @ManyToOne(() => InterviewSession, (session) => session.messages)
  @JoinColumn({ name: 'sessionId' })
  session?: InterviewSession;
}
