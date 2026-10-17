'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { DataTable, Column, SortInfo } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { 
  Phone, User, ExternalLink, CheckCircle2, ShoppingBag, FileText, Eye, Sparkles, Clock
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
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [activeStageFilter, setActiveStageFilter] = useState<string>('Deals');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('ALL');
  const [prioritizeNoFollowups, setPrioritizeNoFollowups] = useState<boolean>(false);

  // Modal States
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

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

  // New Deals ONLY: strictly status === 'Deals'
  const dealsList = useMemo(() => {
    return leads.filter(l => l.status === 'Deals');
  }, [leads]);

  const overdueDealsCount = useMemo(() => {
    return dealsList.filter(isNoFollowupDeal).length;
  }, [dealsList, isNoFollowupDeal]);

  const getRowClassName = useCallback((l: Lead) => {
    if (prioritizeNoFollowups && isNoFollowupDeal(l)) {
      return '!bg-rose-50/75 hover:!bg-rose-100/75 transition-colors border-b border-rose-200/50';
    }
    return undefined;
  }, [prioritizeNoFollowups, isNoFollowupDeal]);

  // Filtered Deals
  const filteredDeals = useMemo(() => {
    return dealsList.filter(l => {
      // 1. Branch filter
      if (selectedBranch !== 'ALL') {
        const bId = String(l.branch_id || l.employees?.branch_id || '');
        if (bId !== selectedBranch) return false;
      }
      // 2. Stage filter
      if (activeStageFilter !== 'ALL' && l.status !== activeStageFilter) {
        return false;
      }
      // 3. Zone filter
      if (selectedZone !== 'ALL') {
        const zId = String(l.zone_id || '');
        if (zId !== selectedZone) return false;
      }
      // 4. Sector / Industry filter
      if (selectedIndustry !== 'ALL') {
        const indId = String(l.industry_id || '');
        if (indId !== selectedIndustry) return false;
      }
      return true;
    });
  }, [dealsList, selectedBranch, activeStageFilter, selectedZone, selectedIndustry]);

  // Helper to get quotation and payment totals for a deal
  const getDealFinancials = useCallback((l: Lead) => {
    const matchedQuotes = quotations.filter(q => 
      (l.organization_id && q.organization_id === l.organization_id) ||
      (q.lead_id && q.lead_id === l.id) ||
      ((q.organizations as any)?.name && (q.organizations as any)?.name.toLowerCase() === l.name.toLowerCase())
    );

    const quoteAmount = matchedQuotes.reduce((sum, q) => sum + (parseFloat(q.final_quote_value) || 0), 0);
    const quoteIds = matchedQuotes.map(q => q.id);
    const matchedPayments = payments.filter(p => quoteIds.includes(p.quotation_id));
    const advanceAmount = matchedPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    return {
      quoteAmount,
      advanceAmount
    };
  }, [quotations, payments]);

  // Print Handler
  const handlePrintDeals = (sortedData: Lead[], currentSort?: SortInfo<Lead> | null) => {
    const printedAt = new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const activeBranchName = selectedBranch === 'ALL'
      ? 'All Branches'
      : branches.find(b => String(b.id) === selectedBranch)?.name || `Branch #${selectedBranch}`;

    const rowsHtml = sortedData.map((l, idx) => {
      const fin = getDealFinancials(l);
      return `
      <tr>
        <td style="text-align: center; color: #718096; font-size: 10px;">${idx + 1}</td>
        <td style="font-weight: 800; color: #1a202c; font-size: 11px;">
          <div>${l.name}</div>
          ${l.industries?.name ? `<div style="font-size: 8px; color: #2d8d9b; font-weight: bold; text-transform: uppercase;">${l.industries.name}</div>` : ''}
        </td>
        <td style="font-size: 10px; color: #4a5568;">
          <div style="font-weight: 600;">${l.contact_person || '—'}</div>
          ${l.contact_designation ? `<div style="color: #a0aec0; font-size: 8px;">${l.contact_designation}</div>` : ''}
        </td>
        <td style="font-size: 10px; font-family: monospace; color: #4a5568;">${l.phone || '—'}</td>
        <td style="font-size: 10px; color: #4a5568;">${l.employees?.full_name || 'Unassigned'}</td>
        <td style="text-align: center;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 9px; font-weight: bold; text-transform: uppercase; background: #ecfdf5; color: #047857;">
            ${l.status}
          </span>
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
  <title>New Deals Commercial Registry - Forma Apparels</title>
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
      <div class="brand-subtitle">Commercial Operations &amp; New Deals Registry</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 12px; font-weight: bold; color: #3a525d;">Branch: ${activeBranchName}</div>
      <div style="font-size: 9px; color: #718096; margin-top: 2px;">Printed: ${printedAt}</div>
      <div style="font-size: 9px; font-weight: bold; color: #047857;">Total Deals: ${sortedData.length}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 30px;">#</th>
        <th>Customer Name</th>
        <th>Contact Person</th>
        <th>Contact Phone</th>
        <th>Sales Person</th>
        <th style="text-align: center;">Stage Status</th>
        <th style="text-align: right;">Quotation Amount</th>
        <th style="text-align: right;">Advance Received</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="8" style="text-align: center; padding: 24px; color: #a0aec0;">No deals found matching filter criteria</td></tr>'}
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
  // 6. Quotation Amount
  // 7. Advance Received
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
                window.open(`/customers/leads?id=${l.id}`, '_blank');
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
        </div>
      )
    },
    {
      header: 'Contact Person',
      className: 'min-w-[130px] max-w-[190px] whitespace-nowrap',
      sortValue: (l) => l.contact_person || '',
      accessor: (l) => (
        l.contact_person ? (
          <div className="flex flex-col min-w-0 max-w-[180px]">
            <span className="text-xs font-bold text-[#3a525d] truncate block" title={`${l.contact_title ? l.contact_title + ' ' : ''}${l.contact_person}`}>
              {l.contact_title ? `${l.contact_title} ` : ''}{l.contact_person}
            </span>
            {l.contact_designation && (
              <span className="text-[9px] text-zinc-400 font-medium truncate block" title={l.contact_designation}>
                {l.contact_designation}
              </span>
            )}
          </div>
        ) : (
          <span className="text-zinc-400 text-xs italic font-medium">—</span>
        )
      )
    },
    {
      header: 'Contact Phone',
      className: 'w-[135px] whitespace-nowrap font-mono',
      sortValue: (l) => l.phone || '',
      accessor: (l) => (
        l.phone ? (
          <a
            href={`tel:${l.phone}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3a525d] hover:text-[#2d8d9b] transition-colors"
            title={`Call ${l.phone}`}
          >
            <Phone size={12} className="text-[#2d8d9b] shrink-0" />
            <span>{l.phone}</span>
          </a>
        ) : (
          <span className="text-zinc-400 text-xs italic font-medium">—</span>
        )
      )
    },
    {
      header: 'Sales Person',
      className: 'min-w-[145px] whitespace-nowrap',
      sortValue: (l) => l.employees?.full_name || '',
      accessor: (l) => (
        l.employees ? (
          <div className="flex items-center gap-2 min-w-0 max-w-[180px]">
            <div className="w-6 h-6 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
              <User size={12} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#3a525d] truncate block">{l.employees.full_name}</p>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider truncate block">
                {l.employees.employee_id}
              </p>
            </div>
          </div>
        ) : (
          <span className="text-zinc-400 text-xs italic font-medium">Unassigned</span>
        )
      )
    },
    {
      header: 'Stage Status',
      className: 'w-[140px] whitespace-nowrap',
      sortValue: (l) => l.status,
      accessor: (l) => {
        const refDate = l.updated_at || l.created_at;
        const daysInactive = refDate ? Math.floor((Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
        const isOverdue = isNoFollowupDeal(l);
        return (
          <div className="flex flex-col items-start gap-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs">
              <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
              <span>Deals</span>
            </span>
            {prioritizeNoFollowups && isOverdue && (
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
      header: 'Quotation Amount',
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
      header: 'Advance Received',
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
            className="px-3 py-1.5 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
            title="View deal timeline and follow-up history"
          >
            <Eye size={12} />
            <span>Follow-up</span>
          </button>
        </div>
      )
    }
  ], [getDealFinancials]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">New Deals</h1>
            <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-2xs">
              <Sparkles size={13} className="text-emerald-600" /> New Deals ({dealsList.length})
            </span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">
            Initial Payments Registered • Active Commercial Deals
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => window.open('/marketing/quotations', '_blank')}
            variant="outline"
            className="h-12 px-6 rounded-xl font-black uppercase tracking-[0.15em] text-[10px] border-2 border-[#2d8d9b] text-[#2d8d9b] hover:bg-[#2d8d9b]/10 gap-2 cursor-pointer shadow-sm"
          >
            <FileText size={15} />
            Quotations Hub
          </Button>
          <Button
            onClick={() => window.open('/marketing/order-placement', '_blank')}
            className="h-12 px-6 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-xl font-black uppercase tracking-[0.15em] text-[10px] gap-2 cursor-pointer shadow-md"
          >
            <ShoppingBag size={15} />
            Sales Orders Hub
          </Button>
        </div>
      </div>

      {/* Main DataTable with standardized filters */}
      <DataTable
        columns={columns}
        data={filteredDeals}
        isLoading={isLoading}
        searchPlaceholder="Search"
        onPrint={handlePrintDeals}
        pinRowTop={prioritizeNoFollowups ? isNoFollowupDeal : undefined}
        rowClassName={prioritizeNoFollowups ? getRowClassName : undefined}
        headerAction={
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. Branch Filter */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Branches ({dealsList.length})</option>
              {branches.map((b) => {
                const count = dealsList.filter(l => String(l.branch_id || l.employees?.branch_id || '') === String(b.id)).length;
                return (
                  <option key={b.id} value={String(b.id)}>
                    {b.name} ({count})
                  </option>
                );
              })}
            </select>

            {/* 2. Stage Filter */}
            <select
              value={activeStageFilter}
              onChange={(e) => setActiveStageFilter(e.target.value)}
              className="h-10 px-3 bg-white border border-[#fce4d4] rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Stages ({dealsList.length})</option>
              <option value="Deals">Deals ({dealsList.length})</option>
            </select>

            {/* 3. Zone Filter */}
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
              <option value="ALL">All Sectors ({dealsList.length})</option>
              {industries.map(ind => {
                const count = dealsList.filter(l => String(l.industry_id) === String(ind.id)).length;
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
            canManageFeeds: false,
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
    </div>
  );
}
