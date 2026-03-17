import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToastModal } from '../components/ui/toast-modal';
import LoadingModal from './components/LoadingModal';
import styles from './ResumeList.module.scss';
import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const CalendarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const FileTypeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const SpinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);
const EmptyResumeIcon = () => (
  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);
const FileIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);
const CheckboxIcon = ({ checked }: { checked: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={checked ? '#6366F1' : 'none'} stroke={checked ? '#6366F1' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    {checked && <polyline points="9 11 12 14 22 4" stroke="#fff" strokeWidth="2.5"/>}
  </svg>
);

interface Resume {
  id: string;
  title: string;
  fileType: string;
  fileName?: string;
  createdAt: string;
  isProcessed: boolean;
  analysisStage?: number;
  overallScore?: number;
}

const ResumeList: React.FC = () => {
  const navigate = useNavigate();
  const { error, success } = useToastModal();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);
  const subscribedIdsRef = useRef<Set<string>>(new Set());
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 更新单条简历进度
  const updateResumeStage = useCallback((resumeId: string, stage: number) => {
    setResumes(prev => prev.map(r => r.id === resumeId ? { ...r, analysisStage: stage } : r));
  }, []);

  // 标记简历分析完成
  const markResumeComplete = useCallback((resumeId: string, overallScore: number) => {
    setResumes(prev => prev.map(r =>
      r.id === resumeId ? { ...r, isProcessed: true, analysisStage: 5, overallScore } : r
    ));
  }, []);

  // 轮询刷新未完成的简历状态（作为 WebSocket 的降级/兜底方案）
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    pollTimerRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
        const response = await fetch(`${apiBaseUrl}/resume-analysis`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        const latest: Resume[] = data.data || [];

        setResumes(prev => {
          const hasPending = prev.some(r => !r.isProcessed);
          if (!hasPending) {
            // 没有待处理的简历，停止轮询
            if (pollTimerRef.current) {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
            }
            return prev;
          }
          // 只更新有变化的条目（避免不必要重渲染）
          return prev.map(r => {
            const fresh = latest.find(f => f.id === r.id);
            if (!fresh) return r;
            if (fresh.isProcessed !== r.isProcessed ||
                fresh.analysisStage !== r.analysisStage ||
                fresh.overallScore !== r.overallScore) {
              return { ...r, ...fresh };
            }
            return r;
          });
        });
      } catch {
        // 轮询失败静默忽略
      }
    }, 3000);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // 初始化 WebSocket 连接（只建立一次）
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    if (socketRef.current) return;

    const socket = io(`${WS_URL}/resume-analysis`, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('analysis-progress', (data: { resumeId: string; stage: number }) => {
      updateResumeStage(data.resumeId, data.stage);
    });

    socket.on('analysis-complete', (data: { resumeId: string; overallScore: number }) => {
      markResumeComplete(data.resumeId, data.overallScore);
    });

    // 连接成功后，将所有待订阅的 resumeId 批量发送
    socket.on('connect', () => {
      const currentUserId = localStorage.getItem('userId') || '';
      subscribedIdsRef.current.forEach(resumeId => {
        socket.emit('join-resume', { resumeId, userId: currentUserId });
      });
    });

    return () => {
      const currentUserId = localStorage.getItem('userId') || '';
      subscribedIdsRef.current.forEach(resumeId => {
        socket.emit('leave-resume', { resumeId, userId: currentUserId });
      });
      socket.disconnect();
      socketRef.current = null;
      subscribedIdsRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当简历列表变化时，为新增的未完成简历订阅 WebSocket，并管理轮询
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const pendingResumes = resumes.filter(r => !r.isProcessed);

    if (pendingResumes.length === 0) {
      // 所有简历已处理完成，停止轮询
      stopPolling();
      return;
    }

    // 有未处理简历时，启动降级轮询兜底
    startPolling();

    const socket = socketRef.current;

    // 为未完成的简历发送 join-resume
    pendingResumes.forEach(r => {
      const isNew = !subscribedIdsRef.current.has(r.id);
      if (isNew) {
        subscribedIdsRef.current.add(r.id);
      }
      // 只要 socket 已连接就发送 join-resume（确保加入 room）
      // connect 事件可能在 resumes 变更前已触发，导致 id 未被 join
      if (socket && socket.connected) {
        socket.emit('join-resume', { resumeId: r.id, userId });
      }
    });
  }, [resumes, startPolling, stopPolling]);

  // 组件卸载时停止轮询
  useEffect(() => () => stopPolling(), [stopPolling]);

  useEffect(() => { fetchResumes(); }, []);

  const fetchResumes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/resume-analysis`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to fetch resumes');
      const data = await response.json();
      setResumes(data.data || []);
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to fetch resumes', '获取简历失败');
    } finally { setLoading(false); }
  };

  const handleViewResume = (resumeId: string) => navigate(`/dashboard/resume/${resumeId}`);

  const handleDeleteResume = async (event: React.MouseEvent, resumeId: string) => {
    event.stopPropagation();
    if (!window.confirm('确定要删除这份简历吗？')) return;
    try {
      setDeletingId(resumeId);
      const token = localStorage.getItem('token');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/resume-analysis/${resumeId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to delete resume');
      setResumes(resumes.filter(r => r.id !== resumeId));
      success('简历已删除', '删除成功');
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to delete resume', '删除失败');
    } finally { setDeletingId(null); }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === resumes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(resumes.map(r => r.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selectedIds.size} 份简历吗？此操作不可撤销。`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      
      const deletePromises = Array.from(selectedIds).map(id =>
        fetch(`${apiBaseUrl}/resume-analysis/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
      );
      
      await Promise.all(deletePromises);
      setResumes(resumes.filter(r => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
      setBatchMode(false);
      success(`已删除 ${selectedIds.size} 份简历`, '批量删除成功');
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to batch delete resumes', '批量删除失败');
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });

  const getScoreColorClass = (score: number) => {
    if (score >= 75) return styles.scoreHigh;
    if (score >= 60) return styles.scoreMedium;
    return styles.scoreLow;
  };

  if (loading) {
    return (
      <>
        <div className={styles.loadingContainer}>
          <span className={styles.loadingSpinner}><SpinIcon /></span>
          加载中...
        </div>
        <LoadingModal isOpen={loading} title="加载简历列表" description="正在获取您的简历..." />
      </>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>我的简历</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {resumes.length > 0 && (
            <button
              onClick={() => { setBatchMode(!batchMode); setSelectedIds(new Set()); }}
              className={`${styles.button} ${styles.buttonSecondary}`}
              style={{ padding: '8px 14px', fontSize: '0.8rem' }}
            >
              {batchMode ? '取消' : '批量管理'}
            </button>
          )}
          <button
            onClick={() => navigate('/dashboard/resume/upload')}
            className={`${styles.button} ${styles.buttonPrimary}`}
          >
            <PlusIcon /> 上传简历
          </button>
        </div>
      </div>

      {batchMode && selectedIds.size > 0 && (
        <div className={styles.batchBar}>
          <div className={styles.batchInfo}>
            <button
              onClick={handleToggleSelectAll}
              className={`${styles.button} ${styles.buttonSecondary}`}
              style={{ padding: '4px 10px', fontSize: '0.75rem', marginRight: '12px' }}
            >
              {selectedIds.size === resumes.length ? '取消全选' : '全选'}
            </button>
            <span className={styles.batchCount}>已选择 {selectedIds.size} 项</span>
          </div>
          <button
            onClick={handleBatchDelete}
            className={`${styles.button} ${styles.buttonDanger}`}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            <TrashIcon /> 批量删除
          </button>
        </div>
      )}

      {resumes.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <EmptyResumeIcon />
          </div>
          <p className={styles.emptyText}>暂无简历，上传你的第一份简历开始分析</p>
          <button
            onClick={() => navigate('/dashboard/resume/upload')}
            className={`${styles.button} ${styles.buttonPrimary}`}
            style={{ padding: '10px 24px', fontSize: '0.9rem' }}
          >
            <PlusIcon /> 上传简历
          </button>
        </div>
      ) : (
        <div className={styles.resumeGrid}>
          {resumes.map(resume => (
            <div
              key={resume.id}
              onClick={() => {
                if (batchMode) { toggleSelect(resume.id); return; }
                if (!resume.isProcessed) return;
                handleViewResume(resume.id);
              }}
              className={styles.resumeCard}
              style={{
                cursor: deletingId === resume.id ? 'not-allowed' : (!resume.isProcessed && !batchMode) ? 'default' : 'pointer',
                opacity: deletingId === resume.id ? 0.6 : 1,
                pointerEvents: deletingId === resume.id ? 'none' : 'auto',
                borderLeft: selectedIds.has(resume.id) ? '3px solid #6366F1' : '3px solid transparent',
                background: selectedIds.has(resume.id) ? 'rgba(99,102,241,0.04)' : undefined,
              }}
            >
              {batchMode && (
                <div className={styles.checkboxWrapper} onClick={e => e.stopPropagation()}>
                  <div onClick={() => toggleSelect(resume.id)}>
                    <CheckboxIcon checked={selectedIds.has(resume.id)} />
                  </div>
                </div>
              )}
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>
                  <FileIcon />
                </div>
                <h3 className={styles.cardTitle}>{resume.title}</h3>
              </div>

              <div className={styles.cardMeta}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CalendarIcon /> {formatDate(resume.createdAt)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileTypeIcon /> {resume.fileType.toUpperCase()}
                </span>
              </div>

              <div className={styles.scoreSection}>
                {resume.isProcessed && resume.overallScore !== undefined ? (
                  <>
                    <span className={`${styles.scoreValue} ${getScoreColorClass(resume.overallScore)}`}>
                      {Math.round(resume.overallScore)}
                    </span>
                    <span className={styles.scoreLabel}>/ 100 综合评分</span>
                    <div className={styles.scoreBar}>
                      <div
                        className={styles.scoreBarFill}
                        style={{
                          width: `${resume.overallScore}%`,
                          background: resume.overallScore >= 75 ? '#10B981' : resume.overallScore >= 60 ? '#FDB022' : '#EF4444'
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <span className={styles.progressIndicator}><SpinIcon /></span>
                    <span className={styles.progressText}>
                      AI 分析中... {resume.analysisStage !== undefined ? `(${resume.analysisStage}/5)` : ''}
                    </span>
                  </>
                )}
              </div>

              {!batchMode && (
                <div className={styles.cardActions}>
                  <button
                    onClick={e => { e.stopPropagation(); if (resume.isProcessed) handleViewResume(resume.id); }}
                    className={`${styles.button} ${resume.isProcessed ? styles.buttonSecondary : styles.buttonDisabled}`}
                    style={{ flex: 1, justifyContent: 'center', cursor: resume.isProcessed ? 'pointer' : 'not-allowed', opacity: resume.isProcessed ? 1 : 0.5 }}
                    disabled={!resume.isProcessed}
                    title={resume.isProcessed ? '查看分析结果' : 'AI 分析中，请稍候...'}
                  >
                    <SearchIcon /> {resume.isProcessed ? '查看分析' : '分析中...'}
                  </button>
                  <button
                    onClick={e => handleDeleteResume(e, resume.id)}
                    className={`${styles.button} ${styles.buttonDanger}`}
                    style={{ flex: 1, justifyContent: 'center' }}
                    disabled={deletingId === resume.id}
                  >
                    <TrashIcon /> 删除
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResumeList;
