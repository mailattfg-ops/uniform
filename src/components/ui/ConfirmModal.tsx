'use client';

import React from 'react';
import { X, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'brand';
  icon?: React.ReactNode;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm Action",
  cancelLabel = "Go Back",
  variant = 'brand',
  icon
}) => {
  if (!isOpen) return null;

  const normalizedVariant = variant === 'primary' ? 'brand' : variant;

  const themes = {
    danger: {
      rail: 'bg-rose-600',
      bg: 'bg-rose-50 border border-rose-200/80 text-rose-600',
      btn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20',
      defaultIcon: <AlertTriangle size={28} strokeWidth={2.2} />
    },
    warning: {
      rail: 'bg-amber-500',
      bg: 'bg-amber-50 border border-amber-200/80 text-amber-600',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20',
      defaultIcon: <AlertCircle size={28} strokeWidth={2.2} />
    },
    brand: {
      rail: 'bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D]',
      bg: 'bg-zinc-900 text-white shadow-xs',
      btn: 'bg-[#C82A2B] hover:bg-[#A81D1E] text-white shadow-lg shadow-[#C82A2B]/25',
      defaultIcon: <CheckCircle2 size={28} strokeWidth={2.2} />
    }
  }[normalizedVariant];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal Card */}
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-zinc-200/80 overflow-hidden relative z-10 animate-in zoom-in-95 duration-200">
        {/* Subtle Brand Accent Rail */}
        <div className={`h-1.5 w-full ${themes.rail}`} />

        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className={`w-14 h-14 rounded-2xl ${themes.bg} flex items-center justify-center`}>
              {icon || themes.defaultIcon}
            </div>
            <button 
              type="button"
              onClick={onCancel}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-100 hover:bg-zinc-200 transition-colors text-zinc-500 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <h3 className="text-2xl font-black tracking-tight text-zinc-900 mb-2">{title}</h3>
          <p className="text-sm font-medium text-zinc-500 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="px-8 pb-8 flex flex-col gap-3">
          <button 
            type="button"
            onClick={onConfirm}
            className={`h-13 w-full rounded-2xl font-black uppercase tracking-[0.15em] text-[11px] transition-all active:scale-95 cursor-pointer flex items-center justify-center ${themes.btn}`}
          >
            {confirmLabel}
          </button>
          <button 
            type="button"
            onClick={onCancel}
            className="h-13 w-full rounded-2xl border border-zinc-200 bg-white font-black uppercase tracking-[0.15em] text-[11px] text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-all active:scale-95 cursor-pointer"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
