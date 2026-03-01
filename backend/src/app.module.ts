import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { NotesModule } from './notes/notes.module';
import { UsersModule } from './users/users.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { AIAssistantModule } from './ai-assistant/ai-assistant.module';
import { UploadModule } from './upload/upload.module';
import { ResumeAnalysisModule } from './resume-analysis/resume-analysis.module';
import { InterviewModule } from './interview/interview.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{
      ttl: 15 * 60 * 1000,
      limit: process.env.MAX_REQUESTS_PER_15MIN ? parseInt(process.env.MAX_REQUESTS_PER_15MIN) : 5,
    }]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '201966',
      database: process.env.DB_NAME || 'notes',
      autoLoadEntities: true,
      synchronize: true,
      extra: {
        clientEncoding: 'utf8',
      },
    }),
    AuthModule,
    NotesModule,
    UsersModule,
    KnowledgeBaseModule,
    AIAssistantModule,
    UploadModule,
    ResumeAnalysisModule,
    InterviewModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}