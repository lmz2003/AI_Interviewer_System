import React, { useState, useMemo, useEffect } from 'react';

// ---- Design tokens (theme-aware) ----
const getThemeColors = (isDark: boolean) => ({
  primary: isDark ? '#818CF8' : '#6366F1',
  primarySoft: isDark ? 'rgba(129,140,248,0.1)' : 'rgba(99,102,241,0.08)',
  primaryHover: isDark ? '#6366F1' : '#4F46E5',
  cta: '#10B981',
  bg: isDark ? '#0F0F1A' : '#F7F6FF',
  surface: isDark ? '#16162A' : '#FFFFFF',
  border: isDark ? '#2D2D52' : '#EAE8F8',
  text: isDark ? '#F1F0FF' : '#1E1B4B',
  textMuted: isDark ? '#A8A5C7' : '#6B7280',
  danger: isDark ? '#FF6B6B' : '#EF4444',
  dangerSoft: isDark ? 'rgba(255,107,107,0.15)' : 'rgba(239,68,68,0.08)',
  warning: '#FDB022',
  warningSoft: isDark ? 'rgba(253,176,34,0.15)' : 'rgba(245,158,11,0.08)',
  success: '#10B981',
  successSoft: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)',
  radius: '10px',
  radiusSm: '6px',
  font: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
});

// ---- SVG Icons ----
const BarChartIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>
  </svg>
);
const TargetIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
);
const KeyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
  </svg>
);
const StarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const ClipboardIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
  </svg>
);
const ThumbsUpIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
  </svg>
);
const TrendUpIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const XSmallIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const LightbulbIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/>
  </svg>
);

// ---- Helpers (moved inside component to use reactive C) ----
const buildScoreHelpers = (C: ReturnType<typeof getThemeColors>) => ({
  getScoreColor: (score: number) => {
    if (score >= 75) return C.success;
    if (score >= 60) return C.warning;
    return C.danger;
  },
  getScoreBg: (score: number) => {
    if (score >= 75) return C.successSoft;
    if (score >= 60) return C.warningSoft;
    return C.dangerSoft;
  },
});

const safeJsonParse = (jsonStr: string | null | undefined, fallback: any = {}): any => {
  if (!jsonStr) return fallback;
  try {
    let result = JSON.parse(jsonStr);
    while (typeof result === 'string') { result = JSON.parse(result); }
    return result;
  } catch { return fallback; }
};

interface Analysis {
  id: string;
  overallScore: number;
  completenessScore: number;
  keywordScore: number;
  experienceScore: number;
  skillsScore: number;
  keywordAnalysis: string;
  contentAnalysis: string;
  jobMatchAnalysis: string;
  competencyAnalysis: string;
  detailedReport: string;
  createdAt: string;
}

interface AnalysisPanelProps {
  analysis: Analysis | any;
}

type TabId = 'overview' | 'jobMatch' | 'competency' | 'report' | 'keywords';

// 关键词分类英文名 -> 中文映射
const CATEGORY_LABEL_MAP: Record<string, string> = {
  skills:      '技术技能',
  experience:  '工作经验',
  education:   '教育背景',
  jobSpecific: '岗位匹配',
};

const TABS: { id: TabId; label: string; Icon: React.FC }[] = [
  { id: 'overview',    label: '概览',     Icon: BarChartIcon },
  { id: 'jobMatch',   label: '岗位匹配', Icon: TargetIcon },
  { id: 'competency', label: '核心竞能', Icon: StarIcon },
  { id: 'report',     label: '建议',     Icon: ClipboardIcon },
  { id: 'keywords',   label: '关键词',   Icon: KeyIcon },
];

