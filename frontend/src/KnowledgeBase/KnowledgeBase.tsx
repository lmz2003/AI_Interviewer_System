import React, { useState, useEffect, useRef } from 'react';
import { useToastModal } from '../components/ui/toast-modal';

// ---- Design tokens ----
const C = {
  primary: '#6366F1',
  primaryHover: '#4F46E5',
  primarySoft: 'rgba(99,102,241,0.08)',
  primarySoftHover: 'rgba(99,102,241,0.14)',
  cta: '#10B981',
  bg: '#F7F6FF',
  surface: '#FFFFFF',
  border: '#EAE8F8',
  text: '#1E1B4B',
  textMuted: '#6B7280',
  danger: '#EF4444',
  dangerSoft: 'rgba(239,68,68,0.08)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245,158,11,0.1)',
  success: '#10B981',
  successSoft: 'rgba(16,185,129,0.08)',
  radius: '10px',
  radiusSm: '6px',
  shadow: '0 1px 4px rgba(30,27,75,0.07)',
};

const font = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// ---- SVG Icons ----
const ChartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    <line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const BookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);
const UploadIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const FileTextIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);
const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
const SpinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);
const AlertIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);
const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

// ---- Shared button styles ----
const btnBase: React.CSSProperties = {
  border: 'none',
  borderRadius: C.radiusSm,
  fontFamily: font,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.15s ease',
  whiteSpace: 'nowrap',
};

const BtnPrimary: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, style, ...props }) => (
  <button style={{ ...btnBase, background: C.primary, color: 'white', padding: '8px 16px', fontSize: '0.875rem', ...style }} {...props}
    onMouseEnter={e => { if (!props.disabled) (e.currentTarget as HTMLElement).style.background = C.primaryHover; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = props.disabled ? C.primarySoft : C.primary; }}
  >{children}</button>
);

const BtnSecondary: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, style, ...props }) => (
  <button style={{ ...btnBase, background: C.primarySoft, color: C.primary, padding: '8px 14px', fontSize: '0.875rem', ...style }} {...props}
    onMouseEnter={e => { if (!props.disabled) (e.currentTarget as HTMLElement).style.background = C.primarySoftHover; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.primarySoft; }}
  >{children}</button>
);

const BtnDanger: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, style, ...props }) => (
  <button style={{ ...btnBase, background: C.dangerSoft, color: C.danger, padding: '8px 14px', fontSize: '0.875rem', ...style }} {...props}
    onMouseEnter={e => { if (!props.disabled) (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.14)'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.dangerSoft; }}
  >{children}</button>
);

// ---- Status badge ----
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    processed:  { label: '已处理', color: C.success, bg: C.successSoft,  icon: <CheckIcon /> },
    processing: { label: '处理中', color: C.warning, bg: C.warningSoft,  icon: <SpinIcon /> },
    uploaded:   { label: '待处理', color: C.textMuted, bg: 'rgba(107,114,128,0.08)', icon: <ClockIcon /> },
    failed:     { label: '处理失败', color: C.danger,  bg: C.dangerSoft,  icon: <AlertIcon /> },
  };
  const { label, color, bg, icon } = cfg[status] || cfg.uploaded;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: bg, color, padding: '2px 8px',
      borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600,
    }}>
      <span style={{ display: 'inline-flex', ...(status === 'processing' ? { animation: 'spin 1s linear infinite' } : {}) }}>
        {icon}
      </span>
      {label}
    </span>
  );
};

// ---- Types ----
interface Document {
  id: string;
  title: string;
  content: string;
  isProcessed: boolean;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  processingError?: string;
  createdAt: string;
}
interface QueryResult {
  id: string;
  title: string;
  content: string;
  score: number;
}

