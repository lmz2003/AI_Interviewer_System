import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface CorrectionContext {
  jobPosition?: string;
  resumeKeywords?: string[];
  recentMessages?: Array<{ role: 'user' | 'assistant'; text: string }>;
}

export interface CorrectionResult {
  originalText: string;
  correctedText: string;
  wasCorrected: boolean;
}

@Injectable()
export class AsrCorrectionService {
  private readonly logger = new Logger(AsrCorrectionService.name);
  private apiKey: string;
  private baseUrl: string;
  private correctionModel: string;
  private enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('LLM_API_KEY') || '';
    this.baseUrl = this.configService.get<string>('LLM_BASE_URL') || 'https://api.siliconflow.cn/v1';
    this.correctionModel = this.configService.get<string>('ASR_CORRECTION_MODEL') || 'Qwen/Qwen2.5-7B-Instruct';
    this.enabled = this.configService.get<string>('ASR_CORRECTION_ENABLED') !== 'false';
  }

  async correctTranscription(
    rawText: string,
    context: CorrectionContext = {},
  ): Promise<CorrectionResult> {
    if (!this.enabled) {
      return {
        originalText: rawText,
        correctedText: rawText,
        wasCorrected: false,
      };
    }

    if (!rawText || rawText.trim().length === 0) {
      return {
        originalText: rawText,
        correctedText: rawText,
        wasCorrected: false,
      };
    }

    const startTime = Date.now();

    try {
      const systemPrompt = this.buildSystemPrompt(context);
      const userPrompt = this.buildUserPrompt(rawText, context);

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.correctionModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: Math.max(100, Math.ceil(rawText.length * 1.5)),
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 3000,
        },
      );

      const correctedText = response.data.choices[0]?.message?.content?.trim() || rawText;
      const wasCorrected = correctedText !== rawText;

      const elapsed = Date.now() - startTime;
      this.logger.log(`[ASR纠错] 原文: "${rawText.substring(0, 30)}..." → 纠正: "${correctedText.substring(0, 30)}..." (${elapsed}ms, ${wasCorrected ? '已修改' : '无变化'})`);

      return {
        originalText: rawText,
        correctedText,
        wasCorrected,
      };
    } catch (error) {
      const elapsed = Date.now() - startTime;
      const errorMsg = axios.isAxiosError(error)
        ? `${error.response?.status} - ${JSON.stringify(error.response?.data)}`
        : error instanceof Error ? error.message : '未知错误';
      this.logger.warn(`[ASR纠错] 纠错失败 (${elapsed}ms): ${errorMsg}，返回原文`);

      return {
        originalText: rawText,
        correctedText: rawText,
        wasCorrected: false,
      };
    }
  }

  private buildSystemPrompt(context: CorrectionContext): string {
    const { jobPosition } = context;

    let prompt = `你是一个语音识别纠错助手。你的任务是纠正语音识别结果中的明显错误。

纠错规则：
1. 只纠正明显的同音字、近音字错误（如"技术"被识别为"记述"）
2. 保留用户的原始表达方式和口语习惯
3. 不要改变用户说话的意思
4. 如果不确定是否有错，保持原样
5. 不要添加标点符号以外的内容
6. 直接输出纠正后的文本，不要解释`;

    if (jobPosition) {
      prompt += `\n\n用户正在参加"${jobPosition}"岗位的面试，注意专业术语的准确性。`;
    }

    return prompt;
  }

  private buildUserPrompt(rawText: string, context: CorrectionContext): string {
    const { resumeKeywords, recentMessages } = context;

    let prompt = '请纠正以下语音识别结果：\n\n';
    prompt += `"${rawText}"`;

    if (resumeKeywords && resumeKeywords.length > 0) {
      prompt += `\n\n参考关键词（可能是简历中的专业术语）：${resumeKeywords.slice(0, 10).join('、')}`;
    }

    if (recentMessages && recentMessages.length > 0) {
      const recentContext = recentMessages
        .slice(-3)
        .map(m => `${m.role === 'user' ? '用户' : '面试官'}：${m.text.substring(0, 50)}`)
        .join('\n');
      prompt += `\n\n对话上下文：\n${recentContext}`;
    }

    prompt += '\n\n直接输出纠正后的文本：';

    return prompt;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.logger.log(`[ASR纠错] 功能${enabled ? '已启用' : '已禁用'}`);
  }
}
