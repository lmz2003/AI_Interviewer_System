import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import axios from 'axios';

export interface VideoFrameAnalysis {
  timestamp: number;
  emotions: {
    neutral: number;
    happy: number;
    sad: number;
    angry: number;
    fearful: number;
    disgusted: number;
    surprised: number;
  };
  gazeDirection: 'center' | 'left' | 'right' | 'up' | 'down';
  eyeContact: boolean;
  faceDetected: boolean;
  confidence: number;
  isDefault?: boolean;
}

export interface VideoAnalysisSummary {
  totalFrames: number;
  averageEmotions: Record<string, number>;
  dominantEmotion: string;
  eyeContactRatio: number;
  gazeDistribution: Record<string, number>;
  faceDetectionRatio: number;
  overallScore: number;
  feedback: string[];
}

export interface VideoAnalysisOptions {
  frameInterval?: number;
  maxFrames?: number;
}

@Injectable()
export class VideoAnalysisService {
  private readonly logger = new Logger(VideoAnalysisService.name);
  private apiKey: string;
  private baseUrl: string;
  private visionModel: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('LLM_API_KEY') || '';
    this.baseUrl = this.configService.get<string>('LLM_BASE_URL') || 'https://api.siliconflow.cn/v1';
    this.visionModel = this.configService.get<string>('VISION_MODEL') || 'Qwen/Qwen2-VL-72B-Instruct';
  }

  async analyzeFrame(
    imageBuffer: Buffer,
    timestamp: number,
  ): Promise<VideoFrameAnalysis | null> {
    const startTime = Date.now();
    this.logger.log(`[视频分析] 开始分析帧 - 时间戳: ${timestamp}ms, 图像大小: ${imageBuffer.length} bytes`);

    try {
      this.logger.debug(`[视频分析] 调用视觉模型: ${this.visionModel}`);
      this.logger.debug(`[视频分析] API地址: ${this.baseUrl}/chat/completions`);
      
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.visionModel,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`,
                  },
                },
                {
                  type: 'text',
                  text: this.getFacialAnalysisPrompt(),
                },
              ],
            },
          ],
          max_tokens: 500,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const elapsed = Date.now() - startTime;
      this.logger.debug(`[视频分析] API响应状态: ${response.status}`);
      
      const content = response.data.choices?.[0]?.message?.content || '';
      this.logger.debug(`[视频分析] API返回内容长度: ${content.length} 字符`);
      if (content.length > 0) {
        this.logger.debug(`[视频分析] API返回内容预览: ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`);
      }
      
      const analysisResult = this.parseAnalysisResult(content, timestamp);
      
      if (analysisResult.isDefault) {
        this.logger.warn(`[视频分析] 解析结果为默认值，舍弃此帧`);
        return null;
      }
      
      this.logFrameAnalysisResult(analysisResult, elapsed);
      
      return analysisResult;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      const errorMsg = axios.isAxiosError(error)
        ? `${error.response?.status} - ${JSON.stringify(error.response?.data)}`
        : (error instanceof Error ? error.message : '未知错误');
      this.logger.warn(`[视频分析] 帧分析失败 (耗时: ${elapsed}ms): ${errorMsg}，舍弃此帧`);
      return null;
    }
  }

  private logFrameAnalysisResult(result: VideoFrameAnalysis, elapsed: number): void {
    const { emotions, gazeDirection, eyeContact, faceDetected, confidence } = result;
    
    this.logger.log(`[视频分析] 帧分析完成 (耗时: ${elapsed}ms)`);
    this.logger.log(`[视频分析] ├─ 人脸检测: ${faceDetected ? '✓ 检测到' : '✗ 未检测到'}`);
    this.logger.log(`[视频分析] ├─ 置信度: ${(confidence * 100).toFixed(1)}%`);
    this.logger.log(`[视频分析] ├─ 眼神交流: ${eyeContact ? '✓ 有' : '✗ 无'}`);
    this.logger.log(`[视频分析] ├─ 视线方向: ${gazeDirection}`);
    this.logger.log(`[视频分析] └─ 情绪分布:`);
    this.logger.log(`[视频分析]    ├─ neutral: ${(emotions.neutral * 100).toFixed(1)}%`);
    this.logger.log(`[视频分析]    ├─ happy: ${(emotions.happy * 100).toFixed(1)}%`);
    this.logger.log(`[视频分析]    ├─ sad: ${(emotions.sad * 100).toFixed(1)}%`);
    this.logger.log(`[视频分析]    ├─ angry: ${(emotions.angry * 100).toFixed(1)}%`);
    this.logger.log(`[视频分析]    ├─ fearful: ${(emotions.fearful * 100).toFixed(1)}%`);
    this.logger.log(`[视频分析]    ├─ disgusted: ${(emotions.disgusted * 100).toFixed(1)}%`);
    this.logger.log(`[视频分析]    └─ surprised: ${(emotions.surprised * 100).toFixed(1)}%`);
  }

  async analyzeFrameBase64(
    base64Image: string,
    timestamp: number,
  ): Promise<VideoFrameAnalysis | null> {
    const base64Data = base64Image.includes(',')
      ? base64Image.split(',')[1]
      : base64Image;

    const imageBuffer = Buffer.from(base64Data, 'base64');
    return this.analyzeFrame(imageBuffer, timestamp);
  }

  async analyzeMultipleFrames(frames: string[]): Promise<VideoAnalysisSummary | null> {
    if (frames.length === 0) {
      return null;
    }

    const startTime = Date.now();
    this.logger.log(`[视频分析] 开始批量分析 ${frames.length} 帧`);

    try {
      const messageContent: any[] = [];

      frames.forEach((frame, index) => {
        const base64Data = frame.includes(',') ? frame.split(',')[1] : frame;
        messageContent.push({
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${base64Data}`,
          },
        });
      });

      messageContent.push({
        type: 'text',
        text: this.getMultiFrameAnalysisPrompt(),
      });

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.visionModel,
          messages: [
            {
              role: 'user',
              content: messageContent,
            },
          ],
          max_tokens: 1000,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        },
      );

      const elapsed = Date.now() - startTime;
      const content = response.data.choices?.[0]?.message?.content || '';
      
      this.logger.debug(`[视频分析] 批量分析API返回内容长度: ${content.length} 字符`);
      if (content.length > 0) {
        this.logger.debug(`[视频分析] 批量分析API返回内容预览: ${content.substring(0, 300)}${content.length > 300 ? '...' : ''}`);
      }

      return this.parseMultiFrameResult(content, elapsed);
    } catch (error) {
      const elapsed = Date.now() - startTime;
      const errorMsg = axios.isAxiosError(error)
        ? `${error.response?.status} - ${JSON.stringify(error.response?.data)}`
        : (error instanceof Error ? error.message : '未知错误');
      this.logger.warn(`[视频分析] 批量分析失败 (耗时: ${elapsed}ms): ${errorMsg}`);
      return null;
    }
  }

  private getMultiFrameAnalysisPrompt(): string {
    return `请分析以下多张人脸图像，给出综合分析结果。

分析要求：
1. 识别每张图片中的人脸表情和姿态
2. 综合所有图片给出整体评估
3. 分析以下维度：
   - 主导情绪（最常见的情绪）
   - 平均眼神交流情况
   - 视线方向分布
   - 人脸检测成功率

请返回JSON格式：
{
  "totalFrames": 总帧数,
  "dominantEmotion": "neutral/happy/sad/angry/fearful/disgusted/surprised",
  "averageEmotions": {
    "neutral": 0-1之间的数值,
    "happy": 0-1之间的数值,
    "sad": 0-1之间的数值,
    "angry": 0-1之间的数值,
    "fearful": 0-1之间的数值,
    "disgusted": 0-1之间的数值,
    "surprised": 0-1之间的数值
  },
  "eyeContactRatio": 0-1之间的数值,
  "gazeDistribution": {
    "center": 0-1之间的数值,
    "left": 0-1之间的数值,
    "right": 0-1之间的数值,
    "up": 0-1之间的数值,
    "down": 0-1之间的数值
  },
  "faceDetectionRatio": 0-1之间的数值,
  "overallScore": 0-100之间的数值,
  "feedback": ["反馈建议1", "反馈建议2", ...]
}

只返回JSON，不要其他解释。`;
  }

  private parseMultiFrameResult(content: string, elapsed: number): VideoAnalysisSummary {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn(`[视频分析] 批量分析解析失败: 未找到JSON格式内容`);
        return {
          totalFrames: 0,
          averageEmotions: {},
          dominantEmotion: 'neutral',
          eyeContactRatio: 0,
          gazeDistribution: {},
          faceDetectionRatio: 0,
          overallScore: 0,
          feedback: ['分析失败'],
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      this.logger.log(`[视频分析] 批量分析完成 (耗时: ${elapsed}ms)`);
      this.logger.log(`[视频分析] ├─ 总帧数: ${parsed.totalFrames}`);
      this.logger.log(`[视频分析] ├─ 主导情绪: ${parsed.dominantEmotion}`);
      this.logger.log(`[视频分析] ├─ 眼神交流比例: ${(parsed.eyeContactRatio * 100).toFixed(1)}%`);
      this.logger.log(`[视频分析] ├─ 人脸检测比例: ${(parsed.faceDetectionRatio * 100).toFixed(1)}%`);
      this.logger.log(`[视频分析] └─ 综合评分: ${parsed.overallScore}`);

      return {
        totalFrames: parsed.totalFrames || 0,
        averageEmotions: parsed.averageEmotions || {},
        dominantEmotion: parsed.dominantEmotion || 'neutral',
        eyeContactRatio: parsed.eyeContactRatio || 0,
        gazeDistribution: parsed.gazeDistribution || {},
        faceDetectionRatio: parsed.faceDetectionRatio || 0,
        overallScore: parsed.overallScore || 0,
        feedback: parsed.feedback || ['分析完成'],
      };
    } catch (error) {
      this.logger.warn(`[视频分析] 批量分析解析失败: ${error}`);
      return {
        totalFrames: 0,
        averageEmotions: {},
        dominantEmotion: 'neutral',
        eyeContactRatio: 0,
        gazeDistribution: {},
        faceDetectionRatio: 0,
        overallScore: 0,
        feedback: ['分析失败'],
      };
    }
  }

  generateSummary(analyses: VideoFrameAnalysis[]): VideoAnalysisSummary {
    if (analyses.length === 0) {
      return {
        totalFrames: 0,
        averageEmotions: {},
        dominantEmotion: 'neutral',
        eyeContactRatio: 0,
        gazeDistribution: {},
        faceDetectionRatio: 0,
        overallScore: 0,
        feedback: ['未检测到视频数据'],
      };
    }

    const emotionSums: Record<string, number> = {};
    const gazeCounts: Record<string, number> = {};
    let eyeContactCount = 0;
    let faceDetectedCount = 0;

    for (const analysis of analyses) {
      if (analysis.faceDetected) {
        faceDetectedCount++;
        for (const [emotion, value] of Object.entries(analysis.emotions)) {
          emotionSums[emotion] = (emotionSums[emotion] || 0) + value;
        }
        if (analysis.eyeContact) {
          eyeContactCount++;
        }
        gazeCounts[analysis.gazeDirection] = (gazeCounts[analysis.gazeDirection] || 0) + 1;
      }
    }

    const averageEmotions: Record<string, number> = {};
    for (const [emotion, sum] of Object.entries(emotionSums)) {
      averageEmotions[emotion] = sum / faceDetectedCount;
    }

    let dominantEmotion = 'neutral';
    let maxEmotionValue = 0;
    for (const [emotion, value] of Object.entries(averageEmotions)) {
      if (value > maxEmotionValue) {
        maxEmotionValue = value;
        dominantEmotion = emotion;
      }
    }

    const eyeContactRatio = faceDetectedCount > 0 ? eyeContactCount / faceDetectedCount : 0;
    const faceDetectionRatio = analyses.length > 0 ? faceDetectedCount / analyses.length : 0;

    const gazeDistribution: Record<string, number> = {};
    for (const [direction, count] of Object.entries(gazeCounts)) {
      gazeDistribution[direction] = count / faceDetectedCount;
    }

    const overallScore = this.calculateOverallScore(
      eyeContactRatio,
      faceDetectionRatio,
      averageEmotions,
      gazeDistribution,
    );

    const feedback = this.generateFeedback(
      eyeContactRatio,
      faceDetectionRatio,
      dominantEmotion,
      gazeDistribution,
    );

    return {
      totalFrames: analyses.length,
      averageEmotions,
      dominantEmotion,
      eyeContactRatio,
      gazeDistribution,
      faceDetectionRatio,
      overallScore,
      feedback,
    };
  }

  private getFacialAnalysisPrompt(): string {
    return `分析这张面试者的人脸图像，返回JSON格式：
{
  "emotions": {
    "neutral": 0.0-1.0,
    "happy": 0.0-1.0,
    "sad": 0.0-1.0,
    "angry": 0.0-1.0,
    "fearful": 0.0-1.0,
    "disgusted": 0.0-1.0,
    "surprised": 0.0-1.0
  },
  "gazeDirection": "center",
  "eyeContact": true,
  "faceDetected": true,
  "confidence": 0.8
}

要求：
1. emotions所有值总和应为1.0
2. gazeDirection可选值: center/left/right/up/down
3. eyeContact: 是否直视镜头
4. faceDetected: 是否检测到人脸
5. confidence: 人脸检测置信度0-1

只返回JSON，不要任何解释。`;
  }

  private parseAnalysisResult(content: string, timestamp: number): VideoFrameAnalysis {
    const defaultResult: VideoFrameAnalysis = {
      timestamp,
      emotions: {
        neutral: 0.5,
        happy: 0.1,
        sad: 0.1,
        angry: 0.1,
        fearful: 0.1,
        disgusted: 0.1,
        surprised: 0.1,
      },
      gazeDirection: 'center',
      eyeContact: true,
      faceDetected: true,
      confidence: 0.5,
    };

    try {
      if (!content || content.trim().length === 0) {
        this.logger.warn(`[视频分析] 解析失败: API返回内容为空`);
        return defaultResult;
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn(`[视频分析] 解析失败: 未找到JSON格式内容，内容: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`);
        return defaultResult;
      }

      const jsonString = jsonMatch[0];
      this.logger.debug(`[视频分析] 提取的JSON字符串: ${jsonString.substring(0, 200)}${jsonString.length > 200 ? '...' : ''}`);

      const parsed = JSON.parse(jsonString);
      
      if (!parsed || typeof parsed !== 'object') {
        this.logger.warn(`[视频分析] 解析失败: JSON不是有效的对象`);
        return defaultResult;
      }

      if (!parsed.emotions) {
        this.logger.warn(`[视频分析] 解析失败: 缺少emotions字段，完整JSON: ${JSON.stringify(parsed)}`);
        return defaultResult;
      }

      return {
        timestamp,
        emotions: parsed.emotions || defaultResult.emotions,
        gazeDirection: parsed.gazeDirection || 'center',
        eyeContact: parsed.eyeContact !== false,
        faceDetected: parsed.faceDetected !== false,
        confidence: parsed.confidence || 0.5,
        isDefault: false,
      };
    } catch (error) {
      this.logger.warn(`[视频分析] 解析结果失败: ${error}, 原始内容: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`);
      return defaultResult;
    }
  }

  private calculateOverallScore(
    eyeContactRatio: number,
    faceDetectionRatio: number,
    averageEmotions: Record<string, number>,
    gazeDistribution: Record<string, number>,
  ): number {
    let score = 0;

    score += eyeContactRatio * 30;

    score += faceDetectionRatio * 20;

    const positiveEmotions = (averageEmotions['neutral'] || 0) + (averageEmotions['happy'] || 0);
    const negativeEmotions = (averageEmotions['sad'] || 0) + (averageEmotions['angry'] || 0) + 
                            (averageEmotions['fearful'] || 0);
    const emotionScore = Math.max(0, (positiveEmotions - negativeEmotions * 0.5)) * 30;
    score += emotionScore;

    const centerGaze = gazeDistribution['center'] || 0;
    score += centerGaze * 20;

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  private generateFeedback(
    eyeContactRatio: number,
    faceDetectionRatio: number,
    dominantEmotion: string,
    gazeDistribution: Record<string, number>,
  ): string[] {
    const feedback: string[] = [];

    if (eyeContactRatio < 0.5) {
      feedback.push('建议增加与面试官的眼神交流，保持自信的目光接触');
    } else if (eyeContactRatio > 0.85) {
      feedback.push('眼神交流很好，展现了自信和专注');
    }

    if (faceDetectionRatio < 0.8) {
      feedback.push('建议保持在摄像头视野范围内，确保面部始终可见');
    }

    const emotionFeedback: Record<string, string> = {
      happy: '面试过程中保持了积极愉悦的表情，给人留下好印象',
      sad: '建议保持更积极的表情，展现对职位的热情',
      angry: '注意控制情绪，保持平和友善的表情',
      fearful: '建议放松心态，展现自信的一面',
      neutral: '表情自然得体，保持了专业的面试状态',
    };

    if (emotionFeedback[dominantEmotion]) {
      feedback.push(emotionFeedback[dominantEmotion]);
    }

    const leftGaze = gazeDistribution['left'] || 0;
    const rightGaze = gazeDistribution['right'] || 0;
    if (leftGaze > 0.3 || rightGaze > 0.3) {
      feedback.push('建议减少视线游离，保持对面试官的关注');
    }

    if (feedback.length === 0) {
      feedback.push('整体表现良好，继续保持专业的面试状态');
    }

    return feedback;
  }
}
