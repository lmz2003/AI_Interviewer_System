import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToastModal } from '../components/ui/toast-modal';
import LoadingModal from './components/LoadingModal';

// ---- Design tokens (theme-aware) ----
const getThemeColors = (isDark: boolean) => ({
  primary: isDark ? '#818CF8' : '#6366F1',
  primaryHover: isDark ? '#6366F1' : '#4F46E5',
  primarySoft: isDark ? 'rgba(129,140,248,0.1)' : 'rgba(99,102,241,0.08)',
  cta: '#10B981',
  bg: isDark ? '#0F0F1A' : '#F7F6FF',
  surface: isDark ? '#16162A' : '#FFFFFF',
  border: isDark ? '#2D2D52' : '#EAE8F8',
  text: isDark ? '#F1F0FF' : '#1E1B4B',
  textMuted: isDark ? '#A8A5C7' : '#6B7280',
  danger: isDark ? '#FF6B6B' : '#EF4444',
  dangerSoft: isDark ? 'rgba(255,107,107,0.15)' : 'rgba(239,68,68,0.08)',
  warning: '#FDB022',
  success: '#10B981',
  successSoft: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)',
  radius: '10px',
  radiusSm: '6px',
  font: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
});

// ---- SVG Icons ----
const FileIcon = ({ color = 'currentColor' }: { color?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const CalendarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const FileTypeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const SpinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);
const EmptyResumeIcon = () => (
  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);

interface Resume {
  id: string;
  title: string;
  fileType: string;
  fileName?: string;
  createdAt: string;
  isProcessed: boolean;
  overallScore?: number;
}

const ResumeList: React.FC = () => {
  const navigate = useNavigate();
  const { error, success } = useToastModal();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Theme support - detect dark mode and respond to changes
  const [isDarkMode, setIsDarkMode] = useState(() =>
    typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Get current theme colors
  const C = getThemeColors(isDarkMode);

  const getScoreColor = (score: number) => {
    if (score >= 75) return C.success;
    if (score >= 60) return C.warning;
    return C.danger;
  };

  useEffect(() => { fetchResumes(); }, []);

  const fetchResumes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/resume-analysis`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to fetch resumes');
      const data = await response.json();
      const resumesList = data.data || [];
      const resumesWithAnalysis = await Promise.all(
        resumesList.map(async (resume: Resume) => {
          try {
            const r = await fetch(`${apiBaseUrl}/resume-analysis/${resume.id}/analysis`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (r.ok) { const d = await r.json(); return { ...resume, overallScore: d.data?.overallScore }; }
          } catch { console.warn(`Failed to fetch analysis for resume ${resume.id}`); }
          return resume;
        })
      );
      setResumes(resumesWithAnalysis);
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to fetch resumes', '获取简历失败');
    } finally { setLoading(false); }
  };

  const handleViewResume = (resumeId: string) => navigate(`/dashboard/resume/${resumeId}`);

  const handleDeleteResume = async (event: React.MouseEvent, resumeId: string) => {
    event.stopPropagation();
    if (!window.confirm('确定要删除这份简历吗？')) return;
    try {
      setDeletingId(resumeId);
      const token = localStorage.getItem('token');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/resume-analysis/${resumeId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to delete resume');
      setResumes(resumes.filter(r => r.id !== resumeId));
      success('简历已删除', '删除成功');
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to delete resume', '删除失败');
    } finally { setDeletingId(null); }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });

  const btnBase: React.CSSProperties = {
    border: 'none', borderRadius: C.radiusSm, fontFamily: C.font, fontWeight: 600,
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px',
    transition: 'all 0.15s ease', whiteSpace: 'nowrap',
  };

  if (loading) {
    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: C.textMuted, fontFamily: C.font }}>
          <span style={{ display: 'inline-flex', animation: 'spin 1s linear infinite', marginRight: '10px' }}><SpinIcon /></span>
          加载中...
        </div>
        <LoadingModal isOpen={loading} title="加载简历列表" description="正在获取您的简历..." />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </>
    );
  }

  return (
    <div style={{ fontFamily: C.font, color: C.text }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: C.text, letterSpacing: '-0.01em' }}>我的简历</h2>
        <button
          onClick={() => navigate('/dashboard/resume/upload')}
          style={{ ...btnBase, background: C.primary, color: 'white', padding: '8px 18px', fontSize: '0.875rem' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.primaryHover}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = C.primary}
        >
          <PlusIcon /> 上传简历
        </button>
      </div>

      {resumes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: C.textMuted }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'rgba(99,102,241,0.3)' }}>
            <EmptyResumeIcon />
          </div>
          <p style={{ fontSize: '0.95rem', margin: '0 0 1.5rem', lineHeight: 1.7 }}>暂无简历，上传你的第一份简历开始分析</p>
          <button
            onClick={() => navigate('/dashboard/resume/upload')}
            style={{ ...btnBase, background: C.primary, color: 'white', padding: '10px 24px', fontSize: '0.9rem' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.primaryHover}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = C.primary}
          >
            <PlusIcon /> 上传简历
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}>
          {resumes.map(resume => (
            <div
              key={resume.id}
              onClick={() => handleViewResume(resume.id)}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: '14px',
                padding: '1.25rem',
                cursor: deletingId === resume.id ? 'not-allowed' : 'pointer',
                opacity: deletingId === resume.id ? 0.6 : 1,
                pointerEvents: deletingId === resume.id ? 'none' : 'auto',
                transition: 'all 0.15s ease',
                borderLeft: `3px solid ${C.primary}`,
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = '0 8px 24px rgba(99,102,241,0.12)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none'; }}
            >
              {/* Icon + title */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ flexShrink: 0, width: '38px', height: '38px', background: C.primarySoft, borderRadius: C.radiusSm, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileIcon />
                </div>
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: C.text, lineHeight: 1.4, wordBreak: 'break-word' }}>
                  {resume.title}
                </h3>
              </div>

              {/* Meta */}
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: C.textMuted, marginBottom: '12px', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CalendarIcon /> {formatDate(resume.createdAt)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileTypeIcon /> {resume.fileType.toUpperCase()}
                </span>
              </div>

              {/* Score */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 12px',
                background: C.bg,
                borderRadius: C.radiusSm,
                marginBottom: '12px',
                border: `1px solid ${C.border}`,
              }}>
                {resume.isProcessed && resume.overallScore !== undefined ? (
                  <>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: getScoreColor(resume.overallScore), lineHeight: 1 }}>
                      {Math.round(resume.overallScore)}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: C.textMuted, fontWeight: 500 }}>/ 100 综合评分</span>
                    <div style={{
                      flex: 1, height: '4px', background: C.border, borderRadius: '2px', overflow: 'hidden', marginLeft: 'auto',
                    }}>
                      <div style={{ height: '100%', width: `${resume.overallScore}%`, background: getScoreColor(resume.overallScore), borderRadius: '2px' }} />
                    </div>
                  </>
                ) : (
                  <>
                    <span style={{ display: 'inline-flex', animation: 'spin 1s linear infinite', color: C.warning }}><SpinIcon /></span>
                    <span style={{ fontSize: '0.82rem', color: C.textMuted, fontWeight: 500 }}>AI 分析中...</span>
                  </>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: `1px solid ${C.border}` }}>
                <button
                  onClick={e => { e.stopPropagation(); handleViewResume(resume.id); }}
                  style={{ ...btnBase, flex: 1, background: C.primarySoft, color: C.primary, padding: '7px 10px', fontSize: '0.8rem', justifyContent: 'center' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.14)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = C.primarySoft}
                >
                  <SearchIcon /> 查看分析
                </button>
                <button
                  onClick={e => handleDeleteResume(e, resume.id)}
                  style={{ ...btnBase, flex: 1, background: C.dangerSoft, color: C.danger, padding: '7px 10px', fontSize: '0.8rem', justifyContent: 'center' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.14)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = C.dangerSoft}
                >
                  <TrashIcon /> 删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResumeList;
