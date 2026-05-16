import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
// 注意：不再使用 Express 的 cors 中间件，改用 NestJS 内置的 enableCors
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter';
import { LoggerInterceptor } from './common/interceptors/logger.interceptor';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';

// 抑制 LangChain 的警告信息
process.env.LANGCHAIN_VERBOSE = 'false';
// 抑制所有调试级别的日志
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const message = args[0];
  if (typeof message === 'string' && message.includes('already exists in this message chunk')) {
    return;
  }
  originalWarn.apply(console, args);
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  
  // 配置CORS - 必须在 setGlobalPrefix 之前调用
  // 使用 NestJS 内置的 enableCors 而非 Express cors 中间件
  // 这样 CORS 处理会在 AuthGuard 之前生效，避免 OPTIONS 预检请求被拦截返回 403
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://ai-interviewer-system.vercel.app',
      'http://101.201.237.30',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges'],
  });
  // 增加body-parser请求体大小限制，解决头像上传问题
  app.use(bodyParser.json({ limit: '5mb' })); // 增加JSON请求体大小限制到5MB
  app.use(bodyParser.urlencoded({ limit: '5mb', extended: true })); // 增加URL编码请求体大小限制到5MB
  
  // 配置静态文件服务
  const uploadsPath = path.join(process.cwd(), 'uploads');
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads',
  });
  
  // 设置全局前缀
  app.setGlobalPrefix('api');
  
  // 应用全局过滤器、拦截器和管道
  app.useGlobalFilters(new DatabaseExceptionFilter(), new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggerInterceptor());
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false, // 改为false，允许额外属性但会忽略它们
  }));
  
  // 获取端口配置
  const port = configService.get<number>('PORT') || 3001;
  
  await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);
}
bootstrap();