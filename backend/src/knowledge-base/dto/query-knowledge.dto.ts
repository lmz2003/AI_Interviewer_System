import { IsString, IsNotEmpty, IsOptional, Min, Max, MinLength, MaxLength, IsArray, IsUUID } from 'class-validator';

export class QueryKnowledgeDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(5000)
  query!: string;

  @IsOptional()
  @Min(1)
  @Max(20)
  topK?: number;

  @IsOptional()
  @Min(0)
  @Max(1)
  threshold?: number;

  @IsOptional()
  @IsArray({ message: '知识库ID列表必须是数组' })
  @IsUUID('4', { message: '知识库ID必须是有效的UUID格式', each: true })
  libraryIds?: string[];

  @IsOptional()
  @IsString()
  searchMode?: 'specific' | 'all';
}
