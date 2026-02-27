import { Injectable, Logger } from '@nestjs/common';
import { ResumeLLMService } from './resume-llm.service';
import { COMMON_KEYWORDS } from '../constants/keywords';

interface AnalysisResult {
  overallScore: number;
  completenessScore: number;
  keywordScore: number;
  experienceScore: number;
  skillsScore: number;
  keywordAnalysis: {
    keywords: { [key: string]: number };
    categoryScores: { [key: string]: number };
  };
  contentAnalysis: {
    totalWords: number;
    sections: {
      [key: string]: number;
    };
  };
  jobMatchAnalysis?: {
    matchScore: number;
    matchingSkills: string[];
    missingSkills: string[];
    jobSpecificSuggestions: string[];
  };
  competencyAnalysis?: {
    coreCompetencies: string[];
    technicalSkillsLevel: string;
    projectExperienceValue: string;
    careerPotential: string;
  };
  detailedReport?: string;
  resumeType?: 'freshman' | 'experienced';  // ✨ 新增：简历类型识别
}

@Injectable()
export class ResumeAnalyzerService {
  private readonly logger = new Logger(ResumeAnalyzerService.name);

  constructor(private resumeLLMService: ResumeLLMService) {}

  private readonly commonKeywords = COMMON_KEYWORDS;


   /**
   * 主分析方法（优化：根据简历类型差异化评分）
   */
  async analyzeResume(text: string, parsedData: any, jobDescription?: string, jobTitle?: string): Promise<AnalysisResult> {
    // ✨ 第一步：识别简历类型
    const resumeType = this.detectResumeType(parsedData);

    // ✨ 第二步：根据简历类型进行差异化评分
    const [keywordScoreData, completenessScore, experienceScore, skillsScore] = await Promise.all([
      this.calculateKeywordScore(text, jobDescription, jobTitle),
      Promise.resolve(this.calculateCompletenessScore(text, parsedData, resumeType)),
      Promise.resolve(this.calculateExperienceScore(parsedData, resumeType)),
      this.calculateSkillsScore(parsedData.skills, jobTitle || '', jobDescription)
    ]);

    const scores = {
      completenessScore,
      keywordScoreData,
      experienceScore,
      skillsScore,
    };

    // ✨ 第三步：计算总体评分（加权平均）
    // 注：权重已经在各个评分方法内进行了差异化处理
    // ✨ formatScore 已合并到 completenessScore，调整权重
    const overallScore = Math.round(
      scores.completenessScore * 0.25 +
      scores.keywordScoreData.score * 0.2 +
      scores.experienceScore * 0.25 +
      scores.skillsScore * 0.3
    );

    // ✨ 第四步：使用LLM生成详细分析报告（包含优势、劣势、建议）
    const basicScores = {
      overallScore,
      completenessScore: scores.completenessScore,
      keywordScore: scores.keywordScoreData.score,
      experienceScore: scores.experienceScore,
      skillsScore: scores.skillsScore,
    };
    
    const detailedReport = await this.resumeLLMService.generateDetailedAnalysisReport(text, parsedData, basicScores,resumeType);
    
    // // ✨ 从详细报告中提取优势、劣势、建议（避免重复调用LLM）
    // const { strengths, weaknesses, suggestions } = this.extractAnalysisFromDetailedReport(detailedReport);

    // ✨ 第五步：生成岗位匹配度分析
    let jobMatchAnalysis = undefined;
    if (jobDescription) {
      jobMatchAnalysis = await this.generateJobMatchAnalysis(text, jobDescription);
    }

    // ✨ 第六步：生成能力素质评估
    const competencyAnalysis = await this.generateCompetencyAnalysis(text, parsedData, resumeType);

    const contentAnalysis = this.analyzeContent(text, parsedData);

    return {
      overallScore,
      completenessScore: scores.completenessScore,
      keywordScore: scores.keywordScoreData.score,
      experienceScore: scores.experienceScore,
      skillsScore: scores.skillsScore,
      detailedReport,
      resumeType,  // ✨ 返回简历类型
      keywordAnalysis: {
        keywords: scores.keywordScoreData.keywords,
        categoryScores: scores.keywordScoreData.categoryScores
      },
      contentAnalysis,
      jobMatchAnalysis,
      competencyAnalysis,
    };
  }
  /**
   * 识别简历类型：校招生 vs 社招
   * freshman: 校招生（应届毕业生、在校学生）
   * experienced: 社招（有工作经验的专业人士）
   */
  private detectResumeType(parsedData: any): 'freshman' | 'experienced' {
    // 指标1：工作经验数量
    const workExperienceCount = parsedData.workExperience?.length || 0;
    
    // 指标2：实习经验数量
    const internshipCount = parsedData.internshipExperience?.length || 0;
    
    // 指标3：校园活动
    const campusExperienceCount = parsedData.campusExperience?.length || 0;
    
    // 指标4：社招特有字段（公司信息、管理经验、离职原因等）
    const hasSocialRecruitmentInfo = parsedData.workExperience?.some((exp: any) => 
      exp.companyType || exp.companyIndustry || exp.teamSize || exp.managementLevel
    );
    
    // 指标5：工作经验时长总和
    let totalWorkMonths = 0;
    if (parsedData.workExperience) {
      for (const exp of parsedData.workExperience) {
        // 简单估算：如果有日期信息就认为有一定时长
        if (exp.startDate && exp.endDate) {
          totalWorkMonths += 12; // 保守估算每个经验12个月
        }
      }
    }
    
    // 判断逻辑
    // 如果有社招特有字段或工作经验 > 2个，则为社招
    // 如果主要是校园活动和实习，则为校招
    if (workExperienceCount > 2 || hasSocialRecruitmentInfo || totalWorkMonths > 24) {
      return 'experienced';
    } else if (campusExperienceCount > 2 || internshipCount >= 2) {
      return 'freshman';
    } else if (workExperienceCount > 0) {
      return 'experienced';
    } else {
      return 'freshman';
    }
  }

