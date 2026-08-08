import React from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  itemDetails?: { label: string; value: string }[];
  confirmText?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemDetails = [],
  confirmText = 'Delete Entry',
  confirmVariant = 'danger',
}) => {
  if (!isOpen) return null;

  const getButtonStyles = () => {
    switch (confirmVariant) {
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs focus:ring-2 focus:ring-amber-500';
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs focus:ring-2 focus:ring-blue-500';
      case 'danger':
      default:
        return 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus:ring-2 focus:ring-rose-500';
    }
  };

  const getIconHeader = () => {
    if (confirmVariant === 'warning') {
      return (
        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
          <AlertTriangle className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
        <Trash2 className="w-5 h-5" />
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg border border-slate-300 shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        id="delete-confirm-modal-dialog"
      >
        {/* Header Bar */}
        <div className="px-4 py-3 bg-[#1a1c1e] text-white flex items-center justify-between border-b border-black">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-100">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
            title="Cancel"
            id="delete-modal-close-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 text-xs text-slate-700">
          <div className="flex items-start gap-3">
            {getIconHeader()}
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 text-sm">{title}</h4>
              <div className="text-slate-600 leading-relaxed">{description}</div>
            </div>
          </div>

          {/* Item details card if provided */}
          {itemDetails.length > 0 && (
            <div className="bg-slate-50 rounded border border-slate-200 p-3 space-y-1.5 font-mono text-[11px]">
              {itemDetails.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-slate-200/60 last:border-0 pb-1 last:pb-0">
                  <span className="text-slate-500 uppercase text-[10px]">{item.label}:</span>
                  <span className="font-bold text-slate-800 text-right truncate max-w-[220px]">{item.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>This operation cannot be undone once confirmed.</span>
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-4 py-3 bg-slate-100 border-t border-slate-300 flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-white hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 rounded transition-colors"
            id="delete-modal-cancel-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-1.5 font-bold rounded transition-colors flex items-center gap-1.5 ${getButtonStyles()}`}
            id="delete-modal-confirm-btn"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
