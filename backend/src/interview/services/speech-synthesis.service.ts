import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export type TTSVoice = 'alex' | 'benjamin' | 'charles' | 'david' | 'anna' | 'bella' | 'claire' | 'diana';

export type TTSModel = 'FunAudioLLM/CosyVoice2-0.5B' | 'fnlp/MOSS-TTSD-v0.5';

export interface TTSOptions {
  voice?: TTSVoice;
  speed?: number;
  gain?: number;
  responseFormat?: 'mp3' | 'opus' | 'wav' | 'pcm';
  sampleRate?: number;
}

export interface TTSResult {
  audioBuffer: Buffer;
  format: string;
}

interface TTSCacheEntry {
  audioBuffer: Buffer;
  createdAt: number;
}

@Injectable()
export class SpeechSynthesisService {
  private readonly logger = new Logger(SpeechSynthesisService.name);
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: TTSModel;
  private ttsCache = new Map<string, TTSCacheEntry>();
  private readonly CACHE_TTL_MS = 10 * 60 * 1000;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('LLM_API_KEY') || '';
    this.baseUrl = this.configService.get<string>('LLM_BASE_URL') || 'https://api.siliconflow.cn/v1';
    this.defaultModel = this.configService.get<TTSModel>('TTS_MODEL') || 'FunAudioLLM/CosyVoice2-0.5B';

    setInterval(() => this.cleanupCache(), this.CACHE_TTL_MS);
  }

  async synthesizeSpeech(
    text: string,
    options: TTSOptions = {},
  ): Promise<TTSResult> {
    const {
      voice = 'anna',
      speed = 1.0,
      gain = 0,
      responseFormat = 'mp3',
      sampleRate,
    } = options;

    const effectiveSampleRate = this.getSampleRate(responseFormat, sampleRate);
    const cacheKey = `${text}-${voice}-${speed}-${gain}-${responseFormat}-${effectiveSampleRate}`;
    
    const cached = this.ttsCache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < this.CACHE_TTL_MS) {
      this.logger.log(`[语音合成] 命中缓存，文本: "${text.substring(0, 30)}..."`);
      return {
        audioBuffer: cached.audioBuffer,
        format: responseFormat,
      };
    }

    this.logger.log(`[语音合成] 开始合成，文本长度: ${text.length}，音色: ${voice}，模型: ${this.defaultModel}`);

    try {
      const voiceWithModel = `${this.defaultModel}:${voice}`;
      
      const response = await axios.post(
        `${this.baseUrl}/audio/speech`,
        {
          model: this.defaultModel,
          input: text,
          voice: voiceWithModel,
          speed,
          gain,
          response_format: responseFormat,
          sample_rate: effectiveSampleRate,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        },
      );

      const audioBuffer = Buffer.from(response.data);

      this.ttsCache.set(cacheKey, {
        audioBuffer,
        createdAt: Date.now(),
      });

      this.logger.log(`[语音合成] 合成成功，音频大小: ${audioBuffer.length} bytes`);

      return {
        audioBuffer,
        format: responseFormat,
      };
    } catch (error) {
      const errorMsg = axios.isAxiosError(error)
        ? `${error.response?.status} - ${error.response?.statusText}`
        : (error instanceof Error ? error.message : '未知错误');
      this.logger.error(`[语音合成] 合成失败: ${errorMsg}`);
      throw new Error(`语音合成失败: ${errorMsg}`);
    }
  }

  getAvailableVoices(): Array<{ id: TTSVoice; name: string; description: string; gender: string }> {
    return [
      { id: 'alex', name: 'Alex', description: '沉稳男声', gender: 'male' },
      { id: 'benjamin', name: 'Benjamin', description: '低沉男声', gender: 'male' },
      { id: 'charles', name: 'Charles', description: '磁性男声', gender: 'male' },
      { id: 'david', name: 'David', description: '欢快男声', gender: 'male' },
      { id: 'anna', name: 'Anna', description: '沉稳女声', gender: 'female' },
      { id: 'bella', name: 'Bella', description: '激情女声', gender: 'female' },
      { id: 'claire', name: 'Claire', description: '温柔女声', gender: 'female' },
      { id: 'diana', name: 'Diana', description: '欢快女声', gender: 'female' },
    ];
  }

  private getSampleRate(format: string, requestedRate?: number): number {
    if (requestedRate) {
      return requestedRate;
    }
    
    switch (format) {
      case 'opus':
        return 48000;
      case 'wav':
      case 'pcm':
        return 44100;
      case 'mp3':
      default:
        return 44100;
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.ttsCache.entries()) {
      if (now - entry.createdAt > this.CACHE_TTL_MS) {
        this.ttsCache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.logger.log(`[语音合成] 清理了 ${cleaned} 个过期缓存条目`);
    }
  }
}
