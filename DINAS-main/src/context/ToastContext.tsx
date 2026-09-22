import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastMessage['type'], title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info', title?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastMessage = { id, message, type, title };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          const icon = {
            success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
            error: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
            warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
            info: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
          }[t.type];

          const bgBorder = {
            success: 'bg-white border-emerald-200 shadow-emerald-100',
            error: 'bg-white border-rose-200 shadow-rose-100',
            warning: 'bg-white border-amber-200 shadow-amber-100',
            info: 'bg-white border-blue-200 shadow-blue-100',
          }[t.type];

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all duration-300 transform translate-y-0 ${bgBorder}`}
            >
              {icon}
              <div className="flex-1 text-sm">
                {t.title && <div className="font-semibold text-slate-800 mb-0.5">{t.title}</div>}
                <div className="text-slate-600 leading-snug">{t.message}</div>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  const { showToast } = context;
  return useMemo(
    () => ({
      show: showToast,
      success: (msg: string, title?: string) => showToast(msg, 'success', title || 'Berhasil'),
      error: (msg: string, title?: string) => showToast(msg, 'error', title || 'Gagal'),
      warning: (msg: string, title?: string) => showToast(msg, 'warning', title || 'Perhatian'),
      info: (msg: string, title?: string) => showToast(msg, 'info', title || 'Informasi'),
    }),
    [showToast]
  );
};
