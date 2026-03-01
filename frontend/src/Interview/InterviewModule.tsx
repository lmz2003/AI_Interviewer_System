import React, { useState, useEffect, useCallback } from 'react';
import { interviewApi } from './api';
import type {
  Scene,
  JobType,
  DifficultyLevel,
  Interview,
  CreateInterviewDto,
  Resume,
} from './types';
import InterviewChat from './InterviewChat';
import InterviewReport from './InterviewReport';
import './Interview.scss';

type ViewMode = 'list' | 'select' | 'chat' | 'report';

const InterviewModule: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [difficultyLevels, setDifficultyLevels] = useState<DifficultyLevel[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedScene, setSelectedScene] = useState<string>('');
  const [selectedJobType, setSelectedJobType] = useState<string>('general');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('medium');
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [useResume, setUseResume] = useState(false);
  const [currentInterview, setCurrentInterview] = useState<Interview | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [scenesData, jobTypesData, difficultyData, interviewsData] = await Promise.all([
        interviewApi.getScenes(),
        interviewApi.getJobTypes(),
        interviewApi.getDifficultyLevels(),
        interviewApi.getInterviewList(),
      ]);
      setScenes(scenesData);
      setJobTypes(jobTypesData);
      setDifficultyLevels(difficultyData);
      setInterviews(interviewsData);
      
      // 单独加载简历列表，失败不影响其他功能
      try {
        const resumesData = await interviewApi.getResumes();
        setResumes(resumesData);
      } catch (resumeErr) {
        console.warn('加载简历列表失败:', resumeErr);
        setResumes([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleStartNewInterview = () => {
    setViewMode('select');
    setSelectedScene('');
    setSelectedJobType('general');
    setSelectedDifficulty('medium');
    setSelectedResumeId('');
    setUseResume(false);
  };

  const handleSceneSelect = (sceneCode: string) => {
    setSelectedScene(sceneCode);
  };

  const handleCreateInterview = async () => {
    if (!selectedScene) {
      setError('请选择面试场景');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const dto: CreateInterviewDto = {
        sceneType: selectedScene,
        jobType: selectedJobType,
        difficulty: selectedDifficulty,
        resumeId: useResume && selectedResumeId ? selectedResumeId : undefined,
      };

      const interview = await interviewApi.createInterview(dto);
      setCurrentInterview(interview);
      setViewMode('chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建面试失败');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeInterview = async (interview: Interview) => {
    try {
      setLoading(true);
      const data = await interviewApi.getInterview(interview.id);
      setCurrentInterview(data.interview);

      const activeSession = data.sessions.find((s) => s.status === 'active');
      if (activeSession) {
        setCurrentSessionId(activeSession.id);
      }

      setViewMode('chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : '恢复面试失败');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = async (interview: Interview) => {
    try {
      setLoading(true);
      const report = await interviewApi.getInterviewReport(interview.id);
      setCurrentReportId(report.id);
      setCurrentInterview(interview);
      setViewMode('report');
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取报告失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChatEnd = (reportId: string) => {
    setCurrentReportId(reportId);
    setViewMode('report');
    loadInitialData();
  };

  const handleBackToList = () => {
    setViewMode('list');
    setCurrentInterview(null);
    setCurrentSessionId(null);
    setCurrentReportId(null);
    loadInitialData();
  };

  const handleDeleteInterview = async (interviewId: string) => {
    if (!confirm('确定要删除这场面试吗？')) return;

    try {
      await interviewApi.deleteInterview(interviewId);
      setInterviews(interviews.filter((i) => i.id !== interviewId));
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除面试失败');
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}分${secs}秒`;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: '待开始', className: 'status-pending' },
      in_progress: { label: '进行中', className: 'status-active' },
      completed: { label: '已完成', className: 'status-completed' },
      interrupted: { label: '已中断', className: 'status-interrupted' },
      abandoned: { label: '已放弃', className: 'status-abandoned' },
    };
    const statusInfo = statusMap[status] || { label: status, className: '' };
    return <span className={`status-badge ${statusInfo.className}`}>{statusInfo.label}</span>;
  };

  if (viewMode === 'chat' && currentInterview) {
    return (
      <InterviewChat
        interview={currentInterview}
        sessionId={currentSessionId}
        onEnd={handleChatEnd}
        onBack={handleBackToList}
      />
    );
  }

  if (viewMode === 'report' && currentReportId) {
    return (
      <InterviewReport
        reportId={currentReportId}
        interview={currentInterview}
        onBack={handleBackToList}
      />
    );
  }

  if (viewMode === 'select') {
    return (
      <div className="interview-select-page">
        <div className="select-header">
          <button className="back-btn" onClick={() => setViewMode('list')}>
            ← 返回
          </button>
          <h2>选择面试场景</h2>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="select-content">
          <div className="select-section">
            <h3>面试场景</h3>
            <div className="scene-grid">
              {scenes.map((scene) => (
                <div
                  key={scene.code}
                  className={`scene-card ${selectedScene === scene.code ? 'selected' : ''}`}
                  onClick={() => handleSceneSelect(scene.code)}
                >
                  <div className="scene-icon">{scene.icon}</div>
                  <div className="scene-info">
                    <h4>{scene.name}</h4>
                    <p>{scene.description}</p>
                    <span className="question-count">
                      {scene.questionCount.min}-{scene.questionCount.max} 题
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="select-section">
            <h3>岗位类型</h3>
            <div className="job-type-select">
              <select
                aria-label="选择岗位类型"
                title="选择岗位类型"
                value={selectedJobType}
                onChange={(e) => setSelectedJobType(e.target.value)}
              >
                {jobTypes.map((jobType) => (
                  <option key={jobType.code} value={jobType.code}>
                    {jobType.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="select-section">
            <h3>难度等级</h3>
            <div className="difficulty-options">
              {difficultyLevels.map((level) => (
                <div
                  key={level.code}
                  className={`difficulty-option ${selectedDifficulty === level.code ? 'selected' : ''}`}
                  onClick={() => setSelectedDifficulty(level.code)}
                >
                  <span className="difficulty-name">{level.name}</span>
                  <span className="difficulty-desc">{level.description}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="select-section">
            <h3>关联简历（可选）</h3>
            <div className="resume-options">
              <label className="resume-toggle">
                <input
                  type="checkbox"
                  checked={useResume}
                  onChange={(e) => {
                    setUseResume(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedResumeId('');
                    }
                  }}
                />
                <span>使用我的简历生成个性化问题</span>
              </label>
              {useResume && (
                <div className="resume-select-wrapper">
                  {resumes.length === 0 ? (
                    <p className="no-resume-hint">
                      暂无已上传的简历，请先在"简历分析"模块上传简历
                    </p>
                  ) : (
                    <select
                      className="resume-select"
                      value={selectedResumeId}
                      onChange={(e) => setSelectedResumeId(e.target.value)}
                      aria-label="选择简历"
                    >
                      <option value="">请选择简历</option>
                      {resumes.map((resume) => (
                        <option key={resume.id} value={resume.id}>
                          {resume.title || resume.fileName || '未命名简历'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="select-actions">
            <button
              className="start-btn"
              onClick={handleCreateInterview}
              disabled={!selectedScene || loading}
            >
              {loading ? '创建中...' : '开始面试'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="interview-list-page">
      <div className="list-header">
        <h2>模拟面试</h2>
        <button className="new-interview-btn" onClick={handleStartNewInterview}>
          + 开始新面试
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-state">加载中...</div>
      ) : interviews.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎤</div>
          <h3>还没有面试记录</h3>
          <p>开始你的第一次模拟面试，提升面试技巧</p>
          <button className="start-btn" onClick={handleStartNewInterview}>
            开始面试
          </button>
        </div>
      ) : (
        <div className="interview-list">
          {interviews.map((interview) => (
            <div key={interview.id} className="interview-card">
              <div className="card-header">
                <div className="card-title">
                  <span className="scene-icon">
                    {scenes.find((s) => s.code === interview.sceneType)?.icon || '🎤'}
                  </span>
                  <h3>{interview.title || interview.sceneName}</h3>
                </div>
                {getStatusBadge(interview.status)}
              </div>

              <div className="card-body">
                <div className="card-info">
                  <span className="info-item">
                    <label>岗位：</label>
                    {interview.jobName || '通用岗位'}
                  </span>
                  <span className="info-item">
                    <label>难度：</label>
                    {interview.difficultyName}
                  </span>
                </div>
                <div className="card-stats">
                  {interview.totalScore !== undefined && interview.totalScore !== null && (
                    <span className="score">
                      得分：<strong>{interview.totalScore.toFixed(1)}</strong>
                    </span>
                  )}
                  {interview.duration && (
                    <span className="duration">时长：{formatDuration(interview.duration)}</span>
                  )}
                </div>
              </div>

              <div className="card-footer">
                <span className="create-time">{formatDate(interview.createdAt)}</span>
                <div className="card-actions">
                  {interview.status === 'in_progress' && (
                    <button
                      className="action-btn resume"
                      onClick={() => handleResumeInterview(interview)}
                    >
                      继续面试
                    </button>
                  )}
                  {interview.status === 'completed' && (
                    <button
                      className="action-btn report"
                      onClick={() => handleViewReport(interview)}
                    >
                      查看报告
                    </button>
                  )}
                  {(interview.status === 'pending' || interview.status === 'completed') && (
                    <button
                      className="action-btn restart"
                      onClick={() => handleResumeInterview(interview)}
                    >
                      重新开始
                    </button>
                  )}
                  <button
                    className="action-btn delete"
                    onClick={() => handleDeleteInterview(interview.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InterviewModule;
