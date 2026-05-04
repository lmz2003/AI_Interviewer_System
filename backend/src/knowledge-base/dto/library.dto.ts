import { IsString, IsOptional, IsNotEmpty, MaxLength, IsHexColor, IsBoolean } from 'class-validator';

export class CreateLibraryDto {
  @IsString()
  @IsNotEmpty({ message: '知识库名称不能为空' })
  @MaxLength(100, { message: '知识库名称不能超过100个字符' })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '描述不能超过500个字符' })
  description?: string;

  @IsOptional()
  @IsString()
  @IsHexColor({ message: '颜色必须是有效的十六进制颜色值' })
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string;
}

export class UpdateLibraryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '知识库名称不能为空' })
  @MaxLength(100, { message: '知识库名称不能超过100个字符' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '描述不能超过500个字符' })
  description?: string;

  @IsOptional()
  @IsString()
  @IsHexColor({ message: '颜色必须是有效的十六进制颜色值' })
  color?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive必须是布尔值' })
  isActive?: boolean;
}