const scoreItems = [
  { key: 'completenessScore', label: '完整性' },
  { key: 'keywordScore',      label: '关键词' },
  { key: 'experienceScore',   label: '工作经验' },
  { key: 'skillsScore',       label: '技能评分' },
];

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysis }) => {
  // 判断是否有岗位匹配数据（用于控制 jobMatch Tab 的显示）
  const hasJobMatch = !!analysis.jobMatchAnalysis && analysis.jobMatchAnalysis !== 'null';

  const [activeTab, setActiveTab] = useState<TabId>('overview');

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

  // Get current theme colors and helpers
  const C = getThemeColors(isDarkMode);
  const { getScoreColor, getScoreBg } = buildScoreHelpers(C);

  const keywordData   = useMemo(() => safeJsonParse(analysis.keywordAnalysis,   { keywords: [] }), [analysis.keywordAnalysis]);
  const jobMatchData  = useMemo(() => safeJsonParse(analysis.jobMatchAnalysis,  { matchScore: 0, matchingSkills: [], missingSkills: [], jobSpecificSuggestions: [] }), [analysis.jobMatchAnalysis]);
  const competencyData = useMemo(() => safeJsonParse(analysis.competencyAnalysis, { coreCompetencies: [], technicalSkillsLevel: '', projectExperienceValue: '', careerPotential: '' }), [analysis.competencyAnalysis]);
  const reportData    = useMemo(() => safeJsonParse(analysis.detailedReport,    { overallEvaluation: '', strengths: [], improvements: [], suggestions: [] }), [analysis.detailedReport]);

  // ---- Shared sub-components ----
  const SectionTitle: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px', color: C.text }}>
      <span style={{ color: C.primary }}>{icon}</span>
      <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>{label}</span>
    </div>
  );

  const ListBlock: React.FC<{ items: string[]; accent?: string }> = ({ items, accent = C.primary }) => (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
      {items.map((item, idx) => (
        <li key={idx} style={{ padding: '9px 12px', background: C.bg, borderLeft: `3px solid ${accent}`, borderRadius: C.radiusSm, color: C.text, fontSize: '0.875rem', lineHeight: 1.5 }}>
          {item}
        </li>
      ))}
    </ul>
  );

  const SuggestionBlock: React.FC<{ items: string[] }> = ({ items }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map((s, idx) => (
        <div key={idx} style={{ background: C.warningSoft, borderLeft: `3px solid ${C.warning}`, padding: '10px 12px', borderRadius: C.radiusSm, color: C.text, fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {s}
        </div>
      ))}
    </div>
  );

  const Section: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ marginBottom: '22px' }}>{children}</div>
  );

  // 有效 Tab 列表（无 JD 时隐藏「岗位匹配」）
  const visibleTabs = hasJobMatch ? TABS : TABS.filter(t => t.id !== 'jobMatch');

  // ---- Tab content renderers ----
  const renderOverview = () => (
    <>
      {/* <Section>
        <SectionTitle icon={<BarChartIcon />} label="各维度评分" />
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
          gap: '8px' 
        }}>
          {scoreItems.map(({ key, label }) => {
            const val = Math.round(analysis[key] ?? 0);
            const color = getScoreColor(val);
            const bgColor = getScoreBg(val);
            return (
              <div key={key} style={{ background: bgColor, border: `1px solid ${C.border}`, borderRadius: C.radius, padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: '0.75rem', color: C.textMuted, fontWeight: 600, marginTop: '4px' }}>{label}</div>
              </div>
            );
          })}
        </div>
      </Section> */}

      {reportData.overallEvaluation && (
        <Section>
          <SectionTitle icon={<TargetIcon />} label="总体评价" />
          <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: C.text, margin: 0, padding: '12px', background: C.bg, borderRadius: C.radiusSm }}>{reportData.overallEvaluation}</p>
        </Section>
      )}

      {reportData.strengths?.length > 0 && (
        <Section>
          <SectionTitle icon={<ThumbsUpIcon />} label="主要优势" />
          <ListBlock items={reportData.strengths} accent={C.success} />
        </Section>
      )}

      {reportData.improvements?.length > 0 && (
        <Section>
          <SectionTitle icon={<TrendUpIcon />} label="改进空间" />
          <ListBlock items={reportData.improvements} accent={C.warning} />
        </Section>
      )}
    </>
  );

  const renderKeywords = () => (
    <>
      <Section>
        <SectionTitle icon={<KeyIcon />} label="识别到的关键词" />
        {keywordData.keywords?.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {keywordData.keywords.map((kw: string, idx: number) => (
              <span key={idx} style={{ background: C.primarySoft, color: C.primary, padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
                {kw}
              </span>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.875rem', color: C.textMuted, margin: 0 }}>未识别到关键词</p>
        )}
      </Section>

      {keywordData.categoryScores && Object.keys(keywordData.categoryScores).length > 0 && (
        <Section>
          <SectionTitle icon={<BarChartIcon />} label="关键词分类评分" />
          <ListBlock items={Object.entries(keywordData.categoryScores).map(
            ([cat, score]) => `${CATEGORY_LABEL_MAP[cat] ?? cat}：${score}`
          )} />
        </Section>
      )}
    </>
  );

  const renderJobMatch = () => {
    if (!hasJobMatch) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '3rem 1.5rem', color: C.textMuted }}>
          <TargetIcon />
          <p style={{ margin: 0, fontSize: '0.875rem', textAlign: 'center' }}>未提供职位描述，无法进行岗位匹配分析</p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: C.textMuted, textAlign: 'center' }}>重新上传简历时填写「职位描述」可获得此分析</p>
        </div>
      );
    }
    const matchScore = jobMatchData.matchScore ?? 0;
    const matchColor = matchScore >= 8 ? C.success : matchScore >= 6 ? C.warning : C.danger;
    return (
      <>
        <Section>
          <SectionTitle icon={<TargetIcon />} label="岗位匹配度" />
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '10px 16px', background: getScoreBg(matchScore * 10), border: `1px solid ${C.border}`, borderRadius: C.radius }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: matchColor, lineHeight: 1 }}>{matchScore}</span>
            <span style={{ fontSize: '0.8rem', color: C.textMuted, fontWeight: 500 }}>/ 10</span>
          </div>
        </Section>

        {jobMatchData.matchingSkills?.length > 0 && (
          <Section>
            <SectionTitle icon={<CheckIcon />} label="匹配的技能与经验" />
            <ListBlock items={jobMatchData.matchingSkills} accent={C.success} />
          </Section>
        )}

        {jobMatchData.missingSkills?.length > 0 && (
          <Section>
            <SectionTitle icon={<XSmallIcon />} label="缺失的技能" />
            <ListBlock items={jobMatchData.missingSkills} accent={C.danger} />
          </Section>
        )}

        {jobMatchData.jobSpecificSuggestions?.length > 0 && (
          <Section>
            <SectionTitle icon={<LightbulbIcon />} label="针对岗位的建议" />
            <SuggestionBlock items={jobMatchData.jobSpecificSuggestions} />
          </Section>
        )}
      </>
    );
  };

  const renderCompetency = () => (
    <>
      {competencyData.coreCompetencies?.length > 0 && (
        <Section>
          <SectionTitle icon={<StarIcon />} label="核心竞争力" />
          <ListBlock items={competencyData.coreCompetencies} accent={C.primary} />
        </Section>
      )}
      {competencyData.technicalSkillsLevel && (
        <Section>
          <SectionTitle icon={<BarChartIcon />} label="技能水平评估" />
          <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: C.text, margin: 0, padding: '12px', background: C.bg, borderRadius: C.radiusSm }}>{competencyData.technicalSkillsLevel}</p>
        </Section>
      )}
      {competencyData.projectExperienceValue && (
        <Section>
          <SectionTitle icon={<ClipboardIcon />} label="项目经验价值" />
          <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: C.text, margin: 0, padding: '12px', background: C.bg, borderRadius: C.radiusSm }}>{competencyData.projectExperienceValue}</p>
        </Section>
      )}
      {competencyData.careerPotential && (
        <Section>
          <SectionTitle icon={<TrendUpIcon />} label="职业发展潜力" />
          <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: C.text, margin: 0, padding: '12px', background: C.bg, borderRadius: C.radiusSm }}>{competencyData.careerPotential}</p>
        </Section>
      )}
    </>
  );

  const renderReport = () => (
    <>
      {reportData.suggestions?.length > 0 ? (
        <Section>
          <SectionTitle icon={<LightbulbIcon />} label="详细建议" />
          <SuggestionBlock items={reportData.suggestions} />
        </Section>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '3rem 1rem', color: C.textMuted }}>
          <LightbulbIcon />
          <p style={{ margin: 0, fontSize: '0.875rem' }}>暂无改进建议</p>
        </div>
      )}
    </>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':   return renderOverview();
      case 'jobMatch':   return renderJobMatch();
      case 'competency': return renderCompetency();
      case 'report':     return renderReport();
      case 'keywords':   return renderKeywords();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', fontFamily: C.font }}>
      {/* Panel Header: Score Cards */}
      <div style={{ padding: '16px 20px', background: C.surface, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700, color: C.text }}>简历分析报告</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', 
          gap: '8px' 
        }}>
          {[
            { label: '总体评分', key: 'overallScore' },
            { label: '完整性', key: 'completenessScore' },
            { label: '关键词', key: 'keywordScore' },
            { label: '工作经验', key: 'experienceScore' },
            { label: '技能', key: 'skillsScore' },
          ].map(({ label, key }) => {
            const val = Math.round(analysis[key] ?? 0);
            const color = getScoreColor(val);
            return (
              <div key={key} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: C.radiusSm, padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: '0.7rem', color: C.textMuted, fontWeight: 600, marginTop: '3px', lineHeight: 1.3 }}>{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
        {visibleTabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: 'none', border: 'none',
              borderBottom: `2px solid ${activeTab === id ? C.primary : 'transparent'}`,
              padding: '10px 14px', marginBottom: '-1px',
              color: activeTab === id ? C.primary : C.textMuted,
              fontWeight: activeTab === id ? 700 : 500,
              fontSize: '0.8rem', cursor: 'pointer', fontFamily: C.font,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            <Icon /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', minHeight: 0 }}>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AnalysisPanel;
