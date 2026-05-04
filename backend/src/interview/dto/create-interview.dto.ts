import { IsString, IsOptional, IsEnum, IsUUID, IsIn, IsArray } from 'class-validator';
import { InterviewMode } from '../entities/interview.entity';

export type SceneType = 'technical' | 'behavioral' | 'hr' | 'stress' | 'group';
export type JobType = 'frontend' | 'backend' | 'fullstack' | 'pm' | 'data' | 'design' | 'general';
export type DifficultyLevel = 'junior' | 'medium' | 'senior';

export class CreateInterviewDto {
  @IsString({ message: '场景类型必须是字符串' })
  @IsIn(['technical', 'behavioral', 'hr', 'stress', 'group'], {
    message: '场景类型必须是 technical, behavioral, hr, stress, group 之一',
  })
  sceneType!: SceneType;

  @IsOptional()
  @IsString({ message: '岗位类型必须是字符串' })
  @IsIn(['frontend', 'backend', 'fullstack', 'pm', 'data', 'design', 'general'], {
    message: '岗位类型必须是有效选项之一',
  })
  jobType?: JobType;

  @IsOptional()
  @IsString({ message: '难度等级必须是字符串' })
  @IsIn(['junior', 'medium', 'senior'], {
    message: '难度等级必须是 junior, medium, senior 之一',
  })
  difficulty?: DifficultyLevel;

  @IsOptional()
  @IsUUID('4', { message: '简历ID必须是有效的UUID格式' })
  resumeId?: string;

  @IsOptional()
  @IsString({ message: '面试模式必须是字符串' })
  @IsIn(['text', 'voice', 'video'], {
    message: '面试模式必须是 text、voice 或 video',
  })
  mode?: InterviewMode;

  @IsOptional()
  @IsString({ message: '标题必须是字符串' })
  title?: string;

  @IsOptional()
  @IsArray({ message: '知识库ID列表必须是数组' })
  @IsUUID('4', { each: true, message: '每个知识库ID必须是有效的UUID格式' })
  libraryIds?: string[];
}
