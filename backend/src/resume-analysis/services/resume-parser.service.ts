import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import PDFParser from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

interface ParsedResume {
  personalInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    location?: string;
    portfolio?: string;
  };
  professionalSummary?: string;
  workExperience?: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
  education?: Array<{
    school: string;
    degree: string;
    field: string;
    graduationDate: string;
  }>;
  skills?: string[];
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
    link?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    date: string;
  }>;
  languages?: Array<{
    language: string;
    proficiency: string;
  }>;
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

      this.logger.log(`[LLM] LLM initialized successfully with provider: ${provider}, model: ${modelName}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[LLM] Failed to initialize LLM: ${errorMsg}`);
      throw new BadRequestException(`[LLM] Initialization failed: ${errorMsg}`);
    }
  }

  /**
   * 解析 PDF 文件
   */
  async parsePDF(filePath: string): Promise<string> {
    try {
      this.logger.log(`[PDF Parser] Starting to parse PDF file: ${filePath}`);
      const fileBuffer = fs.readFileSync(filePath);
      this.logger.log(`[PDF Parser] File buffer size: ${fileBuffer.length} bytes`);

      const pdfData = await PDFParser(fileBuffer);
      const text = pdfData.text || '';

      this.logger.log(`[PDF Parser] PDF parsed successfully. Total characters: ${text.length}`);
      this.logger.log(`[PDF Parser] Number of pages: ${pdfData.numpages}`);
      this.logger.log(`[PDF Parser] Extracted text preview (first 500 chars):\n${text.substring(0, 500)}`);

      return text;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[PDF Parser] PDF parsing failed: ${errorMsg}`, error);
      throw new BadRequestException(`PDF parsing failed: ${errorMsg}`);
    }
  }

  /**
   * 解析 DOCX 文件
   */
  async parseDocx(filePath: string): Promise<string> {
    try {
      this.logger.log(`[DOCX Parser] Starting to parse DOCX file: ${filePath}`);
      const fileBuffer = fs.readFileSync(filePath);
      this.logger.log(`[DOCX Parser] File buffer size: ${fileBuffer.length} bytes`);

      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      const text = result.value;

      this.logger.log(`[DOCX Parser] DOCX parsed successfully. Total characters: ${text.length}`);
      this.logger.log(`[DOCX Parser] Extracted text preview (first 500 chars):\n${text.substring(0, 500)}`);

      return text;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[DOCX Parser] DOCX parsing failed: ${errorMsg}`, error);
      throw new BadRequestException(`DOCX parsing failed: ${errorMsg}`);
    }
  }

  /**
   * 解析文本文件
   */
  async parseTextFile(filePath: string): Promise<string> {
    try {
      this.logger.log(`[Text Parser] Starting to parse text file: ${filePath}`);
      const content = fs.readFileSync(filePath, 'utf-8');

      this.logger.log(`[Text Parser] Text file parsed successfully. Total characters: ${content.length}`);
      this.logger.log(`[Text Parser] Extracted text preview (first 500 chars):\n${content.substring(0, 500)}`);

      return content;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[Text Parser] Text file parsing failed: ${errorMsg}`, error);
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

  /**
   * 从 Buffer 解析 PDF
   */
  private async parsePDFBuffer(fileBuffer: Buffer): Promise<string> {
    try {
      this.logger.log(`[PDF Parser] Starting to parse PDF from buffer (${fileBuffer.length} bytes)`);

      const pdfData = await PDFParser(fileBuffer);
      const text = pdfData.text || '';

      this.logger.log(`[PDF Parser] PDF parsed successfully. Total characters: ${text.length}`);
      this.logger.log(`[PDF Parser] Number of pages: ${pdfData.numpages}`);
      this.logger.log(`[PDF Parser] Extracted text preview (first 500 chars):\n${text.substring(0, 500)}`);

      return text;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[PDF Parser] PDF parsing failed: ${errorMsg}`, error);
      throw new BadRequestException(`PDF parsing failed: ${errorMsg}`);
    }
  }

  /**
   * 从 Buffer 解析 DOCX
   */
  private async parseDocxBuffer(fileBuffer: Buffer): Promise<string> {
    try {
      this.logger.log(`[DOCX Parser] Starting to parse DOCX from buffer (${fileBuffer.length} bytes)`);

      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      const text = result.value;

      this.logger.log(`[DOCX Parser] DOCX parsed successfully. Total characters: ${text.length}`);
      this.logger.log(`[DOCX Parser] Extracted text preview (first 500 chars):\n${text.substring(0, 500)}`);

      return text;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[DOCX Parser] DOCX parsing failed: ${errorMsg}`, error);
      throw new BadRequestException(`DOCX parsing failed: ${errorMsg}`);
    }
  }

  /**
   * 从 Buffer 解析文本文件
   */
  private parseTextBuffer(fileBuffer: Buffer): string {
    try {
      this.logger.log(`[Text Parser] Starting to parse text from buffer (${fileBuffer.length} bytes)`);
      const content = fileBuffer.toString('utf-8');

      this.logger.log(`[Text Parser] Text parsed successfully. Total characters: ${content.length}`);
      this.logger.log(`[Text Parser] Extracted text preview (first 500 chars):\n${content.substring(0, 500)}`);

      return content;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[Text Parser] Text parsing failed: ${errorMsg}`, error);
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

  /**
   * 使用 LLM 解析简历内容
   */
  async parseResumeContent(text: string): Promise<ParsedResume> {
    if (!text || text.trim().length === 0) {
      throw new BadRequestException('Resume content is empty');
    }

    this.logger.log(`[Resume Parser] Starting to parse resume content with LLM (${text.length} characters)`);

    try {
      const systemPrompt = `你是一个专业的简历解析助手。你的任务是从简历文本中提取结构化信息。
请以严格的 JSON 格式返回结果，不要添加任何额外的文字或 markdown 代码块。
如果某些信息不存在，使用 null 或空数组表示。`;

      const userPrompt = `请从以下简历文本中提取信息，并返回一个 JSON 对象，包含以下结构：
{
  "personalInfo": {
    "name": "姓名",
    "email": "邮箱",
    "phone": "电话",
    "location": "位置",
    "portfolio": "个人网站/GitHub等"
  },
  "skills": ["技能1", "技能2", ...],
  "education": [
    {
      "school": "学校名称",
      "degree": "学位",
      "field": "专业",
      "graduationDate": "毕业日期"
    }
  ],
  "workExperience": [
    {
      "company": "公司名称",
      "position": "职位",
      "startDate": "开始日期",
      "endDate": "结束日期",
      "description": "工作描述"
    }
  ]
}

简历内容：
${text}`;

      this.logger.debug('[LLM] Sending request to LLM for resume parsing');
      const response = await this.llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);

      const responseContent = response.content as string;
      this.logger.debug(`[LLM] Response received (${responseContent.length} chars)`);

      // 尝试解析 JSON 响应
      let parsedData: ParsedResume;
      try {
        // 尝试直接解析
        parsedData = JSON.parse(responseContent);
      } catch {
        // 尝试从 markdown 代码块中提取 JSON
        const jsonMatch = responseContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[1]);
        } else {
          // 尝试找到 JSON 对象
          const objectMatch = responseContent.match(/\{[\s\S]*\}/);
          if (objectMatch) {
            parsedData = JSON.parse(objectMatch[0]);
          } else {
            throw new Error('Could not extract JSON from LLM response');
          }
        }
      }

      // 验证和标准化数据
      const normalizedData = this.normalizeParseResult(parsedData);

      // 详细日志输出
      this.logger.log(`[Resume Parser] ========== PARSING RESULT ==========`);
      this.logger.log(`[Resume Parser] Personal Info:`, JSON.stringify(normalizedData.personalInfo, null, 2));
      this.logger.log(`[Resume Parser] Skills (${normalizedData.skills?.length || 0} total):`,
        JSON.stringify(normalizedData.skills, null, 2));
      this.logger.log(`[Resume Parser] Education (${normalizedData.education?.length || 0} total):`,
        JSON.stringify(normalizedData.education, null, 2));
      this.logger.log(`[Resume Parser] Work Experience (${normalizedData.workExperience?.length || 0} total):`,
        JSON.stringify(normalizedData.workExperience, null, 2));
      this.logger.log(`[Resume Parser] ====================================`);

      return normalizedData;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('[LLM] Error during LLM-based parsing:', errorMsg);
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
      },
      skills: Array.isArray(data?.skills) ? data.skills.filter((s: any) => s && s.length > 0) : [],
      education: Array.isArray(data?.education)
        ? data.education.map((edu: any) => ({
            school: edu?.school || 'N/A',
            degree: edu?.degree || 'N/A',
            field: edu?.field || 'N/A',
            graduationDate: edu?.graduationDate || 'N/A',
          }))
        : [],
      workExperience: Array.isArray(data?.workExperience)
        ? data.workExperience.map((exp: any) => ({
            company: exp?.company || 'N/A',
            position: exp?.position || 'N/A',
            startDate: exp?.startDate || 'N/A',
            endDate: exp?.endDate || 'N/A',
            description: exp?.description || '',
          }))
        : [],
    };
  }
}
