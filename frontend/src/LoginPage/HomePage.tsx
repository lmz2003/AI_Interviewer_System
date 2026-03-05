import React, { useState } from 'react';
import Login from './Login';

// SVG Icons - no emojis as UI icons (design system rule)
const BrainIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
    <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
    <path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/>
    <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/>
    <path d="M3.477 10.896a4 4 0 0 1 .585-.396"/>
    <path d="M19.938 10.5a4 4 0 0 1 .585.396"/>
    <path d="M6 18a4 4 0 0 1-1.967-.516"/>
    <path d="M19.967 17.484A4 4 0 0 1 18 18"/>
  </svg>
);

const NoteIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/>
    <path d="M18 6l3 3-3 3"/><path d="M21 9h-8"/>
  </svg>
);

const BookIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
  </svg>
);

const FileIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
  </svg>
);

const MicIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="11" rx="3"/>
    <path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>
  </svg>
);

const BarChartIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    <line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);

const GithubIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

type ThemeType = 'light' | 'dark';
type LanguageType = 'zh' | 'en';

const i18n = {
  zh: {
    nav: { features: '功能', about: '关于', contact: '联系' },
    hero: {
      badge: 'AI 面试训练平台',
      title: '用 AI 打磨\n你的面试竞争力',
      subtitle: '智能模拟面试、简历分析、知识库构建，全方位助你斩获心仪 offer',
      cta: '免费开始',
      secondary: '查看功能',
    },
    features: {
      title: '核心功能',
      subtitle: '从准备到复盘，覆盖求职全流程',
      cards: [
        { title: 'AI 助手', description: '自然语言问答、知识点讲解与面试技巧指导，随时在线的专属学习伙伴。' },
        { title: 'Markdown 笔记', description: '知识记录、整理与 AI 辅助编辑，让学习内容井井有条。' },
        { title: '知识库', description: '知识存储、管理与语义增强检索，打造个性化学习资源库。' },
        { title: '简历门诊', description: '简历深度分析、优化建议与修改指导，让你的简历脱颖而出。' },
        { title: 'AI 模拟面试', description: '虚拟面试官体验、题目生成与评分反馈，模拟真实面试场景。' },
        { title: '数据分析', description: '学习进度跟踪、面试表现分析与个性化建议，持续追踪成长。' },
      ],
    },
    cta: { title: '准备好了吗？', subtitle: '加入 AI 面试官系统，让每一次练习都有价值', button: '立即登录' },
    footer: { copy: 'AI 面试官系统' },
    login: { button: '登录' },
    lang: { switch: 'EN' },
  },
  en: {
    nav: { features: 'Features', about: 'About', contact: 'Contact' },
    hero: {
      badge: 'AI Interview Training',
      title: 'Sharpen Your\nInterview Edge with AI',
      subtitle: 'Mock interviews, resume analysis & knowledge base — everything you need to land your dream job.',
      cta: 'Get Started Free',
      secondary: 'See Features',
    },
    features: {
      title: 'Core Features',
      subtitle: 'From prep to review — covering the entire job search process',
      cards: [
        { title: 'AI Assistant', description: 'Natural language Q&A, concept explanations and interview tips — your always-on study partner.' },
        { title: 'Markdown Notes', description: 'Record, organize and AI-edit knowledge to keep your learning structured.' },
        { title: 'Knowledge Base', description: 'Store, manage and semantically retrieve knowledge to build your personal library.' },
        { title: 'Resume Clinic', description: 'Deep resume analysis, optimization suggestions and guidance to help your resume stand out.' },
        { title: 'AI Mock Interview', description: 'Virtual interviewer experience with question generation and scoring feedback.' },
        { title: 'Analytics', description: 'Track learning progress, analyze interview performance and get personalized suggestions.' },
      ],
    },
    cta: { title: 'Ready to Start?', subtitle: 'Join AI Interviewer and make every practice session count', button: 'Login Now' },
    footer: { copy: 'AI Interviewer System' },
    login: { button: 'Login' },
    lang: { switch: '中文' },
  },
};

const featureIcons = [BrainIcon, NoteIcon, BookIcon, FileIcon, MicIcon, BarChartIcon];

