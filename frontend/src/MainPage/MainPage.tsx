import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './MainPage.module.scss';
import NotesListPage from '../Note/NotesListPage';
import ResumeAnalysis from '../ResumeAnalysis';
import AIIInterviewModule from '../components/AIIInterviewModule';
import KnowledgeBaseManager from '../KnowledgeBase/KnowledgeBaseManager';
import AIAssistant from '../AIAssistant/AIAssistant';
import { AIAssistantProvider, useAIAssistant } from '../context/AIAssistantContext';
import { ThemeToggle } from '../components/ThemeToggle';

// ---- SVG Icons (no emojis per design system) ----
const NotesIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const ResumeIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);

const InterviewIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const KnowledgeIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
  </svg>
);

const CollapseLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const CollapseRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const LogoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
    <defs>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366F1"/>
        <stop offset="100%" stopColor="#818CF8"/>
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="8" fill="url(#logoGrad)"/>
    <path d="M16 7C14.5 7 13.3 8.2 13.3 9.7V13.3C13.3 14.8 14.5 16 16 16C17.5 16 18.7 14.8 18.7 13.3V9.7C18.7 8.2 17.5 7 16 7Z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <path d="M22 13.3V14.7C22 17.9 19.3 20.7 16 20.7C12.7 20.7 10 17.9 10 14.7V13.3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <path d="M16 20.7V24" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <path d="M12.7 24H19.3" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <circle cx="16" cy="10.5" r="1.5" fill="white"/>
    <circle cx="23" cy="9" r="2" fill="#10B981"/>
    <path d="M22 9L22.7 9.7L24.2 8.3" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SparkleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3c.3 4.4 3.3 7.4 9 9-5.7 1.6-8.7 4.6-9 9-.3-4.4-3.3-7.4-9-9 5.7-1.6 8.7-4.6 9-9z"/>
  </svg>
);

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// Nav items config
const NAV_ITEMS = [
  { key: 'notes',     label: '我的笔记',  Icon: NotesIcon     },
  { key: 'resume',    label: '简历分析',  Icon: ResumeIcon    },
  { key: 'interview', label: '模拟面试',  Icon: InterviewIcon },
  { key: 'knowledge', label: '知识库',    Icon: KnowledgeIcon },
];

const MODULE_TITLES: Record<string, string> = {
  home:      '欢迎回来',
  notes:     '我的笔记',
  resume:    '简历分析',
  interview: '模拟面试',
  knowledge: '知识库',
};

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const FileTextIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

const BriefcaseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);

const MessageSquareIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const BookOpenIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);

const TrendingUpIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

const ZapIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

const TargetIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
);

const AwardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="7"/>
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
  </svg>
);

const LightbulbIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18h6"/>
    <path d="M10 22h4"/>
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
  </svg>
);

const formatDate = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    weekday: 'long'
  };
  return date.toLocaleDateString('zh-CN', options);
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 9) return '早上好';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  if (hour < 22) return '晚上好';
  return '夜深了';
};

interface DashboardHomeProps {
  userName: string;
  onNavigate: (module: string) => void;
}

// 统计数据类型
interface DashboardStats {
  notesCount: number;
  interviewCount: number;
  knowledgeDocCount: number;
  resumeScore: number | null;
  resumeScoreLabel: string;
}

