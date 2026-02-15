import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ResumeAnalysis } from './resume-analysis.entity';

@Entity('resumes')
export class Resume {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string; // 简历标题

  @Column('text')
  content!: string; // 原始内容

  @Column({ nullable: true })
  fileName?: string; // 原始文件名

  @Column({ nullable: true })
  fileSize?: number; // 文件大小

  @Column({ default: 'pdf' })
  fileType!: string; // 文件类型: pdf, docx, doc, txt

  @Column({ type: 'bytea', nullable: true })
  fileBinary?: Buffer; // 原始文件二进制数据

  @Column({ type: 'jsonb', nullable: true })
  parsedData?: {
    personalInfo?: {
      name?: string;
      phone?: string;
      email?: string;
      location?: string;
      portfolio?: string;
    };
    professionalSummary?: string;
    workExperience?: Array<{
      company: string;
      position: string;
      startDate: string;
      endDate: string;
      description: string;
    }>;
    education?: Array<{
      school: string;
      degree: string;
      field: string;
      graduationDate: string;
    }>;
    skills?: string[];
    projects?: Array<{
      name: string;
      description: string;
      technologies: string[];
      link?: string;
    }>;
    certifications?: Array<{
      name: string;
      issuer: string;
      date: string;
    }>;
    languages?: Array<{
      language: string;
      proficiency: string;
    }>;
    [key: string]: any;
  }; // 解析出的结构化数据

  @Column({ type: 'varchar', length: 100 })
  ownerId!: string; // 用户ID

  @Column({ default: false })
  isProcessed!: boolean; // 是否已处理

  @Column({ default: 'active' })
  status!: string; // active, archived, deleted

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => ResumeAnalysis, (analysis) => analysis.resume, {
    cascade: true,
    eager: false,
  })
  analyses?: ResumeAnalysis[];
}