  /**
   * 计算完整性评分 + 规范性评分（合并版本）
   * ✨ 合并 calculateCompletenessScore 和 calculateFormatScore
   * 综合评价：内容是否完整 + 格式是否规范
   */
  private calculateCompletenessScore(text: string, parsedData: any, resumeType: 'freshman' | 'experienced'): number {
    let score = 0;
    let maxScore = 0;

    // ========== 第一部分：内容完整性（根据简历类型差异化）==========
    if (resumeType === 'freshman') {
      // 校招生重点：教育背景、项目/实习、校园活动、技能
      const freshmanSections = [
        { name: 'personalInfo', weight: 10 },
        { name: 'education', weight: 25 },              // ⭐ 权重提升（校招重点）
        { name: 'internshipExperience', weight: 20 },   // ⭐ 实习重要
        { name: 'skills', weight: 15 },
        { name: 'projects', weight: 15 },               // ⭐ 项目重要
        { name: 'campusExperience', weight: 10 },       // ⭐ 校园活动
      ];

      for (const section of freshmanSections) {
        maxScore += section.weight;
        if (parsedData[section.name] && this.isNotEmpty(parsedData[section.name])) {
          score += section.weight;
        }
      }

      // 加分项：获奖和论文
      if (parsedData.awards && parsedData.awards.length > 0) {
        score += 5;
      }
      if (parsedData.publications && parsedData.publications.length > 0) {
        score += 5;
      }
      maxScore += 10;  // 加分项总上限10分
    } else {
      // 社招重点：工作经验、技能、项目成果、职业总结
      const experiencedSections = [
        { name: 'personalInfo', weight: 10 },
        { name: 'professionalSummary', weight: 10 },    // ⭐ 职业总结重要
        { name: 'workExperience', weight: 35 },         // ⭐ 权重最高
        { name: 'skills', weight: 20 },
        { name: 'projects', weight: 15 },               // ⭐ 项目成果
      ];

      for (const section of experiencedSections) {
        maxScore += section.weight;
        if (parsedData[section.name] && this.isNotEmpty(parsedData[section.name])) {
          score += section.weight;
        }
      }

      // 加分项：教育、认证
      if (parsedData.education && parsedData.education.length > 0) {
        score += 5;
      }
      if (parsedData.certifications && parsedData.certifications.length > 0) {
        score += 5;
      }
      maxScore += 10;  // 加分项总上限10分
    }

    // ========== 第二部分：格式规范性检查 ==========
    const wordCount = text.split(/\s+/).length;
    
    // 1. 长度规范性（0-10分）
    if (wordCount >= 200 && wordCount <= 1500) {
      score += 10;  // 优秀
    } else if (wordCount >= 100 && wordCount <= 2000) {
      score += 6;   // 良好
    } else if (wordCount > 0) {
      score += 2;   // 一般
    }
    maxScore += 10;

    // 2. 内容重复度检查（0-10分）
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) {
      const uniqueRatio = new Set(lines).size / lines.length;
      
      if (uniqueRatio > 0.9) {
        score += 10;  // 极少重复
      } else if (uniqueRatio > 0.75) {
        score += 7;   // 小量重复
      } else if (uniqueRatio > 0.6) {
        score += 4;   // 中量重复
      }
    }
    maxScore += 10;

