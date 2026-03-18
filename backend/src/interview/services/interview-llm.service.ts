import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Interview } from '../entities/interview.entity';
import { InterviewMessage, MessageEvaluation } from '../entities/interview-message.entity';
import { LearningResource, DimensionScores } from '../entities/interview-report.entity';
import {
  SCENE_CONFIG,
  EVALUATION_DIMENSIONS,
} from '../constants/scene-config';

interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  shouldAbort?: () => boolean;
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

@Injectable()
export class InterviewLLMService {
  private llm: ChatOpenAI;
  private readonly logger = new Logger(InterviewLLMService.name);
  private modelName = this.configService.get<string>('LLM_MODEL') || 'gpt-3.5-turbo';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('LLM_API_KEY');
    const baseUrl = this.configService.get<string>('LLM_BASE_URL');
    const provider = this.configService.get<string>('LLM_PROVIDER') || 'openai';

    if (!apiKey) {
      this.logger.warn('API Key 未配置，请设置 OPENAI_API_KEY');
    }

    if (provider === 'siliconflow') {
      this.logger.log(`使用硅基流动 LLM: ${this.modelName}`);
      this.llm = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: this.modelName,
        configuration: {
          baseURL: baseUrl || 'https://api.siliconflow.cn/v1',
        },
        temperature: 0.7,
        maxTokens: 2000,
        disableStreaming: false,
      });
    } else {
      this.logger.log(`使用 OpenAI LLM: ${this.modelName}`);
      this.llm = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: this.modelName,
        configuration: baseUrl ? { baseURL: baseUrl } : undefined,
        temperature: 0.7,
        maxTokens: 2000,
        disableStreaming: false,
      });
    }
  }

  async generateOpening(interview: Interview, resumeContent?: string): Promise<string> {
    const sceneConfig = SCENE_CONFIG[interview.sceneType as keyof typeof SCENE_CONFIG];
    if (!sceneConfig) {
      throw new Error(`未知的面试场景: ${interview.sceneType}`);
    }

    const systemPrompt = sceneConfig.systemPrompt;

    let openingPrompt = `你是一位资深${interview.jobType || '技术'}面试官，现在要开始一场${sceneConfig.name}。

面试信息：
- 面试场景：${sceneConfig.name}
- 岗位类型：${interview.jobType || '通用岗位'}
- 难度等级：${interview.difficulty || 'medium'}
- 预计问题数量：${sceneConfig.questionCount.min}-${sceneConfig.questionCount.max}个

${resumeContent ? `候选人简历摘要：\n${resumeContent}\n` : ''}

请以面试官的身份直接开始说话，生成一个开场白，包括：
1. 简短自我介绍（如：你好，我是这次面试的面试官）
2. 简单说明今天的面试流程
3. 请候选人进行自我介绍

要求：
- 直接以面试官的口吻说话，不要说"以下是"之类的话
- 语气专业友善
- 简洁明了，不超过100字
- 不要使用markdown格式，直接输出纯文本`;

    try {
      const response = await this.llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(openingPrompt),
      ]);

      const content = response.content as string;
      return this.filterThinkingContent(content);
    } catch (error) {
      this.logger.error('生成开场白失败:', error);
      throw error;
    }
  }

  async generateOpeningStream(
    interview: Interview,
    resumeContent: string | undefined,
    callbacks: StreamCallbacks,
  ): Promise<string> {
    const sceneConfig = SCENE_CONFIG[interview.sceneType as keyof typeof SCENE_CONFIG];
    if (!sceneConfig) {
      throw new Error(`未知的面试场景: ${interview.sceneType}`);
    }

    const systemPrompt = sceneConfig.systemPrompt;

    let openingPrompt = `你是一位面试官，现在要开始一场${sceneConfig.name}。

面试信息：
- 面试场景：${sceneConfig.name}
- 岗位类型：${interview.jobType || '通用岗位'}
- 难度等级：${interview.difficulty || 'medium'}
- 预计问题数量：${sceneConfig.questionCount.min}-${sceneConfig.questionCount.max}个

${resumeContent ? `候选人简历摘要：\n${resumeContent}\n` : ''}

请生成一个开场白，包括：
1. 简短的自我介绍（作为面试官）
2. 简单说明今天的面试流程
3. 请候选人进行自我介绍

要求：
- 语气专业友善
- 简洁明了，不超过100字
- 不要使用markdown格式，直接输出纯文本`;

    return this.streamGenerate(systemPrompt, openingPrompt, callbacks);
  }

  async generateQuestion(
    interview: Interview,
    history: InterviewMessage[],
    questionCount: number,
    resumeContent?: string,
  ): Promise<string> {
    const sceneConfig = SCENE_CONFIG[interview.sceneType as keyof typeof SCENE_CONFIG];
    if (!sceneConfig) {
      throw new Error(`未知的面试场景: ${interview.sceneType}`);
    }

    const systemPrompt = sceneConfig.systemPrompt;
    const historyText = this.formatHistory(history);

    const questionPrompt = `面试进行中，当前是第${questionCount + 1}个问题。

面试信息：
- 面试场景：${sceneConfig.name}
- 岗位类型：${interview.jobType || '通用岗位'}
- 难度等级：${interview.difficulty || 'medium'}
- 已提问数量：${questionCount}
- 剩余问题数量：${sceneConfig.questionCount.max - questionCount}

${resumeContent ? `候选人简历摘要：\n${resumeContent}\n` : ''}

历史对话：
${historyText}

请生成下一个面试问题。要求：
1. 问题应该与面试场景和岗位相关
2. 根据候选人的回答情况，可以追问或提出新问题
3. 问题要有针对性和深度
4. 不要使用markdown格式，直接输出纯文本`;

    try {
      const response = await this.llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(questionPrompt),
      ]);

      const content = response.content as string;
      return this.filterThinkingContent(content);
    } catch (error) {
      this.logger.error('生成问题失败:', error);
      throw error;
    }
  }

  async generateQuestionStream(
    interview: Interview,
    history: InterviewMessage[],
    questionCount: number,
    resumeContent: string | undefined,
    callbacks: StreamCallbacks,
  ): Promise<string> {
    const sceneConfig = SCENE_CONFIG[interview.sceneType as keyof typeof SCENE_CONFIG];
    if (!sceneConfig) {
      throw new Error(`未知的面试场景: ${interview.sceneType}`);
    }

    const systemPrompt = sceneConfig.systemPrompt;
    const historyText = this.formatHistory(history);

    const questionPrompt = `面试进行中，当前是第${questionCount + 1}个问题。

面试信息：
- 面试场景：${sceneConfig.name}
- 岗位类型：${interview.jobType || '通用岗位'}
- 难度等级：${interview.difficulty || 'medium'}
- 已提问数量：${questionCount}
- 剩余问题数量：${sceneConfig.questionCount.max - questionCount}

${resumeContent ? `候选人简历摘要：\n${resumeContent}\n` : ''}

历史对话：
${historyText}

请生成下一个面试问题。要求：
1. 问题应该与面试场景和岗位相关
2. 根据候选人的回答情况，可以追问或提出新问题
3. 问题要有针对性和深度
4. 不要使用markdown格式，直接输出纯文本`;

    return this.streamGenerate(systemPrompt, questionPrompt, callbacks);
  }

  async evaluateAnswer(
    question: string,
    answer: string,
    interview: Interview,
    videoAnalysis?: any,
  ): Promise<MessageEvaluation> {
    const sceneConfig = SCENE_CONFIG[interview.sceneType as keyof typeof SCENE_CONFIG];

    // 构建视频行为分析描述段落
    let videoAnalysisSection = '';
    if (videoAnalysis) {
      const summary = videoAnalysis.summary ?? videoAnalysis;
      if (summary) {
        const emotionMap: Record<string, string> = {
          neutral: '平静', happy: '愉悦', sad: '低落',
          angry: '紧张', fearful: '恐惧', disgusted: '不适', surprised: '惊讶',
        };
        const dominantEmotion = emotionMap[summary.dominantEmotion] || summary.dominantEmotion || '平静';
        const eyeContactPct = summary.eyeContactRatio !== undefined
          ? `${Math.round(summary.eyeContactRatio * 100)}%`
          : (videoAnalysis.eyeContact ? '良好' : '较差');
        const gazeDir = summary.gazeDistribution
          ? Object.entries(summary.gazeDistribution as Record<string, number>)
              .sort((a, b) => b[1] - a[1])[0]?.[0] || 'center'
          : (videoAnalysis.gazeDirection || 'center');
        const facePct = summary.faceDetectionRatio !== undefined
          ? `${Math.round(summary.faceDetectionRatio * 100)}%`
          : (videoAnalysis.faceDetected ? '100%' : '0%');

        videoAnalysisSection = `
候选人视频行为分析（回答本题期间）：
- 主导情绪：${dominantEmotion}
- 眼神接触比例：${eyeContactPct}
- 主要视线方向：${gazeDir}
- 面部可见比例：${facePct}
${summary.overallScore !== undefined ? `- 视频行为综合评分：${summary.overallScore}/100` : ''}

在评估 expression（表达能力）时，请适当参考视频行为分析结果：
- 若眼神接触比例低（< 50%）或情绪偏负面（如恐惧/低落），expression 分数应酌情下调
- 若眼神接触良好（> 70%）且情绪积极（平静/愉悦），expression 分数可适当提高
`;
      }
    }

    const evaluationPrompt = `请评估以下面试回答的质量。

面试场景：${sceneConfig?.name || interview.sceneType}
岗位类型：${interview.jobType || '通用岗位'}
难度等级：${interview.difficulty || 'medium'}

问题：${question}

候选人回答：${answer}
${videoAnalysisSection}
请从以下维度进行评分（每项1-10分）：
1. 完整性（completeness）：是否完整回答了问题
2. 清晰度（clarity）：回答是否有条理
3. 深度（depth）：回答的专业程度
4. 表达能力（expression）：语言组织和表达（参考视频行为）
5. 亮点（highlights）：是否有亮点或独特见解

请以JSON格式返回评估结果，格式如下：
{
  "completeness": 8,
  "clarity": 7,
  "depth": 6,
  "expression": 8,
  "highlights": 5,
  "overall": 7,
  "suggestions": ["建议1", "建议2"]
}

注意：只返回JSON，不要有其他内容。`;

    try {
      const response = await this.llm.invoke([
        new HumanMessage(evaluationPrompt),
      ]);

      const content = response.content as string;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const evaluation = JSON.parse(jsonMatch[0]) as MessageEvaluation;
        evaluation.overall = this.calculateOverallScore(evaluation);
        return evaluation;
      }

      return this.getDefaultEvaluation();
    } catch (error) {
      this.logger.error('评估回答失败:', error);
      return this.getDefaultEvaluation();
    }
  }

  async generateClosing(
    interview: Interview,
    history: InterviewMessage[],
    averageScore: number,
  ): Promise<string> {
    const sceneConfig = SCENE_CONFIG[interview.sceneType as keyof typeof SCENE_CONFIG];

    const historyText = this.formatHistory(history);

    const closingPrompt = `面试即将结束，请生成结束语。

面试信息：
- 面试场景：${sceneConfig?.name || interview.sceneType}
- 岗位类型：${interview.jobType || '通用岗位'}
- 候选人整体表现评分：${averageScore.toFixed(1)}/10

历史对话摘要：
${historyText.substring(0, 1000)}...

请生成一个结束语，包括：
1. 感谢候选人参加面试
2. 简要说明后续流程
3. 给予候选人一些鼓励

要求：
- 语气专业友善
- 简洁明了，不超过100字
- 不要使用markdown格式，直接输出纯文本`;

    try {
      const response = await this.llm.invoke([
        new HumanMessage(closingPrompt),
      ]);

      const content = response.content as string;
      return this.filterThinkingContent(content);
    } catch (error) {
      this.logger.error('生成结束语失败:', error);
      return '感谢您参加今天的面试，我们会尽快给您反馈。祝您求职顺利！';
    }
  }

  async generateClosingStream(
    interview: Interview,
    history: InterviewMessage[],
    averageScore: number,
    callbacks: StreamCallbacks,
  ): Promise<string> {
    const sceneConfig = SCENE_CONFIG[interview.sceneType as keyof typeof SCENE_CONFIG];

    const historyText = this.formatHistory(history);

    const closingPrompt = `面试即将结束，请生成结束语。

面试信息：
- 面试场景：${sceneConfig?.name || interview.sceneType}
- 岗位类型：${interview.jobType || '通用岗位'}
- 候选人整体表现评分：${averageScore.toFixed(1)}/10

历史对话摘要：
${historyText.substring(0, 1000)}...

请生成一个结束语，包括：
1. 感谢候选人参加面试
2. 简要说明后续流程
3. 给予候选人一些鼓励

要求：
- 语气专业友善
- 简洁明了，不超过100字
- 不要使用markdown格式，直接输出纯文本`;

    return this.streamGenerate('', closingPrompt, callbacks);
  }

  private async streamGenerate(
    systemPrompt: string,
    userPrompt: string,
    callbacks: StreamCallbacks,
  ): Promise<string> {
    try {
      const messages: (SystemMessage | HumanMessage)[] = [];
      if (systemPrompt) {
        messages.push(new SystemMessage(systemPrompt));
      }
      messages.push(new HumanMessage(userPrompt));

      const stream = await this.llm.stream(messages);
      let fullContent = '';

      for await (const chunk of stream) {
        if (callbacks.shouldAbort && callbacks.shouldAbort()) {
          this.logger.log('检测到中止信号，停止流式生成');
          break;
        }

        const content = this.extractChunkContent(chunk);
        if (content) {
          fullContent += content;
          callbacks.onChunk(content);
        }
      }

      return fullContent;
    } catch (error) {
      this.logger.error('流式生成失败:', error);
      throw error;
    }
  }

  async *streamGenerateAsync(
    systemPrompt: string,
    userPrompt: string,
    shouldAbort?: () => boolean,
  ): AsyncGenerator<StreamChunk> {
    try {
      const messages: (SystemMessage | HumanMessage)[] = [];
      if (systemPrompt) {
        messages.push(new SystemMessage(systemPrompt));
      }
      messages.push(new HumanMessage(userPrompt));

      const stream = await this.llm.stream(messages);

      for await (const chunk of stream) {
        if (shouldAbort && shouldAbort()) {
          this.logger.log('检测到中止信号，停止流式生成');
          break;
        }

        const content = this.extractChunkContent(chunk);
        if (content) {
          yield { content, done: false };
        }
      }

      yield { content: '', done: true };
    } catch (error) {
      this.logger.error('流式生成失败:', error);
      throw error;
    }
  }

  private filterThinkingContent(content: string): string {
    let filtered = content;
    
    filtered = filtered.replace(/<think>[\s\S]*?<\/think>/g, '');
    
    filtered = filtered.replace(/<\/?think>/g, '');
    
    return filtered;
  }

  private extractChunkContent(chunk: unknown): string | null {
    if (!chunk) return null;

    try {
      const chunkObj = chunk as Record<string, unknown>;

      // 判断这是否是一个只包含 metadata 的数据块（无实际内容）
      if (this.isMetadataOnlyChunk(chunkObj)) {
        return null;
      }

      if ('content' in chunkObj) {
        const content = chunkObj.content;
        if (typeof content === 'string' && content.length > 0) {
          return content;
        }
        if (Array.isArray(content)) {
          const rawContent = content
            .map((item: unknown) => {
              if (typeof item === 'string') return item;
              if (item && typeof item === 'object') {
                const itemObj = item as Record<string, unknown>;
                if ('text' in itemObj && typeof itemObj.text === 'string') {
                  return itemObj.text;
                }
              }
              return '';
            })
            .join('');
          if (rawContent.length > 0) {
            return rawContent;
          }
        }
      }

      if ('kwargs' in chunkObj && chunkObj.kwargs && typeof chunkObj.kwargs === 'object') {
        const kwargs = chunkObj.kwargs as Record<string, unknown>;
        
        // 检查这是否是纯 metadata 的 kwargs 对象
        if (this.isMetadataOnlyKwargs(kwargs)) {
          return null;
        }
        
        if ('content' in kwargs && typeof kwargs.content === 'string' && kwargs.content.length > 0) {
          return kwargs.content;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 判断是否是纯 metadata 的数据块（不包含实际文本内容）
   */
  private isMetadataOnlyChunk(chunk: Record<string, unknown>): boolean {
    // 如果只有 kwargs 且 kwargs 只包含 metadata 信息，则是纯 metadata 块
    if ('kwargs' in chunk && Object.keys(chunk).length === 1) {
      const kwargs = chunk.kwargs;
      if (kwargs && typeof kwargs === 'object') {
        return this.isMetadataOnlyKwargs(kwargs as Record<string, unknown>);
      }
    }
    return false;
  }

  /**
   * 判断 kwargs 是否只包含 metadata 信息
   */
  private isMetadataOnlyKwargs(kwargs: Record<string, unknown>): boolean {
    // 检查是否只有 response_metadata 这个字段，或者只有 response_metadata 和其他非内容字段
    const contentFields = ['content', 'text'];
    const hasContent = Object.keys(kwargs).some(key => {
      const value = kwargs[key];
      if (contentFields.includes(key) && typeof value === 'string' && value.length > 0) {
        return true;
      }
      return false;
    });
    
    return !hasContent;
  }

  /**
   * 使用大模型根据面试情况生成个性化学习资源推荐
   */
  async generateLearningResources(
    interview: Interview,
    messages: InterviewMessage[],
    dimensionScores: DimensionScores,
    strengths: string,
    weaknesses: string,
  ): Promise<LearningResource[]> {
    const sceneConfig = SCENE_CONFIG[interview.sceneType as keyof typeof SCENE_CONFIG];
    const sceneName = sceneConfig?.name || interview.sceneType;
    const jobName = interview.jobType || '通用岗位';

    // 提取评分较低的维度
    const weakDimensions: string[] = [];
    if (dimensionScores.completeness < 7) weakDimensions.push('回答完整性');
    if (dimensionScores.clarity < 7) weakDimensions.push('表达清晰度');
    if (dimensionScores.depth < 7) weakDimensions.push('专业深度');
    if (dimensionScores.expression < 7) weakDimensions.push('沟通表达');
    if (dimensionScores.highlights < 7) weakDimensions.push('亮点展示');

    // 取最后几轮对话作为上下文参考（避免 prompt 过长）
    const recentMessages = messages.slice(-6);
    const conversationSample = recentMessages
      .map((m) => `${m.role === 'user' ? '候选人' : '面试官'}：${m.content.substring(0, 200)}`)
      .join('\n');

    const prompt = `你是一位资深职业规划顾问，请根据以下面试情况为候选人推荐5个具体的学习资源。

## 面试基本信息
- 面试场景：${sceneName}
- 应聘岗位：${jobName}
- 难度等级：${interview.difficulty || 'medium'}

## 本次表现分析
- 优势：${strengths || '暂无'}
- 不足：${weaknesses || '暂无'}
- 需要加强的维度：${weakDimensions.length > 0 ? weakDimensions.join('、') : '整体表现良好，可继续深化'}

## 对话片段参考
${conversationSample || '（暂无对话记录）'}

## 要求
请推荐 5 个**真实存在**的学习资源，优先推荐以下平台的内容：
- 课程类：极客时间、慕课网、Coursera、B站
- 练习类：LeetCode、牛客网、HackerRank
- 文章类：掘金、知乎、InfoQ、美团技术博客
- 书籍类：豆瓣、京东图书

每个资源需要针对候选人的**具体不足**或**岗位技能要求**，不要推荐过于泛泛的资源。

请以如下 JSON 数组格式返回，**只返回 JSON，不要有其他内容**：
[
  {
    "type": "course",
    "title": "资源标题（包含平台名）",
    "url": "https://真实URL",
    "reason": "推荐理由（一句话，结合候选人具体情况）"
  }
]

type 取值范围：course（课程）| article（文章）| video（视频）| practice（练习）| book（书籍）`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = this.filterThinkingContent(response.content as string);
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as LearningResource[];
        // 校验结构并过滤无效项
        const valid = parsed
          .filter((r) => r && typeof r.type === 'string' && typeof r.title === 'string' && typeof r.url === 'string')
          .slice(0, 5);
        if (valid.length > 0) {
          this.logger.log(`[学习资源] LLM 生成 ${valid.length} 条推荐`);
          return valid;
        }
      }
      this.logger.warn('[学习资源] LLM 返回内容无法解析，将使用兜底规则');
      return [];
    } catch (error) {
      this.logger.error('[学习资源] LLM 调用失败:', error);
      return [];
    }
  }

  private formatHistory(history: InterviewMessage[]): string {
    if (!history || history.length === 0) {
      return '（无历史对话）';
    }

    return history
      .map((msg) => {
        const role = msg.role === 'user' ? '候选人' : '面试官';
        return `${role}：${msg.content}`;
      })
      .join('\n\n');
  }

  private calculateOverallScore(evaluation: MessageEvaluation): number {
    const weights = {
      completeness: EVALUATION_DIMENSIONS.completeness.weight,
      clarity: EVALUATION_DIMENSIONS.clarity.weight,
      depth: EVALUATION_DIMENSIONS.depth.weight,
      expression: EVALUATION_DIMENSIONS.expression.weight,
      highlights: EVALUATION_DIMENSIONS.highlights.weight,
    };

    return (
      evaluation.completeness * weights.completeness +
      evaluation.clarity * weights.clarity +
      evaluation.depth * weights.depth +
      evaluation.expression * weights.expression +
      evaluation.highlights * weights.highlights
    );
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
