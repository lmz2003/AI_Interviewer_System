import React, { useState, useEffect, useRef, useCallback } from 'react';
import { interviewApi } from './api';
import type { Interview, InterviewMessage, SSEEvent } from './types';
import './Interview.scss';

interface InterviewChatProps {
  interview: Interview;
  sessionId: string | null;
  onEnd: (reportId: string) => void;
  onBack: () => void;
}

const InterviewChat: React.FC<InterviewChatProps> = ({
  interview,
  sessionId: initialSessionId,
  onEnd,
  onBack,
}) => {
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<{ abort: () => void } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const handleEndInterviewRef = useRef<() => Promise<void>>(() => Promise.resolve());

  sessionIdRef.current = sessionId;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    setError(null);

    let tempSessionId: string | null = null;
    let tempMessageId: string | null = null;

    abortRef.current = interviewApi.startInterviewStream(
      interview.id,
      (event: SSEEvent) => {
        if (event.type === 'session') {
          tempSessionId = event.data.sessionId as string;
          setSessionId(event.data.sessionId as string);
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
        }
      },
      (err) => {
        setError(err.message);
        setIsTyping(false);
      },
    );
  };

  const handleEndInterview = useCallback(async () => {
    if (!sessionIdRef.current) return;

    try {
      setIsTyping(true);
      const result = await interviewApi.endInterview(sessionIdRef.current);
      onEnd(result.reportId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '结束面试失败');
      setIsTyping(false);
    }
  }, [onEnd]);

  handleEndInterviewRef.current = handleEndInterview;

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
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>
          ← 返回
        </button>
        <div className="header-info">
          <h2>{interview.title || interview.sceneName}</h2>
          <span className="interview-meta">
            {interview.jobName || '通用岗位'} · {interview.difficultyName}
          </span>
        </div>
        <button className="end-btn" onClick={handleEndInterview} disabled={isTyping}>
          结束面试
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="chat-messages">
        {messages.length === 0 && !isTyping && (
          <div className="empty-chat">
            <div className="empty-icon">🎤</div>
            <p>面试即将开始，请准备好回答问题...</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'user' ? '👤' : '🤖'}
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
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="message-bubble typing">
                <span className="typing-indicator">正在思考...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入你的回答..."
          disabled={isTyping}
          rows={3}
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
        >
          发送
        </button>
      </div>
    </div>
  );
};

export default InterviewChat;
