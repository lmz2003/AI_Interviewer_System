import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { validate as validateUUID } from 'uuid';
import { Resume } from '../entities/resume.entity';
import { ResumeAnalysis } from '../entities/resume-analysis.entity';
import { ResumeParserService } from './resume-parser.service';
import { ResumeAnalyzerService } from './resume-analyzer.service';
import { ResumeLLMService } from './resume-llm.service';
import { UploadResumeDto } from '../dto/upload-resume.dto';

@Injectable()
export class ResumeAnalysisService {
  private readonly logger = new Logger(ResumeAnalysisService.name);

  constructor(
    @InjectRepository(Resume)
    private resumeRepository: Repository<Resume>,
    @InjectRepository(ResumeAnalysis)
    private analysisRepository: Repository<ResumeAnalysis>,
    private parserService: ResumeParserService,
    private analyzerService: ResumeAnalyzerService,
    private llmService: ResumeLLMService
  ) {}

  /**
   * 验证UUID格式
   */
  private validateId(id: string): void {
    if (!validateUUID(id)) {
      throw new BadRequestException('Invalid resume ID format');
    }
  }

  /**
   * 获取用户的简历
   */
  private async getUserResume(id: string, userId: string): Promise<Resume> {
    this.validateId(id);
    
    const resume = await this.resumeRepository.findOne({
      where: { id, ownerId: userId },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    return resume;
  }

  /**
   * 上传简历（文本）
   */
  async uploadResume(
    dto: UploadResumeDto,
    userId: string
  ): Promise<Resume> {
    try {
      this.logger.log(`[Stage: Upload Text] Starting text resume upload - Title: "${dto.title}", UserId: ${userId}`);
      
      const resume = this.resumeRepository.create({
        title: dto.title,
        content: dto.content || '',
        jobDescription: dto.jobDescription,
        fileType: 'txt',
        ownerId: userId,
        isProcessed: false,
        status: 'active',
      });

      const savedResume = await this.resumeRepository.save(resume);
      this.logger.log(`[Stage: Upload Text] Resume saved successfully - ResumeId: ${savedResume.id}, ContentLength: ${(dto.content || '').length} chars`);

      // 异步处理解析和分析
      this.logger.log(`[Stage: Upload Text] Triggering async processing for resume ${savedResume.id}`);
      this.processResumeAsync(savedResume.id, userId).catch((error) => {
        this.logger.error(`[Stage: Upload Text] Error processing resume ${savedResume.id}:`, error);
      });

      return savedResume;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[Stage: Upload Text] Failed to upload resume - Error: ${errorMsg}`, error);
      throw new BadRequestException(`Failed to upload resume: ${errorMsg}`);
    }
  }

  /**
   * 上传简历（文件）
   */
  async uploadResumeFile(
    title: string,
    fileBuffer: Buffer,
    fileName: string,
    fileType: string,
    fileSize: number,
    userId: string,
    jobDescription?: string
  ): Promise<Resume> {
    try {
      this.logger.log(`[Stage: Upload File] Starting file resume upload - FileName: "${fileName}", FileType: ${fileType}, FileSize: ${fileSize} bytes, UserId: ${userId}`);
      
      // 解析文件内容
      this.logger.log(`[Stage: Upload File] Parsing file buffer - FileName: "${fileName}", FileType: ${fileType}`);
      const content = await this.parserService.parseResumeBuffer(fileBuffer, fileType);
      this.logger.log(`[Stage: Upload File] File parsing completed - ContentLength: ${content.length} chars`);

      const resume = this.resumeRepository.create({
        title,
        content,
        jobDescription,
        fileBinary: fileBuffer,
        fileName,
        fileType: fileType.toLowerCase().replace(/^\./, ''),
        fileSize,
        ownerId: userId,
        isProcessed: false,
        status: 'active',
      });

      const savedResume = await this.resumeRepository.save(resume);
      this.logger.log(`[Stage: Upload File] Resume saved successfully - ResumeId: ${savedResume.id}, Title: "${title}"`);

      // 异步处理解析和分析
      this.logger.log(`[Stage: Upload File] Triggering async processing for resume ${savedResume.id}`);
      this.processResumeAsync(savedResume.id, userId).catch((error) => {
        this.logger.error(`[Stage: Upload File] Error processing resume ${savedResume.id}:`, error);
      });

      return savedResume;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[Stage: Upload File] Failed to upload resume file - FileName: "${fileName}", Error: ${errorMsg}`, error);
      throw new BadRequestException(`Failed to upload resume: ${errorMsg}`);
    }
  }

  /**
   * 异步处理简历（解析和分析）
   */
  private async processResumeAsync(resumeId: string, userId: string): Promise<void> {
    try {
      this.logger.log(`[Stage: Processing] Starting async resume processing - ResumeId: ${resumeId}, UserId: ${userId}`);
      
      const resume = await this.resumeRepository.findOne({ where: { id: resumeId } });
      if (!resume) {
        this.logger.warn(`[Stage: Processing] Resume not found: ${resumeId}`);
        return;
      }
      this.logger.log(`[Stage: Processing] Resume found - Title: "${resume.title}", ContentLength: ${resume.content.length} chars`);

      // 1. 解析简历内容
      this.logger.log(`[Stage: Parsing] Starting resume content parsing - ResumeId: ${resumeId}`);
      const parsedData = await this.parserService.parseResumeContent(resume.content);
      this.logger.log(`[Stage: Parsing] Resume parsing completed - ResumeId: ${resumeId}`);

      // 2. 更新解析数据
      this.logger.log(`[Stage: Update Parsed Data] Saving parsed data to database - ResumeId: ${resumeId}`);
      resume.parsedData = parsedData;
      await this.resumeRepository.save(resume);
      this.logger.log(`[Stage: Update Parsed Data] Parsed data saved successfully - ResumeId: ${resumeId}`);

      // 3. 执行分析
      this.logger.log(`[Stage: Analysis] Starting resume analysis - ResumeId: ${resumeId}, HasJobDescription: ${!!resume.jobDescription}`);
      const analysisResult = await this.analyzerService.analyzeResume(
        resume.content,
        parsedData,
        resume.jobDescription,
        resume.title
      );
      this.logger.log(`[Stage: Analysis] Resume analysis completed - OverallScore: ${analysisResult.overallScore}, ResumeType: ${analysisResult.resumeType}`);

      // 4. 保存分析结果
      this.logger.log(`[Stage: Save Analysis] Saving analysis results to database - ResumeId: ${resumeId}`);
      const analysis = this.analysisRepository.create({
        resumeId,
        overallScore: analysisResult.overallScore,
        completenessScore: analysisResult.completenessScore,
        keywordScore: analysisResult.keywordScore,
        experienceScore: analysisResult.experienceScore,
        skillsScore: analysisResult.skillsScore,
        keywordAnalysis: JSON.stringify(analysisResult.keywordAnalysis), // 包含keywords和categoryScores
        contentAnalysis: JSON.stringify(analysisResult.contentAnalysis),
        jobMatchAnalysis: analysisResult.jobMatchAnalysis ? JSON.stringify(analysisResult.jobMatchAnalysis) : undefined,
        competencyAnalysis: analysisResult.competencyAnalysis ? JSON.stringify(analysisResult.competencyAnalysis) : undefined,
        detailedReport: analysisResult.detailedReport,
      });

      await this.analysisRepository.save(analysis);
      this.logger.log(`[Stage: Save Analysis] Analysis results saved - ResumeId: ${resumeId}, Scores: [Completeness: ${analysisResult.completenessScore}, Keyword: ${analysisResult.keywordScore}, Experience: ${analysisResult.experienceScore}, Skills: ${analysisResult.skillsScore}]`);

      // 更新简历状态
      this.logger.log(`[Stage: Complete] Marking resume as processed - ResumeId: ${resumeId}`);
      resume.isProcessed = true;
      await this.resumeRepository.save(resume);

      this.logger.log(`[Stage: Complete] Resume processed successfully - ResumeId: ${resumeId}, OverallScore: ${analysisResult.overallScore}`);
    } catch (error) {
      this.logger.error(`[Stage: Processing] Error processing resume ${resumeId} - Error: ${error instanceof Error ? error.message : 'Unknown'}`, error);
    }
  }

  /**
   * 获取用户的所有简历
   */
  async getResumesByUserId(userId: string): Promise<Resume[]> {
    return this.resumeRepository.find({
      where: { ownerId: userId, status: 'active' },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 获取简历详情
   */
  async getResumeById(id: string, userId: string): Promise<Resume> {
    return this.getUserResume(id, userId);
  }

  /**
   * 获取简历分析结果
   */
  async getResumeAnalysis(resumeId: string, userId: string): Promise<ResumeAnalysis> {
    this.logger.log(`[Stage: Get Analysis] Retrieving analysis results - ResumeId: ${resumeId}, UserId: ${userId}`);
    
    // 1. 验证简历所有权
    const resume = await this.getUserResume(resumeId, userId);
    this.logger.log(`[Stage: Get Analysis] Resume verified - Title: "${resume.title}", IsProcessed: ${resume.isProcessed}`);
    
    // 2. 获取分析结果
    const analysis = await this.analysisRepository.findOne({
      where: { resumeId },
    });
    if (!analysis) {
      const errorMsg = resume.isProcessed 
        ? 'Analysis result not found' 
        : 'Resume is still being processed. Please try again later.';
      this.logger.warn(`[Stage: Get Analysis] Analysis not found - ResumeId: ${resumeId}, IsProcessed: ${resume.isProcessed}, Message: ${errorMsg}`);
      throw new NotFoundException(errorMsg);
    }
    this.logger.log(`[Stage: Get Analysis] Analysis retrieved successfully - OverallScore: ${analysis.overallScore}, CreatedAt: ${analysis.createdAt}`);
    return analysis;
  }

  /**
   * 更新简历
   */
  async updateResume(id: string, userId: string, title: string, content: string): Promise<Resume> {
    const resume = await this.getUserResume(id, userId);

    resume.title = title;
    resume.content = content;
    resume.isProcessed = false;

    const updated = await this.resumeRepository.save(resume);

    // 异步重新处理
    this.processResumeAsync(id, userId).catch((error) => {
      this.logger.error(`Error reprocessing resume ${id}:`, error);
    });

    return updated;
  }

  /**
   * 删除简历
   */
  async deleteResume(id: string, userId: string): Promise<void> {
    const resume = await this.getUserResume(id, userId);

    // 逻辑删除
    resume.status = 'deleted';
    await this.resumeRepository.save(resume);
  }

//   /**
//    * 对标职位描述
//    */
//   async compareWithJobDescription(
//     resumeId: string,
//     userId: string,
//     jobDescription: string
//   ): Promise<string> {
//     const resume = await this.getUserResume(resumeId, userId);

//     return this.llmService.generateJobMatchAnalysis(
//       resume.content,
//       jobDescription
//     );
//   }
}
