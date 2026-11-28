'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Calendar, CheckCircle2, ChevronDown, ChevronUp, Clock, ExternalLink, RotateCcw, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/formatters';

// Same labels/colours as the QUOTE STATUS column in QuotationList
function statusConfig(q: any): { label: string; cls: string; Icon?: any } {
  switch (q.status) {
    case 'Draft':
      return q.metrics_summary?.needs_revision
        ? { label: q.metrics_summary?.returned_by === 'ops' ? 'Returned by Ops' : 'Returned by BM', cls: 'bg-rose-50 text-rose-700 border-rose-200', Icon: AlertTriangle }
        : { label: 'Draft', cls: 'bg-zinc-100 text-zinc-700 border-zinc-200' };
    case 'Pending Branch Approval': return { label: 'Waiting for BM', cls: 'bg-amber-50 text-amber-800 border-amber-300', Icon: Clock };
    case 'BM Approved': return { label: 'BM Approved', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', Icon: CheckCircle2 };
    case 'Pending Ops Approval': return { label: 'Waiting for Ops', cls: 'bg-orange-50 text-orange-800 border-orange-300', Icon: Clock };
    case 'Ops Approved': return { label: 'Ops Approved', cls: 'bg-sky-50 text-sky-700 border-sky-200', Icon: CheckCircle2 };
    case 'Pending Customer Approval': return { label: 'With Customer', cls: 'bg-violet-50 text-violet-700 border-violet-200', Icon: Clock };
    case 'Approved': return { label: 'Customer Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 };
    case 'Rejected': return { label: 'Rejected', cls: 'bg-rose-50 text-rose-700 border-rose-200', Icon: XCircle };
    case 'Revision Requested': return { label: 'Revision Requested', cls: 'bg-purple-50 text-purple-700 border-purple-200', Icon: RotateCcw };
    case 'Revised': return { label: 'Revised', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
    default: return { label: q.status || 'Draft', cls: 'bg-zinc-100 text-zinc-700 border-zinc-200' };
  }
}

function outcomeConfig(outcome: string): { label: string; cls: string } {
  const o = String(outcome || '').toLowerCase();
  if (o.includes('approv') || o.includes('pos') || o.includes('won')) return { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (o.includes('revision')) return { label: 'Revision Requested', cls: 'bg-purple-50 text-purple-700 border-purple-200' };
  if (o.includes('reject') || o.includes('neg') || o.includes('decline')) return { label: 'Rejected', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
  if (o.includes('held') || o.includes('hold') || o.includes('pend')) return { label: 'Held', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: outcome || 'Follow-up', cls: 'bg-zinc-100 text-zinc-700 border-zinc-200' };
}

const money = (v: any) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

interface QuoteLogCardProps {
  quote: any;
  versionLabel: string;
  defaultExpanded?: boolean;
  onView?: (quote: any) => void;
}

export default function QuoteLogCard({ quote, versionLabel, defaultExpanded = false, onView }: QuoteLogCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [items, setItems] = useState<any[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  // List endpoint has no items; fetch the detail once, on first expand
  useEffect(() => {
    if (!expanded || items || loadError) return;
    api.get(`/quotations/${quote.id}`)
      .then(res => setItems(res.data?.quotation_items || res.data?.items || []))
      .catch(() => setLoadError(true));
  }, [expanded, items, loadError, quote.id]);

  const status = statusConfig(quote);
  const quoteNo = quote.quotation_no || quote.quotation_number || `QT-${quote.id}`;
  const followups: any[] = Array.isArray(quote.metrics_summary?.followups) ? quote.metrics_summary.followups : [];
  const lineItems = (items || []).filter(it => !it.size_breakdown?.is_separate_fabric);
  const feedback = quote.metrics_summary?.bm_rejection_reason;
  const customerFeedback = quote.metrics_summary?.customer_revision_reason;
  const supersededBy = quote.metrics_summary?.revised_to_quotation_no;

  return (
    <div className="space-y-2.5">
      {/* Header: version, number, status, amount */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
              versionLabel.includes('First') || versionLabel.includes('/01') || versionLabel.includes('Initial') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {versionLabel}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border inline-flex items-center gap-1 ${status.cls}`}>
              {status.Icon && <status.Icon size={10} className="shrink-0" />}
              {status.label}
            </span>
          </div>
          <p className="font-mono font-bold text-sm text-zinc-900">{quoteNo}</p>
        </div>
        <div className="text-right space-y-1">
          <p className="font-mono font-black text-sm text-[#C82A2B]">{money(quote.final_quote_value || quote.total_amount)}</p>
          {onView && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onView(quote); }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#C82A2B] hover:bg-[#A81D1E] text-white shadow-xs transition-all cursor-pointer"
            >
              <span>View Quotation</span>
              <ExternalLink size={10} className="shrink-0" />
            </button>
          )}
        </div>
      </div>

      {supersededBy && (
        <p className="text-[10px] font-bold text-blue-700">Superseded by {supersededBy}</p>
      )}
      {feedback && (
        <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-[10px] text-rose-800 font-medium leading-relaxed">
          <strong>BM Feedback:</strong> {feedback}
        </div>
      )}
      {customerFeedback && (
        <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-[10px] text-purple-800 font-medium leading-relaxed">
          <strong>Customer Revision Request:</strong> {customerFeedback}
        </div>
      )}

      {/* Item list (lazy) */}
      <div className="border border-zinc-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
          className="w-full flex items-center justify-between px-3 py-2 bg-zinc-50 hover:bg-zinc-100 text-[10px] font-black uppercase tracking-wider text-zinc-700 cursor-pointer"
        >
          <span>Items{items ? ` (${lineItems.length})` : ''}</span>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        {expanded && (
          <div className="divide-y divide-zinc-100 bg-white">
            {loadError ? (
              <p className="p-3 text-[11px] text-rose-600 font-medium">Could not load items for this quotation.</p>
            ) : !items ? (
              <p className="p-3 text-[11px] text-zinc-400 font-medium">Loading items...</p>
            ) : lineItems.length === 0 ? (
              <p className="p-3 text-[11px] text-zinc-400 font-medium">No items on this quotation.</p>
            ) : lineItems.map((it, idx) => {
              const name = it.product_name || it.size_breakdown?.product_name || it.manual_item_name || it.product_types?.name || it.products?.name || `Item #${idx + 1}`;
              const size = it.size_breakdown?.selected_size;
              const design = it.size_breakdown?.design_number || it.design_number;
              const dept = it.size_breakdown?.department_name;
              return (
                <div key={it.id || idx} className="px-3 py-2 flex items-start justify-between gap-3 text-[11px]">
                  <div className="min-w-0">
                    <p className="font-bold text-zinc-900">{idx + 1}. {name}{size ? ` (Size: ${size})` : ''}</p>
                    {(design || dept) && (
                      <p className="text-[10px] text-zinc-500">{[dept, design && `Design: ${design}`].filter(Boolean).join(' • ')}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 text-zinc-600">
                    <p>Qty <strong className="text-zinc-900">{Number(it.quantity) || 0}</strong> × <span className="font-mono">{money(it.unit_price)}</span></p>
                    <p className="font-mono font-bold text-zinc-900">{money(it.total_price)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Customer follow-ups on this quote */}
      {followups.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Customer Follow-ups ({followups.length})</p>
          {followups.map((f: any, idx: number) => {
            const oc = outcomeConfig(f.outcome || f.response_type);
            return (
              <div key={f.id || idx} className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className={`px-2 py-0.5 rounded-md font-black uppercase tracking-wider border ${oc.cls}`}>{oc.label}</span>
                  <span className="text-zinc-400 font-medium">
                    {f.created_at || f.date ? formatDate(f.created_at || f.date) : 'Recent'}{f.author?.name ? ` • ${f.author.name}` : ''}
                  </span>
                </div>
                {(f.remarks || f.text) && <p className="text-[11px] font-medium text-zinc-700 whitespace-pre-wrap">{f.remarks || f.text}</p>}
                {f.next_followup_date && (
                  <p className="text-[10px] font-bold text-amber-700 inline-flex items-center gap-1">
                    <Calendar size={10} /> Next Follow-up: {formatDate(f.next_followup_date)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
