import React from 'react';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  loading = false
}) => {
  const iconMap = {
    danger: <AlertTriangle className="w-10 h-10 text-rose-500" />,
    warning: <AlertTriangle className="w-10 h-10 text-amber-500" />,
    info: <Info className="w-10 h-10 text-sky-500" />,
    success: <CheckCircle2 className="w-10 h-10 text-emerald-500" />
  };

  const confirmBtnStyles = {
    danger: 'bg-rose-600 hover:bg-rose-500 text-white focus:ring-rose-500',
    warning: 'bg-amber-600 hover:bg-amber-500 text-white focus:ring-amber-500',
    info: 'bg-sky-600 hover:bg-sky-500 text-white focus:ring-sky-500',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-500'
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="flex flex-col items-center text-center py-2">
        <div className="p-3 bg-slate-800/80 rounded-2xl mb-4 border border-slate-700/50">
          {iconMap[type]}
        </div>
        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          {message}
        </p>

        <div className="flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-sm font-semibold transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            disabled={loading}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all shadow-lg ${confirmBtnStyles[type]} disabled:opacity-50`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
