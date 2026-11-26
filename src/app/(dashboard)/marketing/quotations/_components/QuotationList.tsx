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
  XCircle,
  AlertCircle,
  Edit3,
  CreditCard,
  Snowflake,
  ChevronDown,
  ChevronUp,
  FileText,
  Check,
  Send,
  FileWarning
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import toast from '@/components/ui/toast';
import { Quotation, Organization } from '../page';
import { formatDate, capitalizeFirstLetter, formatContactPerson, formatPhoneNumber } from '@/lib/formatters';
import { FilterDropdown } from '@/components/ui/FilterDropdown';
import { ContactPhoneLink } from '@/components/ui/ContactPhoneLink';
import { DateRangeFilter, DateFilterValue, matchesDateFilter } from '@/components/ui/DateRangeFilter';
import { CustomerRiskFavBadge } from '@/components/ui/CustomerRiskFavBadge';
import { RecordAdvancePaymentModal } from './RecordAdvancePaymentModal';

interface QuotationListProps {
  quotations: Quotation[];
  organizations: Organization[];
  isLoading: boolean;
  onCompileQuotation: () => void;
  onViewDetails: (q: Quotation) => void;
  onStartEdit: (q: Quotation) => void;
  onStartRevision?: (q: Quotation) => void;
  onDeleteCandidate: (q: Quotation) => void;
  onSubmitToOps?: (q: Quotation) => void;
  onSendToCustomer?: (q: Quotation, mode: 'final' | 'draft') => void; // final = Ops approved, draft = watermarked NOT APPROVED
  onSubmitToBm?: (q: Quotation) => void;
  onBmApprove?: (q: Quotation) => void;
  onBmReject?: (q: Quotation) => void;
  onViewPipeline?: (q: Quotation) => void; // status badge click: lead pipeline modal with quote logs
  currentUser?: any;
  onRefresh?: () => void;
  onPrintTrigger?: (triggerFn: () => void) => void;
  onUserReportTrigger?: (triggerFn: () => void) => void;
}

/**
 * "Revised / Revision Requested" filter: superseded originals, quotes the customer asked to revise,
 * and revision copies still in progress. An approved revision copy is left out (it is counted under Approved).
 */
function isInRevisedFilter(q: any): boolean {
  if (q.status === 'Revised' || q.status === 'Revision Requested') return true;
  const isRevisionCopy = Boolean(q.metrics_summary?.is_revision || q.metrics_summary?.revised_from_id);
  return isRevisionCopy && q.status !== 'Approved';
}

