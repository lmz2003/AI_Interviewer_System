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
  
  // 各维度评分
  overallScore!: number;           // 总体评分 (0-100)
  completenessScore!: number;      // 完整性评分
  keywordScore!: number;           // 关键词覆盖度
  formatScore!: number;            // 格式规范性
  experienceScore!: number;        // 工作经验评分
  skillsScore!: number;            // 技能评分
  
  // 分析内容（JSON 字符串）
  keywordAnalysis?: string;        // 关键词分析
  contentAnalysis?: string;        // 内容分析
  jobMatchAnalysis?: string;       // 岗位匹配度分析
  competencyAnalysis?: string;     // 能力素质评估
  detailedReport?: string;         // 详细分析报告
  
  createdAt!: Date;
  analysisStage?: number;          // 分析进度阶段 (0-5)
}
