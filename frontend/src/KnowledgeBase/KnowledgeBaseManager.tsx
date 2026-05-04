import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToastModal } from '../components/ui/toast-modal';
import { useTheme } from '../hooks/useTheme';
import { libraryApi, documentApi, queryApi, statsApi } from './api';
import type { KnowledgeLibrary, KnowledgeDocument, CreateLibraryDto, QueryResult } from './types';

const font = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const getThemeColors = (isDark: boolean) => ({
  primary: isDark ? '#818CF8' : '#6366F1',
  primaryHover: isDark ? '#6366F1' : '#4F46E5',
  primarySoft: isDark ? 'rgba(129,140,248,0.1)' : 'rgba(99,102,241,0.08)',
  primarySoftHover: isDark ? 'rgba(129,140,248,0.16)' : 'rgba(99,102,241,0.14)',
  bg: isDark ? '#0F0F1A' : '#F7F6FF',
  surface: isDark ? '#16162A' : '#FFFFFF',
  surfaceHover: isDark ? '#1E1E38' : '#F0EEFA',
  border: isDark ? '#2D2D52' : '#EAE8F8',
  text: isDark ? '#F1F0FF' : '#1E1B4B',
  textMuted: isDark ? '#A8A5C7' : '#6B7280',
  danger: isDark ? '#FF6B6B' : '#EF4444',
  dangerSoft: isDark ? 'rgba(255,107,107,0.15)' : 'rgba(239,68,68,0.08)',
  warning: '#FDB022',
  warningSoft: isDark ? 'rgba(253,176,34,0.15)' : 'rgba(245,158,11,0.1)',
  success: '#10B981',
  successSoft: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)',
  accent: isDark ? '#818CF8' : '#6366F1',
  radius: '10px',
  radiusSm: '6px',
});

type ThemeColors = ReturnType<typeof getThemeColors>;

