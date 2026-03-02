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

    this.logger.log(`[语音识别] 开始转录，文件: ${fileName}, 大小: ${audioBuffer.length} bytes, 模型: ${model}`);

    try {
      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: fileName,
        contentType: mimeType,
      });
      formData.append('model', model);

      const response = await axios.post(`${this.baseUrl}/audio/transcriptions`, formData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...formData.getHeaders(),
        },
      });

      const result = response.data;

      this.logger.log(`[语音识别] 转录成功: "${result.text.substring(0, 50)}..."`);
      return {
        text: result.text,
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
   * 检测音频中是否有语音活动（VAD）
   * 简单实现：检查音频数据的大小（实际项目中应使用专业VAD库）
   */
  detectVoiceActivity(audioBuffer: Buffer): boolean {
    // 简单判断：音频数据超过1KB认为有语音
    return audioBuffer.length > 1024;
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
