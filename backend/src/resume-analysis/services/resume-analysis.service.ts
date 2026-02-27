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

      // 异步处理解析和分析
      this.processResumeAsync(savedResume.id, userId).catch((error) => {
        this.logger.error(`Error processing resume ${savedResume.id}:`, error);
      });

      return savedResume;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to upload resume:', error);
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
      // 解析文件内容
      const content = await this.parserService.parseResumeBuffer(fileBuffer, fileType);

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

      // 异步处理解析和分析
      this.processResumeAsync(savedResume.id, userId).catch((error) => {
        this.logger.error(`Error processing resume ${savedResume.id}:`, error);
      });

      return savedResume;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to upload resume file:', error);
      throw new BadRequestException(`Failed to upload resume: ${errorMsg}`);
    }
  }

  /**
   * 异步处理简历（解析和分析）
   */
  private async processResumeAsync(resumeId: string, userId: string): Promise<void> {
    try {
      const resume = await this.resumeRepository.findOne({ where: { id: resumeId } });
      if (!resume) {
        this.logger.warn(`Resume not found: ${resumeId}`);
        return;
      }

      // 1. 解析简历内容
      const parsedData = await this.parserService.parseResumeContent(resume.content);

      // 2. 更新解析数据
      resume.parsedData = parsedData;
      await this.resumeRepository.save(resume);

      // 3. 执行分析
      const analysisResult = await this.analyzerService.analyzeResume(
        resume.content,
        parsedData,
        resume.jobDescription,
        resume.title
      );

      // 4. 保存分析结果
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

      // 更新简历状态
      resume.isProcessed = true;
      await this.resumeRepository.save(resume);

      this.logger.log(`Resume processed successfully: ${resumeId}`);
    } catch (error) {
      this.logger.error(`Error processing resume ${resumeId}:`, error);
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
    // 1. 验证简历所有权
    const resume = await this.getUserResume(resumeId, userId);
    // 2. 获取分析结果
    const analysis = await this.analysisRepository.findOne({
      where: { resumeId },
    });
    if (!analysis) {
      throw new NotFoundException(
        resume.isProcessed 
          ? 'Analysis result not found' 
          : 'Resume is still being processed. Please try again later.'
      );
    }
    this.logger.debug(`Retrieved analysis for resume ${resumeId} by user ${userId}`);
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
