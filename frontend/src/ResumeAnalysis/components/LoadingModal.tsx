import React from 'react';

// ---- Design tokens ----
const C = {
  primary: '#6366F1',
  surface: '#FFFFFF',
  border: '#EAE8F8',
  text: '#1E1B4B',
  textMuted: '#6B7280',
  font: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

interface LoadingModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  showProgress?: boolean;
  progress?: number;
  maxProgress?: number;
}

const LoadingModal: React.FC<LoadingModalProps> = ({
  isOpen,
  title = '加载中',
  description = '正在处理您的简历...',
  showProgress = false,
  progress = 0,
  maxProgress = 5,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes lm-spin { to { transform: rotate(360deg); } }
        @keyframes lm-fade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(30,27,75,0.35)',
        backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1001,
        animation: 'lm-fade 0.25s ease-out',
        fontFamily: C.font,
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px',
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: '16px',
          padding: '36px 48px',
          minWidth: '280px',
          animation: 'lm-fade 0.3s ease-out',
        }}>
          {/* Spinner */}
          <div style={{
            width: '44px', height: '44px',
            border: `3px solid ${C.border}`,
            borderTopColor: C.primary,
            borderRadius: '50%',
            animation: 'lm-spin 0.9s linear infinite',
          }} />

          {/* Text */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', textAlign: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.text }}>{title}</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: C.textMuted, lineHeight: 1.5 }}>{description}</p>

            {showProgress && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                {Array.from({ length: maxProgress }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: i < progress ? C.primary : C.border,
                      transition: 'background 0.3s ease',
                    }}
                  />
                ))}
                <span style={{ fontSize: '0.78rem', color: C.textMuted, marginLeft: '4px' }}>
                  {progress}/{maxProgress}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default LoadingModal;
