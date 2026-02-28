import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import PDFParser from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

interface PersonalInfo {
  name?: string;
  phone?: string;
  email?: string;
  location?: string;
  portfolio?: string;
  avatar?: string;
  title?: string;
  summary?: string;
}

interface SkillCategory {
  category: string;
  skills: string[];
  proficiency?: string;
}

interface WorkExperience {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
  highlights?: string[];
  achievements?: string[];
  department?: string; // 部门名称
  departmentResponsibility?: string; // 部门职责/部门主要业务
  // 社招独有或增强信息
  companyType?: string; // 公司类型：初创/中型/大型/上市等
  companyIndustry?: string; // 公司行业
  companySize?: string; // 公司规模（员工数量）
  teamSize?: string; // 团队规模（管理的人数）
  managementLevel?: string; // 管理级别（IC/Manager/Senior Manager等）
  reportsTo?: string; // 汇报给谁（职位）
  reasonForLeaving?: string; // 离职原因
  workingModel?: string; // 工作模式：现场/混合/远程
}

interface InternshipExperience extends WorkExperience {
  internshipType?: string;
}

interface Education {
  school: string;
  degree: string;
  field: string;
  graduationDate: string;
  gpa?: string;
  coursework?: string[];
  honors?: string[];
}

interface Project {
  name: string;
  description: string;
  technologies: string[];
  link?: string;
  startDate?: string;
  endDate?: string;
  highlights?: string[];
  role?: string;
}

interface Certification {
  name: string;
  issuer: string;
  date: string;
  credentialId?: string;
  credentialUrl?: string;
}

interface Language {
  language: string;
  proficiency: string;
}

interface Award {
  title: string;
  issuer?: string;
  date: string;
  description?: string;
}

interface Publication {
  title: string;
  publisher: string;
  date: string;
  url?: string;
  doi?: string;
  issn?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  authors?: string[];
  abstract?: string;
}

interface CampusExperience {
  organization: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
  type?: string; // 如：学生会、班级、社团等
  achievements?: string[];
}

interface ParsedResume {
  personalInfo?: PersonalInfo;
  professionalSummary?: string;
  
  // 技能部分 - 支持分类和简单列表
  skills?: string[];
  skillCategories?: SkillCategory[];
  
  // 工作和实习经历
  workExperience?: WorkExperience[];
  internshipExperience?: InternshipExperience[];
  
  // 教育背景
  education?: Education[];
  
  // 项目经历
  projects?: Project[];
  
  // 证书和认证
  certifications?: Certification[];
  
  // 语言能力
  languages?: Language[];
  
  // 获奖和荣誉
  awards?: Award[];
  
  // 其他信息
  volunteer?: Array<{
    organization: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
  
  // 论文发表（增强版）
  publications?: Publication[];
  
  // 校园经历（学生会、班级、社团等）
  campusExperience?: CampusExperience[];
  
  [key: string]: any;
}

@Injectable()
export class ResumeParserService {
  private readonly logger = new Logger(ResumeParserService.name);
  private llm!: ChatOpenAI;

  constructor(private configService: ConfigService) {
    this.initializeLLM();
  }

  private initializeLLM() {
    try {
      const apiKey = this.configService.get<string>('LLM_API_KEY');
      if (!apiKey) {
        throw new BadRequestException('[LLM] API Key is required for resume parsing');
      }

      const baseUrl = this.configService.get<string>('LLM_BASE_URL');
      const modelName = this.configService.get<string>('LLM_MODEL') || 'gpt-3.5-turbo';
      const provider = this.configService.get<string>('LLM_PROVIDER') || 'openai';

      if (provider === 'siliconflow') {
        this.llm = new ChatOpenAI({
          openAIApiKey: apiKey,
          modelName,
          configuration: {
            baseURL: baseUrl || 'https://api.siliconflow.cn/v1',
          },
          temperature: 0.3,
          maxTokens: 3000,
        });
      } else {
        this.llm = new ChatOpenAI({
          openAIApiKey: apiKey,
          modelName,
          configuration: baseUrl ? { baseURL: baseUrl } : undefined,
          temperature: 0.3,
          maxTokens: 3000,
        });
      }

      this.logger.log(`[LLM] Initialized - Provider: ${provider}, Model: ${modelName}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[LLM] Failed to initialize: ${errorMsg}`);
      throw new BadRequestException(`[LLM] Initialization failed: ${errorMsg}`);
    }
  }

