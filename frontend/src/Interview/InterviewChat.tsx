import React, { useState, useEffect, useRef, useCallback } from 'react';
import { interviewApi } from './api';
import type { Interview, InterviewMessage, SSEEvent } from './types';
import VoiceInput from './VoiceInput';
import InterviewPaused from './InterviewPaused';
import { useToastModal } from '@/components/ui/toast-modal';
import './Interview.scss';

// SVG 图标
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const BotIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" />
    <line x1="8" y1="16" x2="8" y2="16" strokeWidth="3" />
    <line x1="16" y1="16" x2="16" y2="16" strokeWidth="3" />
  </svg>
);

const MicReadyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

interface InterviewChatProps {
  interview: Interview;
  sessionId: string | null;
  onBack: () => void;
  initialElapsedTime?: number;
  onElapsedTimeChange?: (seconds: number) => void;
}

const InterviewChat: React.FC<InterviewChatProps> = ({
  interview,
  sessionId: initialSessionId,
  onBack,
  initialElapsedTime = 0,
  onElapsedTimeChange,
}) => {
  const toastModal = useToastModal();
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(initialElapsedTime);
  const [isConnecting, setIsConnecting] = useState(!initialSessionId);
  const [isPaused, setIsPaused] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<{ abort: () => void } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const handleEndInterviewRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const elapsedTimeRef = useRef(elapsedTime);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onElapsedTimeChangeRef = useRef(onElapsedTimeChange);

  sessionIdRef.current = sessionId;
  elapsedTimeRef.current = elapsedTime;
  onElapsedTimeChangeRef.current = onElapsedTimeChange;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const saveProgress = useCallback(async () => {
    if (!sessionIdRef.current) return;
    try {
      await interviewApi.saveProgress(sessionIdRef.current, {
        elapsedTime: elapsedTimeRef.current,
      });
    } catch (err) {
      console.error('保存进度失败:', err);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const saveProgressRef = useRef(saveProgress);
  saveProgressRef.current = saveProgress;

  useEffect(() => {
    // 每秒计时，同时通知父组件（不调用保存接口）
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => {
        const next = prev + 1;
        onElapsedTimeChangeRef.current?.(next);
        return next;
      });
    }, 1000);

    // 页面关闭/刷新时保存
    const handleBeforeUnload = () => {
      saveProgressRef.current();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // 组件卸载（退出面试）时立即保存当前进度
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveProgressRef.current();
    };
  }, []);

  useEffect(() => {
    if (sessionId) {
      loadMessages();
    } else {
      startInterview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const loadMessages = async () => {
    if (!sessionId) return;
    try {
      const msgs = await interviewApi.getSessionMessages(sessionId);
      setMessages(msgs);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载消息失败');
    }
  };

  const startInterview = () => {
    setIsTyping(true);
    setIsConnecting(true);
    setError(null);

    let tempSessionId: string | null = null;
    let tempMessageId: string | null = null;

    abortRef.current = interviewApi.startInterviewStream(
      interview.id,
      (event: SSEEvent) => {
        if (event.type === 'session') {
          tempSessionId = event.data.sessionId as string;
          setSessionId(event.data.sessionId as string);
          setIsConnecting(false);
        } else if (event.type === 'chunk') {
          if (tempSessionId) {
            const content = event.data as unknown as string;
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.role === 'assistant' && tempMessageId === lastMsg.id) {
                return prev.map((msg) =>
                  msg.id === tempMessageId
                    ? { ...msg, content: msg.content + content }
                    : msg,
                );
              } else {
                tempMessageId = Date.now().toString();
                return [
                  ...prev,
                  {
                    id: tempMessageId,
                    sessionId: tempSessionId!,
                    role: 'assistant' as const,
                    content,
                    timestamp: new Date(),
                  },
                ];
              }
            });
          }
        } else if (event.type === 'done') {
          setIsTyping(false);
        } else if (event.type === 'error') {
          setError((event.data.message as string) || '发生错误');
          setIsTyping(false);
          setIsConnecting(false);
        }
      },
      (err) => {
        setError(err.message);
        setIsTyping(false);
        setIsConnecting(false);
      },
    );
  };

  const handleEndInterview = useCallback(async () => {
    const confirmed = await toastModal.confirm(
      '确定要结束本次面试吗？结束后将无法继续。',
      '结束面试'
    );
    if (!confirmed) return;

    if (!sessionIdRef.current) return;

    try {
      await saveProgress();
      await interviewApi.endInterview(sessionIdRef.current);
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : '结束面试失败');
    }
  }, [onBack, saveProgress, toastModal]);

  handleEndInterviewRef.current = handleEndInterview;

  const handlePause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleResume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isTyping || !sessionId) return;

    const userMessage: InterviewMessage = {
      id: Date.now().toString(),
      sessionId,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const aiMessageId = (Date.now() + 1).toString();

    abortRef.current = interviewApi.sendMessageStream(
      sessionId,
      input.trim(),
      (event: SSEEvent) => {
        if (event.type === 'chunk') {
          const content = event.data as unknown as string;
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.role === 'assistant' && lastMsg.id === aiMessageId) {
              return prev.map((msg) =>
                msg.id === aiMessageId
                  ? { ...msg, content: msg.content + content }
                  : msg,
              );
            } else {
              return [
                ...prev,
                {
                  id: aiMessageId,
                  sessionId,
                  role: 'assistant' as const,
                  content,
                  timestamp: new Date(),
                },
              ];
            }
          });
        } else if (event.type === 'done') {
          setIsTyping(false);
          if (event.data.shouldEnd) {
            handleEndInterviewRef.current();
          }
        } else if (event.type === 'error') {
          setError((event.data.message as string) || '发送消息失败');
          setIsTyping(false);
        }
      },
      (err) => {
        setError(err.message);
        setIsTyping(false);
      },
    );
  }, [input, isTyping, sessionId]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="interview-chat-page">
      {isPaused ? (
        <InterviewPaused
          interviewTitle={interview.title || interview.sceneName}
          elapsedTime={elapsedTime}
          onResume={handleResume}
          onEnd={handleEndInterview}
        />
      ) : (
        <>
          {isConnecting && (
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
              </div>
            </div>
          )}

          <div className="chat-header">
            <button className="pause-btn" onClick={handlePause}>
              <PauseIcon /> 暂停
            </button>
            <div className="header-info">
              <h2>{interview.title || interview.sceneName}</h2>
              <span className="interview-meta">
                {interview.jobName || '通用岗位'} · {interview.difficultyName}
              </span>
            </div>
            <div className="header-right">
              <span className="elapsed-time">{formatDuration(elapsedTime)}</span>
              <button className="end-btn" onClick={handleEndInterview} disabled={isTyping}>
                结束面试
              </button>
            </div>
          </div>

      {error && (
        <div className="error-message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 && !isTyping && (
          <div className="empty-chat">
            <div className="empty-icon">
              <MicReadyIcon />
            </div>
            <p>面试即将开始，请准备好回答问题...</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'user' ? <UserIcon /> : <BotIcon />}
            </div>
            <div className="message-content">
              <div className="message-bubble">
                {msg.content.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
              <div className="message-meta">
                <span className="timestamp">{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          </div>
        ))}

        {isTyping && messages[messages.length - 1]?.role === 'user' && (
          <div className="message assistant">
            <div className="message-avatar"><BotIcon /></div>
            <div className="message-content">
              <div className="message-bubble typing">
                <span className="typing-indicator">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <div className="input-field-wrapper">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              const textarea = e.target;
              textarea.style.height = 'auto';
              const lineHeight = 22;
              const maxHeight = lineHeight * 4 + 24;
              textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
            }}
            onKeyPress={handleKeyPress}
            placeholder="输入你的回答..."
            disabled={isTyping}
            rows={1}
          />
        </div>
        <VoiceInput
          onTranscription={(text) => {
            setInput((prev) => prev ? `${prev} ${text}` : text);
          }}
          disabled={isTyping}
          language="zh"
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          aria-label="发送消息"
        >
          <SendIcon />
        </button>
      </div>
        </>
      )}
    </div>
  );
};

export default InterviewChat;
