import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { KnowledgeLibrary } from './knowledge-library.entity';

@Entity('knowledge_documents')
export class KnowledgeDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column('text')
  content!: string;

  @Column({ nullable: true })
  source?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ nullable: true })
  vectorId?: string;

  @Column({ default: 'text' })
  documentType!: string;

  @Column({ default: false })
  isProcessed!: boolean;

  @Column({ 
    type: 'varchar', 
    length: 50, 
    default: 'uploaded',
    comment: 'uploaded=已上传待处理, processing=处理中, processed=已处理, failed=处理失败'
  })
  status!: string;

  @Column({ nullable: true })
  processingError?: string;

  @Column({ type: 'varchar', length: 100 })
  ownerId!: string;

  @Column({ type: 'uuid', nullable: true })
  libraryId?: string;

  @Column({ nullable: true })
  fileName?: string;

  @Column({ nullable: true })
  fileSize?: number;

  @Column({ nullable: true })
  fileMimeType?: string;

  @Column({ nullable: true })
  fileUrl?: string;

  @Column({ default: 'input' })
  uploadType!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => KnowledgeLibrary, (library) => library.documents, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'libraryId' })
  library?: KnowledgeLibrary;
}
