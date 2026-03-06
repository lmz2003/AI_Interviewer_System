import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

// 弹窗类型定义
export type ToastModalType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

export interface ToastModalOptions {
  type: ToastModalType;
  title?: string;
  message: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  duration?: number; // 仅用于 info/success/warning/error，毫秒
}

// ---- Design tokens ----
const getColors = (isDark: boolean) => ({
  overlay:    isDark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.5)',
  surface:    isDark ? '#1E1E38' : '#FFFFFF',
  border:     isDark ? '#2D2D52' : 'transparent',
  shadow:     isDark ? '0 10px 40px rgba(0,0,0,0.5)' : '0 10px 40px rgba(0,0,0,0.16)',
  title:      isDark ? '#F1F0FF' : '#0f172a',
  message:    isDark ? '#A8A5C7' : '#475569',
  closeBtn:   isDark ? '#6B7280' : '#94a3b8',
  closeBtnHover: isDark ? '#A8A5C7' : '#64748b',
  // icon colors by type
  iconColor: (type: ToastModalType) => {
    if (isDark) {
      switch (type) {
        case 'success': return '#34D399';
        case 'error':   return '#F87171';
        case 'warning': return '#FBBF24';
        case 'info':
        case 'confirm': return '#818CF8';
        default:        return '#A8A5C7';
      }
    } else {
      switch (type) {
        case 'success': return '#16a34a';
        case 'error':   return '#dc2626';
        case 'warning': return '#ea580c';
        case 'info':
        case 'confirm': return '#2563eb';
        default:        return '#64748b';
      }
    }
  },
  iconBg: (type: ToastModalType) => {
    if (isDark) {
      switch (type) {
        case 'success': return 'rgba(52,211,153,0.15)';
        case 'error':   return 'rgba(248,113,113,0.15)';
        case 'warning': return 'rgba(251,191,36,0.15)';
        case 'info':
        case 'confirm': return 'rgba(129,140,248,0.15)';
        default:        return 'rgba(168,165,199,0.1)';
      }
    } else {
      switch (type) {
        case 'success': return '#dcfce7';
        case 'error':   return '#fee2e2';
        case 'warning': return '#fed7aa';
        case 'info':
        case 'confirm': return '#dbeafe';
        default:        return '#f1f5f9';
      }
    }
  },
  btnPrimary:      isDark ? '#4F46E5' : '#2563eb',
  btnPrimaryHover: isDark ? '#4338CA' : '#1d4ed8',
  btnSecondary:      isDark ? '#2D2D52' : '#e2e8f0',
  btnSecondaryHover: isDark ? '#3D3D62' : '#cbd5e1',
  btnSecondaryText:  isDark ? '#F1F0FF' : '#0f172a',
});

// Context 和 Provider
interface ToastModalContextType {
  showModal: (options: ToastModalOptions) => Promise<boolean>;
  alert: (message: string, title?: string) => Promise<void>;
  confirm: (message: string, title?: string) => Promise<boolean>;
  success: (message: string, title?: string) => Promise<void>;
  error: (message: string, title?: string) => Promise<void>;
  warning: (message: string, title?: string) => Promise<void>;
  info: (message: string, title?: string) => Promise<void>;
}

const ToastModalContext = createContext<ToastModalContextType | undefined>(undefined);

interface ModalState {
  isOpen: boolean;
  options?: ToastModalOptions;
  resolve?: (value: boolean) => void;
}

