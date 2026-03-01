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
      this.logger.log(`[Upload] Resume created - ResumeId: ${savedResume.id}, Title: "${dto.title}"`);

      this.processResumeAsync(savedResume.id, userId).catch((error) => {
        this.logger.error(`[Upload] Async processing failed for resume ${savedResume.id}:`, error);
      });

      return savedResume;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[Upload] Failed to upload resume - Error: ${errorMsg}`, error);
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
      this.logger.log(`[Upload] Resume uploaded - ResumeId: ${savedResume.id}, File: "${fileName}", ContentLength: ${content.length} chars`);

      this.processResumeAsync(savedResume.id, userId).catch((error) => {
        this.logger.error(`[Upload] Async processing failed for resume ${savedResume.id}:`, error);
      });

      return savedResume;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[Upload] Failed to upload file "${fileName}" - Error: ${errorMsg}`, error);
      throw new BadRequestException(`Failed to upload resume: ${errorMsg}`);
    }
  }

  /**
   * 异步处理简历（解析和分析）
   * 分析阶段：
   * 0: 待处理
   * 1: 文本提取完成
   * 2: 结构解析完成
   * 3: 评分分析完成
   * 4: 详细报告生成完成
   * 5: 分析完全完成
   */
  private async processResumeAsync(resumeId: string, userId: string): Promise<void> {
    try {
      const resume = await this.resumeRepository.findOne({ where: { id: resumeId } });
      if (!resume) {
        this.logger.warn(`[Process] Resume not found: ${resumeId}`);
        return;
      }

      // 验证简历内容是否为空
      if (!resume.content || resume.content.trim().length === 0) {
        this.logger.warn(`[Process] Resume content is empty - ResumeId: ${resumeId}, FileName: "${resume.fileName}"`);
        
        // 标记为已处理但失败，避免重复尝试
        resume.isProcessed = true;
        await this.resumeRepository.save(resume);
        return;
      }

      // 阶段1: 文本提取完成
      const parsedData = await this.parserService.parseResumeContent(resume.content);
      resume.parsedData = parsedData;
      resume.analysisStage = 1;
      await this.resumeRepository.save(resume);
      this.logger.log(`[Process] Stage 1 completed - Text extraction done - ResumeId: ${resumeId}`);

      // 阶段2: 结构解析完成
      resume.analysisStage = 2;
      await this.resumeRepository.save(resume);
      this.logger.log(`[Process] Stage 2 completed - Structure parsing done - ResumeId: ${resumeId}`);

      // 阶段3: 评分分析完成
      const analysisResult = await this.analyzerService.analyzeResume(
        resume.content,
        parsedData,
        resume.jobDescription,
        resume.title
      );
      resume.analysisStage = 3;
      await this.resumeRepository.save(resume);
      this.logger.log(`[Process] Stage 3 completed - Scoring analysis done - ResumeId: ${resumeId}`);

      // 阶段4: 详细报告生成完成
      const analysis = this.analysisRepository.create({
        resumeId,
        overallScore: analysisResult.overallScore,
        completenessScore: analysisResult.completenessScore,
        keywordScore: analysisResult.keywordScore,
        experienceScore: analysisResult.experienceScore,
        skillsScore: analysisResult.skillsScore,
        keywordAnalysis: JSON.stringify(analysisResult.keywordAnalysis),
        contentAnalysis: JSON.stringify(analysisResult.contentAnalysis),
        jobMatchAnalysis: analysisResult.jobMatchAnalysis ? JSON.stringify(analysisResult.jobMatchAnalysis) : undefined,
        competencyAnalysis: analysisResult.competencyAnalysis ? JSON.stringify(analysisResult.competencyAnalysis) : undefined,
        detailedReport: analysisResult.detailedReport, // 已经是 JSON 字符串，不需要再 stringify
      });

      await this.analysisRepository.save(analysis);
      resume.analysisStage = 4;
      await this.resumeRepository.save(resume);
      this.logger.log(`[Process] Stage 4 completed - Detailed report generated - ResumeId: ${resumeId}`);

      // 阶段5: 分析完全完成
      resume.isProcessed = true;
      resume.analysisStage = 5;
      await this.resumeRepository.save(resume);

      this.logger.log(`[Process] Resume analysis completed - ResumeId: ${resumeId}, OverallScore: ${analysisResult.overallScore}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown';
      this.logger.error(`[Process] Failed to process resume ${resumeId} - Error: ${errorMsg}`, error);
    }
  }

  /**
   * 获取用户的所有简历
   */
  async getResumesByUserId(userId: string): Promise<Partial<Resume>[]> {
    return this.resumeRepository.find({
      select: ['id', 'title', 'fileType', 'fileName', 'createdAt', 'isProcessed'],
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
   * 如果分析未完成，返回当前分析进度阶段
   */
  async getResumeAnalysis(resumeId: string, userId: string): Promise<ResumeAnalysis & { analysisStage?: number }> {
    const resume = await this.getUserResume(resumeId, userId);
    
    const analysis = await this.analysisRepository.findOne({
      where: { resumeId },
    });
    
    if (!analysis) {
      // 分析未完成时，返回当前阶段信息
      const analysisData = {
        analysisStage: resume.analysisStage,
      } as ResumeAnalysis & { analysisStage?: number };
      
      const errorMsg = resume.isProcessed 
        ? 'Analysis result not found' 
        : `Resume is still being processed. Current stage: ${resume.analysisStage}/5. Please try again later.`;
      
      // 如果还在处理中，不抛出异常，而是返回进度信息
      if (!resume.isProcessed && resume.analysisStage > 0) {
        return analysisData;
      }
      
      throw new NotFoundException(errorMsg);
    }
    
    // 将分析阶段信息附加到结果中
    return {
      ...analysis,
      analysisStage: resume.analysisStage,
    };
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

    this.processResumeAsync(id, userId).catch((error) => {
      this.logger.error(`[Update] Failed to reprocess resume ${id}:`, error);
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
}
