import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './MainPage.module.scss';
import NotesListPage from '../Note/NotesListPage';
import ResumeAnalysis from '../ResumeAnalysis';
import AIIInterviewModule from '../components/AIIInterviewModule';
import KnowledgeBase from '../KnowledgeBase/KnowledgeBase';
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

const AIIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a10 10 0 1 0 10 10"/>
    <path d="M12 6v6l4 2"/>
    <circle cx="18" cy="6" r="3"/>
    <path d="M15 6h6"/>
    <path d="M18 3v6"/>
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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const SparkleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3c.3 4.4 3.3 7.4 9 9-5.7 1.6-8.7 4.6-9 9-.3-4.4-3.3-7.4-9-9 5.7-1.6 8.7-4.6 9-9z"/>
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

// ---- Header ----
const Header: React.FC<{
  activeModule: string;
  userData: { name: string };
}> = ({ activeModule, userData }) => {
  const { isOpen, toggleOpen } = useAIAssistant();

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <h1 className={styles.pageTitle}>
          {MODULE_TITLES[activeModule] || '欢迎回来'}
        </h1>
      </div>
      <div className={styles.headerRight}>
        <div className={styles.headerUser}>
          欢迎回来，{userData.name}
        </div>
        <ThemeToggle />
        <button
          className={`${styles.aiToggleBtn} ${isOpen ? styles.active : ''}`}
          onClick={toggleOpen}
          title={isOpen ? '关闭 AI 助手' : '打开 AI 助手'}
        >
          <SparkleIcon />
          AI 助手
        </button>
      </div>
    </header>
  );
};

// ---- MainPage Layout ----
const MainPageLayout: React.FC = () => {
  const { module } = useParams<{ module?: string }>();
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<string>(module || 'home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const { isOpen: isAssistantOpen } = useAIAssistant();
  const [mainWidthPercent, setMainWidthPercent] = useState<number>(() => {
    const saved = localStorage.getItem('mainLayoutWidth');
    return saved ? parseInt(saved) : 60;
  });
  const [isDragging, setIsDragging] = useState(false);

  // Responsive sidebar init
  useEffect(() => {
    const handleResize = () => {
      setIsSidebarCollapsed(window.innerWidth <= 900);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Drag divider
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

  // User data
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
    if (window.innerWidth <= 900) setIsSidebarCollapsed(true);
  };

  useEffect(() => {
    if (!module) { setActiveModule('home'); return; }
    if (module !== activeModule) setActiveModule(module);
  }, [module]);

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

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
    <div className={`${styles.layoutContainer} ${!isAssistantOpen ? styles.aiClosed : ''} ${isSidebarCollapsed ? styles.sidebarCollapsed : ''} ${isDragging ? styles.dragging : ''}`}>
      {/* Mobile overlay */}
      {!isSidebarCollapsed && (
        <div className={styles.sidebarOverlay} onClick={() => setIsSidebarCollapsed(true)} />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isSidebarCollapsed ? styles.collapsed : ''}`}>
        {/* Header */}
        <div className={styles.sidebarHeader}>
          {!isSidebarCollapsed && (
            <div className={styles.sidebarLogo}>
              <div className={styles.sidebarLogoMark}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h2 className={styles.sidebarTitle}>AI 面试官</h2>
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

        {/* Nav */}
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

        {/* Footer */}
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

      {/* Main wrapper */}
      <div
        className={styles.mainWrapper}
        style={isAssistantOpen ? { display: 'flex', width: '100%', flex: 1, minWidth: 0 } : { flex: 1, minWidth: 0 }}
      >
        {/* Main content column */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: `0 0 ${isAssistantOpen ? mainWidthPercent : 100}%`,
          minWidth: 0,
          height: '100%',
        }}>
          <Header activeModule={activeModule} userData={userData} />

          <main className={styles.mainContent}>
            {activeModule === 'home' && (
              <div className={styles.placeholderContent}>
                <p>👋 欢迎使用 AI 面试官平台，请从左侧选择模块开始。</p>
              </div>
            )}
            {activeModule === 'notes'     && <NotesListPage />}
            {activeModule === 'resume'    && <ResumeAnalysis />}
            {activeModule === 'interview' && <AIIInterviewModule />}
            {activeModule === 'knowledge' && <KnowledgeBase />}
          </main>
        </div>

        {/* Drag divider */}
        {isAssistantOpen && (
          <div
            className={styles.divider}
            onMouseDown={handleDividerMouseDown}
            title="拖动来调整区域大小"
          />
        )}

        {/* AI Assistant panel */}
        <aside
          className={`${styles.rightSidebar} ${!isAssistantOpen ? styles.aiHidden : ''}`}
          style={isAssistantOpen ? { flex: `0 0 ${aiWidthPercent}%`, minWidth: 0 } : { display: 'none' }}
        >
          <AIAssistant />
        </aside>
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