    // ========== 最终评分 ==========
    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  /**
   * 计算关键词评分（支持岗位特定关键词和权重）
   * 📊 方案5：综合评分制 - 考虑匹配数量+权重+合理上限
   */
  private async calculateKeywordScore(
    text: string, 
    jobDescription?: string,
    jobTitle?: string
  ): Promise<{ score: number; keywords: { [key: string]: number }; categoryScores: { [key: string]: number } }> {
    // 1. 准备文本（支持中英文）
    const textLower = text.toLowerCase();
    const foundKeywords: { [key: string]: number } = {};
    const categoryScores: { [key: string]: number } = {};
    const categoryMatchCounts: { [key: string]: number } = {};  // ✨ 记录每个类别的匹配数量
    let totalScore = 0;

    // 2. 定义关键词类别权重
    const categoryWeights = {
      skills: 3,          // 技能关键词权重最高
      experience: 2.5,    // 经验关键词权重次之
      education: 1.5,     // 教育关键词权重较低
      jobSpecific: 3.5,   // 岗位特定关键词权重最高
    };

    // ✨ 每个类别的合理上限（避免基数过大）
    const MAX_KEYWORDS_PER_CATEGORY = 20;

    // 3. 基础关键词匹配
    for (const category in this.commonKeywords) {
      const weight = categoryWeights[category as keyof typeof categoryWeights] || 1;
      let categoryScore = 0;
      let matchCount = 0;

      for (const keyword of (this.commonKeywords as any)[category]) {
        // ✨ 改进：中英文分别处理
        const isChineseKeyword = /[\u4e00-\u9fff]/.test(keyword);
        const isMatched = isChineseKeyword 
          ? text.includes(keyword)  // 中文关键词直接匹配（不转小写）
          : textLower.includes(keyword.toLowerCase());  // 英文关键词转小写后匹配

        if (isMatched && !foundKeywords[keyword]) {
          // ✨ 改进：关键词只计算一次（去重），避免重复累加
          foundKeywords[keyword] = 1;
          matchCount++;

          // ✨ 只在未达到上限时累加分数
          if (matchCount <= MAX_KEYWORDS_PER_CATEGORY) {
            categoryScore += weight;  // 每个关键词贡献其权重分
            totalScore += weight;
          }
        }
      }

      if (matchCount > 0) {
        categoryMatchCounts[category] = matchCount;
        categoryScores[category] = categoryScore;
      }
    }

    // 4. 如果提供了职位描述，使用LLM提取岗位特定关键词并评分
    let jobSpecificMatchCount = 0;
    if (jobDescription) {
      const jobSpecificKeywords = await this.extractJobSpecificKeywords(jobDescription, jobTitle || '');
      
      for (const keyword of jobSpecificKeywords) {
        if (!foundKeywords[keyword]) {  // ✨ 避免与基础关键词重复
          const isChineseKeyword = /[\u4e00-\u9fff]/.test(keyword);
          const isMatched = isChineseKeyword 
            ? text.includes(keyword)
            : textLower.includes(keyword.toLowerCase());

          if (isMatched) {
            foundKeywords[keyword] = 1;
            jobSpecificMatchCount++;

            // ✨ 岗位特定关键词也有上限
            if (jobSpecificMatchCount <= MAX_KEYWORDS_PER_CATEGORY) {
              const keywordScore = categoryWeights.jobSpecific;
              categoryScores.jobSpecific = (categoryScores.jobSpecific || 0) + keywordScore;
              totalScore += keywordScore;
            }
          }
        }
      }
      
      if (jobSpecificMatchCount > 0) {
        categoryMatchCounts.jobSpecific = jobSpecificMatchCount;
      }
    }

    // 5. 计算最大可能分数（综合评分制）
    // ✨ 只计算实际有匹配的类别的最大分数
    let maxScore = 0;
    for (const category in categoryMatchCounts) {
      const weight = categoryWeights[category as keyof typeof categoryWeights] || 1;
      // 最多取 MAX_KEYWORDS_PER_CATEGORY 个关键词的权重
      const categoryMaxScore = Math.min(
        categoryMatchCounts[category],
        MAX_KEYWORDS_PER_CATEGORY
      ) * weight;
      maxScore += categoryMaxScore;
    }

    // ✨ 安全保护：确保分母不为0
    const normalizedScore = maxScore > 0
      ? Math.min(100, Math.round((totalScore / maxScore) * 100))
      : 0;

    return { 
      score: normalizedScore, 
      keywords: foundKeywords,
      categoryScores 
    };
  }

  /**
   * 使用LLM提取岗位特定关键词 ✨ 改进：通过公共方法调用而不是直接访问私有属性
   */
  private async extractJobSpecificKeywords(jobDescription: string, jobTitle: string): Promise<string[]> {
    return this.resumeLLMService.extractJobSpecificKeywords(jobDescription, jobTitle);
  }

