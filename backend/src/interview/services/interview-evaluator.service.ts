import { Injectable, Logger } from '@nestjs/common';
import { Interview } from '../entities/interview.entity';
import { InterviewMessage, MessageEvaluation } from '../entities/interview-message.entity';
import { InterviewLLMService } from './interview-llm.service';
import { EVALUATION_DIMENSIONS } from '../constants/scene-config';

@Injectable()
export class InterviewEvaluatorService {
  private readonly logger = new Logger(InterviewEvaluatorService.name);

  constructor(private llmService: InterviewLLMService) {}

  async evaluateAnswer(
    question: string,
    answer: string,
    interview: Interview,
    videoAnalysis?: any,
  ): Promise<MessageEvaluation> {
    try {
      this.logger.log(`开始评估回答 - 面试ID: ${interview.id}${videoAnalysis ? '（含视频分析）' : ''}`);
      
      const evaluation = await this.llmService.evaluateAnswer(
        question,
        answer,
        interview,
        videoAnalysis,
      );

      this.logger.log(`评估完成 - 综合评分: ${evaluation.overall.toFixed(2)}`);
      return evaluation;
    } catch (error) {
      this.logger.error('评估回答失败:', error);
      return this.getDefaultEvaluation();
    }
  }

  calculateSessionScore(messages: InterviewMessage[]): number {
    const userMessages = messages.filter(
      (msg) => msg.role === 'user' && msg.evaluation,
    );

    if (userMessages.length === 0) {
      return 0;
    }

    const totalScore = userMessages.reduce((sum, msg) => {
      return sum + (msg.evaluation?.overall || 0);
    }, 0);

    return totalScore / userMessages.length;
  }

  calculateDimensionAverages(messages: InterviewMessage[]): {
    completeness: number;
    clarity: number;
    depth: number;
    expression: number;
    highlights: number;
  } {
    const userMessages = messages.filter(
      (msg) => msg.role === 'user' && msg.evaluation,
    );

    if (userMessages.length === 0) {
      return {
        completeness: 0,
        clarity: 0,
        depth: 0,
        expression: 0,
        highlights: 0,
      };
    }

    const totals = {
      completeness: 0,
      clarity: 0,
      depth: 0,
      expression: 0,
      highlights: 0,
    };

    userMessages.forEach((msg) => {
      if (msg.evaluation) {
        totals.completeness += msg.evaluation.completeness;
        totals.clarity += msg.evaluation.clarity;
        totals.depth += msg.evaluation.depth;
        totals.expression += msg.evaluation.expression;
        totals.highlights += msg.evaluation.highlights;
      }
    });

    const count = userMessages.length;
    return {
      completeness: totals.completeness / count,
      clarity: totals.clarity / count,
      depth: totals.depth / count,
      expression: totals.expression / count,
      highlights: totals.highlights / count,
    };
  }

  analyzeStrengthsAndWeaknesses(
    dimensionAverages: ReturnType<typeof this.calculateDimensionAverages>,
  ): { strengths: string[]; weaknesses: string[] } {
    const dimensions = [
      { key: 'completeness' as const, name: '内容完整性', score: dimensionAverages.completeness },
      { key: 'clarity' as const, name: '逻辑清晰度', score: dimensionAverages.clarity },
      { key: 'depth' as const, name: '专业深度', score: dimensionAverages.depth },
      { key: 'expression' as const, name: '表达能力', score: dimensionAverages.expression },
      { key: 'highlights' as const, name: '亮点突出', score: dimensionAverages.highlights },
    ];

    const sorted = [...dimensions].sort((a, b) => b.score - a.score);
    const topTwo = sorted.slice(0, 2);
    const bottomTwo = sorted.slice(-2).reverse();

    return {
      strengths: topTwo.map((d) => d.name),
      weaknesses: bottomTwo.map((d) => d.name),
    };
  }

  generateSuggestions(
    dimensionAverages: ReturnType<typeof this.calculateDimensionAverages>,
    interview: Interview,
  ): string[] {
    const suggestions: string[] = [];

    if (dimensionAverages.completeness < 6) {
      suggestions.push('建议在回答问题时更加全面，确保覆盖问题的各个方面');
    }

    if (dimensionAverages.clarity < 6) {
      suggestions.push('建议在表达时注意逻辑结构，可以使用"首先、其次、最后"等方式组织回答');
    }

    if (dimensionAverages.depth < 6) {
      suggestions.push('建议在回答时展示更深入的专业思考，可以结合具体案例和经验');
    }

    if (dimensionAverages.expression < 6) {
      suggestions.push('建议提升语言表达能力，注意用词准确、表达流畅');
    }

    if (dimensionAverages.highlights < 6) {
      suggestions.push('建议在回答中突出个人亮点和独特见解，展示与众不同的价值');
    }

    if (suggestions.length === 0) {
      suggestions.push('整体表现良好，继续保持并不断提升');
    }

    return suggestions;
  }

  getScoreLevel(score: number): string {
    if (score >= 9) return '优秀';
    if (score >= 7) return '良好';
    if (score >= 5) return '一般';
    if (score >= 3) return '待提升';
    return '需要加强';
  }

  private getDefaultEvaluation(): MessageEvaluation {
    return {
      completeness: 5,
      clarity: 5,
      depth: 5,
      expression: 5,
      highlights: 5,
      overall: 5,
      suggestions: ['继续努力，提升回答的完整性和深度'],
    };
  }
}
