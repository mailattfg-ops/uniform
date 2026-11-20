'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ItemLineModalProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  saveLabel: string;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function ItemLineModal({ title, subtitle, children, footer, saveLabel, error, onSave, onCancel }: ItemLineModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onCancel]);

  // Portal to <body>: the wizard card uses backdrop-blur + overflow-hidden, which would otherwise
  // make it the containing block for this fixed overlay (clipping it and placing it under the header).
  if (typeof document === 'undefined') return null;
  return createPortal(
    // The overlay itself can scroll as a fallback; the panel is sized to the *visible* viewport (dvh)
    // so browser toolbars / zoom never push the header or footer off-screen.
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-zinc-900/50 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="min-h-full flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-[1.5rem] shadow-2xl w-full max-w-[1400px] max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden">
        <div className="shrink-0 px-6 py-4 border-b border-zinc-100 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black italic text-zinc-900">{title}</h3>
            {subtitle && <p className="text-[10px] font-black uppercase tracking-widest text-[#C82A2B] mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onCancel}
            title="Close"
            className="w-9 h-9 rounded-xl bg-zinc-50 hover:bg-zinc-200 text-zinc-500 flex items-center justify-center border border-zinc-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* min-h-0 lets this area shrink and scroll; the scrollbar is always shown so it is clear more content is below */}
        <div className="flex-1 min-h-0 overflow-y-scroll overscroll-contain p-6 [scrollbar-width:thin] [scrollbar-color:#d4d4d8_transparent]">{children}</div>

        <div className="shrink-0 px-6 py-4 border-t border-zinc-100 bg-zinc-50/70 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[240px]">{footer}</div>
          <div className="flex items-center gap-3">
            {error && <span className="text-[10px] font-black text-red-500">{error}</span>}
            <button
              type="button"
              onClick={onCancel}
              className="h-11 px-5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 font-black uppercase tracking-widest text-[10px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={Boolean(error)}
              className="h-11 px-6 rounded-xl bg-[#C82A2B] hover:bg-[#A81D1E] text-white font-black uppercase tracking-widest text-[10px] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saveLabel}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>,
    document.body
  );
}
