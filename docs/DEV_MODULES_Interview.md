# 模拟面试模块 - 开发模块划分

## 文档信息

| 项目 | 内容 |
|------|------|
| 关联PRD | PRD_Interview_Module.md V1.0.0 |
| 创建日期 | 2026-02-28 |
| 文档版本 | V1.0.0 |
| 更新日期 | 2026-03-01 |
| 开发状态 | ✅ 已完成 |

---

## 目录

1. [模块总览](#1-模块总览)
2. [后端开发模块](#2-后端开发模块)
3. [前端开发模块](#3-前端开发模块)
4. [模块依赖关系](#4-模块依赖关系)
5. [开发顺序建议](#5-开发顺序建议)
6. [任务清单](#6-任务清单)

---

## 1. 模块总览

### 1.1 模块架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           模拟面试模块开发架构                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                                 前端模块                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ M-FE-01 ✅  │  │ M-FE-02 ✅  │  │ M-FE-03 ✅  │  │ M-FE-04 ✅  │        │
│  │ 场景选择    │  │ 面试对话    │  │ 面试报告    │  │ 历史记录    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │ M-FE-05 ✅  │  │ M-FE-06 ✅  │  │ M-FE-07 ✅  │                         │
│  │ 公共组件    │  │ 状态管理    │  │ 工具函数    │                         │
│  └─────────────┘  └─────────────┘  └─────────────┘                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP/SSE
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 后端模块                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ M-BE-01 ✅  │  │ M-BE-02 ✅  │  │ M-BE-03 ✅  │  │ M-BE-04 ✅  │        │
│  │ 数据模型    │  │ 场景管理    │  │ 会话管理    │  │ 消息处理    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ M-BE-05 ✅  │  │ M-BE-06 ✅  │  │ M-BE-07 ✅  │  │ M-BE-08 ✅  │        │
│  │ LLM服务     │  │ 评估服务    │  │ 报告服务    │  │ 控制器层    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 模块清单

| 模块ID | 模块名称 | 类型 | 优先级 | 预估工时 | 状态 |
|--------|---------|------|--------|---------|------|
| M-BE-01 | 数据模型模块 | 后端 | P0 | 8h | ✅ 已完成 |
| M-BE-02 | 场景管理模块 | 后端 | P0 | 4h | ✅ 已完成 |
| M-BE-03 | 会话管理模块 | 后端 | P0 | 8h | ✅ 已完成 |
| M-BE-04 | 消息处理模块 | 后端 | P0 | 8h | ✅ 已完成 |
| M-BE-05 | LLM服务模块 | 后端 | P0 | 16h | ✅ 已完成 |
| M-BE-06 | 评估服务模块 | 后端 | P0 | 12h | ✅ 已完成 |
| M-BE-07 | 报告服务模块 | 后端 | P0 | 8h | ✅ 已完成 |
| M-BE-08 | 控制器层模块 | 后端 | P0 | 8h | ✅ 已完成 |
| M-FE-01 | 场景选择页面 | 前端 | P0 | 12h | ✅ 已完成 |
| M-FE-02 | 面试对话页面 | 前端 | P0 | 20h | ✅ 已完成 |
| M-FE-03 | 面试报告页面 | 前端 | P0 | 16h | ✅ 已完成 |
| M-FE-04 | 历史记录页面 | 前端 | P1 | 8h | ✅ 已完成 |
| M-FE-05 | 公共组件模块 | 前端 | P0 | 8h | ✅ 已完成 |
| M-FE-06 | 状态管理模块 | 前端 | P0 | 8h | ✅ 已完成 |
| M-FE-07 | 工具函数模块 | 前端 | P1 | 4h | ✅ 已完成 |

---

## 2. 后端开发模块

### 2.1 M-BE-01: 数据模型模块 ✅ 已完成

**模块描述：** 定义面试模块的所有数据库实体和数据传输对象

**文件结构：**
```
backend/src/interview/
├── entities/
│   ├── interview.entity.ts          # ✅ 面试主表实体
│   ├── interview-session.entity.ts  # ✅ 面试会话实体
│   ├── interview-message.entity.ts  # ✅ 面试消息实体
│   └── interview-report.entity.ts   # ✅ 面试报告实体
├── dto/
│   ├── create-interview.dto.ts      # ✅ 创建面试DTO
│   ├── send-message.dto.ts          # ✅ 发送消息DTO
│   └── interview-response.dto.ts    # ✅ 面试响应DTO
└── constants/
    └── scene-config.ts              # ✅ 场景配置常量
```

**详细任务：**

| 任务ID | 任务描述 | 交付物 | 工时 | 状态 |
|--------|---------|--------|------|------|
| T-BE-01-01 | 创建Interview实体类 | interview.entity.ts | 1h | ✅ |
| T-BE-01-02 | 创建InterviewSession实体类 | interview-session.entity.ts | 1h | ✅ |
| T-BE-01-03 | 创建InterviewMessage实体类 | interview-message.entity.ts | 1h | ✅ |
| T-BE-01-04 | 创建InterviewReport实体类 | interview-report.entity.ts | 1h | ✅ |
| T-BE-01-05 | 创建CreateInterviewDTO | create-interview.dto.ts | 0.5h | ✅ |
| T-BE-01-06 | 创建SendMessageDTO | send-message.dto.ts | 0.5h | ✅ |
| T-BE-01-07 | 创建响应DTO类 | interview-response.dto.ts | 1h | ✅ |
| T-BE-01-08 | 定义场景/岗位/难度常量 | scene-config.ts | 1h | ✅ |
| T-BE-01-09 | 配置实体关系和索引 | - | 1h | ✅ |

**数据模型详细设计：**

```typescript
// entities/interview.entity.ts
@Entity('interviews')
export class Interview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  sceneType: string;  // technical, behavioral, hr, stress, group

  @Column({ type: 'varchar', length: 50, nullable: true })
  jobType: string;  // frontend, backend, fullstack, pm, data, design, general

  @Column({ type: 'varchar', length: 20, default: 'medium' })
  difficulty: string;  // junior, medium, senior

  @Column({ type: 'uuid', nullable: true })
  resumeId: string;

  @Column({ type: 'float', nullable: true })
  totalScore: number;

  @Column({ type: 'integer', nullable: true })
  duration: number;  // 秒

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;  // pending, in_progress, completed, interrupted, abandoned

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.interviews)
  user: User;

  @ManyToOne(() => Resume, { nullable: true })
  resume: Resume;

  @OneToMany(() => InterviewSession, (session) => session.interview)
  sessions: InterviewSession[];

  @OneToOne(() => InterviewReport, (report) => report.interview)
  report: InterviewReport;
}

// entities/interview-session.entity.ts
@Entity('interview_sessions')
export class InterviewSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  interviewId: string;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;  // active, ended

  @Column({ type: 'integer', default: 0 })
  questionCount: number;

  @Column({ type: 'integer', default: 0 })
  messageCount: number;

  @ManyToOne(() => Interview, (interview) => interview.sessions)
  interview: Interview;

  @OneToMany(() => InterviewMessage, (message) => message.session)
  messages: InterviewMessage[];
}

// entities/interview-message.entity.ts
@Entity('interview_messages')
export class InterviewMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sessionId: string;

  @Column({ type: 'varchar', length: 20 })
  role: string;  // user, assistant

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  questionType: string;  // opening, core, follow_up, closing

  @Column({ type: 'jsonb', nullable: true })
  evaluation: {
    completeness: number;
    clarity: number;
    depth: number;
    expression: number;
    highlights: number;
    overall: number;
    suggestions: string[];
  };

  @Column({ type: 'float', nullable: true })
  score: number;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'jsonb', nullable: true })
  sources: Array<{
    documentId: string;
    content: string;
    score: number;
  }>;

  @ManyToOne(() => InterviewSession, (session) => session.messages)
  session: InterviewSession;
}

// entities/interview-report.entity.ts
@Entity('interview_reports')
export class InterviewReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  interviewId: string;

  @Column({ type: 'float' })
  overallScore: number;

  @Column({ type: 'jsonb' })
  dimensionScores: {
    completeness: number;
    clarity: number;
    depth: number;
    expression: number;
    highlights: number;
  };

  @Column({ type: 'text' })
  strengths: string;

  @Column({ type: 'text' })
  weaknesses: string;

  @Column({ type: 'text' })
  suggestions: string;

  @Column({ type: 'jsonb', nullable: true })
  learningResources: Array<{
    type: string;
    title: string;
    url: string;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @OneToOne(() => Interview, (interview) => interview.report)
  interview: Interview;
}
```

---

### 2.2 M-BE-02: 场景管理模块

**模块描述：** 管理面试场景配置，提供场景列表查询

**文件结构：**
```
backend/src/interview/
├── services/
│   └── scene.service.ts             # ✅ 场景管理服务
└── constants/
    └── scene-config.ts              # ✅ 场景配置数据
```

**详细任务：**

| 任务ID | 任务描述 | 交付物 | 工时 | 状态 |
|--------|---------|--------|------|------|
| T-BE-02-01 | 定义场景配置数据结构 | scene-config.ts | 0.5h | ✅ |
| T-BE-02-02 | 实现场景列表查询方法 | scene.service.ts | 1h | ✅ |
| T-BE-02-03 | 实现岗位类型查询方法 | scene.service.ts | 0.5h | ✅ |
| T-BE-02-04 | 实现难度等级查询方法 | scene.service.ts | 0.5h | ✅ |
| T-BE-02-05 | 编写单元测试 | scene.service.spec.ts | 1.5h | ✅ |

**核心代码：**

```typescript
// constants/scene-config.ts
export const SCENE_CONFIG = {
  technical: {
    code: 'technical',
    name: '技术面试',
    description: '针对技术岗位的专业面试',
    icon: '💻',
    questionCount: { min: 6, max: 10 },
    categories: ['algorithm', 'system_design', 'project', 'technical_depth'],
    systemPrompt: `你是一位资深技术面试官，正在进行技术面试...`,
  },
  behavioral: {
    code: 'behavioral',
    name: '行为面试',
    description: '基于过往经历的行为面试',
    icon: '🤝',
    questionCount: { min: 5, max: 8 },
    categories: ['teamwork', 'problem_solving', 'leadership', 'communication'],
    systemPrompt: `你是一位资深HR面试官，正在进行行为面试...`,
  },
  hr: {
    code: 'hr',
    name: 'HR面试',
    description: '人力资源综合面试',
    icon: '👔',
    questionCount: { min: 5, max: 8 },
    categories: ['career', 'salary', 'company', 'personality'],
    systemPrompt: `你是一位资深HR面试官...`,
  },
  stress: {
    code: 'stress',
    name: '压力面试',
    description: '高压情境模拟面试',
    icon: '😰',
    questionCount: { min: 4, max: 6 },
    categories: ['challenge', 'conflict', 'pressure', 'criticism'],
    systemPrompt: `你是一位严格的面试官...`,
  },
};

export const JOB_TYPE_CONFIG = {
  frontend: { code: 'frontend', name: '前端开发', keywords: ['React', 'Vue', 'TypeScript', 'CSS'] },
  backend: { code: 'backend', name: '后端开发', keywords: ['Java', 'Python', 'Node.js', 'MySQL'] },
  fullstack: { code: 'fullstack', name: '全栈开发', keywords: ['Full Stack', 'React', 'Node.js'] },
  pm: { code: 'pm', name: '产品经理', keywords: ['Product', 'Roadmap', 'User Research'] },
  data: { code: 'data', name: '数据分析师', keywords: ['SQL', 'Python', 'Tableau', 'Statistics'] },
  design: { code: 'design', name: 'UI/UX设计', keywords: ['Figma', 'UI', 'UX', 'Design System'] },
  general: { code: 'general', name: '通用岗位', keywords: [] },
};

// services/scene.service.ts
@Injectable()
export class SceneService {
  getSceneList(): SceneDTO[] {
    return Object.values(SCENE_CONFIG).map(scene => ({
      code: scene.code,
      name: scene.name,
      description: scene.description,
      icon: scene.icon,
      questionCount: scene.questionCount,
    }));
  }

  getJobTypeList(): JobTypeDTO[] {
    return Object.values(JOB_TYPE_CONFIG);
  }

  getDifficultyLevels(): DifficultyLevelDTO[] {
    return [
      { code: 'junior', name: '初级', description: '适合应届生和初级岗位' },
      { code: 'medium', name: '中级', description: '适合有1-3年经验的求职者' },
      { code: 'senior', name: '高级', description: '适合资深岗位和管理岗位' },
    ];
  }

  getSceneConfig(sceneType: string) {
    return SCENE_CONFIG[sceneType];
  }
}
```

---

### 2.3 M-BE-03: 会话管理模块 ✅ 已完成

**模块描述：** 管理面试会话的创建、查询、更新和恢复

**文件结构：**
```
backend/src/interview/
└── services/
    └── interview-session.service.ts  # ✅ 会话管理服务
```

**详细任务：**

| 任务ID | 任务描述 | 交付物 | 工时 | 状态 |
|--------|---------|--------|------|------|
| T-BE-03-01 | 实现创建面试方法 | createInterview() | 1h | ✅ |
| T-BE-03-02 | 实现获取面试列表方法 | getInterviewList() | 1h | ✅ |
| T-BE-03-03 | 实现获取面试详情方法 | getInterviewById() | 1h | ✅ |
| T-BE-03-04 | 实现开始面试会话方法 | startSession() | 1.5h | ✅ |
| T-BE-03-05 | 实现结束面试方法 | endInterview() | 1.5h | ✅ |
| T-BE-03-06 | 实现恢复中断面试方法 | resumeInterview() | 1h | ✅ |
| T-BE-03-07 | 实现删除面试方法 | deleteInterview() | 0.5h | ✅ |
| T-BE-03-08 | 编写单元测试 | interview-session.service.spec.ts | 0.5h | ✅ |

**核心代码：**

```typescript
// services/interview-session.service.ts
@Injectable()
export class InterviewSessionService {
  constructor(
    @InjectRepository(Interview)
    private interviewRepository: Repository<Interview>,
    @InjectRepository(InterviewSession)
    private sessionRepository: Repository<InterviewSession>,
    private sceneService: SceneService,
    private llmService: InterviewLLMService,
  ) {}

  async createInterview(userId: string, dto: CreateInterviewDTO): Promise<Interview> {
    const interview = this.interviewRepository.create({
      userId,
      sceneType: dto.sceneType,
      jobType: dto.jobType,
      difficulty: dto.difficulty || 'medium',
      resumeId: dto.resumeId,
      status: 'pending',
    });
    return await this.interviewRepository.save(interview);
  }

  async startSession(interviewId: string, userId: string): Promise<StartSessionResult> {
    const interview = await this.getInterviewById(interviewId, userId);
    
    if (interview.status === 'in_progress') {
      throw new BadRequestException('面试已在进行中');
    }

    const session = this.sessionRepository.create({
      interviewId,
      startedAt: new Date(),
      status: 'active',
    });
    await this.sessionRepository.save(session);

    interview.status = 'in_progress';
    await this.interviewRepository.save(interview);

    const firstMessage = await this.llmService.generateOpening(interview);
    await this.saveMessage(session.id, 'assistant', firstMessage.content, 'opening');

    return { sessionId: session.id, interview, firstMessage };
  }

  async endInterview(interviewId: string, userId: string, sessionId: string): Promise<EndInterviewResult> {
    const interview = await this.getInterviewById(interviewId, userId);
    const session = await this.sessionRepository.findOne({ where: { id: sessionId } });

    session.status = 'ended';
    session.endedAt = new Date();
    await this.sessionRepository.save(session);

    interview.status = 'completed';
    interview.duration = Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 1000);
    await this.interviewRepository.save(interview);

    const report = await this.generateReport(interview, session);

    return { interview, reportId: report.id };
  }
}
```

---

### 2.4 M-BE-04: 消息处理模块 ✅ 已完成

**模块描述：** 处理面试消息的存储、查询和流式响应

**文件结构：**
```
backend/src/interview/
└── services/
    └── interview-message.service.ts  # ✅ 消息处理服务
```

**详细任务：**

| 任务ID | 任务描述 | 交付物 | 工时 | 状态 |
|--------|---------|--------|------|------|
| T-BE-04-01 | 实现保存消息方法 | saveMessage() | 1h | ✅ |
| T-BE-04-02 | 实现获取消息历史方法 | getMessageHistory() | 1h | ✅ |
| T-BE-04-03 | 实现流式消息处理方法 | streamMessage() | 3h | ✅ |
| T-BE-04-04 | 实现消息格式转换方法 | formatMessages() | 1h | ✅ |
| T-BE-04-05 | 实现SSE响应封装 | createSSEResponse() | 1h | ✅ |
| T-BE-04-06 | 编写单元测试 | interview-message.service.spec.ts | 1h | ✅ |

**核心代码：**

```typescript
// services/interview-message.service.ts
@Injectable()
export class InterviewMessageService {
  constructor(
    @InjectRepository(InterviewMessage)
    private messageRepository: Repository<InterviewMessage>,
    private llmService: InterviewLLMService,
    private evaluatorService: InterviewEvaluatorService,
  ) {}

  async saveMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    questionType?: string,
    evaluation?: any,
  ): Promise<InterviewMessage> {
    const message = this.messageRepository.create({
      sessionId,
      role,
      content,
      questionType,
      evaluation,
      timestamp: new Date(),
    });
    return await this.messageRepository.save(message);
  }

  async *streamMessage(
    sessionId: string,
    userMessage: string,
    interview: Interview,
  ): AsyncGenerator<SSEEvent> {
    await this.saveMessage(sessionId, 'user', userMessage);
    const history = await this.getMessageHistory(sessionId);

    let fullContent = '';
    const stream = this.llmService.streamChat(history, interview);

    for await (const chunk of stream) {
      fullContent += chunk;
      yield { type: 'content', content: chunk };
    }

    const evaluation = await this.evaluatorService.evaluateAnswer(
      this.getLastQuestion(history),
      userMessage,
      interview,
    );

    yield { type: 'evaluation', ...evaluation };
    await this.saveMessage(sessionId, 'assistant', fullContent, 'response', evaluation);
  }
}
```

---

### 2.5 M-BE-05: LLM服务模块 ✅ 已完成

**模块描述：** 封装与大语言模型的交互，处理问题生成、追问生成等

**文件结构：**
```
backend/src/interview/
└── services/
    └── interview-llm.service.ts      # ✅ LLM服务
```

**详细任务：**

| 任务ID | 任务描述 | 交付物 | 工时 | 状态 |
|--------|---------|--------|------|------|
| T-BE-05-01 | 实现开场白生成方法 | generateOpening() | 2h | ✅ |
| T-BE-05-02 | 实现问题生成方法 | generateQuestion() | 3h | ✅ |
| T-BE-05-03 | 实现追问生成方法 | generateFollowUp() | 2h | ✅ |
| T-BE-05-04 | 实现结束语生成方法 | generateClosing() | 1h | ✅ |
| T-BE-05-05 | 实现流式聊天方法 | streamChat() | 4h | ✅ |
| T-BE-05-06 | 设计和实现Prompt模板 | prompt-templates.ts | 3h | ✅ |
| T-BE-05-07 | 实现简历上下文注入 | injectResumeContext() | 1h | ✅ |

**核心代码：**

```typescript
// services/interview-llm.service.ts
@Injectable()
export class InterviewLLMService {
  async generateOpening(interview: Interview): Promise<ChatMessage> {
    const sceneConfig = SCENE_CONFIG[interview.sceneType];
    const systemPrompt = this.buildSystemPrompt(sceneConfig, interview);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '请开始面试，先做自我介绍，然后提出第一个问题。' },
      ],
    });

    return { role: 'assistant', content: response.choices[0].message.content };
  }

  async *streamChat(history: InterviewMessage[], interview: Interview): AsyncGenerator<string> {
    const sceneConfig = SCENE_CONFIG[interview.sceneType];
    const systemPrompt = this.buildSystemPrompt(sceneConfig, interview);
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
    ];

    const stream = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) yield content;
    }
  }

  private buildSystemPrompt(sceneConfig: SceneConfig, interview: Interview): string {
    let prompt = sceneConfig.systemPrompt;
    prompt = prompt.replace('{jobType}', interview.jobType || '通用岗位');
    prompt = prompt.replace('{difficulty}', interview.difficulty);
    
    if (interview.resumeId && interview.resume) {
      prompt += `\n\n候选人简历摘要：\n${this.extractResumeSummary(interview.resume)}`;
    }
    
    return prompt;
  }
}
```

---

### 2.6 M-BE-06: 评估服务模块 ✅ 已完成

**模块描述：** 实现回答评估逻辑，计算各维度评分

**文件结构：**
```
backend/src/interview/
└── services/
    └── interview-evaluator.service.ts  # ✅ 评估服务
```

**详细任务：**

| 任务ID | 任务描述 | 交付物 | 工时 | 状态 |
|--------|---------|--------|------|------|
| T-BE-06-01 | 实现单题评估方法 | evaluateAnswer() | 3h | ✅ |
| T-BE-06-02 | 实现维度评分计算 | calculateDimensionScores() | 2h | ✅ |
| T-BE-06-03 | 实现改进建议生成 | generateSuggestions() | 2h | ✅ |
| T-BE-06-04 | 实现追问判断逻辑 | shouldFollowUp() | 1h | ✅ |
| T-BE-06-05 | 实现综合评分计算 | calculateOverallScore() | 1h | ✅ |
| T-BE-06-06 | 设计评估Prompt模板 | evaluation-prompts.ts | 2h | ✅ |
| T-BE-06-07 | 编写单元测试 | evaluator.service.spec.ts | 1h | ✅ |

**核心代码：**

```typescript
// services/interview-evaluator.service.ts
@Injectable()
export class InterviewEvaluatorService {
  async evaluateAnswer(
    question: string,
    answer: string,
    interview: Interview,
  ): Promise<EvaluationResult> {
    const prompt = this.buildEvaluationPrompt(question, answer, interview);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: EVALUATION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    return {
      scores: {
        completeness: result.completeness,
        clarity: result.clarity,
        depth: result.depth,
        expression: result.expression,
        highlights: result.highlights,
      },
      overall: this.calculateOverallScore(result),
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      suggestions: result.suggestions,
      followUp: result.followUp,
      followUpQuestion: result.followUpQuestion,
    };
  }

  private calculateOverallScore(scores: DimensionScores): number {
    const weights = { completeness: 0.25, clarity: 0.25, depth: 0.25, expression: 0.15, highlights: 0.10 };
    return Math.round(
      scores.completeness * weights.completeness +
      scores.clarity * weights.clarity +
      scores.depth * weights.depth +
      scores.expression * weights.expression +
      scores.highlights * weights.highlights
    * 10) / 10;
  }
}
```

---

### 2.7 M-BE-07: 报告服务模块 ✅ 已完成

**模块描述：** 生成面试报告，汇总评估结果

**文件结构：**
```
backend/src/interview/
└── services/
    └── interview-report.service.ts   # ✅ 报告服务
```

**详细任务：**

| 任务ID | 任务描述 | 交付物 | 工时 | 状态 |
|--------|---------|--------|------|------|
| T-BE-07-01 | 实现报告生成方法 | generateReport() | 2h | ✅ |
| T-BE-07-02 | 实现维度评分汇总 | aggregateDimensionScores() | 1h | ✅ |
| T-BE-07-03 | 实现优势分析生成 | analyzeStrengths() | 1h | ✅ |
| T-BE-07-04 | 实现劣势分析生成 | analyzeWeaknesses() | 1h | ✅ |
| T-BE-07-05 | 实现学习建议生成 | generateLearningSuggestions() | 1.5h | ✅ |
| T-BE-07-06 | 实现报告查询方法 | getReport() | 0.5h | ✅ |
| T-BE-07-07 | 编写单元测试 | report.service.spec.ts | 1h | ✅ |

---

### 2.8 M-BE-08: 控制器层模块 ✅ 已完成

**模块描述：** 实现所有API接口，处理请求和响应

**文件结构：**
```
backend/src/interview/
├── interview.controller.ts           # ✅ 主控制器
└── interview.module.ts               # ✅ 模块定义
```

**详细任务：**

| 任务ID | 任务描述 | 交付物 | 工时 | 状态 |
|--------|---------|--------|------|------|
| T-BE-08-01 | 实现场景相关接口 | GET /scenes, /job-types | 1h | ✅ |
| T-BE-08-02 | 实现面试CRUD接口 | POST/GET/DELETE /interview | 1.5h | ✅ |
| T-BE-08-03 | 实现会话控制接口 | POST /start, /end, /resume | 1.5h | ✅ |
| T-BE-08-04 | 实现消息发送接口 | POST /message | 1h | ✅ |
| T-BE-08-05 | 实现流式响应接口 | POST /message/stream (SSE) | 2h | ✅ |
| T-BE-08-06 | 实现报告查询接口 | GET /report | 0.5h | ✅ |
| T-BE-08-07 | 添加认证守卫和验证 | UseGuards, ValidationPipe | 0.5h | ✅ |

**核心代码：**

```typescript
// interview.controller.ts
@Controller('interview')
@UseGuards(AuthGuard('jwt'))
export class InterviewController {
  @Get('scenes')
  async getScenes() {
    return { code: 0, message: 'ok', data: this.sceneService.getSceneList() };
  }

  @Post()
  async createInterview(@Body() dto: CreateInterviewDTO, @Request() req: any) {
    const userId = req.user.id;
    const interview = await this.sessionService.createInterview(userId, dto);
    return { code: 0, message: 'created', data: interview };
  }

  @Post(':id/start')
  async startSession(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.id;
    const result = await this.sessionService.startSession(id, userId);
    return { code: 0, message: 'ok', data: result };
  }

  @Post(':id/message/stream')
  async streamMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDTO,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user.id;
    const interview = await this.sessionService.getInterviewById(id, userId);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const event of this.messageService.streamMessage(dto.sessionId, dto.message, interview)) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
    res.end();
  }

  @Post(':id/end')
  async endInterview(@Param('id') id: string, @Body() dto: EndInterviewDTO, @Request() req: any) {
    const userId = req.user.id;
    const result = await this.sessionService.endInterview(id, userId, dto.sessionId);
    return { code: 0, message: 'ok', data: result };
  }

  @Get(':id/report')
  async getReport(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.id;
    const report = await this.reportService.getReport(id, userId);
    return { code: 0, message: 'ok', data: report };
  }
}
```

---

## 3. 前端开发模块

### 3.1 M-FE-01: 场景选择页面 ✅ 已完成

**模块描述：** 面试场景选择页面，包含场景卡片、岗位选择、难度配置

**文件结构：**
```
frontend/src/Interview/
├── components/
│   └── SceneSelector/
│       ├── index.tsx                # ✅ 主组件
│       ├── SceneCard.tsx            # ✅ 场景卡片组件
│       ├── JobTypeSelect.tsx        # ✅ 岗位选择组件
│       ├── DifficultySelect.tsx     # ✅ 难度选择组件
│       ├── ResumeToggle.tsx         # ✅ 简历关联组件
│       └── styles.ts                # ✅ 样式定义
└── hooks/
    └── useScenes.ts                 # ✅ 场景数据Hook
```

**详细任务：**

| 任务ID | 任务描述 | 交付物 | 工时 | 状态 |
|--------|---------|--------|------|------|
| T-FE-01-01 | 创建页面主组件 | index.tsx | 2h | ✅ |
| T-FE-01-02 | 实现场景卡片组件 | SceneCard.tsx | 2h | ✅ |
| T-FE-01-03 | 实现岗位选择组件 | JobTypeSelect.tsx | 1h | ✅ |
| T-FE-01-04 | 实现难度选择组件 | DifficultySelect.tsx | 1h | ✅ |
| T-FE-01-05 | 实现简历关联组件 | ResumeToggle.tsx | 1.5h | ✅ |
| T-FE-01-06 | 实现场景数据Hook | useScenes.ts | 1h | ✅ |
| T-FE-01-07 | 实现样式和响应式 | styles.ts | 2h | ✅ |
| T-FE-01-08 | 集成API调用 | - | 1.5h | ✅ |

---

### 3.2 M-FE-02: 面试对话页面 ✅ 已完成

**模块描述：** 面试对话主页面，包含消息列表、输入框、评估展示

**文件结构：**
```
frontend/src/Interview/
├── components/
│   └── ChatInterface/
│       ├── index.tsx                # ✅ 主组件
│       ├── MessageList.tsx          # ✅ 消息列表组件
│       ├── MessageItem.tsx          # ✅ 消息项组件
│       ├── InputArea.tsx            # ✅ 输入区域组件
│       ├── EvaluationCard.tsx       # ✅ 评估卡片组件
│       ├── ProgressBar.tsx          # ✅ 进度条组件
│       ├── Timer.tsx                # ✅ 计时器组件
│       └── styles.ts                # ✅ 样式定义
└── hooks/
    ├── useInterviewSession.ts       # ✅ 会话管理Hook
    └── useInterviewStream.ts        # ✅ 流式响应Hook
```

**详细任务：**

| 任务ID | 任务描述 | 交付物 | 工时 | 状态 |
|--------|---------|--------|------|------|
| T-FE-02-01 | 创建页面主组件 | index.tsx | 3h | ✅ |
| T-FE-02-02 | 实现消息列表组件 | MessageList.tsx | 2h | ✅ |
| T-FE-02-03 | 实现消息项组件 | MessageItem.tsx | 2h | ✅ |
| T-FE-02-04 | 实现输入区域组件 | InputArea.tsx | 2h | ✅ |
| T-FE-02-05 | 实现评估卡片组件 | EvaluationCard.tsx | 2h | ✅ |
| T-FE-02-06 | 实现进度条组件 | ProgressBar.tsx | 1h | ✅ |
| T-FE-02-07 | 实现计时器组件 | Timer.tsx | 1h | ✅ |
| T-FE-02-08 | 实现流式响应Hook | useInterviewStream.ts | 3h | ✅ |
| T-FE-02-09 | 实现会话管理Hook | useInterviewSession.ts | 2h | ✅ |
| T-FE-02-10 | 实现Markdown渲染 | - | 2h | ✅ |

---

### 3.3 M-FE-03: 面试报告页面 ✅ 已完成

**模块描述：** 展示面试评估报告，包含评分、分析、建议

**文件结构：**
```
frontend/src/Interview/
├── components/
│   └── ReportView/
│       ├── index.tsx                # ✅ 主组件
│       ├── ScoreOverview.tsx        # ✅ 评分概览组件
│       ├── RadarChart.tsx           # ✅ 雷达图组件
│       ├── DimensionAnalysis.tsx    # ✅ 维度分析组件
│       ├── StrengthsCard.tsx        # ✅ 优势卡片组件
│       ├── WeaknessesCard.tsx       # ✅ 劣势卡片组件
│       ├── SuggestionsCard.tsx      # ✅ 建议卡片组件
│       ├── QuestionReview.tsx       # ✅ 问题回顾组件
│       └── styles.ts                # ✅ 样式定义
└── hooks/
    └── useInterviewReport.ts        # ✅ 报告数据Hook
```

**详细任务：**

| 任务ID | 任务描述 | 交付物 | 工时 | 状态 |
|--------|---------|--------|------|------|
| T-FE-03-01 | 创建页面主组件 | index.tsx | 2h | ✅ |
| T-FE-03-02 | 实现评分概览组件 | ScoreOverview.tsx | 2h | ✅ |
| T-FE-03-03 | 实现雷达图组件 | RadarChart.tsx | 3h | ✅ |
| T-FE-03-04 | 实现维度分析组件 | DimensionAnalysis.tsx | 2h | ✅ |
| T-FE-03-05 | 实现优势/劣势卡片 | StrengthsCard.tsx, WeaknessesCard.tsx | 2h | ✅ |
| T-FE-03-06 | 实现建议卡片组件 | SuggestionsCard.tsx | 1.5h | ✅ |
| T-FE-03-07 | 实现问题回顾组件 | QuestionReview.tsx | 2h | ✅ |
| T-FE-03-08 | 实现PDF导出功能 | - | 2h | ✅ |
| T-FE-03-09 | 实现报告数据Hook | useInterviewReport.ts | 1.5h | ✅ |

---

### 3.4 M-FE-04: 历史记录页面 ✅ 已完成

**模块描述：** 展示历史面试记录列表

**文件结构：**
```
frontend/src/Interview/
├── components/
│   └── HistoryList/
│       ├── index.tsx                # ✅ 主组件
│       ├── HistoryItem.tsx          # ✅ 记录项组件
│       ├── FilterBar.tsx            # ✅ 筛选栏组件
│       └── styles.ts                # ✅ 样式定义
└── hooks/
    └── useInterviewHistory.ts       # ✅ 历史数据Hook
```

**详细任务：**

| 任务ID | 任务描述 | 交付物 | 工时 | 状态 |
|--------|---------|--------|------|------|
| T-FE-04-01 | 创建页面主组件 | index.tsx | 2h | ✅ |
| T-FE-04-02 | 实现记录项组件 | HistoryItem.tsx | 2h | ✅ |
| T-FE-04-03 | 实现筛选栏组件 | FilterBar.tsx | 1.5h | ✅ |
| T-FE-04-04 | 实现分页功能 | - | 1h | ✅ |
| T-FE-04-05 | 实现历史数据Hook | useInterviewHistory.ts | 1.5h | ✅ |

---

### 3.5 M-FE-05: 公共组件模块 ✅ 已完成

**模块描述：** 可复用的UI组件

**文件结构：**
```
frontend/src/Interview/
├── components/
│   └── common/
│       ├── Button.tsx               # ✅ 按钮组件
│       ├── Card.tsx                 # ✅ 卡片组件
│       ├── Modal.tsx                # ✅ 弹窗组件
│       ├── Loading.tsx              # ✅ 加载组件
│       ├── Empty.tsx                # ✅ 空状态组件
│       └── Toast.tsx                # ✅ 提示组件
```

**详细任务：**

| 任务ID | 任务描述 | 交付物 | 工时 | 状态 |
|--------|---------|--------|------|------|
| T-FE-05-01 | 实现按钮组件 | Button.tsx | 1h | ✅ |
| T-FE-05-02 | 实现卡片组件 | Card.tsx | 1h | ✅ |
| T-FE-05-03 | 实现弹窗组件 | Modal.tsx | 2h | ✅ |
| T-FE-05-04 | 实现加载组件 | Loading.tsx | 1h | ✅ |
| T-FE-05-05 | 实现空状态组件 | Empty.tsx | 1h | ✅ |
| T-FE-05-06 | 实现提示组件 | Toast.tsx | 1h | ✅ |
| T-FE-05-07 | 实现样式主题 | - | 1h | ✅ |

---

### 3.6 M-FE-06: 状态管理模块 ✅ 已完成

**模块描述：** 全局状态管理和Context

**文件结构：**
```
frontend/src/Interview/
├── context/
│   └── InterviewContext.tsx         # ✅ 面试上下文
├── hooks/
│   ├── useInterview.ts              # ✅ 面试操作Hook
│   └── useInterviewState.ts         # ✅ 面试状态Hook
└── types/
    └── index.ts                     # ✅ 类型定义
```

**详细任务：**

| 任务ID | 任务描述 | 交付物 | 工时 | 状态 |
|--------|---------|--------|------|------|
| T-FE-06-01 | 定义TypeScript类型 | types/index.ts | 2h | ✅ |
| T-FE-06-02 | 创建Interview Context | InterviewContext.tsx | 2h | ✅ |
| T-FE-06-03 | 实现面试操作Hook | useInterview.ts | 2h | ✅ |
| T-FE-06-04 | 实现面试状态Hook | useInterviewState.ts | 1h | ✅ |
| T-FE-06-05 | 集成到应用 | - | 1h | ✅ |

---

### 3.7 M-FE-07: 工具函数模块 ✅ 已完成

**模块描述：** 通用工具函数

**文件结构：**
```
frontend/src/Interview/
└── utils/
    ├── api.ts                       # ✅ API请求封装
    ├── format.ts                    # ✅ 格式化函数
    ├── storage.ts                   # ✅ 本地存储
    └── constants.ts                 # ✅ 常量定义
```

**详细任务：**

| 任务ID | 任务描述 | 交付物 | 工时 | 状态 |
|--------|---------|--------|------|------|
| T-FE-07-01 | 封装API请求函数 | api.ts | 1.5h | ✅ |
| T-FE-07-02 | 实现格式化函数 | format.ts | 1h | ✅ |
| T-FE-07-03 | 实现存储函数 | storage.ts | 0.5h | ✅ |
| T-FE-07-04 | 定义常量 | constants.ts | 1h | ✅ |

---

## 4. 模块依赖关系

### 4.1 后端模块依赖

```
                              M-BE-08 控制器层
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            M-BE-03 会话管理  M-BE-04 消息处理  M-BE-07 报告服务
                    │               │               │
                    │       ┌───────┴───────┐       │
                    │       │               │       │
                    │       ▼               ▼       │
                    │  M-BE-05 LLM服务  M-BE-06 评估│
                    │       │               │       │
                    └───────┴───────┬───────┴───────┘
                                    │
                                    ▼
                            M-BE-01 数据模型
                                    │
                                    ▼
                            M-BE-02 场景管理
```

### 4.2 前端模块依赖

```
  M-FE-01 场景选择    M-FE-02 面试对话    M-FE-03 面试报告    M-FE-04 历史记录
         │                   │                   │                   │
         └───────────────────┼───────────────────┼───────────────────┘
                             │                   │
                             ▼                   ▼
                       M-FE-06 状态管理    M-FE-07 工具函数
                             │                   │
                             └─────────┬─────────┘
                                       │
                                       ▼
                               M-FE-05 公共组件
```

---

## 5. 开发顺序建议

### 5.1 Sprint 1 (Week 1-2): 基础架构

**目标：** 完成数据模型和场景选择功能

**后端任务：**
```
Day 1-2:  M-BE-01 数据模型模块
Day 3:    M-BE-02 场景管理模块
Day 4-5:  M-BE-03 会话管理模块（部分）
Day 6-8:  M-BE-08 控制器层模块（场景相关接口）
```

**前端任务：**
```
Day 1-2:  M-FE-06 状态管理模块（类型定义）
Day 3-4:  M-FE-05 公共组件模块
Day 5-8:  M-FE-01 场景选择页面
Day 9-10: M-FE-07 工具函数模块
```

### 5.2 Sprint 2 (Week 3-4): 面试对话核心

**目标：** 完成面试对话核心功能

**后端任务：**
```
Day 1-4:  M-BE-05 LLM服务模块
Day 5-6:  M-BE-06 评估服务模块
Day 7-8:  M-BE-04 消息处理模块
Day 9-10: M-BE-08 控制器层模块（消息相关接口）
```

**前端任务：**
```
Day 1-3:  M-FE-06 状态管理模块（完善）
Day 4-8:  M-FE-02 面试对话页面
Day 9-10: 集成测试和Bug修复
```

### 5.3 Sprint 3 (Week 5-6): 评估与报告

**目标：** 完成评估和报告功能

**后端任务：**
```
Day 1-3:  M-BE-07 报告服务模块
Day 4-5:  M-BE-08 控制器层模块（报告相关接口）
Day 6-8:  单元测试编写
Day 9-10: 性能优化
```

**前端任务：**
```
Day 1-5:  M-FE-03 面试报告页面
Day 6-8:  M-FE-04 历史记录页面
Day 9-10: 集成测试和Bug修复
```

### 5.4 Sprint 4 (Week 7-8): 完善优化

**目标：** 完善功能，准备发布

**任务：**
```
Day 1-3:  简历关联功能完善
Day 4-5:  E2E测试
Day 6-7:  性能优化和Bug修复
Day 8:    文档完善
Day 9-10: 发布准备
```

---

## 6. 任务清单

### 6.1 后端任务清单

| 任务ID | 模块 | 任务描述 | 优先级 | 状态 |
|--------|------|---------|--------|------|
| T-BE-01-01 | M-BE-01 | 创建Interview实体类 | P0 | ✅ 已完成 |
| T-BE-01-02 | M-BE-01 | 创建InterviewSession实体类 | P0 | ✅ 已完成 |
| T-BE-01-03 | M-BE-01 | 创建InterviewMessage实体类 | P0 | ✅ 已完成 |
| T-BE-01-04 | M-BE-01 | 创建InterviewReport实体类 | P0 | ✅ 已完成 |
| T-BE-01-05 | M-BE-01 | 创建CreateInterviewDTO | P0 | ✅ 已完成 |
| T-BE-01-06 | M-BE-01 | 创建SendMessageDTO | P0 | ✅ 已完成 |
| T-BE-01-07 | M-BE-01 | 创建响应DTO类 | P0 | ✅ 已完成 |
| T-BE-01-08 | M-BE-01 | 定义场景/岗位/难度常量 | P0 | ✅ 已完成 |
| T-BE-01-09 | M-BE-01 | 配置实体关系和索引 | P0 | ✅ 已完成 |
| T-BE-02-01 | M-BE-02 | 定义场景配置数据结构 | P0 | ✅ 已完成 |
| T-BE-02-02 | M-BE-02 | 实现场景列表查询方法 | P0 | ✅ 已完成 |
| T-BE-02-03 | M-BE-02 | 实现岗位类型查询方法 | P0 | ✅ 已完成 |
| T-BE-02-04 | M-BE-02 | 实现难度等级查询方法 | P0 | ✅ 已完成 |
| T-BE-02-05 | M-BE-02 | 编写单元测试 | P1 | ✅ 已完成 |
| T-BE-03-01 | M-BE-03 | 实现创建面试方法 | P0 | ✅ 已完成 |
| T-BE-03-02 | M-BE-03 | 实现获取面试列表方法 | P0 | ✅ 已完成 |
| T-BE-03-03 | M-BE-03 | 实现获取面试详情方法 | P0 | ✅ 已完成 |
| T-BE-03-04 | M-BE-03 | 实现开始面试会话方法 | P0 | ✅ 已完成 |
| T-BE-03-05 | M-BE-03 | 实现结束面试方法 | P0 | ✅ 已完成 |
| T-BE-03-06 | M-BE-03 | 实现恢复中断面试方法 | P1 | ✅ 已完成 |
| T-BE-03-07 | M-BE-03 | 实现删除面试方法 | P1 | ✅ 已完成 |
| T-BE-04-01 | M-BE-04 | 实现保存消息方法 | P0 | ✅ 已完成 |
| T-BE-04-02 | M-BE-04 | 实现获取消息历史方法 | P0 | ✅ 已完成 |
| T-BE-04-03 | M-BE-04 | 实现流式消息处理方法 | P0 | ✅ 已完成 |
| T-BE-04-04 | M-BE-04 | 实现消息格式转换方法 | P0 | ✅ 已完成 |
| T-BE-04-05 | M-BE-04 | 实现SSE响应封装 | P0 | ✅ 已完成 |
| T-BE-05-01 | M-BE-05 | 实现开场白生成方法 | P0 | ✅ 已完成 |
| T-BE-05-02 | M-BE-05 | 实现问题生成方法 | P0 | ✅ 已完成 |
| T-BE-05-03 | M-BE-05 | 实现追问生成方法 | P0 | ✅ 已完成 |
| T-BE-05-04 | M-BE-05 | 实现结束语生成方法 | P0 | ✅ 已完成 |
| T-BE-05-05 | M-BE-05 | 实现流式聊天方法 | P0 | ✅ 已完成 |
| T-BE-05-06 | M-BE-05 | 设计和实现Prompt模板 | P0 | ✅ 已完成 |
| T-BE-05-07 | M-BE-05 | 实现简历上下文注入 | P1 | ✅ 已完成 |
| T-BE-06-01 | M-BE-06 | 实现单题评估方法 | P0 | ✅ 已完成 |
| T-BE-06-02 | M-BE-06 | 实现维度评分计算 | P0 | ✅ 已完成 |
| T-BE-06-03 | M-BE-06 | 实现改进建议生成 | P0 | ✅ 已完成 |
| T-BE-06-04 | M-BE-06 | 实现追问判断逻辑 | P0 | ✅ 已完成 |
| T-BE-06-05 | M-BE-06 | 实现综合评分计算 | P0 | ✅ 已完成 |
| T-BE-06-06 | M-BE-06 | 设计评估Prompt模板 | P0 | ✅ 已完成 |
| T-BE-07-01 | M-BE-07 | 实现报告生成方法 | P0 | ✅ 已完成 |
| T-BE-07-02 | M-BE-07 | 实现维度评分汇总 | P0 | ✅ 已完成 |
| T-BE-07-03 | M-BE-07 | 实现优势分析生成 | P0 | ✅ 已完成 |
| T-BE-07-04 | M-BE-07 | 实现劣势分析生成 | P0 | ✅ 已完成 |
| T-BE-07-05 | M-BE-07 | 实现学习建议生成 | P0 | ✅ 已完成 |
| T-BE-07-06 | M-BE-07 | 实现报告查询方法 | P0 | ✅ 已完成 |
| T-BE-08-01 | M-BE-08 | 实现场景相关接口 | P0 | ✅ 已完成 |
| T-BE-08-02 | M-BE-08 | 实现面试CRUD接口 | P0 | ✅ 已完成 |
| T-BE-08-03 | M-BE-08 | 实现会话控制接口 | P0 | ✅ 已完成 |
| T-BE-08-04 | M-BE-08 | 实现消息发送接口 | P0 | ✅ 已完成 |
| T-BE-08-05 | M-BE-08 | 实现流式响应接口 | P0 | ✅ 已完成 |
| T-BE-08-06 | M-BE-08 | 实现报告查询接口 | P0 | ✅ 已完成 |

### 6.2 前端任务清单

| 任务ID | 模块 | 任务描述 | 优先级 | 状态 |
|--------|------|---------|--------|------|
| T-FE-01-01 | M-FE-01 | 创建页面主组件 | P0 | ✅ 已完成 |
| T-FE-01-02 | M-FE-01 | 实现场景卡片组件 | P0 | ✅ 已完成 |
| T-FE-01-03 | M-FE-01 | 实现岗位选择组件 | P0 | ✅ 已完成 |
| T-FE-01-04 | M-FE-01 | 实现难度选择组件 | P0 | ✅ 已完成 |
| T-FE-01-05 | M-FE-01 | 实现简历关联组件 | P1 | ✅ 已完成 |
| T-FE-01-06 | M-FE-01 | 实现场景数据Hook | P0 | ✅ 已完成 |
| T-FE-01-07 | M-FE-01 | 实现样式和响应式 | P0 | ✅ 已完成 |
| T-FE-02-01 | M-FE-02 | 创建页面主组件 | P0 | ✅ 已完成 |
| T-FE-02-02 | M-FE-02 | 实现消息列表组件 | P0 | ✅ 已完成 |
| T-FE-02-03 | M-FE-02 | 实现消息项组件 | P0 | ✅ 已完成 |
| T-FE-02-04 | M-FE-02 | 实现输入区域组件 | P0 | ✅ 已完成 |
| T-FE-02-05 | M-FE-02 | 实现评估卡片组件 | P0 | ✅ 已完成 |
| T-FE-02-06 | M-FE-02 | 实现进度条组件 | P0 | ✅ 已完成 |
| T-FE-02-07 | M-FE-02 | 实现计时器组件 | P1 | ✅ 已完成 |
| T-FE-02-08 | M-FE-02 | 实现流式响应Hook | P0 | ✅ 已完成 |
| T-FE-02-09 | M-FE-02 | 实现会话管理Hook | P0 | ✅ 已完成 |
| T-FE-03-01 | M-FE-03 | 创建页面主组件 | P0 | ✅ 已完成 |
| T-FE-03-02 | M-FE-03 | 实现评分概览组件 | P0 | ✅ 已完成 |
| T-FE-03-03 | M-FE-03 | 实现雷达图组件 | P0 | ✅ 已完成 |
| T-FE-03-04 | M-FE-03 | 实现维度分析组件 | P0 | ✅ 已完成 |
| T-FE-03-05 | M-FE-03 | 实现优势/劣势卡片 | P0 | ✅ 已完成 |
| T-FE-03-06 | M-FE-03 | 实现建议卡片组件 | P0 | ✅ 已完成 |
| T-FE-03-07 | M-FE-03 | 实现问题回顾组件 | P0 | ✅ 已完成 |
| T-FE-03-08 | M-FE-03 | 实现PDF导出功能 | P1 | ✅ 已完成 |
| T-FE-04-01 | M-FE-04 | 创建页面主组件 | P1 | ✅ 已完成 |
| T-FE-04-02 | M-FE-04 | 实现记录项组件 | P1 | ✅ 已完成 |
| T-FE-04-03 | M-FE-04 | 实现筛选栏组件 | P1 | ✅ 已完成 |
| T-FE-04-04 | M-FE-04 | 实现分页功能 | P1 | ✅ 已完成 |
| T-FE-05-01 | M-FE-05 | 实现按钮组件 | P0 | ✅ 已完成 |
| T-FE-05-02 | M-FE-05 | 实现卡片组件 | P0 | ✅ 已完成 |
| T-FE-05-03 | M-FE-05 | 实现弹窗组件 | P0 | ✅ 已完成 |
| T-FE-05-04 | M-FE-05 | 实现加载组件 | P0 | ✅ 已完成 |
| T-FE-05-05 | M-FE-05 | 实现空状态组件 | P0 | ✅ 已完成 |
| T-FE-06-01 | M-FE-06 | 定义TypeScript类型 | P0 | ✅ 已完成 |
| T-FE-06-02 | M-FE-06 | 创建Interview Context | P0 | ✅ 已完成 |
| T-FE-06-03 | M-FE-06 | 实现面试操作Hook | P0 | ✅ 已完成 |
| T-FE-07-01 | M-FE-07 | 封装API请求函数 | P0 | ✅ 已完成 |
| T-FE-07-02 | M-FE-07 | 实现格式化函数 | P1 | ✅ 已完成 |

---

## 附录

### A. 文件目录结构

```
backend/src/interview/
├── constants/
│   ├── scene-config.ts
│   ├── scene-types.ts
│   ├── job-types.ts
│   ├── difficulty-levels.ts
│   └── interview-status.ts
├── dto/
│   ├── create-interview.dto.ts
│   ├── update-interview.dto.ts
│   ├── send-message.dto.ts
│   ├── query-interview.dto.ts
│   ├── interview-response.dto.ts
│   ├── session-response.dto.ts
│   └── report-response.dto.ts
├── entities/
│   ├── interview.entity.ts
│   ├── interview-session.entity.ts
│   ├── interview-message.entity.ts
│   └── interview-report.entity.ts
├── services/
│   ├── scene.service.ts
│   ├── interview-session.service.ts
│   ├── interview-message.service.ts
│   ├── interview-llm.service.ts
│   ├── interview-evaluator.service.ts
│   └── interview-report.service.ts
├── interview.controller.ts
└── interview.module.ts

frontend/src/Interview/
├── components/
│   ├── SceneSelector/
│   │   ├── index.tsx
│   │   ├── SceneCard.tsx
│   │   ├── JobTypeSelect.tsx
│   │   ├── DifficultySelect.tsx
│   │   ├── ResumeToggle.tsx
│   │   └── styles.ts
│   ├── ChatInterface/
│   │   ├── index.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageItem.tsx
│   │   ├── InputArea.tsx
│   │   ├── EvaluationCard.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── Timer.tsx
│   │   └── styles.ts
│   ├── ReportView/
│   │   ├── index.tsx
│   │   ├── ScoreOverview.tsx
│   │   ├── RadarChart.tsx
│   │   ├── DimensionAnalysis.tsx
│   │   ├── StrengthsCard.tsx
│   │   ├── WeaknessesCard.tsx
│   │   ├── SuggestionsCard.tsx
│   │   ├── QuestionReview.tsx
│   │   └── styles.ts
│   ├── HistoryList/
│   │   ├── index.tsx
│   │   ├── HistoryItem.tsx
│   │   ├── FilterBar.tsx
│   │   └── styles.ts
│   └── common/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Modal.tsx
│       ├── Loading.tsx
│       ├── Empty.tsx
│       └── Toast.tsx
├── context/
│   └── InterviewContext.tsx
├── hooks/
│   ├── useScenes.ts
│   ├── useInterview.ts
│   ├── useInterviewSession.ts
│   ├── useInterviewStream.ts
│   ├── useInterviewReport.ts
│   └── useInterviewHistory.ts
├── utils/
│   ├── api.ts
│   ├── format.ts
│   ├── storage.ts
│   └── constants.ts
├── types/
│   └── index.ts
└── index.tsx
```

### B. 工时汇总

| 类型 | 总工时 |
|------|--------|
| 后端开发 | 72h |
| 前端开发 | 76h |
| 测试 | 20h |
| 文档 | 8h |
| **总计** | **176h** |

---

**文档版本历史：**

| 版本 | 日期 | 修改内容 | 作者 |
|------|------|---------|------|
| V1.0.0 | 2026-02-28 | 初始版本 | - |
