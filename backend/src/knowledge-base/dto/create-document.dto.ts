import { IsString, IsOptional, IsNotEmpty, MaxLength, MinLength, IsNumber, IsUUID } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  content!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  source?: string;

  @IsString()
  @IsOptional()
  documentType?: string;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsUUID('4', { message: '知识库ID必须是有效的UUID格式' })
  @IsOptional()
  libraryId?: string;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsNumber()
  @IsOptional()
  fileSize?: number;

  @IsString()
  @IsOptional()
  fileMimeType?: string;

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsString()
  @IsOptional()
  uploadType?: string;
}
