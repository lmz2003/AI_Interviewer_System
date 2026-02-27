import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

@Injectable()
export class ResumeLLMService {
  private llm: ChatOpenAI;
  private readonly logger = new Logger(ResumeLLMService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('LLM_API_KEY');
    const baseUrl = this.configService.get<string>('LLM_BASE_URL');
    const modelName = this.configService.get<string>('LLM_MODEL') || 'gpt-3.5-turbo';
    const provider = this.configService.get<string>('LLM_PROVIDER') || 'openai';

    if (!apiKey) {
      this.logger.warn('LLM API Key not configured');
    }

    if (provider === 'siliconflow') {
      this.llm = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName,
        configuration: {
          baseURL: baseUrl || 'https://api.siliconflow.cn/v1',
        },
        temperature: 0.7,
        maxTokens: 2000,
      });
    } else {
      this.llm = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName,
        configuration: baseUrl ? { baseURL: baseUrl } : undefined,
        temperature: 0.7,
        maxTokens: 2000,
      });
    }
  }

  /**
   * 生成个人信息优化建议
   */
  async generatePersonalInfoOptimization(currentInfo: any): Promise<string> {
    this.logger.log(`[Stage: LLM] Generating personal info optimization - Name: ${currentInfo?.name || 'N/A'}`);
    try {
      if (!this.llm) {
        this.logger.warn('[Stage: LLM] LLM not initialized');
        return '';
      }

      const prompt = `分析以下个人信息，并提供改进建议（用中文回答，保持简洁）：

当前信息：
姓名: ${currentInfo?.name || 'N/A'}
邮箱: ${currentInfo?.email || 'N/A'}
电话: ${currentInfo?.phone || 'N/A'}
位置: ${currentInfo?.location || 'N/A'}

请给出2-3条具体的改进建议，格式为列表。`;

      this.logger.log(`[Stage: LLM] Calling LLM for personal info optimization`);
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      this.logger.log(`[Stage: LLM] Personal info optimization completed - ResponseLength: ${(response.content as string).length} chars`);
      return response.content as string;
    } catch (error) {
      this.logger.error('[Stage: LLM] Error generating personal info optimization:', error);
      return '';
    }
  }

  /**
   * 生成工作经验优化建议
   */
  async generateExperienceOptimization(experience: any): Promise<string> {
    try {
      if (!this.llm) {
        this.logger.warn('LLM not initialized');
        return '';
      }

      const experienceText = experience
        .map(
          (exp: any) =>
            `公司: ${exp.company}\n职位: ${exp.position}${exp.department ? `\n部门: ${exp.department}` : ''}${exp.departmentResponsibility ? `\n部门职责: ${exp.departmentResponsibility}` : ''}\n描述: ${exp.description}`
        )
        .join('\n\n');

      const prompt = `分析以下工作经验描述，并提供改进建议（用中文回答）：

${experienceText}

请提供以下方面的建议：
1. 如何使用STAR方法改进描述
2. 缺少哪些量化指标
3. 具体的改进示例（给出1-2个）

保持回答简洁，控制在200字以内。`;

      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      return response.content as string;
    } catch (error) {
      this.logger.error('Error generating experience optimization:', error);
      return '';
    }
  }

  /**
   * 生成技能优化建议
   */
  async generateSkillsOptimization(skills: string[]): Promise<string> {
    try {
      if (!this.llm) {
        this.logger.warn('LLM not initialized');
        return '';
      }

      const skillsText = skills.join('、');

      const prompt = `分析以下技能列表，并提供改进建议（用中文回答）：

当前技能: ${skillsText}

请提供以下方面的建议：
1. 哪些高价值技能可能缺少
2. 如何按重要性重新排序
3. 是否有过时或低价值的技能应该移除

保持回答简洁，控制在150字以内。`;

      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      return response.content as string;
    } catch (error) {
      this.logger.error('Error generating skills optimization:', error);
      return '';
    }
  }

  /**
   * 对标职位描述并生成建议(结构化JSON格式)
   */
  async generateJobMatchAnalysis(
    resumeContent: string,
    jobDescription: string
  ): Promise<string> {
    try {
      if (!this.llm) {
        this.logger.warn('LLM not initialized');
        return '';
      }

      const prompt = `作为一名招聘专家,请分析简历与职位描述的匹配度,并以JSON格式返回结果:

简历内容:
${resumeContent}

职位描述:
${jobDescription}

请严格按照以下JSON格式返回结果,所有字段都用中文:
{
  "matchScore": 整数(1-10),
  "matchingSkills": ["符合的关键要求1", "符合的关键要求2", "..."],
  "missingSkills": ["缺失的关键能力1", "缺失的关键能力2", "..."],
  "suggestions": ["改进建议1", "改进建议2", "..."]
}

确保返回的JSON格式正确,可以直接被解析。`;

      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      return response.content as string;
    } catch (error) {
      this.logger.error('Error generating job match analysis:', error);
      return '';
    }
  }

  /**
   * 生成完整的简历评估报告(结构化JSON格式)
   */
  async generateDetailedAnalysisReport(
    resumeContent: string,
    parsedData: any,
    basicScores: any,
    resumeType: 'freshman' | 'experienced'
  ): Promise<string> {
    this.logger.log(`[Stage: LLM - DetailedReport] Generating detailed analysis report - ResumeType: ${resumeType}, OverallScore: ${basicScores.overallScore}`);
    try {
      if (!this.llm) {
        this.logger.warn('[Stage: LLM - DetailedReport] LLM not initialized');
        return '';
      }

      const prompt = `请作为资深HR和招聘顾问以及相关技术专家,为以下简历生成一份详细评估报告,并以JSON格式返回结果:

简历基本信息（分数）:
- 总体评分: ${basicScores.overallScore}/100
- 完整性: ${basicScores.completenessScore}/100
- 关键词覆盖: ${basicScores.keywordScore}/100
- 工作经验: ${basicScores.experienceScore}/100
- 技能覆盖: ${basicScores.skillsScore}/100

简历内容:
${resumeContent}
简历类型：${resumeType === 'freshman' ? '校招生' : '社招'}

请严格按照以下格式返回结果:
{
  "overallEvaluation": "整体评价(2句)",
  "strengths": ["最突出的3个优势1", "最突出的3个优势2", "最突出的3个优势3"],
  "improvements": ["需要改进的3个方面1", "需要改进的3个方面2", "需要改进的3个方面3"],
  "suggestions": ["针对求职岗位的5条具体改进建议1", "2", "3", "4", "5"]
}

确保返回的格式正确,可以直接被解析。`;

      this.logger.log(`[Stage: LLM - DetailedReport] Calling LLM for detailed report generation`);
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      this.logger.log(`[Stage: LLM - DetailedReport] Detailed report generated successfully - ResponseLength: ${(response.content as string).length} chars`);
      return response.content as string;
    } catch (error) {
      this.logger.error('[Stage: LLM - DetailedReport] Error generating detailed analysis report:', error);
      return '';
    }
  }

  /**
   * 生成能力素质评估(结构化JSON格式)
   */
  async generateCompetencyAnalysis(
    text: string,
    parsedData: any,
    resumeType: 'freshman' | 'experienced'
  ): Promise<string> {
    this.logger.log(`[Stage: LLM - Competency] Generating competency analysis - ResumeType: ${resumeType}, TextLength: ${text.length}`);
    try {
      if (!this.llm) {
        this.logger.warn('[Stage: LLM - Competency] LLM not initialized');
        return '';
      }

      const prompt = `作为资深HR和技术专家,请对以下简历进行能力素质评估,并以JSON格式返回结果:

简历类型：${resumeType === 'freshman' ? '校招生' : '社招'}

简历内容：
${text}

请从以下方面进行评估：
1. 核心竞争力（列出3-5个最突出的能力）
2. 技术技能水平（描述整体技术能力水平）
3. 项目经验价值（评估项目经验的质量和相关性）
4. 职业发展潜力（分析未来职业发展的可能性）

请严格按照以下JSON格式返回结果:
{
  "coreCompetencies": ["核心竞争力1", "核心竞争力2", "..."],
  "technicalSkillsLevel": "整体技术能力水平描述",
  "projectExperienceValue": "项目经验价值描述",
  "careerPotential": "职业发展潜力描述"
}

确保返回的JSON格式正确,可以直接被解析。`;

      this.logger.log(`[Stage: LLM - Competency] Calling LLM for competency analysis`);
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      this.logger.log(`[Stage: LLM - Competency] Competency analysis completed - ResponseLength: ${(response.content as string).length} chars`);
      return response.content as string;
    } catch (error) {
      this.logger.error('[Stage: LLM - Competency] Error generating competency analysis:', error);
      return '';
    }
  }

  /**
   * 提取岗位特定关键词
   */
  async extractJobSpecificKeywords(jobDescription: string, jobTitle: string): Promise<string[]> {
    this.logger.log(`[Stage: LLM - Keywords] Extracting job specific keywords - JobTitle: ${jobTitle}`);
    try {
      if (!this.llm) {
        this.logger.warn('[Stage: LLM - Keywords] LLM not initialized');
        return [];
      }

      const prompt = `请根据提供的求职岗位${jobTitle}和职位描述${jobDescription}，给出该岗位10-20个最关键的技能、经验和要求关键词（中英文配对给出，相同含义的中英文关键词算一个）：



请以逗号分隔的形式返回关键词，不要包含任何解释或引言。`;

      this.logger.log(`[Stage: LLM - Keywords] Calling LLM for keyword extraction`);
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = response.content as string;

      // 解析返回的关键词列表
      const keywords = content
        .split(',')
        .map(keyword => keyword.trim())
        .filter(keyword => keyword.length > 0)
        .slice(0, 20); // 限制最多15个关键词
      
      this.logger.log(`[Stage: LLM - Keywords] Keyword extraction completed - KeywordsExtracted: ${keywords.length}`);
      return keywords;
    } catch (error) {
      this.logger.error('[Stage: LLM - Keywords] Error extracting job specific keywords:', error);
      return [];
    }
  }

    /**
   * 提取岗位亮点技能（结构化返回，方便匹配）
   * ✨ 改进：返回规范化的技能格式，每个技能只包含英文关键字
   */
  async extractJobSpecificHighSkills(jobDescription: string, jobTitle: string): Promise<{ name: string; keywords: string[] }[]> {
    this.logger.log(`[Stage: LLM - HighSkills] Extracting high value job specific skills - JobTitle: ${jobTitle}`);
    try {
      if (!this.llm) {
        this.logger.warn('[Stage: LLM - HighSkills] LLM not initialized');
        return [];
      }

      const prompt = `请根据提供的求职岗位"${jobTitle}"和职位描述"${jobDescription}"，给出该岗位4-6个最关键的高价值技能。

要求：
1. 每行一个技能
2. 格式：技能名称(中英文)|英文关键字1|英文关键字2|...
3. 例如：Python编程|python|coding|programming

请严格按照以下格式返回，不要包含任何解释或其他内容：
Python编程|python|programming
JavaScript/Node.js|javascript|nodejs|node
React框架|react|reactjs
Docker容器化|docker
...`;

      this.logger.log(`[Stage: LLM - HighSkills] Calling LLM for high value skills extraction`);
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = response.content as string;

      // 解析返回的技能列表
      const highSkills: { name: string; keywords: string[] }[] = [];
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      
      for (const line of lines) {
        const parts = line.split('|').map(p => p.trim()).filter(p => p.length > 0);
        if (parts.length >= 2) {
          highSkills.push({
            name: parts[0],           // 技能名称（中英文）
            keywords: parts.slice(1)  // 英文关键字列表
          });
        }
      }

      const result = highSkills.slice(0, 6); // 限制最多6个高价值技能
      this.logger.log(`[Stage: LLM - HighSkills] High value skills extraction completed - SkillsExtracted: ${result.length}`);
      return result;
    } catch (error) {
      this.logger.error('[Stage: LLM - HighSkills] Error extracting job specific high value skills:', error);
      return [];
    }
  }
}
