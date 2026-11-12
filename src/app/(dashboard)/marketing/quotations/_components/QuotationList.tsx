'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, Column, SortInfo } from '@/components/ui/DataTable';
import api from '@/lib/api';
import {
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Phone,
  X,
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle2,
  Snowflake,
  ChevronDown,
  ChevronUp,
  MapPin,
  History,
  FileText,
  Layers,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import toast from '@/components/ui/toast';
import { Quotation, Organization } from '../page';
import { formatDate, capitalizeFirstLetter } from '@/lib/formatters';
import { FilterDropdown } from '@/components/ui/FilterDropdown';
import { ContactPhoneLink } from '@/components/ui/ContactPhoneLink';
import { DateRangeFilter, DateFilterValue, matchesDateFilter } from '@/components/ui/DateRangeFilter';

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
  onUserReportTrigger?: (triggerFn: () => void) => void;
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
  onPrintTrigger,
  onUserReportTrigger,
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
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ preset: 'ALL' });

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

  // Filtered dataset based on branch, zone, sector, quote status, and date
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
      if (!matchesDateFilter(q.quotation_date || q.created_at, dateFilter)) {
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
  }, [quotations, activeFilter, selectedBranch, selectedZone, selectedOrgId, selectedIndustry, dateFilter]);

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
        <span className="font-mono font-bold text-xs md:text-sm text-zinc-900 block truncate">
          {q.quotation_no}
        </span>
      )
    },
    {
      header: 'DATE',
      className: 'w-[110px] whitespace-nowrap text-center',
      sortValue: (q) => q.quotation_date || q.created_at || '',
      accessor: (q) => (
        <span className="text-xs font-semibold text-zinc-700 whitespace-nowrap">
          {formatDate(q.quotation_date || q.created_at)}
        </span>
      )
    },
    {
      header: 'CUSTOMER NAME',
      className: 'min-w-[160px] max-w-[260px]',
      sortValue: (q) => q.organizations?.name || '',
      accessor: (q) => {
        const fullOrg = organizations?.find(o => o.id === q.organization_id) || (q.organizations as any);
        const sector = fullOrg?.industries?.name || fullOrg?.industry || '';
        return (
          <div className="min-w-0">
            <p className="text-xs font-bold text-zinc-800 truncate" title={q.organizations?.name || '—'}>
              {q.organizations?.name || '—'}
            </p>
            {sector && (
              <p className="text-[10px] font-bold text-[#9E1B1D] uppercase tracking-wider truncate mt-0.5" title={sector}>
                {sector}
              </p>
            )}
          </div>
        );
      }
    },
    {
      header: 'ZONE',
      className: 'w-[130px] min-w-[110px] whitespace-nowrap text-center',
      sortValue: (q) => {
        const fullOrg = organizations?.find(o => o.id === q.organization_id) || (q.organizations as any);
        return fullOrg?.zones?.name || '';
      },
      accessor: (q) => {
        const fullOrg = organizations?.find(o => o.id === q.organization_id) || (q.organizations as any);
        const zoneName = fullOrg?.zones?.name;
        return zoneName ? (
          <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-700 truncate" title={zoneName}>
            <MapPin size={12} className="text-zinc-400 shrink-0" />
            <span className="truncate">{zoneName}</span>
          </div>
        ) : (
          <div className="text-center">
            <span className="text-zinc-400 text-xs italic font-medium">—</span>
          </div>
        );
      }
    },
    {
      header: 'CONTACT',
      className: 'min-w-[140px] max-w-[200px] whitespace-nowrap text-left',
      sortValue: (q) => (q.organizations as any)?.contact_person || (q.organizations as any)?.contact_number || (q.organizations as any)?.phone || '',
      accessor: (q) => {
        const org = q.organizations as any;
        const person = org?.contact_person;
        const title = org?.contact_title;
        const desig = org?.contact_designation;
        const ph = org?.contact_number || org?.phone;

        if (!person && !ph && !desig) {
          return (
            <div className="text-left">
              <span className="text-zinc-400 text-xs italic font-medium">—</span>
            </div>
          );
        }

        return (
          <div className="flex flex-col items-start justify-center text-left min-w-0 max-w-[190px]">
            {person && (
              <span className="text-xs font-bold text-zinc-800 truncate block w-full" title={`${title ? title + ' ' : ''}${person}`}>
                {title ? `${title} ` : ''}{person}
              </span>
            )}
            {desig && (
              <span className="text-[9px] text-zinc-400 font-medium truncate block w-full mt-0.5" title={desig}>
                {desig}
              </span>
            )}
            {ph && (
              <div className="mt-0.5">
                <ContactPhoneLink phone={ph} name={person || org?.name} />
              </div>
            )}
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
              <p className="text-xs font-bold text-zinc-800 truncate block" title={sp.name}>
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
          <span className="text-zinc-400 text-xs italic font-medium">Unassigned</span>
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
    },
    {
      header: 'LOG',
      className: 'w-[105px] whitespace-nowrap text-center',
      accessor: (q) => {
        const count = Array.isArray(q.metrics_summary?.followups) ? q.metrics_summary.followups.length : 0;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFollowUpQuotation(q);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-zinc-100 hover:bg-[#801416] text-zinc-700 hover:text-white border border-zinc-200 hover:border-[#801416] transition-all cursor-pointer shadow-2xs group"
            title="Click to view quotation history, versions & follow-up log"
          >
            <History size={12} className="text-zinc-500 group-hover:text-white transition-colors" />
            <span>Log{count > 0 ? ` (${count})` : ''}</span>
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
      const fullOrg = organizations?.find(o => o.id === q.organization_id) || (q.organizations as any);
      const sector = fullOrg?.industries?.name || fullOrg?.industry || '';
      const zoneName = fullOrg?.zones?.name || '—';
      const person = fullOrg?.contact_person || '—';
      const desig = fullOrg?.contact_designation;
      const phone = fullOrg?.contact_number || fullOrg?.phone || '—';
      const sp = getSalesPerson(q)?.name || 'Unassigned';

      return `
      <tr>
        <td style="text-align: center; color: #718096; font-size: 10px;">${idx + 1}</td>
        <td style="font-family: monospace; font-weight: bold; color: #2d8d9b; white-space: nowrap;">${q.quotation_no}</td>
        <td style="font-size: 10px; color: #4a5568; text-align: center;">${formatDate(q.quotation_date || q.created_at)}</td>
        <td style="font-weight: 800; color: #1a202c; font-size: 11px;">
          <div>${q.organizations?.name || '—'}</div>
          ${sector ? `<div style="font-size: 8px; color: #9E1B1D; font-weight: bold; text-transform: uppercase;">${sector}</div>` : ''}
        </td>
        <td style="font-size: 10px; color: #4a5568;">${zoneName}</td>
        <td style="font-size: 10px; color: #4a5568;">
          <div style="font-weight: 700;">${person}</div>
          ${desig ? `<div style="font-size: 8px; color: #a0aec0;">${desig}</div>` : ''}
          ${phone !== '—' ? `<div style="font-family: monospace; font-size: 9px; color: #718096; margin-top: 2px;">${phone}</div>` : ''}
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
        <th style="text-align: center;">DATE</th>
        <th>CUSTOMER NAME</th>
        <th>ZONE</th>
        <th>CONTACT</th>
        <th>SALES PERSON</th>
        <th style="text-align: center;">EXPECTED DATE</th>
        <th style="text-align: right;">AMOUNT</th>
        <th style="text-align: center;">STATUS</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="9" style="text-align: center; padding: 20px;">No quotations matching filters</td></tr>'}
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
  const userReportTriggerRef = useRef<(() => void) | null>(null);

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

  useEffect(() => {
    if (onUserReportTrigger) {
      onUserReportTrigger(() => {
        userReportTriggerRef.current?.();
      });
    }
  }, [onUserReportTrigger]);

  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        data={filteredQuotations}
        isLoading={isLoading}
        searchPlaceholder="Search"
        onRowClick={(q) => onViewDetails(q)}
        onPrint={handlePrintQuotations}
        hideTablePrint={true}
        printTriggerRef={printTriggerRef}
        userReportTriggerRef={userReportTriggerRef}
        headerAction={
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* 1. All Quote (Status Filter) */}
            <FilterDropdown
              label="Quote Status"
              allLabel="All Quotes"
              allBadge={counts.all}
              value={activeFilter === 'all' ? 'ALL' : activeFilter}
              onChange={(val) => setActiveFilter(val === 'ALL' ? 'all' : val as any)}
              options={[
                { label: "Waiting for BM's Approval", value: 'pending_bm', badge: counts.pending_bm },
                { label: 'Under Ops Review', value: 'pending_ops', badge: counts.pending_ops },
                { label: 'Approved Quotes', value: 'approved', badge: counts.approved },
                { label: 'Drafts Only', value: 'drafts', badge: counts.drafts }
              ]}
              maxWidth="max-w-[240px]"
            />

            {/* 2. Branch Filter */}
            <FilterDropdown
              label="Branch"
              allLabel={`All Branches (${quotations.length})`}
              value={selectedBranch}
              onChange={setSelectedBranch}
              options={branches.map(b => ({
                label: b.name,
                value: String(b.id),
                badge: quotations.filter(q => String(q.branch_id || (q.organizations as any)?.branch_id || '') === String(b.id)).length
              }))}
              maxWidth="max-w-[220px]"
            />

            {/* 3. Zone Filter */}
            <FilterDropdown
              label="Zone"
              allLabel={`All Zones (${quotations.length})`}
              value={selectedZone}
              onChange={setSelectedZone}
              options={availableFilterZones.map(z => ({
                label: z.name,
                value: String(z.id),
                badge: quotations.filter(q => String((q as any).zone_id || (q.organizations as any)?.zone_id || '') === String(z.id)).length
              }))}
              maxWidth="max-w-[200px]"
            />

            {/* 4. Sector / Industry Filter */}
            <FilterDropdown
              label="Sector"
              allLabel={`All Sectors (${quotations.length})`}
              value={selectedIndustry}
              onChange={setSelectedIndustry}
              options={industries.map(ind => ({
                label: ind.name,
                value: String(ind.id),
                badge: quotations.filter((q) => String((q.organizations as any)?.industry_id || '') === String(ind.id)).length
              }))}
              maxWidth="max-w-[200px]"
            />

            {/* 5. Date Filter */}
            <DateRangeFilter
              label="Date"
              value={dateFilter}
              onChange={setDateFilter}
            />
          </div>
        }
      />

      {followUpQuotation && (
        <QuotationFollowUpModal
          quotation={followUpQuotation}
          allQuotations={quotations}
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
  allQuotations?: Quotation[];
  onClose: () => void;
  onSuccess: () => void;
  currentUser?: any;
}

export const QuotationFollowUpModal: React.FC<QuotationFollowUpModalProps> = ({
  quotation,
  allQuotations = [],
  onClose,
  onSuccess,
  currentUser
}) => {
  const [activeModalTab, setActiveModalTab] = useState<'log' | 'record'>('log');
  const [responseType, setResponseType] = useState<'negative' | 'hold' | 'positive'>('hold');
  const [remarks, setRemarks] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group and sort all related quotations for this customer / organization
  const relatedQuotations = useMemo(() => {
    const orgId = quotation.organization_id;
    const leadId = (quotation as any).lead_id;
    if (!allQuotations || allQuotations.length === 0) return [quotation];

    const matches = allQuotations.filter(q => {
      if (orgId && q.organization_id === orgId) return true;
      if (leadId && (q as any).lead_id === leadId) return true;
      if (
        quotation.organizations?.name &&
        q.organizations?.name &&
        quotation.organizations.name.trim().toLowerCase() === q.organizations.name.trim().toLowerCase()
      ) {
        return true;
      }
      return false;
    });

    if (matches.length === 0) return [quotation];

    // Chronological ascending: earliest is first quote, subsequent are revisions
    return [...matches].sort((a, b) => {
      const timeA = new Date(a.created_at || a.quotation_date || 0).getTime();
      const timeB = new Date(b.created_at || b.quotation_date || 0).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return a.id - b.id;
    });
  }, [quotation, allQuotations]);

  // Combined timeline of all quotation events, BM revision requests, and follow-up activities
  const allTimelineActivities = useMemo(() => {
    const activities: any[] = [];

    relatedQuotations.forEach((q, idx) => {
      const isFirst = idx === 0;
      const verLabel = isFirst ? 'First Quote (Initial)' : `Revised Quote (R${idx})`;
      activities.push({
        id: `quote_created_${q.id}`,
        quotation_id: q.id,
        quotation_no: q.quotation_no,
        type: 'quotation_version',
        title: `${verLabel}: #${q.quotation_no}`,
        badge: verLabel,
        badgeColor: isFirst ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200',
        date: q.quotation_date || q.created_at,
        amount: q.final_quote_value || (q as any).total_amount || 0,
        status: q.status,
        author: 'Commercial Team',
        remarks: `Quotation #${q.quotation_no} generated for ₹${Number(q.final_quote_value || (q as any).total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}. Status: ${q.status || 'Draft'}`
      });

      // BM Rejection / Revision Request
      if (q.metrics_summary?.bm_rejection_reason) {
        activities.push({
          id: `bm_rejection_${q.id}`,
          quotation_id: q.id,
          quotation_no: q.quotation_no,
          type: 'revision_request',
          title: `Revision Requested by BM (#${q.quotation_no})`,
          badge: 'Revision Requested',
          badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
          date: q.metrics_summary.bm_rejection_at || q.updated_at || q.created_at,
          author: q.metrics_summary.bm_rejected_by_name || 'Branch Manager',
          remarks: `Branch Manager revision instructions: "${q.metrics_summary.bm_rejection_reason}"`
        });
      }

      // BM Approved
      if (q.metrics_summary?.bm_approved || q.status === 'Approved') {
        activities.push({
          id: `bm_approved_${q.id}`,
          quotation_id: q.id,
          quotation_no: q.quotation_no,
          type: 'approval',
          title: `Quotation Approved (#${q.quotation_no})`,
          badge: 'Approved',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          date: q.metrics_summary?.bm_approved_at || q.metrics_summary?.submitted_to_ops_at || q.updated_at || q.created_at,
          author: q.metrics_summary?.bm_approved_by_name || 'Branch Manager',
          remarks: 'Quotation verified and approved by Branch Manager & Operations.'
        });
      }

      // Follow-up entries
      if (Array.isArray(q.metrics_summary?.followups)) {
        q.metrics_summary.followups.forEach((f: any, fIdx: number) => {
          activities.push({
            id: f.id || `f_${q.id}_${fIdx}`,
            quotation_id: q.id,
            quotation_no: q.quotation_no,
            type: 'followup',
            title: `Follow-up on Quote #${q.quotation_no}`,
            badge: f.outcome || f.response_type || 'Follow-up',
            outcome: f.outcome || f.response_type,
            date: f.created_at || (f.date ? `${f.date} ${f.time || ''}` : q.created_at),
            author: f.author?.name || 'Sales Representative',
            remarks: f.remarks || f.text || '',
            next_followup_date: f.next_followup_date
          });
        });
      }
    });

    return activities.sort((a, b) => {
      const timeA = new Date(a.date || 0).getTime();
      const timeB = new Date(b.date || 0).getTime();
      return timeB - timeA;
    });
  }, [relatedQuotations]);

  const openQuotationTab = (qId: number | string, qNo?: string) => {
    const url = qId
      ? `/marketing/quotations?id=${qId}&action=view`
      : `/marketing/quotations?quote_no=${encodeURIComponent(qNo || '')}&action=view`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

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
        const pastFollowups: any[] = Array.isArray(quotation.metrics_summary?.followups)
          ? quotation.metrics_summary.followups
          : [];

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
      <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-zinc-100 overflow-hidden relative p-6 md:p-8 space-y-5 z-10 animate-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Top Brand Accent Rail */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D] absolute top-0 left-0" />

        {/* Modal Header */}
        <div className="flex justify-between items-start shrink-0 pt-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-[#FFF1F1] text-[#9E1B1D] border border-[#C82A2B]/20 text-[10px] font-black uppercase font-mono tracking-wider">
                {quotation.quotation_no}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 text-[10px] font-black uppercase">
                {quotation.status || 'Draft'}
              </span>
              <button
                type="button"
                onClick={() => openQuotationTab(quotation.id, quotation.quotation_no)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#2d8d9b] bg-[#2d8d9b]/10 hover:bg-[#2d8d9b]/20 border border-[#2d8d9b]/20 transition-all cursor-pointer"
                title="Open this quotation in a new browser tab"
              >
                <span>Open Quote in New Tab</span>
                <ExternalLink size={10} className="shrink-0" />
              </button>
            </div>
            <h3 className="text-xl font-black text-zinc-900 tracking-tight">
              Quotation History & Activity Log
            </h3>
            <p className="text-xs text-zinc-500 font-medium">
              Client: <span className="text-zinc-900 font-bold">{quotation.organizations?.name || 'Commercial Client'}</span>
              <span className="mx-1.5 text-zinc-300">•</span>
              <span>{relatedQuotations.length} Quotation{relatedQuotations.length > 1 ? 's' : ''} (First quote & revisions)</span>
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

        {/* Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-zinc-150 pb-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveModalTab('log')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeModalTab === 'log'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <Layers size={13} />
            <span>Quotation Log & Versions ({relatedQuotations.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveModalTab('record')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeModalTab === 'record'
                ? 'bg-[#801416] text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <Plus size={13} />
            <span>Record Follow-up</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-5 overflow-y-auto pr-1 flex-1">
          {activeModalTab === 'log' ? (
            <div className="space-y-6">
              {/* 1. All Quotation Versions (First quote, Revised quotes) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                    All Quotations for this Client ({relatedQuotations.length})
                  </span>
                  <span className="text-[10px] font-semibold text-zinc-400">
                    Click any card or button to view in another tab
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {relatedQuotations.map((q, idx) => {
                    const isFirst = idx === 0;
                    const verLabel = isFirst ? 'First Quote (Initial)' : `Revised Quote (R${idx})`;
                    const isCurrent = q.id === quotation.id;
                    const qAmount = Number(q.final_quote_value || (q as any).total_amount || 0);

                    return (
                      <div
                        key={q.id}
                        onClick={() => openQuotationTab(q.id, q.quotation_no)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer group relative flex flex-col justify-between ${
                          isCurrent
                            ? 'bg-[#2d8d9b]/5 border-[#2d8d9b]/40 shadow-xs hover:border-[#2d8d9b]'
                            : 'bg-white border-zinc-200 hover:border-[#2d8d9b]/50 hover:shadow-md'
                        }`}
                        title="Click to open this quotation in a new tab"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border inline-block ${
                                isFirst
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {verLabel}
                              </span>
                              <p className="font-mono font-bold text-sm text-zinc-900 mt-1 flex items-center gap-1.5">
                                <span>{q.quotation_no}</span>
                                {isCurrent && (
                                  <span className="text-[9px] font-bold text-[#2d8d9b] uppercase tracking-wider">
                                    (Active)
                                  </span>
                                )}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openQuotationTab(q.id, q.quotation_no);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#2d8d9b] hover:bg-[#236e7a] text-white shadow-xs transition-all shrink-0 cursor-pointer"
                            >
                              <span>View Quote</span>
                              <ExternalLink size={10} className="shrink-0" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100">
                            <span className="text-zinc-500 font-medium">
                              {formatDate(q.quotation_date || q.created_at)}
                            </span>
                            <span className="font-mono font-black text-[#2d8d9b]">
                              ₹{qAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          {q.metrics_summary?.bm_rejection_reason && (
                            <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-[10px] text-rose-800 font-medium leading-relaxed">
                              <strong>Revision Reason:</strong> {q.metrics_summary.bm_rejection_reason}
                            </div>
                          )}
                        </div>

                        <div className="pt-2 flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">
                            {q.status || 'Draft'}
                          </span>
                          <span className="text-[10px] text-[#2d8d9b] font-bold group-hover:underline inline-flex items-center gap-0.5">
                            Open in tab <ExternalLink size={9} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Timeline of Activities & Follow-ups */}
              <div className="space-y-3 pt-2 border-t border-zinc-150">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                    Follow-up Communication & Activity History ({allTimelineActivities.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('record')}
                    className="text-[10px] font-black uppercase tracking-wider text-[#801416] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={11} /> Record New Follow-up
                  </button>
                </div>

                {allTimelineActivities.length > 0 ? (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {allTimelineActivities.map((entry) => {
                      const outcomeLower = String(entry.outcome || entry.badge || '').toLowerCase();
                      const isPositive = outcomeLower.includes('pos') || outcomeLower.includes('won') || outcomeLower.includes('approv');
                      const isNegative = outcomeLower.includes('neg') || outcomeLower.includes('cold') || outcomeLower.includes('reject');

                      return (
                        <div
                          key={entry.id}
                          className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                            <span className="font-bold text-zinc-800">
                              {entry.title}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {entry.badge && (
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                                  entry.badgeColor || (
                                    isPositive
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : isNegative
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  )
                                }`}>
                                  {entry.badge}
                                </span>
                              )}
                              {entry.quotation_id && (
                                <button
                                  type="button"
                                  onClick={() => openQuotationTab(entry.quotation_id, entry.quotation_no)}
                                  className="text-[10px] font-bold text-[#2d8d9b] hover:underline inline-flex items-center gap-0.5 cursor-pointer ml-1"
                                  title="View this quotation"
                                >
                                  Quote <ExternalLink size={9} />
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-xs font-semibold text-zinc-700 leading-relaxed whitespace-pre-wrap">
                            {entry.remarks}
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium pt-1 border-t border-zinc-100">
                            <span>{entry.date ? formatDate(entry.date) : 'Recent'}</span>
                            {entry.author && <span>By: {entry.author}</span>}
                          </div>

                          {entry.next_followup_date && (
                            <div className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-flex items-center gap-1 mt-1">
                              <Calendar size={10} /> Next Follow-up: {formatDate(entry.next_followup_date)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 space-y-2">
                    <History size={24} className="mx-auto text-zinc-400" />
                    <p className="text-xs font-bold text-zinc-600">No follow-up communications logged yet</p>
                    <button
                      type="button"
                      onClick={() => setActiveModalTab('record')}
                      className="px-3 py-1.5 bg-[#801416] text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-[#681012] transition-colors"
                    >
                      Record First Follow-up
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Follow-up Logging Form */
            <div className="space-y-4">
              {/* Outcome Selection: 3 Options (Negative, Hold/Pending default, Positive) */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                  Follow-up Outcome *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Negative (Left) */}
                  <button
                    type="button"
                    onClick={() => setResponseType('negative')}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      responseType === 'negative'
                        ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-sm'
                        : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 bg-zinc-50/50'
                    }`}
                  >
                    <span className="text-xs font-black block flex items-center gap-1.5">
                      <Snowflake size={13} className="text-rose-500 shrink-0" />
                      Negative
                    </span>
                    <span className="text-[10px] text-rose-700/80 font-medium mt-0.5 block">
                      Declined / Chose other vendor
                    </span>
                  </button>

                  {/* Hold / Pending (Middle - DEFAULT) */}
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
                      Hold / Pending
                    </span>
                    <span className="text-[10px] text-amber-700/80 font-medium mt-0.5 block">
                      Under review / Decision pending
                    </span>
                  </button>

                  {/* Positive (Right) */}
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
                      Positive
                    </span>
                    <span className="text-[10px] text-emerald-700/80 font-medium mt-0.5 block">
                      Moving ahead / Order expected
                    </span>
                  </button>
                </div>
              </div>

              {/* Next Follow-up Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                  <Calendar size={11} className="text-[#9E1B1D]" />
                  Next Scheduled Follow-up Date (Optional)
                </label>
                <DatePicker
                  value={nextFollowUpDate}
                  onChange={(val) => setNextFollowUpDate(val)}
                  placeholder="Select follow-up date"
                  className="w-full"
                />
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={11} className="text-[#9E1B1D]" />
                  Follow-up Communication Notes *
                </label>
                <textarea
                  rows={4}
                  value={remarks}
                  onChange={(e) => setRemarks(capitalizeFirstLetter(e.target.value))}
                  placeholder="e.g. Discussed quotation specifications with the client. Reviewing uniform fabrics and comparing budget; follow-up call planned next week..."
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 text-xs font-semibold focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 resize-none transition-all"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 pt-2 shrink-0 border-t border-zinc-100">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 py-3 text-[10px] font-black uppercase"
          >
            Cancel
          </Button>

          {activeModalTab === 'record' ? (
            <Button
              disabled={isSubmitting}
              onClick={handleSubmit}
              className={`flex-1 py-3 text-[10px] font-black uppercase text-white shadow-lg ${
                responseType === 'positive'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : responseType === 'negative'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
              }`}
            >
              {isSubmitting ? 'Saving...' : 'Save Follow-up'}
            </Button>
          ) : (
            <Button
              onClick={() => setActiveModalTab('record')}
              className="flex-1 py-3 text-[10px] font-black uppercase text-white bg-[#801416] hover:bg-[#681012] shadow-lg shadow-[#801416]/20"
            >
              <Plus size={12} className="mr-1" /> Add New Follow-up
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