  /**
   * 计算工作经验评分（差异化：校招 vs 社招）
   * ✨ 改进：标准化为0-100分制
   */
  private calculateExperienceScore(parsedData: any, resumeType: 'freshman' | 'experienced'): number {
    let score = 0;
    let maxScore = 0;

    if (resumeType === 'freshman') {
      // ========== 校招生：看实习和项目经验 ==========
      // 总最高分：100分
      
      const internshipCount = parsedData.internshipExperience?.length || 0;
      const projectCount = parsedData.projects?.length || 0;
      const campusCount = parsedData.campusExperience?.length || 0;
      
      // 1. 实习经验（0-35分）
      maxScore += 35;
      if (internshipCount > 0) {
        score += internshipCount >= 2 ? 35 : 20;
      }
      
      // 2. 项目经验（0-30分）
      maxScore += 30;
      if (projectCount > 0) {
        score += projectCount >= 2 ? 30 : 15;
      }
      
      // 3. 校园活动（0-15分）
      maxScore += 15;
      if (campusCount > 0) {
        score += campusCount >= 2 ? 15 : 8;
      }
      
      // 4. 描述详细程度（0-20分）
      const allExperiences = [
        ...(parsedData.internshipExperience || []),
        ...(parsedData.projects || []),
        ...(parsedData.campusExperience || []),
      ];
      
      maxScore += 20;
      if (allExperiences.length > 0) {
        const detailedCount = allExperiences.filter(
          (exp: any) => exp.description && exp.description.trim().length > 100
        ).length;
        score += (detailedCount / allExperiences.length) * 20;
      }
    } else {
      // ========== 社招：看工作经验深度和职级 ==========
      // 总最高分：100分
      
      const workExperience = parsedData.workExperience || [];
      const workCount = workExperience.length;
      
      if (workCount === 0) return 0;
      
      // 1. 工作经验数量基础分（0-40分）
      maxScore += 40;
      if (workCount === 1) score += 20;
      else if (workCount === 2) score += 30;
      else if (workCount >= 3) score += 40;
      
      // 2. 管理经验（0-20分）
      maxScore += 20;
      const hasManagementExp = workExperience.some((exp: any) =>
        exp.managementLevel || exp.teamSize || exp.reportsTo
      );
      if (hasManagementExp) {
        score += 20;
      }
      
      // 3. 工作描述详细程度（0-25分）
      maxScore += 25;
      const detailedCount = workExperience.filter(
        (exp: any) => exp.description && exp.description.trim().length > 100
      ).length;
      score += (detailedCount / Math.max(workCount, 1)) * 25;
      
      // 4. 业绩成就（0-15分）
      maxScore += 15;
      const hasAchievements = workExperience.some((exp: any) =>
        exp.achievements && exp.achievements.length > 0
      );
      if (hasAchievements) {
        score += 15;
      }
    }

    // 归一化到0-100分
    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  /**
   * 计算技能评分（支持行业和职位特定的高价值技能）
   * ✨ 改进：使用结构化的高价值技能，精确匹配英文关键字
   */
  private async calculateSkillsScore(skills: string[], jobTitle: string, jobDescription?: string): Promise<number> {
    if (!skills || skills.length === 0) {
      return 0;
    }

    let score = 0;
    let maxScore = 0;

    // 1. 基础分：有技能列表（0-20分）
    maxScore += 20;
    score += 20;

    // 2. 按技能数量加分（0-30分）
    // 数量越多越好，但有上限
    maxScore += 30;
    const quantityScore = Math.min(30, skills.length * 3);
    score += quantityScore;

    // 3. 检查技能多样性（0-20分）
    maxScore += 20;
    const uniqueSkills = new Set(skills.map(s => s.toLowerCase()));
    const diversity = uniqueSkills.size / Math.max(1, skills.length);

    if (diversity > 0.8) {
      score += 20;  // 极少重复，很多样
    } else if (diversity > 0.6) {
      score += 12;  // 中等多样化
    } else if (diversity > 0.4) {
      score += 6;   // 一些重复
    }

    // 4. 检查是否包含高价值技能（0-30分）
    maxScore += 30;
    if (jobDescription) {
      const jobSpecificHighValueSkills = await this.resumeLLMService.extractJobSpecificHighSkills(jobDescription, jobTitle);
      
      // ✨ 改进：遍历高价值技能，检查关键字匹配
      const matchedHighValueSkills = new Set<string>();
      
      for (const highValueSkill of jobSpecificHighValueSkills) {
        const skillLower = highValueSkill.name.toLowerCase();
        const keywords = highValueSkill.keywords;
        
        // 检查简历中是否有匹配的技能
        const hasMatch = skills.some(resumeSkill => {
          const resumeSkillLower = resumeSkill.toLowerCase();
          
          // 1. 直接名称匹配
          if (resumeSkillLower === skillLower) {
            return true;
          }
          
          // 2. 包含匹配
          if (resumeSkillLower.includes(skillLower)) {
            return true;
          }
          
          // 3. 关键字匹配：检查任何关键字是否出现在简历技能中
          return keywords.some(keyword => 
            resumeSkillLower.includes(keyword.toLowerCase())
          );
        });
        
        if (hasMatch) {
          matchedHighValueSkills.add(highValueSkill.name);
        }
      }
      
      // 按匹配数量计分
      const matchCount = matchedHighValueSkills.size;
      if (matchCount >= jobSpecificHighValueSkills.length) {
        // 全部匹配
        score += 30;
      } else if (matchCount >= Math.ceil(jobSpecificHighValueSkills.length * 0.5)) {
        // 至少50%匹配
        score += 20;
      } else if (matchCount > 0) {
        // 部分匹配
        score += 10;
      }
    }

    // ✨ 归一化到0-100分
    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }


  /**
   * 生成优势分析（差异化：校招 vs 社招）
   */
  private generateStrengths(parsedData: any, scores: any, resumeType: 'freshman' | 'experienced'): string[] {
    const strengths: string[] = [];

    if (resumeType === 'freshman') {
      // ========== 校招生优势 ==========
      if (scores.completenessScore > 75) {
        strengths.push('简历结构完整，包含了所有关键部分');
      }

      if (parsedData.education && parsedData.education.length > 0) {
        strengths.push('教育背景清晰，展示了扎实的学习基础');
      }

      if (parsedData.internshipExperience && parsedData.internshipExperience.length >= 2) {
        strengths.push('实习经验丰富，展示了职场适应能力');
      }

      if (parsedData.projects && parsedData.projects.length >= 2) {
        strengths.push('项目案例充分，展示了技术实战能力');
      }

      if (parsedData.campusExperience && parsedData.campusExperience.length > 0) {
        strengths.push('校园活动经验丰富，展示了综合能力和组织能力');
      }

      if (parsedData.publications && parsedData.publications.length > 0) {
        strengths.push('学术成果突出，发表过相关论文或研究');
      }

      if (scores.skillsScore > 70) {
        strengths.push('技能列表全面，展示了掌握的关键技术');
      }
    } else {
      // ========== 社招优势 ==========
      if (scores.completenessScore > 75) {
        strengths.push('简历结构完整，信息层次清晰');
      }

      if (parsedData.workExperience && parsedData.workExperience.length >= 3) {
        strengths.push('工作经验丰富，展示了明确的职业发展轨迹');
      }

      // 检查管理经验
      const hasManagementExp = parsedData.workExperience?.some((exp: any) =>
        exp.managementLevel || exp.teamSize
      );
      if (hasManagementExp) {
        strengths.push('具备团队管理或领导经验，展示了承担更大责任的能力');
      }

      // 检查成就
      const hasAchievements = parsedData.workExperience?.some((exp: any) =>
        exp.achievements && exp.achievements.length > 0
      );
      if (hasAchievements) {
        strengths.push('明确的成就记录，展示了实际的业务成果');
      }

      if (parsedData.projects && parsedData.projects.length > 0) {
        strengths.push('项目成果清晰，展示了解决实际问题的能力');
      }

      if (scores.skillsScore > 70) {
        strengths.push('技能体系完整，覆盖多个技术领域和工具');
      }
    }

    // 如果没有发现特殊优势，给出通用反馈
    if (strengths.length === 0) {
      strengths.push('简历包含了基本的职业信息');
    }

    return strengths;
  }

  /**
   * 生成劣势分析（差异化：校招 vs 社招）
   */
  private generateWeaknesses(parsedData: any, scores: any, text: string, resumeType: 'freshman' | 'experienced'): string[] {
    const weaknesses: string[] = [];

    if (resumeType === 'freshman') {
      // ========== 校招生劣势 ==========
      if (scores.completenessScore < 60) {
        weaknesses.push('简历结构不够完整，缺少某些关键部分');
      }

      if (!parsedData.education || parsedData.education.length === 0) {
        weaknesses.push('缺少教育背景信息，这是校招评估的重要部分');
      }

      if (!parsedData.internshipExperience || parsedData.internshipExperience.length === 0) {
        weaknesses.push('缺少实习经验，建议补充在企业或项目中的实战经历');
      } else if (parsedData.internshipExperience.length < 2) {
        weaknesses.push('实习经验偏少，建议补充更多实习案例');
      }

      if (!parsedData.projects || parsedData.projects.length === 0) {
        weaknesses.push('缺少项目案例，建议添加代表作或毕设项目');
      }

      if (!parsedData.skills || parsedData.skills.length < 5) {
        weaknesses.push('技能列表不够详细，建议补充具体掌握的技术栈');
      }

      if (!parsedData.campusExperience || parsedData.campusExperience.length === 0) {
        weaknesses.push('缺少校园活动经验，建议补充学生会、社团等活动');
      }
    } else {
      // ========== 社招劣势 ==========
      if (scores.completenessScore < 60) {
        weaknesses.push('简历信息层次不清晰，建议重新组织内容');
      }

      if (!parsedData.workExperience || parsedData.workExperience.length === 0) {
        weaknesses.push('缺少工作经验，这是社招评估的核心');
      } else if (parsedData.workExperience.length < 2) {
        weaknesses.push('工作经验偏少，建议详细补充职业历程');
      }

      // 检查管理经验
      const hasManagementExp = parsedData.workExperience?.some((exp: any) =>
        exp.managementLevel || exp.teamSize
      );
      if (!hasManagementExp && parsedData.workExperience && parsedData.workExperience.length >= 3) {
        weaknesses.push('缺少团队管理或领导经验，这对高级职位很关键');
      }

      // 检查成就
      const hasAchievements = parsedData.workExperience?.some((exp: any) =>
        exp.achievements && exp.achievements.length > 0
      );
      if (!hasAchievements) {
        weaknesses.push('缺少明确的成就记录，建议用数据和案例展示业务成果');
      }

      if (!parsedData.projects || parsedData.projects.length === 0) {
        weaknesses.push('缺少主要项目描述，建议补充核心项目成果');
      }

      if (!parsedData.skills || parsedData.skills.length < 8) {
        weaknesses.push('技能描述不够全面，建议补充核心技能和领域专长');
      }

      if (!parsedData.professionalSummary) {
        weaknesses.push('缺少专业总结，建议添加职业目标和核心优势概述');
      }
    }

    // 检查格式问题（通用）
    const lines = text.split('\n');
    if (lines.length > 100) {
      weaknesses.push('内容过长，建议精简到1-2页');
    }

    if (scores.keywordScore < 50) {
      weaknesses.push('缺少行业关键词，可能影响搜索排名');
    }

    if (weaknesses.length === 0) {
      weaknesses.push('暂未发现明显缺陷');
    }

    return weaknesses;
  }


  /**
   * 生成改进建议（差异化：校招 vs 社招）
   */
  private generateSuggestions(parsedData: any, scores: any, resumeType: 'freshman' | 'experienced'): { [key: string]: string } {
    const suggestions: { [key: string]: string } = {};

    // 个人信息建议（通用）
    if (!parsedData.personalInfo || !parsedData.personalInfo.name) {
      suggestions['personalInfo'] =
        '添加清晰的个人信息部分，包括姓名、联系方式和职业头衔（如有）';
    }

    if (resumeType === 'freshman') {
      // ========== 校招生建议 ==========

      // 教育背景建议（校招重点）
      if (!parsedData.education || parsedData.education.length === 0) {
        suggestions['education'] = '添加教育背景，包括学校、专业、学位、GPA（如突出）和预期毕业时间';
      } else {
        suggestions['education'] = '在教育背景中突出GPA、荣誉学位或相关课程，展示学术实力';
      }

      // 实习经验建议
      if (!parsedData.internshipExperience || parsedData.internshipExperience.length === 0) {
        suggestions['internship'] = '补充实习经验，详细说明实习公司、职位、时间和具体工作内容';
      } else if (parsedData.internshipExperience.length === 1) {
        suggestions['internship'] = '补充更多实习经验（建议2-3个），展示不同行业或岗位的工作经验';
      }

      // 项目经验建议
      if (!parsedData.projects || parsedData.projects.length === 0) {
        suggestions['projects'] = '添加2-3个代表性项目（可以是学校项目、竞赛或个人作品），说明项目背景、技术栈和成果';
      } else {
        suggestions['projects'] = '项目描述中要突出技术选择的原因和你的贡献，体现技术深度';
      }

      // 校园活动建议
      if (!parsedData.campusExperience || parsedData.campusExperience.length === 0) {
        suggestions['campus'] = '补充校园活动经验（学生会、社团、班级干部等），展示领导力和组织能力';
      } else {
        suggestions['campus'] = '校园活动中要突出你承担的责任和取得的具体成果';
      }

      // 技能建议
      if (!parsedData.skills || parsedData.skills.length < 5) {
        suggestions['skills'] = '补充技能列表，列出掌握的编程语言、框架和开发工具';
      } else {
        suggestions['skills'] = '按照掌握程度和相关性排序技能，重点突出与应聘岗位相关的核心技能';
      }

      // 论文建议
      if (parsedData.publications && parsedData.publications.length > 0) {
        suggestions['publications'] = '论文成果是亮点，建议在教育部分突出论文信息（期刊、会议等）';
      }

      // 获奖建议
      if (!parsedData.awards || parsedData.awards.length === 0) {
        suggestions['awards'] = '如有竞赛获奖、奖学金等荣誉，建议单独列出，展示综合实力';
      }

    } else {
      // ========== 社招建议 ==========

      // 专业总结建议（社招重点）
      if (!parsedData.professionalSummary) {
        suggestions['summary'] =
          '添加2-3句的职业总结，明确表达你的职业定位、核心竞争力和求职目标';
      } else {
        suggestions['summary'] = '职业总结中要突出行业经验、领域专长和职级成就，帮助招聘方快速了解';
      }

      // 工作经验建议（社招核心）
      if (!parsedData.workExperience || parsedData.workExperience.length === 0) {
        suggestions['experience'] = '详细描述工作经验，使用STAR方法（情景、任务、行动、结果）展示成就和影响力';
      } else {
        suggestions['experience'] = '用数据和具体案例证明成果（如"提升转化率30%"、"管理10人技术团队"），突出商业价值';
      }

      // 管理经验建议
      const hasManagementExp = parsedData.workExperience?.some((exp: any) =>
        exp.managementLevel || exp.teamSize
      );
      if (!hasManagementExp && parsedData.workExperience && parsedData.workExperience.length >= 3) {
        suggestions['management'] = '如有团队管理经验，建议在工作描述中明确突出团队规模、直接下属和管理成果';
      } else if (hasManagementExp) {
        suggestions['management'] = '管理经验是竞争力，建议详细说明团队规模、团队成绩、人才培养等管理成果';
      }

      // 技能建议
      if (!parsedData.skills || parsedData.skills.length < 8) {
        suggestions['skills'] = '补充核心技能和领域专长（工具、方法论、行业知识等），突出职业深度和广度';
      } else {
        suggestions['skills'] = '按照与岗位的相关性排序技能，标注掌握深度（精通/熟悉/了解），优化关键词密度';
      }

      // 项目案例建议
      if (!parsedData.projects || parsedData.projects.length === 0) {
        suggestions['projects'] = '补充1-3个重点项目成果，说明项目规模、你的职责、使用技术和业务成果';
      } else {
        suggestions['projects'] = '项目描述中要突出商业影响力和你的核心贡献，用数据说话';
      }

      // 教育背景建议（社招次要）
      if (parsedData.education && parsedData.education.length > 0) {
        suggestions['education'] = '教育背景可简化，重点突出相关学位和学校，不用详细列出GPA';
      }

      // 证书建议
      if (!parsedData.certifications || parsedData.certifications.length === 0) {
        suggestions['certifications'] = '如有行业认可的证书（如PMP、CPA等），建议列出并说明相关性';
      }
    }

    // 格式建议（通用）
    suggestions['format'] = '确保简历排版清晰、字体一致、内容不超过1-2页，突出视觉层级';

    return suggestions;
  }



  /**
   * 内容分析
   */
  private analyzeContent(text: string, parsedData: any): {
    totalWords: number;
    sections: { [key: string]: number };
  } {
    const words = text.split(/\s+/).length;
    const sections: { [key: string]: number } = {
      personalInfo: parsedData.personalInfo ? 1 : 0,
      workExperience: parsedData.workExperience ? parsedData.workExperience.length : 0,
      education: parsedData.education ? parsedData.education.length : 0,
      skills: parsedData.skills ? parsedData.skills.length : 0,
      projects: parsedData.projects ? parsedData.projects.length : 0,
      certifications: parsedData.certifications ? parsedData.certifications.length : 0,
    };

    return {
      totalWords: words,
      sections,
    };
  }

  /**
   * ✨ 新增：从详细分析报告中提取优势、劣势、建议
   * 避免重复调用LLM（原第五步已废弃）
   */
  private extractAnalysisFromDetailedReport(reportContent: string): {
    strengths: string[];
    weaknesses: string[];
    suggestions: { [key: string]: string };
  } {
    try {
      if (!reportContent) {
        return {
          strengths: [],
          weaknesses: [],
          suggestions: {}
        };
      }

      let reportData: any;
      try {
        const jsonMatch = reportContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          reportData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        this.logger.error('Error parsing detailed report JSON:', parseError);
        return {
          strengths: [],
          weaknesses: [],
          suggestions: {}
        };
      }

      const strengths = Array.isArray(reportData.strengths) ? reportData.strengths : [];
      const weaknesses = Array.isArray(reportData.improvements) ? reportData.improvements : [];
      
      // 将建议数组转换为对象格式
      const suggestionsList = Array.isArray(reportData.suggestions) ? reportData.suggestions : [];
      const suggestions: { [key: string]: string } = {};
      
      if (suggestionsList.length > 0) {
        suggestions.structure = suggestionsList[0] || '';
      }
      if (suggestionsList.length > 1) {
        suggestions.experience = suggestionsList[1] || '';
      }
      if (suggestionsList.length > 2) {
        suggestions.skills = suggestionsList[2] || '';
      }
      if (suggestionsList.length > 3) {
        suggestions.format = suggestionsList[3] || '';
      }
      if (suggestionsList.length > 4) {
        suggestions.keywords = suggestionsList[4] || '';
      }

      return { strengths, weaknesses, suggestions };
    } catch (error) {
      this.logger.error('Error extracting analysis from detailed report:', error);
      return {
        strengths: [],
        weaknesses: [],
        suggestions: {}
      };
    }
  }

  /**
   * 生成岗位匹配度分析
   */
  private async generateJobMatchAnalysis(resumeContent: string, jobDescription: string): Promise<{
    matchScore: number;
    matchingSkills: string[];
    missingSkills: string[];
    jobSpecificSuggestions: string[];
  }> {
    try {
      const matchAnalysis = await this.resumeLLMService.generateJobMatchAnalysis(resumeContent, jobDescription);
      
      if (!matchAnalysis) {
        return {
          matchScore: 5,
          matchingSkills: [],
          missingSkills: [],
          jobSpecificSuggestions: [],
        };
      }
      
      let analysisResult: any;
      try {
        const jsonMatch = matchAnalysis.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        this.logger.error('Error parsing job match analysis JSON:', parseError);
        return {
          matchScore: 5,
          matchingSkills: [],
          missingSkills: [],
          jobSpecificSuggestions: [],
        };
      }
      
      return {
        matchScore: analysisResult.matchScore || 5,
        matchingSkills: Array.isArray(analysisResult.matchingSkills) ? analysisResult.matchingSkills : [],
        missingSkills: Array.isArray(analysisResult.missingSkills) ? analysisResult.missingSkills : [],
        jobSpecificSuggestions: Array.isArray(analysisResult.suggestions) ? analysisResult.suggestions : [],
      };
    } catch (error) {
      this.logger.error('Error generating job match analysis:', error);
      return {
        matchScore: 5,
        matchingSkills: [],
        missingSkills: [],
        jobSpecificSuggestions: [],
      };
    }
  }

  /**
   * 生成能力素质评估
   */
  private async generateCompetencyAnalysis(text: string, parsedData: any, resumeType: 'freshman' | 'experienced'): Promise<{
    coreCompetencies: string[];
    technicalSkillsLevel: string;
    projectExperienceValue: string;
    careerPotential: string;
  }> {
    try {
      const response = await this.resumeLLMService.generateCompetencyAnalysis(text, parsedData, resumeType);
      
      if (!response) {
        return {
          coreCompetencies: [],
          technicalSkillsLevel: '一般',
          projectExperienceValue: '一般',
          careerPotential: '一般',
        };
      }
      
      let analysisResult: any;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        this.logger.error('Error parsing competency analysis JSON:', parseError);
        return {
          coreCompetencies: [],
          technicalSkillsLevel: '一般',
          projectExperienceValue: '一般',
          careerPotential: '一般',
        };
      }
      
      return {
        coreCompetencies: Array.isArray(analysisResult.coreCompetencies) ? analysisResult.coreCompetencies : [],
        technicalSkillsLevel: analysisResult.technicalSkillsLevel || '一般',
        projectExperienceValue: analysisResult.projectExperienceValue || '一般',
        careerPotential: analysisResult.careerPotential || '一般',
      };
    } catch (error) {
      this.logger.error('Error generating competency analysis:', error);
      return {
        coreCompetencies: [],
        technicalSkillsLevel: '一般',
        projectExperienceValue: '一般',
        careerPotential: '一般',
      };
    }
  }

  /**
   * 检查对象是否为非空
   */
  private isNotEmpty(obj: any): boolean {
    if (!obj) return false;
    if (typeof obj === 'string') return obj.trim().length > 0;
    if (Array.isArray(obj)) return obj.length > 0;
    if (typeof obj === 'object') return Object.keys(obj).length > 0;
    return false;
  }
}
