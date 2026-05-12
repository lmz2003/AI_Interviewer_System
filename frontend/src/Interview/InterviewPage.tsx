import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewApi } from './api';
import type { Interview } from './types';
import InterviewChat from './InterviewChat';
import VoiceInterview from './VoiceInterview';
import VideoInterview from './VideoInterview';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import './Interview.scss';

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
  const { playBlob: playOpeningBlob, stop: stopOpeningAudio } = useAudioPlayer({
    onPlayError: (err) => {
      console.warn('[VoiceInterviewLoader/Page] 开场白音频播放失败:', err.message);
    },
  });

  const playOpeningAudio = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsPlayingOpening(true);
    
    try {
      const audioBlob = await interviewApi.textToSpeech(text, 'anna', 1.0);
      await playOpeningBlob(audioBlob);
      setIsPlayingOpening(false);
    } catch (err) {
      console.error('[VoiceInterview] 播放开场白失败:', err);
      setIsPlayingOpening(false);
    }
  }, [playOpeningBlob]);

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
