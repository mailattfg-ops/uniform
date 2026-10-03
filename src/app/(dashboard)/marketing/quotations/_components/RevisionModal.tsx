'use client';

import React, { useState } from 'react';
import { X, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface RevisionModalProps {
  isOpen: boolean;
  quotationNo: string;
  quotationTitle: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const RevisionModal: React.FC<RevisionModalProps> = ({
  isOpen,
  quotationNo,
  quotationTitle,
  onConfirm,
  onCancel,
  isSubmitting = false
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const quickPresets = [
    'Adjust profit margin to meet branch targets.',
    'Extend delivery date to accommodate factory scheduling.',
    'Verify fabric selection with customer before resubmission.',
    'Recheck size distribution and quantities.'
  ];

  const handleApplyPreset = (preset: string) => {
    setReason(prev => (prev ? `${prev}\n${preset}` : preset));
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide specific feedback or reasons for requesting a revision.');
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        onClick={() => !isSubmitting && onCancel()}
      />

      {/* Modal Card */}
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.4)] border border-zinc-100 overflow-hidden relative animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-8 pb-4 flex items-start justify-between border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <RotateCcw size={22} strokeWidth={2.5} />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-amber-100/60 text-amber-700">
                Branch Manager Review
              </span>
              <h3 className="text-xl font-black text-[#3a525d] mt-1">
                Request Revision
              </h3>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 flex items-center justify-center transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Target Quotation</p>
            <p className="text-sm font-black text-[#3a525d] mt-0.5 truncate">
              {quotationNo} — {quotationTitle}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Returning this quotation to <strong className="text-zinc-700">Draft</strong> will notify the marketing author to implement your feedback.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wider text-[#3a525d] flex items-center justify-between">
              <span>Revision Instructions / Feedback <span className="text-rose-500">*</span></span>
              <span className="text-[9px] text-zinc-400 font-semibold">Required</span>
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Please increase the profit margin to at least 22% and re-confirm the customer delivery timeline..."
              className={`w-full p-4 rounded-2xl border text-xs font-medium focus:outline-none focus:ring-2 transition-all ${
                error 
                  ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/20' 
                  : 'border-zinc-200 focus:border-[#2d8d9b] focus:ring-[#2d8d9b]/20 bg-white'
              }`}
            />
            {error && (
              <p className="text-xs text-rose-600 font-semibold flex items-center gap-1 mt-1">
                <AlertTriangle size={12} /> {error}
              </p>
            )}
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Quick feedback suggestions:</p>
            <div className="flex flex-wrap gap-1.5">
              {quickPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-all text-left"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-xl px-5 h-11 text-xs font-black uppercase tracking-wider border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl px-6 h-11 text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-200 flex items-center gap-2"
            >
              <RotateCcw size={14} />
              <span>{isSubmitting ? 'Requesting...' : 'Request Revision'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
