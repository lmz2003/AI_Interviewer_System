import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToastModal } from '../components/ui/toast-modal';
import PDFViewer from './components/PDFViewer';
import AnalysisPanel from './components/AnalysisPanel';
import LoadingModal from './components/LoadingModal';

// ---- Design tokens (theme-aware) ----
const getThemeColors = (isDark: boolean) => ({
  primary: isDark ? '#818CF8' : '#6366F1',
  primarySoft: isDark ? 'rgba(129,140,248,0.1)' : 'rgba(99,102,241,0.08)',
  bg: isDark ? '#0F0F1A' : '#F7F6FF',
  surface: isDark ? '#16162A' : '#FFFFFF',
  border: isDark ? '#2D2D52' : '#EAE8F8',
  text: isDark ? '#F1F0FF' : '#1E1B4B',
  textMuted: isDark ? '#A8A5C7' : '#6B7280',
  divider: isDark ? '#2D2D52' : '#e2e8f0',
  font: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
});

// ---- SVG Icons ----
const ArrowLeftIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

interface Resume {
  id: string;
  title: string;
  content: string;
  fileType: string;
  parsedData?: any;
  createdAt: string;
}

const ResumeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { error } = useToastModal();

  const [resume, setResume] = useState<Resume | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

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

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

      const [resumeRes, analysisRes] = await Promise.all([
        fetch(`${apiBaseUrl}/resume-analysis/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${apiBaseUrl}/resume-analysis/${id}/analysis`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }).catch(() => ({ ok: false }) as any),
      ]);

      if (!resumeRes.ok) throw new Error('Failed to fetch resume');

      const resumeData = await resumeRes.json();
      setResume(resumeData.data);

      if (analysisRes.ok && 'json' in analysisRes) {
        const analysisData = await analysisRes.json();
        setAnalysis(analysisData.data);
        if (analysisData.data?.analysisStage !== undefined) {
          setAnalysisStage(analysisData.data.analysisStage);
        }
      } else {
        setTimeout(() => setRetryCount(prev => prev + 1), 10000);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch data';
      error(errorMsg, '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (retryCount > 0 && !analysis) {
      const timer = setTimeout(() => { fetchAnalysisOnly(); }, 10000);
      return () => clearTimeout(timer);
    }
  }, [retryCount]);

  const fetchAnalysisOnly = async () => {
    if (!id) return;
    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/resume-analysis/${id}/analysis`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const analysisData = await response.json();
        setAnalysis(analysisData.data);
        if (analysisData.data?.analysisStage !== undefined) {
          setAnalysisStage(analysisData.data.analysisStage);
        }
      } else {
        setRetryCount(prev => prev + 1);
      }
    } catch (e) {
      console.error('Error fetching analysis:', e);
    }
  };

  const getAnalysisStageInfo = (stage: number) => {
    const stageMap: Record<number, { title: string; description: string }> = {
      0: { title: '准备分析', description: '正在初始化分析流程，即将开始...' },
      1: { title: '文本提取', description: '正在提取简历中的文本内容...' },
      2: { title: '结构解析', description: '正在解析简历的结构和信息...' },
      3: { title: '评分分析', description: '正在分析并评估各项指标...' },
      4: { title: '报告生成', description: '正在生成详细的分析报告...' },
      5: { title: '分析完成', description: '分析已完成，正在加载结果...' },
    };
    return stageMap[stage] || stageMap[0];
  };

  if (loading) {
    return <LoadingModal isOpen={loading} title="加载简历" description="正在获取简历信息..." />;
  }

  if (!resume) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: C.font }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: C.surface, borderBottom: `1px solid ${C.border}` }}>
          <button
            onClick={() => navigate('/dashboard/resume')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: 'none', borderRadius: '6px', background: C.primarySoft, color: C.primary, padding: '7px 14px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: C.font }}
          >
            <ArrowLeftIcon /> 返回
          </button>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: C.text }}>简历分析</h2>
          <div />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted, fontFamily: C.font }}>
          <p>简历不存在</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', background: C.bg, overflow: 'hidden', fontFamily: C.font }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: C.surface, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button
          onClick={() => navigate('/dashboard/resume')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: 'none', borderRadius: '6px', background: C.primarySoft, color: C.primary, padding: '7px 14px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: C.font, transition: 'background 0.15s' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.14)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = C.primarySoft}
        >
          <ArrowLeftIcon /> 返回
        </button>
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: C.text, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '50%' }}>{resume.title}</h2>
        <div />
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: '1px', background: C.border, minHeight: 0 }}>
        {/* Left: PDF/Text viewer */}
        <div style={{ flex: 1, overflow: 'auto', background: C.surface, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflow: 'auto', minHeight: 0 }}>
            {resume.fileType === 'pdf' ? (
              <PDFViewer resumeId={resume.id} />
            ) : (
              <div style={{ padding: '20px', whiteSpace: 'pre-wrap', wordWrap: 'break-word', overflow: 'auto', fontFamily: C.font, fontSize: '0.9rem', lineHeight: 1.7, color: C.text }}>
                {resume.content}
              </div>
            )}
          </div>
        </div>

        {/* Right: Analysis */}
        <div style={{ flex: 1, overflow: 'auto', background: C.surface, minHeight: 0 }}>
          {!analysis ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.textMuted, fontFamily: C.font }}>
              <p>等待分析完成...</p>
            </div>
          ) : (
            <AnalysisPanel analysis={analysis} parsedData={resume.parsedData} />
          )}
        </div>
      </div>

      {/* Analysis loading modal */}
      {!analysis && (
        <LoadingModal
          isOpen={true}
          title={getAnalysisStageInfo(analysisStage).title}
          description={getAnalysisStageInfo(analysisStage).description}
          showProgress={true}
          progress={analysisStage}
          maxProgress={5}
        />
      )}
    </div>
  );
};

export default ResumeDetail;