  async parsePDF(filePath: string): Promise<string> {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const pdfData = await PDFParser(fileBuffer);
      const text = pdfData.text || '';

      this.logger.log(`[PDF] Parsed - Pages: ${pdfData.numpages}, Chars: ${text.length}`);
      return text;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[PDF] Parsing failed: ${errorMsg}`);
      throw new BadRequestException(`PDF parsing failed: ${errorMsg}`);
    }
  }

  async parseDocx(filePath: string): Promise<string> {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      const text = result.value;

      this.logger.log(`[DOCX] Parsed - Chars: ${text.length}`);
      return text;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[DOCX] Parsing failed: ${errorMsg}`);
      throw new BadRequestException(`DOCX parsing failed: ${errorMsg}`);
    }
  }

  async parseTextFile(filePath: string): Promise<string> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      this.logger.log(`[TXT] Parsed - Chars: ${content.length}`);
      return content;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[TXT] Parsing failed: ${errorMsg}`);
      throw new BadRequestException(`Text file parsing failed: ${errorMsg}`);
    }
  }

  /**
   * 解析 Buffer 格式的简历（内存模式）
   */
  async parseResumeBuffer(fileBuffer: Buffer, fileType: string): Promise<string> {
    switch (fileType.toLowerCase()) {
      case 'pdf':
      case '.pdf':
        return this.parsePDFBuffer(fileBuffer);
      case 'docx':
      case '.docx':
        return this.parseDocxBuffer(fileBuffer);
      case 'doc':
      case '.doc':
        // Word 格式统一使用 mammoth 解析
        return this.parseDocxBuffer(fileBuffer);
      case 'txt':
      case '.txt':
        return this.parseTextBuffer(fileBuffer);
      default:
        throw new BadRequestException(`Unsupported file type: ${fileType}`);
    }
  }

  private async parsePDFBuffer(fileBuffer: Buffer): Promise<string> {
    try {
      const pdfData = await PDFParser(fileBuffer);

      const text = pdfData.text || ''
      this.logger.log(`[PDF] Parsed from buffer - Pages: ${pdfData.numpages}, Chars: ${text.length}`);
      return text;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[PDF] Buffer parsing failed: ${errorMsg}`);
      throw new BadRequestException(`PDF parsing failed: ${errorMsg}`);
    }
  }

  private cleanupTextContent(text: string): string {
    if (!text) return text;

    text = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

    text = text
      .replace(/\ufffd/g, '')
      .replace(/[\u0080-\u009F]/g, '')
      .replace(/[\u2000-\u206F]/g, '')
      .replace(/[ª­®¯°±²³´µ¶·¸¹º»¼½¾¿]/g, '')
      .replace(/[À-ß]/g, () => '')
      .replace(/[^\x20-\x7E\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\u0400-\u04FF\s\n\r\-—–]/g, () => '');

    text = text
      .replace(/^[•◦‣\-\*\+]+\s*/gm, '• ')
      .replace(/^\s*[•◦‣\-\*\+]\s*/gm, '• ')
      .replace(/^[\w]*[•◦‣\-\*\+]/gm, '• ');

    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/\n\s+\n/g, '\n')
      .replace(/[ ]{2,}/g, ' ')
      .trim();

    return text;
  }

  private async parseDocxBuffer(fileBuffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      const text = result.value;

      this.logger.log(`[DOCX] Parsed from buffer - Chars: ${text.length}`);
      return text;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[DOCX] Buffer parsing failed: ${errorMsg}`);
      throw new BadRequestException(`DOCX parsing failed: ${errorMsg}`);
    }
  }

  private parseTextBuffer(fileBuffer: Buffer): string {
    try {
      const content = fileBuffer.toString('utf-8');
      this.logger.log(`[TXT] Parsed from buffer - Chars: ${content.length}`);
      return content;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[TXT] Buffer parsing failed: ${errorMsg}`);
      throw new BadRequestException(`Text parsing failed: ${errorMsg}`);
    }
  }

  /**
   * 根据文件类型解析简历
   */
  async parseResumeFile(filePath: string, fileType: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();

    switch (fileType.toLowerCase()) {
      case 'pdf':
      case '.pdf':
        return this.parsePDF(filePath);
      case 'docx':
      case '.docx':
        return this.parseDocx(filePath);
      case 'doc':
      case '.doc':
        // Word 格式统一使用 mammoth 解析
        return this.parseDocx(filePath);
      case 'txt':
      case '.txt':
        return this.parseTextFile(filePath);
      default:
        throw new BadRequestException(`Unsupported file type: ${fileType}`);
    }
  }

  async parseResumeContent(text: string): Promise<ParsedResume> {
    if (!text || text.trim().length === 0) {
      throw new BadRequestException('Resume content is empty');
    }

    this.logger.log(`[LLM] Parsing resume - Length: ${text.length} chars`);

    try {
      const systemPrompt = `你是一个专业的简历解析助手。你的任务是从简历文本中提取结构化信息。
请以严格的 JSON 格式返回结果，不要添加任何额外的文字或 markdown 代码块。
如果某些信息不存在，使用 null 或空数组表示。`;

      const userPrompt = `请从以下简历文本中提取信息，并返回一个 JSON 对象，包含以下结构：
{
  "personalInfo": {
    "name": "姓名",
    "phone": "电话",
    "email": "邮箱",
    "location": "地点",
    "portfolio": "个人网站/GitHub等",
    "title": "职位/头衔",
    "summary": "个人简介"
  },
  "professionalSummary": "职业总结（如果有）",
  
  "skills": ["通用技能列表"],
  "skillCategories": [
    {
      "category": "技能类别名称（如：编程语言、框架库、工具等）",
      "skills": ["具体技能1", "具体技能2"],
      "proficiency": "熟练程度"
    }
  ],
  
  "education": [
    {
      "school": "学校名称",
      "degree": "学位（如：本科、硕士）",
      "field": "专业",
      "graduationDate": "毕业日期",
      "gpa": "GPA（如果有）",
      "coursework": ["重要课程列表"],
      "honors": ["荣誉/奖项"]
    }
  ],
  
  "workExperience": [
    {
      "company": "公司名称",
      "position": "职位",
      "startDate": "开始日期",
      "endDate": "结束日期",
      "description": "职位职责和工作描述",
      "highlights": ["主要工作亮点1", "主要工作亮点2"],
      "achievements": ["成就/贡献1", "成就/贡献2"],
      "department": "部门/小组名称（如：技术部、产品部、研发团队、小组等）",
      "departmentResponsibility": "部门职责/部门主要业务",
      "companyType": "公司类型（如：初创、中型、大型、上市等）",
      "companyIndustry": "公司行业（如：互联网、金融、制造等）",
      "companySize": "公司规模（如：100人以下、500-1000人等）",
      "teamSize": "团队规模（管理的人数，如：5人、10-15人等）",
      "managementLevel": "管理级别（IC/Team Leader/Manager/Senior Manager/Director等）",
      "reportsTo": "汇报给谁的职位（如：技术总监、产品负责人等）",
      "reasonForLeaving": "离职原因（如果已离职）",
      "workingModel": "工作模式（现场/混合/远程）"
    }
  ],
  
  "internshipExperience": [
    {
      "company": "实习公司名称",
      "position": "实习职位",
      "startDate": "开始日期",
      "endDate": "结束日期",
      "internshipType": "实习类型（如：远程、现场）",
      "description": "实习职责描述",
      "highlights": ["实习亮点"],
      "achievements": ["实习成果"],
      "department": "部门/小组名称（如：技术部、产品部等）",
      "departmentResponsibility": "部门（小组）职责/主要业务"
    }
  ],
  
  "projects": [
    {
      "name": "项目名称",
      "description": "项目描述",
      "role": "你在项目中的角色",
      "startDate": "项目开始日期",
      "endDate": "项目结束日期",
      "technologies": ["技术栈1", "技术栈2"],
      "highlights": ["项目亮点/成果"],
      "link": "项目链接"
    }
  ],
  
  "certifications": [
    {
      "name": "证书名称",
      "issuer": "颁发机构",
      "date": "获证日期",
      "credentialId": "证书编号（如果有）",
      "credentialUrl": "证书链接（如果有）"
    }
  ],
  
  "languages": [
    {
      "language": "语言名称",
      "proficiency": "语言水平"
    }
  ],
  
  "awards": [
    {
      "title": "奖项/荣誉名称",
      "issuer": "颁发机构",
      "date": "获奖日期",
      "description": "奖项描述"
    }
  ],
  
  "publications": [
    {
      "title": "论文题目",
      "publisher": "发表刊物/期刊/会议名称",
      "date": "发表日期",
      "doi": "DOI编号（如果有）",
      "issn": "ISSN编号（如果有）",
      "volume": "期卷号（如果有）",
      "issue": "期号（如果有）",
      "pages": "页码范围（如果有）",
      "authors": ["作者1", "作者2"],
      "abstract": "论文摘要",
      "url": "论文链接（如果有）"
    }
  ],
  
  "campusExperience": [
    {
      "organization": "组织名称（如：学生会、计算机学院、XXX社团）",
      "position": "职位/角色（如：主席、技术部长、成员）",
      "startDate": "开始日期",
      "endDate": "结束日期",
      "type": "类型（如：学生组织、班级、社团）",
      "description": "职责描述和主要工作内容",
      "achievements": ["校园成就1", "校园成就2"]
    }
  ]
}

提取规则：
1. 日期格式保持原样（年-月 或 年.月 或完整日期）
2. 如果某字段不存在，设为 null 或空数组
3. 对于工作经验和实习经历，优先提取具体成就和量化指标
4. 对于项目，请提取主要技术栈和项目亮点
5. skillCategories 应按技能类型分类（如：编程语言、框架、工具等）
6. 确保 highlights 和 achievements 中的内容是具体、可量化的
7. publications 应包含完整的论文信息，包括作者、卷期号等学术元数据
8. campusExperience 用于记录学生时期的学生组织、班级、社团等活动
9. 部门信息字段 ✨：
   - department：提取所在部门的名称（如：技术部、产品部、研发中心、后端团队等）
   - departmentResponsibility：提取部门的主要职责和业务范围（如："负责用户端系统的开发和维护"）
10. 社招独有字段（社会招聘）：
   - companyType：从公司性质信息推断（如"知名互联网上市公司"→"上市"）
   - companyIndustry：提取公司所在行业
   - companySize：提取公司规模信息（如果有）
   - teamSize/managementLevel：提取团队规模和管理级别信息（关键词如"管理5人团队"、"Team Lead"）
   - reportsTo：提取汇报对象信息
   - reasonForLeaving：如果简历中明确提到离职原因则提取
   - workingModel：提取工作模式（现场/混合/远程）信息

简历内容：
${text}`;

      const response = await this.llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);

      const responseContent = response.content as string;

      let parsedData: ParsedResume;
      try {
        parsedData = JSON.parse(responseContent);
      } catch {
        const jsonMatch = responseContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[1]);
        } else {
          const objectMatch = responseContent.match(/\{[\s\S]*\}/);
          if (objectMatch) {
            parsedData = JSON.parse(objectMatch[0]);
          } else {
            this.logger.error(`[LLM] Could not extract JSON from response`);
            throw new Error('Could not extract JSON from LLM response');
          }
        }
      }

      const normalizedData = this.normalizeParseResult(parsedData);

      this.logger.log(`[LLM] Parsed - Skills: ${normalizedData.skills?.length || 0}, Education: ${normalizedData.education?.length || 0}, Work: ${normalizedData.workExperience?.length || 0}, Projects: ${normalizedData.projects?.length || 0}`);

      return normalizedData;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[LLM] Parsing failed: ${errorMsg}`);
      throw new BadRequestException(`Resume parsing failed: ${errorMsg}`);
    }
  }

  /**
   * 标准化 LLM 返回的解析结果
   */
  private normalizeParseResult(data: any): ParsedResume {
    return {
      personalInfo: {
        name: data?.personalInfo?.name || undefined,
        email: data?.personalInfo?.email || undefined,
        phone: data?.personalInfo?.phone || undefined,
        location: data?.personalInfo?.location || undefined,
        portfolio: data?.personalInfo?.portfolio || undefined,
        avatar: data?.personalInfo?.avatar || undefined,
        title: data?.personalInfo?.title || undefined,
        summary: data?.personalInfo?.summary || undefined,
      },

      professionalSummary: data?.professionalSummary || undefined,

      // 技能 - 支持简单列表和分类
      skills: Array.isArray(data?.skills) 
        ? data.skills.filter((s: any) => s && s.length > 0) 
        : [],

      skillCategories: Array.isArray(data?.skillCategories)
        ? data.skillCategories.map((cat: any) => ({
            category: cat?.category || 'Other',
            skills: Array.isArray(cat?.skills) 
              ? cat.skills.filter((s: any) => s && s.length > 0) 
              : [],
            proficiency: cat?.proficiency || undefined,
          }))
        : [],

      // 教育背景
      education: Array.isArray(data?.education)
        ? data.education.map((edu: any) => ({
            school: edu?.school || 'N/A',
            degree: edu?.degree || 'N/A',
            field: edu?.field || 'N/A',
            graduationDate: edu?.graduationDate || 'N/A',
            gpa: edu?.gpa || undefined,
            coursework: Array.isArray(edu?.coursework) ? edu.coursework : [],
            honors: Array.isArray(edu?.honors) ? edu.honors : [],
          }))
        : [],

      // 工作经历
      workExperience: Array.isArray(data?.workExperience)
        ? data.workExperience.map((exp: any) => ({
            company: exp?.company || 'N/A',
            position: exp?.position || 'N/A',
            startDate: exp?.startDate || 'N/A',
            endDate: exp?.endDate || 'N/A',
            description: exp?.description || '',
            highlights: Array.isArray(exp?.highlights) ? exp.highlights : [],
            achievements: Array.isArray(exp?.achievements) ? exp.achievements : [],
            // 社招信息
            companyType: exp?.companyType || undefined,
            companyIndustry: exp?.companyIndustry || undefined,
            companySize: exp?.companySize || undefined,
            teamSize: exp?.teamSize || undefined,
            managementLevel: exp?.managementLevel || undefined,
            reportsTo: exp?.reportsTo || undefined,
            reasonForLeaving: exp?.reasonForLeaving || undefined,
            workingModel: exp?.workingModel || undefined,
          }))
        : [],

      // 实习经历
      internshipExperience: Array.isArray(data?.internshipExperience)
        ? data.internshipExperience.map((intern: any) => ({
            company: intern?.company || 'N/A',
            position: intern?.position || 'N/A',
            startDate: intern?.startDate || 'N/A',
            endDate: intern?.endDate || 'N/A',
            description: intern?.description || '',
            internshipType: intern?.internshipType || undefined,
            highlights: Array.isArray(intern?.highlights) ? intern.highlights : [],
            achievements: Array.isArray(intern?.achievements) ? intern.achievements : [],
          }))
        : [],

      // 项目经历
      projects: Array.isArray(data?.projects)
        ? data.projects.map((proj: any) => ({
            name: proj?.name || 'N/A',
            description: proj?.description || '',
            technologies: Array.isArray(proj?.technologies) 
              ? proj.technologies.filter((t: any) => t && t.length > 0) 
              : [],
            link: proj?.link || undefined,
            startDate: proj?.startDate || undefined,
            endDate: proj?.endDate || undefined,
            highlights: Array.isArray(proj?.highlights) ? proj.highlights : [],
            role: proj?.role || undefined,
          }))
        : [],

      // 证书和认证
      certifications: Array.isArray(data?.certifications)
        ? data.certifications.map((cert: any) => ({
            name: cert?.name || 'N/A',
            issuer: cert?.issuer || 'N/A',
            date: cert?.date || 'N/A',
            credentialId: cert?.credentialId || undefined,
            credentialUrl: cert?.credentialUrl || undefined,
          }))
        : [],

      // 语言能力
      languages: Array.isArray(data?.languages)
        ? data.languages.map((lang: any) => ({
            language: lang?.language || 'N/A',
            proficiency: lang?.proficiency || 'N/A',
          }))
        : [],

      // 获奖和荣誉
      awards: Array.isArray(data?.awards)
        ? data.awards.map((award: any) => ({
            title: award?.title || 'N/A',
            issuer: award?.issuer || undefined,
            date: award?.date || 'N/A',
            description: award?.description || undefined,
          }))
        : [],

      // 志愿者经历
      volunteer: Array.isArray(data?.volunteer)
        ? data.volunteer.map((vol: any) => ({
            organization: vol?.organization || 'N/A',
            role: vol?.role || 'N/A',
            startDate: vol?.startDate || 'N/A',
            endDate: vol?.endDate || 'N/A',
            description: vol?.description || '',
          }))
        : [],

      // 出版物（增强版 - 包含学术元数据）
      publications: Array.isArray(data?.publications)
        ? data.publications.map((pub: any) => ({
            title: pub?.title || 'N/A',
            publisher: pub?.publisher || 'N/A',
            date: pub?.date || 'N/A',
            doi: pub?.doi || undefined,
            issn: pub?.issn || undefined,
            volume: pub?.volume || undefined,
            issue: pub?.issue || undefined,
            pages: pub?.pages || undefined,
            authors: Array.isArray(pub?.authors) ? pub.authors : [],
            abstract: pub?.abstract || undefined,
            url: pub?.url || undefined,
          }))
        : [],

      // 校园经历
      campusExperience: Array.isArray(data?.campusExperience)
        ? data.campusExperience.map((campus: any) => ({
            organization: campus?.organization || 'N/A',
            position: campus?.position || 'N/A',
            startDate: campus?.startDate || 'N/A',
            endDate: campus?.endDate || 'N/A',
            type: campus?.type || undefined,
            description: campus?.description || '',
            achievements: Array.isArray(campus?.achievements) ? campus.achievements : [],
          }))
        : [],
    };
  }
}
