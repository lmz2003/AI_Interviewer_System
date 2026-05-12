import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Note } from '../notes/entities/note.entity';
import { Interview } from '../interview/entities/interview.entity';
import { Resume } from '../resume-analysis/entities/resume.entity';
import { ResumeAnalysis } from '../resume-analysis/entities/resume-analysis.entity';
import { KnowledgeDocument } from '../knowledge-base/entities/knowledge-document.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Note,
      Interview,
      Resume,
      ResumeAnalysis,
      KnowledgeDocument,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
