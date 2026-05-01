import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Logger,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { PlateAiService } from './services/plate-ai.service';

interface CommandMessage {
  role: string;
  content: string;
  parts?: Array<{ type: string; text?: string }>;
}

interface CommandRequestBody {
  messages: CommandMessage[];
  ctx?: {
    children?: any[];
    selection?: any;
    toolName?: string;
  };
}

interface CopilotRequestBody {
  prompt: string;
  context?: string;
}

@Controller('ai')
export class PlateAiController {
  private readonly logger = new Logger(PlateAiController.name);

  constructor(private plateAiService: PlateAiService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('command')
  async handleCommand(
    @Request() req: any,
    @Body() body: CommandRequestBody,
    @Res() res: Response,
  ) {
    const userId = req.user.id;
    const startTime = Date.now();
    const toolName = body.ctx?.toolName;

    if (toolName === 'comment') {
      return this.handleCommentRequest(req, body, res, userId, startTime);
    }

    return this.handleNormalCommand(req, body, res, userId, startTime);
  }

  private async handleCommentRequest(
    req: any,
    body: CommandRequestBody,
    res: Response,
    userId: string,
    startTime: number,
  ) {
    const responseData: string[] = [];

    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const stream = this.plateAiService.streamCommentResponse(body);

      for await (const chunk of stream) {
        res.write(`data: ${chunk}\n\n`);
        responseData.push(chunk);
      }

      res.write(`data: [DONE]\n\n`);
      res.end();

      const duration = Date.now() - startTime;
      
      this.logger.log('-'.repeat(80));
      this.logger.log(`[Comment] 评论请求完成 - 用户: ${userId}`);
      this.logger.log(`[Comment] 总耗时: ${duration}ms`);
      this.logger.log('-'.repeat(80));
      this.logger.log('[Comment] 返回给前端的数据:');
      this.logger.log(responseData.join('\n'));
      this.logger.log('-'.repeat(80));
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error('!'.repeat(80));
      this.logger.error(`[Comment] 处理评论请求失败 (耗时 ${duration}ms) - 用户: ${userId}`);
      this.logger.error(`[Comment] 错误消息: ${error.message}`);
      this.logger.error('!'.repeat(80));
      res.write(
        `data: {"type":"error","message":"${error.message || '处理失败'}"}\n\n`
      );
      res.end();
    }
  }

  private async handleNormalCommand(
    req: any,
    body: CommandRequestBody,
    res: Response,
    userId: string,
    startTime: number,
  ) {
    const responseData: string[] = [];

    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      res.write(`data: {"type":"start"}\n\n`);
      await new Promise((resolve) => setTimeout(resolve, 10));

      res.write(`data: {"type":"start-step"}\n\n`);
      await new Promise((resolve) => setTimeout(resolve, 10));

      res.write(
        `data: {"type":"text-start","id":"${messageId}","providerMetadata":{"openai":{"itemId":"${messageId}"}}}\n\n`
      );
      await new Promise((resolve) => setTimeout(resolve, 10));

      const stream = this.plateAiService.streamCommandResponse(body);

      for await (const chunk of stream) {
        const escapedText = chunk
          .replace(/\\/g, '\\\\')
          .replace(/"/g, String.raw`\"`)
          .replace(/\n/g, String.raw`\n`)
          .replace(/\r/g, String.raw`\r`)
          .replace(/\t/g, String.raw`\t`);

        const sseData = `data: {"type":"text-delta","id":"${messageId}","delta":"${escapedText}"}\n\n`;
        res.write(sseData);
        responseData.push(chunk);
      }

      res.write(`data: {"type":"text-end","id":"${messageId}"}\n\n`);
      await new Promise((resolve) => setTimeout(resolve, 10));

      res.write(`data: {"type":"finish-step"}\n\n`);
      await new Promise((resolve) => setTimeout(resolve, 10));

      res.write(`data: {"type":"finish"}\n\n`);
      await new Promise((resolve) => setTimeout(resolve, 10));

      res.write(`data: [DONE]\n\n`);

      res.end();

      const duration = Date.now() - startTime;
      const fullResponse = responseData.join('');
      
      this.logger.log('-'.repeat(80));
      this.logger.log(`[Command] AI命令请求完成 - 用户: ${userId}`);
      this.logger.log(`[Command] 总耗时: ${duration}ms`);
      this.logger.log(`[Command] 返回给前端的数据长度: ${fullResponse.length} 字符`);
      this.logger.log('-'.repeat(80));
      this.logger.log('[Command] 返回给前端的数据:');
      this.logger.log(fullResponse);
      this.logger.log('-'.repeat(80));
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error('!'.repeat(80));
      this.logger.error(`[Command] 处理AI命令失败 (耗时 ${duration}ms) - 用户: ${userId}`);
      this.logger.error(`[Command] 错误类型: ${error.constructor?.name || 'Unknown'}`);
      this.logger.error(`[Command] 错误消息: ${error.message}`);
      if (error.stack) {
        this.logger.error(`[Command] 错误堆栈: ${error.stack}`);
      }
      this.logger.error('!'.repeat(80));
      res.write(
        `data: {"type":"error","message":"${error.message || '处理失败'}"}\n\n`
      );
      res.end();
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('copilot')
  async handleCopilot(
    @Request() req: any,
    @Body() body: CopilotRequestBody,
    @Res() res: Response,
  ) {
    const userId = req.user.id;
    const startTime = Date.now();
    const responseData: string[] = [];

    this.logger.log('='.repeat(80));
    this.logger.log(`[Copilot] 收到文本补全请求 - 用户: ${userId}`);
    this.logger.log(`[Copilot] 请求体: ${JSON.stringify(body, null, 2)}`);
    this.logger.log('='.repeat(80));

    try {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const stream = this.plateAiService.streamCopilotResponse(body);

      for await (const chunk of stream) {
        res.write(chunk);
        responseData.push(chunk);
      }

      res.end();

      const duration = Date.now() - startTime;
      const fullResponse = responseData.join('');
      
      this.logger.log('-'.repeat(80));
      this.logger.log(`[Copilot] 文本补全请求完成 - 用户: ${userId}`);
      this.logger.log(`[Copilot] 总耗时: ${duration}ms`);
      this.logger.log(`[Copilot] 返回给前端的数据长度: ${fullResponse.length} 字符`);
      this.logger.log('-'.repeat(80));
      this.logger.log('[Copilot] 返回给前端的数据:');
      this.logger.log(fullResponse);
      this.logger.log('-'.repeat(80));
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error('!'.repeat(80));
      this.logger.error(`[Copilot] 处理文本补全失败 (耗时 ${duration}ms) - 用户: ${userId}`);
      this.logger.error(`[Copilot] 错误类型: ${error.constructor?.name || 'Unknown'}`);
      this.logger.error(`[Copilot] 错误消息: ${error.message}`);
      if (error.stack) {
        this.logger.error(`[Copilot] 错误堆栈: ${error.stack}`);
      }
      this.logger.error('!'.repeat(80));
      res.status(500).send(error.message || '处理失败');
    }
  }
}