export default function QuotationList({
  quotations,
  organizations,
  isLoading,
  onCompileQuotation,
  onViewDetails,
  onStartEdit,
  onStartRevision,
  onDeleteCandidate,
  onSubmitToOps,
  onSendToCustomer,
  onSubmitToBm,
  onBmApprove,
  onBmReject,
  onViewPipeline,
  currentUser,
  onRefresh,
  onPrintTrigger,
  onUserReportTrigger,
}: QuotationListProps) {
  const router = useRouter();
  const userPermissions: string[] = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
  const userRole = (currentUser?.role || '').toLowerCase();
  const isAdmin = ['admin', 'super admin', 'superadmin', 'corporate'].includes(userRole) || userPermissions.includes('all');
  const isBranchManager = userRole === 'branch manager';
  const canApproveAsBm = isAdmin || isBranchManager || userPermissions.includes('submit_quotations_ops') || userPermissions.includes('corporate_approver');
  const canSubmitToBm = isAdmin || isBranchManager || userPermissions.includes('submit_quotations_bm') || userPermissions.includes('manage_quotations') || userPermissions.includes('branch_sales');

  const [activeFilter, setActiveFilter] = useState<'all' | 'drafts' | 'pending_bm' | 'bm_approved' | 'pending_ops' | 'ops_approved' | 'with_customer' | 'approved' | 'rejected' | 'revised'>('all');
  const [followUpQuotation, setFollowUpQuotation] = useState<Quotation | null>(null);
  const [advancePaymentQuotation, setAdvancePaymentQuotation] = useState<Quotation | null>(null);
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
          return q.status === 'Pending Branch Approval';
        case 'bm_approved':
          return q.status === 'BM Approved';
        case 'pending_ops':
          return q.status === 'Pending Ops Approval';
        case 'ops_approved':
          return q.status === 'Ops Approved';
        case 'with_customer':
          return q.status === 'Pending Customer Approval';
        case 'approved':
          return q.status === 'Approved';
        case 'rejected':
          return q.status === 'Rejected';
        case 'revised':
          return isInRevisedFilter(q);
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
      pending_bm: quotations.filter(q => q.status === 'Pending Branch Approval').length,
      bm_approved: quotations.filter(q => q.status === 'BM Approved').length,
      pending_ops: quotations.filter(q => q.status === 'Pending Ops Approval').length,
      ops_approved: quotations.filter(q => q.status === 'Ops Approved').length,
      with_customer: quotations.filter(q => q.status === 'Pending Customer Approval').length,
      approved: quotations.filter(q => q.status === 'Approved').length,
      rejected: quotations.filter(q => q.status === 'Rejected').length,
      revised: quotations.filter(isInRevisedFilter).length,
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
    // No relationship manager on the customer: the salesperson who created the quote
    const creator = (q as any).metrics_summary?.created_by_name;
    if (creator) return { name: creator, code: '' };
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
      header: 'DATE',
      className: 'w-[110px] whitespace-nowrap text-center',
      sortValue: (q) => q.quotation_date || q.created_at || '',
      accessor: (q) => (
        <span className="text-xs font-bold text-zinc-800 whitespace-nowrap block text-center">
          {formatDate(q.quotation_date || q.created_at)}
        </span>
      )
    },
    {
      header: 'QUOTATION NO.',
      className: 'w-[140px] whitespace-nowrap text-center align-middle',
      sortValue: (q) => q.quotation_no,
      accessor: (q) => (
        <span
          onClick={() => onViewDetails(q)}
          className="font-mono font-bold text-xs md:text-sm text-[#C82A2B] hover:text-[#801416] hover:underline block truncate text-center cursor-pointer transition-colors"
          title="Click to view quotation details"
        >
          {q.quotation_no}
        </span>
      )
    },
    {
      header: 'CUSTOMER NAME',
      className: 'min-w-[160px] max-w-[260px]',
      sortValue: (q) => q.organizations?.name || '',
      accessor: (q) => {
        const fullOrg = organizations?.find(o => 
          (q.organization_id && String(o.id) === String(q.organization_id)) ||
          (q.organizations?.id && String(o.id) === String(q.organizations.id)) ||
          (o.name && q.organizations?.name && o.name.toLowerCase().trim() === q.organizations.name.toLowerCase().trim())
        ) || (q.organizations as any);

        const isRisk = Boolean(
          (fullOrg as any)?.is_risk === true || (fullOrg as any)?.is_risk === 'true' || (fullOrg as any)?.is_risk === 1 ||
          (fullOrg as any)?.client_tag === 'risk' ||
          (q.organizations as any)?.is_risk === true || (q.organizations as any)?.is_risk === 'true' || (q.organizations as any)?.is_risk === 1 ||
          (q.organizations as any)?.client_tag === 'risk'
        );
        const isSpecial = Boolean(
          (fullOrg as any)?.is_special === true || (fullOrg as any)?.is_special === 'true' || (fullOrg as any)?.is_special === 1 ||
          (fullOrg as any)?.client_tag === 'special' ||
          (q.organizations as any)?.is_special === true || (q.organizations as any)?.is_special === 'true' || (q.organizations as any)?.is_special === 1 ||
          (q.organizations as any)?.client_tag === 'special'
        );
        const sector = fullOrg?.industries?.name || fullOrg?.industry || '';

        return (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 max-w-full">
              <p className="text-xs font-bold text-zinc-800 truncate" title={q.organizations?.name || fullOrg?.name || '—'}>
                {q.organizations?.name || fullOrg?.name || '—'}
              </p>
              <CustomerRiskFavBadge 
                isRisk={isRisk} 
                isSpecial={isSpecial} 
                clientTag={fullOrg?.client_tag || (q.organizations as any)?.client_tag}
                customer={fullOrg} 
                size={18} 
              />
            </div>
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
      className: 'w-[110px] whitespace-nowrap text-center',
      sortValue: (q) => {
        const fullOrg = organizations?.find(o => o.id === q.organization_id) || (q.organizations as any);
        return fullOrg?.zones?.name || '';
      },
      accessor: (q) => {
        const fullOrg = organizations?.find(o => o.id === q.organization_id) || (q.organizations as any);
        const zoneName = fullOrg?.zones?.name;
        return zoneName ? (
          <div className="text-xs font-medium text-zinc-700 truncate text-center" title={zoneName}>
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
      className: 'w-[175px] min-w-[160px] max-w-[185px] whitespace-nowrap text-left',
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

        const contactText = `${person ? formatContactPerson(person, title) : ''}${desig ? ` (${desig})` : ''}`;
        const fullTooltip = [contactText, ph].filter(Boolean).join(' • ');

        return (
          <div 
            className="flex flex-col items-start justify-center text-left min-w-0 w-[175px] max-w-[175px] overflow-hidden"
            title={fullTooltip}
          >
            {(person || desig) && (
              <span 
                className="text-xs font-bold text-zinc-800 truncate block w-full cursor-default" 
                title={contactText}
              >
                {person ? formatContactPerson(person, title) : ''}
                {desig && (
                  <span className="text-[10px] text-zinc-500 font-normal ml-1">({desig})</span>
                )}
              </span>
            )}
            {ph && (
              <div className="mt-0.5 truncate w-full" title={ph}>
                <ContactPhoneLink phone={ph} country={org?.country || 'India'} name={person || org?.name} />
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: 'SALES PERSON',
      className: 'min-w-[140px] whitespace-nowrap text-center align-middle',
      sortValue: (q) => getSalesPerson(q)?.name || '',
      accessor: (q) => {
        const sp = getSalesPerson(q);
        return sp ? (
          <div className="flex flex-col items-center justify-center text-center mx-auto min-w-0 max-w-[180px]">
            <p className="text-xs font-bold text-zinc-800 truncate block text-center" title={sp.name}>
              {sp.name}
            </p>
            {sp.code && (
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider truncate block text-center">
                {sp.code}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center">
            <span className="text-zinc-400 text-xs italic font-medium">Unassigned</span>
          </div>
        );
      }
    },
    {
      header: 'EXPECTED DATE',
      className: 'w-[125px] whitespace-nowrap text-center align-middle',
      sortValue: (q) => q.expected_delivery_date || '',
      accessor: (q) => (
        <div className="text-center">
          <p className="text-xs font-bold text-zinc-800 text-center">
            {q.expected_delivery_date ? formatDate(q.expected_delivery_date) : 'N/A'}
          </p>
        </div>
      )
    },
    {
      header: 'AMOUNT',
      className: 'w-[130px] whitespace-nowrap text-right',
      sortValue: (q) => Number(q.final_quote_value || 0),
      accessor: (q) => (
        <div className="text-right">
          <p className="text-xs md:text-sm font-black text-[#C82A2B] font-mono">
            ₹{Number(q.final_quote_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      )
    },
    {
      header: 'QUOTE STATUS',
      className: 'w-[145px] whitespace-nowrap text-center align-middle',
      sortValue: (q) => q.status,
      accessor: (q) => {
        const isRevision = Boolean(q.metrics_summary?.needs_revision);
        const statusText = q.status || 'Draft';

        let badge = (
          <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-zinc-100 text-zinc-700 border-zinc-200 shadow-2xs">
            {statusText}
          </span>
        );

        if (q.status === 'Draft') {
          badge = isRevision ? (
            <span 
              className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-rose-50 text-rose-700 border-rose-200 flex items-center justify-center gap-1 shadow-2xs"
              title={(q.metrics_summary?.returned_by === 'ops' ? q.metrics_summary?.ops_return_reason : q.metrics_summary?.bm_rejection_reason) ? `Feedback: ${q.metrics_summary?.returned_by === 'ops' ? q.metrics_summary?.ops_return_reason : q.metrics_summary?.bm_rejection_reason}` : 'Returned for revision'}
            >
              <AlertTriangle size={10} className="shrink-0 text-rose-600" />
              {q.metrics_summary?.returned_by === 'ops' ? 'Returned by Ops' : 'Returned by BM'}
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-zinc-100 text-zinc-700 border-zinc-200 shadow-2xs">
              Draft
            </span>
          );
        } else if (q.status === 'Pending Branch Approval') {
          badge = (
            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-amber-50 text-amber-800 border-amber-300 flex items-center justify-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              Waiting for BM
            </span>
          );
        } else if (q.status === 'BM Approved') {
          badge = (
            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center justify-center gap-1 shadow-2xs">
              <CheckCircle2 size={10} className="shrink-0 text-indigo-600" />
              BM Approved
            </span>
          );
        } else if (q.status === 'Pending Ops Approval') {
          badge = (
            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-orange-50 text-orange-800 border-orange-300 flex items-center justify-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shrink-0" />
              Waiting for Ops
            </span>
          );
        } else if (q.status === 'Ops Approved') {
          badge = (
            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-sky-50 text-sky-700 border-sky-200 flex items-center justify-center gap-1 shadow-2xs">
              <CheckCircle2 size={10} className="shrink-0 text-sky-600" />
              Ops Approved
            </span>
          );
        } else if (q.status === 'Pending Customer Approval') {
          badge = (
            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-violet-50 text-violet-700 border-violet-200 flex items-center justify-center gap-1 shadow-2xs" title={q.metrics_summary?.sent_to_customer_at ? `Sent ${formatDate(q.metrics_summary.sent_to_customer_at)}` : undefined}>
              <Clock size={10} className="shrink-0 text-violet-600" />
              With Customer
            </span>
          );
        } else if (q.status === 'Approved') {
          badge = (
            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center justify-center gap-1 shadow-2xs">
              <CheckCircle2 size={10} className="shrink-0 text-emerald-600" />
              Customer Approved
            </span>
          );
        } else if (q.status === 'Rejected') {
          badge = (
            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-rose-50 text-rose-700 border-rose-200 flex items-center justify-center gap-1 shadow-2xs">
              <XCircle size={10} className="shrink-0 text-rose-600" />
              Rejected
            </span>
          );
        } else if (q.status === 'Revision Requested') {
          badge = (
            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-purple-50 text-purple-700 border-purple-200 flex items-center justify-center gap-1 shadow-2xs">
              <RotateCcw size={10} className="shrink-0 text-purple-600" />
              Revision Requested
            </span>
          );
        } else if (q.status === 'Revised') {
          badge = (
            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-blue-50 text-blue-700 border-blue-200 flex items-center justify-center gap-1 shadow-2xs">
              Revised
            </span>
          );
        }

        return (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              if (onViewPipeline) onViewPipeline(q);
              else onViewDetails(q);
            }}
            className="flex items-center justify-center cursor-pointer group/status"
            title="Click to view the lead pipeline with all quotation logs"
          >
            <div className="transition-transform group-hover/status:scale-105">
              {badge}
            </div>
          </div>
        );
      }
    },
    {
      header: 'NEXT STEP',
      className: 'w-[155px] min-w-[145px] whitespace-nowrap text-center align-middle',
      sortable: false,
      accessor: (q) => {
        // Before BM + Ops approval: share a watermarked draft, or log the customer's reply as a manual note
        const draftTools = (
          <span className="inline-flex items-center gap-1">
            {onSendToCustomer && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onSendToCustomer(q, 'draft'); }}
                className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white hover:bg-[#FFF1F1] text-[#C82A2B] border border-[#C82A2B]/30 cursor-pointer"
                title="Send draft to customer (watermarked NOT APPROVED)"
                aria-label="Send draft to customer"
              >
                <FileWarning size={11} />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFollowUpQuotation(q); }}
              className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200 cursor-pointer"
              title="Log customer response (manual note, status unchanged until approved)"
              aria-label="Log customer response"
            >
              <MessageSquare size={11} />
            </button>
          </span>
        );

        const isBmForThisQuote = isAdmin || !currentUser?.branchId || String(q.branch_id || (q.organizations as any)?.branch_id || '') === String(currentUser.branchId);
        const canDirectApprove = canApproveAsBm && isBmForThisQuote;

        if (q.status === 'Draft') {
          return canSubmitToBm && onSubmitToBm ? (
            <div className="flex items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSubmitToBm(q);
                }}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-[#C82A2B] hover:bg-[#A81D1E] text-white shadow-2xs transition-all active:scale-95 cursor-pointer mx-auto"
                title="Submit quotation to Branch Manager for approval"
              >
                <Send size={10} />
                <span>Send to BM</span>
              </button>
              {draftTools}
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEdit(q);
                }}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-[#C82A2B] hover:bg-[#A81D1E] text-white shadow-2xs transition-all active:scale-95 cursor-pointer mx-auto"
              >
                <Edit3 size={10} />
                <span>Edit</span>
              </button>
            </div>
          );
        }

        if (q.status === 'Pending Branch Approval') {
          return canDirectApprove ? (
            <div className="flex items-center justify-center gap-1.5 mx-auto">
              {onBmApprove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBmApprove(q);
                  }}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-[#C82A2B] hover:bg-[#A81D1E] text-white shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="Approve as Branch Manager"
                >
                  <Check size={10} strokeWidth={3} />
                  <span>Approve</span>
                </button>
              )}
              {onBmReject && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBmReject(q);
                  }}
                  className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-white hover:bg-[#FFF1F1] text-[#C82A2B] border border-[#C82A2B]/30 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="Request revision with notes back to Draft"
                >
                  <RotateCcw size={10} />
                  <span>Revise</span>
                </button>
              )}
            </div>
          ) : (
            <div className="text-center">
              <span className="text-[10px] font-bold text-zinc-400 italic mr-1.5">Waiting for BM</span>
              {draftTools}
            </div>
          );
        }

        if (q.status === 'BM Approved') {
          return (
            <div className="flex items-center justify-center gap-1.5">
              {onSubmitToOps && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSubmitToOps(q); }}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-[#C82A2B] hover:bg-[#A81D1E] text-white shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="BM approved. Send to the Ops team for approval"
                >
                  <Send size={10} />
                  <span>Send to Ops</span>
                </button>
              )}
              {draftTools}
            </div>
          );
        }

        if (q.status === 'Pending Ops Approval') {
          return (
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[10px] font-bold text-zinc-400 italic mr-1.5">With Ops</span>
              {draftTools}
            </div>
          );
        }

        if (q.status === 'Ops Approved') {
          return onSendToCustomer ? (
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onSendToCustomer(q, 'final'); }}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-[#C82A2B] hover:bg-[#A81D1E] text-white shadow-2xs transition-all active:scale-95 cursor-pointer mx-auto"
                title="Ops approved. Send the proposal to the customer"
              >
                <Send size={10} />
                <span>Send to Customer</span>
              </button>
            </div>
          ) : null;
        }

        if (q.status === 'Pending Customer Approval') {
          return (
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFollowUpQuotation(q); }}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-[#C82A2B] hover:bg-[#A81D1E] text-white shadow-2xs transition-all active:scale-95 cursor-pointer mx-auto"
                title="Log the customer's response (Approved, Held, Revision, Rejected)"
              >
                <MessageSquare size={10} />
                <span>Log Response</span>
              </button>
            </div>
          );
        }

        if (q.status === 'Approved') {
          const paid = parseFloat(String(q.paid_amount || 0));
          return paid <= 0 ? (
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAdvancePaymentQuotation(q);
                }}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-[#C82A2B] hover:bg-[#A81D1E] text-white shadow-2xs transition-all active:scale-95 cursor-pointer mx-auto"
                title="Record Advance Payment for this approved quotation"
              >
                <CreditCard size={10} />
                <span>Advance Payment</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mx-auto">
                Adv: ₹{paid.toLocaleString('en-IN')}
              </span>
            </div>
          );
        }

        if (q.status === 'Rejected' || q.status === 'Revision Requested') {
          return (
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onStartRevision) {
                    onStartRevision(q);
                  } else {
                    onStartEdit(q);
                  }
                }}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-[#C82A2B] hover:bg-[#A81D1E] text-white shadow-2xs transition-all cursor-pointer mx-auto"
                title="Create a revised quotation proposal"
              >
                <Edit3 size={10} />
                <span>Revise Quote</span>
              </button>
            </div>
          );
        }

        // Revised (or any other final state): no next step
        const supersededBy = q.metrics_summary?.revised_to_quotation_no;
        return (
          <div className="flex items-center justify-center text-center">
            <span className="text-[10px] font-bold text-zinc-400 italic">
              {q.status === 'Revised' && supersededBy ? `Superseded by ${supersededBy}` : '—'}
            </span>
          </div>
        );
      }
    }
  ];

  const handlePrintQuotations = useCallback((sortedData?: Quotation[], sortInfo?: SortInfo<Quotation>) => {
    const dataToPrint = (sortedData && sortedData.length > 0) ? sortedData : filteredQuotations;
    const printedAt = formatDate(new Date(), true);

    const activeBranchName = selectedBranch === 'ALL'
      ? 'All Branches'
      : branches.find(b => String(b.id) === selectedBranch)?.name || `Branch #${selectedBranch}`;

    const rowsHtml = dataToPrint.map((q, idx) => {
      const fullOrg = organizations?.find(o => o.id === q.organization_id) || (q.organizations as any);
      const sector = fullOrg?.industries?.name || fullOrg?.industry || '';
      const zoneName = fullOrg?.zones?.name || '—';
      const person = formatContactPerson(fullOrg?.contact_person, fullOrg?.contact_title);
      const desig = fullOrg?.contact_designation;
      const phone = (fullOrg?.contact_number || fullOrg?.phone) ? formatPhoneNumber(fullOrg?.contact_number || fullOrg?.phone, fullOrg?.country || 'India') : '—';
      const sp = getSalesPerson(q)?.name || 'Unassigned';

      return `
      <tr>
        <td style="text-align: center; color: #718096; font-size: 10px;">${idx + 1}</td>
        <td style="font-size: 10px; font-weight: 700; color: #1a202c; text-align: center; vertical-align: middle;">${formatDate(q.quotation_date || q.created_at)}</td>
        <td style="font-family: monospace; font-weight: bold; color: #C82A2B; white-space: nowrap; text-align: center; vertical-align: middle;">${q.quotation_no}</td>
        <td style="font-weight: 800; color: #1a202c; font-size: 11px;">
          <div>${q.organizations?.name || '—'}</div>
          ${sector ? `<div style="font-size: 8px; color: #9E1B1D; font-weight: bold; text-transform: uppercase;">${sector}</div>` : ''}
        </td>
        <td style="font-size: 10px; color: #4a5568; text-align: center;">${zoneName}</td>
        <td style="font-size: 10px; color: #4a5568;">
          <div style="font-weight: 700;">${person}</div>
          ${desig ? `<div style="font-size: 8px; color: #a0aec0;">${desig}</div>` : ''}
          ${phone !== '—' ? `<div style="font-family: monospace; font-size: 9px; color: #718096; margin-top: 2px;">${phone}</div>` : ''}
        </td>
        <td style="font-size: 10px; color: #4a5568;">${sp}</td>
        <td style="font-size: 10px; font-weight: 700; color: #1a202c; text-align: center; vertical-align: middle;">${q.expected_delivery_date ? formatDate(q.expected_delivery_date) : 'N/A'}</td>
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
    .report-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #C82A2B; padding-bottom: 14px; margin-bottom: 14px; }
    .brand-title { font-size: 22px; font-weight: 900; color: #1a202c; }
    .brand-subtitle { font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: #C82A2B; font-weight: 800; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 9px; text-transform: uppercase; font-weight: 800; color: #1a202c; }
    td { border: 1px solid #e2e8f0; padding: 6px 10px; }
    tr:nth-child(even) { background: #f8fafc; }
  </style>
</head>
<body>
  <div class="report-header">
    <div>
      <div class="brand-title">FORMA APPARELS</div>
      <div class="brand-subtitle">Central Manufacturing & Institutional Distribution</div>
      <div style="font-size: 14px; font-weight: 800; color: #C82A2B; margin-top: 6px;">Quotations Registry Report</div>
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
        <th style="text-align: center; vertical-align: middle;">DATE</th>
        <th style="text-align: center; vertical-align: middle;">QUOTATION NO.</th>
        <th style="text-align: left;">CUSTOMER NAME</th>
        <th style="text-align: center;">ZONE</th>
        <th style="text-align: left;">CONTACT</th>
        <th>SALES PERSON</th>
        <th style="text-align: center; vertical-align: middle;">EXPECTED DATE</th>
        <th style="text-align: right;">AMOUNT</th>
        <th style="text-align: center;">QUOTE STATUS</th>
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
                { label: 'Drafts Only', value: 'drafts', badge: counts.drafts },
                { label: "Waiting for BM's Approval", value: 'pending_bm', badge: counts.pending_bm },
                { label: 'BM Approved (send to Ops)', value: 'bm_approved', badge: counts.bm_approved },
                { label: 'Waiting for Ops', value: 'pending_ops', badge: counts.pending_ops },
                { label: 'Ops Approved (send to customer)', value: 'ops_approved', badge: counts.ops_approved },
                { label: 'Pending Customer Approval', value: 'with_customer', badge: counts.with_customer },
                { label: 'Customer Approved Quotes', value: 'approved', badge: counts.approved },
                { label: 'Rejected Quotes', value: 'rejected', badge: counts.rejected },
                { label: 'Revised / Revision Requested', value: 'revised', badge: counts.revised }
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

      {followUpQuotation && !(followUpQuotation.status === 'Approved' && parseFloat(String(followUpQuotation.paid_amount || 0)) > 0) && (
        <QuotationFollowUpModal
          quotation={followUpQuotation}
          allQuotations={quotations}
          currentUser={currentUser}
          onStartEdit={onStartEdit}
          onStartRevision={onStartRevision}
          onRecordPayment={(q) => setAdvancePaymentQuotation(q)}
          onClose={() => setFollowUpQuotation(null)}
          onSuccess={() => {
            setFollowUpQuotation(null);
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {advancePaymentQuotation && (
        <RecordAdvancePaymentModal
          quotation={advancePaymentQuotation}
          isOpen={Boolean(advancePaymentQuotation)}
          onClose={() => setAdvancePaymentQuotation(null)}
          onSuccess={() => {
            setAdvancePaymentQuotation(null);
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
  onStartEdit?: (q: Quotation) => void;
  onStartRevision?: (q: Quotation) => void;
  onRecordPayment?: (q: Quotation) => void;
}

export const QuotationFollowUpModal: React.FC<QuotationFollowUpModalProps> = ({
  quotation,
  onClose,
  onSuccess,
  currentUser,
  onStartEdit,
  onStartRevision
}) => {
  const [responseType, setResponseType] = useState<'rejected' | 'held' | 'approved' | 'revision_requested'>('held');
  const [remarks, setRemarks] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEditRevise = (qToEdit: Quotation) => {
    onClose();
    if (onStartRevision) {
      onStartRevision(qToEdit);
    } else if (onStartEdit) {
      onStartEdit(qToEdit);
    } else {
      window.location.href = `/marketing/quotations?id=${qToEdit.id}&action=revise`;
    }
  };


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
    const isRevReq = responseType === 'revision_requested';
    // "held" = customer undecided: logged as a follow-up, the status stays Pending Customer Approval
    const targetStatus = responseType === 'rejected'
      ? 'Rejected'
      : responseType === 'held'
      ? (quotation.status || 'Pending Customer Approval')
      : isRevReq
      ? 'Revision Requested'
      : 'Approved';
    const toastId = toast.loading(responseType === 'held' ? 'Logging as Held...' : `Saving quotation follow-up as ${targetStatus}...`);

    try {
      const res = await api.post(`/quotations/${quotation.id}/follow-up`, {
        outcome: responseType,
        response_type: responseType,
        status: targetStatus,
        remarks: remarks.trim(),
        text: remarks.trim(),
        next_followup_date: nextFollowUpDate || null
      });

      toast.success(responseType === 'held' ? 'Logged as Held' : (res.data?.message || `Quotation marked as ${targetStatus}!`), { id: toastId });
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save the customer response', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (quotation.status === 'Approved' && parseFloat(String(quotation.paid_amount || 0)) > 0) {
    return null;
  }

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
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border flex items-center gap-1 ${
                quotation.status === 'Approved'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : quotation.status === 'Rejected'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-zinc-100 text-zinc-700 border-zinc-200'
              }`}>
                {quotation.status === 'Approved' ? (
                  <>
                    <CheckCircle2 size={11} className="text-emerald-600" />
                    <span>Approved</span>
                  </>
                ) : quotation.status === 'Rejected' ? (
                  <>
                    <XCircle size={11} className="text-rose-600" />
                    <span>Rejected</span>
                  </>
                ) : (
                  quotation.status || 'Draft'
                )}
              </span>
              <button
                type="button"
                onClick={() => openQuotationTab(quotation.id, quotation.quotation_no)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#C82A2B] bg-[#FFF1F1] hover:bg-[#FFF1F1] border border-[#C82A2B]/20 transition-all cursor-pointer"
                title="Open this quotation in a new browser tab"
              >
                <span>Open Quote in New Tab</span>
                <ExternalLink size={10} className="shrink-0" />
              </button>
            </div>
            <h3 className="text-xl font-black text-zinc-900 tracking-tight">
              Log Customer Response
            </h3>
            <p className="text-xs text-zinc-500 font-medium">
              Client: <span className="text-zinc-900 font-bold">{quotation.organizations?.name || 'Commercial Client'}</span>
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

        {/* Modal Body */}
        <div className="space-y-5 overflow-y-auto pr-1 flex-1">
            <div className="space-y-4">
              {/* Outcome Selection: 4 Options (Approved, Held, Revision Requested, Rejected). Held is a log outcome only, not a status */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                  Customer Decision / Outcome *
                </label>
                {quotation.status !== 'Pending Customer Approval' && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-medium">
                    This quote is not yet approved by the BM and Ops ({quotation.status || 'Draft'}). The response is saved as a manual log and the status stays as it is.
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Approved */}
                  <button
                    type="button"
                    onClick={() => setResponseType('approved')}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      responseType === 'approved'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm ring-2 ring-emerald-500/20'
                        : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 bg-zinc-50/50'
                    }`}
                  >
                    <span className="text-xs font-black block flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                      Approved
                    </span>
                    <span className="text-[10px] text-emerald-700/85 font-medium mt-1 block">
                      Customer confirmed quote
                    </span>
                  </button>

                  {/* Held: logged outcome only, status unchanged */}
                  <button
                    type="button"
                    onClick={() => setResponseType('held')}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      responseType === 'held'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm ring-2 ring-amber-500/20'
                        : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 bg-zinc-50/50'
                    }`}
                  >
                    <span className="text-xs font-black block flex items-center gap-1.5 text-amber-700">
                      <Clock size={15} className="text-amber-600 shrink-0" />
                      Held
                    </span>
                    <span className="text-[10px] text-amber-700/85 font-medium mt-1 block">
                      Decision pending
                    </span>
                  </button>

                  {/* Revision Requested */}
                  <button
                    type="button"
                    onClick={() => setResponseType('revision_requested')}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      responseType === 'revision_requested'
                        ? 'border-purple-500 bg-purple-50 text-purple-900 shadow-sm ring-2 ring-purple-500/20'
                        : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 bg-zinc-50/50'
                    }`}
                  >
                    <span className="text-xs font-black block flex items-center gap-1.5 text-purple-700">
                      <RotateCcw size={15} className="text-purple-600 shrink-0" />
                      Revise Quote
                    </span>
                    <span className="text-[10px] text-purple-700/85 font-medium mt-1 block">
                      Revision requested
                    </span>
                  </button>

                  {/* Rejected */}
                  <button
                    type="button"
                    onClick={() => setResponseType('rejected')}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      responseType === 'rejected'
                        ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-sm ring-2 ring-rose-500/20'
                        : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 bg-zinc-50/50'
                    }`}
                  >
                    <span className="text-xs font-black block flex items-center gap-1.5 text-rose-700">
                      <XCircle size={15} className="text-rose-600 shrink-0" />
                      Rejected
                    </span>
                    <span className="text-[10px] text-rose-700/85 font-medium mt-1 block">
                      Customer rejected
                    </span>
                  </button>
                </div>

                {responseType === 'revision_requested' && (
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <RotateCcw size={15} className="text-purple-600 shrink-0" />
                      <span>Customer requested revisions. Both initial and revised quotes will remain viewable in logs.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEditRevise(quotation)}
                      className="px-3 py-1.5 rounded-xl bg-[#C82A2B] hover:bg-[#A81D1E] text-white font-black text-[10px] uppercase tracking-wider shrink-0 cursor-pointer shadow-xs"
                    >
                      Create Revised Quote &rarr;
                    </button>
                  </div>
                )}
                {responseType === 'rejected' && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-center gap-2 animate-in fade-in">
                    <AlertCircle size={14} className="text-rose-600 shrink-0" />
                    <span>Quotation will be marked as Rejected. You can directly edit and revise the quote.</span>
                  </div>
                )}
                {responseType === 'held' && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2 animate-in fade-in">
                    <Clock size={14} className="text-amber-600 shrink-0" />
                    <span>Logged as Held. The quote status stays Pending Customer Approval; set a next follow-up date below.</span>
                  </div>
                )}
                {responseType === 'approved' && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>Quotation will be marked as Approved and advance forward in the pipeline.</span>
                  </div>
                )}
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

            <Button
              disabled={isSubmitting}
              onClick={handleSubmit}
              className={`flex-1 py-3 text-[10px] font-black uppercase text-white shadow-lg transition-all ${
                responseType === 'approved'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : responseType === 'rejected'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  : responseType === 'revision_requested'
                  ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
                  : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
              }`}
            >
              {isSubmitting
                ? 'Saving...'
                : responseType === 'rejected'
                ? 'Mark as Rejected & Save'
                : responseType === 'approved'
                ? 'Mark as Approved & Save'
                : responseType === 'revision_requested'
                ? 'Record Revision Request & Save'
                : 'Log as Held & Save'}
            </Button>
        </div>
      </div>
    </div>
  );
};
