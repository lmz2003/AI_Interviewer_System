import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Interview } from './entities/interview.entity';
import { InterviewSession } from './entities/interview-session.entity';
import { InterviewMessage } from './entities/interview-message.entity';
import { InterviewReport } from './entities/interview-report.entity';
import { InterviewController } from './interview.controller';
import { SceneService } from './services/scene.service';
import { InterviewSessionService } from './services/interview-session.service';
import { InterviewMessageService } from './services/interview-message.service';
import { InterviewLLMService } from './services/interview-llm.service';
import { InterviewEvaluatorService } from './services/interview-evaluator.service';
import { InterviewReportService } from './services/interview-report.service';
import { ResumeAnalysisModule } from '../resume-analysis/resume-analysis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Interview,
      InterviewSession,
      InterviewMessage,
      InterviewReport,
    ]),
    ResumeAnalysisModule,
  ],
  controllers: [InterviewController],
  providers: [
    SceneService,
    InterviewSessionService,
    InterviewMessageService,
    InterviewLLMService,
    InterviewEvaluatorService,
    InterviewReportService,
  ],
  exports: [
    SceneService,
    InterviewSessionService,
    InterviewMessageService,
    InterviewLLMService,
    InterviewEvaluatorService,
    InterviewReportService,
  ],
})
export class InterviewModule {}
