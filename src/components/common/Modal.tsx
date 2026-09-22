import React, { useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  variant?: 'primary' | 'danger' | 'warning';
  isLoading?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  onConfirm,
  variant = 'primary',
  isLoading = false,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }[maxWidth];

  const confirmBtnColor = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200',
  }[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full ${maxWClass} bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5">{children}</div>

        {(onConfirm || cancelText) && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50/70 border-t border-slate-100">
            {cancelText && (
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-colors disabled:opacity-50"
              >
                {cancelText}
              </button>
            )}
            {onConfirm && (
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={`px-4 py-2 text-sm font-medium rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all disabled:opacity-50 ${confirmBtnColor}`}
              >
                {isLoading ? 'Memproses...' : confirmText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
