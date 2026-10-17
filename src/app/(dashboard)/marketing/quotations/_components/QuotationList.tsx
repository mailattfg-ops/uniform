'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, Column, SortInfo } from '@/components/ui/DataTable';
import api from '@/lib/api';
import {
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  Phone
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
        <div className="flex items-center gap-2 group">
          <div 
            onClick={() => onViewDetails(q)}
            className="w-7 h-7 shrink-0 bg-[#2d8d9b]/5 hover:bg-[#2d8d9b]/20 rounded-xl flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/10 shadow-xs cursor-pointer transition-all"
            title="Click to view details"
          >
            <TrendingUp size={14} />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
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
      header: 'CONTACT PERSON',
      className: 'min-w-[130px] max-w-[190px] whitespace-nowrap',
      sortValue: (q) => (q.organizations as any)?.contact_person || '',
      accessor: (q) => {
        const org = q.organizations as any;
        const person = org?.contact_person;
        const title = org?.contact_title;
        const desig = org?.contact_designation;
        return person ? (
          <div className="flex flex-col min-w-0 max-w-[180px]">
            <span className="text-xs font-bold text-[#3a525d] truncate block" title={`${title ? title + ' ' : ''}${person}`}>
              {title ? `${title} ` : ''}{person}
            </span>
            {desig && (
              <span className="text-[9px] text-zinc-400 font-medium truncate block" title={desig}>
                {desig}
              </span>
            )}
          </div>
        ) : (
          <span className="text-zinc-400 text-xs italic font-medium">—</span>
        );
      }
    },
    {
      header: 'CONTACT PH',
      className: 'w-[130px] whitespace-nowrap',
      sortValue: (q) => (q.organizations as any)?.contact_number || (q.organizations as any)?.phone || '',
      accessor: (q) => {
        const org = q.organizations as any;
        const ph = org?.contact_number || org?.phone;
        return ph ? (
          <a
            href={`tel:${ph}`}
            className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#3a525d] hover:text-[#2d8d9b] transition-colors"
            title={`Call ${ph}`}
          >
            <Phone size={12} className="text-[#2d8d9b] shrink-0" />
            <span>{ph}</span>
          </a>
        ) : (
          <span className="text-zinc-400 text-xs italic font-medium">—</span>
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
    },
    {
      header: 'STAGE STATUS',
      className: 'w-[130px] whitespace-nowrap',
      sortValue: () => 'Quotations',
      accessor: () => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-2xs">
          Quotations
        </span>
      )
    },
    {
      header: 'FOLLOW-UP',
      className: 'w-[120px] whitespace-nowrap text-right',
      sortable: false,
      accessor: (q) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onViewDetails(q)}
            className="px-2.5 py-1 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
            title="View quotation details and follow-up"
          >
            <span>Follow-up</span>
          </button>
        </div>
      )
    }
  ];

  const handlePrintQuotations = (sortedData: Quotation[], sortInfo: SortInfo<Quotation>) => {
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

    const rowsHtml = sortedData.map((q, idx) => {
      const org = q.organizations as any;
      const person = org?.contact_person || '—';
      const phone = org?.contact_number || org?.phone || '—';
      const sp = getSalesPerson(q)?.name || 'Unassigned';

      return `
      <tr>
        <td style="text-align: center; color: #718096; font-size: 10px;">${idx + 1}</td>
        <td style="font-family: monospace; font-weight: bold; color: #2d8d9b; white-space: nowrap;">${q.quotation_no}</td>
        <td style="font-weight: 800; color: #1a202c; font-size: 11px;">${q.organizations?.name || '—'}</td>
        <td style="font-size: 10px; color: #4a5568;">${person}</td>
        <td style="font-size: 10px; font-family: monospace; color: #4a5568;">${phone}</td>
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
        <td style="text-align: center;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 9px; font-weight: bold; text-transform: uppercase; background: #ecfeff; color: #0e7490;">
            Quotations
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
      <div><strong>Total Records:</strong> ${sortedData.length}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 30px;">#</th>
        <th>QUOTATION NO.</th>
        <th>CUSTOMER NAME</th>
        <th>CONTACT PERSON</th>
        <th>CONTACT PH</th>
        <th>SALES PERSON</th>
        <th style="text-align: center;">EXPECTED DATE</th>
        <th style="text-align: right;">AMOUNT</th>
        <th style="text-align: center;">STATUS</th>
        <th style="text-align: center;">STAGE STATUS</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="10" style="text-align: center; padding: 20px;">No quotations matching filters</td></tr>'}
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
  };

  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        data={filteredQuotations}
        isLoading={isLoading}
        searchPlaceholder="Search"
        onPrint={handlePrintQuotations}
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
    </div>
  );
}
