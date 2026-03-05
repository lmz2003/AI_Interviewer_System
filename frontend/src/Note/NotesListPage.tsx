import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToastModal } from '../components/ui/toast-modal';
import styles from './NotesListPage.module.scss';

// ---- SVG Icons ----
const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const UploadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const SyncIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);
const NoteEmptyIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const LoadingIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);

// ---- Types ----
interface Note {
  id: string;
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  knowledgeDocumentId?: string;
  syncedToKnowledgeAt?: string;
  needsSync?: boolean;
}
interface QueryParams {
  page: number;
  pageSize: number;
  keyword?: string;
  tag?: string;
  status?: string;
  sortBy: string;
  order: 'asc' | 'desc';
}

const NotesListPage: React.FC = () => {
  const navigate = useNavigate();
  const toastModal = useToastModal();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [queryParams, setQueryParams] = useState<QueryParams>({
    page: 1, pageSize: 20, keyword: '', tag: '', status: '', sortBy: 'updatedAt', order: 'desc',
  });

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }
      const params = new URLSearchParams();
      params.append('page', queryParams.page.toString());
      params.append('pageSize', queryParams.pageSize.toString());
      if (queryParams.keyword) params.append('keyword', queryParams.keyword);
      if (queryParams.tag) params.append('tag', queryParams.tag);
      if (queryParams.status) params.append('status', queryParams.status);
      params.append('sortBy', queryParams.sortBy);
      params.append('order', queryParams.order);
      const response = await fetch(`${API_BASE}/notes?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('获取笔记列表失败');
      const result = await response.json();
      if (result.code === 0) { setNotes(result.data.list); setPagination(result.data.pagination); }
    } catch (error) { console.error(error); toastModal.error('获取笔记列表失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchNotes(); }, [queryParams]);

  const handleSearch = (keyword: string) => setQueryParams(prev => ({ ...prev, keyword, page: 1 }));
  const handleFilterChange = (key: keyof QueryParams, value: string) => setQueryParams(prev => ({ ...prev, [key]: value, page: 1 }));
  const handlePageChange = (page: number) => setQueryParams(prev => ({ ...prev, page }));

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!await toastModal.confirm('确认删除这条笔记吗？删除后将无法恢复。', '确认删除')) return;
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`${API_BASE}/notes/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      const result = await r.json();
      if (result.code === 0) { await toastModal.success('删除成功'); fetchNotes(); }
      else throw new Error(result.message || '删除失败');
    } catch (e) { console.error(e); await toastModal.error('删除失败'); }
  };

  const handleBatchDelete = async () => {
    const selectedIds = Array.from(selectedNotes);
    if (!selectedIds.length) return;
    if (!await toastModal.confirm(`确认删除选中的 ${selectedIds.length} 条笔记吗？`, '确认批量删除')) return;
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`${API_BASE}/notes`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedIds }) });
      const result = await r.json();
      if (result.code === 0) {
        const { successIds, failedIds } = result.data;
        if (failedIds.length > 0) await toastModal.warning(`成功删除 ${successIds.length} 条，失败 ${failedIds.length} 条`, '批量删除结果');
        else await toastModal.success(`成功删除 ${successIds.length} 条笔记`);
        handleExitBatchMode(); fetchNotes();
      } else throw new Error(result.message || '批量删除失败');
    } catch (e) { console.error(e); await toastModal.error('批量删除失败'); }
  };

  const handleSelectNote = (id: string) => {
    setSelectedNotes(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleUploadToKnowledge = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!await toastModal.confirm('确认将此笔记上传到知识库吗？', '确认上传')) return;
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`${API_BASE}/notes/${id}/upload-to-knowledge`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      const result = await r.json();
      if (result.code === 0) { await toastModal.success('笔记已成功上传到知识库'); fetchNotes(); }
      else throw new Error(result.message || '上传到知识库失败');
    } catch (e) { console.error(e); await toastModal.error('上传到知识库失败，请稍后重试'); }
  };

  const handleSyncToKnowledge = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!await toastModal.confirm('确认将更新后的笔记内容同步到知识库吗？', '确认同步')) return;
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`${API_BASE}/notes/${id}/sync-to-knowledge`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      const result = await r.json();
      if (result.code === 0) { await toastModal.success('笔记已成功同步到知识库'); fetchNotes(); }
      else throw new Error(result.message || '同步到知识库失败');
    } catch (e) { console.error(e); await toastModal.error('同步到知识库失败，请稍后重试'); }
  };

  const handleEnterBatchMode = () => setBatchMode(true);
  const handleExitBatchMode = () => { setBatchMode(false); setSelectedNotes(new Set()); };
  const handleSelectAll = () => setSelectedNotes(selectedNotes.size === notes.length ? new Set() : new Set(notes.map(n => n.id)));
  const handleViewNote = (id: string) => navigate(`/dashboard/notes/${id}`);
  const handleCreateNote = () => navigate('/dashboard/notes/new');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const diff = Date.now() - date.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className={styles.pageContainer}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>所有笔记</h2>
        <div className={styles.headerActions}>
          {!batchMode ? (
            <>
              <button className={`${styles.button} ${styles.buttonSecondary}`} onClick={handleEnterBatchMode}>
                <TrashIcon /> 批量删除
              </button>
              <button className={`${styles.button} ${styles.buttonPrimary}`} onClick={handleCreateNote}>
                <PlusIcon /> 新建笔记
              </button>
            </>
          ) : (
            <>
              <button className={`${styles.button} ${styles.buttonSecondary}`} onClick={handleExitBatchMode}>
                取消
              </button>
              <button
                className={`${styles.button} ${styles.buttonDanger}`}
                onClick={handleBatchDelete}
                disabled={selectedNotes.size === 0}
              >
                <TrashIcon /> 删除选中 ({selectedNotes.size})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Batch bar */}
      {batchMode && (
        <div className={styles.batchActionsBar}>
          <label className={styles.selectAllLabel}>
            <input
              type="checkbox"
              checked={selectedNotes.size === notes.length && notes.length > 0}
              onChange={handleSelectAll}
              className={styles.checkbox}
              aria-label={selectedNotes.size === notes.length ? '取消全选' : '全选'}
            />
            <span className={styles.selectAllText}>
              {selectedNotes.size === notes.length && notes.length > 0 ? '取消全选' : '全选'}
            </span>
          </label>
          <span className={styles.selectedCount}>已选择 {selectedNotes.size} 条</span>
        </div>
      )}

      {/* Filters */}
      <div className={styles.filtersBar}>
        <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', display: 'flex' }}>
            <SearchIcon />
          </span>
          <input
            className={styles.searchInput}
            style={{ paddingLeft: '34px' }}
            placeholder="搜索笔记标题..."
            value={queryParams.keyword}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
        <select aria-label="状态筛选" className={styles.select} value={queryParams.status} onChange={e => handleFilterChange('status', e.target.value)}>
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
        </select>
        <select aria-label="排序字段" className={styles.select} value={queryParams.sortBy} onChange={e => handleFilterChange('sortBy', e.target.value)}>
          <option value="updatedAt">最后修改</option>
          <option value="createdAt">创建时间</option>
          <option value="title">标题</option>
        </select>
        <select aria-label="排序顺序" className={styles.select} value={queryParams.order} onChange={e => handleFilterChange('order', e.target.value as 'asc' | 'desc')}>
          <option value="desc">降序</option>
          <option value="asc">升序</option>
        </select>
      </div>

      {/* Content */}
      <div className={styles.contentArea}>
        {loading ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><LoadingIcon /></div>
            <p className={styles.emptyText}>加载中...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><NoteEmptyIcon /></div>
            <p className={styles.emptyText}>还没有笔记，点击「新建笔记」开始吧</p>
          </div>
        ) : (
          <>
            <div className={styles.notesList}>
              {notes.map(note => (
                <div
                  key={note.id}
                  className={`${styles.noteCard} ${selectedNotes.has(note.id) ? styles.noteCardSelected : ''}`}
                  onClick={() => batchMode ? handleSelectNote(note.id) : handleViewNote(note.id)}
                >
                  {batchMode && (
                    <div className={styles.noteCardCheckbox}>
                      <input
                        type="checkbox"
                        checked={selectedNotes.has(note.id)}
                        onChange={() => handleSelectNote(note.id)}
                        className={styles.checkbox}
                        onClick={e => e.stopPropagation()}
                        aria-label={`选择笔记：${note.title}`}
                      />
                    </div>
                  )}
                  <div className={styles.noteCardContent}>
                    <div className={styles.noteCardHeader}>
                      <h3 className={styles.noteTitle}>{note.title}</h3>
                      <div className={styles.noteActions}>
                        <button className={`${styles.actionButton} ${styles.actionDelete}`} onClick={e => handleDelete(note.id, e)}>
                          <TrashIcon /> 删除
                        </button>
                        {note.knowledgeDocumentId ? (
                          <button
                            className={`${styles.actionButton} ${styles.actionSync}`}
                            onClick={e => handleSyncToKnowledge(note.id, e)}
                            disabled={!note.needsSync}
                            title={note.needsSync ? '需要同步到知识库' : '已同步到知识库'}
                          >
                            {note.needsSync ? <><SyncIcon /> 需同步</> : <><CheckIcon /> 已同步</>}
                          </button>
                        ) : (
                          <button
                            className={`${styles.actionButton} ${styles.actionUpload}`}
                            onClick={e => handleUploadToKnowledge(note.id, e)}
                            title="上传到知识库"
                          >
                            <UploadIcon /> 上传
                          </button>
                        )}
                      </div>
                    </div>

                    <p className={styles.noteContent}>{note.summary || note.content}</p>

                    <div className={styles.noteMeta}>
                      <span className={`${styles.statusBadge} ${note.status === 'published' ? styles.statusPublished : styles.statusDraft}`}>
                        {note.status === 'published' ? '已发布' : '草稿'}
                      </span>
                      {note.tags?.map((tag, i) => <span key={i} className={styles.tag}>{tag}</span>)}
                      <span className={styles.timeText}>更新于 {formatDate(note.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className={styles.pagination}>
              <button className={styles.pageButton} disabled={pagination.page === 1} onClick={() => handlePageChange(pagination.page - 1)}>
                上一页
              </button>
              <span>第 {pagination.page} / {Math.ceil(pagination.total / pagination.pageSize)} 页（共 {pagination.total} 条）</span>
              <button className={styles.pageButton} disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)} onClick={() => handlePageChange(pagination.page + 1)}>
                下一页
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NotesListPage;
