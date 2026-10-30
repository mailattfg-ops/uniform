'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { DataTable, Column, SortInfo } from '@/components/ui/DataTable';
import { PageActionsMenu } from '@/components/ui/PageActionsMenu';
import { 
  Phone, User, ExternalLink, Eye, Sparkles, Clock, CheckCircle2, FileText
} from 'lucide-react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { 
  Lead, 
  Industry, 
  Employee, 
  Branch, 
  Zone,
  LeadViewModal,
  LeadFormModal,
  FollowUpOutcomeModal
} from '../leads/page';

export default function DealsRegistryPage() {
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [stageFilter, setStageFilter] = useState<'ALL' | 'SO_DRAFT' | 'NEW_DEALS' | 'SO_CONVERTED'>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('ALL');
  const [prioritizeNoFollowups, setPrioritizeNoFollowups] = useState<boolean>(false);

  // Modal States
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [followUpLead, setFollowUpLead] = useState<Lead | null>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse current user from localStorage:', e);
    }
  }, []);

  // Fetch master data, leads, quotations, and payments
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [leadsRes, indRes, empRes, brRes, zonesRes, quotesRes, paymentsRes] = await Promise.all([
        api.get('/leads'),
        api.get('/industries').catch(() => ({ data: [] })),
        api.get('/employees').catch(() => ({ data: [] })),
        api.get('/branches').catch(() => ({ data: [] })),
        api.get('/zones').catch(() => ({ data: [] })),
        api.get('/quotations').catch(() => ({ data: [] })),
        api.get('/payments').catch(() => ({ data: [] }))
      ]);

      setLeads(leadsRes.data || []);
      setIndustries(indRes.data || []);
      setEmployees(empRes.data || []);
      setBranches(brRes.data || []);
      setZones(zonesRes.data || []);
      setQuotations(quotesRes.data || []);
      setPayments(paymentsRes.data || []);
    } catch (err: any) {
      console.error('Failed to load deals data:', err);
      toast.error('Failed to load deals registry');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Deep link auto open via ?id=...
  useEffect(() => {
    if (searchParams && leads.length > 0) {
      const idParam = searchParams.get('id');
      if (idParam) {
        const id = parseInt(idParam, 10);
        const match = leads.find(l => l.id === id);
        if (match) {
          setViewingLead(match);
        }
      }
    }
  }, [searchParams, leads]);

  const userRole = (currentUser?.role || '').toLowerCase();
  const userPermissions: string[] = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
  const isSuperAdmin = userRole === 'admin' || userRole === 'super admin' || userRole === 'superadmin' || userRole === 'corporate' || userPermissions.includes('all');
  const canManageLeads = isSuperAdmin || userPermissions.includes('manage_leads');

  // Available zones filtered by selected branch
  const availableFilterZones = useMemo(() => {
    if (selectedBranch === 'ALL') return zones;
    return zones.filter(z => String(z.branch_id) === selectedBranch);
  }, [zones, selectedBranch]);

  // Helper to check if a deal has had no follow up for 2+ days
  const isNoFollowupDeal = useCallback((l: Lead) => {
    const refDate = l.updated_at || l.created_at;
    if (!refDate) return false;
    const daysInactive = Math.floor((Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysInactive >= 2;
  }, []);

  // All Deals: includes active deals ('Deals'), production converted deals ('SO Converted Deals'),
  // and any deals/leads with an Ops Team approved quotation ('SO Draft')
  const allDeals = useMemo(() => {
    const dealsFromLeads = leads.filter(l => {
      if (l.status === 'Deals' || l.status === 'SO Converted Deals') return true;
      // Also include any lead that has an Ops Team Approved quotation
      const hasApprovedQuote = quotations.some(q => 
        q.status === 'Approved' && (
          (l.organization_id && q.organization_id === l.organization_id) ||
          (q.lead_id && q.lead_id === l.id) ||
          ((q.organizations as any)?.name && (q.organizations as any)?.name.toLowerCase() === l.name.toLowerCase())
        )
      );
      return hasApprovedQuote;
    });

    // Also include any Approved quotations that don't match any lead in dealsFromLeads
    const approvedQuotesWithoutLead = quotations.filter(q => {
      if (q.status !== 'Approved') return false;
      const alreadyIncluded = dealsFromLeads.some(l => 
        (l.organization_id && q.organization_id === l.organization_id) ||
        (q.lead_id && q.lead_id === l.id) ||
        ((q.organizations as any)?.name && (q.organizations as any)?.name.toLowerCase() === l.name.toLowerCase())
      );
      return !alreadyIncluded;
    });

    const synthesizedDeals: Lead[] = approvedQuotesWithoutLead.map(q => {
      const org = q.organizations as any;
      return {
        id: -q.id,
        name: org?.name || `Customer #${q.organization_id}`,
        phone: org?.phone || org?.contact_number || '',
        contact_person: org?.contact_person || '',
        status: 'Deals',
        organization_id: q.organization_id,
        branch_id: q.branch_id || org?.branch_id || null,
        zone_id: (q as any).zone_id || org?.zone_id || null,
        industry_id: org?.industry_id || null,
        created_at: q.created_at,
        updated_at: q.updated_at || q.created_at,
        remarks: [{
          date: new Date(q.created_at).toLocaleDateString(),
          time: '',
          text: `Quotation #${q.quotation_no} approved by Operations Team. SO Draft.`,
          stage: 'Deals',
          response_type: 'positive'
        }],
        is_cold: false
      } as any;
    });

    return [...dealsFromLeads, ...synthesizedDeals];
  }, [leads, quotations]);

  // dealsList maps to allDeals for backward compatibility
  const dealsList = allDeals;

  const overdueDealsCount = useMemo(() => {
    return allDeals.filter(isNoFollowupDeal).length;
  }, [allDeals, isNoFollowupDeal]);

  const getRowClassName = useCallback((l: Lead) => {
    if (prioritizeNoFollowups && isNoFollowupDeal(l)) {
      return '!bg-rose-50/75 hover:!bg-rose-100/75 transition-colors border-b border-rose-200/50';
    }
    return undefined;
  }, [prioritizeNoFollowups, isNoFollowupDeal]);

  // Helper to get quotation and payment totals for a deal
  const getDealFinancials = useCallback((l: Lead) => {
    const matchedQuotes = quotations.filter(q => 
      (l.organization_id && q.organization_id === l.organization_id) ||
      (q.lead_id && (q.lead_id === l.id || q.lead_id === -l.id)) ||
      (l.id < 0 && q.id === -l.id) ||
      ((q.organizations as any)?.name && (q.organizations as any)?.name.toLowerCase() === l.name.toLowerCase())
    );

    const quoteAmount = matchedQuotes.reduce((sum, q) => sum + (parseFloat(q.final_quote_value) || 0), 0);
    const quoteIds = matchedQuotes.map(q => q.id);
    const matchedPayments = payments.filter(p => quoteIds.includes(p.quotation_id));
    const advanceAmount = matchedPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const hasApprovedQuote = matchedQuotes.some(q => q.status === 'Approved');

    return {
      quoteAmount,
      advanceAmount,
      quoteCount: matchedQuotes.length,
      matchedQuotes,
      hasApprovedQuote
    };
  }, [quotations, payments]);

  // Stage counts for filter options
  const stageCounts = useMemo(() => {
    let all = allDeals.length;
    let soDraft = 0;
    let newDeals = 0;
    let soConverted = 0;

    for (const l of allDeals) {
      if (l.status === 'SO Converted Deals') {
        soConverted++;
      } else {
        const { hasApprovedQuote } = getDealFinancials(l);
        if (hasApprovedQuote) {
          soDraft++;
        } else {
          newDeals++;
        }
      }
    }
    return { all, soDraft, newDeals, soConverted };
  }, [allDeals, getDealFinancials]);

  // Filtered Deals
  const filteredDeals = useMemo(() => {
    return allDeals.filter(l => {
      // 0. Stage / Deal Type filter
      if (stageFilter === 'SO_DRAFT') {
        if (l.status === 'SO Converted Deals') return false;
        const { hasApprovedQuote } = getDealFinancials(l);
        if (!hasApprovedQuote) return false;
      } else if (stageFilter === 'NEW_DEALS') {
        if (l.status === 'SO Converted Deals') return false;
        const { hasApprovedQuote } = getDealFinancials(l);
        if (hasApprovedQuote) return false;
      } else if (stageFilter === 'SO_CONVERTED') {
        if (l.status !== 'SO Converted Deals') return false;
      }

      // 1. Branch filter
      if (selectedBranch !== 'ALL') {
        const bId = String(l.branch_id || l.employees?.branch_id || '');
        if (bId !== selectedBranch) return false;
      }
      // 2. Zone filter
      if (selectedZone !== 'ALL') {
        const zId = String(l.zone_id || '');
        if (zId !== selectedZone) return false;
      }
      // 3. Sector / Industry filter
      if (selectedIndustry !== 'ALL') {
        const indId = String(l.industry_id || '');
        if (indId !== selectedIndustry) return false;
      }
      return true;
    });
  }, [allDeals, stageFilter, selectedBranch, selectedZone, selectedIndustry, getDealFinancials]);

  // Print & User Activity Report Handlers
  const printTriggerRef = useRef<(() => void) | null>(null);
  const userReportTriggerRef = useRef<(() => void) | null>(null);
  const handlePrintDeals = (sortedData?: Lead[], currentSort?: SortInfo<Lead> | null) => {
    const dataToPrint = (sortedData && sortedData.length > 0) ? sortedData : filteredDeals;
    const printedAt = new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const activeBranchName = selectedBranch === 'ALL'
      ? 'All Branches'
      : branches.find(b => String(b.id) === selectedBranch)?.name || `Branch #${selectedBranch}`;

    const rowsHtml = dataToPrint.map((l, idx) => {
      const fin = getDealFinancials(l);
      return `
      <tr>
        <td style="text-align: center; color: #718096; font-size: 10px;">${idx + 1}</td>
        <td style="font-weight: 800; color: #1a202c; font-size: 11px;">
          <div>${l.name}</div>
          ${l.industries?.name ? `<div style="font-size: 8px; color: #2d8d9b; font-weight: bold; text-transform: uppercase;">${l.industries.name}</div>` : ''}
        </td>
        <td style="font-size: 10px; color: #4a5568;">
          <div style="font-weight: 700; color: #1a202c;">${l.contact_person ? `${l.contact_title ? `${l.contact_title} ` : ''}${l.contact_person}` : '—'}</div>
          ${l.contact_designation ? `<div style="color: #a0aec0; font-size: 8px;">${l.contact_designation}</div>` : ''}
          ${l.phone ? `<div style="color: #2d8d9b; font-family: monospace; font-size: 9px; font-weight: bold; margin-top: 2px;">${l.phone}</div>` : ''}
        </td>
        <td style="font-size: 10px; color: #4a5568;">${l.employees?.full_name || 'Unassigned'}</td>
        <td style="text-align: center;">
          ${(() => {
            const isSOConverted = l.status === 'SO Converted Deals';
            const stageLabel = isSOConverted ? 'SO Converted' : fin.hasApprovedQuote ? 'SO Draft' : 'Deals';
            const badgeBg = isSOConverted ? '#ecfdf5' : fin.hasApprovedQuote ? '#fef3c7' : '#f0fdfa';
            const badgeColor = isSOConverted ? '#047857' : fin.hasApprovedQuote ? '#92400e' : '#0d9488';
            return `<span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 9px; font-weight: bold; text-transform: uppercase; background: ${badgeBg}; color: ${badgeColor};">${stageLabel}</span>`;
          })()}
        </td>
        <td style="font-size: 10px; font-family: monospace; font-weight: bold; text-align: right; color: #1a202c;">
          ₹${fin.quoteAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </td>
        <td style="font-size: 10px; font-family: monospace; font-weight: bold; text-align: right; color: #047857;">
          ₹${fin.advanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </td>
      </tr>
    `;}).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Deals Commercial Registry - Forma Apparels</title>
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
      <div class="brand-subtitle">Commercial Operations &amp; Deals Registry</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 12px; font-weight: bold; color: #3a525d;">Branch: ${activeBranchName}</div>
      <div style="font-size: 9px; color: #718096; margin-top: 2px;">Printed: ${printedAt}</div>
      <div style="font-size: 9px; font-weight: bold; color: #047857;">Total Deals: ${dataToPrint.length}</div>
      ${currentSort?.headerLabel && currentSort.headerLabel !== 'Default' ? `<div style="font-size: 9px; color: #2d8d9b; font-weight: bold; margin-top: 2px;">Sorted by: ${currentSort.headerLabel} (${currentSort.direction === 'asc' ? 'Ascending' : 'Descending'})</div>` : ''}
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 30px;">#</th>
        <th>Customer Name</th>
        <th>Contact</th>
        <th>Sales Person</th>
        <th style="text-align: center;">Stage Status</th>
        <th style="text-align: right;">Amount</th>
        <th style="text-align: right;">Adv.Received</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 24px; color: #a0aec0;">No deals found matching filter criteria</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      toast.error('Pop-up blocked. Please allow pop-ups to print deals.');
      return;
    }
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 400);
  };

  // 8 Exact Table Columns for Deals:
  // 1. Customer Name
  // 2. Contact Person
  // 3. Contact Phone
  // 4. Sales Person
  // 5. Stage Status
  // 6. Amount
  // 7. Adv.Received
  // 8. Follow-up
  const columns: Column<Lead>[] = useMemo(() => [
    {
      header: 'Customer Name',
      className: 'min-w-[170px] max-w-[260px]',
      sortValue: (l) => l.name,
      accessor: (l) => (
        <div className="group min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => setViewingLead(l)}
              className="text-left font-black text-xs md:text-sm tracking-tight text-[#3a525d] hover:text-[#2d8d9b] hover:underline transition-all cursor-pointer border-none bg-transparent p-0 outline-none truncate block"
              title={l.name}
            >
              {l.name}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (l.id > 0) {
                  window.open(`/customers/leads?id=${l.id}`, '_blank');
                } else if (l.organization_id) {
                  window.open(`/customers/${l.organization_id}`, '_blank');
                }
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-400 hover:text-[#2d8d9b] hover:bg-[#2d8d9b]/10 transition-all cursor-pointer shrink-0"
              title="Open deal details in new tab"
            >
              <ExternalLink size={13.5} />
            </button>
          </div>
          {l.industries?.name && (
            <p className="text-[10px] font-bold text-[#2d8d9b] uppercase tracking-wider truncate mt-0.5">
              {l.industries.name}
            </p>
          )}
          {l.requirements && (
            <p className="text-[10px] text-zinc-400 font-medium truncate mt-0.5 max-w-[240px]" title={l.requirements}>
              Feed: {l.requirements}
            </p>
          )}
        </div>
      )
    },
    {
      header: 'Contact',
      className: 'min-w-[150px] max-w-[220px] whitespace-nowrap',
      sortValue: (l) => l.contact_person || l.phone || '',
      accessor: (l) => (
        l.contact_person || l.phone ? (
          <div className="flex flex-col min-w-0 max-w-[210px]">
            {l.contact_person && (
              <span className="text-xs font-bold text-[#3a525d] truncate block" title={`${l.contact_title ? l.contact_title + ' ' : ''}${l.contact_person}`}>
                {l.contact_title ? `${l.contact_title} ` : ''}{l.contact_person}
              </span>
            )}
            {l.contact_designation && (
              <span className="text-[9px] text-zinc-400 font-medium truncate block" title={l.contact_designation}>
                {l.contact_designation}
              </span>
            )}
            {l.phone && (
              <a
                href={`tel:${l.phone}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2d8d9b] hover:underline mt-0.5"
                title={`Call ${l.phone}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Phone size={11} className="text-[#2d8d9b] shrink-0" />
                <span>{l.phone}</span>
              </a>
            )}
          </div>
        ) : (
          <span className="text-zinc-400 text-xs italic font-medium">—</span>
        )
      )
    },
    {
      header: 'Sales Person',
      className: 'min-w-[140px] whitespace-nowrap',
      sortValue: (l) => l.employees?.full_name || '',
      accessor: (l) => (
        l.employees ? (
          <div className="min-w-0 max-w-[180px]">
            <p className="text-xs font-bold text-zinc-800 truncate block" title={l.employees.full_name}>{l.employees.full_name}</p>
            {l.employees.employee_id && (
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider truncate block">
                {l.employees.employee_id}
              </p>
            )}
          </div>
        ) : (
          <span className="text-zinc-400 text-xs italic font-medium">Unassigned</span>
        )
      )
    },
    {
      header: 'Stage Status',
      className: 'w-[160px] whitespace-nowrap',
      sortValue: (l) => {
        if (l.status === 'SO Converted Deals') return 'SO Converted';
        const { hasApprovedQuote } = getDealFinancials(l);
        if (hasApprovedQuote) return 'SO Draft';
        return 'Deals';
      },
      accessor: (l) => {
        const refDate = l.updated_at || l.created_at;
        const daysInactive = refDate ? Math.floor((Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
        const isOverdue = isNoFollowupDeal(l);
        const isSOConverted = l.status === 'SO Converted Deals';
        const { hasApprovedQuote } = getDealFinancials(l);

        return (
          <div className="flex flex-col items-start gap-1">
            {isSOConverted ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs">
                <CheckCircle2 size={12} className="text-emerald-700 shrink-0" />
                <span>SO Converted</span>
              </span>
            ) : hasApprovedQuote ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border bg-amber-50 text-amber-800 border-amber-300 shadow-2xs" title="Ops approved quotation ready for Sales Order creation">
                <FileText size={12} className="text-amber-600 shrink-0" />
                <span>SO Draft</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border bg-teal-50 text-teal-800 border-teal-200 shadow-2xs">
                <Sparkles size={12} className="text-teal-600 shrink-0" />
                <span>Deals</span>
              </span>
            )}
            {prioritizeNoFollowups && isOverdue && !isSOConverted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs" title={`Overdue: No follow-up for ${daysInactive} days`}>
                <Clock size={10} className="text-rose-600 shrink-0" />
                <span>No Follow-up ({daysInactive}d)</span>
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Amount',
      className: 'w-[140px] whitespace-nowrap text-right',
      sortValue: (l) => getDealFinancials(l).quoteAmount,
      accessor: (l) => {
        const { quoteAmount } = getDealFinancials(l);
        return (
          <div className="text-right">
            <span className="text-xs font-mono font-black text-[#3a525d]">
              ₹{quoteAmount > 0 ? quoteAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Adv.Received',
      className: 'w-[140px] whitespace-nowrap text-right',
      sortValue: (l) => getDealFinancials(l).advanceAmount,
      accessor: (l) => {
        const { advanceAmount } = getDealFinancials(l);
        return (
          <div className="text-right">
            <span className="text-xs font-mono font-black text-emerald-700">
              ₹{advanceAmount > 0 ? advanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Follow-up',
      className: 'w-[130px] whitespace-nowrap text-right',
      sortable: false,
      accessor: (l) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setViewingLead(l)}
            className="px-3 py-1.5 bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-2xs cursor-pointer active:scale-95"
            title="View deal timeline and follow-up history"
          >
            <Eye size={12} />
            <span>Follow-up</span>
          </button>
        </div>
      )
    }
  ], [getDealFinancials, isNoFollowupDeal, prioritizeNoFollowups]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Deals</h1>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">
            Commercial Deals • Initial Payments • Sales Order Conversions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <PageActionsMenu
            onPrint={() => {
              if (printTriggerRef.current) {
                printTriggerRef.current();
              } else {
                handlePrintDeals(filteredDeals);
              }
            }}
            printLabel="Print Deals"
            onUserReport={() => userReportTriggerRef.current?.()}
            userReportLabel="My Report"
          />
        </div>
      </div>

      {/* Main DataTable with standardized filters */}
      <DataTable
        columns={columns}
        data={filteredDeals}
        isLoading={isLoading}
        searchPlaceholder="Search"
        onPrint={handlePrintDeals}
        hideTablePrint={true}
        printTriggerRef={printTriggerRef}
        userReportTriggerRef={userReportTriggerRef}
        pinRowTop={prioritizeNoFollowups ? isNoFollowupDeal : undefined}
        rowClassName={prioritizeNoFollowups ? getRowClassName : undefined}
        headerAction={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Deals Stage Filter */}
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as any)}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Deals ({stageCounts.all})</option>
              <option value="SO_DRAFT">SO Draft ({stageCounts.soDraft})</option>
              <option value="NEW_DEALS">New Deals ({stageCounts.newDeals})</option>
              <option value="SO_CONVERTED">SO Converted Deals ({stageCounts.soConverted})</option>
            </select>

            {/* 1. Branch Filter */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Branches ({allDeals.length})</option>
              {branches.map((b) => {
                const count = allDeals.filter(l => String(l.branch_id || l.employees?.branch_id || '') === String(b.id)).length;
                return (
                  <option key={b.id} value={String(b.id)}>
                    {b.name} ({count})
                  </option>
                );
              })}
            </select>

            {/* 2. Zone Filter */}
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Zones ({dealsList.length})</option>
              {availableFilterZones.map(z => {
                const count = dealsList.filter(l => String(l.zone_id) === String(z.id)).length;
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
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Sectors ({allDeals.length})</option>
              {industries.map(ind => {
                const count = allDeals.filter(l => String(l.industry_id) === String(ind.id)).length;
                return (
                  <option key={ind.id} value={String(ind.id)}>
                    {ind.name} ({count})
                  </option>
                );
              })}
            </select>

            {/* 5. No Follow-ups Filter */}
            <label 
              className={`h-10 px-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer select-none shadow-2xs ${
                prioritizeNoFollowups 
                  ? 'bg-rose-50/90 border-rose-300 text-rose-900 ring-2 ring-rose-400/20' 
                  : 'bg-white border-[#fce4d4] text-[#3a525d] hover:bg-zinc-50'
              }`}
              title="Tick to prioritize and highlight deals with no follow-up for 2+ days on top"
            >
              <input
                type="checkbox"
                checked={prioritizeNoFollowups}
                onChange={(e) => setPrioritizeNoFollowups(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-zinc-300 accent-rose-600 cursor-pointer"
              />
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className={`w-2 h-2 rounded-full ${prioritizeNoFollowups ? 'bg-rose-500 animate-pulse' : 'bg-zinc-300'}`} />
                <span>No Follow-ups</span>
                {overdueDealsCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    prioritizeNoFollowups ? 'bg-rose-200 text-rose-900' : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    {overdueDealsCount}
                  </span>
                )}
              </span>
            </label>
          </div>
        }
      />

      {/* Modals */}
      {viewingLead && (
        <LeadViewModal
          isOpen={true}
          lead={viewingLead}
          onClose={() => setViewingLead(null)}
          permissions={{
            canManageLeads,
            canManageFeeds: true,
            canAssignBranch: canManageLeads,
            canAssignStaff: canManageLeads,
            canSalesContact: canManageLeads,
            canManageFollowups: canManageLeads,
            canManageMeetings: canManageLeads,
            canManageHotLeads: canManageLeads
          }}
          onEdit={() => {
            setEditingLead(viewingLead);
          }}
          onDelete={() => {}}
          onFeedOutcome={() => {}}
          onAssignBranch={() => {}}
          onAssignStaff={() => {}}
          onFollowUp={() => {
            setFollowUpLead(viewingLead);
          }}
          onMeetingOutcome={() => {}}
          onConvertFeed={() => {}}
          onReload={fetchData}
        />
      )}

      {followUpLead && (
        <FollowUpOutcomeModal
          lead={followUpLead}
          onClose={() => setFollowUpLead(null)}
          onSuccess={() => {
            setFollowUpLead(null);
            fetchData();
          }}
        />
      )}

      {editingLead && (
        <LeadFormModal
          isOpen={true}
          onClose={() => setEditingLead(null)}
          onSubmit={async (formData) => {
            const loadingToast = toast.loading('Updating deal record...');
            try {
              await api.put(`/leads/${editingLead.id}`, formData);
              toast.success('Deal details updated successfully', { id: loadingToast });
              setEditingLead(null);
              fetchData();
            } catch (err: any) {
              toast.error(err.response?.data?.error || 'Failed to update deal', { id: loadingToast });
            }
          }}
          editingLead={editingLead}
          prefillData={null}
          industries={industries}
          branches={branches}
          zones={zones}
          employees={employees}
          currentUser={currentUser}
          userBranchId={currentUser?.branchId}
          userBranchName={currentUser?.branchName}
        />
      )}
    </div>
  );
}
