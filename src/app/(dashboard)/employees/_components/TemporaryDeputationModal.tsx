'use client';

import React, { useState, useEffect } from 'react';
import { PlaneTakeoff, X, Building2, Calendar, FileText, ArrowRightLeft, Undo2, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/formatters';

interface BranchOption {
  id: number;
  name: string;
  code: string;
  tier: string;
}

interface TemporaryDeputationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employee: any | null;
  branches: BranchOption[];
}

export const TemporaryDeputationModal: React.FC<TemporaryDeputationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  employee,
  branches
}) => {
  const [loading, setLoading] = useState(false);
  const [tempBranchId, setTempBranchId] = useState<string>('');
  const [tempUntil, setTempUntil] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (employee) {
      setTempBranchId(employee.temp_branch_id ? String(employee.temp_branch_id) : '');
      setTempUntil(employee.temp_branch_until ? employee.temp_branch_until.split('T')[0] : '');
      setNotes(employee.temp_branch_notes || '');
    }
  }, [employee]);

  if (!isOpen || !employee) return null;

  const homeBranchId = employee.branch_id || employee.branches?.id;
  const homeBranchName = employee.branches?.name || 'Unassigned HQ';
  const isCurrentlyDeputed = Boolean(employee.temp_branch_id);
  const currentTempBranchName = employee.temp_branches?.name || branches.find(b => b.id === employee.temp_branch_id)?.name;

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempBranchId) {
      toast.error('Please select a temporary branch to depute to');
      return;
    }
    if (String(tempBranchId) === String(homeBranchId)) {
      toast.error('Temporary branch cannot be the same as their home branch');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/employees/${employee.id}/depute`, {
        temp_branch_id: Number(tempBranchId),
        temp_branch_until: tempUntil || null,
        temp_branch_notes: notes || null
      });
      toast.success(`${employee.full_name} has been deputed successfully!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to assign temporary branch');
    } finally {
      setLoading(false);
    }
  };

  const handleRecall = async () => {
    setLoading(true);
    try {
      await api.post(`/employees/${employee.id}/recall`);
      toast.success(`${employee.full_name} has been recalled back to ${homeBranchName}!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to recall employee');
    } finally {
      setLoading(false);
    }
  };

  const getTierIcon = (tier?: string) => {
    if (tier === 'Corporate') return '🏢';
    if (tier === 'Factory') return '🏭';
    return '🏪';
  };

  // Filter out home branch from available deputation destinations
  const eligibleBranches = branches.filter(b => String(b.id) !== String(homeBranchId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] border border-[#fce4d4] max-w-lg w-full p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-inner">
              <PlaneTakeoff size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#3a525d] tracking-tight">Temporary Branch Deputation</h3>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Cross-Branch Staff Duty Assignment</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-9 h-9 rounded-full bg-zinc-100 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 flex items-center justify-center transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Employee Summary Card */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-[#3a525d]">{employee.full_name}</p>
            <p className="text-[10px] text-zinc-400 font-mono font-bold uppercase mt-0.5">{employee.employee_id} • {employee.designation}</p>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Home Branch Base</span>
            <span className="text-xs font-bold text-[#2d8d9b]">{homeBranchName}</span>
          </div>
        </div>

        {/* Current Deputation Notice (If Active) */}
        {isCurrentlyDeputed && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                <PlaneTakeoff size={14} className="text-amber-600" /> Currently on Deputation
              </span>
              <button
                type="button"
                onClick={handleRecall}
                disabled={loading}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-xs transition flex items-center gap-1"
              >
                <Undo2 size={12} />
                Recall Home Now
              </button>
            </div>
            <p className="text-xs text-amber-900 font-medium">
              Deputed at: <strong className="font-bold">{currentTempBranchName}</strong>
              {employee.temp_branch_until && (
                <span> (Scheduled until: <strong>{formatDate(employee.temp_branch_until)}</strong>)</span>
              )}
            </p>
            {employee.temp_branch_notes && (
              <p className="text-[11px] text-amber-700 italic">"{employee.temp_branch_notes}"</p>
            )}
          </div>
        )}

        {/* Deputation Form */}
        <form onSubmit={handleAssign} className="space-y-4">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[#3a525d] mb-1.5">
              Select Temporary Destination Branch *
            </label>
            <select
              required
              value={tempBranchId}
              onChange={e => setTempBranchId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 focus:border-[#2d8d9b]"
            >
              <option value="">Choose Branch / Factory / Unit...</option>
              {eligibleBranches.map(b => (
                <option key={b.id} value={b.id}>
                  {getTierIcon(b.tier)} {b.name} ({b.code}) — {b.tier}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-zinc-400 mt-1">
              The employee will appear in this branch's workforce list while retaining their permanent home base.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[#3a525d] mb-1.5">
              Deputation Valid Until (Optional Return Date)
            </label>
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={tempUntil}
              onChange={e => setTempUntil(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 focus:border-[#2d8d9b]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[#3a525d] mb-1.5">
              Purpose / Deputation Duty Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Assigned to support festival rush sales and stock count, or factory tailoring quality inspection"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 focus:border-[#2d8d9b]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-500 hover:bg-zinc-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-600/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              <PlaneTakeoff size={14} />
              {loading ? 'Processing...' : isCurrentlyDeputed ? 'Update Deputation' : 'Confirm Deputation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
