import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from '../notes/entities/note.entity';
import { Interview } from '../interview/entities/interview.entity';
import { Resume } from '../resume-analysis/entities/resume.entity';
import { ResumeAnalysis } from '../resume-analysis/entities/resume-analysis.entity';
import { KnowledgeDocument } from '../knowledge-base/entities/knowledge-document.entity';

export interface DashboardStats {
  notesCount: number;
  interviewCount: number;
  knowledgeDocCount: number;
  resumeScore: number | null;
  resumeScoreLabel: string;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(Note)
    private noteRepository: Repository<Note>,
    @InjectRepository(Interview)
    private interviewRepository: Repository<Interview>,
    @InjectRepository(Resume)
    private resumeRepository: Repository<Resume>,
    @InjectRepository(ResumeAnalysis)
    private resumeAnalysisRepository: Repository<ResumeAnalysis>,
    @InjectRepository(KnowledgeDocument)
    private knowledgeDocumentRepository: Repository<KnowledgeDocument>,
  ) {}

  async getDashboardStats(userId: string): Promise<DashboardStats> {
    // 并行查询所有统计数据
    const [
      notesCount,
      interviewCount,
      knowledgeDocCount,
      latestResumeAnalysis,
    ] = await Promise.all([
      // 笔记数量（未删除的）
      this.noteRepository.count({
        where: { owner: { id: userId }, deleted: false },
      }),
      // 面试次数
      this.interviewRepository.count({
        where: { userId },
      }),
      // 知识库文档数量
      this.knowledgeDocumentRepository.count({
        where: { ownerId: userId },
      }),
      // 最新一份已分析简历的评分
      this.resumeAnalysisRepository
        .createQueryBuilder('analysis')
        .innerJoin('analysis.resume', 'resume')
        .where('resume.ownerId = :userId', { userId })
        .andWhere('resume.isProcessed = true')
        .orderBy('analysis.createdAt', 'DESC')
        .limit(1)
        .getOne(),
    ]);

    // 计算简历评分
    let resumeScore: number | null = null;
    if (latestResumeAnalysis) {
      resumeScore = Math.round(latestResumeAnalysis.overallScore);
    }

    const resumeScoreLabel = this.getScoreLabel(resumeScore);

    return {
      notesCount,
      interviewCount,
      knowledgeDocCount,
      resumeScore,
      resumeScoreLabel,
    };
  }

  private getScoreLabel(score: number | null): string {
    if (score === null) return '暂无';
    if (score >= 85) return '优秀';
    if (score >= 70) return '良好';
    if (score >= 60) return '及格';
    return '待提升';
  }
}
