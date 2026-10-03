'use client';

import React, { useState, useMemo } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Card } from '@/components/ui/Card';
import {
  TrendingUp,
  Trash2,
  Eye,
  CheckCircle2,
  Scale,
  Clock,
  Layers,
  AlertTriangle,
  Edit,
  Send,
  Check,
  RotateCcw,
  ShieldCheck,
  FileText
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
  const [activeFilter, setActiveFilter] = useState<'all' | 'drafts' | 'pending_bm' | 'pending_ops' | 'approved'>('all');

  const userPermissions = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
  const userRole = (currentUser?.role || '').toLowerCase();
  const isAdmin = ['admin', 'super admin', 'superadmin', 'corporate'].includes(userRole) || userPermissions.includes('all');
  
  // Permission-based authority to submit to Ops Team (manageable in User Roles)
  const canSubmitToOps = isAdmin || userPermissions.includes('submit_quotations_ops') || userPermissions.includes('corporate_approver');
  // Staff authority to submit to Branch Manager for review
  const canSubmitToBm = (userPermissions.includes('submit_quotations_bm') || userPermissions.includes('manage_quotations')) && !canSubmitToOps;

  // Filtered dataset based on active tab
  const filteredQuotations = useMemo(() => {
    switch (activeFilter) {
      case 'drafts':
        return quotations.filter(q => q.status === 'Draft');
      case 'pending_bm':
        return quotations.filter(q => q.status === 'Pending Branch Approval');
      case 'pending_ops':
        return quotations.filter(q => q.status === 'Pending');
      case 'approved':
        return quotations.filter(q => q.status === 'Approved');
      default:
        return quotations;
    }
  }, [quotations, activeFilter]);

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: quotations.length,
      drafts: quotations.filter(q => q.status === 'Draft').length,
      pending_bm: quotations.filter(q => q.status === 'Pending Branch Approval').length,
      pending_ops: quotations.filter(q => q.status === 'Pending').length,
      approved: quotations.filter(q => q.status === 'Approved').length,
    };
  }, [quotations]);

  const columns: Column<Quotation>[] = [
    {
      header: 'Quote & Title',
      className: 'min-w-[200px] max-w-[260px]',
      accessor: (q) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 shrink-0 bg-[#2d8d9b]/5 rounded-xl flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/10 shadow-sm">
            <TrendingUp size={15} />
          </div>
          <div className="min-w-0">
            <p className="font-black text-xs md:text-sm tracking-tight text-[#3a525d] truncate" title={q.title}>{q.title}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[9px] font-bold text-zinc-400 font-mono tracking-wider">{q.quotation_no}</span>
              {q.metrics_summary?.quotation_type && (
                <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider ${
                  q.metrics_summary.quotation_type === 'FABRIC_SET'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : q.metrics_summary.quotation_type === 'FABRIC'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : q.metrics_summary.quotation_type === 'STANDARD'
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-[#3a525d]/10 text-[#3a525d] border border-[#3a525d]/20'
                }`}>
                  {q.metrics_summary.quotation_type === 'FABRIC_SET' && 'Fabric Set'}
                  {q.metrics_summary.quotation_type === 'READYMADE_SET' && 'Readymade Set'}
                  {q.metrics_summary.quotation_type === 'FABRIC' && 'Fabric Normal'}
                  {q.metrics_summary.quotation_type === 'STANDARD' && 'Readymade Normal'}
                  {q.metrics_summary.quotation_type === 'MANUAL' && 'Manual'}
                </span>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Customer',
      className: 'max-w-[140px]',
      accessor: (q) => (
        <p className="text-xs font-black text-zinc-700 truncate" title={q.organizations?.name || 'Customer'}>
          {q.organizations?.name || 'Customer'}
        </p>
      )
    },
    {
      header: 'Design Code',
      className: 'whitespace-nowrap',
      accessor: (q) => (
        <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-lg bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20">
          {q.group_design_number?.code || '—'}
        </span>
      )
    },
    {
      header: 'Quote Value',
      className: 'whitespace-nowrap',
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
      header: 'Sizing',
      className: 'whitespace-nowrap',
      accessor: (q) => (
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-lg bg-green-50 text-green-600 border border-green-100">
            {q.metrics_summary?.measured || 0} Meas
          </span>
          {q.metrics_summary?.missing && q.metrics_summary.missing > 0 ? (
            <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1">
              <AlertTriangle size={9} /> {q.metrics_summary.missing}
            </span>
          ) : null}
        </div>
      )
    },
    {
      header: 'Delivery',
      className: 'whitespace-nowrap',
      accessor: (q) => (
        <div>
          <p className="text-xs font-bold text-zinc-600">{q.production_days_estimate}d Prod</p>
          <p className="text-[9px] font-black text-[#3a525d] mt-0.5">
            🚚 {q.expected_delivery_date ? formatDate(q.expected_delivery_date) : 'N/A'}
          </p>
        </div>
      )
    },
    {
      header: 'Status',
      className: 'whitespace-nowrap',
      accessor: (q) => {
        if (q.status === 'Pending Branch Approval') {
          return (
            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1.5 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              Awaiting BM Review
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

        if (q.status === 'Draft' && q.metrics_summary?.needs_revision) {
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
          <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-zinc-100 text-zinc-600 border-zinc-200">
            Draft
          </span>
        );
      }
    },
    {
      header: 'Actions',
      className: 'whitespace-nowrap text-right',
      accessor: (q) => {
        return (
          <div className="flex items-center justify-end gap-1.5">
            {/* 1. Branch Manager Review Actions for quotations awaiting BM approval */}
            {q.status === 'Pending Branch Approval' && canSubmitToOps && (
              <>
                {onBmApprove && (
                  <button
                    onClick={() => onBmApprove(q)}
                    className="h-8 px-2.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1.5 border border-emerald-200 shadow-sm text-[10px] font-black uppercase tracking-wider whitespace-nowrap"
                    title="Approve quotation & submit to Operations Team"
                  >
                    <Check size={12} strokeWidth={3} />
                    <span>Approve & Ops</span>
                  </button>
                )}
                {onBmReject && (
                  <button
                    onClick={() => onBmReject(q)}
                    className="h-8 px-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white transition-all flex items-center gap-1 border border-amber-200 shadow-sm text-[10px] font-black uppercase tracking-wider whitespace-nowrap"
                    title="Request changes / Send back to Draft"
                  >
                    <RotateCcw size={12} strokeWidth={2.5} />
                    <span>Revision</span>
                  </button>
                )}
              </>
            )}

            {/* 2. Marketing Author Actions: Submit to Branch Manager */}
            {q.status === 'Draft' && canSubmitToBm && onSubmitToBm && (
              <button
                onClick={() => onSubmitToBm(q)}
                className="h-8 px-2.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white transition-all flex items-center gap-1.5 border border-sky-200 shadow-sm text-[10px] font-black uppercase tracking-wider whitespace-nowrap"
                title="Submit Quotation to Branch Manager for Review"
              >
                <Send size={12} strokeWidth={2.5} />
                <span>Submit to BM</span>
              </button>
            )}

            {/* 3. Branch Manager / Admin Actions on Draft: Direct Submit to Ops */}
            {q.status === 'Draft' && canSubmitToOps && onSubmitToOps && (
              <button
                onClick={() => onSubmitToOps(q)}
                className="h-8 px-2.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1.5 border border-emerald-200 shadow-sm text-[10px] font-black uppercase tracking-wider whitespace-nowrap"
                title="Submit Quotation directly to Operations Team"
              >
                <Send size={12} strokeWidth={2.5} />
                <span>Submit to Ops</span>
              </button>
            )}

            {/* Standard inspection button */}
            <button
              onClick={() => onViewDetails(q)}
              className="w-8 h-8 rounded-lg bg-[#2d8d9b]/5 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white transition-all flex items-center justify-center border border-[#2d8d9b]/10 shadow-sm"
              title="View Quotation Details"
            >
              <Eye size={14} />
            </button>

            {/* Edit button (disabled once approved) */}
            {q.status !== 'Approved' && (
              <button
                onClick={() => onStartEdit(q)}
                className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center border border-amber-200 shadow-sm"
                title="Edit Quotation"
              >
                <Edit size={14} />
              </button>
            )}

            {/* Delete button */}
            <button
              onClick={() => onDeleteCandidate(q)}
              className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100 shadow-sm"
              title="Remove Quotation"
            >
              <Trash2 size={14} />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-5 border border-zinc-100 flex items-center gap-4 shadow-sm rounded-3xl bg-white">
          <div className="w-12 h-12 bg-[#2d8d9b]/10 rounded-2xl flex items-center justify-center text-[#2d8d9b]">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-[#3a525d]">{quotations.length}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Total Quotations</p>
          </div>
        </Card>

        <Card className="p-5 border border-zinc-100 flex items-center gap-4 shadow-sm rounded-3xl bg-white">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-amber-600">{counts.pending_bm}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Awaiting BM Sign-off</p>
          </div>
        </Card>

        <Card className="p-5 border border-zinc-100 flex items-center gap-4 shadow-sm rounded-3xl bg-white">
          <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-sky-600">{counts.pending_ops}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Under Ops Review</p>
          </div>
        </Card>

        <Card className="p-5 border border-zinc-100 flex items-center gap-4 shadow-sm rounded-3xl bg-white">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-600">{counts.approved}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Approved Quotes</p>
          </div>
        </Card>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-zinc-100">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeFilter === 'all'
              ? 'bg-[#3a525d] text-white shadow-md'
              : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
          }`}
        >
          <span>All Quotes</span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono ${
            activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
          }`}>
            {counts.all}
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('drafts')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeFilter === 'drafts'
              ? 'bg-[#3a525d] text-white shadow-md'
              : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
          }`}
        >
          <span>Drafts</span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono ${
            activeFilter === 'drafts' ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
          }`}>
            {counts.drafts}
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('pending_bm')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeFilter === 'pending_bm'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'text-zinc-500 hover:text-amber-700 hover:bg-amber-50'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Awaiting BM Approval
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono ${
            activeFilter === 'pending_bm' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
          }`}>
            {counts.pending_bm}
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('pending_ops')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeFilter === 'pending_ops'
              ? 'bg-[#2d8d9b] text-white shadow-md shadow-[#2d8d9b]/20'
              : 'text-zinc-500 hover:text-[#2d8d9b] hover:bg-[#2d8d9b]/10'
          }`}
        >
          <span>Under Ops Review</span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono ${
            activeFilter === 'pending_ops' ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-800'
          }`}>
            {counts.pending_ops}
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('approved')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeFilter === 'approved'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-zinc-500 hover:text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          <span>Approved</span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono ${
            activeFilter === 'approved' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
          }`}>
            {counts.approved}
          </span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filteredQuotations}
        isLoading={isLoading}
        searchPlaceholder="Search quotations by title, code, or customer..."
      />
    </div>
  );
}
