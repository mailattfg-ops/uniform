'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { DataTable, Column, SortInfo } from '@/components/ui/DataTable';
import { PageActionsMenu } from '@/components/ui/PageActionsMenu';
import { FilterDropdown } from '@/components/ui/FilterDropdown';
import { DateRangeFilter, DateFilterValue, matchesDateFilter } from '@/components/ui/DateRangeFilter';
import { formatDate } from '@/lib/formatters';
import { 
  Phone, User, ExternalLink, Eye, Sparkles, Clock, CheckCircle2, FileText, Calendar,
  MoreVertical, Send, Check, ShieldCheck, Lock, Edit3, MessageSquare, AlertCircle, X, ChevronRight, Loader2
} from 'lucide-react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { ContactPhoneLink } from '@/components/ui/ContactPhoneLink';
import { 
  Lead, 
  Industry, 
  Employee, 
  Branch, 
  Zone,
  LeadViewModal,
  LeadFormModal
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
  const [stageFilter, setStageFilter] = useState<'ALL' | 'NEW_DEALS' | 'SO_DRAFT' | 'PENDING_BM_APPROVAL' | 'SO_APPROVED' | 'PENDING_CORP_APPROVAL'>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ preset: 'ALL' });

  // Modal States
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // SO Deal Workflow Modals
  const [remarksModalDeal, setRemarksModalDeal] = useState<Lead | null>(null);
  const [remarksModalQuotation, setRemarksModalQuotation] = useState<any | null>(null);
  const [isRemarksReadOnly, setIsRemarksReadOnly] = useState<boolean>(false);

  const [bmApprovalDeal, setBmApprovalDeal] = useState<Lead | null>(null);
  const [bmApprovalQuotation, setBmApprovalQuotation] = useState<any | null>(null);

  const [corpApprovalDeal, setCorpApprovalDeal] = useState<Lead | null>(null);
  const [corpApprovalQuotation, setCorpApprovalQuotation] = useState<any | null>(null);

  const [openMenuDealId, setOpenMenuDealId] = useState<number | null>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        setCurrentUser(u);
        const r = (u.role || '').toLowerCase();
        const perms = Array.isArray(u.permissions) ? u.permissions : [];
        const isAdmin = r === 'admin' || r === 'super admin' || r === 'superadmin' || r === 'corporate' || perms.includes('all');
        if (!isAdmin && u.branchId) {
          setSelectedBranch(String(u.branchId));
        }
      }
    } catch (e) {
      console.error('Failed to parse current user from localStorage:', e);
    }
  }, []);

  // Close 3-dots action menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuDealId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
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
  const isSuperAdmin = userRole === 'admin' || userRole === 'super admin' || userRole === 'superadmin' || userPermissions.includes('all');
  const isCorporate = isSuperAdmin || userRole === 'corporate' || userPermissions.includes('corporate_approver');
  const isBranchManager = isSuperAdmin || isCorporate || userRole.includes('branch manager') || userRole.includes('manager') || userPermissions.includes('manage_branch') || userPermissions.includes('submit_quotations_ops');
  const canManageLeads = isSuperAdmin || userPermissions.includes('manage_leads');

  // Available zones filtered by selected branch
  const availableFilterZones = useMemo(() => {
    const effectiveBranch = (!isSuperAdmin && currentUser?.branchId) ? String(currentUser.branchId) : selectedBranch;
    if (effectiveBranch === 'ALL') return zones;
    return zones.filter(z => String(z.branch_id) === effectiveBranch);
  }, [zones, selectedBranch, isSuperAdmin, currentUser?.branchId]);

  // Helper to calculate financials and the exact Sales Order deal lifecycle stage
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
    const paymentAdvance = matchedPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    const approvedQuote = matchedQuotes.find(q => q.status === 'Approved') || matchedQuotes[0];
    const hasApprovedQuote = matchedQuotes.some(q => q.status === 'Approved');
    const quotePaid = parseFloat(approvedQuote?.paid_amount || '0');
    const advanceAmount = quotePaid > 0 ? quotePaid : paymentAdvance;
    const hasAdvance = advanceAmount > 0;

    // Retrieve SO deal stage from quotation metrics_summary
    const stageFromMeta = approvedQuote?.metrics_summary?.so_deal_stage;
    let dealStage: 'NEW_DEALS' | 'SO_DRAFT' | 'PENDING_BM_APPROVAL' | 'SO_APPROVED' | 'PENDING_CORP_APPROVAL' | 'CORP_APPROVED';

    if (stageFromMeta) {
      dealStage = stageFromMeta;
    } else if (hasApprovedQuote && hasAdvance) {
      dealStage = 'NEW_DEALS';
    } else {
      dealStage = 'NEW_DEALS';
    }

    const isCorporateApproved = dealStage === 'CORP_APPROVED' || l.status === 'SO Converted Deals';

    return {
      quoteAmount,
      advanceAmount,
      quoteCount: matchedQuotes.length,
      matchedQuotes,
      approvedQuote,
      hasApprovedQuote,
      hasAdvance,
      dealStage,
      isCorporateApproved
    };
  }, [quotations, payments]);

  // All Deals: includes active leads & quotes with payment.
  // Rule: When corporate approves, the deal disappears from the Deals registry table!
  const allDeals = useMemo(() => {
    const dealsFromLeads = leads.filter(l => {
      if (l.status === 'Deals') return true;
      const hasApprovedQuote = quotations.some(q => 
        q.status === 'Approved' && (
          (l.organization_id && q.organization_id === l.organization_id) ||
          (q.lead_id && q.lead_id === l.id) ||
          ((q.organizations as any)?.name && (q.organizations as any)?.name.toLowerCase() === l.name.toLowerCase())
        )
      );
      return hasApprovedQuote;
    });

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
          date: formatDate(q.created_at),
          time: '',
          text: `Quotation #${q.quotation_no} approved.`,
          stage: 'Deals',
          response_type: 'positive'
        }],
        is_cold: false
      } as any;
    });

    const rawList = [...dealsFromLeads, ...synthesizedDeals];

    // Filter out deals that have already been Corporate Approved (they disappear from Deals table)
    let activeList = rawList.filter(d => {
      const fin = getDealFinancials(d);
      return !fin.isCorporateApproved;
    });

    // Each branch staff should see only their branch deals
    if (!isSuperAdmin && currentUser?.branchId) {
      activeList = activeList.filter(d => {
        const bId = String(d.branch_id || d.employees?.branch_id || '');
        return bId === String(currentUser.branchId);
      });
    }

    return activeList;
  }, [leads, quotations, getDealFinancials, isSuperAdmin, currentUser?.branchId]);

  // Stage counts for filter options
  const stageCounts = useMemo(() => {
    let all = allDeals.length;
    let newDeals = 0;
    let soDraft = 0;
    let pendingBm = 0;
    let soApproved = 0;
    let pendingCorp = 0;

    for (const l of allDeals) {
      const { dealStage } = getDealFinancials(l);
      if (dealStage === 'NEW_DEALS') newDeals++;
      else if (dealStage === 'SO_DRAFT') soDraft++;
      else if (dealStage === 'PENDING_BM_APPROVAL') pendingBm++;
      else if (dealStage === 'SO_APPROVED') soApproved++;
      else if (dealStage === 'PENDING_CORP_APPROVAL') pendingCorp++;
    }
    return { all, newDeals, soDraft, pendingBm, soApproved, pendingCorp };
  }, [allDeals, getDealFinancials]);

  // Filtered Deals
  const filteredDeals = useMemo(() => {
    return allDeals.filter(l => {
      // 0. Stage / Deal Type filter
      if (stageFilter !== 'ALL') {
        const { dealStage } = getDealFinancials(l);
        if (dealStage !== stageFilter) return false;
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
      // 4. Date filter
      if (!matchesDateFilter(l.created_at, dateFilter)) {
        return false;
      }
      return true;
    });
  }, [allDeals, stageFilter, selectedBranch, selectedZone, selectedIndustry, dateFilter, getDealFinancials]);

  // Send for BM Approval Handler
  const handleSendToBm = async (deal: Lead, quote: any) => {
    if (!quote?.id) {
      toast.error('No approved quotation found for this deal');
      return;
    }
    if (!window.confirm(`Submit Quotation #${quote.quotation_no} to Branch Manager for SO approval?\n\nOnce submitted, item remarks cannot be edited.`)) {
      return;
    }
    const loadingToast = toast.loading('Submitting deal to Branch Manager...');
    try {
      await api.put(`/quotations/${quote.id}/submit-so-draft`);
      toast.success('Deal submitted to Branch Manager! It is now locked from branch editing.', { id: loadingToast });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit deal to Branch Manager', { id: loadingToast });
    }
  };

  // Send for Corporate Approval Handler
  const handleSendToCorporate = async (deal: Lead, quote: any) => {
    if (!quote?.id) {
      toast.error('No approved quotation found for this deal');
      return;
    }
    if (!window.confirm(`Submit SO Approved Deal for Quotation #${quote.quotation_no} to Corporate for final approval?`)) {
      return;
    }
    const loadingToast = toast.loading('Submitting deal to Corporate...');
    try {
      await api.put(`/quotations/${quote.id}/submit-so-corporate`);
      toast.success('Deal submitted to Corporate for final approval!', { id: loadingToast });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit deal to Corporate', { id: loadingToast });
    }
  };

  // Print Handlers
  const printTriggerRef = useRef<(() => void) | null>(null);
  const userReportTriggerRef = useRef<(() => void) | null>(null);
  const handlePrintDeals = (sortedData?: Lead[], currentSort?: SortInfo<Lead> | null) => {
    const dataToPrint = (sortedData && sortedData.length > 0) ? sortedData : filteredDeals;
    const printedAt = formatDate(new Date(), true);

    const activeBranchName = selectedBranch === 'ALL'
      ? 'All Branches'
      : branches.find(b => String(b.id) === selectedBranch)?.name || `Branch #${selectedBranch}`;

    const rowsHtml = dataToPrint.map((l, idx) => {
      const fin = getDealFinancials(l);
      let stageLabel = 'New Deals';
      let badgeBg = '#f0fdfa';
      let badgeColor = '#0d9488';

      if (fin.dealStage === 'SO_DRAFT') {
        stageLabel = 'SO Draft';
        badgeBg = '#fef3c7';
        badgeColor = '#92400e';
      } else if (fin.dealStage === 'PENDING_BM_APPROVAL') {
        stageLabel = 'Pending BM Approval';
        badgeBg = '#fff7ed';
        badgeColor = '#c2410c';
      } else if (fin.dealStage === 'SO_APPROVED') {
        stageLabel = 'SO Approved';
        badgeBg = '#e0e7ff';
        badgeColor = '#3730a3';
      } else if (fin.dealStage === 'PENDING_CORP_APPROVAL') {
        stageLabel = 'Pending Corp Approval';
        badgeBg = '#f3e8ff';
        badgeColor = '#6b21a8';
      }

      return `
      <tr>
        <td style="text-align: center; color: #718096; font-size: 10px;">${idx + 1}</td>
        <td style="font-size: 10px; color: #4a5568; text-align: center;">${formatDate(l.created_at)}</td>
        <td style="font-weight: 800; color: #1a202c; font-size: 11px;">
          <div>${l.name}</div>
          ${(() => {
            const indName = l.industries?.name || (zones && industries.find(ind => ind.id === l.industry_id)?.name);
            return indName ? `<div style="font-size: 8px; color: #9E1B1D; font-weight: bold; text-transform: uppercase;">${indName}</div>` : '';
          })()}
        </td>
        <td style="font-size: 10px; color: #4a5568; text-align: left;">${l.zones?.name || (zones.find(z => z.id === l.zone_id)?.name) || '—'}</td>
        <td style="font-size: 10px; color: #4a5568;">
          <div style="font-weight: 700; color: #1a202c;">${l.contact_person ? `${l.contact_title ? `${l.contact_title} ` : ''}${l.contact_person}` : '—'}</div>
          ${l.contact_designation ? `<div style="color: #a0aec0; font-size: 8px;">${l.contact_designation}</div>` : ''}
          ${l.phone ? `<div style="color: #2d8d9b; font-family: monospace; font-size: 9px; font-weight: bold; margin-top: 2px;">${l.phone}</div>` : ''}
        </td>
        <td style="font-size: 10px; color: #4a5568;">${l.employees?.full_name || 'Unassigned'}</td>
        <td style="text-align: center;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 9px; font-weight: bold; text-transform: uppercase; background: ${badgeBg}; color: ${badgeColor};">${stageLabel}</span>
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
        <th style="text-align: center;">Date</th>
        <th style="text-align: left;">Customer Name</th>
        <th style="text-align: left;">Zone</th>
        <th style="text-align: left;">Contact</th>
        <th>Sales Person</th>
        <th style="text-align: center;">Status</th>
        <th style="text-align: right;">Amount</th>
        <th style="text-align: right;">Adv.Received</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="9" style="text-align: center; padding: 24px; color: #a0aec0;">No deals found matching filter criteria</td></tr>'}
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

  // Table Columns
  const columns: Column<Lead>[] = useMemo(() => [
    {
      header: 'Date',
      className: 'w-[110px] whitespace-nowrap text-center',
      sortValue: (l) => l.created_at || '',
      accessor: (l) => (
        <span className="text-xs font-semibold text-zinc-600 whitespace-nowrap">
          {formatDate(l.created_at)}
        </span>
      )
    },
    {
      header: 'Customer Name',
      className: 'min-w-[170px] max-w-[260px] text-left',
      sortValue: (l) => l.name,
      accessor: (l) => {
        const industryName = l.industries?.name || industries.find(ind => ind.id === l.industry_id)?.name;
        return (
          <div className="min-w-0 text-left flex flex-col items-start">
            <p className="font-bold text-xs md:text-sm tracking-tight text-zinc-900 truncate w-full" title={l.name}>
              {l.name}
            </p>
            {industryName && (
              <p className="text-[10px] font-bold text-[#9E1B1D] uppercase tracking-wider truncate mt-0.5 w-full">
                {industryName}
              </p>
            )}
          </div>
        );
      }
    },
    {
      header: 'Zone',
      className: 'w-[130px] min-w-[110px] whitespace-nowrap text-left',
      sortValue: (l) => l.zones?.name || (zones.find(z => z.id === l.zone_id)?.name) || '',
      accessor: (l) => {
        const zoneName = l.zones?.name || zones.find(z => z.id === l.zone_id)?.name;
        return zoneName ? (
          <div className="text-xs font-medium text-zinc-700 truncate text-left" title={zoneName}>
            <span className="truncate">{zoneName}</span>
          </div>
        ) : (
          <div className="text-left">
            <span className="text-zinc-400 text-xs italic font-medium">—</span>
          </div>
        );
      }
    },
    {
      header: 'Contact',
      className: 'min-w-[150px] max-w-[220px] whitespace-nowrap text-left',
      sortValue: (l) => l.contact_person || l.phone || '',
      accessor: (l) => (
        l.contact_person || l.phone ? (
          <div className="flex flex-col items-start justify-center text-left min-w-0 max-w-[210px]">
            {l.contact_person && (
              <span className="text-xs font-bold text-zinc-900 truncate block w-full" title={`${l.contact_title ? l.contact_title + ' ' : ''}${l.contact_person}`}>
                {l.contact_title ? `${l.contact_title} ` : ''}{l.contact_person}
              </span>
            )}
            {l.contact_designation && (
              <span className="text-[9px] text-zinc-400 font-medium truncate block w-full" title={l.contact_designation}>
                {l.contact_designation}
              </span>
            )}
            {l.phone && (
              <div className="mt-0.5">
                <ContactPhoneLink phone={l.phone} name={l.contact_person || l.name} />
              </div>
            )}
          </div>
        ) : (
          <div className="text-left">
            <span className="text-zinc-400 text-xs italic font-medium">—</span>
          </div>
        )
      )
    },
    {
      header: 'Sales Person',
      className: 'min-w-[140px] whitespace-nowrap text-center',
      sortValue: (l) => l.employees?.full_name || '',
      accessor: (l) => (
        l.employees ? (
          <div className="min-w-0 max-w-[180px] text-center flex flex-col items-center mx-auto">
            <p className="text-xs font-bold text-zinc-800 truncate block" title={l.employees.full_name}>{l.employees.full_name}</p>
            {l.employees.employee_id && (
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider truncate block">
                {l.employees.employee_id}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center">
            <span className="text-zinc-400 text-xs italic font-medium">Unassigned</span>
          </div>
        )
      )
    },
    {
      header: 'Status',
      className: 'w-[180px] whitespace-nowrap',
      sortValue: (l) => getDealFinancials(l).dealStage,
      accessor: (l) => {
        const { dealStage } = getDealFinancials(l);

        return (
          <div className="flex flex-col items-start gap-1">
            {dealStage === 'NEW_DEALS' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border bg-teal-50 text-teal-800 border-teal-200 shadow-2xs">
                <Sparkles size={12} className="text-teal-600 shrink-0" />
                <span>New Deals</span>
              </span>
            )}
            {dealStage === 'SO_DRAFT' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border bg-amber-50 text-amber-800 border-amber-300 shadow-2xs">
                <FileText size={12} className="text-amber-600 shrink-0" />
                <span>SO Draft</span>
              </span>
            )}
            {dealStage === 'PENDING_BM_APPROVAL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border bg-orange-50 text-orange-800 border-orange-300 shadow-2xs">
                <Lock size={10} />
                <span>Pending BM Approval</span>
              </span>
            )}
            {dealStage === 'SO_APPROVED' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border bg-indigo-50 text-indigo-800 border-indigo-200 shadow-2xs">
                <CheckCircle2 size={12} className="text-indigo-600 shrink-0" />
                <span>SO Approved Deals</span>
              </span>
            )}
            {dealStage === 'PENDING_CORP_APPROVAL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border bg-purple-50 text-purple-800 border-purple-200 shadow-2xs">
                <ShieldCheck size={12} className="text-purple-600 shrink-0" />
                <span>Pending Corp Approval</span>
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Amount',
      className: 'w-[130px] whitespace-nowrap text-right',
      sortValue: (l) => getDealFinancials(l).quoteAmount,
      accessor: (l) => {
        const { quoteAmount } = getDealFinancials(l);
        return (
          <div className="text-right">
            <span className="text-xs font-mono font-black text-zinc-900">
              ₹{quoteAmount > 0 ? quoteAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Adv.Received',
      className: 'w-[130px] whitespace-nowrap text-right',
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
      header: 'SO Action',
      className: 'min-w-[190px] whitespace-nowrap text-center',
      sortable: false,
      accessor: (l) => {
        const fin = getDealFinancials(l);
        const quote = fin.approvedQuote;
        const stage = fin.dealStage;

        return (
          <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            {/* Primary Action Button based on Stage */}
            {stage === 'NEW_DEALS' && (
              <button
                type="button"
                onClick={() => {
                  setRemarksModalDeal(l);
                  setRemarksModalQuotation(quote);
                  setIsRemarksReadOnly(false);
                }}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="Add remarks against each quotation item"
              >
                <Edit3 size={11} />
                <span>Add Remarks</span>
              </button>
            )}

            {stage === 'SO_DRAFT' && (
              <button
                type="button"
                onClick={() => handleSendToBm(l, quote)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="Send SO Draft to Branch Manager for approval"
              >
                <Send size={11} />
                <span>Send for Approval</span>
              </button>
            )}

            {stage === 'PENDING_BM_APPROVAL' && (
              isBranchManager ? (
                <button
                  type="button"
                  onClick={() => {
                    setBmApprovalDeal(l);
                    setBmApprovalQuotation(quote);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title="Check and approve Sales Order draft in Deals table"
                >
                  <CheckCircle2 size={11} />
                  <span>Check & Approve</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200">
                  <Lock size={10} /> With BM
                </span>
              )
            )}

            {stage === 'SO_APPROVED' && (
              isBranchManager ? (
                <button
                  type="button"
                  onClick={() => handleSendToCorporate(l, quote)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title="Send to Corporate for final approval"
                >
                  <Send size={11} />
                  <span>Send for Approval</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200">
                  <CheckCircle2 size={10} /> BM Approved
                </span>
              )
            )}

            {stage === 'PENDING_CORP_APPROVAL' && (
              isCorporate ? (
                <button
                  type="button"
                  onClick={() => {
                    setCorpApprovalDeal(l);
                    setCorpApprovalQuotation(quote);
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title="Corporate approve deal and release to production"
                >
                  <ShieldCheck size={11} />
                  <span>Corporate Approve</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200">
                  <ShieldCheck size={10} /> With Corporate
                </span>
              )
            )}

            {/* 3-Dots Action Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenMenuDealId(openMenuDealId === l.id ? null : l.id)}
                className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
                title="Options"
              >
                <MoreVertical size={14} />
              </button>

              {openMenuDealId === l.id && (
                <div 
                  className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-zinc-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100 text-left"
                  onClick={(e) => e.stopPropagation()}
                >
                  {stage === 'SO_DRAFT' && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuDealId(null);
                        setRemarksModalDeal(l);
                        setRemarksModalQuotation(quote);
                        setIsRemarksReadOnly(false);
                      }}
                      className="w-full px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Edit3 size={12} className="text-amber-600" />
                      <span>Edit Remarks</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenuDealId(null);
                      setRemarksModalDeal(l);
                      setRemarksModalQuotation(quote);
                      setIsRemarksReadOnly(stage !== 'NEW_DEALS' && stage !== 'SO_DRAFT');
                    }}
                    className="w-full px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Eye size={12} className="text-zinc-500" />
                    <span>View Remarks</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      }
    }
  ], [getDealFinancials, zones, isBranchManager, isCorporate, openMenuDealId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black italic tracking-tighter text-zinc-900">Deals</h1>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#9E1B1D] mt-1 font-bold">
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
        onRowClick={(deal) => setViewingLead(deal)}
        onPrint={handlePrintDeals}
        hideTablePrint={true}
        printTriggerRef={printTriggerRef}
        userReportTriggerRef={userReportTriggerRef}
        headerAction={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Deals Stage Filter */}
            <FilterDropdown
              label="Stage"
              allLabel="All Active Deals"
              allBadge={stageCounts.all}
              value={stageFilter}
              onChange={(val) => setStageFilter(val as any)}
              options={[
                { label: 'New Deals', value: 'NEW_DEALS', badge: stageCounts.newDeals },
                { label: 'SO Draft', value: 'SO_DRAFT', badge: stageCounts.soDraft },
                { label: 'Pending BM Approval', value: 'PENDING_BM_APPROVAL', badge: stageCounts.pendingBm },
                { label: 'SO Approved Deals', value: 'SO_APPROVED', badge: stageCounts.soApproved },
                { label: 'Pending Corp Approval', value: 'PENDING_CORP_APPROVAL', badge: stageCounts.pendingCorp }
              ]}
            />

            {/* 1. Branch Filter - only available to Global Admin / Corporate */}
            {isSuperAdmin && (
              <FilterDropdown
                label="Branch"
                allLabel="All Branches"
                allBadge={allDeals.length}
                value={selectedBranch}
                onChange={(val) => setSelectedBranch(val)}
                options={branches.map((b) => ({
                  label: b.name,
                  value: String(b.id),
                  badge: allDeals.filter(l => String(l.branch_id || l.employees?.branch_id || '') === String(b.id)).length
                }))}
              />
            )}

            {/* 2. Zone Filter */}
            <FilterDropdown
              label="Zone"
              allLabel="All Zones"
              allBadge={allDeals.length}
              value={selectedZone}
              onChange={(val) => setSelectedZone(val)}
              options={availableFilterZones.map(z => ({
                label: z.name,
                value: String(z.id),
                badge: allDeals.filter(l => String(l.zone_id) === String(z.id)).length
              }))}
            />

            {/* 3. Sector / Industry Filter */}
            <FilterDropdown
              label="Sector"
              allLabel={`All Sectors (${allDeals.length})`}
              value={selectedIndustry}
              onChange={(val) => setSelectedIndustry(val)}
              options={industries.map(ind => ({
                label: ind.name,
                value: String(ind.id),
                badge: allDeals.filter(l => String(l.industry_id) === String(ind.id)).length
              }))}
            />

            {/* 4. Date Filter */}
            <DateRangeFilter
              label="Date"
              value={dateFilter}
              onChange={setDateFilter}
            />
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
            canManageFollowups: false,
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
          onFollowUp={() => {}}
          onMeetingOutcome={() => {}}
          onConvertFeed={() => {}}
          onReload={fetchData}
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

      {/* Sales Order Item Remarks Modal (Editable or Read-Only) */}
      {remarksModalDeal && (
        <DealItemRemarksModal
          isOpen={true}
          deal={remarksModalDeal}
          quotation={remarksModalQuotation}
          isReadOnly={isRemarksReadOnly}
          onClose={() => {
            setRemarksModalDeal(null);
            setRemarksModalQuotation(null);
          }}
          onSuccess={fetchData}
        />
      )}

      {/* Branch Manager SO Review & Approval Modal (Directly in Deals Table) */}
      {bmApprovalDeal && (
        <BmApprovalModal
          isOpen={true}
          deal={bmApprovalDeal}
          quotation={bmApprovalQuotation}
          onClose={() => {
            setBmApprovalDeal(null);
            setBmApprovalQuotation(null);
          }}
          onSuccess={fetchData}
        />
      )}

      {/* Corporate Final Approval Modal */}
      {corpApprovalDeal && (
        <CorporateApprovalModal
          isOpen={true}
          deal={corpApprovalDeal}
          quotation={corpApprovalQuotation}
          onClose={() => {
            setCorpApprovalDeal(null);
            setCorpApprovalQuotation(null);
          }}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// SALES ORDER ITEM REMARKS MODAL
// ----------------------------------------------------------------------
function DealItemRemarksModal({
  isOpen,
  deal,
  quotation,
  isReadOnly,
  onClose,
  onSuccess
}: {
  isOpen: boolean;
  deal: Lead | null;
  quotation: any | null;
  isReadOnly: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [remarks, setRemarks] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !quotation?.id) return;
    setIsLoading(true);
    api.get(`/quotations/${quotation.id}`)
      .then(res => {
        const qData = res.data?.quotation || res.data;
        const qItems = res.data?.quotation_items || qData?.quotation_items || [];
        setItems(qItems);

        // Prepopulate remarks
        const existingRemarks = qData?.metrics_summary?.item_remarks || {};
        const initialMap: { [key: string]: string } = {};
        for (const item of qItems) {
          initialMap[item.id] = existingRemarks[item.id] || '';
          if (!initialMap[item.id] && item.notes && typeof item.notes === 'string') {
            if (item.notes.startsWith('{')) {
              try {
                const parsed = JSON.parse(item.notes);
                initialMap[item.id] = parsed.branch_remarks || '';
              } catch (e) {}
            } else {
              initialMap[item.id] = item.notes;
            }
          }
        }
        setRemarks(initialMap);
      })
      .catch(err => {
        console.error('Failed to load quotation items:', err);
        toast.error('Failed to load quotation items');
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, quotation?.id]);

  if (!isOpen || !deal) return null;

  const handleSave = async () => {
    setIsSaving(true);
    const loadingToast = toast.loading('Saving item remarks...');
    try {
      await api.put(`/quotations/${quotation.id}/deal-item-remarks`, {
        item_remarks: remarks
      });
      toast.success('Remarks saved! Deal is now in SO Draft status.', { id: loadingToast });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save remarks', { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#C82A2B]/10 text-[#C82A2B] rounded-lg">
                <FileText size={18} />
              </span>
              <h2 className="text-lg font-black text-zinc-900">
                {isReadOnly ? 'Quotation Item Remarks' : 'Add / Edit Item Remarks'}
              </h2>
              {isReadOnly && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
                  <Lock size={10} /> Locked / Submitted
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Customer: <span className="font-bold text-zinc-800">{deal.name}</span> • Quote: <span className="font-bold text-[#C82A2B]">#{quotation?.quotation_no || '—'}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 size={32} className="animate-spin text-[#C82A2B] mx-auto" />
              <p className="text-xs font-bold text-zinc-500 mt-2">Loading items...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-xs">
              No line items found for this quotation.
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-zinc-500">
                {isReadOnly 
                  ? 'Review the remarks recorded by the branch for each line item below.' 
                  : 'Add specific branch remarks, fabric specifications, or custom tailoring instructions against each item before submitting to the Branch Manager.'}
              </p>

              <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                {items.map((it, idx) => {
                  const itemName = it.manual_item_name || it.product_types?.name || it.products?.name || `Item #${idx + 1}`;
                  return (
                    <div key={it.id || idx} className="p-4 hover:bg-zinc-50/50 transition-colors space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-700 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-zinc-900">{itemName}</h4>
                            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                              <span>Qty: <strong className="text-zinc-800">{it.quantity || 1}</strong></span>
                              <span>•</span>
                              <span>Rate: <strong className="text-zinc-800 font-mono">₹{parseFloat(it.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                              <span>•</span>
                              <span>Total: <strong className="text-zinc-900 font-mono">₹{parseFloat(it.total_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                            </div>
                            {it.design_number && (
                              <span className="inline-block mt-1 text-[10px] font-mono font-bold px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded">
                                Design: {it.design_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Remarks Input */}
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                          Branch Remark / Instructions
                        </label>
                        {isReadOnly ? (
                          <div className="p-3 bg-zinc-50 rounded-xl text-xs text-zinc-800 font-medium border border-zinc-200 min-h-[48px]">
                            {remarks[it.id] || <span className="text-zinc-400 italic">No remarks entered for this item</span>}
                          </div>
                        ) : (
                          <textarea
                            value={remarks[it.id] || ''}
                            onChange={(e) => setRemarks({ ...remarks, [it.id]: e.target.value })}
                            rows={2}
                            placeholder="Enter remarks for this item (e.g. customized fit, fabric shade, pocket style, embroidery details)..."
                            className="w-full text-xs p-3 rounded-xl border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-[#C82A2B]/20 focus:border-[#C82A2B] placeholder:text-zinc-400"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100 bg-zinc-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
          >
            {isReadOnly ? 'Close' : 'Cancel'}
          </button>
          {!isReadOnly && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="px-5 py-2 text-xs font-black uppercase tracking-wider text-white bg-[#C82A2B] hover:bg-[#A81D1E] disabled:opacity-50 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              <span>Save Remarks</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// BRANCH MANAGER SO REVIEW & APPROVAL MODAL (IN DEALS TABLE)
// ----------------------------------------------------------------------
function BmApprovalModal({
  isOpen,
  deal,
  quotation,
  onClose,
  onSuccess
}: {
  isOpen: boolean;
  deal: Lead | null;
  quotation: any | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [remarksMap, setRemarksMap] = useState<{ [key: string]: string }>({});
  const [bmNotes, setBmNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    if (!isOpen || !quotation?.id) return;
    setIsLoading(true);
    api.get(`/quotations/${quotation.id}`)
      .then(res => {
        const qData = res.data?.quotation || res.data;
        const qItems = res.data?.quotation_items || qData?.quotation_items || [];
        setItems(qItems);
        setRemarksMap(qData?.metrics_summary?.item_remarks || {});
      })
      .catch(err => {
        console.error('Failed to load quotation for BM review:', err);
        toast.error('Failed to load quotation items');
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, quotation?.id]);

  if (!isOpen || !deal) return null;

  const handleApprove = async () => {
    setIsApproving(true);
    const loadingToast = toast.loading('Branch Manager approving SO...');
    try {
      await api.put(`/quotations/${quotation.id}/bm-approve-so`, { bm_notes: bmNotes });
      toast.success('Deal approved by Branch Manager! Status updated to SO Approved Deals.', { id: loadingToast });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve deal', { id: loadingToast });
    } finally {
      setIsApproving(false);
    }
  };

  const quoteTotal = parseFloat(quotation?.final_quote_value || '0');
  const advancePaid = parseFloat(quotation?.paid_amount || '0');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-emerald-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-600 text-white rounded-lg">
                <CheckCircle2 size={18} />
              </span>
              <h2 className="text-lg font-black text-zinc-900">
                Branch Manager SO Review & Approval
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
                <Lock size={10} /> Pending BM Approval
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Review line item remarks and advance payment before approving this deal.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Stats Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Customer</span>
              <span className="text-xs font-black text-zinc-900 block truncate mt-0.5">{deal.name}</span>
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Quotation No</span>
              <span className="text-xs font-black text-[#C82A2B] font-mono block mt-0.5">#{quotation?.quotation_no}</span>
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Total Quote Value</span>
              <span className="text-xs font-black text-zinc-900 font-mono block mt-0.5">₹{quoteTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
                <CheckCircle2 size={10} /> Advance Paid
              </span>
              <span className="text-xs font-black text-emerald-800 font-mono block mt-0.5">₹{advancePaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Items & Remarks */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-700">
              Quotation Line Items & Branch Remarks
            </h3>

            {isLoading ? (
              <div className="py-12 text-center">
                <Loader2 size={28} className="animate-spin text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-zinc-500 mt-2">Loading items...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-xs">No items found</div>
            ) : (
              <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-xl overflow-hidden bg-white">
                {items.map((it, idx) => {
                  const itemName = it.manual_item_name || it.product_types?.name || it.products?.name || `Item #${idx + 1}`;
                  const remark = remarksMap[it.id] || it.notes;
                  return (
                    <div key={it.id || idx} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-700 flex items-center justify-center text-[10px] font-black">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-zinc-900">{itemName}</span>
                          <span className="text-xs text-zinc-400">({it.quantity} Pcs @ ₹{parseFloat(it.unit_price || 0).toLocaleString('en-IN')})</span>
                        </div>
                        <span className="text-xs font-black font-mono text-zinc-900">
                          ₹{parseFloat(it.total_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="p-2.5 bg-amber-50/70 border border-amber-200/70 rounded-lg">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block mb-0.5">
                          Branch Remark:
                        </span>
                        <p className="text-xs text-zinc-800">
                          {remark && !remark.startsWith('{') ? remark : <span className="text-zinc-400 italic">No remarks entered</span>}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* BM Notes */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              Branch Manager Notes (Optional)
            </label>
            <textarea
              value={bmNotes}
              onChange={(e) => setBmNotes(e.target.value)}
              rows={2}
              placeholder="Add any instructions or remarks for Corporate..."
              className="w-full text-xs p-3 rounded-xl border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 placeholder:text-zinc-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100 bg-zinc-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={isApproving || isLoading}
            className="px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            {isApproving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            <span>Approve SO</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// CORPORATE FINAL SO APPROVAL MODAL
// ----------------------------------------------------------------------
function CorporateApprovalModal({
  isOpen,
  deal,
  quotation,
  onClose,
  onSuccess
}: {
  isOpen: boolean;
  deal: Lead | null;
  quotation: any | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  if (!isOpen || !deal) return null;

  const handleApprove = async () => {
    setIsApproving(true);
    const loadingToast = toast.loading('Corporate approving Sales Order...');
    try {
      await api.put(`/quotations/${quotation.id}/corporate-approve-so`, { approval_notes: approvalNotes });
      toast.success('Deal approved by Corporate and released to Production! Deal converted and removed from Deals registry.', { id: loadingToast });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve deal', { id: loadingToast });
    } finally {
      setIsApproving(false);
    }
  };

  const quoteTotal = parseFloat(quotation?.final_quote_value || '0');
  const advancePaid = parseFloat(quotation?.paid_amount || '0');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-purple-50/50">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-purple-600 text-white rounded-lg">
              <ShieldCheck size={18} />
            </span>
            <div>
              <h2 className="text-base font-black text-zinc-900">Corporate Final SO Approval</h2>
              <p className="text-[11px] text-zinc-500">Release deal to active Production & Factory execution</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Customer:</span>
              <span className="font-bold text-zinc-900">{deal.name}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Quotation No:</span>
              <span className="font-bold text-[#C82A2B] font-mono">#{quotation?.quotation_no}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Total Value:</span>
              <span className="font-bold text-zinc-900 font-mono">₹{quoteTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Advance Paid:</span>
              <span className="font-bold text-emerald-700 font-mono">₹{advancePaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <p className="text-xs text-zinc-600 leading-relaxed">
            By approving this deal, the quotation is converted into an active <strong>Production Sales Order (SO)</strong> for manufacturing, and this deal will automatically complete and disappear from the Deals registry table.
          </p>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              Corporate Approval Instructions / Notes (Optional)
            </label>
            <textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              rows={2}
              placeholder="Enter notes for production planning / accounts..."
              className="w-full text-xs p-3 rounded-xl border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 placeholder:text-zinc-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100 bg-zinc-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={isApproving}
            className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            {isApproving ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            <span>Approve & Release</span>
          </button>
        </div>
      </div>
    </div>
  );
}
