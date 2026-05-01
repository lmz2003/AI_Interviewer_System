import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

interface SelectionPoint {
  path: number[];
  offset: number;
}

interface Selection {
  anchor: SelectionPoint;
  focus: SelectionPoint;
}

interface CommandRequest {
  messages: Array<{
    role: string;
    content: string;
    parts?: Array<{ type: string; text?: string }>;
  }>;
  ctx?: {
    children?: any[];
    selection?: Selection;
    toolName?: string;
  };
}

interface CopilotRequest {
  prompt: string;
  context?: string;
}

interface CommentData {
  blockId: string;
  content: string;
  comment: string;
}

@Injectable()
export class PlateAiService {
  private llm: ChatOpenAI;
  private readonly logger = new Logger(PlateAiService.name);
  private modelName = this.configService.get<string>('LLM_MODEL') || 'gpt-3.5-turbo';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('LLM_API_KEY');
    const baseUrl = this.configService.get<string>('LLM_BASE_URL');
    const provider = this.configService.get<string>('LLM_PROVIDER') || 'openai';

    if (!apiKey) {
      this.logger.warn('API Key 未配置，请设置 LLM_API_KEY');
    }

    if (provider === 'siliconflow') {
      this.logger.log(`[Plate AI] 使用硅基流动 LLM: ${this.modelName}`);
      this.logger.log(`[Plate AI] API Base URL: ${baseUrl || 'https://api.siliconflow.cn/v1'}`);
      this.llm = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: this.modelName,
        configuration: {
          baseURL: baseUrl || 'https://api.siliconflow.cn/v1',
        },
        temperature: 0.7,
        maxTokens: 2000,
        streaming: true,
      });
    } else {
      this.logger.log(`[Plate AI] 使用 OpenAI LLM: ${this.modelName}`);
      if (baseUrl) {
        this.logger.log(`[Plate AI] API Base URL: ${baseUrl}`);
      }
      this.llm = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: this.modelName,
        configuration: baseUrl ? {
          baseURL: baseUrl,
        } : undefined,
        temperature: 0.7,
        maxTokens: 2000,
        streaming: true,
      });
    }
    
    this.logger.log('[Plate AI] 服务初始化完成');
  }

  async *streamCommandResponse(request: CommandRequest): AsyncGenerator<string> {
    const startTime = Date.now();
    let chunkCount = 0;
    let totalLength = 0;
    const fullContent: string[] = [];

    try {
      const systemPrompt = this.buildSystemPrompt(request);
      const userMessage = this.buildUserMessage(request);

      this.logger.log('='.repeat(80));
      this.logger.log('[Command] 收到 AI 命令请求');
      this.logger.log(`[Command] 用户消息: ${userMessage}`);
      this.logger.log(`[Command] 系统提示词长度: ${systemPrompt.length} 字符`);
      
      if (request.ctx?.children) {
        const fullContent = this.extractEditorContent(request.ctx.children);
        const selectedContent = this.extractSelectedContent(request.ctx.children, request.ctx.selection);
        this.logger.log(`[Command] 编辑器完整内容长度: ${fullContent.length} 字符`);
        this.logger.log(`[Command] 选中文本长度: ${selectedContent.length} 字符`);
        this.logger.log(`[Command] 选中文本: ${selectedContent}`);
        if (request.ctx.selection) {
          this.logger.log(`[Command] 选区信息: anchor=${JSON.stringify(request.ctx.selection.anchor)}, focus=${JSON.stringify(request.ctx.selection.focus)}`);
        }
      }
      this.logger.log('='.repeat(80));

      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userMessage),
      ];

      this.logger.log('[Command] 开始流式生成...');
      const stream = await this.llm.stream(messages);

      for await (const chunk of stream) {
        const content = chunk.content;
        if (typeof content === 'string' && content.length > 0) {
          chunkCount++;
          totalLength += content.length;
          fullContent.push(content);
          yield content;
        }
      }

      const duration = Date.now() - startTime;
      const generatedText = fullContent.join('');
      
      this.logger.log('-'.repeat(80));
      this.logger.log('[Command] 流式生成完成');
      this.logger.log(`[Command] 统计信息: 耗时 ${duration}ms, 生成 ${chunkCount} 个数据块, 总长度 ${totalLength} 字符`);
      this.logger.log('-'.repeat(80));
      this.logger.log('[Command] AI 生成结果:');
      this.logger.log(generatedText);
      this.logger.log('-'.repeat(80));
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error('!'.repeat(80));
      this.logger.error(`[Command] 流式生成失败 (耗时 ${duration}ms)`);
      this.logger.error(`[Command] 错误类型: ${error.constructor?.name || 'Unknown'}`);
      this.logger.error(`[Command] 错误消息: ${error.message}`);
      if (error.stack) {
        this.logger.error(`[Command] 错误堆栈: ${error.stack}`);
      }
      this.logger.error('!'.repeat(80));
      throw error;
    }
  }

  async *streamCommentResponse(request: CommandRequest): AsyncGenerator<string> {
    const startTime = Date.now();
    const commentDataList: CommentData[] = [];

    try {
      const children = request.ctx?.children || [];
      const selection = request.ctx?.selection;
      
      const blocks = this.extractBlocksWithIds(children);
      const selectedContent = this.extractSelectedContent(children, selection);
      const userInstruction = this.extractRawUserMessage(request);

      const systemPrompt = `你是一个文档审核助手。你会收到一个文档的内容，需要对内容进行评论。

你的任务是：
1. 阅读文档内容并提供有价值的评论
2. 对于每条评论，生成一个 JSON 对象，包含：
   - blockId: 被评论内容所在块的 ID
   - content: 被评论的原文片段（必须是从文档中精确复制的）
   - comment: 对该片段的评论或建议

规则：
- 如果用户选中了特定文本，优先对选中的文本进行评论
- content 字段必须是文档中的原文，不能修改或改写
- 每条评论应该简洁、有建设性
- 至少提供一条评论
- 输出格式必须是有效的 JSON 数组`;

      const userPrompt = this.buildCommentUserPrompt(blocks, selectedContent, userInstruction);

      this.logger.log('='.repeat(80));
      this.logger.log('[Comment] 收到评论请求');
      this.logger.log(`[Comment] 用户指令: ${userInstruction}`);
      this.logger.log(`[Comment] 块数量: ${blocks.length}`);
      this.logger.log(`[Comment] 选中文本: ${selectedContent}`);
      this.logger.log('='.repeat(80));

      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ];

      const response = await this.llm.invoke(messages);
      const responseText = response.content as string;
      
      this.logger.log('[Comment] LLM 响应:');
      this.logger.log(responseText);

      const comments = this.parseCommentResponse(responseText, blocks);
      
      for (const comment of comments) {
        commentDataList.push(comment);
        const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        yield JSON.stringify({
          type: 'data-comment',
          id: commentId,
          data: {
            comment: comment,
            status: 'streaming',
          },
        });
      }

      yield JSON.stringify({
        type: 'data-comment',
        id: `comment_finish_${Date.now()}`,
        data: {
          comment: null,
          status: 'finished',
        },
      });

      const duration = Date.now() - startTime;
      this.logger.log('-'.repeat(80));
      this.logger.log(`[Comment] 评论生成完成，耗时 ${duration}ms`);
      this.logger.log(`[Comment] 生成评论数量: ${commentDataList.length}`);
      this.logger.log('-'.repeat(80));
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error('!'.repeat(80));
      this.logger.error(`[Comment] 评论生成失败 (耗时 ${duration}ms)`);
      this.logger.error(`[Comment] 错误消息: ${error.message}`);
      this.logger.error('!'.repeat(80));
      throw error;
    }
  }

  async *streamCopilotResponse(request: CopilotRequest): AsyncGenerator<string> {
    const startTime = Date.now();
    let chunkCount = 0;
    let totalLength = 0;
    const fullContent: string[] = [];

    try {
      const systemPrompt = `你是一个专业的中文文本补全助手。根据用户提供的上下文，生成自然、流畅的中文文本续写。

规则：
1. 只输出续写的文本，不要输出任何解释或说明
2. 续写内容应该与上下文风格一致
3. 续写内容应该简洁、有意义
4. 续写长度适中，通常1-3句话即可
5. 如果上下文是中文，续写也用中文；如果是英文，续写也用英文
6. 续写内容应该自然衔接，不要重复上下文中已有的内容`;

      const userPrompt = request.context 
        ? `上下文：\n${request.context}\n\n请续写：`
        : `请根据以下提示续写：\n${request.prompt}`;

      this.logger.log('='.repeat(80));
      this.logger.log('[Copilot] 收到文本补全请求');
      this.logger.log(`[Copilot] 提示词: ${request.prompt}`);
      if (request.context) {
        this.logger.log(`[Copilot] 上下文: ${request.context}`);
      }
      this.logger.log('='.repeat(80));

      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ];

      this.logger.log('[Copilot] 开始流式生成...');
      const stream = await this.llm.stream(messages);

      for await (const chunk of stream) {
        const content = chunk.content;
        if (typeof content === 'string' && content.length > 0) {
          chunkCount++;
          totalLength += content.length;
          fullContent.push(content);
          yield content;
        }
      }

      const duration = Date.now() - startTime;
      const generatedText = fullContent.join('');
      
      this.logger.log('-'.repeat(80));
      this.logger.log('[Copilot] 流式生成完成');
      this.logger.log(`[Copilot] 统计信息: 耗时 ${duration}ms, 生成 ${chunkCount} 个数据块, 总长度 ${totalLength} 字符`);
      this.logger.log('-'.repeat(80));
      this.logger.log('[Copilot] AI 生成结果:');
      this.logger.log(generatedText);
      this.logger.log('-'.repeat(80));
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error('!'.repeat(80));
      this.logger.error(`[Copilot] 流式生成失败 (耗时 ${duration}ms)`);
      this.logger.error(`[Copilot] 错误类型: ${error.constructor?.name || 'Unknown'}`);
      this.logger.error(`[Copilot] 错误消息: ${error.message}`);
      if (error.stack) {
        this.logger.error(`[Copilot] 错误堆栈: ${error.stack}`);
      }
      this.logger.error('!'.repeat(80));
      throw error;
    }
  }

  private buildSystemPrompt(request: CommandRequest): string {
    const basePrompt = `你是一个专业的AI写作助手，帮助用户在编辑器中生成和编辑内容。请使用中文回复。

你的回复应该：
1. 使用Markdown格式
2. 内容简洁、专业、有价值
3. 直接输出内容，不要添加额外的解释
4. 如果用户要求生成特定格式的内容，请遵循该格式
5. 默认使用中文输出，除非用户明确要求使用其他语言`;

    if (request.ctx?.children && request.ctx.children.length > 0) {
      return `${basePrompt}

用户会提供需要处理的文本内容，请根据用户的指令对文本进行处理。`;
    }

    return basePrompt;
  }

  private buildUserMessage(request: CommandRequest): string {
    let userMessage = this.extractRawUserMessage(request);
    
    if (request.ctx?.children && request.ctx.children.length > 0) {
      const fullContent = this.extractEditorContent(request.ctx.children);
      const selectedContent = this.extractSelectedContent(request.ctx.children, request.ctx.selection);
      
      if (userMessage.includes('{editor}')) {
        if (request.ctx.selection && selectedContent !== fullContent) {
          const contextPrompt = `<文档完整内容>
${fullContent}
</文档完整内容>

<选中的文本>
${selectedContent}
</选中的文本>

请针对【选中的文本】进行处理，同时参考【文档完整内容】作为上下文。`;
          userMessage = userMessage.replace('{editor}', contextPrompt);
        } else {
          userMessage = userMessage.replace('{editor}', fullContent);
        }
      } else {
        if (request.ctx.selection && selectedContent !== fullContent) {
          userMessage = `${userMessage}

<文档完整内容>
${fullContent}
</文档完整内容>

<选中的文本>
${selectedContent}
</选中的文本>

请针对【选中的文本】进行处理，同时参考【文档完整内容】作为上下文。`;
        } else {
          userMessage = `${userMessage}\n\n需要处理的文本内容：\n${fullContent}`;
        }
      }
    }

    return userMessage;
  }

  private extractRawUserMessage(request: CommandRequest): string {
    if (!request.messages || request.messages.length === 0) {
      this.logger.warn('[Command] 请求中没有消息，使用默认消息');
      return '请帮助我生成一些内容。';
    }

    const lastMessage = request.messages[request.messages.length - 1];
    
    this.logger.log(`[Command] 消息数量: ${request.messages.length}`);
    this.logger.log(`[Command] 最后一条消息角色: ${lastMessage.role}`);
    
    if (lastMessage.parts) {
      const textPart = lastMessage.parts.find(p => p.type === 'text');
      if (textPart?.text) {
        this.logger.log(`[Command] 提取到文本部分，长度: ${textPart.text.length} 字符`);
        return textPart.text;
      }
    }

    if (lastMessage.content) {
      this.logger.log(`[Command] 使用消息内容，长度: ${lastMessage.content.length} 字符`);
      return lastMessage.content;
    }

    this.logger.warn('[Command] 无法提取有效消息内容，使用默认消息');
    return '请帮助我生成一些内容。';
  }

  private extractEditorContent(children: any[]): string {
    if (!children || children.length === 0) {
      return '';
    }

    const extractText = (node: any): string => {
      if (!node) return '';
      
      if (node.text !== undefined) {
        return node.text;
      }
      
      if (node.children && Array.isArray(node.children)) {
        return node.children.map(extractText).join('');
      }
      
      return '';
    };

    const contents: string[] = [];
    
    for (const child of children) {
      const text = extractText(child);
      if (text.trim()) {
        contents.push(text.trim());
      }
    }

    return contents.join('\n\n');
  }

  private extractSelectedContent(children: any[], selection?: Selection): string {
    if (!children || children.length === 0) {
      return '';
    }

    if (!selection) {
      return this.extractEditorContent(children);
    }

    const { anchor, focus } = selection;
    
    const startOffset = Math.min(anchor.offset, focus.offset);
    const endOffset = Math.max(anchor.offset, focus.offset);
    
    const anchorPathStr = JSON.stringify(anchor.path);
    const focusPathStr = JSON.stringify(focus.path);
    
    if (anchorPathStr !== focusPathStr) {
      this.logger.warn('[Command] 跨节点选区，暂不支持，返回全部内容');
      return this.extractEditorContent(children);
    }

    const path = anchor.path;
    let targetNode: any = children;
    
    for (let i = 0; i < path.length; i++) {
      const index = path[i];
      if (targetNode && targetNode[index] !== undefined) {
        targetNode = targetNode[index];
      } else if (targetNode && targetNode.children && targetNode.children[index] !== undefined) {
        targetNode = targetNode.children[index];
      } else {
        this.logger.warn(`[Command] 无法找到路径 ${JSON.stringify(path)} 对应的节点`);
        return this.extractEditorContent(children);
      }
    }

    if (targetNode && typeof targetNode.text === 'string') {
      const selectedText = targetNode.text.substring(startOffset, endOffset);
      this.logger.log(`[Command] 提取选中文本: offset ${startOffset}-${endOffset}, 长度 ${selectedText.length}`);
      return selectedText;
    }

    this.logger.warn('[Command] 目标节点不是文本节点，返回全部内容');
    return this.extractEditorContent(children);
  }

  private extractBlocksWithIds(children: any[]): Array<{ id: string; content: string }> {
    if (!children || children.length === 0) {
      return [];
    }

    const extractText = (node: any): string => {
      if (!node) return '';
      
      if (node.text !== undefined) {
        return node.text;
      }
      
      if (node.children && Array.isArray(node.children)) {
        return node.children.map(extractText).join('');
      }
      
      return '';
    };

    return children.map((child, index) => ({
      id: child.id || `block-${index}`,
      content: extractText(child),
    }));
  }

  private buildCommentUserPrompt(
    blocks: Array<{ id: string; content: string }>,
    selectedContent: string,
    userInstruction: string,
  ): string {
    const blocksText = blocks
      .map((block) => `<block id="${block.id}">${block.content}</block>`)
      .join('\n');

    let prompt = `<文档内容>
${blocksText}
</文档内容>

`;

    if (selectedContent && selectedContent !== blocks.map((b) => b.content).join('\n\n')) {
      prompt += `<用户选中的文本>
${selectedContent}
</用户选中的文本>

请重点对【用户选中的文本】进行评论。
`;
    }

    prompt += `
<用户指令>
${userInstruction}
</用户指令>

请输出 JSON 数组格式的评论列表。`;

    return prompt;
  }

  private parseCommentResponse(responseText: string, blocks: Array<{ id: string; content: string }>): CommentData[] {
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        this.logger.warn('[Comment] 未找到 JSON 数组，尝试解析整个响应');
        return this.createDefaultComment(responseText, blocks);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(parsed)) {
        return this.createDefaultComment(responseText, blocks);
      }

      return parsed.map((item: any) => ({
        blockId: item.blockId || blocks[0]?.id || 'unknown',
        content: item.content || '',
        comment: item.comment || item.comments || '',
      }));
    } catch (error) {
      this.logger.warn(`[Comment] JSON 解析失败: ${error}`);
      return this.createDefaultComment(responseText, blocks);
    }
  }

  private createDefaultComment(responseText: string, blocks: Array<{ id: string; content: string }>): CommentData[] {
    const firstBlock = blocks[0] || { id: 'unknown', content: '' };
    return [{
      blockId: firstBlock.id,
      content: firstBlock.content.substring(0, 100),
      comment: responseText.substring(0, 500),
    }];
  }
}
