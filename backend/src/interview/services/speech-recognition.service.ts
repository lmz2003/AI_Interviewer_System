import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import axios from 'axios';

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  duration?: number;
  language?: string;
}

export type ASRModel = 'FunAudioLLM/SenseVoiceSmall' | 'TeleAI/TeleSpeechASR';

@Injectable()
export class SpeechRecognitionService {
  private readonly logger = new Logger(SpeechRecognitionService.name);
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: ASRModel;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('LLM_API_KEY') || '';
    this.baseUrl = this.configService.get<string>('LLM_BASE_URL') || 'https://api.siliconflow.cn/v1';
    this.defaultModel = this.configService.get<ASRModel>('ASR_MODEL') || 'FunAudioLLM/SenseVoiceSmall';
  }

  async transcribeAudio(
    audioBuffer: Buffer,
    options: {
      language?: string;
      fileName?: string;
      mimeType?: string;
      model?: ASRModel;
    } = {},
  ): Promise<TranscriptionResult> {
    const { fileName = 'audio.webm', mimeType = 'audio/webm', model = this.defaultModel } = options;

    this.logger.log(`[语音识别] 开始转录，文件: ${fileName}, 大小: ${audioBuffer.length} bytes, 模型: ${model}, MIME: ${mimeType}`);

    // 检查音频大小是否合理
    if (audioBuffer.length < 500) {
      this.logger.warn(`[语音识别] 警告：音频文件过小 (${audioBuffer.length} bytes)，可能是空录音或录音时间过短`);
    }

    // 检查音频数据是否有效（检查前几个字节是否符合webm格式）
    if (audioBuffer.length > 0) {
      const header = audioBuffer.slice(0, 4).toString('hex');
      this.logger.log(`[语音识别] 音频文件头: 0x${header}`);
      
      // WebM 文件头应该是 1a 45 df a3
      if (mimeType === 'audio/webm' && header !== '1a45dfa3') {
        this.logger.warn(`[语音识别] 警告：WebM 文件头不正确，期望 1a45dfa3，实际 ${header}`);
      }
    }

    try {
      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: fileName,
        contentType: mimeType,
      });
      formData.append('model', model);

      this.logger.log(`[语音识别] 正在调用API: ${this.baseUrl}/audio/transcriptions`);

      const response = await axios.post(`${this.baseUrl}/audio/transcriptions`, formData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...formData.getHeaders(),
        },
        timeout: 60000,
      });

      const result = response.data;

      this.logger.log(`[语音识别] API响应状态: ${response.status}`);
      this.logger.log(`[语音识别] API响应数据: ${JSON.stringify(result).substring(0, 200)}`);

      const transcribedText = result.text || '';
      this.logger.log(`[语音识别] 转录成功: "${transcribedText.substring(0, 50)}..." (完整长度: ${transcribedText.length} 字符)`);
      
      if (!transcribedText.trim()) {
        this.logger.warn(`[语音识别] 警告：转录结果为空字符串`);
      }

      return {
        text: transcribedText,
      };
    } catch (error) {
      const errorMsg = axios.isAxiosError(error) 
        ? `${error.response?.status} - ${JSON.stringify(error.response?.data)}`
        : (error instanceof Error ? error.message : '未知错误');
      this.logger.error(`[语音识别] 转录失败: ${errorMsg}`);
      throw new Error(`语音识别失败: ${errorMsg}`);
    }
  }

  async transcribeBase64Audio(
    base64Audio: string,
    options: {
      mimeType?: string;
      model?: ASRModel;
    } = {},
  ): Promise<TranscriptionResult> {
    const { mimeType = 'audio/webm', model = this.defaultModel } = options;

    const base64Data = base64Audio.includes(',')
      ? base64Audio.split(',')[1]
      : base64Audio;

    const audioBuffer = Buffer.from(base64Data, 'base64');
    const extension = this.getExtensionFromMimeType(mimeType);

    return this.transcribeAudio(audioBuffer, {
      fileName: `audio.${extension}`,
      mimeType,
      model,
    });
  }

  /**
   * 根据 MIME 类型获取文件扩展名
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/wav': 'wav',
      'audio/mp3': 'mp3',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'mp4',
      'audio/m4a': 'm4a',
      'audio/ogg': 'ogg',
      'audio/flac': 'flac',
    };
    return mimeToExt[mimeType] || 'webm';
  }
}
