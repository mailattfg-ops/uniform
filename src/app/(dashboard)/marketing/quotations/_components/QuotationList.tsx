'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, Column } from '@/components/ui/DataTable';
import {
  TrendingUp,
  Trash2,
  CheckCircle2,
  Clock,
  Layers,
  AlertTriangle,
  Edit,
  Send,
  Check,
  RotateCcw,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { Quotation, Organization } from '../page';
import { formatDate } from '@/lib/formatters';

interface QuotationListProps {
  quotations: Quotation[];
  organizations: Organization[];
  isLoading: boolean;
  onCompileQuotation: () => void;
  onViewDetails: (q: Quotation) => void;
  onStartEdit: (q: Quotation) => void;
  onDeleteCandidate: (q: Quotation) => void;
  onSubmitToOps?: (q: Quotation) => void;
  onSubmitToBm?: (q: Quotation) => void;
  onBmApprove?: (q: Quotation) => void;
  onBmReject?: (q: Quotation) => void;
  currentUser?: any;
}

export default function QuotationList({
  quotations,
  organizations,
  isLoading,
  onCompileQuotation,
  onViewDetails,
  onStartEdit,
  onDeleteCandidate,
  onSubmitToOps,
  onSubmitToBm,
  onBmApprove,
  onBmReject,
  currentUser
}: QuotationListProps) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<'all' | 'drafts' | 'pending_bm' | 'pending_ops' | 'approved'>('all');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('ALL');

  const userPermissions = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
  const userRole = (currentUser?.role || '').toLowerCase();
  const isAdmin = ['admin', 'super admin', 'superadmin', 'corporate'].includes(userRole) || userPermissions.includes('all');
  
  // Permission-based authority to submit to Ops Team (manageable in User Roles)
  const canSubmitToOps = isAdmin || userPermissions.includes('submit_quotations_ops') || userPermissions.includes('corporate_approver');
  // Staff authority to submit to Branch Manager for review
  const canSubmitToBm = (userPermissions.includes('submit_quotations_bm') || userPermissions.includes('manage_quotations')) && !canSubmitToOps;

  // Filtered dataset based on active tab and selected customer
  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      if (selectedOrgId !== 'ALL' && String(q.organization_id) !== selectedOrgId) {
        return false;
      }
      switch (activeFilter) {
        case 'drafts':
          return q.status === 'Draft';
        case 'pending_bm':
          return q.status === 'Pending Branch Approval' || q.status === 'Draft';
        case 'pending_ops':
          return q.status === 'Pending';
        case 'approved':
          return q.status === 'Approved';
        default:
          return true;
      }
    });
  }, [quotations, activeFilter, selectedOrgId]);

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: quotations.length,
      drafts: quotations.filter(q => q.status === 'Draft').length,
      pending_bm: quotations.filter(q => q.status === 'Pending Branch Approval' || q.status === 'Draft').length,
      pending_ops: quotations.filter(q => q.status === 'Pending').length,
      approved: quotations.filter(q => q.status === 'Approved').length,
    };
  }, [quotations]);

  const columns: Column<Quotation>[] = [
    {
      header: 'QT No.',
      className: 'w-[150px] whitespace-nowrap',
      sortValue: (q) => q.quotation_no,
      accessor: (q) => (
        <div className="flex items-center gap-2.5 group">
          <div 
            onClick={() => onViewDetails(q)}
            className="w-8 h-8 shrink-0 bg-[#2d8d9b]/5 hover:bg-[#2d8d9b]/20 rounded-xl flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/10 shadow-xs cursor-pointer transition-all"
            title="Click to view details"
          >
            <TrendingUp size={15} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onViewDetails(q)}
                className="font-mono font-black text-xs md:text-sm text-[#2d8d9b] hover:underline cursor-pointer border-none bg-transparent p-0 outline-none text-left block"
                title="Click to view details"
              >
                {q.quotation_no}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`/marketing/quotations?id=${q.id}&action=view`, '_blank');
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-400 hover:text-[#2d8d9b] hover:bg-[#2d8d9b]/10 transition-all cursor-pointer shrink-0"
                title="Open quotation in new tab"
              >
                <ExternalLink size={12} />
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold truncate max-w-[140px]" title={q.title}>
              {q.title}
            </p>
          </div>
        </div>
      )
    },
    {
      header: 'Customer',
      className: 'min-w-[160px]',
      sortValue: (q) => q.organizations?.name || '',
      accessor: (q) => (
        q.organization_id ? (
          <div className="group inline-flex items-center gap-1.5 max-w-full">
            <button
              type="button"
              onClick={() => router.push(`/customers/${q.organization_id}`)}
              className="text-xs font-black text-zinc-700 hover:text-[#2d8d9b] hover:underline cursor-pointer border-none bg-transparent p-0 outline-none text-left truncate block"
              title="Click to view customer details"
            >
              {q.organizations?.name || '—'}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`/customers/${q.organization_id}`, '_blank');
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-400 hover:text-[#2d8d9b] hover:bg-[#2d8d9b]/10 transition-all cursor-pointer shrink-0"
              title="Open customer in new tab"
            >
              <ExternalLink size={12} />
            </button>
          </div>
        ) : (
          <p className="text-xs font-black text-zinc-700 truncate" title={q.organizations?.name || '—'}>
            {q.organizations?.name || '—'}
          </p>
        )
      )
    },
    {
      header: 'Design Code',
      className: 'w-[120px] whitespace-nowrap',
      sortValue: (q) => q.group_design_number?.code || '',
      accessor: (q) => (
        <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-lg bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20">
          {q.group_design_number?.code || '—'}
        </span>
      )
    },
    {
      header: 'Delivery Date',
      className: 'w-[140px] whitespace-nowrap',
      sortValue: (q) => q.expected_delivery_date || '',
      accessor: (q) => (
        <div>
          <p className="text-xs font-bold text-zinc-700">
            {q.expected_delivery_date ? formatDate(q.expected_delivery_date) : 'N/A'}
          </p>
          {q.production_days_estimate ? (
            <p className="text-[9px] font-bold text-zinc-400 mt-0.5">
              {q.production_days_estimate}d production
            </p>
          ) : null}
        </div>
      )
    },
    {
      header: 'Value',
      className: 'w-[140px] whitespace-nowrap',
      sortValue: (q) => Number(q.final_quote_value || 0),
      accessor: (q) => (
        <div>
          <p className="text-xs md:text-sm font-black text-[#2d8d9b] font-mono">
            ₹{Number(q.final_quote_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">
            Exp: ₹{Number(q.estimated_expenses).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      )
    },
    {
      header: 'Status',
      className: 'w-[140px] whitespace-nowrap',
      sortValue: (q) => q.status,
      accessor: (q) => {
        if (q.status === 'Pending Branch Approval' || q.status === 'Draft') {
          if (q.metrics_summary?.needs_revision) {
            return (
              <span 
                className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1 w-fit"
                title={q.metrics_summary.bm_rejection_reason ? `Feedback: ${q.metrics_summary.bm_rejection_reason}` : 'Revision requested'}
              >
                <AlertTriangle size={10} className="shrink-0 text-rose-600" />
                Revision Needed
              </span>
            );
          }

          return (
            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1.5 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              Waiting for BM
            </span>
          );
        }

        if (q.status === 'Pending') {
          return (
            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-sky-50 text-sky-700 border-sky-200">
              Under Ops Review
            </span>
          );
        }

        if (q.status === 'Approved') {
          return (
            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-200">
              Approved
            </span>
          );
        }

        return (
          <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-zinc-100 text-zinc-600 border-zinc-200">
            {q.status || 'Draft'}
          </span>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* STATS OVERVIEW CARDS (Matching Customers Page Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Quotations */}
        <div
          onClick={() => setActiveFilter('all')}
          className={`bg-white p-5 rounded-3xl shadow-xs border transition-all cursor-pointer flex items-center justify-between ${
            activeFilter === 'all'
              ? 'border-[#3a525d] ring-2 ring-[#3a525d]/10'
              : 'border-[#fce4d4] hover:border-[#3a525d]/40'
          }`}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">Total Quotations</p>
            <h3 className="text-3xl font-black text-[#3a525d] tracking-tight">{quotations.length}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#3a525d]/5 flex items-center justify-center text-[#3a525d]">
            <Layers size={22} />
          </div>
        </div>

        {/* Awaiting BM Sign-off */}
        <div
          onClick={() => setActiveFilter(activeFilter === 'pending_bm' ? 'all' : 'pending_bm')}
          className={`bg-white p-5 rounded-3xl shadow-xs border transition-all cursor-pointer flex items-center justify-between ${
            activeFilter === 'pending_bm'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20'
              : 'border-[#fce4d4] hover:border-amber-300'
          }`}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 mb-1">Waiting for BM's Approval</p>
            <h3 className="text-3xl font-black text-amber-700 tracking-tight">{counts.pending_bm}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
            <ShieldCheck size={22} />
          </div>
        </div>

        {/* Under Ops Review */}
        <div
          onClick={() => setActiveFilter(activeFilter === 'pending_ops' ? 'all' : 'pending_ops')}
          className={`bg-white p-5 rounded-3xl shadow-xs border transition-all cursor-pointer flex items-center justify-between ${
            activeFilter === 'pending_ops'
              ? 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/20'
              : 'border-[#fce4d4] hover:border-sky-300'
          }`}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600 mb-1">Under Ops Review</p>
            <h3 className="text-3xl font-black text-sky-600 tracking-tight">{counts.pending_ops}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600">
            <Clock size={22} />
          </div>
        </div>

        {/* Approved Quotes */}
        <div
          onClick={() => setActiveFilter(activeFilter === 'approved' ? 'all' : 'approved')}
          className={`bg-white p-5 rounded-3xl shadow-xs border transition-all cursor-pointer flex items-center justify-between ${
            activeFilter === 'approved'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
              : 'border-[#fce4d4] hover:border-emerald-300'
          }`}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-1">Approved Quotes</p>
            <h3 className="text-3xl font-black text-emerald-600 tracking-tight">{counts.approved}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      <DataTable
        title="Quotations Registry"
        subtitle="Manage client proposals, estimation breakdowns, and approval lifecycle"
        columns={columns}
        data={filteredQuotations}
        isLoading={isLoading}
        searchPlaceholder="Search quotations by title, code, or customer..."
        headerAction={
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            {/* Status Dropdown Filter */}
            <div className="flex items-center gap-2">
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as any)}
                className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-black uppercase tracking-wider text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs"
              >
                <option value="all">All Quotes ({counts.all})</option>
                <option value="pending_bm">Waiting for BM's Approval ({counts.pending_bm})</option>
                <option value="pending_ops">Under Ops Review ({counts.pending_ops})</option>
                <option value="approved">Approved Quotes ({counts.approved})</option>
                <option value="drafts">Drafts Only ({counts.drafts})</option>
              </select>
            </div>

            {/* Customer / Organization Filter */}
            {organizations && organizations.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="h-10 px-3 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs"
                >
                  <option value="ALL">All Customers ({quotations.length})</option>
                  {organizations.map((org) => {
                    const count = quotations.filter((q) => q.organization_id === org.id).length;
                    return (
                      <option key={org.id} value={String(org.id)}>
                        {org.name} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>
        }
      />
    </div>
  );
}
