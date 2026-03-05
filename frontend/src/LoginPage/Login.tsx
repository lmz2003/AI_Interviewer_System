import React, { useState } from 'react';

type ThemeType = 'light' | 'dark' | 'system';

const GithubIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

interface LoginProps {
  theme?: ThemeType;
  onLogin?: () => void;
}

const Login: React.FC<LoginProps> = ({ theme: propTheme }) => {
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const isDark = propTheme === 'dark' ||
    (propTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const colors = {
    text: isDark ? '#F1F0FF' : '#1E1B4B',
    textMuted: isDark ? '#8B87C0' : '#6B7280',
    border: isDark ? '#2D2D52' : '#E8E4FF',
    surface: isDark ? '#16162A' : '#FFFFFF',
    inputBg: isDark ? '#1E1E38' : '#F9F8FF',
    primary: '#6366F1',
    primaryHover: '#4F46E5',
    error: '#EF4444',
    errorBg: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2',
    errorBorder: isDark ? 'rgba(239,68,68,0.3)' : '#FECACA',
  };

  const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID || '';
  const githubRedirectUri = import.meta.env.VITE_GITHUB_REDIRECT_URI || `${window.location.origin}/login/callback`;

  const handleGithubLogin = () => {
    setErrorMessage('');

    if (!githubClientId) {
      setErrorMessage('GitHub Client ID 未配置，请联系管理员');
      return;
    }

    setIsLoading(true);

    const state = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

    localStorage.setItem('github_oauth_state', state);

    const authorizationUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}`
      + `&redirect_uri=${encodeURIComponent(githubRedirectUri)}`
      + '&scope=read:user%20user:email'
      + `&state=${state}`;

    window.location.href = authorizationUrl;
  };

  return (
    <div style={{
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: colors.text,
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        {/* Logo mark */}
        <div style={{
          width: '48px', height: '48px',
          background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
          borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.25rem',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 800,
          color: colors.text,
          margin: '0 0 0.5rem',
          letterSpacing: '-0.02em',
        }}>
          欢迎回来
        </h2>
        <p style={{
          fontSize: '0.9rem',
          color: colors.textMuted,
          margin: 0,
          lineHeight: 1.6,
        }}>
          使用 GitHub 账号授权登录，同步您的个人信息
        </p>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '12px 16px',
          background: colors.errorBg,
          border: `1px solid ${colors.errorBorder}`,
          borderRadius: '10px',
          marginBottom: '1.25rem',
          color: colors.error,
          fontSize: '0.875rem',
        }}>
          <AlertIcon />
          {errorMessage}
        </div>
      )}

      {/* GitHub button */}
      <button
        onClick={handleGithubLogin}
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '13px 20px',
          background: isLoading ? (isDark ? '#2D2D52' : '#E8E4FF') : (isDark ? '#21213A' : '#1E1B4B'),
          color: isLoading ? colors.textMuted : (isDark ? '#F1F0FF' : 'white'),
          border: `1px solid ${isDark ? colors.border : 'transparent'}`,
          borderRadius: '10px',
          fontSize: '0.95rem',
          fontWeight: 700,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
          transition: 'all 0.15s ease',
          opacity: isLoading ? 0.7 : 1,
        }}
        onMouseEnter={e => {
          if (!isLoading) {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = 'translateY(-1px)';
            el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
          }
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = 'translateY(0)';
          el.style.boxShadow = 'none';
        }}
      >
        {isLoading ? (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            跳转中...
          </>
        ) : (
          <>
            <GithubIcon />
            Continue with GitHub
          </>
        )}
      </button>

      {/* Helper text */}
      <p style={{
        textAlign: 'center',
        color: colors.textMuted,
        fontSize: '0.8rem',
        margin: '1.25rem 0 0',
        lineHeight: 1.6,
      }}>
        系统将同步您的 GitHub 昵称、头像与邮箱信息
        <br />
        <span style={{ fontSize: '0.75rem', opacity: 0.75 }}>
          若未跳转，请检查是否屏蔽了弹窗或脚本拦截
        </span>
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Login;
