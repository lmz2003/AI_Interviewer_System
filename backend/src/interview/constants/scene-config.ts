export const SCENE_CONFIG = {
  technical: {
    code: 'technical',
    name: '技术面试',
    description: '针对技术岗位的专业面试，包括算法、系统设计、技术深度等问题',
    icon: '💻',
    questionCount: { min: 6, max: 10 },
    categories: ['algorithm', 'system_design', 'project', 'technical_depth'],
    systemPrompt: `你是一位资深技术面试官，正在进行技术面试。你的角色是：
1. 专业、友善，但会适度施加压力
2. 认真倾听候选人的回答
3. 根据回答质量进行追问或进入下一题
4. 给予适当的鼓励和引导

面试规则：
- 每次只问一个问题
- 等待候选人回答后再继续
- 根据候选人的回答质量和面试进度决定是否追问
- 面试结束时给予整体反馈

请用专业但亲切的语气进行面试。`,
  },
  behavioral: {
    code: 'behavioral',
    name: '行为面试',
    description: '基于过往经历的行为面试，使用STAR法则评估候选人',
    icon: '🤝',
    questionCount: { min: 5, max: 8 },
    categories: ['teamwork', 'problem_solving', 'leadership', 'communication'],
    systemPrompt: `你是一位资深HR面试官，正在进行行为面试。你的角色是：
1. 关注候选人的过往经历和行为表现
2. 引导候选人使用STAR法则（情境、任务、行动、结果）回答问题
3. 挖掘候选人软技能和职业素养
4. 保持友善但专业的态度

面试规则：
- 每次只问一个行为类问题
- 如果候选人回答不够具体，引导其补充细节
- 关注候选人的表达逻辑和实际成果
- 面试结束时给予整体反馈

请用亲切专业的语气进行面试。`,
  },
  hr: {
    code: 'hr',
    name: 'HR面试',
    description: '人力资源综合面试，关注职业规划、薪资期望等',
    icon: '👔',
    questionCount: { min: 5, max: 8 },
    categories: ['career', 'salary', 'company', 'personality'],
    systemPrompt: `你是一位资深HR面试官，正在进行综合面试。你的角色是：
1. 了解候选人的职业规划和发展期望
2. 评估候选人与公司文化的匹配度
3. 了解候选人的薪资期望和到岗时间
4. 解答候选人关于公司和岗位的疑问

面试规则：
- 从自我介绍开始
- 逐步深入了解候选人的职业规划
- 询问薪资期望时注意方式方法
- 给候选人提问的机会
- 面试结束时说明后续流程

请用亲切专业的语气进行面试。`,
  },
  stress: {
    code: 'stress',
    name: '压力面试',
    description: '高压情境模拟面试，测试候选人的抗压能力',
    icon: '😰',
    questionCount: { min: 4, max: 6 },
    categories: ['challenge', 'conflict', 'pressure', 'criticism'],
    systemPrompt: `你是一位严格的面试官，正在进行压力面试。你的角色是：
1. 故意制造一定的压力和挑战性情境
2. 观察候选人在压力下的反应和应对能力
3. 提出刁钻或挑战性的问题
4. 注意观察候选人的情绪管理和问题解决能力

面试规则：
- 语气可以稍微严厉或质疑
- 对候选人的回答进行适度挑战
- 观察候选人是否保持冷静和理性
- 面试结束后恢复正常态度并解释目的
- 给予候选人鼓励和正面反馈

请保持专业，压力要适度，目的是测试而非打击候选人。`,
  },
  group: {
    code: 'group',
    name: '群面模拟',
    description: '无领导小组讨论模拟，评估协作和领导能力',
    icon: '👥',
    questionCount: { min: 3, max: 5 },
    categories: ['case_analysis', 'role_play', 'collaboration'],
    systemPrompt: `你是一位群面观察官，正在模拟无领导小组讨论。你的角色是：
1. 发布讨论题目和规则
2. 观察候选人在小组中的表现
3. 评估候选人的领导力、协作能力和沟通能力
4. 不直接参与讨论，只做观察和引导

面试规则：
- 先介绍讨论题目和时间限制
- 观察候选人的角色定位（领导者、协调者、记录者等）
- 注意候选人的发言质量和对他人意见的尊重
- 讨论结束后进行点评和反馈

请用专业客观的态度进行观察和评估。`,
  },
};

export const JOB_TYPE_CONFIG = {
  frontend: {
    code: 'frontend',
    name: '前端开发',
    keywords: ['React', 'Vue', 'TypeScript', 'JavaScript', 'CSS', 'HTML', 'Webpack', '性能优化'],
  },
  backend: {
    code: 'backend',
    name: '后端开发',
    keywords: ['Java', 'Python', 'Node.js', 'MySQL', 'Redis', '微服务', 'API设计', '数据库'],
  },
  fullstack: {
    code: 'fullstack',
    name: '全栈开发',
    keywords: ['Full Stack', 'React', 'Node.js', '数据库', '系统设计', 'DevOps'],
  },
  pm: {
    code: 'pm',
    name: '产品经理',
    keywords: ['Product', 'Roadmap', 'User Research', '需求分析', '原型设计', '数据分析'],
  },
  data: {
    code: 'data',
    name: '数据分析师',
    keywords: ['SQL', 'Python', 'Tableau', 'Statistics', '机器学习', '数据可视化'],
  },
  design: {
    code: 'design',
    name: 'UI/UX设计',
    keywords: ['Figma', 'UI', 'UX', 'Design System', '用户研究', '交互设计'],
  },
  general: {
    code: 'general',
    name: '通用岗位',
    keywords: [],
  },
};

export const DIFFICULTY_CONFIG = {
  junior: {
    code: 'junior',
    name: '初级',
    description: '适合应届生和初级岗位，问题相对基础',
  },
  medium: {
    code: 'medium',
    name: '中级',
    description: '适合有1-3年经验的求职者，问题有一定深度',
  },
  senior: {
    code: 'senior',
    name: '高级',
    description: '适合资深岗位和管理岗位，问题具有挑战性',
  },
};

export const INTERVIEW_STATUS = {
  pending: { code: 'pending', name: '待开始' },
  in_progress: { code: 'in_progress', name: '进行中' },
  completed: { code: 'completed', name: '已完成' },
  interrupted: { code: 'interrupted', name: '已中断' },
  abandoned: { code: 'abandoned', name: '已放弃' },
};

export const QUESTION_TYPES = {
  opening: { code: 'opening', name: '开场问题' },
  core: { code: 'core', name: '核心问题' },
  follow_up: { code: 'follow_up', name: '追问' },
  closing: { code: 'closing', name: '结束问题' },
};

export const EVALUATION_DIMENSIONS = {
  completeness: { name: '内容完整性', weight: 0.25, description: '是否完整回答了问题' },
  clarity: { name: '逻辑清晰度', weight: 0.25, description: '回答是否有条理' },
  depth: { name: '专业深度', weight: 0.25, description: '回答的专业程度' },
  expression: { name: '表达能力', weight: 0.15, description: '语言组织和表达' },
  highlights: { name: '亮点突出', weight: 0.10, description: '是否有亮点或独特见解' },
};
