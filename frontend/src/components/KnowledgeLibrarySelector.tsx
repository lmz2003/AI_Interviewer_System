import React, { useState, useEffect, useCallback } from 'react';
import { libraryApi } from '../KnowledgeBase/api';
import type { KnowledgeLibrary } from '../KnowledgeBase/types';

// ---- Design tokens (theme-aware) ----
const font = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const getThemeColors = (isDark: boolean) => ({
  primary: isDark ? '#818CF8' : '#6366F1',
  primaryHover: isDark ? '#6366F1' : '#4F46E5',
  primarySoft: isDark ? 'rgba(129,140,248,0.1)' : 'rgba(99,102,241,0.08)',
  bg: isDark ? '#0F0F1A' : '#F7F6FF',
  surface: isDark ? '#16162A' : '#FFFFFF',
  surfaceHover: isDark ? '#1E1E38' : '#F0EEFA',
  border: isDark ? '#2D2D52' : '#EAE8F8',
  text: isDark ? '#F1F0FF' : '#1E1B4B',
  textMuted: isDark ? '#A8A5C7' : '#6B7280',
  danger: isDark ? '#FF6B6B' : '#EF4444',
  overlay: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)',
  radius: '10px',
  shadow: isDark ? '0 10px 40px rgba(0,0,0,0.5)' : '0 10px 40px rgba(0,0,0,0.16)',
  btnSecondary: isDark ? '#2D2D52' : '#e2e8f0',
  btnSecondaryHover: isDark ? '#3D3D62' : '#cbd5e1',
  btnSecondaryText: isDark ? '#F1F0FF' : '#0f172a',
});

interface KnowledgeLibrarySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (libraryId: string | undefined) => void;
  title?: string;
  description?: string;
  allowNone?: boolean; // 是否允许不选择（即同步到默认库）
}

const KnowledgeLibrarySelector: React.FC<KnowledgeLibrarySelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  title = '选择知识库',
  description = '请选择要同步到哪个知识库',
  allowNone = true,
}) => {
  const [isDark, setIsDark] = useState(() =>
    typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  const [libraries, setLibraries] = useState<KnowledgeLibrary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [confirmHover, setConfirmHover] = useState(false);
  const [cancelHover, setCancelHover] = useState(false);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const fetchLibraries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await libraryApi.getLibraries();
      setLibraries(data);
    } catch (e) {
      console.error('获取知识库列表失败:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedId(null);
      fetchLibraries();
    }
  }, [isOpen, fetchLibraries]);

  if (!isOpen) return null;

  const C = getThemeColors(isDark);

  const handleConfirm = () => {
    onSelect(selectedId || undefined);
    onClose();
  };

  const handleNoneSelect = () => {
    setSelectedId(null);
  };

  // Database icon component
  const DatabaseIcon = ({ color = 'currentColor', size = 18 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );

  const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  const XIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const FolderIcon = ({ color = 'currentColor', size = 18 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );

  const LoaderIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'kls-spin 1s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );

  return (
    <>
      <style>{`
        @keyframes kls-spin { to { transform: rotate(360deg); } }
        @keyframes kls-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes kls-slideUp { from { opacity: 0; transform: translateY(20px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>

      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: C.overlay,
          zIndex: 9998,
          animation: 'kls-fadeIn 0.2s ease',
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          width: '460px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          background: C.surface,
          borderRadius: '16px',
          border: `1px solid ${C.border}`,
          boxShadow: C.shadow,
          fontFamily: font,
          animation: 'kls-slideUp 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '1.125rem',
              fontWeight: 700,
              color: C.text,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <DatabaseIcon color={C.primary} size={20} />
              {title}
            </h3>
            {description && (
              <p style={{
                margin: '4px 0 0',
                fontSize: '0.8125rem',
                color: C.textMuted,
              }}>
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: C.textMuted,
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = C.text; e.currentTarget.style.background = C.primarySoft; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'none'; }}
          >
            <XIcon />
          </button>
        </div>

        {/* Library List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 24px',
        }}>
          {loading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 0',
              gap: '12px',
            }}>
              <LoaderIcon />
              <span style={{ fontSize: '0.875rem', color: C.textMuted }}>加载知识库列表...</span>
            </div>
          ) : libraries.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 0',
              gap: '12px',
            }}>
              <DatabaseIcon color={C.textMuted} size={36} />
              <span style={{ fontSize: '0.875rem', color: C.textMuted }}>暂无知识库，将同步到默认库</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* 默认库选项 */}
              {allowNone && (
                <div
                  onClick={handleNoneSelect}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: C.radius,
                    border: `2px solid ${selectedId === null ? C.primary : C.border}`,
                    background: selectedId === null ? C.primarySoft : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedId !== null) {
                      e.currentTarget.style.background = C.primarySoft;
                    }
                    setHoveredId('none');
                  }}
                  onMouseLeave={(e) => {
                    if (selectedId !== null) {
                      e.currentTarget.style.background = 'transparent';
                    }
                    setHoveredId(null);
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: C.primarySoft,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <FolderIcon color={C.primary} size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: C.text,
                    }}>
                      默认知识库
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: C.textMuted,
                      marginTop: '2px',
                    }}>
                      不指定知识库，同步到默认位置
                    </div>
                  </div>
                  {selectedId === null && (
                    <div style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: C.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      flexShrink: 0,
                    }}>
                      <CheckIcon />
                    </div>
                  )}
                </div>
              )}

              {/* 知识库列表 */}
              {libraries.map((lib) => {
                const isSelected = selectedId === lib.id;
                const isHovered = hoveredId === lib.id;
                return (
                  <div
                    key={lib.id}
                    onClick={() => setSelectedId(lib.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: C.radius,
                      border: `2px solid ${isSelected ? C.primary : C.border}`,
                      background: isSelected ? C.primarySoft : isHovered ? C.primarySoft : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={() => setHoveredId(lib.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: `${lib.color || C.primary}18`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <DatabaseIcon color={lib.color || C.primary} size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: C.text,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {lib.name}
                      </div>
                      {lib.description && (
                        <div style={{
                          fontSize: '0.75rem',
                          color: C.textMuted,
                          marginTop: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {lib.description}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <div style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: C.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        flexShrink: 0,
                      }}>
                        <CheckIcon />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          padding: '16px 24px 20px',
          borderTop: `1px solid ${C.border}`,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: cancelHover ? C.btnSecondaryHover : C.btnSecondary,
              color: C.btnSecondaryText,
              fontFamily: font,
              transition: 'background 0.15s',
            }}
            onMouseEnter={() => setCancelHover(true)}
            onMouseLeave={() => setCancelHover(false)}
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={libraries.length > 0 && !selectedId && !allowNone}
            style={{
              padding: '8px 24px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: libraries.length > 0 && !selectedId && !allowNone ? 'not-allowed' : 'pointer',
              background: (libraries.length > 0 && !selectedId && !allowNone)
                ? C.textMuted
                : confirmHover ? C.primaryHover : C.primary,
              color: '#FFFFFF',
              fontFamily: font,
              opacity: (libraries.length > 0 && !selectedId && !allowNone) ? 0.5 : 1,
              transition: 'background 0.15s, opacity 0.15s',
            }}
            onMouseEnter={() => setConfirmHover(true)}
            onMouseLeave={() => setConfirmHover(false)}
          >
            确认同步
          </button>
        </div>
      </div>
    </>
  );
};

export default KnowledgeLibrarySelector;