const KnowledgeBase: React.FC = () => {
  const toastModal = useToastModal();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [stats, setStats] = useState({ totalDocuments: 0, processedDocuments: 0, pendingDocuments: 0 });
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [loadingReprocess, setLoadingReprocess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', content: '', source: '' });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingDocuments, setProcessingDocuments] = useState<Set<string>>(new Set());
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [loadingBatchDelete, setLoadingBatchDelete] = useState(false);
  const [isBatchDeleteMode, setIsBatchDeleteMode] = useState(false);
  const [query, setQuery] = useState('');

  const token = localStorage.getItem('token');
  const API_BASE = import.meta.env.VITE_API_BASE_URL + '/knowledge-base';

  const fetchDocuments = async () => {
    try {
      const r = await fetch(`${API_BASE}/documents`, { headers: { 'Authorization': `Bearer ${token}` } });
      const d = await r.json();
      if (d.success) setDocuments(d.data || []);
    } catch (e) { console.error('获取文档列表失败:', e); }
  };

  const fetchStats = async () => {
    try {
      const r = await fetch(`${API_BASE}/statistics`, { headers: { 'Authorization': `Bearer ${token}` } });
      const d = await r.json();
      if (d.success) setStats(d.data || { totalDocuments: 0, processedDocuments: 0, pendingDocuments: 0 });
    } catch (e) { console.error('获取统计信息失败:', e); }
  };

  useEffect(() => { fetchDocuments(); fetchStats(); }, []);

  const handleAddDocument = async () => {
    if (!newDoc.title || !newDoc.content) { await toastModal.warning('请填写标题和内容', '验证失败'); return; }
    if (newDoc.title.length > 500) { await toastModal.warning('文档标题不能超过 500 个字符', '验证失败'); return; }
    if (newDoc.source && newDoc.source.length > 2000) { await toastModal.warning('文档来源不能超过 2000 个字符', '验证失败'); return; }
    setLoadingAdd(true);
    try {
      const r = await fetch(`${API_BASE}/documents`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(newDoc) });
      const d = await r.json();
      if (d.success) { await toastModal.success('文档已添加'); setNewDoc({ title: '', content: '', source: '' }); fetchDocuments(); fetchStats(); }
      else await toastModal.error(`添加失败: ${d.message || '未知错误'}`);
    } catch (e) { await toastModal.error(`添加文档失败: ${e instanceof Error ? e.message : '网络错误'}`); }
    finally { setLoadingAdd(false); }
  };

  const handleQuery = async () => {
    if (!query) { await toastModal.warning('请输入查询内容', '验证失败'); return; }
    if (query.length > 5000) { await toastModal.warning('查询内容不能超过 5000 个字符', '验证失败'); return; }
    setLoadingQuery(true);
    try {
      const r = await fetch(`${API_BASE}/query`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ query, topK: 5, threshold: 0.5 }) });
      const d = await r.json();
      if (d.success) { setQueryResults(d.data); if (d.data.length === 0) await toastModal.info('未找到匹配的文档'); }
      else await toastModal.error(`查询失败: ${d.message || '未知错误'}`);
    } catch (e) { await toastModal.error(`查询失败: ${e instanceof Error ? e.message : '网络错误'}`); }
    finally { setLoadingQuery(false); }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!await toastModal.confirm('确定要删除此文档吗？', '确认删除')) return;
    try {
      const r = await fetch(`${API_BASE}/documents/${docId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      const d = await r.json();
      if (d.success) { await toastModal.success('文档已删除'); fetchDocuments(); fetchStats(); }
      else await toastModal.error(`删除失败: ${d.message || '未知错误'}`);
    } catch (e) { await toastModal.error(`删除文档失败: ${e instanceof Error ? e.message : '网络错误'}`); }
  };

  const handleReprocessDocument = async (docId: string) => {
    if (!await toastModal.confirm('确定要重新处理此文档吗？', '确认处理')) return;
    setLoadingReprocess(docId);
    try {
      const r = await fetch(`${API_BASE}/documents/${docId}/reprocess`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      const d = await r.json();
      if (d.success) { await toastModal.success('文档已提交处理队列，请稍候'); fetchDocuments(); fetchStats(); }
      else await toastModal.error(`重新处理失败: ${d.message || '未知错误'}`);
    } catch (e) { await toastModal.error(`重新处理文档失败: ${e instanceof Error ? e.message : '网络错误'}`); }
    finally { setLoadingReprocess(null); }
  };

  const handleDocumentSelect = (docId: string) => {
    const s = new Set(selectedDocuments);
    s.has(docId) ? s.delete(docId) : s.add(docId);
    setSelectedDocuments(s);
  };

  const handleSelectAll = () => {
    setSelectedDocuments(selectedDocuments.size === documents.length ? new Set() : new Set(documents.map(d => d.id)));
  };

  const handleBatchDelete = async () => {
    if (selectedDocuments.size === 0) { await toastModal.warning('请先选择要删除的文档', '提示'); return; }
    if (!await toastModal.confirm(`确定要删除 ${selectedDocuments.size} 个文档吗？此操作不可撤销`, '确认批量删除')) return;
    setLoadingBatchDelete(true);
    try {
      const r = await fetch(`${API_BASE}/documents/batch-delete`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ documentIds: Array.from(selectedDocuments) }) });
      const d = await r.json();
      if (d.success) { await toastModal.success(`成功删除 ${d.data?.deletedCount || selectedDocuments.size} 个文档`); setSelectedDocuments(new Set()); fetchDocuments(); fetchStats(); }
      else await toastModal.error(`批量删除失败: ${d.message || '未知错误'}`);
    } catch (e) { await toastModal.error(`批量删除失败: ${e instanceof Error ? e.message : '网络错误'}`); }
    finally { setLoadingBatchDelete(false); }
  };

  const getFileIcon = (fileName: string): React.ReactNode => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    // Return simple SVG icon instead of emoji
    return <FileTextIcon />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFileSelect = async (files: FileList) => {
    if (!files) return;
    const newFiles = Array.from(files);
    const maxFileSize = 50 * 1024 * 1024;
    const supported = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.md', '.txt', '.json'];
    const valid: File[] = [];
    for (const file of newFiles) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!supported.includes(ext)) { await toastModal.warning(`不支持的文件类型: ${ext}`, '文件格式错误'); continue; }
      if (file.size > maxFileSize) { await toastModal.warning(`文件 ${file.name} 过大，最大 50MB`, '文件过大'); continue; }
      valid.push(file);
    }
    if (valid.length > 0) setSelectedFiles([...selectedFiles, ...valid]);
  };

  const handleRemoveFile = (index: number) => setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (e.currentTarget === dropZoneRef.current) setIsDragging(false); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); handleFileSelect(e.dataTransfer.files); };

  const handleUploadFiles = async () => {
    if (selectedFiles.length === 0) { await toastModal.warning('请选择至少一个文件', '提示'); return; }
    setLoadingUpload(true); setUploadProgress(0);
    try {
      const formData = new FormData();
      selectedFiles.forEach(f => formData.append('files', f));
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', e => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100)); });
      const uploadPromise = new Promise<string>((resolve, reject) => {
        xhr.addEventListener('load', () => { if (xhr.status >= 200 && xhr.status < 300) { try { JSON.parse(xhr.responseText); resolve(xhr.responseText); } catch { reject(new Error('响应解析失败')); } } else reject(new Error(`上传失败: ${xhr.status}`)); });
        xhr.addEventListener('error', () => reject(new Error('网络错误')));
        xhr.addEventListener('abort', () => reject(new Error('上传被中止')));
        xhr.open('POST', `${API_BASE}/upload-documents`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });
      const responseText = await uploadPromise;
      const data = JSON.parse(responseText);
      if (data.success) {
        setUploadProgress(100);
        await toastModal.success(`成功上传 ${data.data?.length || 0} 个文档，后台处理中...`);
        setSelectedFiles([]);
        const uploadedDocuments = data.data || [];
        const uploadedDocumentIds = uploadedDocuments.map((doc: Document) => doc.id);
        if (uploadedDocuments.length > 0) {
          setDocuments(prev => [...uploadedDocuments, ...prev]);
          setProcessingDocuments(new Set(uploadedDocumentIds));
          pollDocumentProcessing(uploadedDocumentIds);
        }
        setUploadProgress(0);
      } else await toastModal.error(`上传失败: ${data.message || '未知错误'}`);
    } catch (e) { await toastModal.error(`上传文档失败: ${e instanceof Error ? e.message : '网络错误'}`); }
    finally { setLoadingUpload(false); }
  };

  const pollDocumentProcessing = async (documentIds: string[]) => {
    const maxAttempts = 120; let attempts = 0;
    const poll = async () => {
      try {
        attempts++;
        const r = await fetch(`${API_BASE}/documents`, { headers: { 'Authorization': `Bearer ${token}` } });
        const result = await r.json();
        if (result.success && result.data) {
          const allDocs = result.data as Document[];
          setDocuments(allDocs);
          const stillProcessing: Document[] = [];
          const failedDocs: Document[] = [];
          documentIds.forEach(id => {
            const doc = allDocs.find(d => d.id === id);
            if (!doc) return;
            if (doc.status === 'failed') failedDocs.push(doc);
            else if (doc.status === 'uploaded' || doc.status === 'processing') stillProcessing.push(doc);
          });
          if (stillProcessing.length === 0) {
            setProcessingDocuments(new Set());
            if (failedDocs.length > 0) toastModal.error(`${failedDocs.length} 个文档处理失败，请重新上传`);
            else toastModal.success('所有文档处理完成！');
            fetchStats(); return;
          }
          if (attempts < maxAttempts) setTimeout(poll, 3000);
          else { setProcessingDocuments(new Set()); toastModal.warning(`${stillProcessing.length} 个文档处理超时`); fetchStats(); }
        }
      } catch (e) { if (attempts < maxAttempts) setTimeout(poll, 3000); else setProcessingDocuments(new Set()); }
    };
    poll();
  };

  // ---- Card base style ----
  const sectionStyle: React.CSSProperties = {
    background: C.surface,
    borderRadius: '14px',
    padding: '1.5rem',
    border: `1px solid ${C.border}`,
    marginBottom: '1.25rem',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    border: `1px solid ${C.border}`,
    borderRadius: C.radiusSm,
    fontSize: '0.875rem',
    fontFamily: font,
    color: C.text,
    background: C.surface,
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ fontFamily: font, color: C.text }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Stats */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
          <ChartIcon />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.text }}>知识库统计</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {[
            { label: '总文档数', value: stats.totalDocuments, color: C.primary },
            { label: '已处理', value: stats.processedDocuments, color: C.cta },
            { label: '待处理', value: stats.pendingDocuments, color: C.warning },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: C.bg, borderRadius: C.radiusSm, padding: '1rem', textAlign: 'center', border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '0.8rem', color: C.textMuted, marginTop: '6px', fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Document */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
          <PlusIcon />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.text }}>添加新文档</h3>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: '1.25rem', borderBottom: `1px solid ${C.border}` }}>
          {(['text', 'file'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: 'none', border: 'none',
              borderBottom: `2px solid ${activeTab === tab ? C.primary : 'transparent'}`,
              padding: '8px 16px',
              color: activeTab === tab ? C.primary : C.textMuted,
              fontWeight: activeTab === tab ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontFamily: font,
              transition: 'all 0.15s ease',
              marginBottom: '-1px',
            }}>
              {tab === 'text' ? '文本输入' : '文件上传'}
            </button>
          ))}
        </div>

        {activeTab === 'text' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: C.textMuted, marginBottom: '6px' }}>文档标题</label>
              <input
                type="text"
                placeholder="输入文档标题"
                value={newDoc.title}
                onChange={e => setNewDoc({ ...newDoc, title: e.target.value })}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.boxShadow = `0 0 0 3px ${C.primarySoft}`; }}
                onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: C.textMuted, marginBottom: '6px' }}>文档内容</label>
              <textarea
                placeholder="输入文档内容"
                value={newDoc.content}
                onChange={e => setNewDoc({ ...newDoc, content: e.target.value })}
                style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
                onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.boxShadow = `0 0 0 3px ${C.primarySoft}`; }}
                onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: C.textMuted, marginBottom: '6px' }}>来源（可选）</label>
              <input
                type="text"
                placeholder="输入文档来源 URL 或路径"
                value={newDoc.source}
                onChange={e => setNewDoc({ ...newDoc, source: e.target.value })}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.boxShadow = `0 0 0 3px ${C.primarySoft}`; }}
                onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <BtnPrimary onClick={handleAddDocument} disabled={loadingAdd} style={{ alignSelf: 'flex-start', opacity: loadingAdd ? 0.7 : 1, cursor: loadingAdd ? 'not-allowed' : 'pointer' }}>
              {loadingAdd ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-flex' }}><SpinIcon /></span> 处理中...</> : '添加文档'}
            </BtnPrimary>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Drop zone */}
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? C.primary : C.border}`,
                borderRadius: C.radius,
                padding: '2rem',
                textAlign: 'center',
                background: isDragging ? C.primarySoft : C.bg,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <UploadIcon />
              </div>
              <p style={{ margin: '0 0 4px', color: C.text, fontSize: '0.9rem', fontWeight: 600 }}>拖拽文件到此处，或点击选择</p>
              <p style={{ margin: 0, color: C.textMuted, fontSize: '0.8rem' }}>支持 PDF、Word、Excel、Markdown、JSON、CSV、TXT</p>
            </div>
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.md,.txt,.json" onChange={e => handleFileSelect(e.target.files!)} style={{ display: 'none' }} />

            {selectedFiles.length > 0 && (
              <>
                <p style={{ margin: 0, fontSize: '0.8rem', color: C.textMuted, fontWeight: 600 }}>已选择 {selectedFiles.length} 个文件</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedFiles.map((file, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: C.radiusSm }}>
                      <span style={{ color: C.primary, display: 'flex', flexShrink: 0 }}>{getFileIcon(file.name)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                        <div style={{ fontSize: '0.75rem', color: C.textMuted }}>{formatFileSize(file.size)}</div>
                      </div>
                      <button onClick={() => handleRemoveFile(index)} style={{ ...btnBase, background: C.dangerSoft, color: C.danger, padding: '4px 8px', fontSize: '0.75rem' }}>
                        <XIcon /> 移除
                      </button>
                    </div>
                  ))}
                </div>

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.8rem', color: C.textMuted, fontWeight: 600 }}>上传进度</span>
                      <span style={{ fontSize: '0.8rem', color: C.primary, fontWeight: 700 }}>{uploadProgress}%</span>
                    </div>
                    <div style={{ height: '6px', background: C.border, borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${uploadProgress}%`, background: C.primary, transition: 'width 0.3s ease', borderRadius: '3px' }} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <BtnPrimary onClick={handleUploadFiles} disabled={loadingUpload} style={{ opacity: loadingUpload ? 0.7 : 1, cursor: loadingUpload ? 'not-allowed' : 'pointer' }}>
                    {loadingUpload ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-flex' }}><SpinIcon /></span> 上传中...</> : <><UploadIcon />上传文件</>}
                  </BtnPrimary>
                  <BtnSecondary onClick={() => setSelectedFiles([])} disabled={loadingUpload}>
                    清空列表
                  </BtnSecondary>
                </div>
              </>
            )}

            <div style={{ padding: '10px 14px', background: C.primarySoft, borderRadius: C.radiusSm, fontSize: '0.8rem', color: C.textMuted, lineHeight: 1.6 }}>
              支持格式: PDF, Word (docx/doc), Excel (xlsx/xls), CSV, Markdown, JSON, 纯文本 &nbsp;·&nbsp; 最大单个文件 50 MB
            </div>
          </div>
        )}
      </div>

      {/* Query */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
          <SearchIcon />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.text }}>查询知识库</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <textarea
            placeholder="输入您的问题或查询内容..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
            onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.boxShadow = `0 0 0 3px ${C.primarySoft}`; }}
            onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
          />
          <BtnPrimary onClick={handleQuery} disabled={loadingQuery} style={{ alignSelf: 'flex-start', opacity: loadingQuery ? 0.7 : 1, cursor: loadingQuery ? 'not-allowed' : 'pointer' }}>
            {loadingQuery ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-flex' }}><SpinIcon /></span> 查询中...</> : <><SearchIcon /> 搜索</>}
          </BtnPrimary>

          {queryResults.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', fontWeight: 700, color: C.text }}>
                查询结果 ({queryResults.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {queryResults.map(result => (
                  <div key={result.id} style={{ padding: '14px 16px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: C.radiusSm }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: C.text }}>{result.title}</h4>
                      <span style={{ background: C.primarySoft, color: C.primary, padding: '2px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                        {(result.score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p style={{ margin: 0, color: C.textMuted, fontSize: '0.85rem', lineHeight: 1.6 }}>
                      {result.content.substring(0, 200)}...
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document list */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookIcon />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.text }}>我的文档</h3>
          </div>
          {documents.length > 0 && (
            <BtnSecondary onClick={() => { setIsBatchDeleteMode(!isBatchDeleteMode); if (isBatchDeleteMode) setSelectedDocuments(new Set()); }}
              style={{ background: isBatchDeleteMode ? C.primarySoftHover : C.primarySoft }}>
              {isBatchDeleteMode ? '退出选择' : '批量删除'}
            </BtnSecondary>
          )}
        </div>

        {processingDocuments.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: C.warningSoft, border: `1px solid rgba(245,158,11,0.2)`, borderRadius: C.radiusSm, marginBottom: '12px', fontSize: '0.85rem', color: '#92400E' }}>
            <span style={{ display: 'inline-flex', animation: 'spin 1s linear infinite' }}><SpinIcon /></span>
            {processingDocuments.size} 个文档处理中...
          </div>
        )}

        {isBatchDeleteMode && selectedDocuments.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: C.primarySoft, border: `1px solid rgba(99,102,241,0.2)`, borderRadius: C.radiusSm, marginBottom: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: C.textMuted, fontWeight: 600 }}>已选择 {selectedDocuments.size} 个文档</span>
            <BtnSecondary onClick={handleSelectAll} style={{ fontSize: '0.8rem', padding: '5px 12px' }}>
              {selectedDocuments.size === documents.length ? '取消全选' : '全选'}
            </BtnSecondary>
            <BtnDanger onClick={handleBatchDelete} disabled={loadingBatchDelete} style={{ opacity: loadingBatchDelete ? 0.7 : 1, cursor: loadingBatchDelete ? 'not-allowed' : 'pointer' }}>
              {loadingBatchDelete ? '删除中...' : <><TrashIcon /> 删除 {selectedDocuments.size} 个</>}
            </BtnDanger>
          </div>
        )}

        {documents.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {documents.map(doc => (
              <div
                key={doc.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px',
                  background: selectedDocuments.has(doc.id) ? C.primarySoft : C.bg,
                  border: `1px solid ${selectedDocuments.has(doc.id) ? 'rgba(99,102,241,0.25)' : C.border}`,
                  borderRadius: C.radiusSm,
                  transition: 'all 0.15s ease',
                }}
              >
                {isBatchDeleteMode && (
                  <input
                    type="checkbox"
                    checked={selectedDocuments.has(doc.id)}
                    onChange={() => handleDocumentSelect(doc.id)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: C.primary, flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: C.text, marginBottom: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <StatusBadge status={doc.status} />
                    <span style={{ fontSize: '0.75rem', color: C.textMuted }}>
                      {new Date(doc.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                    {doc.status === 'failed' && doc.processingError && (
                      <span style={{ fontSize: '0.72rem', color: C.danger }}>
                        {doc.processingError.substring(0, 80)}
                      </span>
                    )}
                  </div>
                </div>
                {!isBatchDeleteMode && (
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {(doc.status === 'uploaded' || doc.status === 'failed') && (
                      <BtnSecondary
                        onClick={() => handleReprocessDocument(doc.id)}
                        disabled={loadingReprocess === doc.id}
                        style={{ fontSize: '0.8rem', padding: '5px 10px', opacity: loadingReprocess === doc.id ? 0.7 : 1 }}
                        title={doc.status === 'failed' ? '重新处理此文档' : '手动处理此文档'}
                      >
                        <RefreshIcon />
                        {loadingReprocess === doc.id ? '处理中...' : '重新处理'}
                      </BtnSecondary>
                    )}
                    <BtnDanger
                      onClick={() => handleDeleteDocument(doc.id)}
                      style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                    >
                      <TrashIcon /> 删除
                    </BtnDanger>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: C.textMuted, fontSize: '0.9rem' }}>
            暂无文档，请先添加
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeBase;