const DatabaseIcon = ({ color = 'currentColor' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const UploadIcon = ({ color = 'currentColor' }: { color?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const FileIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

const SpinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

const StatusBadge: React.FC<{ status: string; colors: ThemeColors }> = ({ status, colors: C }) => {
  const cfg: Record<string, { label: string; color: string; bg: string }> = {
    processed: { label: '已处理', color: C.success, bg: C.successSoft },
    processing: { label: '处理中', color: C.warning, bg: C.warningSoft },
    uploaded: { label: '待处理', color: C.textMuted, bg: 'rgba(107,114,128,0.08)' },
    failed: { label: '处理失败', color: C.danger, bg: C.dangerSoft },
  };
  const { label, color, bg } = cfg[status] || cfg.uploaded;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: bg, color, padding: '2px 8px',
      borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600,
    }}>
      {status === 'processing' && <SpinIcon />}
      {label}
    </span>
  );
};

const KnowledgeBaseManager: React.FC = () => {
  const toastModal = useToastModal();
  const { isDark } = useTheme();
  const C = getThemeColors(isDark);

  const [libraries, setLibraries] = useState<KnowledgeLibrary[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalDocuments: 0, processedDocuments: 0, pendingDocuments: 0 });
  const [loading, setLoading] = useState(false);

  const [showCreateLibrary, setShowCreateLibrary] = useState(false);
  const [newLibrary, setNewLibrary] = useState<CreateLibraryDto>({ name: '', description: '' });

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLibraryId, setUploadLibraryId] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [queryText, setQueryText] = useState('');
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [querying, setQuerying] = useState(false);
  const [searchMode, setSearchMode] = useState<'all' | 'specific'>('all');
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<Set<string>>(new Set());
  const [useAdvancedSearch, setUseAdvancedSearch] = useState(true);
  const [advancedOptions, setAdvancedOptions] = useState({
    useHybridSearch: true,
    useQueryOptimization: true,
    useReranking: true,
    useHyDE: false,
  });

  const [activeTab, setActiveTab] = useState<'libraries' | 'documents' | 'search'>('libraries');

  const fetchLibraries = useCallback(async () => {
    try {
      const data = await libraryApi.getLibraries();
      setLibraries(data);
    } catch (e) {
      console.error('获取知识库列表失败:', e);
    }
  }, []);

  const fetchDocuments = useCallback(async (libraryId?: string) => {
    try {
      const data = await documentApi.getDocuments(libraryId);
      setDocuments(data);
    } catch (e) {
      console.error('获取文档列表失败:', e);
    }
  }, []);

  const fetchStats = useCallback(async (libraryId?: string) => {
    try {
      const data = await statsApi.getStatistics(libraryId);
      setStats(data);
    } catch (e) {
      console.error('获取统计信息失败:', e);
    }
  }, []);

  useEffect(() => {
    fetchLibraries();
    fetchStats();
  }, [fetchLibraries, fetchStats]);

  useEffect(() => {
    if (selectedLibraryId) {
      fetchDocuments(selectedLibraryId);
      fetchStats(selectedLibraryId);
    } else {
      fetchDocuments();
      fetchStats();
    }
  }, [selectedLibraryId, fetchDocuments, fetchStats]);

  const handleCreateLibrary = async () => {
    if (!newLibrary.name.trim()) {
      await toastModal.warning('请输入知识库名称', '验证失败');
      return;
    }
    setLoading(true);
    try {
      await libraryApi.createLibrary(newLibrary);
      await toastModal.success('知识库创建成功');
      setShowCreateLibrary(false);
      setNewLibrary({ name: '', description: '' });
      fetchLibraries();
    } catch (e) {
      await toastModal.error(`创建失败: ${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLibrary = async (libraryId: string, libraryName: string) => {
    if (!await toastModal.confirm(`确定要删除知识库"${libraryName}"吗？该知识库下的文档将保留但不再关联知识库。`, '确认删除')) {
      return;
    }
    try {
      await libraryApi.deleteLibrary(libraryId);
      await toastModal.success('知识库已删除');
      if (selectedLibraryId === libraryId) {
        setSelectedLibraryId(null);
      }
      fetchLibraries();
    } catch (e) {
      await toastModal.error(`删除失败: ${e instanceof Error ? e.message : '未知错误'}`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter(file => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        const supported = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.md', '.txt', '.json'];
        return supported.includes(ext) && file.size <= 50 * 1024 * 1024;
      });
      if (validFiles.length !== files.length) {
        toastModal.warning('部分文件格式不支持或超过50MB限制', '文件过滤');
      }
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      await toastModal.warning('请选择要上传的文件', '提示');
      return;
    }
    setUploading(true);
    try {
      await documentApi.uploadDocuments(selectedFiles, uploadLibraryId || undefined);
      await toastModal.success(`成功上传 ${selectedFiles.length} 个文件`);
      setShowUploadModal(false);
      setSelectedFiles([]);
      setUploadLibraryId('');
      fetchDocuments(selectedLibraryId || undefined);
      fetchStats(selectedLibraryId || undefined);
    } catch (e) {
      await toastModal.error(`上传失败: ${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!await toastModal.confirm('确定要删除此文档吗？', '确认删除')) {
      return;
    }
    try {
      await documentApi.deleteDocument(docId);
      await toastModal.success('文档已删除');
      fetchDocuments(selectedLibraryId || undefined);
      fetchStats(selectedLibraryId || undefined);
    } catch (e) {
      await toastModal.error(`删除失败: ${e instanceof Error ? e.message : '未知错误'}`);
    }
  };

  const handleReprocess = async (docId: string) => {
    try {
      await documentApi.reprocessDocument(docId);
      await toastModal.success('文档已提交重新处理');
      fetchDocuments(selectedLibraryId || undefined);
    } catch (e) {
      await toastModal.error(`重新处理失败: ${e instanceof Error ? e.message : '未知错误'}`);
    }
  };

  const handleQuery = async () => {
    if (!queryText.trim()) {
      await toastModal.warning('请输入查询内容', '提示');
      return;
    }
    setQuerying(true);
    try {
      const libraryIds = searchMode === 'specific' ? Array.from(selectedLibraryIds) : undefined;
      
      if (useAdvancedSearch) {
        const results = await queryApi.advancedQuery(queryText, {
          ...advancedOptions,
          topK: 10,
          threshold: 0.3,
          rerankTopN: 5,
          libraryIds,
        });
        setQueryResults(results);
        if (results.length === 0) {
          await toastModal.info('未找到相关文档');
        } else {
          const strategy = results[0]?.searchStrategy || 'unknown';
          await toastModal.success(`找到 ${results.length} 个相关文档 (${strategy})`);
        }
      } else {
        const results = await queryApi.queryKnowledge({
          query: queryText,
          topK: 10,
          threshold: 0.3,
          libraryIds,
          searchMode,
        });
        setQueryResults(results);
        if (results.length === 0) {
          await toastModal.info('未找到相关文档');
        }
      }
    } catch (e) {
      await toastModal.error(`查询失败: ${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setQuerying(false);
    }
  };

  const toggleLibrarySelection = (libraryId: string) => {
    const newSet = new Set(selectedLibraryIds);
    if (newSet.has(libraryId)) {
      newSet.delete(libraryId);
    } else {
      newSet.add(libraryId);
    }
    setSelectedLibraryIds(newSet);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  const getTabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: C.radiusSm, border: 'none',
    background: active ? C.primary : 'transparent',
    color: active ? 'white' : C.textMuted, cursor: 'pointer',
    fontWeight: 600, fontSize: '0.875rem', transition: 'all 0.15s ease',
  });

  const getLibraryCardStyle = (selected: boolean): React.CSSProperties => ({
    padding: '16px', background: C.surface, borderRadius: C.radius,
    border: `2px solid ${selected ? C.primary : C.border}`,
    cursor: 'pointer', transition: 'all 0.15s ease',
  });

  const getDropZoneStyle = (dragging: boolean): React.CSSProperties => ({
    border: `2px dashed ${dragging ? C.primary : C.border}`,
    borderRadius: C.radius, padding: '32px', textAlign: 'center',
    background: dragging ? C.primarySoft : 'transparent',
    cursor: 'pointer', transition: 'all 0.15s ease',
  });

  const getRadioButtonStyle = (selected: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px',
    borderRadius: C.radiusSm, border: `1px solid ${selected ? C.primary : C.border}`,
    background: selected ? C.primarySoft : 'transparent',
    color: selected ? C.primary : C.textMuted, cursor: 'pointer',
    fontSize: '0.875rem', fontWeight: 500, transition: 'all 0.15s ease',
  });

  const getLibraryChipStyle = (selected: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
    borderRadius: '100px', border: `1px solid ${selected ? C.primary : C.border}`,
    background: selected ? C.primarySoft : 'transparent',
    color: selected ? C.primary : C.textMuted, cursor: 'pointer',
    fontSize: '0.875rem', transition: 'all 0.15s ease',
  });

  const styles: Record<string, React.CSSProperties> = {
    container: {
      padding: '24px',
      maxWidth: '1400px',
      margin: '0 auto',
      fontFamily: font,
      background: C.bg,
      minHeight: '100vh',
    },
    header: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: '24px', flexWrap: 'wrap', gap: '16px',
    },
    title: {
      fontSize: '1.75rem', fontWeight: 700, color: C.text, margin: 0,
    },
    tabs: {
      display: 'flex', gap: '4px', background: C.surface, padding: '4px',
      borderRadius: C.radius, border: `1px solid ${C.border}`,
    },
    statsRow: {
      display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap',
    },
    statCard: {
      flex: '1', minWidth: '180px', padding: '16px', background: C.surface,
      borderRadius: C.radius, border: `1px solid ${C.border}`,
    },
    statLabel: { fontSize: '0.875rem', color: C.textMuted, marginBottom: '4px' },
    statValue: { fontSize: '1.5rem', fontWeight: 700, color: C.text },
    card: {
      background: C.surface, borderRadius: C.radius, border: `1px solid ${C.border}`,
      marginBottom: '16px', overflow: 'hidden',
    },
    cardHeader: {
      padding: '16px', borderBottom: `1px solid ${C.border}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    },
    cardTitle: { fontSize: '1rem', fontWeight: 600, color: C.text, margin: 0 },
    cardBody: { padding: '16px' },
    btn: {
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '8px 16px', borderRadius: C.radiusSm, border: 'none',
      fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    btnPrimary: {
      background: C.primary, color: 'white',
    },
    btnSecondary: {
      background: C.primarySoft, color: C.primary,
    },
    btnDanger: {
      background: C.dangerSoft, color: C.danger,
    },
    libraryGrid: {
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '16px',
    },
    libraryName: { fontSize: '1rem', fontWeight: 600, color: C.text, marginBottom: '8px' },
    libraryDesc: { fontSize: '0.875rem', color: C.textMuted, marginBottom: '12px' },
    libraryActions: { display: 'flex', gap: '8px' },
    documentList: { display: 'flex', flexDirection: 'column', gap: '12px' },
    documentItem: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
      borderRadius: C.radiusSm, gap: '12px',
    },
    documentInfo: { flex: 1, minWidth: 0 },
    documentTitle: { fontWeight: 600, color: C.text, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    documentMeta: { fontSize: '0.75rem', color: C.textMuted },
    documentActions: { display: 'flex', gap: '8px', alignItems: 'center' },
    iconBtn: {
      padding: '6px', background: 'transparent', border: 'none',
      borderRadius: C.radiusSm, cursor: 'pointer', color: C.textMuted,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.15s ease',
    },
    modal: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    },
    modalContent: {
      background: C.surface, borderRadius: C.radius, padding: '24px',
      maxWidth: '500px', width: '90%', maxHeight: '90vh', overflow: 'auto',
    },
    modalTitle: { fontSize: '1.25rem', fontWeight: 600, color: C.text, marginBottom: '16px' },
    input: {
      width: '100%', padding: '10px 12px', borderRadius: C.radiusSm,
      border: `1px solid ${C.border}`, background: isDark ? 'rgba(255,255,255,0.05)' : 'white',
      color: C.text, fontSize: '0.875rem', marginBottom: '12px',
    },
    textarea: {
      width: '100%', padding: '10px 12px', borderRadius: C.radiusSm,
      border: `1px solid ${C.border}`, background: isDark ? 'rgba(255,255,255,0.05)' : 'white',
      color: C.text, fontSize: '0.875rem', marginBottom: '12px', minHeight: '80px',
      resize: 'vertical',
    },
    select: {
      width: '100%', padding: '10px 12px', borderRadius: C.radiusSm,
      border: `1px solid ${C.border}`, background: isDark ? 'rgba(255,255,255,0.05)' : 'white',
      color: C.text, fontSize: '0.875rem', marginBottom: '12px',
    },
    fileList: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' },
    fileItem: {
      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      borderRadius: C.radiusSm,
    },
    searchSection: { marginBottom: '16px' },
    searchRow: { display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' },
    searchInput: { flex: 1, minWidth: '200px' },
    modeToggle: { display: 'flex', gap: '8px', alignItems: 'center' },
    librarySelector: {
      display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px',
    },
    resultItem: {
      padding: '12px', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
      borderRadius: C.radiusSm, marginBottom: '8px',
    },
    resultTitle: { fontWeight: 600, color: C.text, marginBottom: '4px' },
    resultContent: { fontSize: '0.875rem', color: C.textMuted, lineHeight: 1.5 },
    resultScore: {
      display: 'inline-block', padding: '2px 8px', borderRadius: '100px',
      background: C.successSoft, color: C.success, fontSize: '0.75rem', fontWeight: 600,
      marginLeft: '8px',
    },
    emptyState: {
      textAlign: 'center', padding: '48px', color: C.textMuted,
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>知识库管理</h1>
        <div style={styles.tabs}>
          <button style={getTabStyle(activeTab === 'libraries')} onClick={() => setActiveTab('libraries')}>
            知识库
          </button>
          <button style={getTabStyle(activeTab === 'documents')} onClick={() => setActiveTab('documents')}>
            文档管理
          </button>
          <button style={getTabStyle(activeTab === 'search')} onClick={() => setActiveTab('search')}>
            知识检索
          </button>
        </div>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>总文档数</div>
          <div style={styles.statValue}>{stats.totalDocuments}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>已处理</div>
          <div style={{ ...styles.statValue, color: C.success }}>{stats.processedDocuments}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>待处理</div>
          <div style={{ ...styles.statValue, color: C.warning }}>{stats.pendingDocuments}</div>
        </div>
      </div>

      {activeTab === 'libraries' && (
        <div>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>我的知识库</h2>
              <button
                style={{ ...styles.btn, ...styles.btnPrimary }}
                onClick={() => setShowCreateLibrary(true)}
              >
                <PlusIcon /> 新建知识库
              </button>
            </div>
            <div style={styles.cardBody}>
              {libraries.length === 0 ? (
                <div style={styles.emptyState}>
                  <DatabaseIcon color={C.textMuted} />
                  <p style={{ marginTop: '12px' }}>暂无知识库，点击上方按钮创建</p>
                </div>
              ) : (
                <div style={styles.libraryGrid}>
                  {libraries.map(library => (
                    <div
                      key={library.id}
                      style={getLibraryCardStyle(selectedLibraryId === library.id)}
                      onClick={() => setSelectedLibraryId(selectedLibraryId === library.id ? null : library.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <DatabaseIcon color={library.color || C.primary} />
                        <span style={styles.libraryName}>{library.name}</span>
                      </div>
                      <div style={styles.libraryDesc}>
                        {library.description || '暂无描述'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: C.textMuted, marginBottom: '12px' }}>
                        创建于 {formatDate(library.createdAt)}
                      </div>
                      <div style={styles.libraryActions}>
                        <button
                          style={{ ...styles.btn, ...styles.btnSecondary }}
                          onClick={(e) => { e.stopPropagation(); handleDeleteLibrary(library.id, library.name); }}
                        >
                          <TrashIcon /> 删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>
                {selectedLibraryId
                  ? `文档列表 - ${libraries.find(l => l.id === selectedLibraryId)?.name || '未知知识库'}`
                  : '全部文档'}
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedLibraryId && (
                  <button
                    style={{ ...styles.btn, ...styles.btnSecondary }}
                    onClick={() => setSelectedLibraryId(null)}
                  >
                    查看全部
                  </button>
                )}
                <button
                  style={{ ...styles.btn, ...styles.btnPrimary }}
                  onClick={() => setShowUploadModal(true)}
                >
                  <UploadIcon color="white" /> 上传文档
                </button>
              </div>
            </div>
            <div style={styles.cardBody}>
              {documents.length === 0 ? (
                <div style={styles.emptyState}>
                  <FileIcon />
                  <p style={{ marginTop: '12px' }}>暂无文档，点击上方按钮上传</p>
                </div>
              ) : (
                <div style={styles.documentList}>
                  {documents.map(doc => (
                    <div key={doc.id} style={styles.documentItem}>
                      <div style={styles.documentInfo}>
                        <div style={styles.documentTitle}>{doc.title}</div>
                        <div style={styles.documentMeta}>
                          {doc.fileName && <span>{doc.fileName} · </span>}
                          {doc.fileSize && <span>{formatFileSize(doc.fileSize)} · </span>}
                          {formatDate(doc.createdAt)}
                          {doc.library?.name && <span> · {doc.library.name}</span>}
                        </div>
                      </div>
                      <StatusBadge status={doc.status} colors={C} />
                      <div style={styles.documentActions}>
                        {doc.status === 'failed' && (
                          <button
                            style={{ ...styles.btn, ...styles.btnSecondary }}
                            onClick={() => handleReprocess(doc.id)}
                            title="重新处理"
                          >
                            <RefreshIcon />
                          </button>
                        )}
                        <button
                          style={{ ...styles.iconBtn, color: C.danger }}
                          onClick={() => handleDeleteDocument(doc.id)}
                          title="删除"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'search' && (
        <div>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>知识检索</h2>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.searchSection}>
                <div style={styles.searchRow}>
                  <input
                    type="text"
                    placeholder="输入查询内容..."
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    style={{ ...styles.input, ...styles.searchInput }}
                    onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
                  />
                  <button
                    style={{ ...styles.btn, ...styles.btnPrimary }}
                    onClick={handleQuery}
                    disabled={querying}
                  >
                    {querying ? <SpinIcon /> : <SearchIcon />} 搜索
                  </button>
                </div>

                <div style={styles.modeToggle}>
                  <div
                    style={getRadioButtonStyle(searchMode === 'all')}
                    onClick={() => setSearchMode('all')}
                  >
                    {searchMode === 'all' && <CheckIcon />}
                    全部检索
                  </div>
                  <div
                    style={getRadioButtonStyle(searchMode === 'specific')}
                    onClick={() => setSearchMode('specific')}
                  >
                    {searchMode === 'specific' && <CheckIcon />}
                    分库检索
                  </div>
                </div>

                <div style={{ 
                  marginTop: '12px', 
                  padding: '12px', 
                  backgroundColor: C.surfaceHover, 
                  borderRadius: '8px',
                  border: `1px solid ${C.border}`
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: useAdvancedSearch ? '12px' : '0'
                  }}>
                    <span style={{ color: C.text, fontSize: '0.875rem', fontWeight: 500 }}>
                      高级检索优化
                    </span>
                    <div
                      onClick={() => setUseAdvancedSearch(!useAdvancedSearch)}
                      style={{
                        width: '44px',
                        height: '24px',
                        borderRadius: '12px',
                        backgroundColor: useAdvancedSearch ? C.accent : C.border,
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: 'white',
                        position: 'absolute',
                        top: '2px',
                        left: useAdvancedSearch ? '22px' : '2px',
                        transition: 'all 0.2s'
                      }} />
                    </div>
                  </div>

                  {useAdvancedSearch && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '8px',
                        backgroundColor: advancedOptions.useHybridSearch ? `${C.accent}15` : 'transparent',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}>
                        <input
                          type="checkbox"
                          checked={advancedOptions.useHybridSearch}
                          onChange={(e) => setAdvancedOptions({ ...advancedOptions, useHybridSearch: e.target.checked })}
                          style={{ accentColor: C.accent }}
                        />
                        <span style={{ color: C.text }}>混合检索</span>
                      </label>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '8px',
                        backgroundColor: advancedOptions.useQueryOptimization ? `${C.accent}15` : 'transparent',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}>
                        <input
                          type="checkbox"
                          checked={advancedOptions.useQueryOptimization}
                          onChange={(e) => setAdvancedOptions({ ...advancedOptions, useQueryOptimization: e.target.checked })}
                          style={{ accentColor: C.accent }}
                        />
                        <span style={{ color: C.text }}>查询优化</span>
                      </label>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '8px',
                        backgroundColor: advancedOptions.useReranking ? `${C.accent}15` : 'transparent',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}>
                        <input
                          type="checkbox"
                          checked={advancedOptions.useReranking}
                          onChange={(e) => setAdvancedOptions({ ...advancedOptions, useReranking: e.target.checked })}
                          style={{ accentColor: C.accent }}
                        />
                        <span style={{ color: C.text }}>重排序</span>
                      </label>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '8px',
                        backgroundColor: advancedOptions.useHyDE ? `${C.accent}15` : 'transparent',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}>
                        <input
                          type="checkbox"
                          checked={advancedOptions.useHyDE}
                          onChange={(e) => setAdvancedOptions({ ...advancedOptions, useHyDE: e.target.checked })}
                          style={{ accentColor: C.accent }}
                        />
                        <span style={{ color: C.text }}>HyDE</span>
                      </label>
                    </div>
                  )}
                </div>

                {searchMode === 'specific' && libraries.length > 0 && (
                  <div style={styles.librarySelector}>
                    <span style={{ color: C.textMuted, fontSize: '0.875rem', marginRight: '8px' }}>
                      选择知识库:
                    </span>
                    {libraries.map(library => (
                      <div
                        key={library.id}
                        style={getLibraryChipStyle(selectedLibraryIds.has(library.id))}
                        onClick={() => toggleLibrarySelection(library.id)}
                      >
                        {selectedLibraryIds.has(library.id) && <CheckIcon />}
                        {library.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {queryResults.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.875rem', color: C.textMuted, marginBottom: '12px' }}>
                    搜索结果 ({queryResults.length})
                  </h3>
                  {queryResults.map((result, index) => (
                    <div key={result.id || index} style={styles.resultItem}>
                      <div style={styles.resultTitle}>
                        {result.title}
                        <span style={styles.resultScore}>
                          {(result.score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div style={styles.resultContent}>
                        {result.content.substring(0, 300)}
                        {result.content.length > 300 && '...'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreateLibrary && (
        <div style={styles.modal} onClick={() => setShowCreateLibrary(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>新建知识库</h3>
            <input
              type="text"
              placeholder="知识库名称"
              value={newLibrary.name}
              onChange={(e) => setNewLibrary({ ...newLibrary, name: e.target.value })}
              style={styles.input}
            />
            <textarea
              placeholder="知识库描述（可选）"
              value={newLibrary.description || ''}
              onChange={(e) => setNewLibrary({ ...newLibrary, description: e.target.value })}
              style={styles.textarea}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                style={{ ...styles.btn, ...styles.btnSecondary }}
                onClick={() => setShowCreateLibrary(false)}
              >
                取消
              </button>
              <button
                style={{ ...styles.btn, ...styles.btnPrimary }}
                onClick={handleCreateLibrary}
                disabled={loading}
              >
                {loading ? <SpinIcon /> : <PlusIcon />} 创建
              </button>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div style={styles.modal} onClick={() => setShowUploadModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>上传文档</h3>
            
            <label style={{ fontSize: '0.875rem', color: C.textMuted, marginBottom: '4px', display: 'block' }}>
              选择目标知识库（可选）
            </label>
            <select
              value={uploadLibraryId}
              onChange={(e) => setUploadLibraryId(e.target.value)}
              style={styles.select}
            >
              <option value="">不指定知识库</option>
              {libraries.map(library => (
                <option key={library.id} value={library.id}>{library.name}</option>
              ))}
            </select>

            <div
              style={getDropZoneStyle(false)}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon color={C.primary} />
              <p style={{ margin: '12px 0 4px', color: C.text }}>点击或拖拽文件到此处上传</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: C.textMuted }}>
                支持 PDF, DOCX, XLSX, CSV, MD, TXT, JSON 格式，单个文件最大 50MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.md,.txt,.json"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />

            {selectedFiles.length > 0 && (
              <div style={styles.fileList}>
                <div style={{ fontSize: '0.875rem', color: C.textMuted, marginBottom: '8px' }}>
                  已选择 {selectedFiles.length} 个文件
                </div>
                {selectedFiles.map((file, index) => (
                  <div key={index} style={styles.fileItem}>
                    <FileIcon />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: C.textMuted }}>
                      {formatFileSize(file.size)}
                    </span>
                    <button
                      style={styles.iconBtn}
                      onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                    >
                      <XIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                style={{ ...styles.btn, ...styles.btnSecondary }}
                onClick={() => { setShowUploadModal(false); setSelectedFiles([]); }}
              >
                取消
              </button>
              <button
                style={{ ...styles.btn, ...styles.btnPrimary }}
                onClick={handleUpload}
                disabled={uploading || selectedFiles.length === 0}
              >
                {uploading ? <SpinIcon /> : <UploadIcon color="white" />} 上传
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default KnowledgeBaseManager;
