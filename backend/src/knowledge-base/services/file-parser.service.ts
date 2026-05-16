import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import csv from 'csv-parser';
import * as iconv from 'iconv-lite';

export interface ParsedDocument {
  title: string;
  content: string;
  metadata: Record<string, any>;
  documentType: string;
}

@Injectable()
export class FileParserService {
  private readonly logger = new Logger(FileParserService.name);
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB（适配 Render 免费版代理层限制）

  constructor() {}

  /**
   * 根据文件类型解析文档
   */
  async parseFile(filePath: string, fileName: string): Promise<ParsedDocument> {
    try {
      // 验证文件存在
      if (!fs.existsSync(filePath)) {
        throw new BadRequestException(`文件不存在: ${filePath}`);
      }

      // 检查文件大小
      const stats = fs.statSync(filePath);
      if (stats.size > this.maxFileSize) {
        throw new BadRequestException(
          `文件过大，最大支持 ${this.maxFileSize / 1024 / 1024}MB，当前文件大小 ${stats.size / 1024 / 1024}MB`
        );
      }

      const ext = path.extname(fileName).toLowerCase();
      const baseName = path.basename(fileName, ext);

      this.logger.log(`开始解析文件: ${fileName} (类型: ${ext})`);

      switch (ext) {
        case '.pdf':
          return await this.parsePDF(filePath, baseName);
        case '.docx':
          return await this.parseDOCX(filePath, baseName);
        case '.xlsx':
        case '.xls':
          return await this.parseExcel(filePath, baseName);
        case '.csv':
          return await this.parseCSV(filePath, baseName);
        case '.md':
          return await this.parseMarkdown(filePath, baseName);
        case '.json':
          return await this.parseJSON(filePath, baseName);
        case '.txt':
          return await this.parseTXT(filePath, baseName);
        default:
          throw new BadRequestException(
            `不支持的文件类型: ${ext}。支持的类型: .pdf, .docx, .xlsx, .xls, .csv, .md, .json, .txt`
          );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`文件解析失败 (${fileName}): ${errorMsg}`, error);
      throw error;
    }
  }

  /**
   * 解析 PDF 文件
   */
  private async parsePDF(filePath: string, baseName: string): Promise<ParsedDocument> {
    try {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);

      let content = data.text;

      if (!content || content.trim().length === 0) {
        throw new BadRequestException('PDF 文件为空或无法提取文本');
      }

      content = this.fixEncoding(content);

      // 改进文本格式化：添加段落分隔符，便于后续分割
      // 移除多余空行，保留必要的段落分隔
      content = content
        .replace(/\n{3,}/g, '\n\n')  // 将多个空行替换为两个空行
        .replace(/([。！？\n])\n(?=[^\n])/g, '$1\n');  // 确保标点后有换行

      return {
        title: baseName,
        content: content.trim(),
        metadata: {
          pages: data.numpages,
          author: data.info?.Author || 'Unknown',
          creator: data.info?.Creator || 'Unknown',
          creationDate: data.info?.CreationDate || null,
        },
        documentType: 'pdf',
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      throw new BadRequestException(`PDF 解析失败: ${errorMsg}`);
    }
  }

  /**
   * 修复文本编码问题
   */
  private fixEncoding(text: string): string {
    try {
      const hasGarbledChars = /[^\x00-\x7F]/.test(text) && /[\u00E4\u00E5\u00F6\u00FC\u00C4\u00C5\u00D6\u00DC]/.test(text);
      
      if (hasGarbledChars) {
        try {
          const decoded = iconv.decode(iconv.encode(text, 'latin1'), 'utf8');
          if (this.isValidUTF8(decoded)) {
            return decoded;
          }
        } catch (e) {
          this.logger.warn('编码转换失败，使用原始文本');
        }
      }

      const hasChinese = /[\u4e00-\u9fa5]/.test(text);
      if (!hasChinese && text.length > 0) {
        try {
          const decoded = iconv.decode(iconv.encode(text, 'latin1'), 'utf8');
          if (this.isValidUTF8(decoded) && /[\u4e00-\u9fa5]/.test(decoded)) {
            return decoded;
          }
        } catch (e) {
          this.logger.warn('编码转换失败，使用原始文本');
        }
      }

      return text;
    } catch (error) {
      this.logger.warn('编码修复失败，使用原始文本', error);
      return text;
    }
  }

  /**
   * 检查文本是否为有效的 UTF-8
   */
  private isValidUTF8(text: string): boolean {
    try {
      const buffer = Buffer.from(text, 'utf8');
      const decoded = buffer.toString('utf8');
      return decoded === text;
    } catch {
      return false;
    }
  }

  /**
   * 解析 Word 文件 (.docx)
   */
  private async parseDOCX(filePath: string, baseName: string): Promise<ParsedDocument> {
    try {
      const buffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer });

      const content = result.value;
      if (!content || content.trim().length === 0) {
        throw new BadRequestException('Word 文件为空或无法提取文本');
      }

