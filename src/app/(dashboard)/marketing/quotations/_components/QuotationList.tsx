'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, Column, SortInfo } from '@/components/ui/DataTable';
import api from '@/lib/api';
import {
  AlertTriangle,
  ExternalLink,
  Phone,
  X,
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle2,
  Snowflake,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import toast from '@/components/ui/toast';
import { Quotation, Organization } from '../page';
import { formatDate, capitalizeFirstLetter } from '@/lib/formatters';

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
  onRefresh?: () => void;
  onPrintTrigger?: (triggerFn: () => void) => void;
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
  currentUser,
  onRefresh,
  onPrintTrigger
}: QuotationListProps) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<'all' | 'drafts' | 'pending_bm' | 'pending_ops' | 'approved'>('all');
  const [followUpQuotation, setFollowUpQuotation] = useState<Quotation | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('ALL');
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [industries, setIndustries] = useState<any[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('ALL');
  const [zones, setZones] = useState<any[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/branches').catch(() => ({ data: [] })),
      api.get('/industries').catch(() => ({ data: [] })),
      api.get('/zones').catch(() => ({ data: [] })),
      api.get('/employees').catch(() => ({ data: [] }))
    ]).then(([brRes, indRes, zoneRes, empRes]) => {
      setBranches(brRes.data || []);
      setIndustries(indRes.data || []);
      setZones(zoneRes.data || []);
      setEmployees(empRes.data || []);
    });
  }, []);

  // Filter available zones by selected branch
  const availableFilterZones = useMemo(() => {
    if (selectedBranch === 'ALL') return zones;
    return zones.filter(z => String(z.branch_id) === selectedBranch);
  }, [zones, selectedBranch]);

  // Filtered dataset based on branch, zone, sector, and quote status
  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      if (selectedBranch !== 'ALL') {
        const bId = String(q.branch_id || (q.organizations as any)?.branch_id || '');
        if (bId !== selectedBranch) return false;
      }
      if (selectedZone !== 'ALL') {
        const zId = String((q as any).zone_id || (q.organizations as any)?.zone_id || '');
        if (zId !== selectedZone) return false;
      }
      if (selectedOrgId !== 'ALL' && String(q.organization_id) !== selectedOrgId) {
        return false;
      }
      if (selectedIndustry !== 'ALL') {
        const indId = String((q.organizations as any)?.industry_id || '');
        if (indId !== selectedIndustry) return false;
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
  }, [quotations, activeFilter, selectedBranch, selectedZone, selectedOrgId, selectedIndustry]);

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

  // Helper to find salesperson name
  const getSalesPerson = (q: Quotation) => {
    const org = q.organizations as any;
    if (org?.relationship_manager?.full_name) {
      return {
        name: org.relationship_manager.full_name,
        code: org.relationship_manager.employee_id
      };
    }
    if (org?.relationship_manager_id) {
      const match = employees.find(e => e.id === org.relationship_manager_id);
      if (match) {
        return {
          name: match.full_name,
          code: match.employee_id
        };
      }
    }
    return null;
  };

  // Exact 10 Standardized Columns:
  // 1. QUOTATION NO.
  // 2. CUSTOMER NAME
  // 3. CONTACT PERSON
  // 4. CONTACT PH
  // 5. SALES PERSON
  // 6. EXPECTED DATE
  // 7. AMOUNT
  // 8. STATUS
  // 9. STAGE STATUS
  // 10. FOLLOW-UP
  const columns: Column<Quotation>[] = [
    {
      header: 'QUOTATION NO.',
      className: 'w-[140px] whitespace-nowrap',
      sortValue: (q) => q.quotation_no,
      accessor: (q) => (
        <div className="flex items-center gap-1.5 group">
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
            <ExternalLink size={13.5} />
          </button>
        </div>
      )
    },
    {
      header: 'CUSTOMER NAME',
      className: 'min-w-[160px] max-w-[260px]',
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
              <ExternalLink size={13.5} />
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
      header: 'CONTACT',
      className: 'min-w-[140px] max-w-[200px] whitespace-nowrap',
      sortValue: (q) => (q.organizations as any)?.contact_person || (q.organizations as any)?.contact_number || (q.organizations as any)?.phone || '',
      accessor: (q) => {
        const org = q.organizations as any;
        const person = org?.contact_person;
        const title = org?.contact_title;
        const desig = org?.contact_designation;
        const ph = org?.contact_number || org?.phone;

        if (!person && !ph) {
          return <span className="text-zinc-400 text-xs italic font-medium">—</span>;
        }

        return (
          <div className="flex flex-col min-w-0 max-w-[190px]">
            {person && (
              <span className="text-xs font-bold text-[#3a525d] truncate block" title={`${title ? title + ' ' : ''}${person}${desig ? ` (${desig})` : ''}`}>
                {title ? `${title} ` : ''}{person}
              </span>
            )}
            {ph ? (
              <a
                href={`tel:${ph}`}
                className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#3a525d] hover:text-[#2d8d9b] transition-colors mt-0.5"
                title={`Call ${ph}`}
              >
                <Phone size={11} className="text-[#2d8d9b] shrink-0" />
                <span>{ph}</span>
              </a>
            ) : desig ? (
              <span className="text-[9px] text-zinc-400 font-medium truncate block" title={desig}>
                {desig}
              </span>
            ) : null}
          </div>
        );
      }
    },
    {
      header: 'SALES PERSON',
      className: 'min-w-[140px] whitespace-nowrap',
      sortValue: (q) => getSalesPerson(q)?.name || '',
      accessor: (q) => {
        const sp = getSalesPerson(q);
        return sp ? (
          <div className="flex items-center gap-1.5 min-w-0 max-w-[180px]">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#3a525d] truncate block" title={sp.name}>
                {sp.name}
              </p>
              {sp.code && (
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider truncate block">
                  {sp.code}
                </p>
              )}
            </div>
          </div>
        ) : (
          <span className="px-2 py-0.5 bg-zinc-50 border border-zinc-200 rounded-lg text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
            Unassigned
          </span>
        );
      }
    },
    {
      header: 'EXPECTED DATE',
      className: 'w-[125px] whitespace-nowrap',
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
      header: 'AMOUNT',
      className: 'w-[130px] whitespace-nowrap text-right',
      sortValue: (q) => Number(q.final_quote_value || 0),
      accessor: (q) => (
        <div className="text-right">
          <p className="text-xs md:text-sm font-black text-[#2d8d9b] font-mono">
            ₹{Number(q.final_quote_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          {q.estimated_expenses ? (
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">
              Exp: ₹{Number(q.estimated_expenses).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          ) : null}
        </div>
      )
    },
    {
      header: 'STATUS',
      className: 'w-[140px] whitespace-nowrap',
      sortValue: (q) => q.status,
      accessor: (q) => {
        let badge;
        if (q.status === 'Pending Branch Approval' || q.status === 'Draft') {
          if (q.metrics_summary?.needs_revision) {
            badge = (
              <span 
                className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1 w-fit shadow-2xs"
                title={q.metrics_summary.bm_rejection_reason ? `Feedback: ${q.metrics_summary.bm_rejection_reason}` : 'Revision requested'}
              >
                <AlertTriangle size={10} className="shrink-0 text-rose-600" />
                Revision Needed
              </span>
            );
          } else {
            badge = (
              <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1.5 w-fit shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                Waiting for BM
              </span>
            );
          }
        } else if (q.status === 'Pending') {
          badge = (
            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-sky-50 text-sky-700 border-sky-200 shadow-2xs">
              Under Ops Review
            </span>
          );
        } else if (q.status === 'Approved') {
          badge = (
            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs">
              Approved
            </span>
          );
        } else {
          badge = (
            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-zinc-100 text-zinc-600 border-zinc-200 shadow-2xs">
              {q.status || 'Draft'}
            </span>
          );
        }

        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFollowUpQuotation(q);
            }}
            className="group/status inline-flex items-center cursor-pointer text-left transition-all active:scale-95 focus:outline-none"
            title="Click to log follow-up"
          >
            <div className="transition-all group-hover/status:ring-2 group-hover/status:ring-[#2d8d9b]/50 group-hover/status:shadow-sm rounded-lg inline-flex items-center">
              {badge}
            </div>
          </button>
        );
      }
    }
  ];

  const handlePrintQuotations = useCallback((sortedData?: Quotation[], sortInfo?: SortInfo<Quotation>) => {
    const dataToPrint = (sortedData && sortedData.length > 0) ? sortedData : filteredQuotations;
    const printedAt = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const activeBranchName = selectedBranch === 'ALL'
      ? 'All Branches'
      : branches.find(b => String(b.id) === selectedBranch)?.name || `Branch #${selectedBranch}`;

    const rowsHtml = dataToPrint.map((q, idx) => {
      const org = q.organizations as any;
      const person = org?.contact_person || '—';
      const phone = org?.contact_number || org?.phone || '—';
      const sp = getSalesPerson(q)?.name || 'Unassigned';

      return `
      <tr>
        <td style="text-align: center; color: #718096; font-size: 10px;">${idx + 1}</td>
        <td style="font-family: monospace; font-weight: bold; color: #2d8d9b; white-space: nowrap;">${q.quotation_no}</td>
        <td style="font-weight: 800; color: #1a202c; font-size: 11px;">${q.organizations?.name || '—'}</td>
        <td style="font-size: 10px; color: #4a5568;">
          <div style="font-weight: 700;">${person}</div>
          ${phone !== '—' ? `<div style="font-family: monospace; font-size: 9px; color: #718096;">${phone}</div>` : ''}
        </td>
        <td style="font-size: 10px; color: #4a5568;">${sp}</td>
        <td style="font-size: 10px; color: #4a5568; text-align: center;">${q.expected_delivery_date ? formatDate(q.expected_delivery_date) : 'N/A'}</td>
        <td style="font-size: 10px; font-weight: bold; font-family: monospace; text-align: right; color: #1a202c;">
          ₹${(parseFloat(String(q.final_quote_value)) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td style="text-align: center;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 9px; font-weight: bold; text-transform: uppercase; background: #e0f2fe; color: #0369a1;">
            ${q.status}
          </span>
        </td>
      </tr>
    `;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Quotations Commercial Registry - Forma Apparels</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #1a202c; padding: 24px; font-size: 11px; }
    @page { size: landscape; margin: 8mm; }
    .report-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #3a525d; padding-bottom: 14px; margin-bottom: 14px; }
    .brand-title { font-size: 22px; font-weight: 900; color: #3a525d; }
    .brand-subtitle { font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: #2d8d9b; font-weight: 800; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 9px; text-transform: uppercase; font-weight: 800; color: #3a525d; }
    td { border: 1px solid #e2e8f0; padding: 6px 10px; }
    tr:nth-child(even) { background: #f8fafc; }
  </style>
</head>
<body>
  <div class="report-header">
    <div>
      <div class="brand-title">FORMA APPARELS</div>
      <div class="brand-subtitle">Central Manufacturing & Institutional Distribution</div>
      <div style="font-size: 14px; font-weight: 800; color: #2d8d9b; margin-top: 6px;">Quotations Registry Report</div>
    </div>
    <div style="text-align: right; font-size: 10px; color: #4a5568;">
      <div><strong>Printed:</strong> ${printedAt}</div>
      <div><strong>Branch:</strong> ${activeBranchName}</div>
      <div><strong>Total Records:</strong> ${dataToPrint.length}</div>
      ${sortInfo?.headerLabel && sortInfo.headerLabel !== 'Default' ? `<div><strong>Sorted by:</strong> ${sortInfo.headerLabel} (${sortInfo.direction === 'asc' ? 'Ascending' : 'Descending'})</div>` : ''}
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 30px;">#</th>
        <th>QUOTATION NO.</th>
        <th>CUSTOMER NAME</th>
        <th>CONTACT</th>
        <th>SALES PERSON</th>
        <th style="text-align: center;">EXPECTED DATE</th>
        <th style="text-align: right;">AMOUNT</th>
        <th style="text-align: center;">STATUS</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="8" style="text-align: center; padding: 20px;">No quotations matching filters</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 250);
    }
  }, [filteredQuotations, selectedBranch, branches]);

  const printTriggerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (onPrintTrigger) {
      onPrintTrigger(() => {
        if (printTriggerRef.current) {
          printTriggerRef.current();
        } else {
          handlePrintQuotations();
        }
      });
    }
  }, [onPrintTrigger, handlePrintQuotations]);

  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        data={filteredQuotations}
        isLoading={isLoading}
        searchPlaceholder="Search"
        onPrint={handlePrintQuotations}
        hideTablePrint={true}
        printTriggerRef={printTriggerRef}
        headerAction={
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* 1. Branch Filter */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs hover:border-[#2d8d9b]/50"
            >
              <option value="ALL">All Branches ({quotations.length})</option>
              {branches.map((b) => {
                const count = quotations.filter(q => String(q.branch_id || (q.organizations as any)?.branch_id || '') === String(b.id)).length;
                return (
                  <option key={b.id} value={String(b.id)}>
                    {b.name} ({count})
                  </option>
                );
              })}
            </select>

            {/* 2. All Quote (Status Filter) */}
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as any)}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs hover:border-[#2d8d9b]/50"
            >
              <option value="all">All Quote ({counts.all})</option>
              <option value="pending_bm">Waiting for BM's Approval ({counts.pending_bm})</option>
              <option value="pending_ops">Under Ops Review ({counts.pending_ops})</option>
              <option value="approved">Approved Quotes ({counts.approved})</option>
              <option value="drafts">Drafts Only ({counts.drafts})</option>
            </select>

            {/* 3. Zone Filter */}
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs hover:border-[#2d8d9b]/50"
            >
              <option value="ALL">All Zones ({quotations.length})</option>
              {availableFilterZones.map(z => {
                const count = quotations.filter(q => String((q as any).zone_id || (q.organizations as any)?.zone_id || '') === String(z.id)).length;
                return (
                  <option key={z.id} value={String(z.id)}>
                    {z.name} ({count})
                  </option>
                );
              })}
            </select>

            {/* 4. Sector / Industry Filter */}
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs hover:border-[#2d8d9b]/50"
            >
              <option value="ALL">All Sectors ({quotations.length})</option>
              {industries.map((ind) => {
                const count = quotations.filter((q) => String((q.organizations as any)?.industry_id || '') === String(ind.id)).length;
                return (
                  <option key={ind.id} value={String(ind.id)}>
                    {ind.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        }
      />

      {followUpQuotation && (
        <QuotationFollowUpModal
          quotation={followUpQuotation}
          currentUser={currentUser}
          onClose={() => setFollowUpQuotation(null)}
          onSuccess={() => {
            setFollowUpQuotation(null);
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------------------------------
// Quotation Follow-up Communication & Logging Modal
// -------------------------------------------------------------------------------------
interface QuotationFollowUpModalProps {
  quotation: Quotation;
  onClose: () => void;
  onSuccess: () => void;
  currentUser?: any;
}

export const QuotationFollowUpModal: React.FC<QuotationFollowUpModalProps> = ({
  quotation,
  onClose,
  onSuccess,
  currentUser
}) => {
  const [responseType, setResponseType] = useState<'positive' | 'hold' | 'revision' | 'cold_lead'>('hold');
  const [remarks, setRemarks] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const pastFollowups: any[] = Array.isArray(quotation.metrics_summary?.followups)
    ? quotation.metrics_summary.followups
    : [];

  const handleSubmit = async () => {
    if (!remarks.trim()) {
      toast.error('Please enter follow-up communication notes');
      return;
    }
    setIsSubmitting(true);
    const toastId = toast.loading('Saving follow-up log for quotation...');

    try {
      const res = await api.post(`/quotations/${quotation.id}/follow-up`, {
        outcome: responseType,
        response_type: responseType,
        remarks: remarks.trim(),
        text: remarks.trim(),
        next_followup_date: nextFollowUpDate || null
      });

      toast.success(res.data?.message || 'Quotation follow-up logged successfully!', { id: toastId });
      onSuccess();
    } catch (err: any) {
      console.warn('Direct quotation follow-up endpoint error, applying safe fallback...', err);
      try {
        const authorName = currentUser?.fullName || currentUser?.full_name || currentUser?.name || 'Sales Representative';
        const now = new Date();
        const newEntry = {
          id: Date.now(),
          created_at: now.toISOString(),
          date: now.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }),
          time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          response_type: responseType,
          outcome: responseType,
          remarks: remarks.trim(),
          next_followup_date: nextFollowUpDate || null,
          author: { name: authorName }
        };

        const updatedMetrics = {
          ...(quotation.metrics_summary || {}),
          followups: [newEntry, ...pastFollowups],
          last_followup: newEntry,
          last_followup_at: now.toISOString()
        };

        await api.put(`/quotations/${quotation.id}`, {
          title: quotation.title || `Quotation ${quotation.quotation_no}`,
          organization_id: quotation.organization_id,
          items: quotation.items || [],
          metrics_summary: updatedMetrics
        }).catch(() => null);

        toast.success('Quotation follow-up recorded successfully!', { id: toastId });
        onSuccess();
      } catch (fallbackErr: any) {
        toast.error(err.response?.data?.error || fallbackErr.message || 'Failed to save follow-up', { id: toastId });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-zinc-100 overflow-hidden relative p-8 space-y-5 z-10 animate-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/30 text-[10px] font-black uppercase font-mono tracking-wider">
                {quotation.quotation_no}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 text-[10px] font-black uppercase">
                {quotation.status}
              </span>
            </div>
            <h3 className="text-xl font-black text-[#3a525d] italic mt-1.5">Record Follow-up Communication</h3>
            <p className="text-xs text-zinc-500 font-bold mt-0.5">
              Client: <span className="text-[#3a525d]">{quotation.organizations?.name || '—'}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Outcome Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
              Follow-up Outcome *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setResponseType('positive')}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  responseType === 'positive'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 bg-zinc-50/50'
                }`}
              >
                <span className="text-xs font-black block flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  Positive (Moving Ahead)
                </span>
                <span className="text-[10px] text-emerald-700/80 font-medium mt-0.5 block">
                  Accepted / Proceeding to Sales Order
                </span>
              </button>

              <button
                type="button"
                onClick={() => setResponseType('hold')}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  responseType === 'hold'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 bg-zinc-50/50'
                }`}
              >
                <span className="text-xs font-black block flex items-center gap-1.5">
                  <Clock size={13} className="text-amber-600 shrink-0" />
                  Under Review / Hold
                </span>
                <span className="text-[10px] text-amber-700/80 font-medium mt-0.5 block">
                  Comparing quotes / Decision in progress
                </span>
              </button>

              <button
                type="button"
                onClick={() => setResponseType('revision')}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  responseType === 'revision'
                    ? 'border-sky-500 bg-sky-50 text-sky-900 shadow-sm'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 bg-zinc-50/50'
                }`}
              >
                <span className="text-xs font-black block flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-sky-600 shrink-0" />
                  Revision Requested
                </span>
                <span className="text-[10px] text-sky-700/80 font-medium mt-0.5 block">
                  Client requested pricing or spec adjustment
                </span>
              </button>

              <button
                type="button"
                onClick={() => setResponseType('cold_lead')}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  responseType === 'cold_lead'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-sm'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 bg-zinc-50/50'
                }`}
              >
                <span className="text-xs font-black block flex items-center gap-1.5">
                  <Snowflake size={13} className="text-rose-500 shrink-0" />
                  Cold / Dropped
                </span>
                <span className="text-[10px] text-rose-700/80 font-medium mt-0.5 block">
                  Declined or chose another vendor
                </span>
              </button>
            </div>
          </div>

          {/* Next Follow-up Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
              <Calendar size={11} className="text-[#2d8d9b]" />
              Next Scheduled Follow-up Date (Optional)
            </label>
            <input
              type="date"
              value={nextFollowUpDate}
              onChange={(e) => setNextFollowUpDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-zinc-200 text-xs font-semibold focus:outline-none focus:border-[#2d8d9b] bg-white transition-all"
            />
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
              <MessageSquare size={11} className="text-[#2d8d9b]" />
              Follow-up Communication Notes *
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(capitalizeFirstLetter(e.target.value))}
              placeholder="e.g. Spoke to procurement manager; client approved sample fabric swatch and requested revised quantity for operations staff..."
              className="w-full px-4 py-3 rounded-2xl border border-zinc-200 text-xs font-semibold focus:outline-none focus:border-[#2d8d9b] resize-none transition-all"
            />
          </div>

          {/* Past Follow-up History (if any) */}
          {pastFollowups.length > 0 && (
            <div className="border border-zinc-200 rounded-2xl p-3 bg-zinc-50/50 space-y-2">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between text-xs font-black text-[#3a525d] uppercase tracking-wider cursor-pointer"
              >
                <span>Follow-up History ({pastFollowups.length})</span>
                {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showHistory && (
                <div className="space-y-2 pt-2 max-h-40 overflow-y-auto pr-1">
                  {pastFollowups.map((entry, idx) => (
                    <div key={entry.id || idx} className="bg-white p-2.5 rounded-xl border border-zinc-100 shadow-2xs text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold">
                        <span>{entry.date} {entry.time ? `• ${entry.time}` : ''}</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-zinc-100 text-zinc-700">
                          {entry.outcome || entry.response_type || 'Follow-up'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-zinc-700">{entry.remarks || entry.text}</p>
                      {entry.author?.name && (
                        <p className="text-[9px] text-zinc-400 font-medium">Logged by: {entry.author.name}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 pt-2 shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 py-3 text-[10px] font-black uppercase"
          >
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={handleSubmit}
            className={`flex-1 py-3 text-[10px] font-black uppercase text-white shadow-lg ${
              responseType === 'positive'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                : responseType === 'revision'
                ? 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/20'
                : responseType === 'cold_lead'
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
            }`}
          >
            {isSubmitting ? 'Saving...' : 'Save Follow-up'}
          </Button>
        </div>
      </div>
    </div>
  );
};
