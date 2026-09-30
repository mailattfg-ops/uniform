'use client';

import React, { useState, useEffect } from 'react';
import { 
  History, 
  X, 
  Building2, 
  Calendar, 
  MapPin, 
  Briefcase, 
  ArrowRightLeft, 
  PlaneTakeoff, 
  CheckCircle2, 
  Clock, 
  RotateCcw, 
  ChevronRight, 
  ShieldCheck, 
  AlertCircle,
  Sparkles,
  ArrowUpRight,
  Info
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/formatters';

interface BranchOption {
  id: number;
  name: string;
  code: string;
  tier: string;
  address?: string;
}

export interface WorkHistoryRecord {
  id: number | string;
  employee_id: number;
  branch_id: number;
  assignment_type: 'Initial Placement' | 'Permanent Transfer' | 'Temporary Deputation' | 'Recall / Returned';
  designation?: string;
  department?: string;
  start_date: string;
  end_date?: string | null;
  is_current: boolean;
  remarks?: string;
  created_at?: string;
  branches?: {
    id: number;
    name: string;
    code: string;
    tier: string;
    address?: string;
  } | null;
}

interface EmployeeWorkHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  employee: any | null;
  branches: BranchOption[];
}

export const EmployeeWorkHistoryModal: React.FC<EmployeeWorkHistoryModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
  employee,
  branches
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'transfer'>('timeline');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<WorkHistoryRecord[]>([]);
  const [empData, setEmpData] = useState<any | null>(null);

  // Permanent Transfer Form State
  const [newBranchId, setNewBranchId] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newDesignation, setNewDesignation] = useState<string>('');
  const [newDepartment, setNewDepartment] = useState<string>('');
  const [transferRemarks, setTransferRemarks] = useState<string>('');
  const [transferLoading, setTransferLoading] = useState(false);

  useEffect(() => {
    if (isOpen && employee?.id) {
      fetchHistory();
      setNewDesignation(employee.designation || '');
      setNewDepartment(employee.department || '');
      setTransferRemarks('');
      setNewBranchId('');
      setActiveTab('timeline');
    }
  }, [isOpen, employee?.id]);

  const fetchHistory = async () => {
    if (!employee?.id) return;
    setLoading(true);
    try {
      const res = await api.get(`/employees/${employee.id}/history`);
      if (res.data?.success) {
        setHistory(res.data.history || []);
        setEmpData(res.data.employee || employee);
      } else {
        setHistory([]);
        setEmpData(employee);
      }
    } catch (err: any) {
      console.warn('Failed to load history:', err);
      // Fallback: build initial synthesis from employee prop
      const synthetic: WorkHistoryRecord[] = [];
      if (employee.temp_branch_id) {
        synthetic.push({
          id: 'syn-dep',
          employee_id: employee.id,
          branch_id: employee.temp_branch_id,
          assignment_type: 'Temporary Deputation',
          designation: employee.designation,
          department: employee.department,
          start_date: employee.joining_date || 'Current',
          end_date: employee.temp_branch_until,
          is_current: true,
          remarks: employee.temp_branch_notes || 'Active temporary deputation',
          branches: employee.temp_branches || branches.find(b => b.id === employee.temp_branch_id)
        });
      }
      if (employee.branch_id) {
        synthetic.push({
          id: 'syn-base',
          employee_id: employee.id,
          branch_id: employee.branch_id,
          assignment_type: 'Initial Placement',
          designation: employee.designation,
          department: employee.department,
          start_date: employee.joining_date || 'Company Joining',
          end_date: null,
          is_current: !employee.temp_branch_id,
          remarks: 'Home branch assignment at joining',
          branches: employee.branches || branches.find(b => b.id === employee.branch_id)
        });
      }
      setHistory(synthetic);
      setEmpData(employee);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !employee) return null;

  const currentEmp = empData || employee;
  const currentHomeBranchId = currentEmp.branch_id || currentEmp.branches?.id;
  const currentHomeBranch = branches.find(b => b.id === currentHomeBranchId) || currentEmp.branches;

  const handlePermanentTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchId) {
      toast.error('Please choose a destination branch for transfer');
      return;
    }
    if (String(newBranchId) === String(currentHomeBranchId)) {
      toast.error('Destination branch must be different from current home branch');
      return;
    }

    setTransferLoading(true);
    try {
      const res = await api.post(`/employees/${employee.id}/transfer`, {
        new_branch_id: Number(newBranchId),
        effective_date: effectiveDate,
        new_designation: newDesignation.trim() || undefined,
        new_department: newDepartment.trim() || undefined,
        remarks: transferRemarks.trim() || undefined
      });

      toast.success('Permanent transfer recorded successfully!');
      if (onUpdated) onUpdated();
      await fetchHistory();
      setActiveTab('timeline');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to transfer employee');
    } finally {
      setTransferLoading(false);
    }
  };

  const getTierIcon = (tier?: string) => {
    if (tier === 'Corporate') return '🏢';
    if (tier === 'Factory') return '🏭';
    return '🏪';
  };

  const getMilestoneConfig = (type: string) => {
    switch (type) {
      case 'Initial Placement':
        return {
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dotClass: 'bg-emerald-500 border-emerald-200 text-white',
          icon: Sparkles,
          label: 'Initial Placement'
        };
      case 'Permanent Transfer':
        return {
          badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          dotClass: 'bg-indigo-600 border-indigo-200 text-white',
          icon: ArrowRightLeft,
          label: 'Permanent Transfer'
        };
      case 'Temporary Deputation':
        return {
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
          dotClass: 'bg-amber-500 border-amber-200 text-white',
          icon: PlaneTakeoff,
          label: 'Temporary Deputation'
        };
      case 'Recall / Returned':
        return {
          badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
          dotClass: 'bg-teal-600 border-teal-200 text-white',
          icon: RotateCcw,
          label: 'Recalled / Returned'
        };
      default:
        return {
          badgeClass: 'bg-slate-50 text-slate-800 border-slate-200',
          dotClass: 'bg-slate-500 border-slate-200 text-white',
          icon: Clock,
          label: type
        };
    }
  };

  const eligibleDestinationBranches = branches.filter(b => String(b.id) !== String(currentHomeBranchId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#2d8d9b]/10 border border-[#2d8d9b]/20 flex items-center justify-center text-[#2d8d9b]">
              <History size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-[#3a525d] tracking-tight">Staff Career & Movement Ledger</h3>
                <span className="text-[10px] font-mono font-bold bg-[#fce4d4]/60 text-[#3a525d] px-2 py-0.5 rounded-full border border-[#fce4d4]">
                  {currentEmp.employee_id}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                <strong className="text-slate-800">{currentEmp.full_name}</strong> • {currentEmp.designation || 'Staff'} ({currentEmp.department || 'General'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Station Banner */}
        <div className="px-6 pt-4 pb-2 bg-slate-50/60 border-b border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Home Base */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{getTierIcon(currentHomeBranch?.tier)}</span>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Home Base Branch</p>
                  <p className="text-xs font-black text-[#3a525d] truncate max-w-[170px]">
                    {currentHomeBranch?.name || 'Unassigned HQ'}
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-600">
                {currentHomeBranch?.code || 'HQ'}
              </span>
            </div>

            {/* Employment & Deputation Status */}
            <div className={`p-3 rounded-2xl border shadow-xs flex items-center justify-between ${
              currentEmp.temp_branch_id 
                ? 'bg-amber-50/80 border-amber-200 text-amber-900' 
                : 'bg-white border-slate-200/80'
            }`}>
              <div className="flex items-center gap-2.5">
                {currentEmp.temp_branch_id ? (
                  <PlaneTakeoff size={18} className="text-amber-600 shrink-0" />
                ) : (
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                )}
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                    {currentEmp.temp_branch_id ? 'Current Deputation' : 'Current Status'}
                  </p>
                  <p className="text-xs font-black truncate max-w-[170px]">
                    {currentEmp.temp_branch_id 
                      ? (currentEmp.temp_branches?.name || branches.find(b => b.id === currentEmp.temp_branch_id)?.name || 'Away on Duty')
                      : 'Active at Base Station'}
                  </p>
                </div>
              </div>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                currentEmp.temp_branch_id 
                  ? 'bg-amber-200 text-amber-900' 
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {currentEmp.temp_branch_id ? 'Deputed' : (currentEmp.employment_type || 'Active')}
              </span>
            </div>
          </div>

          {/* Active Tab Switcher */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                activeTab === 'timeline'
                  ? 'bg-white text-[#2d8d9b] shadow-xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <History size={14} />
              Career Timeline ({history.length})
            </button>
            <button
              onClick={() => setActiveTab('transfer')}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                activeTab === 'transfer'
                  ? 'bg-[#2d8d9b] text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <ArrowRightLeft size={14} />
              + Permanent Transfer
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'timeline' ? (
            <div>
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="w-8 h-8 border-3 border-[#2d8d9b] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold">Loading career movement ledger...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <History size={36} className="mx-auto mb-2 opacity-30 text-[#2d8d9b]" />
                  <p className="text-sm font-bold text-slate-600">No movement history recorded yet</p>
                  <p className="text-xs text-slate-400 mt-1">Movement records are automatically appended on placement, deputation, and transfer.</p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                  {history.map((record, idx) => {
                    const cfg = getMilestoneConfig(record.assignment_type);
                    const IconComponent = cfg.icon;
                    const b = record.branches || branches.find(br => br.id === record.branch_id);

                    return (
                      <div key={record.id || idx} className="relative group">
                        {/* Timeline Marker Dot */}
                        <div className={`absolute -left-[31px] top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 ${cfg.dotClass}`}>
                          <IconComponent size={11} />
                        </div>

                        {/* Card Content */}
                        <div className={`p-4 rounded-2xl border transition-all ${
                          record.is_current 
                            ? 'bg-white border-[#2d8d9b]/30 shadow-md ring-1 ring-[#2d8d9b]/20' 
                            : 'bg-slate-50/70 border-slate-200/80 hover:bg-white'
                        }`}>
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${cfg.badgeClass}`}>
                                {cfg.label}
                              </span>
                              {record.is_current && (
                                <span className="text-[9px] font-black uppercase tracking-wider bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20 px-2 py-0.5 rounded-full">
                                  Current Station
                                </span>
                              )}
                            </div>

                            {/* Date Range */}
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                              <Calendar size={12} className="text-slate-400" />
                              <span>{record.start_date ? formatDate(record.start_date) : 'Initial'}</span>
                              <ChevronRight size={12} className="text-slate-300" />
                              <span className={record.is_current ? 'text-[#2d8d9b] font-bold' : ''}>
                                {record.is_current ? 'Present' : (record.end_date ? formatDate(record.end_date) : 'Completed')}
                              </span>
                            </div>
                          </div>

                          {/* Branch Info */}
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-base">{getTierIcon(b?.tier)}</span>
                            <div>
                              <p className="text-xs font-black text-[#3a525d]">
                                {b?.name || 'Branch Office'}
                                {b?.code && <span className="ml-1.5 text-[10px] font-mono text-slate-400 font-bold">({b.code})</span>}
                              </p>
                              {b?.address && (
                                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <MapPin size={10} />
                                  <span className="truncate max-w-[320px]">{b.address}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Designation & Department */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <Briefcase size={12} className="text-[#2d8d9b]" />
                              <span className="font-bold text-[#3a525d]">{record.designation || currentEmp.designation || 'Staff'}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500">{record.department || currentEmp.department || 'General'}</span>
                            </div>
                          </div>

                          {/* Remarks / Reason */}
                          {record.remarks && (
                            <div className="mt-2 text-[11px] bg-slate-100/70 p-2 rounded-xl text-slate-600 italic border border-slate-200/50 flex items-start gap-1.5">
                              <Info size={12} className="text-slate-400 shrink-0 mt-0.5" />
                              <span>{record.remarks}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Permanent Transfer Form */
            <form onSubmit={handlePermanentTransfer} className="space-y-4">
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
                <ArrowRightLeft className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-950">
                  <p className="font-bold">Permanent Station Transfer</p>
                  <p className="mt-0.5 text-indigo-700">
                    This permanently relocates <strong>{currentEmp.full_name}</strong> to a new home branch. 
                    The current assignment will be closed in the ledger, and any active temporary deputations will be cleared.
                  </p>
                </div>
              </div>

              {/* Current Station Locked Preview */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Current Home Branch</label>
                <div className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{getTierIcon(currentHomeBranch?.tier)}</span>
                    <span>{currentHomeBranch?.name || 'Unassigned HQ'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">Current Base</span>
                </div>
              </div>

              {/* Destination Branch */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Destination Branch <span className="text-red-500">*</span>
                </label>
                <select
                  value={newBranchId}
                  onChange={e => setNewBranchId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#2d8d9b]/20 focus:border-[#2d8d9b]"
                >
                  <option value="">Select Destination Branch</option>
                  {eligibleDestinationBranches.map(b => (
                    <option key={b.id} value={b.id}>
                      {getTierIcon(b.tier)} {b.name} ({b.code}) — {b.tier}
                    </option>
                  ))}
                </select>
              </div>

              {/* Effective Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Effective Transfer Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={e => setEffectiveDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#2d8d9b]/20 focus:border-[#2d8d9b]"
                />
              </div>

              {/* Designation & Department */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={newDesignation}
                    onChange={e => setNewDesignation(e.target.value)}
                    placeholder="e.g. Branch Supervisor"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#2d8d9b]/20 focus:border-[#2d8d9b]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={e => setNewDepartment(e.target.value)}
                    placeholder="e.g. Retail Operations"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#2d8d9b]/20 focus:border-[#2d8d9b]"
                  />
                </div>
              </div>

              {/* Reason / Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Transfer Authority Remarks / Reason</label>
                <textarea
                  rows={3}
                  value={transferRemarks}
                  onChange={e => setTransferRemarks(e.target.value)}
                  placeholder="e.g. Promoted to Senior Outlet Incharge / Regular rotational transfer"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#2d8d9b]/20 focus:border-[#2d8d9b]"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('timeline')}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferLoading}
                  className="px-5 py-2.5 bg-[#2d8d9b] hover:bg-[#257682] text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {transferLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Recording Transfer...
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft size={14} />
                      Confirm Permanent Transfer
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-600" />
            Verified Enterprise Movement Ledger
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200/70 rounded-lg transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
