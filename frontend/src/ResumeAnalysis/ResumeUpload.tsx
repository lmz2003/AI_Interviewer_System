import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToastModal } from '../components/ui/toast-modal';

// ---- Design tokens ----
const C = {
  primary: '#6366F1',
  primaryHover: '#4F46E5',
  primarySoft: 'rgba(99,102,241,0.08)',
  primarySoftHover: 'rgba(99,102,241,0.14)',
  bg: '#F7F6FF',
  surface: '#FFFFFF',
  border: '#EAE8F8',
  text: '#1E1B4B',
  textMuted: '#6B7280',
  danger: '#EF4444',
  dangerSoft: 'rgba(239,68,68,0.08)',
  radius: '10px',
  radiusSm: '6px',
  font: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// ---- SVG Icons ----
const UploadSvg = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const FileIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
  </svg>
);
const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
const SpinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);
const ArrowLeftIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
);

const ResumeUpload: React.FC = () => {
  const navigate = useNavigate();
  const { error, success } = useToastModal();
  const [uploadType, setUploadType] = useState<'file' | 'text'>('file');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragActive(true); };
  const handleDragLeave = () => setIsDragActive(false);
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragActive(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const f = files[0];
      const supported = ['.pdf', '.docx', '.doc', '.txt'];
      const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
      if (supported.includes(ext)) { setFile(f); setTitle(f.name.replace(/\.[^.]+$/, '')); }
      else error(`仅支持 ${supported.join(', ')} 格式`, '文件类型不支持');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files?.length) { setFile(files[0]); setTitle(files[0].name.replace(/\.[^.]+$/, '')); }
  };

  const handleRemoveFile = () => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

  const clearForm = () => {
    setTitle(''); setContent(''); setJobDescription(''); setFile(null); setUploadType('file');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!title.trim()) { error('请输入简历标题', '标题缺失'); return; }
    if (uploadType === 'file' && !file) { error('请选择要上传的文件', '文件缺失'); return; }
    if (uploadType === 'text' && !content.trim()) { error('请输入简历内容', '内容缺失'); return; }

    try {
      setLoading(true); setProgress(0);
      const token = localStorage.getItem('token');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const formData = new FormData();
      formData.append('title', title);
      if (jobDescription.trim()) formData.append('jobDescription', jobDescription);
      if (uploadType === 'file' && file) formData.append('file', file);
      else formData.append('content', content);

      const progressInterval = setInterval(() => { setProgress(prev => prev < 90 ? prev + Math.random() * 30 : prev); }, 500);
      const response = await fetch(`${apiBaseUrl}/resume-analysis/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
      clearInterval(progressInterval);
      setProgress(100);
      if (!response.ok) { const e = await response.json(); throw new Error(e.message || 'Upload failed'); }
      success('简历已上传，正在分析中...', '上传成功');
      clearForm();
      setTimeout(() => navigate('/dashboard/resume'), 1000);
    } catch (err) {
      error(err instanceof Error ? err.message : 'Upload failed', '上传失败');
    } finally { setLoading(false); setProgress(0); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: C.radiusSm,
    fontSize: '0.875rem', fontFamily: C.font, color: C.text, background: C.surface,
    outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: C.textMuted, marginBottom: '6px' };
  const btnBase: React.CSSProperties = { border: 'none', borderRadius: C.radiusSm, fontFamily: C.font, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s ease' };

  return (
    <div style={{ fontFamily: C.font, color: C.text, maxWidth: '720px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Back + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/dashboard/resume')}
          style={{ ...btnBase, background: C.primarySoft, color: C.primary, padding: '6px 12px', fontSize: '0.82rem' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.primarySoftHover}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = C.primarySoft}
        >
          <ArrowLeftIcon /> 返回
        </button>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: C.text, letterSpacing: '-0.01em' }}>上传简历</h2>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}` }}>
          {(['file', 'text'] as const).map(tab => (
            <button key={tab} onClick={() => setUploadType(tab)} style={{
              background: 'none', border: 'none',
              borderBottom: `2px solid ${uploadType === tab ? C.primary : 'transparent'}`,
              padding: '8px 16px', marginBottom: '-1px',
              color: uploadType === tab ? C.primary : C.textMuted,
              fontWeight: uploadType === tab ? 700 : 500,
              fontSize: '0.875rem', cursor: 'pointer', fontFamily: C.font,
              transition: 'all 0.15s',
            }}>
              {tab === 'file' ? '上传文件' : '粘贴内容'}
            </button>
          ))}
        </div>

        {/* Title */}
        <div>
          <label style={labelStyle}>简历标题</label>
          <input
            type="text"
            placeholder="例如：张三_2024年前端简历"
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={loading}
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.boxShadow = `0 0 0 3px ${C.primarySoft}`; }}
            onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Job description */}
        <div>
          <label style={labelStyle}>
            职位描述
            <span style={{ color: '#9CA3AF', marginLeft: '6px', fontWeight: 400 }}>(可选，用于对标匹配度)</span>
          </label>
          <textarea
            placeholder="粘贴职位描述，AI 将对比简历与岗位的匹配度..."
            value={jobDescription}
            onChange={e => setJobDescription(e.target.value)}
            disabled={loading}
            style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
            onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.boxShadow = `0 0 0 3px ${C.primarySoft}`; }}
            onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Upload zone or textarea */}
        {uploadType === 'file' ? (
          <div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !loading && fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragActive ? C.primary : C.border}`,
                borderRadius: C.radius,
                padding: '2.5rem 2rem',
                textAlign: 'center',
                background: isDragActive ? C.primarySoft : C.bg,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}><UploadSvg /></div>
              <p style={{ margin: '0 0 4px', fontSize: '0.9rem', fontWeight: 600, color: C.text }}>拖拽简历文件到此处</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: C.textMuted }}>或点击选择 · 支持 PDF、DOCX、DOC、TXT</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleFileSelect} disabled={loading} style={{ display: 'none' }} />

            {file && (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: C.radiusSm }}>
                <span style={{ color: C.primary, display: 'flex' }}><FileIcon /></span>
                <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                <button
                  onClick={handleRemoveFile}
                  disabled={loading}
                  style={{ ...btnBase, background: C.dangerSoft, color: C.danger, padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  <XIcon /> 移除
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label style={labelStyle}>简历内容</label>
            <textarea
              placeholder="粘贴你的简历内容..."
              value={content}
              onChange={e => setContent(e.target.value)}
              disabled={loading}
              style={{ ...inputStyle, minHeight: '200px', resize: 'vertical' }}
              onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.boxShadow = `0 0 0 3px ${C.primarySoft}`; }}
              onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        )}

        {/* Progress bar */}
        {progress > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: C.textMuted, fontWeight: 600 }}>上传进度</span>
              <span style={{ fontSize: '0.8rem', color: C.primary, fontWeight: 700 }}>{Math.round(progress)}%</span>
            </div>
            <div style={{ height: '5px', background: C.border, borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: C.primary, transition: 'width 0.25s ease', borderRadius: '3px' }} />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/dashboard/resume')}
            disabled={loading}
            style={{ ...btnBase, background: C.primarySoft, color: C.primary, padding: '10px 20px', fontSize: '0.9rem', opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = C.primarySoftHover; }}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = C.primarySoft}
          >
            取消
          </button>
          <button
            onClick={handleUpload}
            disabled={loading}
            style={{ ...btnBase, background: loading ? C.primarySoft : C.primary, color: loading ? C.textMuted : 'white', padding: '10px 24px', fontSize: '0.9rem', opacity: loading ? 0.8 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = C.primaryHover; }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = C.primary; }}
          >
            {loading ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-flex' }}><SpinIcon /></span> 上传中...</> : '上传并分析'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeUpload;
