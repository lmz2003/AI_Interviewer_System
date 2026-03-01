import { IsString, IsOptional, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message!: string;

  @IsUUID()
  sessionId!: string;

  @IsOptional()
  @IsString()
  questionType?: string;
}