      return {
        title: baseName,
        content: content.trim(),
        metadata: {
          warnings: result.messages.map((m: any) => m.message) || [],
        },
        documentType: 'docx',
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      throw new BadRequestException(`Word 文件解析失败: ${errorMsg}`);
    }
  }

  /**
   * 解析 Excel 文件 (.xlsx, .xls)
   */
  private async parseExcel(filePath: string, baseName: string): Promise<ParsedDocument> {
    try {
      const workbook = XLSX.readFile(filePath);

      // 获取所有工作表的数据
      const sheetData: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const csvContent = XLSX.utils.sheet_to_csv(worksheet);
        sheetData.push(`=== 工作表: ${sheetName} ===\n${csvContent}`);
      }

      const content = sheetData.join('\n\n');
      if (!content || content.trim().length === 0) {
        throw new BadRequestException('Excel 文件为空');
      }

      return {
        title: baseName,
        content: content.trim(),
        metadata: {
          sheets: workbook.SheetNames,
          sheetCount: workbook.SheetNames.length,
        },
        documentType: 'xlsx',
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      throw new BadRequestException(`Excel 文件解析失败: ${errorMsg}`);
    }
  }

  /**
   * 解析 CSV 文件
   */
  private async parseCSV(filePath: string, baseName: string): Promise<ParsedDocument> {
    return new Promise((resolve, reject) => {
      try {
        const rows: string[] = [];
        const headers: string[] = [];
        let headerSet = false;

        fs.createReadStream(filePath)
          .pipe(csv())
          .on('headers', (parsedHeaders: string[]) => {
            headers.push(...parsedHeaders);
            headerSet = true;
          })
          .on('data', (row: any) => {
            if (headerSet && headers.length > 0) {
              const values = headers.map(h => row[h] || '');
              rows.push(values.join(' | '));
            }
          })
          .on('end', () => {
            if (rows.length === 0) {
              reject(new BadRequestException('CSV 文件为空'));
              return;
            }

            const headerLine = headers.join(' | ');
            const content = [headerLine, ...rows].join('\n');

            resolve({
              title: baseName,
              content: content.trim(),
              metadata: {
                rows: rows.length,
                columns: headers.length,
              },
              documentType: 'csv',
            });
          })
          .on('error', (error: any) => {
            reject(new BadRequestException(`CSV 解析失败: ${error.message}`));
          });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
        reject(new BadRequestException(`CSV 解析失败: ${errorMsg}`));
      }
    });
  }

  /**
   * 解析 Markdown 文件
   */
  private async parseMarkdown(filePath: string, baseName: string): Promise<ParsedDocument> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      if (!content || content.trim().length === 0) {
        throw new BadRequestException('Markdown 文件为空');
      }

      // 简单的 frontmatter 解析
      let metadata: Record<string, any> = {};
      let mainContent = content;

      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (frontmatterMatch) {
        // 解析 YAML frontmatter
        const frontmatterStr = frontmatterMatch[1];
        const lines = frontmatterStr.split('\n');
        for (const line of lines) {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length > 0) {
            metadata[key.trim()] = valueParts.join(':').trim();
          }
        }
        mainContent = frontmatterMatch[2];
      }

      return {
        title: metadata.title || baseName,
        content: mainContent.trim(),
        metadata: {
          ...metadata,
          hasMarkdown: true,
        },
        documentType: 'markdown',
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      throw new BadRequestException(`Markdown 解析失败: ${errorMsg}`);
    }
  }

  /**
   * 解析 JSON 文件
   */
  private async parseJSON(filePath: string, baseName: string): Promise<ParsedDocument> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const jsonData = JSON.parse(content);

      // 将 JSON 转换为可读的文本格式
      const contentStr = this.jsonToText(jsonData);

      if (!contentStr || contentStr.trim().length === 0) {
        throw new BadRequestException('JSON 文件为空');
      }

      return {
        title: baseName,
        content: contentStr.trim(),
        metadata: {
          isJSON: true,
          structure: typeof jsonData === 'object' ? Object.keys(jsonData).join(', ') : 'scalar',
        },
        documentType: 'json',
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      throw new BadRequestException(`JSON 解析失败: ${errorMsg}`);
    }
  }

  /**
   * 解析纯文本文件
   */
  private async parseTXT(filePath: string, baseName: string): Promise<ParsedDocument> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      if (!content || content.trim().length === 0) {
        throw new BadRequestException('文本文件为空');
      }

      return {
        title: baseName,
        content: content.trim(),
        metadata: {
          encoding: 'utf-8',
        },
        documentType: 'text',
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      throw new BadRequestException(`文本文件解析失败: ${errorMsg}`);
    }
  }

  /**
   * 将 JSON 对象转换为可读的文本格式
   */
  private jsonToText(obj: any, indent: number = 0): string {
    const indentStr = '  '.repeat(indent);
    const lines: string[] = [];

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const item = obj[i];
        if (typeof item === 'object' && item !== null) {
          lines.push(`${indentStr}[${i}]:`);
          lines.push(this.jsonToText(item, indent + 1));
        } else {
          lines.push(`${indentStr}[${i}]: ${item}`);
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          lines.push(`${indentStr}${key}:`);
          lines.push(this.jsonToText(value, indent + 1));
        } else {
          lines.push(`${indentStr}${key}: ${value}`);
        }
      }
    } else {
      lines.push(`${indentStr}${obj}`);
    }

    return lines.join('\n');
  }

  /**
   * 获取支持的文件类型列表
   */
  getSupportedFormats(): string[] {
    return ['.pdf', '.docx', '.xlsx', '.xls', '.csv', '.md', '.json', '.txt'];
  }

  /**
   * 验证 MIME 类型
   */
  validateMimeType(mimeType: string): boolean {
    const supportedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-word.document.macroEnabled.12',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.ms-excel.sheet.macroEnabled.12',
      'text/csv',
      'text/markdown',
      'text/plain',
      'application/json',
    ];

    return supportedMimes.includes(mimeType);
  }
}
