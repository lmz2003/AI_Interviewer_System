export class ResumeResponseDto {
  id!: string;
  title!: string;
  fileName?: string;
  fileType!: string;
  createdAt!: Date;
  updatedAt!: Date;
  status!: string;
  isProcessed!: boolean;
  parsedData?: Record<string, any>;
}

export class ResumeAnalysisResponseDto {
  id!: string;
  resumeId!: string;
  overallScore!: number;
  completenessScore!: number;
  keywordScore!: number;
  formatScore!: number;
  experienceScore!: number;
  skillsScore!: number;
  strengths?: string;
  weaknesses?: string;
  suggestions?: string;
  keywordAnalysis?: string;
  structureAnalysis?: string;
  contentAnalysis?: string;
  personalInfoSuggestions?: Record<string, any>;
  summaryOptimization?: Record<string, any>;
  experienceSuggestions?: Record<string, any>[];
  skillsSuggestions?: Record<string, any>;
  formatIssues?: Record<string, any>[];
  createdAt!: Date;
}
