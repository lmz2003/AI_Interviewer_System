import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request, Logger, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AIAssistantService } from './services/ai-assistant.service';
import { QueryKnowledgeDto } from '../knowledge-base/dto/query-knowledge.dto';
import { Response } from 'express';

interface CreateSessionBody {
  initialMessage?: string;
}

interface SendMessageBody {
  message: string;
  sessionId?: string;
  useRAG?: boolean;
  topK?: number;
  threshold?: number;
  libraryIds?: string[];
}

@Controller('ai-assistant')
export class AIAssistantController {
  private readonly logger = new Logger(AIAssistantController.name);

  constructor(
    private aiAssistantService: AIAssistantService,
  ) {}

  // 获取会话列表
  @UseGuards(AuthGuard('jwt'))
  @Get('sessions')
  async getSessions(@Request() req: any) {
    try {
      const userId = req.user.id;
      const sessions = await this.aiAssistantService.getSessions(userId);

      return {
        success: true,
        data: sessions,
      };
    } catch (error: any) {
      this.logger.error('获取会话列表失败:', error);
      return {
        success: false,
        message: error.message || '获取会话列表失败',
      };
    }
  }

  // 创建新会话
  @UseGuards(AuthGuard('jwt'))
  @Post('sessions')
  async createSession(@Request() req: any, @Body() body: CreateSessionBody) {
    try {
      const userId = req.user.id;
      const initialMessage = body.initialMessage || '';

      const session = await this.aiAssistantService.createSession(userId, initialMessage);

      return {
        success: true,
        data: session,
      };
    } catch (error: any) {
      this.logger.error('创建会话失败:', error);
      return {
        success: false,
        message: error.message || '创建会话失败',
      };
    }
  }

  // 获取会话详情和消息
  @UseGuards(AuthGuard('jwt'))
  @Get('sessions/:id')
  async getSession(@Request() req: any, @Param('id') sessionId: string) {
    try {
      const userId = req.user.id;
      const { session, messages } = await this.aiAssistantService.getSession(sessionId, userId);

      // 转换消息格式以匹配前端期望
      const formattedMessages = messages.map(message => ({
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        sources: message.sources,
      }));

      return {
        success: true,
        data: {
          session,
          messages: formattedMessages,
        },
      };
    } catch (error: any) {
      this.logger.error('获取会话详情失败:', error);
      return {
        success: false,
        message: error.message || '获取会话详情失败',
      };
    }
  }

  // 删除会话
  @UseGuards(AuthGuard('jwt'))
  @Delete('sessions/:id')
  async deleteSession(@Request() req: any, @Param('id') sessionId: string) {
    try {
      const userId = req.user.id;
      await this.aiAssistantService.deleteSession(sessionId, userId);

      return {
        success: true,
        message: '会话删除成功',
      };
    } catch (error: any) {
      this.logger.error('删除会话失败:', error);
      return {
        success: false,
        message: error.message || '删除会话失败',
      };
    }
  }


  // 流式发送消息
  @UseGuards(AuthGuard('jwt'))
  @Post('message/stream')
  async sendMessageStream(@Request() req: any, @Body() body: SendMessageBody, @Res() res: Response) {
    let requestId: string | null = null;
    
    try {
      const userId = req.user.id;
      const { message, sessionId, useRAG = true, topK = 5, threshold = 0.5, libraryIds } = body;
      
      requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      this.logger.log(`[流式消息] 收到请求 - 用户: ${userId}, 消息: "${message.substring(0, 50)}...", 会话: ${sessionId || '新会话'}, RAG: ${useRAG}, 知识库: ${libraryIds?.join(',') || '全部'}, 请求ID: ${requestId}`);

      if (!message || message.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: '消息内容不能为空',
        });
        return;
      }

      this.aiAssistantService.registerAbortController(userId, requestId);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // 禁用 Nginx 缓冲
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      res.write(`data: ${JSON.stringify({
        type: 'request-id',
        data: { requestId },
      })}\n\n`);

      this.logger.log('[流式消息] SSE 响应头设置完成，开始流式处理...');

      // 启动心跳定时器，每 15 秒发送一次 heartbeat，防止连接因空闲超时被断开
      const heartbeatInterval = setInterval(() => {
        try {
          res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
          this.logger.debug('[流式消息] 发送心跳包');
        } catch (e) {
          this.logger.warn('[流式消息] 发送心跳包失败，连接可能已断开');
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      try {
        let chunkCount = 0;
        const result = await this.aiAssistantService.processMessageStream(
          userId,
          message,
          sessionId,
          useRAG,
          topK,
          threshold,
          (chunk: string) => {
            if (chunk && typeof chunk === 'string' && chunk.length > 0) {
              try {
                chunkCount++;
                
                if (chunkCount % 5 === 0) {
                  this.logger.debug(`[流式消息] 已发送 ${chunkCount} 个数据块到前端`);
                }

                res.write(`data: ${JSON.stringify({
                  type: 'chunk',
                  data: chunk,
                })}\n\n`);
              } catch (writeError) {
                this.logger.warn('写入数据块失败:', writeError);
              }
            }
          },
          requestId,
          libraryIds,
          (status: string) => {
            try {
              this.logger.log(`[流式消息] 发送状态事件: ${status}`);
              res.write(`data: ${JSON.stringify({
                type: 'status',
                data: status,
              })}\n\n`);
            } catch (writeError) {
              this.logger.warn('写入状态事件失败:', writeError);
            }
          },
        );

        this.logger.log(`[流式消息] 流式处理完成，共发送 ${chunkCount} 个数据块，会话: ${result.sessionId}`);

        res.write(`data: ${JSON.stringify({
          type: 'done',
          data: {
            sessionId: result.sessionId,
            sources: result.sources,
          },
        })}\n\n`);

        clearInterval(heartbeatInterval);
        res.end();
      } catch (error: any) {
        this.logger.error('流式处理消息失败:', error);
        clearInterval(heartbeatInterval);
        res.write(`data: ${JSON.stringify({
          type: 'error',
          message: error.message || '流式处理失败',
        })}\n\n`);
        res.end();
      } finally {
        // 清理中止控制器和心跳定时器
        clearInterval(heartbeatInterval);
        if (requestId) {
          this.aiAssistantService.cleanupAbortController(userId, requestId);
        }
      }
    } catch (error: any) {
      this.logger.error('发送流式消息失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '发送流式消息失败',
      });
    }
  }

  // 中止流式消息
  @UseGuards(AuthGuard('jwt'))
  @Post('message/abort')
  async abortMessage(@Request() req: any, @Body() body: any) {
    try {
      const userId = req.user.id;
      const { requestId } = body;

      if (!requestId) {
        return {
          success: false,
          message: '缺少 requestId 参数',
        };
      }

      this.logger.log(`[中止消息] 收到中止请求 - 用户: ${userId}, 请求ID: ${requestId}`);

      const success = this.aiAssistantService.abortRequest(userId, requestId);

      return {
        success,
        message: success ? '消息已中止' : '未找到对应的请求',
      };
    } catch (error: any) {
      this.logger.error('中止消息失败:', error);
      return {
        success: false,
        message: error.message || '中止消息失败',
      };
    }
  }
}
