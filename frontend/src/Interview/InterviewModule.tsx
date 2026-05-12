import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { interviewApi } from './api';
import { useToastModal } from '../components/ui/toast-modal';
import type {
  Scene,
  JobType,
  DifficultyLevel,
  Interview,
  CreateInterviewDto,
  Resume,
  InterviewMode,
  ReportStatus,
} from './types';
import InterviewChat from './InterviewChat';
import InterviewReport from './InterviewReport';
import InterviewModeSelector from './InterviewModeSelector';
import VoiceInterview from './VoiceInterview';
import VideoInterview from './VideoInterview';
import { io, Socket } from 'socket.io-client';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import './Interview.scss';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

type ViewMode = 'list' | 'select' | 'chat' | 'voice' | 'video' | 'report';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  ariaLabel: string;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  value,
  onChange,
  options,
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (isOpen && optionsRef.current) {
      const selectedIdx = options.findIndex(opt => opt.value === value);
      if (selectedIdx >= 0) {
        setHighlightedIndex(selectedIdx);
      }
    }
  }, [isOpen, options, value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev < options.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : options.length - 1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          onChange(options[highlightedIndex].value);
          setIsOpen(false);
        }
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const dropdownId = useRef(`dropdown-${Math.random().toString(36).slice(2, 9)}`);

  return (
    <div className="filter-item">
      {label && <label id={`${dropdownId.current}-label`}>{label}</label>}
      <div 
        ref={dropdownRef}
        className={`custom-filter-dropdown ${isOpen ? 'open' : ''}`}
        onKeyDown={handleKeyDown}
      >
        <button
          type="button"
          className="dropdown-trigger"
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen ? 'true' : 'false'}
          aria-label={ariaLabel}
        >
          <span className="dropdown-value">{selectedOption?.label || '请选择'}</span>
          <svg 
            className="dropdown-arrow" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            width="14" 
            height="14"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        
        {isOpen && (
          <div 
            className="dropdown-menu" 
            role="listbox" 
            ref={optionsRef}
            aria-label={ariaLabel}
            aria-activedescendant={highlightedIndex >= 0 ? `${dropdownId.current}-option-${highlightedIndex}` : undefined}
          >
            <div className="dropdown-menu-inner">
              {options.map((option, index) => (
                <button
                  key={option.value}
                  id={`${dropdownId.current}-option-${index}`}
                  type="button"
                  className={`dropdown-option ${option.value === value ? 'selected' : ''} ${index === highlightedIndex ? 'highlighted' : ''}`}
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  role="option"
                  aria-selected={option.value === value ? 'true' : 'false'}
                >
                  <span className="option-label">{option.label}</span>
                  {option.value === value && (
                    <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="14" height="14">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

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

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const ClearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const BotIcon = ({ className }: { className?: string }) => (
<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
  const [callDuration, setCallDuration] = useState(initialElapsedTime);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callDurationRef = useRef(callDuration);

  // 使用通用音频播放 Hook（解决移动端自动播放限制）
  const { unlock: unlockAudio, playBlob: playOpeningBlob, stop: stopOpeningAudio } = useAudioPlayer({
    onPlayError: (err) => {
      console.warn('[VoiceInterviewLoader] 开场白音频播放失败:', err.message);
    },
  });

  // 开场白文本已就绪但尚未播放（等待用户交互解锁音频）
  const [openingReady, setOpeningReady] = useState(false);

  callDurationRef.current = callDuration;

  const startCallTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const playOpeningAudio = useCallback(async (text: string) => {
    console.log('[VoiceInterview] playOpeningAudio called, text:', text?.substring(0, 50));
    if (!text.trim()) {
      console.log('[VoiceInterview] text is empty, returning');
      return;
    }

    // 先解锁浏览器音频权限（必须在用户交互上下文中调用）
    unlockAudio();

    console.log('[VoiceInterview] Setting isPlayingOpening to true');
    setIsPlayingOpening(true);
    console.log('[VoiceInterview] isPlayingOpening set to true');
    
    try {
      console.log('[VoiceInterview] Calling textToSpeech...');
      const audioBlob = await interviewApi.textToSpeech(text, 'anna', 1.0);
      console.log('[VoiceInterview] textToSpeech completed, blob size:', audioBlob.size);
      await playOpeningBlob(audioBlob);
      console.log('[VoiceInterview] Audio play completed');
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
          startCallTimer();
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
        </div>
        <div className="voice-main">
          <div className="ai-avatar-section">
            <div className="ai-avatar">
              <BotIcon className="ai-avatar-svg" />
              <div className="ai-speaking-ring hidden" />
            </div>
            <div className="ai-label">AI 面试官</div>
            <div className="ai-waveform hidden">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="ai-wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
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
          <button
            className="main-mic-btn"
            disabled={true}
            title="麦克风"
            aria-label="麦克风"
          >
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

  // 开场白已就绪，需要用户点击才能开始（确保在用户手势上下文中解锁音频播放）
  if (openingReady && sessionId && !isPlayingOpening) {
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
        </div>
        <div className="voice-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div className="ai-avatar" style={{ margin: '0 auto 24px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="1.5" width="36" height="36" style={{ margin: 'auto' }}><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" strokeWidth="3" /><line x1="16" y1="16" x2="16" y2="16" strokeWidth="3" /></svg>
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
            <VolumeIcon />
            <span>静音</span>
          </button>
          <button className="main-mic-btn" disabled={true} title="麦克风">
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
        </div>
        <div className="voice-main">
          <div className="ai-avatar-section">
            <div className="ai-avatar">
              <BotIcon className="ai-avatar-svg" />
              <div className="ai-speaking-ring hidden" />
            </div>
            <div className="ai-label">AI 面试官</div>
            <div className="ai-waveform hidden">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="ai-wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
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
          <button
            className="main-mic-btn processing"
            disabled={true}
            title="麦克风"
            aria-label="麦克风"
          >
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

  return (
    <VoiceInterview
      interview={interview}
      sessionId={sessionId}
      onBack={onBack}
      initialDuration={callDuration}
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
  // session 就绪且文本收完后才渲染 VideoInterview
  // 注意：即使有 initialSessionId，也需要等待 SSE 流完成（包括 history 事件）
  const [sessionReady, setSessionReady] = useState(false);
  // 继续面试时从后端恢复的历史对话记录
  const [historyConversations, setHistoryConversations] = useState<Array<{ role: 'user' | 'assistant'; text: string; timestamp: Date }>>([]);

  const initialElapsedTimeRef = useRef(initialElapsedTime);

  useEffect(() => {
    // 无论是新建面试还是继续面试，都需要通过 SSE 获取开场白文本
    // 因为后端 startSession 会返回 firstMessage（即开场白）

    let tempSessionId: string | null = initialSessionId || null;
    let tempText = '';

    // 如果是继续面试，先设置 sessionId，但仍然需要获取开场白
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
          // 继续面试时，后端推送历史消息列表
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
          // 文本收完（或没有文本时），通知 VideoInterview 可以开始了
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

  // 错误状态
  if (startError) {
    return (
      <div className="video-interview-page">
        <div className="video-header">
          <button className="back-btn" onClick={onBack}>
            <ChevronLeftIcon /> 返回
          </button>
          <div className="video-header-info">
            <div className="video-title">{interview.title || interview.sceneName}</div>
            <div className="video-meta">{interview.jobName || '通用岗位'} · {interview.difficultyName}</div>
          </div>
        </div>
        <div className="video-main">
          <div className="video-container">
            <div className="error-state" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="40" height="40">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>启动面试失败：{startError}</p>
              <button className="start-btn" onClick={onBack}>返回重试</button>
            </div>
          </div>
        </div>
        <div className="video-controls">
          <button className="control-btn end-call-btn" onClick={onBack}>
            <PhoneOffIcon />
            <span>返回</span>
          </button>
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

  // 等待 session 建立中
  return (
    <div className="video-interview-page">
      <div className="video-header">
        <button className="back-btn" onClick={onBack}>
          <ChevronLeftIcon /> 返回
        </button>
        <div className="video-header-info">
          <div className="video-title">{interview.title || interview.sceneName}</div>
          <div className="video-meta">{interview.jobName || '通用岗位'} · {interview.difficultyName}</div>
        </div>
      </div>
      <div className="video-main">
        <div className="video-container">
          <div className="loading-state" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 }}>
            <div className="spinner" />
            <p>正在连接面试官...</p>
            {openingText && (
              <div className="opening-preview">{openingText}</div>
            )}
          </div>
        </div>
        <div className="video-status-label">正在连接面试官...</div>
      </div>
      <div className="video-controls">
        <button className="control-btn end-call-btn" disabled={true}>
          <PhoneOffIcon />
          <span>结束面试</span>
        </button>
      </div>
    </div>
  );
};

const InterviewModule: React.FC = () => {
  const navigate = useNavigate();
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
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([]);
  const [libraries, setLibraries] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [currentInterview, setCurrentInterview] = useState<Interview | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionElapsedTime, setCurrentSessionElapsedTime] = useState<number>(0);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);

  // 搜索和筛选状态
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterScene, setFilterScene] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<string>('all');
  const [filterJobType, setFilterJobType] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [isMobile, setIsMobile] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const subscribedInterviewIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      if (!mobile) {
        setFilterExpanded(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/knowledge-base/libraries`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success && data.data) {
          setLibraries(data.data);
        }
      } catch (libErr) {
        console.warn('加载知识库列表失败:', libErr);
        setLibraries([]);
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

  const getUserId = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const userId = getUserId();
    console.log('[WebSocket] useEffect triggered, userId:', userId, 'socketRef.current:', socketRef.current);
    
    if (!userId) {
      console.log('[WebSocket] No userId, skipping WebSocket connection');
      return;
    }

    if (socketRef.current) {
      console.log('[WebSocket] Socket already exists, skipping');
      return;
    }

    console.log('[WebSocket] Creating new socket connection to:', `${WS_URL}/interview-report`);
    const socket = io(`${WS_URL}/interview-report`, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WebSocket] Connected, socket id:', socket.id);
      const currentUserId = getUserId() || '';
      subscribedInterviewIdsRef.current.forEach((interviewId) => {
        console.log('[WebSocket] Re-subscribing to interview:', interviewId);
        socket.emit('join-interview', { interviewId, userId: currentUserId });
      });
    });

    socket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });

    socket.on('report-progress', (data: { interviewId: string; status: ReportStatus; message?: string }) => {
      console.log('[WebSocket] Received report-progress:', data);
      setInterviews((prev) =>
        prev.map((interview) =>
          interview.id === data.interviewId
            ? { ...interview, reportStatus: data.status }
            : interview
        )
      );
    });

    socket.on('report-complete', (data: { interviewId: string; reportId: string }) => {
      console.log('[WebSocket] Received report-complete:', data);
      setInterviews((prev) =>
        prev.map((interview) =>
          interview.id === data.interviewId
            ? { ...interview, reportStatus: 'completed' as ReportStatus }
            : interview
        )
      );
    });

    socket.on('report-error', (data: { interviewId: string; error: string }) => {
      console.log('[WebSocket] Received report-error:', data);
      setInterviews((prev) =>
        prev.map((interview) =>
          interview.id === data.interviewId
            ? { ...interview, reportStatus: 'failed' as ReportStatus }
            : interview
        )
      );
    });

    return () => {
      console.log('[WebSocket] Cleanup, disconnecting socket');
      const currentUserId = getUserId() || '';
      subscribedInterviewIdsRef.current.forEach((interviewId) => {
        socket.emit('leave-interview', { interviewId, userId: currentUserId });
      });
      socket.disconnect();
      socketRef.current = null;
      subscribedInterviewIdsRef.current.clear();
    };
  }, [getUserId]);

  useEffect(() => {
    const userId = getUserId();
    if (!userId) return;

    const generatingInterviews = interviews.filter(
      (interview) => interview.reportStatus === 'generating'
    );

    const socket = socketRef.current;
    console.log('[WebSocket] Interviews updated, generating count:', generatingInterviews.length, 'socket connected:', socket?.connected);

    generatingInterviews.forEach((interview) => {
      const isNew = !subscribedInterviewIdsRef.current.has(interview.id);
      if (isNew) {
        subscribedInterviewIdsRef.current.add(interview.id);
        console.log('[WebSocket] Subscribing to interview:', interview.id);
        if (socket && socket.connected) {
          socket.emit('join-interview', { interviewId: interview.id, userId });
        } else {
          console.log('[WebSocket] Socket not connected, will subscribe on connect');
        }
      }
    });
  }, [interviews, getUserId]);

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
        libraryIds: selectedLibraryIds.length > 0 ? selectedLibraryIds : undefined,
      };

      const interview = await interviewApi.createInterview(dto);
      navigate(`/interview/${interview.id}/${selectedMode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建面试失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExistingInterview = async (interview: Interview) => {
    navigate(`/interview/${interview.id}/${interview.mode}`);
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

  const handleBackToList = () => {
    setViewMode('list');
    setCurrentReportId(null);
    setSelectedMode('text');
    setCurrentInterview(null);
    setCurrentSessionId(null);
    setCurrentSessionElapsedTime(0);
    loadInitialData();
  };

  const toastModal = useToastModal();

  const handleDeleteInterview = async (interviewId: string) => {
    const confirmed = await toastModal.confirm(
      '删除后无法恢复，确定要删除这场面试吗？',
      '删除面试'
    );
    if (!confirmed) return;

    try {
      await interviewApi.deleteInterview(interviewId);
      setInterviews(interviews.filter((i) => i.id !== interviewId));
    } catch (err) {
      toastModal.error(err instanceof Error ? err.message : '删除面试失败', '删除失败');
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

  // 根据面试形式返回 SVG 图标
  const getModeIcon = (mode: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      // 文字对话：对话气泡
      text: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      // 语音通话：麦克风
      voice: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      ),
      // 视频面试：摄像头
      video: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      ),
    };
    // 默认：对话气泡
    return iconMap[mode] || iconMap.text;
  };

  // 过滤和搜索函数
  const filteredInterviews = interviews.filter((interview) => {
    // 按状态筛选
    if (filterStatus !== 'all' && interview.status !== filterStatus) {
      return false;
    }

    // 按场景筛选
    if (filterScene !== 'all' && interview.sceneType !== filterScene) {
      return false;
    }

    // 按面试形式筛选
    if (filterMode !== 'all' && interview.mode !== filterMode) {
      return false;
    }

    // 按岗位类型筛选
    if (filterJobType !== 'all' && (interview.jobType || '') !== filterJobType) {
      return false;
    }

    // 按难度筛选
    if (filterDifficulty !== 'all' && interview.difficulty !== filterDifficulty) {
      return false;
    }

    // 按搜索查询筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const title = (interview.title || interview.sceneName || '').toLowerCase();
      const jobName = (interview.jobName || '').toLowerCase();
      const sceneName = (interview.sceneName || '').toLowerCase();

      return title.includes(query) || jobName.includes(query) || sceneName.includes(query);
    }

    return true;
  });

  if (viewMode === 'chat' && currentInterview) {
    return (
      <InterviewChat
        key={currentSessionId || 'new'}
        interview={currentInterview}
        sessionId={currentSessionId}
        onBack={handleBackToList}
        initialElapsedTime={currentSessionElapsedTime}
        onElapsedTimeChange={setCurrentSessionElapsedTime}
      />
    );
  }

  if (viewMode === 'voice' && currentInterview) {
    return (
      <VoiceInterviewLoader
        key={currentSessionId || 'new'}
        interview={currentInterview}
        initialSessionId={currentSessionId}
        initialElapsedTime={currentSessionElapsedTime}
        onBack={handleBackToList}
        onSessionReady={setCurrentSessionId}
      />
    );
  }

  if (viewMode === 'video' && currentInterview) {
    return (
      <VideoInterviewLoader
        key={currentSessionId || 'new'}
        interview={currentInterview}
        initialSessionId={currentSessionId}
        initialElapsedTime={currentSessionElapsedTime}
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
            <FilterDropdown
              label=""
              value={selectedJobType}
              onChange={setSelectedJobType}
              options={jobTypes.map(jobType => ({ value: jobType.code, label: jobType.name }))}
              ariaLabel="选择岗位类型"
            />
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

          <div className="select-section">
            <h3>参照知识库（可选）</h3>
            <p className="section-hint">选择知识库后，面试问题将基于知识库内容生成</p>
            <div className="library-options">
              {libraries.length === 0 ? (
                <p className="no-resume-hint">
                  暂无知识库，请先在"知识库"模块创建知识库并上传文档
                </p>
              ) : (
                <div className="library-checkboxes">
                  {libraries.map((library) => (
                    <label key={library.id} className="library-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedLibraryIds.includes(library.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLibraryIds([...selectedLibraryIds, library.id]);
                          } else {
                            setSelectedLibraryIds(selectedLibraryIds.filter((id) => id !== library.id));
                          }
                        }}
                      />
                      <span className="library-name">{library.name}</span>
                      {library.description && (
                        <span className="library-desc">{library.description}</span>
                      )}
                    </label>
                  ))}
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
        <>
          {/* 搜索和筛选面板 */}
          <div className="interview-search-panel">
            <div className="search-bar">
              <SearchIcon />
              <input
                type="text"
                placeholder="搜索面试标题、岗位..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  className="clear-btn"
                  onClick={() => setSearchQuery('')}
                  title="清除搜索"
                >
                  <ClearIcon />
                </button>
              )}
            </div>

            {isMobile && (
              <button 
                className="filter-toggle-btn"
                onClick={() => setFilterExpanded(!filterExpanded)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                <span>{filterExpanded ? '收起筛选' : '展开筛选'}</span>
                <span className="toggle-indicator">
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    width="14" 
                    height="14"
                    style={{ transform: filterExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </button>
            )}

            <div className={`filter-group ${isMobile ? (filterExpanded ? 'filter-expanded' : 'filter-collapsed') : ''}`}>
              <FilterDropdown
                label="面试状态"
                value={filterStatus}
                onChange={setFilterStatus}
                ariaLabel="选择面试状态"
                options={[
                  { value: 'all', label: '全部' },
                  { value: 'pending', label: '待开始' },
                  { value: 'in_progress', label: '进行中' },
                  { value: 'completed', label: '已完成' },
                  { value: 'interrupted', label: '已中断' },
                  { value: 'abandoned', label: '已放弃' },
                ]}
              />

              <FilterDropdown
                label="面试场景"
                value={filterScene}
                onChange={setFilterScene}
                ariaLabel="选择面试场景"
                options={[
                  { value: 'all', label: '全部' },
                  ...scenes.map(scene => ({ value: scene.code, label: scene.name })),
                ]}
              />

              <FilterDropdown
                label="面试形式"
                value={filterMode}
                onChange={setFilterMode}
                ariaLabel="选择面试形式"
                options={[
                  { value: 'all', label: '全部' },
                  { value: 'text', label: '文本面试' },
                  { value: 'voice', label: '语音面试' },
                  { value: 'video', label: '视频面试' },
                ]}
              />

              <FilterDropdown
                label="岗位类型"
                value={filterJobType}
                onChange={setFilterJobType}
                ariaLabel="选择岗位类型"
                options={[
                  { value: 'all', label: '全部' },
                  ...jobTypes.map(jobType => ({ value: jobType.code, label: jobType.name })),
                ]}
              />

              <FilterDropdown
                label="难度等级"
                value={filterDifficulty}
                onChange={setFilterDifficulty}
                ariaLabel="选择难度等级"
                options={[
                  { value: 'all', label: '全部' },
                  ...difficultyLevels.map(level => ({ value: level.code, label: level.name })),
                ]}
              />
            </div>
          </div>

          {/* 搜索结果统计 */}
          {(searchQuery || filterStatus !== 'all' || filterScene !== 'all' || filterMode !== 'all' || filterJobType !== 'all' || filterDifficulty !== 'all') && (
            <div className="search-results-info">
              找到 <strong>{filteredInterviews.length}</strong> 条结果
              {(searchQuery || filterStatus !== 'all' || filterScene !== 'all' || filterMode !== 'all' || filterJobType !== 'all' || filterDifficulty !== 'all') && (
                <button 
                  className="clear-filters-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('all');
                    setFilterScene('all');
                    setFilterMode('all');
                    setFilterJobType('all');
                    setFilterDifficulty('all');
                  }}
                >
                  清除全部筛选
                </button>
              )}
            </div>
          )}

          {/* 面试列表 */}
          {filteredInterviews.length === 0 ? (
            <div className="empty-search-state">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="40" height="40">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <h3>没有找到匹配的面试</h3>
              <p>试试调整搜索条件或筛选条件</p>
            </div>
          ) : (
            <div className="interview-list">
              {filteredInterviews.map((interview) => (
                <div key={interview.id} className="interview-card">
                  <div className="card-header">
                    <div className="card-title">
                      <span className="scene-icon">
                        {getModeIcon(interview.mode)}
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
                    <span className="create-time">{formatDate(interview.startedAt || interview.createdAt)}</span>
                    <div className="card-actions">
                      {interview.status === 'in_progress' && (
                        <button
                          className="action-btn resume"
                          onClick={() => handleStartExistingInterview(interview)}
                        >
                          继续面试
                        </button>
                      )}
                      {interview.status === 'completed' && (
                        <button
                          className={`action-btn report ${interview.reportStatus === 'generating' ? 'generating' : ''}`}
                          onClick={() => handleViewReport(interview)}
                          disabled={interview.reportStatus === 'generating' || interview.reportStatus === 'pending' || interview.reportStatus === 'failed'}
                        >
                          {interview.reportStatus === 'generating' || interview.reportStatus === 'pending' ? (
                            <>
                              <span className="btn-spinner-small" />
                              报告生成中
                            </>
                          ) : interview.reportStatus === 'failed' ? (
                            '报告生成失败'
                          ) : (
                            '查看报告'
                          )}
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
        </>
      )}
    </div>
  );
};

export default InterviewModule;
