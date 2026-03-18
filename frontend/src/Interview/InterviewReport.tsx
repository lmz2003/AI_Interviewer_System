import React, { useState, useEffect } from 'react';
import { interviewApi } from './api';
import type { Interview, InterviewReport } from './types';
import './Interview.scss';

// SVG 图标
const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ClipboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

const BarChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
    <line x1="2" y1="20" x2="22" y2="20" />
  </svg>
);

const ThumbsUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
);

const TargetIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const LightbulbIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <line x1="9" y1="18" x2="15" y2="18" />
    <line x1="10" y1="22" x2="14" y2="22" />
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
  </svg>
);

const MessageSquareIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const BookOpenIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const VideoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const DatabaseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const FileTextIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

interface InterviewReportProps {
  reportId: string;
  interview: Interview | null;
  onBack: () => void;
}

const InterviewReportPage: React.FC<InterviewReportProps> = ({
  reportId,
  interview,
  onBack,
}) => {
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingToKnowledge, setSyncingToKnowledge] = useState(false);
  const [syncingToNotes, setSyncingToNotes] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await interviewApi.getReport(reportId);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载报告失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToKnowledge = async () => {
    if (!report || syncingToKnowledge) return;
    
    setSyncingToKnowledge(true);
    setSyncMessage(null);
    
    try {
      const result = await interviewApi.syncReportToKnowledge(reportId);
      if (result.success) {
        setReport({ ...report, knowledgeDocumentId: result.documentId, syncedToKnowledgeAt: new Date().toISOString() });
        setSyncMessage('已成功同步到知识库');
      } else {
        setSyncMessage(result.message);
      }
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : '同步失败');
    } finally {
      setSyncingToKnowledge(false);
    }
  };

  const handleSyncToNotes = async () => {
    if (!report || syncingToNotes) return;
    
    setSyncingToNotes(true);
    setSyncMessage(null);
    
    try {
      const result = await interviewApi.syncReportToNotes(reportId);
      if (result.success) {
        setReport({ ...report, noteId: result.noteId, syncedToNoteAt: new Date().toISOString() });
        setSyncMessage('已成功同步到笔记');
      } else {
        setSyncMessage(result.message);
      }
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : '同步失败');
    } finally {
      setSyncingToNotes(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return '#10b981';
    if (score >= 6) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLevel = (score: number) => {
    if (score >= 9) return '优秀';
    if (score >= 7) return '良好';
    if (score >= 5) return '一般';
    if (score >= 3) return '待提升';
    return '需要加强';
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      knowledge: '知识补充',
      skill: '技能提升',
      technique: '面试技巧',
      practice: '练习实践',
      mindset: '心态调整',
    };
    return labels[category] || category;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      high: '高优先级',
      medium: '中优先级',
      low: '低优先级',
    };
    return labels[priority] || priority;
  };

  if (loading) {
    return (
      <div className="interview-report-page">
        <div className="loading-state">
          <div className="spinner" />
          加载报告...
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="interview-report-page">
        <div className="error-state">
          <p>{error || '报告不存在'}</p>
          <button onClick={onBack}>返回</button>
        </div>
      </div>
    );
  }

  return (
    <div className="interview-report-page">
      <div className="report-header">
        <button className="back-btn" onClick={onBack}>
          <ChevronLeftIcon /> 返回
        </button>
        <h2>面试报告</h2>
        {interview && (
          <div className="report-meta">
            <span>{interview.sceneName}</span>
            <span>{interview.jobName || '通用岗位'}</span>
          </div>
        )}
      </div>

      <div className="report-sync-section">
        <div className="sync-buttons">
          <button
            className={`sync-btn sync-knowledge-btn ${report.knowledgeDocumentId ? 'synced' : ''}`}
            onClick={handleSyncToKnowledge}
            disabled={syncingToKnowledge || !!report.knowledgeDocumentId}
          >
            {report.knowledgeDocumentId ? (
              <>
                <CheckIcon /> 已同步到知识库
              </>
            ) : syncingToKnowledge ? (
              <>
                <span className="sync-spinner" /> 同步中...
              </>
            ) : (
              <>
                <DatabaseIcon /> 同步到知识库
              </>
            )}
          </button>
          <button
            className={`sync-btn sync-notes-btn ${report.noteId ? 'synced' : ''}`}
            onClick={handleSyncToNotes}
            disabled={syncingToNotes || !!report.noteId}
          >
            {report.noteId ? (
              <>
                <CheckIcon /> 已同步到笔记
              </>
            ) : syncingToNotes ? (
              <>
                <span className="sync-spinner" /> 同步中...
              </>
            ) : (
              <>
                <FileTextIcon /> 同步到笔记
              </>
            )}
          </button>
        </div>
        {syncMessage && (
          <div className="sync-message">{syncMessage}</div>
        )}
      </div>

      <div className="report-content">
        <div className="report-section overall-section">
          <div className="overall-score-card">
            <div className="score-circle">
              <svg viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={getScoreColor(report.overallScore)}
                  strokeWidth="8"
                  strokeDasharray={`${report.overallScore * 28.27} 282.7`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="score-text">
                <span className="score-value">{report.overallScore.toFixed(1)}</span>
                <span className="score-max">/10</span>
              </div>
            </div>
            <div className="score-info">
              <h3>{getScoreLevel(report.overallScore)}</h3>
              <p>综合评分</p>
            </div>
          </div>

          {report.summary && (
            <div className="summary-card">
              <h4>
                <ClipboardIcon />
                面试总结
              </h4>
              <p>{report.summary}</p>
            </div>
          )}
        </div>

        <div className="report-section dimensions-section">
          <h3>
            <BarChartIcon />
            维度评分
          </h3>
          <div className="dimensions-grid">
            {[
              { key: 'completeness', name: '内容完整性', desc: '是否完整回答了问题' },
              { key: 'clarity', name: '逻辑清晰度', desc: '回答是否有条理' },
              { key: 'depth', name: '专业深度', desc: '回答的专业程度' },
              { key: 'expression', name: '表达能力', desc: '语言组织和表达' },
              { key: 'highlights', name: '亮点突出', desc: '是否有亮点或独特见解' },
            ].map((dim) => {
              const score = report.dimensionScores[dim.key as keyof typeof report.dimensionScores];
              return (
                <div key={dim.key} className="dimension-card">
                  <div className="dimension-header">
                    <span className="dimension-name">{dim.name}</span>
                    <span
                      className="dimension-score"
                      style={{ color: getScoreColor(score) }}
                    >
                      {score.toFixed(1)}
                    </span>
                  </div>
                  <div className="dimension-bar">
                    <div
                      className="dimension-fill"
                      style={{
                        width: `${score * 10}%`,
                        backgroundColor: getScoreColor(score),
                      }}
                    />
                  </div>
                  <p className="dimension-desc">{dim.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="report-section analysis-section">
          <div className="analysis-card strengths">
            <h4>
              <ThumbsUpIcon />
              优势
            </h4>
            <p>{report.strengths}</p>
          </div>
          <div className="analysis-card weaknesses">
            <h4>
              <TargetIcon />
              待提升
            </h4>
            <p>{report.weaknesses}</p>
          </div>
        </div>

        <div className="report-section suggestions-section">
          <h3>
            <LightbulbIcon />
            改进建议
          </h3>
          <div className="suggestions-content">
            {report.suggestions.split('\n').map((s, i) => (
              <p key={i}>{s}</p>
            ))}
          </div>
        </div>

        {report.videoBehaviorScores && (
          <div className="report-section video-behavior-section">
            <h3>
              <VideoIcon />
              视频行为分析
            </h3>

            {/* 视频综合评分总览 */}
            <div className="video-overall-card">
              <div className="video-overall-score">
                <div
                  className="video-score-circle"
                  style={{
                    background: `conic-gradient(
                      ${report.videoBehaviorScores.overallVideoScore >= 70 ? '#10b981' : report.videoBehaviorScores.overallVideoScore >= 50 ? '#f59e0b' : '#ef4444'} 
                      ${report.videoBehaviorScores.overallVideoScore * 3.6}deg,
                      #e5e7eb ${report.videoBehaviorScores.overallVideoScore * 3.6}deg
                    )`,
                  }}
                >
                  <div className="video-score-inner">
                    <span className="video-score-value">{report.videoBehaviorScores.overallVideoScore}</span>
                    <span className="video-score-max">/100</span>
                  </div>
                </div>
                <div className="video-score-label">视频行为综合评分</div>
              </div>

              {/* 四项子维度 */}
              <div className="video-dimensions">
                {[
                  {
                    key: 'eyeContactScore',
                    label: '眼神接触',
                    desc: '与摄像头保持目光接触的比例',
                    icon: '👁',
                  },
                  {
                    key: 'emotionStabilityScore',
                    label: '情绪稳定性',
                    desc: '面部表情是否积极平稳',
                    icon: '😊',
                  },
                  {
                    key: 'gazeStabilityScore',
                    label: '视线稳定性',
                    desc: '视线集中在屏幕方向的程度',
                    icon: '🎯',
                  },
                  {
                    key: 'faceVisibilityScore',
                    label: '面部可见度',
                    desc: '全程面部在画面中的清晰度',
                    icon: '📷',
                  },
                ].map((dim) => {
                  const score = report.videoBehaviorScores![dim.key as keyof typeof report.videoBehaviorScores] as number;
                  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={dim.key} className="video-dimension-item">
                      <div className="video-dimension-header">
                        <span className="video-dimension-icon">{dim.icon}</span>
                        <span className="video-dimension-name">{dim.label}</span>
                        <span className="video-dimension-score" style={{ color }}>{score}</span>
                      </div>
                      <div className="video-dimension-bar">
                        <div
                          className="video-dimension-fill"
                          style={{ width: `${score}%`, backgroundColor: color }}
                        />
                      </div>
                      <p className="video-dimension-desc">{dim.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 视频行为文字反馈 */}
            {report.videoBehaviorFeedback && (
              <div className="video-feedback-card">
                <h4>行为反馈</h4>
                <div className="video-feedback-list">
                  {report.videoBehaviorFeedback.split('；').filter(Boolean).map((fb, i) => (
                    <div key={i} className="video-feedback-item">
                      <span className="video-feedback-bullet">•</span>
                      <span>{fb}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {report.questionAnalysis && report.questionAnalysis.length > 0 && (
          <div className="report-section questions-section">
            <h3>
              <MessageSquareIcon />
              问题分析
            </h3>
            <div className="questions-list">
              {report.questionAnalysis.map((qa, index) => (
                <div key={index} className="question-item">
                  <div className="question-header">
                    <span className="question-number">问题 {index + 1}</span>
                    <span
                      className="question-score"
                      style={{ color: getScoreColor(qa.score) }}
                    >
                      {qa.score.toFixed(1)} 分
                    </span>
                  </div>
                  <div className="question-content">
                    <div className="qa-item">
                      <label>问题：</label>
                      <p>{qa.question}</p>
                    </div>
                    <div className="qa-item">
                      <label>回答：</label>
                      <p>{qa.answer}</p>
                    </div>
                    {qa.feedback && (
                      <div className="qa-item feedback">
                        <label>反馈：</label>
                        <p>{qa.feedback}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {report.learningSuggestions && report.learningSuggestions.length > 0 && (
          <div className="report-section suggestions-learning-section">
            <h3>
              <BookOpenIcon />
              学习建议
            </h3>
            <div className="learning-suggestions-list">
              {report.learningSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`suggestion-item priority-${suggestion.priority}`}
                >
                  <div className="suggestion-header">
                    <span className={`suggestion-category category-${suggestion.category}`}>
                      {getCategoryLabel(suggestion.category)}
                    </span>
                    <span className={`suggestion-priority priority-${suggestion.priority}`}>
                      {getPriorityLabel(suggestion.priority)}
                    </span>
                  </div>
                  <h4 className="suggestion-title">{suggestion.title}</h4>
                  <p className="suggestion-content">{suggestion.content}</p>
                  {suggestion.relatedDimension && (
                    <span className="suggestion-dimension">
                      关联维度：{suggestion.relatedDimension}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewReportPage;
