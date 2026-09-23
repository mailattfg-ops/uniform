'use client';

import React from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  TrendingUp,
  Plus,
  Trash2,
  Eye,
  CheckCircle2,
  Scale,
  Clock,
  Layers,
  AlertTriangle,
  Edit
} from 'lucide-react';
import { Quotation, Organization } from '../page';

interface QuotationListProps {
  quotations: Quotation[];
  organizations: Organization[];
  isLoading: boolean;
  onCompileQuotation: () => void;
  onViewDetails: (q: Quotation) => void;
  onStartEdit: (q: Quotation) => void;
  onDeleteCandidate: (q: Quotation) => void;
}

export default function QuotationList({
  quotations,
  organizations,
  isLoading,
  onCompileQuotation,
  onViewDetails,
  onStartEdit,
  onDeleteCandidate
}: QuotationListProps) {

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
        <p className="text-xs font-black text-zinc-700 truncate" title={q.organizations?.name || 'N/A'}>
          {q.organizations?.name || 'N/A'}
        </p>
      )
    },
    {
      header: 'DNS Code',
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
            🚚 {q.expected_delivery_date ? new Date(q.expected_delivery_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }) : 'N/A'}
          </p>
        </div>
      )
    },
    {
      header: 'Status',
      className: 'whitespace-nowrap',
      accessor: (q) => {
        const colors: Record<string, string> = {
          'Draft': 'bg-zinc-50 text-zinc-600 border-zinc-100',
          'Sent': 'bg-blue-50 text-blue-600 border-blue-100',
          'Approved': 'bg-green-50 text-green-600 border-green-100',
          'Rejected': 'bg-red-50 text-red-600 border-red-100',
        };
        return (
          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${colors[q.status] || colors.Draft}`}>
            {q.status}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      className: 'whitespace-nowrap text-right',
      accessor: (q) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => onViewDetails(q)}
            className="w-8 h-8 rounded-lg bg-[#2d8d9b]/5 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white transition-all flex items-center justify-center border border-[#2d8d9b]/10 shadow-sm"
            title="View Details"
          >
            <Eye size={14} />
          </button>

          {q.status !== 'Approved' && (
            <button
              onClick={() => onStartEdit(q)}
              className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center border border-amber-200 shadow-sm"
              title="Edit Quotation"
            >
              <Edit size={14} />
            </button>
          )}

          <button
            onClick={() => onDeleteCandidate(q)}
            className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100 shadow-sm"
            title="Remove Quotation"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 border border-zinc-100 flex items-center gap-5 shadow-sm rounded-3xl">
          <div className="w-14 h-14 bg-[#2d8d9b]/10 rounded-2xl flex items-center justify-center text-[#2d8d9b]">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-2xl font-black text-[#3a525d]">{quotations.length}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Total Quotations</p>
          </div>
        </Card>

        <Card className="p-6 border border-zinc-100 flex items-center gap-5 shadow-sm rounded-3xl">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-2xl font-black text-green-600">
              {quotations.filter(q => q.status === 'Approved').length}
            </p>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Approved Quotes</p>
          </div>
        </Card>

        <Card className="p-6 border border-zinc-100 flex items-center gap-5 shadow-sm rounded-3xl">
          <div className="w-14 h-14 bg-[#3a525d]/10 rounded-2xl flex items-center justify-center text-[#3a525d]">
            <Scale size={24} />
          </div>
          <div>
            <p className="text-2xl font-black text-[#3a525d]">
              ₹{quotations.reduce((acc, q) => acc + Number(q.final_quote_value), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Total Registry Value</p>
          </div>
        </Card>

        <Card className="p-6 border border-zinc-100 flex items-center gap-5 shadow-sm rounded-3xl">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-2xl font-black text-amber-600">
              {quotations.filter(q => q.status === 'Draft').length}
            </p>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Pending Drafts</p>
          </div>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={quotations}
        isLoading={isLoading}
        searchPlaceholder="Search compiled quotations by title or code..."
      />
    </div>
  );
}
