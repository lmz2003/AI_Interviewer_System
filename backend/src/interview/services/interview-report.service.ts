import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interview, VideoAnalysisSummary } from '../entities/interview.entity';
import { InterviewSession } from '../entities/interview-session.entity';
import { InterviewMessage, VideoAnalysisResult } from '../entities/interview-message.entity';
import { InterviewReport, DimensionScores, VideoBehaviorScores, LearningResource } from '../entities/interview-report.entity';
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
    const langScore = this.evaluatorService.calculateSessionScore(messages);
    const { strengths, weaknesses } = this.evaluatorService.analyzeStrengthsAndWeaknesses(dimensionScores);
    const suggestions = this.evaluatorService.generateSuggestions(dimensionScores, interview);

    const questionAnalysis = this.extractQuestionAnalysis(messages);

    const videoBehaviorScores = this.calculateVideoBehaviorScores(messages);
    const videoBehaviorFeedback = this.generateVideoBehaviorFeedback(videoBehaviorScores, messages);

    // 若有视频行为分析数据，将视频综合分（百分制→十分制）按 20% 权重混合进总分
    let overallScore = langScore;
    if (videoBehaviorScores) {
      const videoScore10 = videoBehaviorScores.overallVideoScore / 10; // 0-100 → 0-10
      overallScore = langScore * 0.8 + videoScore10 * 0.2;
      this.logger.log(
        `[报告] 语言评分: ${langScore.toFixed(2)}, 视频评分: ${videoScore10.toFixed(2)}, 综合评分: ${overallScore.toFixed(2)}`,
      );
    }

    // 视频行为维度纳入优劣势和建议
    const { strengths: finalStrengths, weaknesses: finalWeaknesses } =
      this.mergeVideoIntoStrengthsWeaknesses(strengths, weaknesses, videoBehaviorScores);
    const finalSuggestions = this.mergeVideoIntoSuggestions(suggestions, videoBehaviorScores);

    const summary = await this.generateSummary(interview, messages, overallScore);
    const learningResources = this.generateLearningResources(dimensionScores, interview);

    const report = this.reportRepository.create({
      interviewId: interview.id,
      overallScore,
      dimensionScores,
      videoBehaviorScores,
      strengths: finalStrengths.join('、'),
      weaknesses: finalWeaknesses.join('、'),
      suggestions: finalSuggestions.join('\n'),
      videoBehaviorFeedback,
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

  private calculateVideoBehaviorScores(messages: InterviewMessage[]): VideoBehaviorScores | undefined {
    const videoMessages = messages.filter(
      msg => msg.role === 'user' && msg.videoAnalysis && msg.videoAnalysis.summary
    );

    if (videoMessages.length === 0) {
      return undefined;
    }

    let totalEyeContactRatio = 0;
    let totalFaceDetectionRatio = 0;
    let totalOverallScore = 0;
    const emotionDistribution: Record<string, number> = {};
    const gazeDistribution: Record<string, number> = {};
    let totalFrames = 0;
    const allFeedback: string[] = [];

    for (const msg of videoMessages) {
      const summary = msg.videoAnalysis!.summary;
      totalEyeContactRatio += summary.eyeContactRatio;
      totalFaceDetectionRatio += summary.faceDetectionRatio;
      totalOverallScore += summary.overallScore;
      totalFrames += summary.totalFrames;

      for (const [emotion, value] of Object.entries(summary.averageEmotions)) {
        emotionDistribution[emotion] = (emotionDistribution[emotion] || 0) + (value as number) * summary.totalFrames;
      }

      for (const [direction, value] of Object.entries(summary.gazeDistribution)) {
        gazeDistribution[direction] = (gazeDistribution[direction] || 0) + (value as number) * summary.totalFrames;
      }

      allFeedback.push(...(summary.feedback || []));
    }

    const count = videoMessages.length;
    const avgEyeContactRatio = totalEyeContactRatio / count;
    const avgFaceDetectionRatio = totalFaceDetectionRatio / count;
    const avgOverallScore = totalOverallScore / count;

    for (const emotion of Object.keys(emotionDistribution)) {
      emotionDistribution[emotion] /= totalFrames;
    }
    for (const direction of Object.keys(gazeDistribution)) {
      gazeDistribution[direction] /= totalFrames;
    }

    let dominantEmotion = 'neutral';
    let maxEmotionValue = 0;
    for (const [emotion, value] of Object.entries(emotionDistribution)) {
      if (value > maxEmotionValue) {
        maxEmotionValue = value;
        dominantEmotion = emotion;
      }
    }

    const emotionStabilityScore = this.calculateEmotionStability(emotionDistribution);
    const gazeStabilityScore = this.calculateGazeStability(gazeDistribution);

    const eyeContactScore = Math.round(avgEyeContactRatio * 100);
    const faceVisibilityScore = Math.round(avgFaceDetectionRatio * 100);
    const overallVideoScore = Math.round(
      eyeContactScore * 0.3 +
      emotionStabilityScore * 0.25 +
      gazeStabilityScore * 0.25 +
      faceVisibilityScore * 0.2
    );

    return {
      eyeContactScore,
      emotionStabilityScore,
      gazeStabilityScore,
      faceVisibilityScore,
      overallVideoScore,
    };
  }

  private calculateEmotionStability(emotionDistribution: Record<string, number>): number {
    const positiveEmotions = (emotionDistribution['neutral'] || 0) + (emotionDistribution['happy'] || 0);
    const negativeEmotions = 
      (emotionDistribution['sad'] || 0) + 
      (emotionDistribution['angry'] || 0) + 
      (emotionDistribution['fearful'] || 0) +
      (emotionDistribution['disgusted'] || 0);
    
    const stability = Math.max(0, (positiveEmotions - negativeEmotions * 0.5)) * 100;
    return Math.min(100, Math.round(stability));
  }

  private calculateGazeStability(gazeDistribution: Record<string, number>): number {
    const centerGaze = gazeDistribution['center'] || 0;
    return Math.round(centerGaze * 100);
  }

  private generateVideoBehaviorFeedback(
    videoBehaviorScores: VideoBehaviorScores | undefined,
    messages: InterviewMessage[],
  ): string | undefined {
    if (!videoBehaviorScores) {
      return undefined;
    }

    const feedbacks: string[] = [];

    if (videoBehaviorScores.eyeContactScore >= 80) {
      feedbacks.push('眼神交流表现优秀，展现了良好的自信和专注度');
    } else if (videoBehaviorScores.eyeContactScore >= 60) {
      feedbacks.push('眼神交流表现良好，建议继续保持与面试官的目光接触');
    } else {
      feedbacks.push('建议加强眼神交流，保持与面试官的目光接触可以展现更多自信');
    }

    if (videoBehaviorScores.emotionStabilityScore >= 70) {
      feedbacks.push('面试过程中情绪稳定，表情自然得体');
    } else if (videoBehaviorScores.emotionStabilityScore >= 50) {
      feedbacks.push('情绪表现基本稳定，建议保持更积极的面部表情');
    } else {
      feedbacks.push('建议调整心态，保持更平和积极的表情，展现自信的一面');
    }

    if (videoBehaviorScores.gazeStabilityScore >= 70) {
      feedbacks.push('视线稳定，注意力集中');
    } else if (videoBehaviorScores.gazeStabilityScore < 50) {
      feedbacks.push('建议减少视线游离，保持对面试官的关注');
    }

    if (videoBehaviorScores.faceVisibilityScore >= 90) {
      feedbacks.push('全程保持良好的摄像头位置，面部清晰可见');
    } else if (videoBehaviorScores.faceVisibilityScore < 80) {
      feedbacks.push('建议调整摄像头位置，确保面部始终在画面中');
    }

    const allVideoFeedback = messages
      .filter(msg => msg.videoAnalysis?.summary?.feedback)
      .flatMap(msg => msg.videoAnalysis!.summary.feedback);

    const uniqueFeedback = [...new Set(allVideoFeedback)].slice(0, 2);
    feedbacks.push(...uniqueFeedback);

    return feedbacks.join('；');
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

    const videoMessages = messages.filter(msg => msg.videoAnalysis);
    if (videoMessages.length > 0) {
      summary += `视频面试中，`;
      const videoScores = this.calculateVideoBehaviorScores(messages);
      if (videoScores) {
        if (videoScores.overallVideoScore >= 70) {
          summary += `候选人的视频表现良好（${videoScores.overallVideoScore}分），`;
        } else {
          summary += `候选人的视频表现有待提升（${videoScores.overallVideoScore}分），`;
        }
      }
    }

    if (overallScore >= 7) {
      summary += '候选人展现了良好的专业素养和沟通能力，建议继续加强相关技能的学习。';
    } else if (overallScore >= 5) {
      summary += '候选人在某些方面表现不错，但仍有提升空间，建议针对薄弱环节进行专项训练。';
    } else {
      summary += '候选人需要加强基础能力的培养，建议系统学习相关知识并进行更多练习。';
    }

    return summary;
  }

  /**
   * 将视频行为维度融合进优劣势分析。
   * 视频综合分 ≥ 70 → 「视频表现」列为优势；< 50 → 列为劣势。
   */
  private mergeVideoIntoStrengthsWeaknesses(
    strengths: string[],
    weaknesses: string[],
    videoBehaviorScores: VideoBehaviorScores | undefined,
  ): { strengths: string[]; weaknesses: string[] } {
    if (!videoBehaviorScores) {
      return { strengths, weaknesses };
    }

    const mergedStrengths = [...strengths];
    const mergedWeaknesses = [...weaknesses];

    if (videoBehaviorScores.overallVideoScore >= 70) {
      mergedStrengths.push('视频面试表现');
    } else if (videoBehaviorScores.overallVideoScore < 50) {
      mergedWeaknesses.push('视频面试表现');
    }

    // 细粒度：眼神接触
    if (videoBehaviorScores.eyeContactScore >= 80) {
      if (!mergedStrengths.includes('眼神交流')) mergedStrengths.push('眼神交流');
    } else if (videoBehaviorScores.eyeContactScore < 50) {
      if (!mergedWeaknesses.includes('眼神交流')) mergedWeaknesses.push('眼神交流');
    }

    return { strengths: mergedStrengths, weaknesses: mergedWeaknesses };
  }

  /**
   * 将视频行为维度融合进改进建议。
   */
  private mergeVideoIntoSuggestions(
    suggestions: string[],
    videoBehaviorScores: VideoBehaviorScores | undefined,
  ): string[] {
    if (!videoBehaviorScores) return suggestions;

    const merged = [...suggestions];

    if (videoBehaviorScores.eyeContactScore < 60) {
      merged.push('建议在面试中保持与摄像头的眼神接触，这能展示自信与专注，给面试官留下更好的印象');
    }

    if (videoBehaviorScores.emotionStabilityScore < 50) {
      merged.push('建议面试前做好心理准备，保持平和放松的状态，面部表情自然得体有助于给面试官留下积极印象');
    }

    if (videoBehaviorScores.gazeStabilityScore < 50) {
      merged.push('建议减少视线游移，将注意力集中在屏幕上，避免频繁向侧面或上方看，以展示专注度');
    }

    if (videoBehaviorScores.faceVisibilityScore < 80) {
      merged.push('建议调整摄像头角度和位置，确保面部始终清晰可见，避免光线过暗或摄像头偏移');
    }

    return merged;
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
