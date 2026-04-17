'use client';

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm Action",
  cancelLabel = "Go Back",
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  const themes = {
    danger: {
      bg: 'bg-red-50',
      icon: 'text-red-600',
      btn: 'bg-red-600 hover:bg-red-700 text-white shadow-red-200',
      border: 'border-red-100'
    },
    warning: {
      bg: 'bg-amber-50',
      icon: 'text-amber-600',
      btn: 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200',
      border: 'border-amber-100'
    },
    primary: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      btn: 'bg-[#2d8d9b] hover:bg-[#257a87] text-white shadow-blue-200',
      border: 'border-blue-100'
    }
  }[variant];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Backdrop - darker for better focus */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        onClick={onCancel}
      />
      
      {/* Modal Card */}
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.4)] border border-zinc-100 overflow-hidden relative animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className={`w-16 h-16 rounded-3xl ${themes.bg} flex items-center justify-center ${themes.icon} shadow-inner`}>
              <AlertTriangle size={32} />
            </div>
            <button 
              onClick={onCancel}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors text-zinc-400"
            >
              <X size={20} />
            </button>
          </div>

          <h3 className="text-2xl font-black italic tracking-tight text-[#3a525d] mb-3">{title}</h3>
          <p className="text-sm font-bold text-zinc-500 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="px-8 pb-10 flex flex-col gap-4">
          <button 
            onClick={onConfirm}
            className={`h-16 w-full rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all active:scale-95 shadow-xl ${themes.btn}`}
          >
            {confirmLabel}
          </button>
          <button 
             onClick={onCancel}
             className="h-16 w-full rounded-2xl border-2 border-zinc-100 bg-white font-black uppercase tracking-[0.2em] text-[11px] text-[#3a525d] hover:bg-zinc-50 transition-all active:scale-95"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