export const ToastModalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [modalState, setModalState] = useState<ModalState>({ isOpen: false });
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredClose, setHoveredClose] = useState(false);
  const [hoveredConfirm, setHoveredConfirm] = useState(false);
  const [hoveredCancel, setHoveredCancel] = useState(false);

  // Dark mode detection
  const [isDark, setIsDark] = useState(() =>
    typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const C = getColors(isDark);

  const showModal = useCallback(
    (options: ToastModalOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setModalState({
          isOpen: true,
          options,
          resolve,
        });

        // 如果不是 confirm 类型，自动关闭
        if (options.type !== 'confirm') {
          const duration = options.duration || 3000;
          setTimeout(() => {
            resolve(true);
            setModalState({ isOpen: false });
          }, duration);
        }
      });
    },
    []
  );

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      if (modalState.options?.onConfirm) {
        await modalState.options.onConfirm();
      }
      modalState.resolve?.(true);
    } finally {
      setIsLoading(false);
      setModalState({ isOpen: false });
    }
  };

  const handleCancel = () => {
    modalState.options?.onCancel?.();
    modalState.resolve?.(false);
    setModalState({ isOpen: false });
  };

  const handleClose = () => {
    if (modalState.options?.type === 'confirm') {
      handleCancel();
    } else {
      modalState.resolve?.(true);
      setModalState({ isOpen: false });
    }
  };

  const contextValue: ToastModalContextType = {
    showModal,
    alert: (message, title) =>
      showModal({
        type: 'error',
        title: title || '提示',
        message,
        duration: 3000,
      }).then(() => {}),
    confirm: (message, title) =>
      showModal({
        type: 'confirm',
        title: title || '确认',
        message,
        confirmText: '确定',
        cancelText: '取消',
      }),
    success: (message, title) =>
      showModal({
        type: 'success',
        title: title || '成功',
        message,
        duration: 3000,
      }).then(() => {}),
    error: (message, title) =>
      showModal({
        type: 'error',
        title: title || '错误',
        message,
        duration: 3000,
      }).then(() => {}),
    warning: (message, title) =>
      showModal({
        type: 'warning',
        title: title || '警告',
        message,
        duration: 3000,
      }).then(() => {}),
    info: (message, title) =>
      showModal({
        type: 'info',
        title: title || '提示',
        message,
        duration: 3000,
      }).then(() => {}),
  };

  return (
    <ToastModalContext.Provider value={contextValue}>
      {children}
      {modalState.isOpen && modalState.options && (
        // Overlay
        <div
          onClick={handleClose}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: C.overlay,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            animation: 'tmFadeIn 0.2s ease-in',
          }}
        >
          <style>{`
            @keyframes tmFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes tmSlideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          `}</style>

          {/* Modal Container */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              background: C.surface,
              borderRadius: '12px',
              border: `1px solid ${C.border}`,
              boxShadow: C.shadow,
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              animation: 'tmSlideIn 0.3s ease-out',
              fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              onMouseEnter={() => setHoveredClose(true)}
              onMouseLeave={() => setHoveredClose(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: hoveredClose ? C.closeBtnHover : C.closeBtn,
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s',
                borderRadius: '4px',
              }}
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              {/* Icon */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                flexShrink: 0,
                color: C.iconColor(modalState.options.type),
                background: C.iconBg(modalState.options.type),
              }}>
                {modalState.options.type === 'success' && <CheckCircle size={18} />}
                {modalState.options.type === 'error' && <AlertCircle size={18} />}
                {modalState.options.type === 'warning' && <AlertTriangle size={18} />}
                {(modalState.options.type === 'info' || modalState.options.type === 'confirm') && (
                  <Info size={18} />
                )}
              </div>
              {/* Title */}
              {modalState.options.title && (
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: C.title }}>
                  {modalState.options.title}
                </h3>
              )}
            </div>

            {/* Message */}
            <p style={{
              margin: '12px 0 0 0',
              fontSize: '14px',
              color: C.message,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {modalState.options.message}
            </p>

            {/* Buttons (confirm only) */}
            {modalState.options.type === 'confirm' && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  onMouseEnter={() => setHoveredCancel(true)}
                  onMouseLeave={() => setHoveredCancel(false)}
                  style={{
                    padding: '10px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.5 : 1,
                    transition: 'all 0.2s',
                    background: hoveredCancel ? C.btnSecondaryHover : C.btnSecondary,
                    color: C.btnSecondaryText,
                  }}
                >
                  {modalState.options.cancelText || '取消'}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  onMouseEnter={() => setHoveredConfirm(true)}
                  onMouseLeave={() => setHoveredConfirm(false)}
                  style={{
                    padding: '10px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.5 : 1,
                    transition: 'all 0.2s',
                    background: hoveredConfirm ? C.btnPrimaryHover : C.btnPrimary,
                    color: 'white',
                  }}
                >
                  {isLoading ? '处理中...' : (modalState.options.confirmText || '确定')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </ToastModalContext.Provider>
  );
};

// Hook
export const useToastModal = (): ToastModalContextType => {
  const context = useContext(ToastModalContext);
  if (!context) {
    throw new Error('useToastModal must be used within a ToastModalProvider');
  }
  return context;
};
