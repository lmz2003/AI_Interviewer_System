import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interview } from '../entities/interview.entity';
import { InterviewSession } from '../entities/interview-session.entity';
import { InterviewMessage } from '../entities/interview-message.entity';
import { InterviewReport, DimensionScores, LearningResource } from '../entities/interview-report.entity';
import { InterviewEvaluatorService } from './interview-evaluator.service';
import { InterviewLLMService } from './interview-llm.service';
import { SceneService } from './scene.service';

@Injectable()
export class InterviewReportService {
  private readonly logger = new Logger(InterviewReportService.name);

  constructor(
    @InjectRepository(InterviewReport)
    private reportRepository: Repository<InterviewReport>,
    private evaluatorService: InterviewEvaluatorService,
    private llmService: InterviewLLMService,
    private sceneService: SceneService,
  ) {}

  async generateReport(
    interview: Interview,
    session: InterviewSession,
    messages: InterviewMessage[],
  ): Promise<InterviewReport> {
    this.logger.log(`开始生成面试报告 - 面试ID: ${interview.id}`);

    const dimensionScores = this.evaluatorService.calculateDimensionAverages(messages);
    const overallScore = this.evaluatorService.calculateSessionScore(messages);
    const { strengths, weaknesses } = this.evaluatorService.analyzeStrengthsAndWeaknesses(dimensionScores);
    const suggestions = this.evaluatorService.generateSuggestions(dimensionScores, interview);

    const questionAnalysis = this.extractQuestionAnalysis(messages);

    const summary = await this.generateSummary(interview, messages, overallScore);

    const learningResources = this.generateLearningResources(dimensionScores, interview);

    const report = this.reportRepository.create({
      interviewId: interview.id,
      overallScore,
      dimensionScores,
      strengths: strengths.join('、'),
      weaknesses: weaknesses.join('、'),
      suggestions: suggestions.join('\n'),
      summary,
      questionAnalysis,
      learningResources,
    });

    const savedReport = await this.reportRepository.save(report);
    this.logger.log(`面试报告生成完成 - 报告ID: ${savedReport.id}`);

    return savedReport;
  }

  async getReportByInterviewId(interviewId: string): Promise<InterviewReport | null> {
    return this.reportRepository.findOne({
      where: { interviewId },
    });
  }

  async getReportById(reportId: string): Promise<InterviewReport | null> {
    return this.reportRepository.findOne({
      where: { id: reportId },
    });
  }

  private extractQuestionAnalysis(
    messages: InterviewMessage[],
  ): Array<{ question: string; answer: string; score: number; feedback: string }> {
    const analysis: Array<{ question: string; answer: string; score: number; feedback: string }> = [];

    for (let i = 0; i < messages.length - 1; i++) {
      const currentMsg = messages[i];
      const nextMsg = messages[i + 1];

      if (currentMsg.role === 'assistant' && nextMsg.role === 'user') {
        const question = currentMsg.content;
        const answer = nextMsg.content;
        const score = nextMsg.evaluation?.overall || 0;
        const feedback = nextMsg.evaluation?.suggestions?.join('；') || '';

        analysis.push({ question, answer, score, feedback });
      }
    }

    return analysis;
  }

  private async generateSummary(
    interview: Interview,
    messages: InterviewMessage[],
    overallScore: number,
  ): Promise<string> {
    const sceneName = this.sceneService.getSceneName(interview.sceneType);
    const jobName = interview.jobType ? this.sceneService.getJobTypeName(interview.jobType) : '通用岗位';
    const scoreLevel = this.evaluatorService.getScoreLevel(overallScore);

    const userMessages = messages.filter((msg) => msg.role === 'user');
    const questionCount = Math.floor(userMessages.length);

    let summary = `本次${sceneName}（${jobName}）共进行了${questionCount}轮问答，`;
    summary += `整体表现${scoreLevel}，综合评分${overallScore.toFixed(1)}分。`;

    if (overallScore >= 7) {
      summary += '候选人展现了良好的专业素养和沟通能力，建议继续加强相关技能的学习。';
    } else if (overallScore >= 5) {
      summary += '候选人在某些方面表现不错，但仍有提升空间，建议针对薄弱环节进行专项训练。';
    } else {
      summary += '候选人需要加强基础能力的培养，建议系统学习相关知识并进行更多练习。';
    }

    return summary;
  }

  private generateLearningResources(
    dimensionScores: DimensionScores,
    interview: Interview,
  ): LearningResource[] {
    const resources: LearningResource[] = [];

    if (dimensionScores.depth < 7) {
      resources.push({
        type: 'course',
        title: '技术面试深度提升课程',
        url: 'https://example.com/course/tech-interview',
      });
    }

    if (dimensionScores.clarity < 7) {
      resources.push({
        type: 'article',
        title: '如何清晰表达技术方案',
        url: 'https://example.com/article/clear-expression',
      });
    }

    if (dimensionScores.expression < 7) {
      resources.push({
        type: 'video',
        title: '面试表达技巧视频教程',
        url: 'https://example.com/video/interview-expression',
      });
    }

    if (interview.sceneType === 'technical') {
      resources.push({
        type: 'practice',
        title: 'LeetCode算法练习',
        url: 'https://leetcode.cn',
      });
    }

    if (interview.sceneType === 'behavioral') {
      resources.push({
        type: 'article',
        title: 'STAR法则详解与应用',
        url: 'https://example.com/article/star-method',
      });
    }

    return resources.slice(0, 5);
  }
}