const featureColors = [
  { bg: '#EEF2FF', icon: '#6366F1' },
  { bg: '#F0FDF4', icon: '#10B981' },
  { bg: '#FFF7ED', icon: '#F59E0B' },
  { bg: '#FDF2F8', icon: '#EC4899' },
  { bg: '#EFF6FF', icon: '#3B82F6' },
  { bg: '#F0FDF4', icon: '#059669' },
];

const HomePage: React.FC = () => {
  const [theme, setTheme] = useState<ThemeType>('light');
  const [language, setLanguage] = useState<LanguageType>('zh');
  const [showLogin, setShowLogin] = useState(false);

  const t = i18n[language];
  const isDark = theme === 'dark';

  const colors = {
    bg: isDark ? '#0F0F1A' : '#FAFAFA',
    surface: isDark ? '#16162A' : '#FFFFFF',
    surfaceElevated: isDark ? '#1E1E38' : '#F5F3FF',
    border: isDark ? '#2D2D52' : '#E8E4FF',
    text: isDark ? '#F1F0FF' : '#1E1B4B',
    textMuted: isDark ? '#8B87C0' : '#6B7280',
    primary: '#6366F1',
    primaryLight: isDark ? 'rgba(99,102,241,0.15)' : '#EEF2FF',
    cta: '#10B981',
    ctaHover: '#059669',
  };

  return (
    <div style={{
      background: colors.bg,
      color: colors.text,
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      minHeight: '100vh',
      transition: 'background 0.2s ease, color 0.2s ease',
    }}>
      {/* Navbar */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 clamp(1.5rem, 5vw, 4rem)',
        height: '68px',
        background: isDark ? 'rgba(15,15,26,0.9)' : 'rgba(255,255,255,0.9)',
        borderBottom: `1px solid ${colors.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backdropFilter: 'blur(12px)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <div style={{
            width: '34px', height: '34px',
            background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: colors.text }}>AI 面试官</span>
        </div>

        {/* Nav Links */}
        <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
          {Object.values(t.nav).map((label, i) => (
            <a key={i} href={`#${Object.keys(t.nav)[i]}`} style={{
              color: colors.textMuted,
              textDecoration: 'none',
              fontSize: '0.92rem',
              fontWeight: 500,
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = colors.primary)}
            onMouseLeave={e => (e.currentTarget.style.color = colors.textMuted)}
            >{label}</a>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Lang toggle */}
          <button
            onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
            style={{
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              color: colors.textMuted,
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              letterSpacing: '0.03em',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = colors.primary; (e.currentTarget as HTMLElement).style.color = colors.primary; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = colors.border; (e.currentTarget as HTMLElement).style.color = colors.textMuted; }}
          >
            {t.lang.switch}
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            style={{
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              color: colors.textMuted,
              padding: '7px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              transition: 'all 0.15s ease',
            }}
            title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = colors.primary; (e.currentTarget as HTMLElement).style.color = colors.primary; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = colors.border; (e.currentTarget as HTMLElement).style.color = colors.textMuted; }}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Login button */}
          <button
            onClick={() => setShowLogin(true)}
            style={{
              background: colors.primary,
              color: 'white',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'opacity 0.15s ease, transform 0.15s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.88'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
          >
            {t.login.button}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        maxWidth: '1140px',
        margin: '0 auto',
        padding: 'clamp(4rem, 8vw, 7rem) clamp(1.5rem, 5vw, 4rem)',
        textAlign: 'center',
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: colors.primaryLight,
          color: colors.primary,
          padding: '6px 16px',
          borderRadius: '100px',
          fontSize: '0.82rem',
          fontWeight: 700,
          marginBottom: '2rem',
          letterSpacing: '0.02em',
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.primary }} />
          {t.hero.badge}
        </div>

        <h1 style={{
          fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
          fontWeight: 900,
          lineHeight: 1.12,
          color: colors.text,
          margin: '0 0 1.5rem',
          whiteSpace: 'pre-line',
          letterSpacing: '-0.02em',
        }}>
          {t.hero.title}
        </h1>

        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.15rem)',
          color: colors.textMuted,
          maxWidth: '560px',
          margin: '0 auto 2.5rem',
          lineHeight: 1.75,
        }}>
          {t.hero.subtitle}
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowLogin(true)}
            style={{
              background: colors.cta,
              color: 'white',
              border: 'none',
              padding: '14px 32px',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = colors.ctaHover; el.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = colors.cta; el.style.transform = 'translateY(0)'; }}
          >
            {t.hero.cta}
            <ChevronRightIcon />
          </button>
          <a
            href="#features"
            style={{
              background: 'transparent',
              color: colors.primary,
              border: `2px solid ${colors.primary}`,
              padding: '12px 28px',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex', alignItems: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = colors.primaryLight; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; }}
          >
            {t.hero.secondary}
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{
        maxWidth: '1140px',
        margin: '0 auto',
        padding: 'clamp(3rem, 6vw, 5rem) clamp(1.5rem, 5vw, 4rem)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{
            fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
            fontWeight: 800,
            color: colors.text,
            margin: '0 0 1rem',
            letterSpacing: '-0.02em',
          }}>
            {t.features.title}
          </h2>
          <p style={{ color: colors.textMuted, fontSize: '1.05rem', margin: 0 }}>
            {t.features.subtitle}
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
        }}>
          {t.features.cards.map((card, index) => {
            const Icon = featureIcons[index];
            const { bg, icon } = featureColors[index];
            const adjustedBg = isDark ? 'rgba(255,255,255,0.04)' : bg;
            const cardBorder = isDark ? colors.border : 'transparent';

            return (
              <div
                key={index}
                style={{
                  background: colors.surface,
                  border: `1px solid ${cardBorder}`,
                  borderRadius: '14px',
                  padding: '2rem',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = isDark ? '0 12px 32px rgba(0,0,0,0.4)' : '0 12px 32px rgba(99,102,241,0.12)'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none'; }}
              >
                <div style={{
                  width: '52px', height: '52px',
                  background: adjustedBg,
                  borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '1.25rem',
                  color: icon,
                }}>
                  <Icon />
                </div>
                <h3 style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: colors.text,
                  margin: '0 0 0.6rem',
                }}>
                  {card.title}
                </h3>
                <p style={{
                  color: colors.textMuted,
                  fontSize: '0.9rem',
                  lineHeight: 1.7,
                  margin: 0,
                }}>
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        maxWidth: '1140px',
        margin: '0 auto',
        padding: 'clamp(2rem, 5vw, 4rem) clamp(1.5rem, 5vw, 4rem) clamp(4rem, 8vw, 6rem)',
      }}>
        <div style={{
          background: isDark ? 'linear-gradient(135deg, #1A1A35 0%, #16162A 100%)' : 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
          borderRadius: '20px',
          padding: 'clamp(2.5rem, 5vw, 4rem)',
          textAlign: 'center',
        }}>
          <h2 style={{
            fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
            fontWeight: 800,
            color: isDark ? colors.text : 'white',
            margin: '0 0 1rem',
            letterSpacing: '-0.02em',
          }}>
            {t.cta.title}
          </h2>
          <p style={{
            color: isDark ? colors.textMuted : 'rgba(255,255,255,0.85)',
            fontSize: '1.05rem',
            margin: '0 0 2.5rem',
            maxWidth: '480px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            {t.cta.subtitle}
          </p>
          <button
            onClick={() => setShowLogin(true)}
            style={{
              background: isDark ? colors.primary : 'white',
              color: isDark ? 'white' : colors.primary,
              border: 'none',
              padding: '14px 36px',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.opacity = '0.9'; el.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }}
          >
            <GithubIcon />
            {t.cta.button}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${colors.border}`,
        padding: '2rem clamp(1.5rem, 5vw, 4rem)',
        textAlign: 'center',
        color: colors.textMuted,
        fontSize: '0.85rem',
      }}>
        <p style={{ margin: 0 }}>© {new Date().getFullYear()} {t.footer.copy}. All rights reserved.</p>
      </footer>

      {/* Login Modal */}
      {showLogin && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowLogin(false); }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}`}</style>
          <div style={{
            background: isDark ? colors.surface : 'white',
            borderRadius: '16px',
            padding: '2.5rem',
            width: '90%',
            maxWidth: '440px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
            animation: 'slideUp 0.25s ease',
            position: 'relative',
          }}>
            <button
              onClick={() => setShowLogin(false)}
              style={{
                position: 'absolute', top: '1.2rem', right: '1.2rem',
                background: 'transparent',
                border: 'none',
                color: colors.textMuted,
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = colors.text)}
              onMouseLeave={e => (e.currentTarget.style.color = colors.textMuted)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <Login theme={theme} />
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
