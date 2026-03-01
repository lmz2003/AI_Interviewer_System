import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Resume } from '../../resume-analysis/entities/resume.entity';
import { InterviewSession } from './interview-session.entity';
import { InterviewReport } from './interview-report.entity';

@Entity('interviews')
export class Interview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 50 })
  sceneType!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  jobType?: string;

  @Column({ type: 'varchar', length: 20, default: 'medium' })
  difficulty!: string;

  @Column({ type: 'uuid', nullable: true })
  resumeId?: string;

  @Column({ type: 'float', nullable: true })
  totalScore?: number;

  @Column({ type: 'integer', nullable: true })
  duration?: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  title?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => Resume, { nullable: true })
  @JoinColumn({ name: 'resumeId' })
  resume?: Resume;

  @OneToMany(() => InterviewSession, (session) => session.interview)
  sessions?: InterviewSession[];

  @OneToOne(() => InterviewReport, (report) => report.interview)
  report?: InterviewReport;
}
