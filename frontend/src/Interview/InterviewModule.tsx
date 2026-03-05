import React, { useState, useEffect, useCallback, useRef } from 'react';
import { interviewApi } from './api';
import type {
  Scene,
  JobType,
  DifficultyLevel,
  Interview,
  CreateInterviewDto,
  Resume,
  InterviewMode,
} from './types';
import InterviewChat from './InterviewChat';
import InterviewReport from './InterviewReport';
import InterviewModeSelector from './InterviewModeSelector';
import VoiceInterview from './VoiceInterview';
import './Interview.scss';

type ViewMode = 'list' | 'select' | 'chat' | 'voice' | 'report';

// SVG 图标组件
const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const BotIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" />
    <line x1="8" y1="16" x2="8" y2="16" strokeWidth="3" />
    <line x1="16" y1="16" x2="16" y2="16" strokeWidth="3" />
  </svg>
);

const PhoneOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.26 9.91 19.79 19.79 0 0 1 1.2 1.28 2 2 0 0 1 3.22.0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.2 7.91" />
    <line x1="23" y1="1" x2="1" y2="23" />
  </svg>
);

const VolumeIcon = ({ muted }: { muted?: boolean }) => (
  muted ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  )
);

const MicBtnIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

/**
 * 语音面试加载器：负责启动会话，然后渲染 VoiceInterview 组件
 */
interface VoiceInterviewLoaderProps {
  interview: Interview;
  initialSessionId: string | null;
  initialElapsedTime?: number;
  onEnd: (reportId: string) => void;
  onBack: () => void;
  onSessionReady: (sessionId: string) => void;
}

