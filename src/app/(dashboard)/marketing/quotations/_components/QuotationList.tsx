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
      header: 'Quote Code & Title',
      accessor: (q) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#2d8d9b]/5 rounded-2xl flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/10 shadow-sm">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-[#3a525d]">{q.title}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{q.quotation_no}</p>
              {q.metrics_summary?.quotation_type && q.metrics_summary.quotation_type !== 'STANDARD' && (
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                  q.metrics_summary.quotation_type === 'HOLD'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-[#3a525d]/10 text-[#3a525d] border border-[#3a525d]/20'
                }`}>
                  {q.metrics_summary.quotation_type === 'HOLD' ? 'Hold' : 'Set Type'}
                </span>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Customer',
      accessor: (q) => (
        <p className="text-xs font-black text-zinc-600">{q.organizations?.name || 'N/A'}</p>
      )
    },
    {
      header: 'Group Design',
      accessor: (q) => (
        <div>
          <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20">
            {q.group_design_number?.code || '—'}
          </span>
        </div>
      )
    },
    {
      header: 'Quote Value',
      accessor: (q) => (
        <div>
          <p className="text-sm font-black text-[#2d8d9b]">₹{Number(q.final_quote_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Exp: ₹{Number(q.estimated_expenses).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      )
    },
    {
      header: 'Sizing Analysis',
      accessor: (q) => (
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg bg-green-50 text-green-600 border border-green-100">
            {q.metrics_summary?.measured || 0} Meas
          </span>
          {q.metrics_summary?.missing && q.metrics_summary.missing > 0 ? (
            <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1">
              <AlertTriangle size={10} /> {q.metrics_summary.missing} Missing
            </span>
          ) : null}
        </div>
      )
    },
    {
      header: 'Lead Time & Delivery',
      accessor: (q) => (
        <div>
          <p className="text-xs font-bold text-zinc-600">{q.production_days_estimate} Prod Days</p>
          <p className="text-[10px] font-black text-[#3a525d] mt-0.5">
            🚚 {q.expected_delivery_date ? new Date(q.expected_delivery_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
          </p>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: (q) => {
        const colors: Record<string, string> = {
          'Draft': 'bg-zinc-50 text-zinc-600 border-zinc-100',
          'Sent': 'bg-blue-50 text-blue-600 border-blue-100',
          'Approved': 'bg-green-50 text-green-600 border-green-100',
          'Rejected': 'bg-red-50 text-red-600 border-red-100',
        };
        return (
          <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${colors[q.status] || colors.Draft}`}>
            {q.status}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      accessor: (q) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => onViewDetails(q)}
            className="w-10 h-10 rounded-xl bg-[#2d8d9b]/5 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white transition-all flex items-center justify-center border border-[#2d8d9b]/10"
            title="View Details"
          >
            <Eye size={16} />
          </button>

          {q.status !== 'Approved' && (
            <button
              onClick={() => onStartEdit(q)}
              className="w-10 h-10 rounded-xl bg-[#2d8d9b]/5 text-amber-600 hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center border border-amber-200"
              title="Edit Quotation"
            >
              <Edit size={16} />
            </button>
          )}

          <button
            onClick={() => onDeleteCandidate(q)}
            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100"
            title="Remove Quotation"
          >
            <Trash2 size={16} />
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
