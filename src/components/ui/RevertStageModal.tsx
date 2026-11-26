'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { RotateCcw, AlertTriangle, CheckCircle2, X, ArrowLeft, ShieldAlert } from 'lucide-react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';

export interface RevertStageModalProps {
  isOpen: boolean;
  lead: {
    id: number;
    name: string;
    status: string;
    lead_code?: string | null;
    branch_id?: number | null;
    assigned_staff_id?: number | null;
    [key: string]: any;
  } | null;
  onClose: () => void;
  onSuccess: (updatedLead?: any) => void;
}

const STAGE_ORDER = [
  'Feeds',
  'Contacted Leads',
  'Open Leads',
  'New Leads',
  'Sales Leads',
  'Follow-ups',
  'Meetings',
  'Hot Leads',
  'Quotations',
  'Deals',
  'SO Converted Deals'
];

export const RevertStageModal: React.FC<RevertStageModalProps> = ({
  isOpen,
  lead,
  onClose,
  onSuccess
}) => {
  const [targetStage, setTargetStage] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [confirmCheck, setConfirmCheck] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Compute allowed prior stages
  const allowedPriorStages = useMemo(() => {
    if (!lead?.status) return [];
    const currentIndex = STAGE_ORDER.findIndex(
      s => s.toLowerCase() === lead.status.toLowerCase()
    );
    if (currentIndex <= 0) return [];
    return STAGE_ORDER.slice(0, currentIndex).reverse();
  }, [lead?.status]);

  useEffect(() => {
    if (isOpen && allowedPriorStages.length > 0) {
      setTargetStage(allowedPriorStages[0]); // Default to immediate predecessor
      setReason('');
      setConfirmCheck(false);
      setIsSubmitting(false);
    }
  }, [isOpen, allowedPriorStages]);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) {
      toast.error('Please enter a valid reason for reverting the stage (min 3 characters).');
      return;
    }
    if (!confirmCheck) {
      toast.error('Please check the confirmation box to proceed.');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(`Rolling back stage from "${lead.status}" to "${targetStage}"...`);

    try {
      const res = await api.post(`/leads/${lead.id}/revert-stage`, {
        target_stage: targetStage,
        reason: reason.trim()
      });

      toast.success(res.data?.message || `Stage reverted successfully to ${targetStage}!`, { id: toastId });
      onSuccess(res.data?.lead);
      onClose();
    } catch (err: any) {
      console.error('[RevertStageModal] Error:', err);
      toast.error(err.response?.data?.error || 'Failed to revert stage', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = confirmCheck && reason.trim().length >= 3 && Boolean(targetStage);

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md" onClick={onClose} />
      
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden relative z-10 animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-zinc-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300">
              <RotateCcw size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest uppercase bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">
                  Correction Action
                </span>
                {lead.lead_code && (
                  <span className="text-[10px] font-bold text-white/60">
                    {lead.lead_code}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black tracking-tight mt-0.5">
                Revert Pipeline Stage
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Target Prospect Info */}
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Prospect / Account</p>
              <p className="text-sm font-black text-zinc-900">{lead.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-zinc-200 text-zinc-800 font-bold text-xs">
                {lead.status}
              </span>
              <span className="text-zinc-400 font-black">➔</span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs">
                {targetStage || 'Previous'}
              </span>
            </div>
          </div>

          {/* Rollback Destination Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-zinc-700 flex items-center justify-between">
              <span>Select Destination Stage *</span>
              <span className="text-[10px] font-normal text-zinc-400">Earlier stages only</span>
            </label>
            <select
              value={targetStage}
              onChange={(e) => setTargetStage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white text-zinc-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            >
              {allowedPriorStages.map((stage) => (
                <option key={stage} value={stage}>
                  Revert to: {stage}
                </option>
              ))}
            </select>
          </div>

          {/* Mandatory Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-zinc-700 flex items-center justify-between">
              <span>Mandatory Rollback Reason *</span>
              <span className="text-[10px] text-zinc-400">{reason.trim().length} chars (min 3)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this stage transition was mistaken and needs to be rolled back..."
              rows={3}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white text-zinc-900 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 placeholder:text-zinc-400 resize-none"
            />
          </div>

          {/* Audit Notification Banner */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Permanent Audit Trail:</strong> Your name, employee code, branch, and timestamp will be permanently logged in the timeline and stage history for this record.
            </div>
          </div>

          {/* Double Confirmation Checkbox */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none group p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 hover:border-zinc-300 transition-colors">
            <input
              type="checkbox"
              checked={confirmCheck}
              onChange={(e) => setConfirmCheck(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-zinc-300"
            />
            <span className="text-xs font-bold text-zinc-800 group-hover:text-zinc-900 leading-snug">
              I verify that this stage advancement was a mistake and confirm rolling back this record to <span className="text-rose-700 underline font-black">{targetStage}</span>.
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                isFormValid && !isSubmitting
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 hover:scale-[1.02]'
                  : 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'
              }`}
            >
              <RotateCcw size={14} className={isSubmitting ? 'animate-spin' : ''} />
              <span>{isSubmitting ? 'Rolling back...' : 'Confirm & Revert Stage'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RevertStageModal;
