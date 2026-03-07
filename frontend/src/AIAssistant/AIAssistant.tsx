import React, { useState, useEffect, useRef, useCallback } from 'react';
import './AIAssistant.scss';
import MarkdownRenderer from './MarkdownRenderer';
import VoiceInput from './VoiceInput';
import type { Message, Session } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// ---- SVG Icons ----
const BotIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M12 11V5"/>
    <circle cx="12" cy="4" r="1"/>
    <path d="M8 15h0M16 15h0"/>
  </svg>
);
const UserIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const PlusCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="16"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
);
const HistoryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
    <path d="M12 7v5l4 2"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);
const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
  </svg>
);
const StopSquareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2"/>
  </svg>
);
const RefreshIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2-8.83"/>
  </svg>
);
const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const BookOpenIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    <line x1="9" y1="6" x2="15" y2="6"/>
    <line x1="9" y1="10" x2="15" y2="10"/>
    <line x1="9" y1="14" x2="13" y2="14"/>
  </svg>
);
const AlertTriangleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const formatTime = (date: Date) =>
  new Date(date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });

const AIAssistant: React.FC = () => {
  const token = localStorage.getItem('token');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [useRAG, setUseRAG] = useState(true);
  const [requestId, setRequestId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const lineHeight = 22;
    const paddingTop = 10;
    const paddingBottom = 10;
    const minHeight = lineHeight + paddingTop + paddingBottom; // 42px，至少一行高
    const maxHeight = lineHeight * 4 + paddingTop + paddingBottom;
    const scrollHeight = Math.max(textarea.scrollHeight, minHeight);
    if (scrollHeight > maxHeight) {
      textarea.style.height = maxHeight + 'px';
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.height = scrollHeight + 'px';
      textarea.style.overflowY = 'hidden';
    }
  }, []);

  useEffect(() => { adjustTextareaHeight(); }, [input, adjustTextareaHeight]);
  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadSessions = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/ai-assistant/sessions`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) setSessions(data.data || []);
    } catch (e) { console.error('加载会话失败:', e); }
  }, [token]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const createNewSession = useCallback(() => {
    setSessionId(null);
    setMessages([]);
  }, []);

  const switchSession = useCallback(async (sessionIdToSwitch: string) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/ai-assistant/sessions/${sessionIdToSwitch}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setSessionId(sessionIdToSwitch);
        const messages = (data.data.messages || []).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(messages);
        setShowHistory(false);
      }
    } catch (e) { console.error('加载会话失败:', e); }
  }, [token]);

  const deleteSession = useCallback(async (sessionToDelete: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/ai-assistant/sessions/${sessionToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        loadSessions();
        if (sessionId === sessionToDelete) createNewSession();
      }
    } catch (e) { console.error('删除会话失败:', e); }
  }, [token, sessionId, loadSessions, createNewSession]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isTyping || !token) return;

    setError(null);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = input.trim();
    setInput('');
    setIsTyping(true);

    try {
      const aiMessageId = (Date.now() + 1).toString();
      setStreamingMessageId(aiMessageId);

      if (abortControllerRef.current) abortControllerRef.current.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      let currentContent = '';
      let currentSources: Array<{ title: string; score: number }> = [];

      const response = await fetch(`${API_BASE}/ai-assistant/message/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: userInput, sessionId: sessionId || undefined, useRAG, topK: 5, threshold: 0.5 }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('无法读取响应流');

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          setStreamingMessageId(null);
          setRequestId(null);
          loadSessions();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines[lines.length - 1];

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.substring(6);
              const data = JSON.parse(jsonStr);

              if (data.type === 'request-id' && data.data?.requestId) {
                setRequestId(data.data.requestId);
              } else if (data.type === 'chunk' && data.data) {
                let chunkContent: string;
                if (typeof data.data === 'string') {
                  chunkContent = data.data;
                } else if (typeof data.data === 'object' && data.data !== null) {
                  if ('content' in data.data && typeof (data.data as any).content === 'string') {
                    chunkContent = (data.data as any).content;
                  } else if ('kwargs' in data.data && (data.data as any).kwargs) {
                    const kwargs = (data.data as any).kwargs;
                    chunkContent = kwargs.content && typeof kwargs.content === 'string' ? kwargs.content : JSON.stringify(data.data);
                  } else {
                    chunkContent = JSON.stringify(data.data);
                  }
                } else {
                  chunkContent = String(data.data);
                }
                currentContent += chunkContent;
                setMessages(prev => {
                  const exists = prev.some(msg => msg.id === aiMessageId);
                  if (exists) {
                    return prev.map(msg =>
                      msg.id === aiMessageId ? { ...msg, content: currentContent } : msg
                    );
                  } else {
                    // 第一个 chunk 到来时才创建消息气泡
                    return [...prev, {
                      id: aiMessageId,
                      role: 'assistant' as const,
                      content: currentContent,
                      timestamp: new Date(),
                      sources: [],
                    }];
                  }
                });
              } else if (data.type === 'done') {
                currentSources = data.data?.sources || [];
                const newSessionId = data.data?.sessionId;
                if (!sessionId && newSessionId) setSessionId(newSessionId);
                setMessages(prev => prev.map(msg =>
                  msg.id === aiMessageId ? { ...msg, sources: currentSources } : msg
                ));
              } else if (data.type === 'error') {
                throw new Error(data.message || '流式处理失败');
              }
            } catch (err) { console.error('解析事件数据失败:', err); }
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '发送消息失败，请重试';
      setError(errorMessage);
      setStreamingMessageId(null);
    } finally { setIsTyping(false); }
  }, [input, isTyping, token, sessionId, loadSessions, useRAG]);

  useEffect(() => {
    return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
  }, []);

  const handleStopGeneration = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (requestId && token) {
      try {
        await fetch(`${API_BASE}/ai-assistant/message/abort`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ requestId }),
        });
      } catch (e) { console.error('中止后端请求失败:', e); }
    }
    setIsTyping(false);
    setStreamingMessageId(null);
    setRequestId(null);
  }, [requestId, token]);

  const handleResendLastMessage = useCallback(() => {
    if (messages.length === 0 || isTyping) return;
    let lastUserMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') { lastUserMessageIndex = i; break; }
    }
    if (lastUserMessageIndex === -1) return;
    const lastUserMessage = messages[lastUserMessageIndex];
    setMessages(messages.slice(0, lastUserMessageIndex));
    setInput(lastUserMessage.content);
    setTimeout(() => { handleSend(); }, 0);
  }, [messages, isTyping, handleSend]);

  const handleDeleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="assistant-container">
      {/* Header */}
      <div className="assistant-header">
        <div className="header-left">
          <h3>
            <span className="header-bot-icon"><BotIcon /></span>
            AI 智能助手
          </h3>
          <p>连接知识库，提供智能问答与创意支持</p>
        </div>
        <div className="header-right">
          <button className="header-button" onClick={createNewSession} title="新建会话">
            <PlusCircleIcon />
          </button>
          <button className="header-button" onClick={() => setShowHistory(!showHistory)} title="历史会话">
            <HistoryIcon />
          </button>
        </div>
      </div>

      {/* History Dropdown */}
      {showHistory && (
        <div className="history-dropdown" ref={dropdownRef}>
          <div className="dropdown-header"><h4>历史会话</h4></div>
          <div className="dropdown-content">
            {sessions.length > 0 ? (
              sessions.map(session => (
                <div key={session.id} className="session-item" onClick={() => switchSession(session.id)}>
                  <div className="session-info">
                    <h5 className="session-title">{session.title}</h5>
                    <div className="session-meta">
                      <span className="session-time">{formatDate(new Date(session.updatedAt))}</span>
                      <span className="session-count">{session.messageCount} 条消息</span>
                    </div>
                  </div>
                  <div className="session-actions">
                    <button className="action-button" onClick={(e) => deleteSession(session.id, e)} title="删除会话">
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-sessions">暂无历史会话</div>
            )}
          </div>
        </div>
      )}

      {/* Message list */}
      <div className="message-list">
        {messages.length === 0 && (
          <div className="initial-state">
            <div className="initial-content">
              <div className="avatar assistant-avatar"><BotIcon /></div>
              <div className="message-bubble assistant-message initial-bubble">
                <p>你好！我是 AI 助手，很高兴为你服务！我可以帮你：</p>
                <p>• 解答问题和提供建议</p>
                <p>• 帮你整理思路和分析内容</p>
                <p>• 利用你的知识库提供更精准的回答</p>
                <p>有什么我可以帮你的吗？</p>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={msg.id} className={`message-wrapper ${msg.role === 'user' ? 'user-message' : ''}`}>
            <div className={`avatar ${msg.role === 'user' ? 'user-avatar' : 'assistant-avatar'}`}>
              {msg.role === 'user' ? <UserIcon /> : <BotIcon />}
            </div>
            <div className="message-content-wrapper">
              <div className={`message-bubble ${msg.role === 'user' ? 'user-message' : ''}`}>
                {msg.role === 'user' ? (
                  <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</span>
                ) : (
                  <MarkdownRenderer content={msg.content} isStreaming={streamingMessageId === msg.id} />
                )}
                {msg.sources && msg.sources.length > 0 && msg.role === 'assistant' && (
                  <div className="sources-container">
                    <p><BookOpenIcon /> 知识库来源</p>
                    <div className="sources-list">
                      {msg.sources.map((source, i) => (
                        <span
                          key={i}
                          className="source-tag"
                          title={`${source.title} (相似度: ${(source.score * 100).toFixed(1)}%)`}
                        >
                          {source.title} ({(source.score * 100).toFixed(0)}%)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="message-actions">
                <span className={`timestamp ${msg.role === 'user' ? 'user-timestamp' : ''}`}>
                  {formatTime(msg.timestamp)}
                </span>
                {idx === messages.length - 1 && msg.role === 'user' && (
                  <button className="action-btn resend-btn" onClick={handleResendLastMessage} title="重新发送" disabled={isTyping}>
                    <RefreshIcon />
                  </button>
                )}
                <button className="action-btn delete-btn" onClick={() => handleDeleteMessage(msg.id)} title="删除">
                  <XIcon />
                </button>
              </div>
            </div>
          </div>
        ))}

        {isTyping && !messages.some(m => m.id === streamingMessageId && m.content) && (
          <div className="message-wrapper">
            <div className="avatar assistant-avatar"><BotIcon /></div>
            <div className="message-content-wrapper">
              <div className="message-bubble">
                <div className="typing-indicator">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            <AlertTriangleIcon /> {error}
          </div>
        )}

        <div ref={messagesEndRef} className="scroll-indicator" />
      </div>

      {/* Input area */}
      <div className="input-area">
        {/* RAG toggle */}
        <div className="rag-toggle">
          <button
            className={`rag-button ${useRAG ? 'active' : ''}`}
            onClick={() => setUseRAG(!useRAG)}
            title={useRAG ? '知识库（开启）' : '知识库（关闭）'}
          >
            <BookOpenIcon />
            <span className="rag-label">{useRAG ? '知识库' : '普通模式'}</span>
          </button>
        </div>

        {/* Input + send */}
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息...（Enter 发送，Shift+Enter 换行）"
            disabled={isTyping || !token}
            className="textarea-input"
            rows={1}
          />
          <VoiceInput
            onTranscription={(text) => setInput((prev) => prev + text)}
            disabled={isTyping || !token}
          />
          {isTyping ? (
            <button aria-label="停止生成" className="stop-button" onClick={handleStopGeneration} title="停止生成">
              <StopSquareIcon />
            </button>
          ) : (
            <button aria-label="发送消息" className="send-button" onClick={handleSend} disabled={!input.trim() || isTyping || !token}>
              <SendIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