const DashboardHome: React.FC<DashboardHomeProps> = ({ userName, onNavigate }) => {
  const [statsData, setStatsData] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // 获取仪表盘统计数据
  const fetchDashboardStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setStatsData(result.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // 根据数据生成统计卡片
  const getStatsCards = () => {
    const baseStats = statsData || {
      notesCount: 0,
      interviewCount: 0,
      knowledgeDocCount: 0,
      resumeScore: null,
      resumeScoreLabel: '暂无',
    };

    return [
      { label: '笔记数量', value: String(baseStats.notesCount), icon: <FileTextIcon />, color: '#6366F1', change: `${baseStats.notesCount} 篇` },
      { label: '面试次数', value: String(baseStats.interviewCount), icon: <MessageSquareIcon />, color: '#F59E0B', change: `${baseStats.interviewCount} 场` },
      { label: '知识条目', value: String(baseStats.knowledgeDocCount), icon: <BookOpenIcon />, color: '#EC4899', change: `${baseStats.knowledgeDocCount} 条` },
      { label: '简历评分', value: baseStats.resumeScore !== null ? String(baseStats.resumeScore) : '--', icon: <TrendingUpIcon />, color: '#10B981', change: baseStats.resumeScoreLabel },
    ];
  };

  const stats = getStatsCards();

  const quickActions = [
    { key: 'notes', label: '创建笔记', description: '记录学习心得', icon: <FileTextIcon />, color: '#6366F1' },
    { key: 'resume', label: '上传简历', description: '获取优化建议', icon: <BriefcaseIcon />, color: '#10B981' },
    { key: 'interview', label: '开始面试', description: '模拟真实场景', icon: <MessageSquareIcon />, color: '#F59E0B' },
    { key: 'knowledge', label: '添加知识', description: '构建知识库', icon: <BookOpenIcon />, color: '#EC4899' },
  ];

  const tips = [
    { icon: <LightbulbIcon />, text: '定期复习笔记可以加深记忆' },
    { icon: <TargetIcon />, text: '模拟面试前先准备好自我介绍' },
    { icon: <AwardIcon />, text: '简历中突出项目成果更吸引HR' },
  ];

  return (
    <div className={styles.dashboardHome}>
      <div className={styles.welcomeSection}>
        <div className={styles.welcomeText}>
          <h1>{getGreeting()}，{userName}</h1>
          <p>{formatDate(new Date())}</p>
        </div>
        <div className={styles.welcomeIllustration}>
          <ZapIcon />
        </div>
      </div>

      <div className={styles.statsGrid}>
        {stats.map((stat, index) => (
          <div 
            key={index} 
            className={styles.statCard}
            style={{ 
              '--stat-color': stat.color,
              '--stat-bg': `${stat.color}15`
            } as React.CSSProperties}
          >
            <div className={styles.statIcon} style={{ color: stat.color }}>
              {stat.icon}
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
              <span className={styles.statChange} style={{ color: stat.color }}>{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.quickActionsSection}>
        <h2>快捷操作</h2>
        <div className={styles.quickActionsGrid}>
          {quickActions.map((action, index) => (
            <button
              key={index}
              className={styles.quickActionCard}
              onClick={() => onNavigate(action.key)}
            >
              <div className={styles.quickActionIcon} style={{ background: `${action.color}15`, color: action.color }}>
                {action.icon}
              </div>
              <div className={styles.quickActionContent}>
                <span className={styles.quickActionLabel}>{action.label}</span>
                <span className={styles.quickActionDesc}>{action.description}</span>
              </div>
              <div className={styles.quickActionArrow}>
                <ArrowRightIcon />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.tipsSection}>
        <h2><LightbulbIcon /> 学习小贴士</h2>
        <div className={styles.tipsList}>
          {tips.map((tip, index) => (
            <div key={index} className={styles.tipItem}>
              <span className={styles.tipIcon}>{tip.icon}</span>
              <span className={styles.tipText}>{tip.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---- Header ----
const Header: React.FC<{
  activeModule: string;
  userData: { name: string; email: string; avatar: string };
  isMobile: boolean;
  onMenuClick: () => void;
  onNavClick: (module: string) => void;
  onLogout: () => void;
  isDropdownOpen: boolean;
}> = ({ activeModule, userData, isMobile, onMenuClick, onNavClick, onLogout, isDropdownOpen }) => {
  const { isOpen, toggleOpen } = useAIAssistant();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onMenuClick();
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, onMenuClick]);

  const getInitials = (name: string): string => {
    if (!name?.trim()) return 'U';
    return name.trim().charAt(0).toUpperCase();
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        {isMobile && (
          <div className={styles.mobileMenuWrapper} ref={dropdownRef}>
            <button
              className={`${styles.menuBtn} ${isDropdownOpen ? styles.active : ''}`}
              onClick={onMenuClick}
              title="菜单"
            >
              <MenuIcon />
            </button>
            
            {isDropdownOpen && (
              <div className={styles.mobileDropdown}>
                <div 
                  className={styles.mobileDropdownHeader}
                  onClick={() => { onNavClick('home'); onMenuClick(); }}
                >
                  <div className={styles.sidebarLogoMark}>
                    <LogoIcon />
                  </div>
                  <span className={styles.mobileDropdownTitle}>智面</span>
                </div>
                
                <nav className={styles.mobileNav}>
                  {NAV_ITEMS.map(({ key, label, Icon }) => (
                    <div
                      key={key}
                      className={`${styles.mobileNavItem} ${activeModule === key ? styles.active : ''}`}
                      onClick={() => {
                        onNavClick(key);
                        onMenuClick();
                      }}
                    >
                      <span className={styles.navIcon}><Icon /></span>
                      <span className={styles.navText}>{label}</span>
                    </div>
                  ))}
                </nav>
                
                <div className={styles.mobileDropdownFooter}>
                  <div className={styles.mobileUserInfo}>
                    <div className={styles.avatar}>
                      {userData.avatar ? (
                        <img src={userData.avatar} alt={userData.name} className={styles.avatarImg} />
                      ) : (
                        <div className={styles.avatarPlaceholder}>{getInitials(userData.name)}</div>
                      )}
                    </div>
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>{userData.name}</span>
                      <span className={styles.userContact}>{userData.email}</span>
                    </div>
                  </div>
                  <div className={styles.mobileLogoutBtn} onClick={onLogout}>
                    <span className={styles.navIcon}><LogoutIcon /></span>
                    <span className={styles.navText}>退出登录</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <h1 className={styles.pageTitle}>
          {MODULE_TITLES[activeModule] || '欢迎回来'}
        </h1>
      </div>
      <div className={styles.headerRight}>
        {!isMobile && (
          <div className={styles.headerUser}>
            欢迎回来，{userData.name}
          </div>
        )}
        <ThemeToggle />
        <button
          className={`${styles.aiToggleBtn} ${isOpen ? styles.active : ''}`}
          onClick={toggleOpen}
          title={isOpen ? '关闭 AI 助手' : '打开 AI 助手'}
        >
          <SparkleIcon />
          <span>AI 助手</span>
        </button>
      </div>
    </header>
  );
};

// ---- AI Assistant Modal (Mobile) ----
const AIAssistantModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.aiModalOverlay} onClick={onClose}>
      <div 
        className={styles.aiModal} 
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.aiModalHeader}>
          <div className={styles.aiModalTitle}>
            <SparkleIcon />
            <span>AI 助手</span>
          </div>
          <button className={styles.aiModalClose} onClick={onClose} aria-label="关闭 AI 助手">
            <CloseIcon />
          </button>
        </div>
        <div className={styles.aiModalContent}>
          <AIAssistant />
        </div>
      </div>
    </div>
  );
};

// ---- MainPage Layout ----
const MainPageLayout: React.FC = () => {
  const { module } = useParams<{ module?: string }>();
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<string>(module || 'home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const { isOpen: isAssistantOpen, toggleOpen } = useAIAssistant();
  const [mainWidthPercent, setMainWidthPercent] = useState<number>(() => {
    const saved = localStorage.getItem('mainLayoutWidth');
    return saved ? parseInt(saved) : 60;
  });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      setIsSidebarCollapsed(mobile);
      if (!mobile) {
        setIsDropdownOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDividerMouseDown = () => setIsDragging(true);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const mainWrapper = document.querySelector(`.${styles.mainWrapper}`) as HTMLElement;
      if (!mainWrapper) return;
      const rect = mainWrapper.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      if (pct >= 35 && pct <= 80) setMainWidthPercent(pct);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      localStorage.setItem('mainLayoutWidth', Math.round(mainWidthPercent).toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, mainWidthPercent]);

  const [userData, setUserData] = useState({ name: '用户', email: '', avatar: '' });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
        const response = await fetch(`${apiBaseUrl}/users/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setUserData({
            name: data.name || data.githubUsername || '用户',
            email: data.email || '',
            avatar: data.avatar || '',
          });
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };
    fetchUserData();
  }, []);

  const handleNavClick = (targetModule: string) => {
    setActiveModule(targetModule);
    navigate(`/dashboard/${targetModule}`);
  };

  useEffect(() => {
    if (!module) { setActiveModule('home'); return; }
    if (module !== activeModule) setActiveModule(module);
  }, [module]);

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);
  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  const getInitials = (name: string): string => {
    if (!name?.trim()) return 'U';
    return name.trim().charAt(0).toUpperCase();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const aiWidthPercent = 100 - mainWidthPercent;

  return (
    <div className={`${styles.layoutContainer} ${!isAssistantOpen ? styles.aiClosed : ''} ${isSidebarCollapsed ? styles.sidebarCollapsed : ''} ${isDragging ? styles.dragging : ''} ${isMobile ? styles.mobile : ''}`}>
      {!isMobile && (
        <>
          {!isSidebarCollapsed && (
            <div className={styles.sidebarOverlay} onClick={() => setIsSidebarCollapsed(true)} />
          )}

          <aside className={`${styles.sidebar} ${isSidebarCollapsed ? styles.collapsed : ''}`}>
            <div className={styles.sidebarHeader}>
              {!isSidebarCollapsed && (
                <div 
                  className={styles.sidebarLogo} 
                  onClick={() => handleNavClick('home')}
                  title="返回首页"
                >
                  <div className={styles.sidebarLogoMark}>
                    <LogoIcon />
                  </div>
                  <h2 className={styles.sidebarTitle}>智面</h2>
                </div>
              )}
              <button
                className={styles.collapseBtn}
                onClick={toggleSidebar}
                title={isSidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
              >
                {isSidebarCollapsed ? <CollapseRightIcon /> : <CollapseLeftIcon />}
              </button>
            </div>

            <nav className={styles.nav}>
              <ul className={styles.navList}>
                {NAV_ITEMS.map(({ key, label, Icon }) => (
                  <li key={key} className={styles.navItem}>
                    <div
                      className={`${styles.navLink} ${activeModule === key ? styles.active : ''}`}
                      onClick={() => handleNavClick(key)}
                      title={label}
                    >
                      <span className={styles.navIcon}><Icon /></span>
                      {!isSidebarCollapsed && <span className={styles.navText}>{label}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </nav>

            <div className={styles.sidebarFooter}>
              <div className={styles.userProfile}>
                <div className={styles.avatar}>
                  {userData.avatar ? (
                    <img src={userData.avatar} alt={userData.name} className={styles.avatarImg} />
                  ) : (
                    <div className={styles.avatarPlaceholder}>{getInitials(userData.name)}</div>
                  )}
                </div>
                {!isSidebarCollapsed && (
                  <div className={styles.userInfo}>
                    <h3 className={styles.userName}>{userData.name}</h3>
                    <p className={styles.userContact}>{userData.email}</p>
                  </div>
                )}
              </div>

              <div
                className={styles.logoutBtn}
                onClick={handleLogout}
                title="退出登录"
              >
                <span className={styles.navIcon}><LogoutIcon /></span>
                {!isSidebarCollapsed && <span className={styles.navText}>退出登录</span>}
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Mobile AI Assistant Modal */}
      {isMobile && (
        <AIAssistantModal isOpen={isAssistantOpen} onClose={toggleOpen} />
      )}

      <div
        className={styles.mainWrapper}
        style={!isMobile && isAssistantOpen ? { display: 'flex', width: '100%', flex: 1, minWidth: 0 } : { flex: 1, minWidth: 0 }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: `0 0 ${!isMobile && isAssistantOpen ? mainWidthPercent : 100}%`,
          minWidth: 0,
          height: '100%',
        }}>
          <Header 
            activeModule={activeModule} 
            userData={userData} 
            isMobile={isMobile}
            onMenuClick={toggleDropdown}
            onNavClick={handleNavClick}
            onLogout={handleLogout}
            isDropdownOpen={isDropdownOpen}
          />

          <main className={styles.mainContent}>
            {activeModule === 'home' && (
              <DashboardHome userName={userData.name} onNavigate={handleNavClick} />
            )}
            {activeModule === 'notes'     && <NotesListPage />}
            {activeModule === 'resume'    && <ResumeAnalysis />}
            {activeModule === 'interview' && <AIIInterviewModule />}
            {activeModule === 'knowledge' && <KnowledgeBaseManager />}
          </main>
        </div>

        {/* Desktop AI Assistant Panel */}
        {!isMobile && isAssistantOpen && (
          <>
            <div
              className={styles.divider}
              onMouseDown={handleDividerMouseDown}
              title="拖动来调整区域大小"
            />
            <aside
              className={`${styles.rightSidebar}`}
              style={{ flex: `0 0 ${aiWidthPercent}%`, minWidth: 0 }}
            >
              <AIAssistant />
            </aside>
          </>
        )}
      </div>
    </div>
  );
};

const MainPage: React.FC = () => (
  <AIAssistantProvider>
    <MainPageLayout />
  </AIAssistantProvider>
);

export default MainPage;
