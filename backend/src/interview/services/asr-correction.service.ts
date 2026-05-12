import { Injectable } from '@nestjs/common';

export interface CorrectionContext {
  jobPosition?: string;
  resumeKeywords?: string[];
  recentMessages?: Array<{ role: 'user' | 'assistant'; text: string }>;
  industry?: string;
}

export interface CorrectionResult {
  originalText: string;
  correctedText: string;
  wasCorrected: boolean;
}

@Injectable()
export class AsrCorrectionService {
  async correctTranscription(
    rawText: string,
    _context: CorrectionContext = {},
  ): Promise<CorrectionResult> {
    return {
      originalText: rawText,
      correctedText: rawText,
      wasCorrected: false,
    };
  }

  isEnabled(): boolean {
    return false;
  }

  setEnabled(_enabled: boolean): void {
    // 纠错功能已移除
  }
}
