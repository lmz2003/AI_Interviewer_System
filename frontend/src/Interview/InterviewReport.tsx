import React, { useState, useEffect } from 'react';
import { interviewApi } from './api';
import type { Interview, InterviewReport } from './types';
import './Interview.scss';

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

  if (loading) {
    return (
      <div className="interview-report-page">
        <div className="loading-state">加载报告...</div>
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
          ← 返回
        </button>
        <h2>面试报告</h2>
        {interview && (
          <div className="report-meta">
            <span>{interview.sceneName}</span>
            <span>{interview.jobName || '通用岗位'}</span>
          </div>
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
              <h4>📋 面试总结</h4>
              <p>{report.summary}</p>
            </div>
          )}
        </div>

        <div className="report-section dimensions-section">
          <h3>📊 维度评分</h3>
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
            <h4>💪 优势</h4>
            <p>{report.strengths}</p>
          </div>
          <div className="analysis-card weaknesses">
            <h4>🎯 待提升</h4>
            <p>{report.weaknesses}</p>
          </div>
        </div>

        <div className="report-section suggestions-section">
          <h3>💡 改进建议</h3>
          <div className="suggestions-content">
            {report.suggestions.split('\n').map((s, i) => (
              <p key={i}>{s}</p>
            ))}
          </div>
        </div>

        {report.questionAnalysis && report.questionAnalysis.length > 0 && (
          <div className="report-section questions-section">
            <h3>📝 问题分析</h3>
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

        {report.learningResources && report.learningResources.length > 0 && (
          <div className="report-section resources-section">
            <h3>📚 学习资源推荐</h3>
            <div className="resources-list">
              {report.learningResources.map((resource, index) => (
                <a
                  key={index}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resource-item"
                >
                  <span className="resource-type">{resource.type}</span>
                  <span className="resource-title">{resource.title}</span>
                  <span className="resource-arrow">→</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewReportPage;