const VoiceInterviewLoader: React.FC<VoiceInterviewLoaderProps> = ({
  interview,
  initialSessionId,
  initialElapsedTime = 0,
  onEnd,
  onBack,
  onSessionReady,
}) => {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [openingText, setOpeningText] = useState('');
  const [isPlayingOpening, setIsPlayingOpening] = useState(false);
  const [callDuration, setCallDuration] = useState(initialElapsedTime);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const playOpeningAudio = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsPlayingOpening(true);
    try {
      const audioBlob = await interviewApi.textToSpeech(text, 'anna', 1.0);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlayingOpening(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsPlayingOpening(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (err) {
      console.error('播放开场白失败:', err);
      setIsPlayingOpening(false);
    }
  }, []);

  useEffect(() => {
    if (sessionId) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }

    setIsStarting(true);
    let tempSessionId: string | null = null;
    let tempText = '';

    const control = interviewApi.startInterviewStream(
      interview.id,
      (event) => {
        if (event.type === 'session') {
          tempSessionId = event.data.sessionId as string;
          timerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        } else if (event.type === 'chunk') {
          tempText += event.data as string;
          setOpeningText(tempText);
        } else if (event.type === 'done') {
          if (tempSessionId) {
            setSessionId(tempSessionId);
            onSessionReady(tempSessionId);
          }
          setIsStarting(false);
          if (tempText.trim()) {
            playOpeningAudio(tempText);
          }
        } else if (event.type === 'error') {
          setStartError((event.data?.message as string) || '启动面试失败');
          setIsStarting(false);
        }
      },
      (err) => {
        setStartError(err.message);
        setIsStarting(false);
      },
    );

    return () => {
      control.abort();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (startError) {
    return (
      <div className="voice-interview-page">
        <div className="voice-header">
          <button className="back-btn" onClick={onBack}>
            <ChevronLeftIcon /> 返回
          </button>
          <div className="voice-header-info">
            <div className="voice-title">{interview.title || interview.sceneName}</div>
            <div className="voice-meta">
              {interview.jobName || '通用岗位'} · {interview.difficultyName}
            </div>
          </div>
          <div className="voice-duration">{formatDuration(callDuration)}</div>
        </div>
        <div className="voice-main">
          <div className="ai-avatar-section">
            <div className="ai-avatar">
              <BotIcon />
            </div>
            <div className="ai-label">AI 面试官</div>
          </div>
          <div className="subtitles-area">
            <div className="no-subtitles">
              <div className="error-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p>启动面试失败：{startError}</p>
              <button className="start-btn" onClick={onBack}>返回重试</button>
            </div>
          </div>
          <div className="voice-status-label">启动失败</div>
        </div>
        <div className="voice-controls">
          <button className="control-btn mute-btn" disabled={true}>
            <VolumeIcon />
            <span>静音</span>
          </button>
          <button className="main-mic-btn" disabled={true}>
            <MicBtnIcon />
          </button>
          <button className="control-btn end-call-btn" onClick={onBack}>
            <PhoneOffIcon />
            <span>返回</span>
          </button>
        </div>
      </div>
    );
  }

  if (isStarting || !sessionId) {
    return (
      <div className="voice-interview-page">
        <div className="voice-header">
          <button className="back-btn" onClick={onBack}>
            <ChevronLeftIcon /> 返回
          </button>
          <div className="voice-header-info">
            <div className="voice-title">{interview.title || interview.sceneName}</div>
            <div className="voice-meta">
              {interview.jobName || '通用岗位'} · {interview.difficultyName}
            </div>
          </div>
          <div className="voice-duration">{formatDuration(callDuration)}</div>
        </div>
        <div className="voice-main">
          <div className="ai-avatar-section">
            <div className="ai-avatar">
              <BotIcon />
            </div>
            <div className="ai-label">AI 面试官</div>
          </div>
          <div className="subtitles-area">
            <div className="no-subtitles">
              <p>正在连接面试官...</p>
              {openingText && (
                <div className="opening-preview">{openingText}</div>
              )}
            </div>
          </div>
          <div className="voice-status-label">正在连接面试官...</div>
        </div>
        <div className="voice-controls">
          <button className="control-btn mute-btn" disabled={true}>
            <VolumeIcon />
            <span>静音</span>
          </button>
          <button className="main-mic-btn processing" disabled={true}>
            <span className="btn-spinner" />
          </button>
          <button className="control-btn end-call-btn" disabled={true}>
            <PhoneOffIcon />
            <span>结束面试</span>
          </button>
        </div>
      </div>
    );
  }

  if (isPlayingOpening) {
    return (
      <div className="voice-interview-page">
        <div className="voice-header">
          <button className="back-btn" onClick={onBack}>
            <ChevronLeftIcon /> 返回
          </button>
          <div className="voice-header-info">
            <div className="voice-title">{interview.title || interview.sceneName}</div>
            <div className="voice-meta">
              {interview.jobName || '通用岗位'} · {interview.difficultyName}
            </div>
          </div>
          <div className="voice-duration">{formatDuration(callDuration)}</div>
        </div>
        <div className="voice-main">
          <div className={`ai-avatar-section ${isPlayingOpening ? 'speaking' : ''}`}>
            <div className="ai-avatar">
              <BotIcon />
              {isPlayingOpening && <div className="ai-speaking-ring" />}
            </div>
            <div className="ai-label">AI 面试官</div>
            {isPlayingOpening && (
              <div className="ai-waveform">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="ai-wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            )}
          </div>
          <div className="subtitles-area">
            <div className="current-subtitle">{openingText}</div>
          </div>
          <div className="voice-status-label">面试官正在说话...</div>
        </div>
        <div className="voice-controls">
          <button className="control-btn mute-btn" disabled={true}>
            <VolumeIcon />
            <span>静音</span>
          </button>
          <button className="main-mic-btn" disabled={true}>
            <MicBtnIcon />
          </button>
          <button className="control-btn end-call-btn" disabled={true}>
            <PhoneOffIcon />
            <span>结束面试</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <VoiceInterview
      interview={interview}
      sessionId={sessionId}
      onEnd={onEnd}
      onBack={onBack}
      initialDuration={callDuration}
    />
  );
};

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
  const [selectedMode, setSelectedMode] = useState<InterviewMode>('text');
  const [currentInterview, setCurrentInterview] = useState<Interview | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionElapsedTime, setCurrentSessionElapsedTime] = useState<number>(0);
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
    setCurrentInterview(null);
    setCurrentSessionId(null);
    setCurrentSessionElapsedTime(0);
    setCurrentReportId(null);
    setViewMode('select');
    setSelectedScene('');
    setSelectedJobType('general');
    setSelectedDifficulty('medium');
    setSelectedResumeId('');
    setUseResume(false);
    setSelectedMode('text');
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
        mode: selectedMode,
      };

      const interview = await interviewApi.createInterview(dto);
      setCurrentInterview(interview);
      if (selectedMode === 'voice') {
        setViewMode('voice');
      } else {
        setViewMode('chat');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建面试失败');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeInterview = async (interview: Interview) => {
    try {
      setLoading(true);
      setError(null);

      if (currentInterview?.id === interview.id && currentSessionId) {
        if (interview.mode === 'voice') {
          setViewMode('voice');
        } else {
          setViewMode('chat');
        }
        setLoading(false);
        return;
      }

      const data = await interviewApi.getInterview(interview.id);
      setCurrentInterview(data.interview);

      const activeSession = data.sessions.find((s) => s.status === 'active');
      if (activeSession) {
        setCurrentSessionId(activeSession.id);
        setCurrentSessionElapsedTime(activeSession.elapsedTime || 0);
      } else {
        setCurrentSessionId(null);
        setCurrentSessionElapsedTime(0);
      }

      if (data.interview.mode === 'voice') {
        setViewMode('voice');
      } else {
        setViewMode('chat');
      }
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
    setCurrentReportId(null);
    setSelectedMode('text');
    loadInitialData();
  };

  const handleVoiceChatEnd = (reportId: string) => {
    setCurrentReportId(reportId);
    setViewMode('report');
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

  // 根据场景类型返回 SVG 图标
  const getSceneSvgIcon = (sceneType: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      technical: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      ),
      behavioral: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      system_design: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    };
    return iconMap[sceneType] || (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    );
  };

  if (viewMode === 'chat' && currentInterview) {
    return (
      <InterviewChat
        interview={currentInterview}
        sessionId={currentSessionId}
        onEnd={handleChatEnd}
        onBack={handleBackToList}
        initialElapsedTime={currentSessionElapsedTime}
        onElapsedTimeChange={setCurrentSessionElapsedTime}
      />
    );
  }

  if (viewMode === 'voice' && currentInterview) {
    return (
      <VoiceInterviewLoader
        interview={currentInterview}
        initialSessionId={currentSessionId}
        initialElapsedTime={currentSessionElapsedTime}
        onEnd={handleVoiceChatEnd}
        onBack={handleBackToList}
        onSessionReady={setCurrentSessionId}
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
            <ChevronLeftIcon /> 返回
          </button>
          <h2>选择面试场景</h2>
        </div>

        {error && <div className="error-message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>}

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
            <h3>面试形式</h3>
            <InterviewModeSelector
              value={selectedMode}
              onChange={setSelectedMode}
            />
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
          <PlusIcon /> 开始新面试
        </button>
      </div>

      {error && <div className="error-message">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {error}
      </div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          加载中...
        </div>
      ) : interviews.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <MicIcon />
          </div>
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
                    {getSceneSvgIcon(interview.sceneType)}
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
