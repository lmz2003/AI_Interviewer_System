import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interview, VideoAnalysisSummary } from '../entities/interview.entity';
import { InterviewSession } from '../entities/interview-session.entity';
import { InterviewMessage, VideoAnalysisResult } from '../entities/interview-message.entity';
import { InterviewReport, DimensionScores, VideoBehaviorScores, LearningSuggestion } from '../entities/interview-report.entity';
import { InterviewEvaluatorService } from './interview-evaluator.service';
import { InterviewLLMService } from './interview-llm.service';
import { SceneService } from './scene.service';
import { KnowledgeBaseService } from '../../knowledge-base/services/knowledge-base.service';
import { NotesService } from '../../notes/notes.service';
import { CreateDocumentDto } from '../../knowledge-base/dto/create-document.dto';
import { CreateNoteDto } from '../../notes/dto/create-note.dto';

@Injectable()
export class InterviewReportService {
  private readonly logger = new Logger(InterviewReportService.name);

  constructor(
    @InjectRepository(InterviewReport)
    private reportRepository: Repository<InterviewReport>,
    private evaluatorService: InterviewEvaluatorService,
    private llmService: InterviewLLMService,
    private sceneService: SceneService,
    private knowledgeBaseService: KnowledgeBaseService,
    private notesService: NotesService,
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
    const learningSuggestions = await this.generateLearningSuggestions(
      dimensionScores,
      interview,
      messages,
      finalStrengths.join('、'),
      finalWeaknesses.join('、'),
    );

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
      learningSuggestions,
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
      relations: ['interview'],
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

  private async generateLearningSuggestions(
    dimensionScores: DimensionScores,
    interview: Interview,
    messages: InterviewMessage[],
    strengths: string,
    weaknesses: string,
  ): Promise<LearningSuggestion[]> {
    try {
      const llmSuggestions = await this.llmService.generateLearningSuggestions(
        interview,
        messages,
        dimensionScores,
        strengths,
        weaknesses,
      );
      if (llmSuggestions.length > 0) {
        return llmSuggestions;
      }
    } catch (error) {
      this.logger.warn('[学习建议] LLM 生成失败，使用规则兜底:', error);
    }

    this.logger.log('[学习建议] 使用规则引擎兜底生成');
    const suggestions: LearningSuggestion[] = [];

    if (dimensionScores.depth < 7) {
      suggestions.push({
        category: 'knowledge',
        title: '深化专业知识体系',
        content: `建议系统学习${interview.jobType || '目标岗位'}的核心技术栈，通过阅读官方文档、技术博客和经典书籍建立完整的知识体系。重点关注原理层面的理解，而非仅停留在使用层面。`,
        priority: 'high',
        relatedDimension: '专业深度',
      });
    }

    if (dimensionScores.clarity < 7) {
      suggestions.push({
        category: 'technique',
        title: '提升回答逻辑性',
        content: '建议使用"总-分-总"或"STAR法则"等结构化方法组织回答。在回答前先快速梳理要点，确保逻辑清晰、层次分明。可以通过录音回放的方式检查自己的表达是否条理清楚。',
        priority: 'high',
        relatedDimension: '逻辑清晰度',
      });
    }

    if (dimensionScores.expression < 7) {
      suggestions.push({
        category: 'skill',
        title: '加强沟通表达能力',
        content: '建议多进行模拟面试练习，注意语速适中、用词准确。可以录制自己的回答视频，观察表情、语调和肢体语言。同时多阅读技术文章，积累专业表达词汇。',
        priority: 'medium',
        relatedDimension: '表达能力',
      });
    }

    if (dimensionScores.completeness < 7) {
      suggestions.push({
        category: 'technique',
        title: '提高回答完整性',
        content: '建议在回答问题时先理解问题的核心意图，然后从多个角度展开。可以采用"是什么-为什么-怎么做"的框架，确保回答覆盖问题的各个方面，避免遗漏关键信息。',
        priority: 'high',
        relatedDimension: '内容完整性',
      });
    }

    if (dimensionScores.highlights < 7) {
      suggestions.push({
        category: 'technique',
        title: '学会展示个人亮点',
        content: '建议在回答中主动展示与问题相关的项目经验、技术成果或独特见解。准备2-3个能体现个人能力的典型案例，在合适的时机自然引入，让面试官记住你的独特价值。',
        priority: 'medium',
        relatedDimension: '亮点突出',
      });
    }

    if (interview.sceneType === 'technical') {
      suggestions.push({
        category: 'practice',
        title: '加强算法与编码练习',
        content: '建议在LeetCode、牛客网等平台进行系统性刷题，重点练习数据结构、算法和系统设计题目。每天保持1-2道题的练习量，注重总结解题思路和优化方法。',
        priority: 'medium',
      });
    }

    if (interview.sceneType === 'behavioral') {
      suggestions.push({
        category: 'practice',
        title: '准备行为面试素材库',
        content: '建议按照STAR法则（情境-任务-行动-结果）整理3-5个典型工作/项目案例，涵盖团队协作、问题解决、冲突处理等常见行为面试主题。确保每个案例都有具体的细节和量化成果。',
        priority: 'medium',
      });
    }

    const avgScore = (dimensionScores.completeness + dimensionScores.clarity + dimensionScores.depth + dimensionScores.expression + dimensionScores.highlights) / 5;
    if (avgScore < 6) {
      suggestions.push({
        category: 'mindset',
        title: '建立自信心态',
        content: '面试表现与心态密切相关。建议通过充分的准备来增强自信，包括模拟面试、复盘总结等。同时保持积极的学习态度，将每次面试视为成长的机会，而非单纯的考核。',
        priority: 'high',
      });
    }

    return suggestions.slice(0, 5);
  }

  async syncToKnowledgeBase(reportId: string, userId: string): Promise<{ success: boolean; message: string; documentId?: string }> {
    try {
      const report = await this.getReportById(reportId);
      if (!report) {
        throw new BadRequestException('面试报告不存在');
      }

      if (report.knowledgeDocumentId) {
        const existingDoc = await this.knowledgeBaseService.checkDocumentExists(report.knowledgeDocumentId, userId);
        if (existingDoc) {
          return {
            success: false,
            message: '该面试报告已同步到知识库，如需重新同步请先在知识库中删除对应文档',
          };
        }
        this.logger.log(`知识库文档已不存在，清除旧的同步记录: ${report.knowledgeDocumentId}`);
        report.knowledgeDocumentId = undefined;
        report.syncedToKnowledgeAt = undefined;
        await this.reportRepository.save(report);
      }

      const interview = report.interview;
      const sceneName = interview ? this.sceneService.getSceneName(interview.sceneType) : '面试';
      const jobName = interview?.jobType ? this.sceneService.getJobTypeName(interview.jobType) : '';

      const content = this.formatReportForKnowledge(report, interview);

      const createDocumentDto: CreateDocumentDto = {
        title: `${sceneName}面试报告${jobName ? ` - ${jobName}` : ''} - ${report.overallScore.toFixed(1)}分`,
        content,
        source: `面试报告: ${report.id}`,
        documentType: 'text',
        metadata: {
          reportId: report.id,
          interviewId: report.interviewId,
          overallScore: report.overallScore,
          sceneType: interview?.sceneType,
          jobType: interview?.jobType,
          createdAt: report.createdAt,
        },
        uploadType: 'input',
      };

      const document = await this.knowledgeBaseService.addDocument(createDocumentDto, userId);

      report.knowledgeDocumentId = document.id;
      report.syncedToKnowledgeAt = new Date();
      await this.reportRepository.save(report);

      this.logger.log(`面试报告已同步到知识库 - 报告ID: ${reportId}, 文档ID: ${document.id}`);

      return {
        success: true,
        message: '面试报告已成功同步到知识库',
        documentId: document.id,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`同步到知识库失败: ${errorMsg}`);
      throw new BadRequestException(`同步到知识库失败: ${errorMsg}`);
    }
  }

  async syncToNotes(reportId: string, userId: string): Promise<{ success: boolean; message: string; noteId?: string }> {
    try {
      const report = await this.getReportById(reportId);
      if (!report) {
        throw new BadRequestException('面试报告不存在');
      }

      if (report.noteId) {
        const existingNote = await this.notesService.checkNoteExists(report.noteId, userId);
        if (existingNote) {
          return {
            success: false,
            message: '该面试报告已同步到笔记，如需重新同步请先删除对应笔记',
          };
        }
        this.logger.log(`笔记已不存在，清除旧的同步记录: ${report.noteId}`);
        report.noteId = undefined;
        report.syncedToNoteAt = undefined;
        await this.reportRepository.save(report);
      }

      const interview = report.interview;
      const sceneName = interview ? this.sceneService.getSceneName(interview.sceneType) : '面试';
      const jobName = interview?.jobType ? this.sceneService.getJobTypeName(interview.jobType) : '';

      const content = this.formatReportForNotes(report, interview);

      const createNoteDto: CreateNoteDto = {
        title: `${sceneName}面试报告${jobName ? ` - ${jobName}` : ''} - ${report.overallScore.toFixed(1)}分`,
        content,
        summary: report.summary || `面试综合评分: ${report.overallScore.toFixed(1)}分`,
        tags: ['面试报告', sceneName, ...(jobName ? [jobName] : [])],
        status: 'published',
      };

      const note = await this.notesService.createNote(createNoteDto, userId);

      report.noteId = note.id;
      report.syncedToNoteAt = new Date();
      await this.reportRepository.save(report);

      this.logger.log(`面试报告已同步到笔记 - 报告ID: ${reportId}, 笔记ID: ${note.id}`);

      return {
        success: true,
        message: '面试报告已成功同步到笔记',
        noteId: note.id,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`同步到笔记失败: ${errorMsg}`);
      throw new BadRequestException(`同步到笔记失败: ${errorMsg}`);
    }
  }

  private formatReportForKnowledge(report: InterviewReport, interview?: Interview): string {
    const sections: string[] = [];

    sections.push(`# 面试报告概览`);
    sections.push(`综合评分: ${report.overallScore.toFixed(1)}/10`);
    sections.push(`生成时间: ${new Date(report.createdAt).toLocaleString('zh-CN')}`);
    sections.push('');

    if (report.summary) {
      sections.push(`## 报告摘要`);
      sections.push(report.summary);
      sections.push('');
    }

    sections.push(`## 维度评分`);
    const dimensions = [
      { key: 'completeness', name: '完整性' },
      { key: 'clarity', name: '清晰度' },
      { key: 'depth', name: '专业深度' },
      { key: 'expression', name: '表达能力' },
      { key: 'highlights', name: '亮点突出' },
    ];
    for (const dim of dimensions) {
      const score = report.dimensionScores[dim.key as keyof DimensionScores];
      sections.push(`- ${dim.name}: ${score.toFixed(1)}/10`);
    }
    sections.push('');

    if (report.videoBehaviorScores) {
      sections.push(`## 视频表现评分`);
      sections.push(`- 眼神交流: ${report.videoBehaviorScores.eyeContactScore}/100`);
      sections.push(`- 情绪稳定: ${report.videoBehaviorScores.emotionStabilityScore}/100`);
      sections.push(`- 视线稳定: ${report.videoBehaviorScores.gazeStabilityScore}/100`);
      sections.push(`- 面部可见度: ${report.videoBehaviorScores.faceVisibilityScore}/100`);
      sections.push(`- 综合视频评分: ${report.videoBehaviorScores.overallVideoScore}/100`);
      sections.push('');
    }

    sections.push(`## 优势分析`);
    sections.push(report.strengths);
    sections.push('');

    sections.push(`## 待改进项`);
    sections.push(report.weaknesses);
    sections.push('');

    sections.push(`## 改进建议`);
    sections.push(report.suggestions);
    sections.push('');

    if (report.videoBehaviorFeedback) {
      sections.push(`## 视频表现反馈`);
      sections.push(report.videoBehaviorFeedback);
      sections.push('');
    }

    if (report.questionAnalysis && report.questionAnalysis.length > 0) {
      sections.push(`## 问题回顾`);
      for (let i = 0; i < report.questionAnalysis.length; i++) {
        const qa = report.questionAnalysis[i];
        sections.push(`### 问题 ${i + 1}`);
        sections.push(`**问题**: ${qa.question}`);
        sections.push(`**回答**: ${qa.answer}`);
        sections.push(`**评分**: ${qa.score.toFixed(1)}/10`);
        if (qa.feedback) {
          sections.push(`**反馈**: ${qa.feedback}`);
        }
        sections.push('');
      }
    }

    if (report.learningSuggestions && report.learningSuggestions.length > 0) {
      sections.push(`## 学习建议`);
      for (const suggestion of report.learningSuggestions) {
        sections.push(`- **${suggestion.title}** [${suggestion.priority === 'high' ? '高优先级' : suggestion.priority === 'medium' ? '中优先级' : '低优先级'}]`);
        sections.push(`  ${suggestion.content}`);
      }
    }

    return sections.join('\n');
  }

  private formatReportForNotes(report: InterviewReport, interview?: Interview): string {
    const children: any[] = [];

    children.push({
      id: '1',
      type: 'h1',
      children: [{ text: '面试报告' }],
    });

    children.push({
      id: '2',
      type: 'blockquote',
      children: [{ text: `综合评分: ${report.overallScore.toFixed(1)}/10` }],
    });

    children.push({
      id: '3',
      type: 'p',
      children: [{ text: `生成时间: ${new Date(report.createdAt).toLocaleString('zh-CN')}` }],
    });

    if (report.summary) {
      children.push({
        id: '4',
        type: 'h2',
        children: [{ text: '📋 报告摘要' }],
      });
      children.push({
        id: '5',
        type: 'p',
        children: [{ text: report.summary }],
      });
    }

    children.push({
      id: '6',
      type: 'h2',
      children: [{ text: '📊 维度评分' }],
    });

    const dimensions = [
      { key: 'completeness', name: '完整性', desc: '回答是否完整覆盖问题要点' },
      { key: 'clarity', name: '清晰度', desc: '表达是否清晰有条理' },
      { key: 'depth', name: '专业深度', desc: '回答的专业程度' },
      { key: 'expression', name: '表达能力', desc: '语言组织和表达' },
      { key: 'highlights', name: '亮点突出', desc: '是否有亮点或独特见解' },
    ];

    let idCounter = 10;
    for (const dim of dimensions) {
      const score = report.dimensionScores[dim.key as keyof DimensionScores];
      children.push({
        id: String(idCounter++),
        type: 'h3',
        children: [{ text: dim.name }],
      });
      children.push({
        id: String(idCounter++),
        type: 'p',
        children: [{ text: `评分: ${score.toFixed(1)}/10  —  ${dim.desc}` }],
      });
    }

    if (report.videoBehaviorScores) {
      children.push({
        id: String(idCounter++),
        type: 'h2',
        children: [{ text: '🎥 视频表现评分' }],
      });

      const videoDims = [
        { key: 'eyeContactScore', name: '眼神交流' },
        { key: 'emotionStabilityScore', name: '情绪稳定' },
        { key: 'gazeStabilityScore', name: '视线稳定' },
        { key: 'faceVisibilityScore', name: '面部可见度' },
      ];

      for (const dim of videoDims) {
        const score = report.videoBehaviorScores![dim.key as keyof VideoBehaviorScores];
        children.push({
          id: String(idCounter++),
          type: 'p',
          children: [{ text: `${dim.name}: ${score}/100` }],
        });
      }
      children.push({
        id: String(idCounter++),
        type: 'p',
        children: [
          { text: '综合视频评分: ', bold: false },
          { text: `${report.videoBehaviorScores.overallVideoScore}/100`, bold: true },
        ],
      });
    }

    children.push({
      id: String(idCounter++),
      type: 'h2',
      children: [{ text: '✅ 优势分析' }],
    });
    children.push({
      id: String(idCounter++),
      type: 'p',
      children: [{ text: report.strengths }],
    });

    children.push({
      id: String(idCounter++),
      type: 'h2',
      children: [{ text: '⚠️ 待改进项' }],
    });
    children.push({
      id: String(idCounter++),
      type: 'p',
      children: [{ text: report.weaknesses }],
    });

    children.push({
      id: String(idCounter++),
      type: 'h2',
      children: [{ text: '💡 改进建议' }],
    });
    children.push({
      id: String(idCounter++),
      type: 'p',
      children: [{ text: report.suggestions }],
    });

    if (report.videoBehaviorFeedback) {
      children.push({
        id: String(idCounter++),
        type: 'h2',
        children: [{ text: '📹 视频表现反馈' }],
      });
      children.push({
        id: String(idCounter++),
        type: 'p',
        children: [{ text: report.videoBehaviorFeedback }],
      });
    }

    if (report.questionAnalysis && report.questionAnalysis.length > 0) {
      children.push({
        id: String(idCounter++),
        type: 'h2',
        children: [{ text: '❓ 问题回顾' }],
      });

      for (let i = 0; i < report.questionAnalysis.length; i++) {
        const qa = report.questionAnalysis[i];
        children.push({
          id: String(idCounter++),
          type: 'h3',
          children: [{ text: `Q${i + 1}: ${qa.question}` }],
        });
        children.push({
          id: String(idCounter++),
          type: 'p',
          children: [{ text: '我的回答:', bold: true }],
        });
        children.push({
          id: String(idCounter++),
          type: 'blockquote',
          children: [{ text: qa.answer }],
        });
        children.push({
          id: String(idCounter++),
          type: 'p',
          children: [{ text: `评分: ${qa.score.toFixed(1)}/10` }],
        });
        if (qa.feedback) {
          children.push({
            id: String(idCounter++),
            type: 'p',
            children: [{ text: `反馈: ${qa.feedback}` }],
          });
        }
        children.push({
          id: String(idCounter++),
          type: 'hr',
          children: [{ text: '' }],
        });
      }
    }

    if (report.learningSuggestions && report.learningSuggestions.length > 0) {
      children.push({
        id: String(idCounter++),
        type: 'h2',
        children: [{ text: '📚 学习建议' }],
      });

      for (const suggestion of report.learningSuggestions) {
        children.push({
          id: String(idCounter++),
          type: 'h3',
          children: [{ text: suggestion.title }],
        });
        children.push({
          id: String(idCounter++),
          type: 'p',
          children: [{ text: suggestion.content }],
        });
      }
    }

    return JSON.stringify(children);
  }
}
