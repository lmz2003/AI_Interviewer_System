import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileParserService, ParsedDocument } from './file-parser.service';
import * as iconv from 'iconv-lite';

const fixFileNameEncoding = (fileName: string): string => {
  try {
    const hasGarbledChars = /[\u00E4\u00E5\u00F6\u00FC\u00C4\u00C5\u00D6\u00DC]/.test(fileName);
    
    if (hasGarbledChars) {
      try {
        const decoded = iconv.decode(iconv.encode(fileName, 'latin1'), 'utf8');
        if (decoded && decoded.length > 0) {
          return decoded;
        }
      } catch (e) {
        return fileName;
      }
    }

    const hasChinese = /[\u4e00-\u9fa5]/.test(fileName);
    if (!hasChinese && fileName.length > 0) {
      try {
        const decoded = iconv.decode(iconv.encode(fileName, 'latin1'), 'utf8');
        if (decoded && /[\u4e00-\u9fa5]/.test(decoded)) {
          return decoded;
        }
      } catch (e) {
        return fileName;
      }
    }

    return fileName;
  } catch (error) {
    return fileName;
  }
};

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  filename?: string;
  path?: string;
  buffer?: Buffer;
}

export interface UploadResult {
  fileName: string;
  originalFileName: string;
  fileSize: number;
  fileMimeType: string;
  fileUrl: string;
  parsedDocument: ParsedDocument;
}

@Injectable()
export class DocumentUploadService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'documents');
  private readonly logger = new Logger(DocumentUploadService.name);
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB（适配 Render 免费版代理层限制）

  constructor(private fileParserService: FileParserService) {
    // 确保上传目录存在
    this.ensureUploadDir();
  }

  /**
   * 确保上传目录存在
   */
  private ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`✅ 已创建上传目录: ${this.uploadDir}`);
    }
  }

  /**
   * 上传并处理单个文件
   */
  async uploadDocument(file: UploadedFile): Promise<UploadResult> {
    try {
      if (!file) {
        throw new BadRequestException('未收到文件');
      }

      const fixedOriginalName = fixFileNameEncoding(file.originalname);

      // 验证文件大小
      if (file.size > this.maxFileSize) {
        throw new BadRequestException(
          `文件过大，最大支持 ${this.maxFileSize / 1024 / 1024}MB，当前文件大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`
        );
      }

      // 验证文件类型
      const supportedFormats = this.fileParserService.getSupportedFormats();
      const ext = path.extname(fixedOriginalName).toLowerCase();

      if (!supportedFormats.includes(ext)) {
        throw new BadRequestException(
          `不支持的文件类型: ${ext}。支持的类型: ${supportedFormats.join(', ')}`
        );
      }

      this.logger.log(`开始上传文件: ${fixedOriginalName} (大小: ${file.size} 字节)`);

      let filePath: string;
      let uniqueFileName: string;

      if (file.path) {
        // 文件已经由 multer diskStorage 保存到磁盘
        filePath = file.path;
        uniqueFileName = file.filename || path.basename(filePath);
      } else if (file.buffer) {
        // 内存模式，需要手动保存
        uniqueFileName = this.generateUniqueFileName(fixedOriginalName);
        filePath = path.join(this.uploadDir, uniqueFileName);
        fs.writeFileSync(filePath, file.buffer);
        this.logger.log(`文件已保存: ${filePath}`);
      } else {
        throw new BadRequestException('无效的文件对象');
      }

      // 解析文件内容
      this.logger.log(`开始解析文件: ${fixedOriginalName}`);
      const parsedDocument = await this.fileParserService.parseFile(filePath, fixedOriginalName);

      this.logger.log(`文件解析完成: ${fixedOriginalName}`);

      const fileUrl = `/uploads/documents/${uniqueFileName}`;

      return {
        fileName: uniqueFileName,
        originalFileName: fixedOriginalName,
        fileSize: file.size,
        fileMimeType: file.mimetype,
        fileUrl: fileUrl,
        parsedDocument: parsedDocument,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`文件上传失败: ${errorMsg}`, error);
      throw error;
    }
  }

  /**
   * 批量上传文件
   */
  async uploadDocuments(files: UploadedFile[]): Promise<UploadResult[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('未收到任何文件');
    }

    const maxFiles = 10;
    if (files.length > maxFiles) {
      throw new BadRequestException(`最多只能同时上传 ${maxFiles} 个文件`);
    }

    this.logger.log(`开始批量上传 ${files.length} 个文件`);

    const results: UploadResult[] = [];
    const errors: { fileName: string; error: string }[] = [];

    // 依次处理每个文件
    for (const file of files) {
      try {
        const result = await this.uploadDocument(file);
        results.push(result);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
        const fixedFileName = fixFileNameEncoding(file.originalname);
        errors.push({
          fileName: fixedFileName,
          error: errorMsg,
        });
        this.logger.error(`文件 ${fixedFileName} 上传失败: ${errorMsg}`);
      }
    }

    if (results.length === 0 && errors.length > 0) {
      throw new BadRequestException(
        `所有文件上传失败: ${errors.map(e => `${e.fileName}: ${e.error}`).join('; ')}`
      );
    }

    this.logger.log(`批量上传完成: 成功 ${results.length} 个，失败 ${errors.length} 个`);

    return results;
  }

  /**
   * 生成唯一的文件名
   */
  private generateUniqueFileName(originalName: string): string {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const timestamp = Date.now();
    const uuid = uuidv4().split('-')[0]; // 只取 UUID 的前 8 个字符
    return `${baseName}-${timestamp}-${uuid}${ext}`;
  }

  /**
   * 删除已上传的文件
   */
  async deleteFile(fileName: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadDir, fileName);

      // 安全检查：确保不会删除目录外的文件
      if (!filePath.startsWith(this.uploadDir)) {
        throw new BadRequestException('无效的文件路径');
      }

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`文件已删除: ${filePath}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`删除文件失败: ${errorMsg}`, error);
      throw error;
    }
  }

  /**
   * 获取支持的文件类型
   */
  getSupportedFormats(): string[] {
    return this.fileParserService.getSupportedFormats();
  }
}
