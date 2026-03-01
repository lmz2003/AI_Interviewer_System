import { IsString, IsOptional, IsEnum, IsUUID, IsIn } from 'class-validator';

export type SceneType = 'technical' | 'behavioral' | 'hr' | 'stress' | 'group';
export type JobType = 'frontend' | 'backend' | 'fullstack' | 'pm' | 'data' | 'design' | 'general';
export type DifficultyLevel = 'junior' | 'medium' | 'senior';

export class CreateInterviewDto {
  @IsString()
  @IsIn(['technical', 'behavioral', 'hr', 'stress', 'group'])
  sceneType!: SceneType;

  @IsOptional()
  @IsString()
  @IsIn(['frontend', 'backend', 'fullstack', 'pm', 'data', 'design', 'general'])
  jobType?: JobType;

  @IsOptional()
  @IsString()
  @IsIn(['junior', 'medium', 'senior'])
  difficulty?: DifficultyLevel;

  @IsOptional()
  @IsUUID()
  resumeId?: string;

  @IsOptional()
  @IsString()
  title?: string;
}
