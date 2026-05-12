import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewApi } from './api';
import type { Interview } from './types';
import InterviewChat from './InterviewChat';
import VoiceInterview from './VoiceInterview';
import VideoInterview from './VideoInterview';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import './Interview.scss';

// ---- SVG Icons ----
const PhoneOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/>
    <line x1="23" y1="1" x2="1" y2="23"/>
  </svg>
);

interface VoiceInterviewLoaderProps {
  interview: Interview;
  initialSessionId: string | null;
  initialElapsedTime?: number;
  onBack: () => void;
  onSessionReady: (sessionId: string) => void;
}

const VoiceInterviewLoader: React.FC<VoiceInterviewLoaderProps> = ({
  interview,
  initialSessionId,
  initialElapsedTime = 0,
  onBack,
  onSessionReady,
}) => {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [openingText, setOpeningText] = useState('');
  const [isPlayingOpening, setIsPlayingOpening] = useState(false);

  // 使用通用音频播放 Hook（解决移动端自动播放限制）
  const { unlock: unlockAudio, playBlob: playOpeningBlob, stop: stopOpeningAudio } = useAudioPlayer({
    onPlayError: (err) => {
      console.warn('[VoiceInterviewLoader/Page] 开场白音频播放失败:', err.message);
    },
  });

  // 开场白文本已就绪但尚未播放（等待用户交互解锁音频）
  const [openingReady, setOpeningReady] = useState(false);

  const playOpeningAudio = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // 先解锁浏览器音频权限（必须在用户交互上下文中调用）
    unlockAudio();

    setIsPlayingOpening(true);
    
    try {
      const audioBlob = await interviewApi.textToSpeech(text, 'anna', 1.0);
      await playOpeningBlob(audioBlob);
      setIsPlayingOpening(false);
    } catch (err) {
      console.error('[VoiceInterview] 播放开场白失败:', err);
      setIsPlayingOpening(false);
    }
  }, [playOpeningBlob, unlockAudio]);

  useEffect(() => {
    if (sessionId) return;

    setIsStarting(true);
    let tempSessionId: string | null = null;
    let tempText = '';

    const control = interviewApi.startInterviewStream(
      interview.id,
      (event) => {
        if (event.type === 'session') {
          tempSessionId = event.data.sessionId as string;
        } else if (event.type === 'chunk') {
          tempText += event.data as string;
          setOpeningText(tempText);
        } else if (event.type === 'done') {
          setIsStarting(false);
          onSessionReady(tempSessionId || '');
          setSessionId(tempSessionId);
          if (tempText.trim()) {
            // 不直接播放，而是标记为就绪，等用户点击后再播放（解决移动端自动播放限制）
            setOpeningReady(true);
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
      stopOpeningAudio();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (startError) {
    return (
      <div className="voice-interview-page">
        <div className="interview-modal-overlay">
          <div className="interview-modal error-modal">
            <div className="modal-icon error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3>启动面试失败</h3>
            <p>{startError}</p>
            <button className="modal-btn" onClick={onBack}>返回重试</button>
          </div>
        </div>
      </div>
    );
  }

  // 开场白已就绪，需要用户点击才能开始（确保在用户手势上下文中解锁音频播放）
  if (openingReady && sessionId && !isPlayingOpening) {
    return (
      <div className="voice-interview-page">
        <div className="voice-header">
          <button className="back-btn" onClick={onBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="15 18 9 12 15 6" /></svg>
            返回
          </button>
          <div className="voice-header-info">
            <div className="voice-title">{interview.title || interview.sceneName}</div>
            <div className="voice-meta">{interview.jobName || '通用岗位'} · {interview.difficultyName}</div>
          </div>
        </div>
        <div className="voice-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div className="ai-avatar" style={{ margin: '0 auto 24px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="1.5" width="36" height="36"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" strokeWidth="3" /><line x1="16" y1="16" x2="16" y2="16" strokeWidth="3" /></svg>
            </div>
            <h3 style={{ color: 'white', fontSize: '18px', marginBottom: '8px', marginTop: 0 }}>面试官已就绪</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: '0 0 28px' }}>点击下方按钮开始语音面试</p>
            <button
              onClick={() => playOpeningAudio(openingText)}
              style={{
                padding: '14px 32px',
                borderRadius: '999px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              🎙️ 开始面试
            </button>
          </div>
        </div>
        <div className="voice-controls">
          <button className="control-btn mute-btn" disabled={true}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
            <span>静音</span>
          </button>
          <button className="main-mic-btn" disabled={true} title="麦克风">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
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
        <div className="interview-modal-overlay">
          <div className="interview-modal connecting-modal">
            <div className="modal-icon spinning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <h3>正在连接面试官...</h3>
            <p>请稍候，AI面试官正在准备面试问题</p>
            {openingText && (
              <div className="opening-preview">{openingText}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <VoiceInterview
      interview={interview}
      sessionId={sessionId}
      onBack={onBack}
      initialDuration={initialElapsedTime}
      openingMessage={openingText}
      isPlayingOpening={isPlayingOpening}
    />
  );
};

interface VideoInterviewLoaderProps {
  interview: Interview;
  initialSessionId: string | null;
  initialElapsedTime?: number;
  onBack: () => void;
  onSessionReady: (sessionId: string) => void;
}

const VideoInterviewLoader: React.FC<VideoInterviewLoaderProps> = ({
  interview,
  initialSessionId,
  initialElapsedTime = 0,
  onBack,
  onSessionReady,
}) => {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [startError, setStartError] = useState<string | null>(null);
  const [openingText, setOpeningText] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [historyConversations, setHistoryConversations] = useState<Array<{ role: 'user' | 'assistant'; text: string; timestamp: Date }>>([]);

  const initialElapsedTimeRef = useRef(initialElapsedTime);

  useEffect(() => {
    let tempSessionId: string | null = initialSessionId || null;
    let tempText = '';

    if (initialSessionId) {
      setSessionId(initialSessionId);
      onSessionReady(initialSessionId);
    }

    const control = interviewApi.startInterviewStream(
      interview.id,
      (event) => {
        if (event.type === 'session') {
          tempSessionId = event.data.sessionId as string;
          setSessionId(tempSessionId);
          onSessionReady(tempSessionId);
        } else if (event.type === 'history') {
          const msgs = event.data as Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>;
          const converted = msgs.map((m) => ({
            role: m.role,
            text: m.content,
            timestamp: new Date(m.timestamp),
          }));
          setHistoryConversations(converted);
        } else if (event.type === 'chunk') {
          tempText += event.data as string;
          setOpeningText(tempText);
        } else if (event.type === 'done') {
          setSessionReady(true);
        } else if (event.type === 'error') {
          setStartError((event.data?.message as string) || '启动面试失败');
        }
      },
      (err) => {
        setStartError(err.message);
      },
    );

    return () => { control.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (startError) {
    return (
      <div className="video-interview-page">
        <div className="interview-modal-overlay">
          <div className="interview-modal error-modal">
            <div className="modal-icon error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3>启动面试失败</h3>
            <p>{startError}</p>
            <button className="modal-btn" onClick={onBack}>返回重试</button>
          </div>
        </div>
      </div>
    );
  }

  if (sessionReady && sessionId) {
    const isResuming = historyConversations.length > 0;
    return (
      <VideoInterview
        interview={interview}
        sessionId={sessionId}
        openingText={isResuming ? '' : openingText}
        onBack={onBack}
        initialDuration={initialElapsedTimeRef.current}
        initialConversations={isResuming ? historyConversations : undefined}
      />
    );
  }

  return (
    <div className="video-interview-page">
      <div className="interview-modal-overlay">
        <div className="interview-modal connecting-modal">
          <div className="modal-icon spinning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <h3>正在连接面试官...</h3>
          <p>请稍候，AI面试官正在准备面试问题</p>
          {openingText && (
            <div className="opening-preview">{openingText}</div>
          )}
        </div>
      </div>
    </div>
  );
};

const InterviewPage: React.FC = () => {
  const { interviewId, mode } = useParams<{ interviewId: string; mode: string }>();
  const navigate = useNavigate();

  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInterview = async () => {
      if (!interviewId) {
        setError('面试ID不存在');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await interviewApi.getInterview(interviewId);
        setInterview(data.interview);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载面试失败');
      } finally {
        setLoading(false);
      }
    };

    loadInterview();
  }, [interviewId]);

  const handleBack = useCallback(() => {
    navigate('/dashboard/interview');
  }, [navigate]);

  if (loading) {
    return (
      <div className="interview-page-wrapper">
        <div className="interview-page-loading">
          <div className="spinner" />
          <p>加载面试中...</p>
        </div>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="interview-page-wrapper">
        <div className="interview-page-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p>{error || '面试不存在'}</p>
          <button className="back-to-list-btn" onClick={handleBack}>
            返回面试列表
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'text') {
    return (
      <div className="interview-page-wrapper">
        <InterviewChat
          interview={interview}
          sessionId={null}
          onBack={handleBack}
        />
      </div>
    );
  }

  if (mode === 'voice') {
    return (
      <div className="interview-page-wrapper">
        <VoiceInterviewLoader
          interview={interview}
          initialSessionId={null}
          initialElapsedTime={0}
          onBack={handleBack}
          onSessionReady={() => {}}
        />
      </div>
    );
  }

  if (mode === 'video') {
    return (
      <div className="interview-page-wrapper">
        <VideoInterviewLoader
          interview={interview}
          initialSessionId={null}
          initialElapsedTime={0}
          onBack={handleBack}
          onSessionReady={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="interview-page-wrapper">
      <div className="interview-page-error">
        <p>未知的面试模式：{mode}</p>
        <button className="back-to-list-btn" onClick={handleBack}>
          返回面试列表
        </button>
      </div>
    </div>
  );
};

export default InterviewPage;
