'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import {
  Building2,
  MapPin,
  Users,
  Calendar,
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Key,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Package,
  Download,
  FileUp,
  UserPlus,
  X,
  Grid,
  User,
  Clipboard,
  UserCheck,
  LogIn,
  ArrowRight,
  Ruler,
  ReceiptText,
  Printer,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Phone,
  Mail,
  Truck,
  Clock,
  FileText,
  Boxes,
  ShoppingBag,
  BookOpen,
  TrendingDown,
  Wallet,
  IndianRupee,
  Receipt,
  FileCheck,
  Eye,
  Layers,
  Target,
  MessageSquarePlus,
  AlertTriangle,
  MoreVertical,
  MoreHorizontal,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { FilterDropdown } from '@/components/ui/FilterDropdown';
import { DynamicForm, FormField } from '@/components/ui/DynamicForm';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CredentialsModal } from '@/components/ui/CredentialsModal';
import { CustomerFormModal } from '@/components/entities/CustomerFormModal';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { DateRangeFilter, DateFilterValue, matchesDateFilter } from '@/components/ui/DateRangeFilter';
import { MemberProfileModal } from '@/components/entities/MemberProfileModal';
import * as XLSX from 'xlsx';
import { formatDate } from '@/lib/formatters';
import ProFormaInvoiceModal from '@/components/documents/ProFormaInvoiceModal';
import TaxInvoiceModal from '@/components/documents/TaxInvoiceModal';
import QuotationDetails from '@/app/(dashboard)/marketing/quotations/_components/QuotationDetails';
import CustomJournalModal from '@/components/finance/CustomJournalModal';
import { formatDocumentNumber } from '@/lib/documentNumberGenerator';

interface Organization {
  id: number;
  branch_id?: number | string | null;
  customer_code: string | null;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  contact_number?: string | null;
  email?: string | null;
  contact_email?: string | null;
  address: string;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  industry_id: number;
  industries?: { name: string };
  relationship_manager_id: number | null;
  relationship_manager?: { id: number; full_name: string; employee_id: string } | null;
  assigned_operator_id: number | null;
  assigned_operator?: { id: number; full_name: string; employee_id: string } | null;
  is_active?: boolean | null;
  is_special?: boolean | null;
  is_risk?: boolean | null;
  client_tag?: string | null;
  receivables?: number | null;
  credits?: number | null;
  created_at: string;
  category?: string;
  type?: string;
  gst_number?: string | null;
  pan_number?: string | null;
  legal_name?: string | null;
  delivery_address?: string | null;
  delivery_city?: string | null;
  delivery_state?: string | null;
  delivery_pincode?: string | null;
  delivery_country?: string | null;
  is_b2b?: boolean | null;
  credit_period_days?: number | null;
}

interface LedgerTransaction {
  id: string | number;
  date: string;
  type: string;
  reference_no: string;
  description: string;
  order_ref: string;
  debit: number;
  credit: number;
  running_balance: number;
  status: string;
  sale_type?: string;
  credit_period_days?: number;
  due_date?: string;
  due_status?: string;
  due_label?: string;
  is_due_today?: boolean;
  is_overdue?: boolean;
}

const MultiEntryInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}> = ({ value = '', onChange, placeholder = 'Add section...' }) => {
  const [inputValue, setInputValue] = useState('');

  const items = value
    ? value.split(',').map(item => item.trim()).filter(Boolean)
    : [];

  const handleAdd = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    if (items.includes(trimmed)) {
      toast.error('This item already exists in the list');
      return;
    }

    const updated = [...items, trimmed];
    onChange(updated.join(', '));
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (indexToRemove: number) => {
    const updated = items.filter((_, idx) => idx !== indexToRemove);
    onChange(updated.join(', '));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 h-11 bg-white border border-zinc-200 rounded-xl px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-[#C82A2B]/20 focus:border-[#C82A2B] text-zinc-800"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-5 h-11 rounded-xl bg-[#C82A2B] hover:bg-[#A81D1E] text-white font-black uppercase tracking-wider text-[10px] flex items-center justify-center transition-all active:scale-95 shadow-md shadow-[#C82A2B]/20 cursor-pointer border-none outline-none"
        >
          Add
        </button>
      </div>

      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2 p-3 bg-zinc-50/50 rounded-2xl border border-zinc-150/50 min-h-12 items-center">
          {items.map((item, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 shadow-sm animate-in zoom-in-95 duration-200"
            >
              {item}
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-50 hover:text-red-500 text-zinc-450 transition-colors cursor-pointer border-none outline-none font-bold text-[10px]"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-zinc-400 font-bold italic ml-1">
          No divisions/sections added yet.
        </p>
      )}
    </div>
  );
};

function OrganizationDetailsPageContent() {
  const params = useParams();
  const router = useRouter();
  const orgIdStr = params.id as string;
  const orgId = parseInt(orgIdStr, 10);

  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'transactions' | 'ledger'>(
    initialTab === 'ledger' 
      ? 'ledger' 
      : (initialTab === 'transactions' || initialTab === 'quotations') 
      ? 'transactions' 
      : (initialTab === 'departments' || initialTab === 'entities')
      ? 'departments'
      : 'overview'
  );
  const [selectedDepartmentForMembers, setSelectedDepartmentForMembers] = useState<any | null>(null);

  // Transaction Sub-Tabs (9 categories: Quotes, customer payments, sales orders, packages, shipments, invoices, expenses, journals, pro forma invoice)
  type TransactionSubTab =
    | 'quotes'
    | 'customer_payments'
    | 'sales_orders'
    | 'packages'
    | 'shipments'
    | 'invoices'
    | 'expenses'
    | 'journals'
    | 'pro_forma_invoice';

  const [transactionSubTab, setTransactionSubTab] = useState<TransactionSubTab>('quotes');
  const [deliveryChallans, setDeliveryChallans] = useState<any[]>([]);
  const [isLoadingChallans, setIsLoadingChallans] = useState(false);
  const [selectedProForma, setSelectedProForma] = useState<any | null>(null);
  const [isProFormaModalOpen, setIsProFormaModalOpen] = useState(false);
  const [isCreateProformaModalOpen, setIsCreateProformaModalOpen] = useState(false);
  const [selectedQuoteIdForProforma, setSelectedQuoteIdForProforma] = useState<string>('');

  const handleOpenProforma = (pi: any) => {
    setSelectedProForma({
      ...pi,
      customer: {
        name: org?.name,
        address: org?.address,
        city: org?.city,
        state: org?.state,
        pincode: org?.pincode,
        country: org?.country || 'India',
        gst_number: org?.gst_number,
        contact_person: org?.contact_person || (orgDetails?.staff?.[0]?.name),
        phone: org?.phone,
        email: org?.email
      }
    });
    setIsProFormaModalOpen(true);
  };
  const [selectedTaxInvoice, setSelectedTaxInvoice] = useState<any | null>(null);
  const [isTaxInvoiceModalOpen, setIsTaxInvoiceModalOpen] = useState(false);
  const [selectedQuoteForModal, setSelectedQuoteForModal] = useState<any | null>(null);
  const [isLoadingQuoteModal, setIsLoadingQuoteModal] = useState(false);

  const handleOpenQuoteModal = async (quoteId: number | string) => {
    setIsLoadingQuoteModal(true);
    const loadingToast = toast.loading('Loading quotation details...');
    try {
      const res = await api.get(`/quotations/${quoteId}`);
      setSelectedQuoteForModal(res.data);
      toast.dismiss(loadingToast);
    } catch (err) {
      console.error('Failed to load quotation details', err);
      toast.error('Failed to load quotation details', { id: loadingToast });
    } finally {
      setIsLoadingQuoteModal(false);
    }
  };

  // Customer Ledger States (Phase 1 Option B)
  const [ledgerData, setLedgerData] = useState<any | null>(null);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'invoices' | 'payments'>('all');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Linked Lead & Customer Lifecycle Journal States
  const [linkedLead, setLinkedLead] = useState<any | null>(null);
  const [leadStageHistory, setLeadStageHistory] = useState<any[]>([]);
  const [leadActivities, setLeadActivities] = useState<any[]>([]);
  const [journalCategoryFilter, setJournalCategoryFilter] = useState<string>('ALL');
  const [isAddJournalModalOpen, setIsAddJournalModalOpen] = useState(false);

  // Quick Customer Payment Modal State (supports Quotation or Invoice targets)
  const [isQuickPaymentModalOpen, setIsQuickPaymentModalOpen] = useState(false);
  const [paymentTargetType, setPaymentTargetType] = useState<'quotation' | 'invoice'>('quotation');
  const [paymentQuoteId, setPaymentQuoteId] = useState<string>('');
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const [paymentReferenceNo, setPaymentReferenceNo] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);
  const [customJournals, setCustomJournals] = useState<any[]>([]);

  const fetchCustomJournals = async () => {
    if (!orgId) return;
    try {
      const res = await api.get(`/organizations/${orgId}/journals`);
      if (res.data?.success && Array.isArray(res.data?.journals)) {
        setCustomJournals(res.data.journals);
        try {
          localStorage.setItem(`custom_journals_${orgId}`, JSON.stringify(res.data.journals));
        } catch (e) {}
        return;
      }
    } catch (e) {
      console.warn('Backend journals table not yet populated, falling back to local store');
    }
    // Fallback to localStorage only if API failed
    try {
      const saved = localStorage.getItem(`custom_journals_${orgId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Strictly only manual journals custom added through the Journal tab
          const customOnly = parsed.filter((j: any) =>
            !j.id?.toString().startsWith('JN-INV-') &&
            !j.id?.toString().startsWith('JN-PAY-') &&
            j.category !== 'Sales Invoice' &&
            j.category !== 'Customer Payment'
          );
          setCustomJournals(customOnly);
        }
      } else {
        setCustomJournals([]);
      }
    } catch (e) {
      setCustomJournals([]);
    }
  };

  useEffect(() => {
    fetchCustomJournals();
  }, [orgId]);

  const handleOpenQuickPaymentModal = (preferredType?: 'quotation' | 'invoice' | React.MouseEvent, targetId?: string | number) => {
    const chosenType: 'quotation' | 'invoice' | undefined = (preferredType === 'quotation' || preferredType === 'invoice') ? preferredType : undefined;
    let resolvedType: 'quotation' | 'invoice' = chosenType || (customerQuotes.length > 0 ? 'quotation' : (customerInvoices.length > 0 ? 'invoice' : 'quotation'));

    if (resolvedType === 'invoice') {
      setPaymentTargetType('invoice');
      let targetInv: any = null;
      if (targetId) {
        targetInv = customerInvoices.find((inv: any) => String(inv.id) === String(targetId));
      }
      if (!targetInv) {
        targetInv = customerInvoices.find((inv: any) => {
          const tot = parseFloat(String(inv.total_amount || 0));
          const pd = parseFloat(String(inv.paid_amount || 0));
          return tot - pd > 0;
        }) || customerInvoices[0];
      }

      if (targetInv) {
        setPaymentInvoiceId(String(targetInv.id));
        setPaymentQuoteId('');
        const tot = parseFloat(String(targetInv.total_amount || 0));
        const pd = parseFloat(String(targetInv.paid_amount || 0));
        const due = Math.max(0, tot - pd);
        setPaymentAmount(due > 0 ? String(due) : (tot > 0 ? String(tot) : ''));
        setPaymentNotes(`Payment for Invoice #${targetInv.invoice_no || targetInv.invoice_number || targetInv.id}`);
      } else {
        setPaymentInvoiceId('');
        setPaymentQuoteId('');
        setPaymentAmount('');
        setPaymentNotes('');
      }
    } else {
      setPaymentTargetType('quotation');
      let targetQuote: any = null;
      if (targetId) {
        targetQuote = customerQuotes.find((q: any) => String(q.id) === String(targetId));
      }
      if (!targetQuote) {
        targetQuote = customerQuotes.find((q: any) => {
          const total = parseFloat(q.final_quote_value || '0');
          const paid = parseFloat(q.paid_amount || '0');
          return total - paid > 0;
        }) || customerQuotes[0];
      }

      if (targetQuote) {
        setPaymentQuoteId(String(targetQuote.id));
        setPaymentInvoiceId('');
        const total = parseFloat(targetQuote.final_quote_value || '0');
        const paid = parseFloat(targetQuote.paid_amount || '0');
        const due = Math.max(0, total - paid);
        setPaymentAmount(due > 0 ? String(due) : (total > 0 ? String(total) : ''));
        setPaymentNotes(`Settlement payment for Quotation #${targetQuote.quotation_no || targetQuote.id}`);
      } else {
        setPaymentQuoteId('');
        setPaymentInvoiceId('');
        setPaymentAmount('');
        setPaymentNotes('');
      }
    }

    setPaymentMethod('Bank Transfer');
    setPaymentReferenceNo('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setIsQuickPaymentModalOpen(true);
  };

  const handleTargetTypeChange = (type: 'quotation' | 'invoice') => {
    setPaymentTargetType(type);
    if (type === 'invoice') {
      const invWithDue = customerInvoices.find((inv: any) => {
        const tot = parseFloat(String(inv.total_amount || 0));
        const pd = parseFloat(String(inv.paid_amount || 0));
        return tot - pd > 0;
      }) || customerInvoices[0];

      if (invWithDue) {
        setPaymentInvoiceId(String(invWithDue.id));
        setPaymentQuoteId('');
        const tot = parseFloat(String(invWithDue.total_amount || 0));
        const pd = parseFloat(String(invWithDue.paid_amount || 0));
        const due = Math.max(0, tot - pd);
        setPaymentAmount(due > 0 ? String(due) : (tot > 0 ? String(tot) : ''));
        setPaymentNotes(`Payment for Invoice #${invWithDue.invoice_no || invWithDue.invoice_number || invWithDue.id}`);
      } else {
        setPaymentInvoiceId('');
        setPaymentAmount('');
      }
    } else {
      const quoteWithDue = customerQuotes.find((q: any) => {
        const total = parseFloat(q.final_quote_value || '0');
        const paid = parseFloat(q.paid_amount || '0');
        return total - paid > 0;
      }) || customerQuotes[0];

      if (quoteWithDue) {
        setPaymentQuoteId(String(quoteWithDue.id));
        setPaymentInvoiceId('');
        const total = parseFloat(quoteWithDue.final_quote_value || '0');
        const paid = parseFloat(quoteWithDue.paid_amount || '0');
        const due = Math.max(0, total - paid);
        setPaymentAmount(due > 0 ? String(due) : (total > 0 ? String(total) : ''));
        setPaymentNotes(`Settlement payment for Quotation #${quoteWithDue.quotation_no || quoteWithDue.id}`);
      } else {
        setPaymentQuoteId('');
        setPaymentAmount('');
      }
    }
  };

  const handleQuoteSelectionChange = (quoteIdStr: string) => {
    setPaymentQuoteId(quoteIdStr);
    const selected = customerQuotes.find((q: any) => String(q.id) === quoteIdStr);
    if (selected) {
      const total = parseFloat(selected.final_quote_value || '0');
      const paid = parseFloat(selected.paid_amount || '0');
      const due = Math.max(0, total - paid);
      setPaymentAmount(due > 0 ? String(due) : (total > 0 ? String(total) : ''));
      setPaymentNotes(`Settlement payment for Quotation #${selected.quotation_no || selected.id}`);
    }
  };

  const handleInvoiceSelectionChange = (invIdStr: string) => {
    setPaymentInvoiceId(invIdStr);
    const selected = customerInvoices.find((inv: any) => String(inv.id) === invIdStr);
    if (selected) {
      const tot = parseFloat(String(selected.total_amount || 0));
      const pd = parseFloat(String(selected.paid_amount || 0));
      const due = Math.max(0, tot - pd);
      setPaymentAmount(due > 0 ? String(due) : (tot > 0 ? String(tot) : ''));
      setPaymentNotes(`Payment for Invoice #${selected.invoice_no || selected.invoice_number || selected.id}`);
    }
  };

  const handleSubmitQuickPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentTargetType === 'quotation' && !paymentQuoteId) {
      toast.error('Please select an existing quotation to allocate this payment.');
      return;
    }
    if (paymentTargetType === 'invoice' && !paymentInvoiceId) {
      toast.error('Please select an existing invoice to allocate this payment.');
      return;
    }

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid payment amount greater than zero.');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const payload: any = {
        amount: amt,
        payment_method: paymentMethod,
        reference_no: paymentReferenceNo.trim(),
        notes: paymentNotes.trim(),
        paid_at: new Date(paymentDate).toISOString(),
        target_type: paymentTargetType
      };

      if (paymentTargetType === 'quotation') {
        payload.quotation_id = parseInt(paymentQuoteId, 10);
      } else {
        payload.invoice_id = parseInt(paymentInvoiceId, 10);
      }

      await api.post('/payments', payload);

      const targetLabel = paymentTargetType === 'quotation'
        ? `Quotation #${customerQuotes.find((q: any) => String(q.id) === paymentQuoteId)?.quotation_no || paymentQuoteId}`
        : `Invoice #${customerInvoices.find((i: any) => String(i.id) === paymentInvoiceId)?.invoice_no || paymentInvoiceId}`;

      toast.success(`Payment of ₹${amt.toLocaleString('en-IN')} recorded successfully against ${targetLabel}!`);
      setIsQuickPaymentModalOpen(false);
      await Promise.all([fetchLedgerData(), fetchOrgData()]);
      setTransactionSubTab('customer_payments');
    } catch (err: any) {
      console.error('Failed to record payment', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to record payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleSaveCustomJournal = async (journalEntry: any) => {
    const loadingToast = toast.loading('Recording journal voucher...');
    try {
      const res = await api.post(`/organizations/${orgId}/journals`, journalEntry);
      if (res.data?.journal) {
        const savedJournal = res.data.journal;
        const updated = [savedJournal, ...customJournals.filter((j: any) => j.id !== savedJournal.id)];
        setCustomJournals(updated);
        try {
          localStorage.setItem(`custom_journals_${orgId}`, JSON.stringify(updated));
        } catch (e) {}
        toast.success(`Journal ${savedJournal.journal_no} recorded in database!`, { id: loadingToast });
        setIsAddJournalModalOpen(false);
        return;
      }
    } catch (err: any) {
      console.warn('Database save failed or table not migrated yet, saving locally:', err);
    }

    // Fallback save to localStorage if backend table hasn't been migrated yet
    const updated = [journalEntry, ...customJournals];
    setCustomJournals(updated);
    try {
      localStorage.setItem(`custom_journals_${orgId}`, JSON.stringify(updated));
    } catch (e) {}
    toast.success(`Journal ${journalEntry.journal_no} recorded successfully!`, { id: loadingToast });
    setIsAddJournalModalOpen(false);
  };

  // Organization Basic & Details State
  const [org, setOrg] = useState<Organization | null>(null);
  const [orgDetails, setOrgDetails] = useState<any>(null);
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [quoteDateFilter, setQuoteDateFilter] = useState<DateFilterValue>({ preset: 'ALL' });
  const [paymentDateFilter, setPaymentDateFilter] = useState<DateFilterValue>({ preset: 'ALL' });
  const [orderDateFilter, setOrderDateFilter] = useState<DateFilterValue>({ preset: 'ALL' });
  const [packageDateFilter, setPackageDateFilter] = useState<DateFilterValue>({ preset: 'ALL' });
  const [shipmentDateFilter, setShipmentDateFilter] = useState<DateFilterValue>({ preset: 'ALL' });
  const [proformaDateFilter, setProformaDateFilter] = useState<DateFilterValue>({ preset: 'ALL' });
  const [invoiceDateFilter, setInvoiceDateFilter] = useState<DateFilterValue>({ preset: 'ALL' });
  const [expenseDateFilter, setExpenseDateFilter] = useState<DateFilterValue>({ preset: 'ALL' });
  const [journalDateFilter, setJournalDateFilter] = useState<DateFilterValue>({ preset: 'ALL' });
  const [statementDateFilter, setStatementDateFilter] = useState<DateFilterValue>({ preset: 'ALL' });
  const [manualExpenses, setManualExpenses] = useState<any[]>([]);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [newExpenseForm, setNewExpenseForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: 'Fabric & Raw Materials',
    amount: '',
    so_no: '',
    sales_person: '',
    payment_mode: 'Bank Transfer',
    voucher_no: '',
    description: '',
    status: 'Paid'
  });
  const [industries, setIndustries] = useState<any[]>([]);
  const customerSector = useMemo(() => {
    return org?.industries?.name || industries.find((ind: any) => ind.id === org?.industry_id)?.name || (org as any)?.industry || '';
  }, [org, industries]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [isGstDeliveryModalOpen, setIsGstDeliveryModalOpen] = useState(false);
  const [isSavingGstDelivery, setIsSavingGstDelivery] = useState(false);
  const [gstDeliveryForm, setGstDeliveryForm] = useState({
    gst_number: '',
    pan_number: '',
    legal_name: '',
    delivery_address: '',
    delivery_city: '',
    delivery_state: '',
    delivery_pincode: '',
    delivery_country: 'India'
  });
  const [deleteCustomerConfirm, setDeleteCustomerConfirm] = useState<{ isOpen: boolean }>({
    isOpen: false
  });

  // Customer Profile Actions Dropdown
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
  const actionsDropdownRef = useRef<HTMLDivElement>(null);
  const [isMeasurementDrawerOpen, setIsMeasurementDrawerOpen] = useState(false);
  const [isJournalDrawerOpen, setIsJournalDrawerOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(event.target as Node)) {
        setIsActionsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openGstDeliveryModal = () => {
    setGstDeliveryForm({
      gst_number: org?.gst_number || '',
      pan_number: org?.pan_number || '',
      legal_name: org?.legal_name || '',
      delivery_address: org?.delivery_address || '',
      delivery_city: org?.delivery_city || '',
      delivery_state: org?.delivery_state || '',
      delivery_pincode: org?.delivery_pincode || '',
      delivery_country: org?.delivery_country || 'India'
    });
    setIsGstDeliveryModalOpen(true);
  };

  // Modals & Order Details
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [credsModal, setCredsModal] = useState<{ isOpen: boolean; data: any | null }>({
    isOpen: false,
    data: null
  });

  // Invoice Creation Modal States (Manual Retail vs Sales Order Bulk)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceType, setInvoiceType] = useState<'sales_order' | 'quotation' | 'retail'>('sales_order');
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
  const [selectedOrderIdForInvoice, setSelectedOrderIdForInvoice] = useState<number | null>(null);
  const [selectedQuotationIdForInvoice, setSelectedQuotationIdForInvoice] = useState<number | null>(null);
  const [invoiceCreditPeriod, setInvoiceCreditPeriod] = useState<number>(30);
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [invoiceNotes, setInvoiceNotes] = useState<string>('');
  const [retailItems, setRetailItems] = useState<Array<{ description: string; quantity: number; unit_price: number; total: number }>>([
    { description: 'School / Corporate Uniform Item', quantity: 1, unit_price: 1500, total: 1500 }
  ]);

  // Client User Detection
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const roleLower = (currentUser?.role || '').toLowerCase();
  const isClientUser = Boolean(
    currentUser?.organizationId || 
    currentUser?.memberId || 
    ['organisation', 'organization', 'school', 'entity', 'student', 'member'].includes(roleLower)
  );

  useEffect(() => {
    if (isClientUser && activeTab === 'transactions') {
      setActiveTab('overview');
    }
  }, [isClientUser, activeTab]);

  // Department management states inside tab
  const [departments, setDepartments] = useState<any[]>([]);
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [selectedDeptName, setSelectedDeptName] = useState('');
  const [customDeptName, setCustomDeptName] = useState('');

  // First Custom Department Migration / Confirmation Modal State
  const [firstDeptMigrationModal, setFirstDeptMigrationModal] = useState<{
    isOpen: boolean;
    newDeptPayload: any;
    mainDept: any;
    memberCount: number;
    selectedAction: 'migrate_and_delete' | 'keep_both' | 'migrate_and_keep';
    isSubmitting: boolean;
  }>({
    isOpen: false,
    newDeptPayload: null,
    mainDept: null,
    memberCount: 0,
    selectedAction: 'migrate_and_delete',
    isSubmitting: false
  });

  useEffect(() => {
    if (editingDept) {
      setSelectedDeptName(editingDept.grade || '');
      setCustomDeptName(editingDept.name || '');
    } else {
      setSelectedDeptName('');
      setCustomDeptName('');
    }
  }, [editingDept, isAddingDept]);

  const [deptDeleteModal, setDeptDeleteModal] = useState<{
    isOpen: boolean;
    step: 1 | 2;
    dept: any | null;
    typedName: string;
    isDeleting?: boolean;
  }>({
    isOpen: false,
    step: 1,
    dept: null,
    typedName: '',
    isDeleting: false
  });
  const [openMenuDeptId, setOpenMenuDeptId] = useState<string | null>(null);

  // Entity directory states inside tab
  const [entities, setEntities] = useState<any[]>([]);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('');
  const [entitySearchQuery, setEntitySearchQuery] = useState('');
  const [entityGenderFilter, setEntityGenderFilter] = useState<string>('ALL');
  const [entitySectionFilter, setEntitySectionFilter] = useState<string>('ALL');
  const [isLoadingEntities, setIsLoadingEntities] = useState(false);
  const [entityView, setEntityView] = useState<'list' | 'register' | 'bulk'>('list');
  const [editingEntity, setEditingEntity] = useState<any | null>(null);
  const [deleteEntityConfirm, setDeleteEntityConfirm] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null
  });
  const [resetEntityConfirm, setResetEntityConfirm] = useState<{ isOpen: boolean; entity: any | null }>({
    isOpen: false,
    entity: null
  });
  const [profileModal, setProfileModal] = useState<{ isOpen: boolean; member: any | null }>({
    isOpen: false,
    member: null
  });

  const getMemberSection = (m: any): string => {
    if (!m) return '';
    if (m.section && typeof m.section === 'string' && m.section.trim()) return m.section.trim();
    if (m.division && typeof m.division === 'string' && m.division.trim()) return m.division.trim();
    if (m.notes && typeof m.notes === 'string') {
      const match = m.notes.match(/Section:\s*([^\n,;]+)/i);
      if (match && match[1]?.trim()) return match[1].trim();
    }
    if (m.departments?.section && typeof m.departments.section === 'string' && m.departments.section.trim()) {
      return m.departments.section.trim();
    }
    if (m.departments?.division && typeof m.departments.division === 'string' && m.departments.division.trim()) {
      return m.departments.division.trim();
    }
    return '';
  };

  const deptMembers = useMemo(() => {
    if (!selectedDepartmentForMembers) return [];
    return entities.filter(e => {
      if (String(e.department_id) === String(selectedDepartmentForMembers.id)) return true;
      if ((selectedDepartmentForMembers.name || '').trim().toLowerCase() === 'main' && (!e.department_id || !e.departments)) return true;
      return false;
    });
  }, [entities, selectedDepartmentForMembers]);

  const availableSections = useMemo(() => {
    const set = new Set<string>();
    
    // 1. From department's division / section string (e.g. "A, B, C" or "North, South")
    const rawDeptSec = selectedDepartmentForMembers?.division || selectedDepartmentForMembers?.section || '';
    if (rawDeptSec) {
      rawDeptSec.split(',').forEach((s: string) => {
        const trimmed = s.trim();
        if (trimmed) set.add(trimmed);
      });
    }

    // 2. From individual members in this department
    deptMembers.forEach((m) => {
      const s = getMemberSection(m);
      if (s) {
        s.split(',').forEach((part: string) => {
          const trimmed = part.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });

    return Array.from(set).sort();
  }, [selectedDepartmentForMembers, deptMembers]);

  const filteredDepartmentMembers = useMemo(() => {
    return deptMembers.filter(e => {
      // Gender filter
      if (entityGenderFilter !== 'ALL') {
        const g = (e.gender || 'Male').toLowerCase();
        if (g !== entityGenderFilter.toLowerCase()) return false;
      }

      // Section filter
      if (entitySectionFilter !== 'ALL') {
        const s = getMemberSection(e).toLowerCase();
        if (!s.includes(entitySectionFilter.toLowerCase())) return false;
      }

      return true;
    });
  }, [deptMembers, entityGenderFilter, entitySectionFilter]);

  // Bulk Upload states
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkData, setBulkData] = useState<any[]>([]);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ success: number; failed: number; errors?: any[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single Registration generated credentials
  const [generatedEntityCreds, setGeneratedEntityCreds] = useState<any | null>(null);
  const [hasCopiedCreds, setHasCopiedCreds] = useState(false);

  // Fetch basic organization info and stats/details
  const fetchOrgData = async () => {
    setIsLoadingOrg(true);
    try {
      const [orgsRes, detailsRes, quotesRes, indRes, empRes] = await Promise.all([
        api.get('/organizations').catch(() => ({ data: [] })),
        api.get(`/organizations/${orgId}/details`),
        api.get('/quotations').catch(() => ({ data: [] })),
        api.get('/industries').catch(() => ({ data: [] })),
        api.get('/employees').catch(() => ({ data: [] }))
      ]);

      const orgList = orgsRes.data || [];
      const foundOrg = orgList.find((o: any) => o.id === orgId) || (detailsRes.data?.organization || (detailsRes.data ? { id: orgId, name: detailsRes.data.name || 'Organization', address: detailsRes.data.address } : null));
      const combinedOrg = detailsRes.data?.organization
        ? { ...foundOrg, ...detailsRes.data.organization }
        : foundOrg;
      setOrg(combinedOrg);
      setOrgDetails(detailsRes.data);
      const fetchedDepts = detailsRes.data?.departments || [];
      setDepartments(fetchedDepts.length > 0 ? fetchedDepts : [{ id: 'main', name: 'Main', division: 'Main', section: 'Main' }]);
      setIndustries(indRes.data || []);
      setEmployees(empRes.data || []);

      const allQuotes = quotesRes.data || [];
      const orgQuotes = allQuotes.filter((q: any) => q.organization_id === orgId);
      setQuotations(orgQuotes);
      fetchEntities();
    } catch (err) {
      toast.error('Failed to load organization profile');
    } finally {
      setIsLoadingOrg(false);
    }
  };

  useEffect(() => {
    if (orgId) {
      fetchOrgData();
    }
  }, [orgId]);

  const fetchLedgerData = async () => {
    setIsLoadingLedger(true);
    try {
      const res = await api.get(`/organizations/${orgId}/ledger`);
      setLedgerData(res.data);
    } catch (err) {
      console.error('Failed to load ledger', err);
      toast.error('Failed to load account ledger');
    } finally {
      setIsLoadingLedger(false);
    }
  };

  const fetchChallans = async () => {
    setIsLoadingChallans(true);
    try {
      const res = await api.get('/delivery-challans');
      const allChallans = res.data || [];
      const orgChallans = allChallans.filter((dc: any) => {
        const qOrgId = dc.orders?.quotations?.organization_id;
        const orgName = dc.orders?.quotations?.organizations?.name;
        return (
          qOrgId === orgId ||
          (org?.name && orgName && orgName.toLowerCase() === org.name.toLowerCase())
        );
      });
      setDeliveryChallans(orgChallans);
    } catch (err) {
      console.error('Failed to load delivery challans', err);
    } finally {
      setIsLoadingChallans(false);
    }
  };

  const fetchLeadHistory = async () => {
    try {
      const res = await api.get('/leads').catch(() => ({ data: [] }));
      const allLeads = res.data || [];
      const matched = allLeads.find((l: any) => 
        (l.organization_id && (String(l.organization_id) === String(orgId) || (org?.id && String(l.organization_id) === String(org.id)))) ||
        (org?.name && l.name && l.name.trim().toLowerCase() === org.name.trim().toLowerCase()) ||
        (org?.contact_number && (l.contact_number === org.contact_number || l.phone === org.contact_number)) ||
        (org?.phone && (l.contact_number === org.phone || l.phone === org.phone))
      );

      if (matched) {
        setLinkedLead(matched);
        const [shRes, actRes] = await Promise.allSettled([
          api.get(`/leads/${matched.id}/stage-history`),
          api.get(`/leads/${matched.id}/activities`)
        ]);

        if (shRes.status === 'fulfilled' && Array.isArray(shRes.value.data)) {
          setLeadStageHistory(shRes.value.data);
        }
        if (actRes.status === 'fulfilled' && Array.isArray(actRes.value.data)) {
          setLeadActivities(actRes.value.data);
        }
      }
    } catch (err) {
      console.warn('Could not fetch linked lead history:', err);
    }
  };

  const fetchCustomerExpenses = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await api.get(`/organizations/${orgId}/expenses`);
      if (res.data?.success && Array.isArray(res.data.expenses)) {
        setManualExpenses(res.data.expenses);
        try { localStorage.setItem(`cust_expenses_${orgId}`, JSON.stringify(res.data.expenses)); } catch (_) {}
      }
    } catch (e) {
      try {
        const cached = localStorage.getItem(`cust_expenses_${orgId}`);
        if (cached) {
          setManualExpenses(JSON.parse(cached));
        }
      } catch (_) {}
    }
  }, [orgId]);

  useEffect(() => {
    if (orgId && (activeTab === 'ledger' || activeTab === 'transactions' || activeTab === 'overview')) {
      fetchLedgerData();
      fetchChallans();
      fetchLeadHistory();
      fetchCustomerExpenses();
    }
  }, [orgId, activeTab, org?.name, fetchCustomerExpenses]);

  useEffect(() => {
    if (org?.credit_period_days !== undefined && org?.credit_period_days !== null) {
      setInvoiceCreditPeriod(org.credit_period_days);
    }
  }, [org]);

  const getCalculatedDueDate = (invDateStr: string, creditDays: number) => {
    const d = new Date(invDateStr || new Date());
    d.setDate(d.getDate() + (parseInt(String(creditDays), 10) || 30));
    return d.toISOString().split('T')[0];
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;

    if (invoiceType === 'sales_order') {
      if (!selectedOrderIdForInvoice) {
        toast.error('Please select a confirmed sales order');
        return;
      }
      setIsSubmittingInvoice(true);
      const loadingToast = toast.loading('Generating invoice from sales order...');
      try {
        await api.post('/invoices/from-order', {
          order_id: selectedOrderIdForInvoice,
          credit_period_days: invoiceCreditPeriod,
          invoice_date: invoiceDate,
          notes: invoiceNotes
        });
        toast.success('Sales order invoice created successfully!', { id: loadingToast });
        setIsInvoiceModalOpen(false);
        fetchLedgerData();
        fetchOrgData();
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to create sales order invoice', { id: loadingToast });
      } finally {
        setIsSubmittingInvoice(false);
      }
    } else if (invoiceType === 'quotation') {
      if (!selectedQuotationIdForInvoice) {
        toast.error('Please select a quotation');
        return;
      }
      setIsSubmittingInvoice(true);
      const loadingToast = toast.loading('Generating invoice from quotation...');
      try {
        await api.post('/invoices/from-order', {
          quotation_id: selectedQuotationIdForInvoice,
          credit_period_days: invoiceCreditPeriod,
          invoice_date: invoiceDate,
          notes: invoiceNotes
        });
        toast.success('Quotation invoice created successfully!', { id: loadingToast });
        setIsInvoiceModalOpen(false);
        fetchLedgerData();
        fetchOrgData();
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to create quotation invoice', { id: loadingToast });
      } finally {
        setIsSubmittingInvoice(false);
      }
    } else {
      const validItems = retailItems.filter(i => i.description.trim() && Number(i.quantity) > 0);
      if (validItems.length === 0) {
        toast.error('Please add at least one line item with description and quantity');
        return;
      }
      const subtotal = validItems.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unit_price || 0)), 0);
      const dueDate = getCalculatedDueDate(invoiceDate, invoiceCreditPeriod);

      setIsSubmittingInvoice(true);
      const loadingToast = toast.loading('Creating manual retail invoice...');
      try {
        await api.post('/invoices', {
          organization_id: org.id,
          customer_name: org.name,
          sale_type: 'retail',
          invoice_date: invoiceDate,
          credit_period_days: invoiceCreditPeriod,
          due_date: dueDate,
          items: validItems,
          subtotal: subtotal,
          tax_amount: 0,
          total_amount: subtotal,
          notes: invoiceNotes,
          payment_status: 'Unpaid'
        });
        toast.success('Retail invoice created successfully!', { id: loadingToast });
        setIsInvoiceModalOpen(false);
        fetchLedgerData();
        fetchOrgData();
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to create retail invoice', { id: loadingToast });
      } finally {
        setIsSubmittingInvoice(false);
      }
    }
  };

  const handleSaveNewExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newExpenseForm.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid expense amount greater than 0');
      return;
    }
    if (!newExpenseForm.description.trim()) {
      toast.error('Please enter an expense description / narration');
      return;
    }

    setIsSubmittingExpense(true);
    const loadingToast = toast.loading('Recording expense...');
    try {
      const payload = {
        ...newExpenseForm,
        customer_name: org?.name,
        amount: amt
      };
      let createdExpense: any = null;
      try {
        const res = await api.post(`/organizations/${orgId}/expenses`, payload);
        if (res.data?.success && res.data.expense) {
          createdExpense = res.data.expense;
        }
      } catch (apiErr) {
        console.warn('Backend expense recording failed, using local fallback:', apiErr);
      }

      if (!createdExpense) {
        createdExpense = {
          id: `EXP-MAN-${Date.now()}`,
          voucher_no: newExpenseForm.voucher_no || `EXP-M-${Date.now().toString().slice(-6)}`,
          expense_ref: newExpenseForm.voucher_no || `EXP-M-${Date.now().toString().slice(-6)}`,
          date: newExpenseForm.date || new Date().toISOString(),
          category: newExpenseForm.category,
          so_no: newExpenseForm.so_no || '—',
          order_no: newExpenseForm.so_no || '—',
          linked_ref: newExpenseForm.so_no || '—',
          customer_name: org?.name,
          sales_person: newExpenseForm.sales_person || 'Unassigned',
          payment_mode: newExpenseForm.payment_mode,
          description: newExpenseForm.description.trim(),
          amount: amt,
          status: newExpenseForm.status,
          created_at: new Date().toISOString()
        };
      }

      const updated = [createdExpense, ...manualExpenses];
      setManualExpenses(updated);
      try { localStorage.setItem(`cust_expenses_${orgId}`, JSON.stringify(updated)); } catch (_) {}
      toast.success('Expense recorded successfully!', { id: loadingToast });
      setIsAddExpenseModalOpen(false);
    } catch (err: any) {
      console.error('Failed to record expense:', err);
      toast.error(err.response?.data?.error || 'Failed to record expense', { id: loadingToast });
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  function isBeforeDateFilter(dateStr: string | null | undefined, filter: DateFilterValue): boolean {
    if (!filter || filter.preset === 'ALL' || (!filter.preset && !filter.startDate)) return false;
    if (!dateStr) return false;
    const itemDate = new Date(dateStr);
    if (isNaN(itemDate.getTime())) return false;
    const itemDayTimestamp = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate()).getTime();

    const now = new Date();
    const todayTimestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    switch (filter.preset) {
      case 'today':
        return itemDayTimestamp < todayTimestamp;
      case 'yesterday':
        return itemDayTimestamp < (todayTimestamp - 24 * 60 * 60 * 1000);
      case 'this_week': {
        const dayOfWeek = (now.getDay() + 6) % 7;
        const mondayTimestamp = todayTimestamp - dayOfWeek * 24 * 60 * 60 * 1000;
        return itemDayTimestamp < mondayTimestamp;
      }
      case 'this_month': {
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        return itemDayTimestamp < firstOfMonth;
      }
      case 'last_month': {
        const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
        return itemDayTimestamp < firstOfLastMonth;
      }
      case 'last_30_days': {
        const thirtyDaysAgo = todayTimestamp - 30 * 24 * 60 * 60 * 1000;
        return itemDayTimestamp < thirtyDaysAgo;
      }
      case 'custom': {
        if (filter.startDate) {
          const parts = filter.startDate.split('-');
          if (parts.length === 3) {
            const startTimestamp = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
            return itemDayTimestamp < startTimestamp;
          }
        }
        return false;
      }
      default:
        return false;
    }
  }

  const statementLedgerDetails = useMemo(() => {
    const allTx = ledgerData?.transactions || [];
    let openingBalance = 0;
    const filtered: any[] = [];

    allTx.forEach((tx: any) => {
      if (matchesDateFilter(tx.date, statementDateFilter)) {
        filtered.push(tx);
      } else if (isBeforeDateFilter(tx.date, statementDateFilter)) {
        openingBalance += (parseFloat(tx.debit || 0) - parseFloat(tx.credit || 0));
      }
    });

    let running = openingBalance;
    const computedTransactions = filtered.map((tx: any) => {
      running = running + (parseFloat(tx.debit || 0) - parseFloat(tx.credit || 0));
      return {
        ...tx,
        period_running_balance: Math.round(running * 100) / 100
      };
    });

    const periodDebits = filtered.reduce((s: number, tx: any) => s + parseFloat(tx.debit || 0), 0);
    const periodCredits = filtered.reduce((s: number, tx: any) => s + parseFloat(tx.credit || 0), 0);
    const closingBalance = Math.round((openingBalance + periodDebits - periodCredits) * 100) / 100;

    return {
      openingBalance: Math.round(openingBalance * 100) / 100,
      filteredTransactions: computedTransactions,
      periodDebits: Math.round(periodDebits * 100) / 100,
      periodCredits: Math.round(periodCredits * 100) / 100,
      closingBalance
    };
  }, [ledgerData?.transactions, statementDateFilter]);

  const statementTableData = useMemo(() => {
    const rows: any[] = [];

    // Always include the Opening Balance row as the very first entry
    rows.push({
      id: 'OPENING-BALANCE-ROW',
      is_opening: true,
      date: null,
      type: 'OPENING',
      reference_no: 'OB',
      description: 'Opening Balance (Brought Forward)',
      order_ref: null,
      debit: statementLedgerDetails.openingBalance > 0 ? statementLedgerDetails.openingBalance : 0,
      credit: statementLedgerDetails.openingBalance < 0 ? Math.abs(statementLedgerDetails.openingBalance) : 0,
      running_balance: statementLedgerDetails.openingBalance,
      period_running_balance: statementLedgerDetails.openingBalance
    });

    const filtered = statementLedgerDetails.filteredTransactions.filter((tx: any) => {
      if (ledgerFilter === 'invoices') return tx.type === 'INVOICE' || tx.type === 'ORDER';
      if (ledgerFilter === 'payments') return tx.type === 'PAYMENT';
      return true;
    });

    return [...rows, ...filtered];
  }, [statementLedgerDetails, ledgerFilter]);

  const exportLedgerCSV = () => {
    if (!statementTableData || statementTableData.length === 0) {
      toast.error('No ledger entries available to export');
      return;
    }

    const headers = ['Date', 'Type', 'Reference No', 'Description', 'Order Ref', 'Debit (INR)', 'Credit (INR)', 'Running Balance (INR)', 'Status'];
    const rows = statementTableData.map((tx: any) => [
      `"${tx.is_opening ? '—' : formatDate(tx.date)}"`,
      `"${tx.type}"`,
      `"${tx.reference_no}"`,
      `"${tx.description}"`,
      `"${tx.order_ref || '—'}"`,
      tx.debit || 0,
      tx.credit || 0,
      tx.period_running_balance ?? tx.running_balance ?? 0,
      `"${tx.status || 'Active'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `customer_statement_${(org?.name || 'client').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Account Statement Exported');
  };

  const handleViewOrder = async (orderId: number) => {
    const loadingToast = toast.loading('Loading order details...');
    try {
      const res = await api.get(`/orders/${orderId}`);
      setSelectedOrder(res.data);
      toast.dismiss(loadingToast);
    } catch (err) {
      toast.error('Failed to load order details', { id: loadingToast });
    }
  };

  // Customer Management Handlers
  const handleUpdateCustomer = async (formData: any) => {
    if (!formData.phone || !formData.phone.trim()) {
      toast.error('Primary phone number is required');
      return;
    }

    const loadingToast = toast.loading('Updating customer profile...');
    const isSpecial = formData.client_tag === 'special';
    const isRisk = formData.client_tag === 'risk';

    const payload = {
      name: formData.name,
      contact_person: formData.contact_person?.trim() || null,
      phone: formData.phone.trim(),
      contact_number: formData.phone.trim(),
      email: formData.email?.trim() || null,
      contact_email: formData.email?.trim() || null,
      industry_id: formData.industry_id ? parseInt(formData.industry_id, 10) : null,
      address: formData.address?.trim() || null,
      city: formData.city?.trim() || null,
      state: formData.state?.trim() || null,
      pincode: formData.pincode?.trim() || null,
      country: formData.country?.trim() || 'India',
      relationship_manager_id: org?.relationship_manager_id || null,
      is_active: formData.is_active === 'true',
      is_special: isSpecial,
      is_risk: isRisk,
      client_tag: formData.client_tag || 'standard',
      receivables: formData.receivables !== undefined && formData.receivables !== '' ? parseFloat(formData.receivables) : 0,
      credits: formData.credits !== undefined && formData.credits !== '' ? parseFloat(formData.credits) : 0,
      credit_period_days: formData.credit_period_days !== undefined && formData.credit_period_days !== '' ? parseInt(formData.credit_period_days, 10) : 30,
    };

    try {
      await api.put(`/customers/${orgId}`, payload).catch(() => api.put(`/organizations/${orgId}`, payload));
      toast.success('Customer profile updated successfully!', { id: loadingToast });
      setIsEditingCustomer(false);
      fetchOrgData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update customer profile', { id: loadingToast });
    }
  };

  const handleSaveGstDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGstDelivery(true);
    const loadingToast = toast.loading('Saving GST & Delivery details...');
    try {
      const cleanGst = gstDeliveryForm.gst_number ? gstDeliveryForm.gst_number.trim().toUpperCase() : null;
      let cleanPan = gstDeliveryForm.pan_number ? gstDeliveryForm.pan_number.trim().toUpperCase() : null;
      if (!cleanPan && cleanGst && cleanGst.length >= 12) {
        cleanPan = cleanGst.substring(2, 12);
      }
      const isB2B = Boolean(cleanGst && cleanGst !== '');

      const payload = {
        gst_number: cleanGst,
        pan_number: cleanPan,
        legal_name: gstDeliveryForm.legal_name ? gstDeliveryForm.legal_name.trim() : null,
        delivery_address: gstDeliveryForm.delivery_address ? gstDeliveryForm.delivery_address.trim() : null,
        delivery_city: gstDeliveryForm.delivery_city ? gstDeliveryForm.delivery_city.trim() : null,
        delivery_state: gstDeliveryForm.delivery_state ? gstDeliveryForm.delivery_state.trim() : null,
        delivery_pincode: gstDeliveryForm.delivery_pincode ? gstDeliveryForm.delivery_pincode.trim() : null,
        delivery_country: gstDeliveryForm.delivery_country ? gstDeliveryForm.delivery_country.trim() : 'India',
        is_b2b: isB2B
      };

      await api.put(`/organizations/${orgId}`, payload).catch(() => api.put(`/customers/${orgId}`, payload));
      toast.success(isB2B ? 'GST details saved! Customer updated to B2B Commercial.' : 'Delivery details saved successfully!', { id: loadingToast });
      setIsGstDeliveryModalOpen(false);
      fetchOrgData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update GST and delivery details', { id: loadingToast });
    } finally {
      setIsSavingGstDelivery(false);
    }
  };

  const handleResetPassword = async () => {
    const loadingToast = toast.loading('Generating secure portal access key...');
    try {
      const response = await api.post(`/customers/${orgId}/reset-password`).catch(() => api.post(`/organizations/${orgId}/reset-password`));
      const { newPassword, username } = response.data;
      toast.success('Portal Credentials Reset Successfully!', { id: loadingToast });
      setCredsModal({
        isOpen: true,
        data: {
          full_name: org?.name,
          username: username,
          password: newPassword
        }
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reset credentials', { id: loadingToast });
    }
  };

  const handleConfirmedDeleteCustomer = async () => {
    const loadingToast = toast.loading('Purging customer account...');
    setDeleteCustomerConfirm({ isOpen: false });
    try {
      await api.delete(`/customers/${orgId}`).catch(() => api.delete(`/organizations/${orgId}`));
      toast.success('Customer account and linked data removed', { id: loadingToast });
      router.push('/customers');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete customer', { id: loadingToast });
    }
  };



  const deptFields: FormField[] = [
    {
      name: 'grade',
      label: 'Department Name Option',
      type: 'select' as const,
      placeholder: 'Select Department...',
      required: false,
      value: selectedDeptName,
      onChange: (val: string) => {
        setSelectedDeptName(val);
        setCustomDeptName(val);
      },
      options: [
        { label: 'Class1', value: 'Class1' },
        { label: 'Class2', value: 'Class2' },
        { label: 'Class3', value: 'Class3' },
        { label: 'Class4', value: 'Class4' },
        { label: 'Class5', value: 'Class5' },
        { label: 'Class6', value: 'Class6' },
        { label: 'Class7', value: 'Class7' },
        { label: 'Class8', value: 'Class8' },
        { label: 'Class9', value: 'Class9' },
        { label: 'Class10', value: 'Class10' },
        { label: 'Class11', value: 'Class11' },
        { label: 'Class12', value: 'Class12' },
        { label: 'C1', value: 'C1' },
        { label: 'C2', value: 'C2' },
        { label: 'Corporate', value: 'Corporate' }
      ]
    },
    {
      name: 'name',
      label: 'Custom Department Name',
      type: 'text',
      placeholder: 'e.g. Class1 or Sales',
      required: true,
      maxLength: 20,
      value: customDeptName,
      onChange: (val: string) => {
        setCustomDeptName(val);
      }
    },
    {
      name: 'division',
      label: 'Division / Section (Optional)',
      type: 'custom',
      defaultValue: editingDept?.division || editingDept?.section || '',
      render: (val: any, onChange: (v: any) => void) => (
        <MultiEntryInput
          value={val || ''}
          onChange={onChange}
          placeholder="e.g. A, B, North, South (press Enter or click Add)"
        />
      )
    }
  ];

  const executeSaveDepartment = async (
    formData: any,
    migrationOptions?: { replaceMainDept: boolean; migrateMembersFromMain: boolean; mainDeptId: any }
  ) => {
    const loadingToast = toast.loading(editingDept ? 'Updating department...' : 'Setting up department...');
    const payload = {
      ...formData,
      orgId: String(orgId),
      ...(migrationOptions ? { migration: migrationOptions } : {})
    };
    try {
      if (editingDept) {
        await api.put(`/departments/${editingDept.id}`, payload);
        toast.success('Department updated successfully!', { id: loadingToast });
      } else {
        const res = await api.post('/departments', payload);
        if (res.data?.mainDeptDeleted) {
          toast.success(
            res.data.migratedMembersCount > 0
              ? `Department created! Moved ${res.data.migratedMembersCount} member(s) from Main.`
              : 'Department created and removed default Main department.',
            { id: loadingToast }
          );
        } else {
          toast.success('Department created successfully!', { id: loadingToast });
        }
      }
      setIsAddingDept(false);
      setEditingDept(null);
      setFirstDeptMigrationModal(prev => ({ ...prev, isOpen: false, isSubmitting: false }));

      // Refresh organization details which contains departments
      const detailsRes = await api.get(`/organizations/${orgId}/details`);
      setOrgDetails(detailsRes.data);
      const updatedDepts = detailsRes.data.departments || [];
      setDepartments(updatedDepts);

      // Refresh entities list to reflect updated department mappings
      await fetchEntities();

      // If user had selected the old Main department, switch to the new department or reset
      if (selectedDepartmentForMembers && (selectedDepartmentForMembers.name || '').trim().toLowerCase() === 'main') {
        const matchingNewDept = updatedDepts.find((d: any) => d.name === formData.name) || updatedDepts[0] || null;
        setSelectedDepartmentForMembers(matchingNewDept);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Operation failed', { id: loadingToast });
      setFirstDeptMigrationModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleAddOrUpdateDept = async (formData: any) => {
    // When creating a new department (not editing), check if customer only has the default 'Main' department
    if (!editingDept && departments.length === 1 && (departments[0].name || '').trim().toLowerCase() === 'main') {
      const mainDept = departments[0];
      const memberCount = entities.filter(e => {
        if (String(e.department_id) === String(mainDept.id)) return true;
        if (!e.department_id || !e.departments) return true;
        return false;
      }).length;

      setFirstDeptMigrationModal({
        isOpen: true,
        newDeptPayload: formData,
        mainDept,
        memberCount,
        selectedAction: 'migrate_and_delete',
        isSubmitting: false
      });
      return;
    }

    await executeSaveDepartment(formData);
  };

  const handleConfirmMigrationAndCreate = async () => {
    if (!firstDeptMigrationModal.newDeptPayload || !firstDeptMigrationModal.mainDept) return;
    setFirstDeptMigrationModal(prev => ({ ...prev, isSubmitting: true }));

    let replaceMainDept = false;
    let migrateMembersFromMain = false;

    if (firstDeptMigrationModal.selectedAction === 'migrate_and_delete') {
      replaceMainDept = true;
      migrateMembersFromMain = true;
    } else if (firstDeptMigrationModal.selectedAction === 'migrate_and_keep') {
      replaceMainDept = false;
      migrateMembersFromMain = true;
    } else if (firstDeptMigrationModal.selectedAction === 'keep_both') {
      replaceMainDept = false;
      migrateMembersFromMain = false;
    }

    await executeSaveDepartment(firstDeptMigrationModal.newDeptPayload, {
      replaceMainDept,
      migrateMembersFromMain,
      mainDeptId: firstDeptMigrationModal.mainDept.id
    });
  };

  const handleExecuteDepartmentDelete = async () => {
    if (!deptDeleteModal.dept?.id) return;

    setDeptDeleteModal(prev => ({ ...prev, isDeleting: true }));
    const loadingToast = toast.loading(`Removing department "${deptDeleteModal.dept.name}"...`);
    const id = deptDeleteModal.dept.id;

    try {
      await api.delete(`/departments/${id}`);
      toast.success(`Department "${deptDeleteModal.dept.name}" removed!`, { id: loadingToast });

      if (selectedDepartmentForMembers && String(selectedDepartmentForMembers.id) === String(id)) {
        setSelectedDepartmentForMembers(null);
      }

      setDeptDeleteModal({ isOpen: false, step: 1, dept: null, typedName: '', isDeleting: false });

      const detailsRes = await api.get(`/organizations/${orgId}/details`);
      setOrgDetails(detailsRes.data);
      setDepartments(detailsRes.data.departments || []);
      await fetchEntities();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete department', { id: loadingToast });
      setDeptDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  // Fetch Entities (Members) list scoped to this organization
  const fetchEntities = async () => {
    setIsLoadingEntities(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('schoolId', String(orgId));
      if (entitySearchQuery) queryParams.append('search', entitySearchQuery);

      const response = await api.get(`/students?${queryParams.toString()}`);
      setEntities(response.data);
    } catch (err) {
      console.error('Failed to fetch entities:', err);
    } finally {
      setIsLoadingEntities(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'departments' && entityView === 'list') {
      const timer = setTimeout(() => {
        fetchEntities();
      }, entitySearchQuery ? 500 : 0);
      return () => clearTimeout(timer);
    }
  }, [activeTab, entitySearchQuery, entityView]);


  // --- Entity Directory Logic ---
  const entityFields: FormField[] = [
    {
      name: 'full_name', label: 'Full Name', type: 'text',
      placeholder: 'Enter Full Name...', required: true,
      onlyLetters: true,
      maxLength: 25,
      defaultValue: editingEntity?.full_name
    },
    {
      name: 'admission_no', label: 'Reference ID / ID', type: 'text',
      placeholder: 'e.g. EMP-101 or SD-2024-001', required: true,
      defaultValue: editingEntity?.admission_no
    },
    {
      name: 'gender', label: 'Gender', type: 'select',
      options: [
        { label: 'Male', value: 'Male' },
        { label: 'Female', value: 'Female' },
        { label: 'Other', value: 'Other' }
      ],
      required: true,
      defaultValue: editingEntity?.gender || 'Male'
    },
    {
      name: 'section',
      label: 'Section / Division (Optional)',
      type: 'text',
      placeholder: 'e.g. A, B, Section 1',
      defaultValue: getMemberSection(editingEntity) || ''
    },
    {
      name: 'class_id',
      label: 'Department / Unit',
      type: 'select',
      options: (departments.length > 0 ? departments : [{ id: 'main', name: 'Main' }]).map((d: any) => ({ label: d.name, value: d.id })),
      required: false,
      defaultValue: editingEntity?.department_id || editingEntity?.class_id || selectedDepartmentForMembers?.id || departments.find((d: any) => d.name?.toLowerCase() === 'main')?.id || departments[0]?.id
    },
    {
      name: 'contact_mobile', label: 'Contact Mobile', type: 'tel',
      placeholder: 'Numbers only (max 15)',
      onlyNumbers: true,
      maxLength: 15,
      defaultValue: editingEntity?.contact_mobile
    },
    {
      name: 'status', label: 'Account Status', type: 'select',
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Deactivated', value: 'Deactivated' }
      ],
      defaultValue: editingEntity?.status || 'Active',
      required: true
    }
  ];

  const handleRegisterEntity = async (formData: any) => {
    const isEditing = !!editingEntity;
    const loadingToast = toast.loading(isEditing ? 'Updating record...' : 'Registering member and creating account...');
    const resolvedClassId = formData.class_id || selectedDepartmentForMembers?.id || departments.find((d: any) => d.name?.toLowerCase() === 'main')?.id || departments[0]?.id;
    const payload = {
      ...formData,
      class_id: resolvedClassId,
      school_id: String(orgId),
      section: formData.section || '',
      notes: formData.section ? `Section: ${formData.section}` : (formData.notes || null),
    };
    try {
      if (isEditing) {
        await api.put(`/students/${editingEntity.id}`, payload);
        toast.success('Profile updated!', { id: loadingToast });
        setEntityView('list');
        setEditingEntity(null);
        fetchEntities();
      } else {
        const response = await api.post('/students/register', payload);
        toast.success('Registration complete!', { id: loadingToast });
        setGeneratedEntityCreds({
          ...response.data.credentials,
          studentId: response.data.student.id
        });
      }
    } catch (err) {
      toast.error('Action failed. Check if ID exists.', { id: loadingToast });
    }
  };

  const handleCopyCreds = () => {
    const text = `Username: ${generatedEntityCreds.username}\nPassword: ${generatedEntityCreds.password}`;
    navigator.clipboard.writeText(text);
    setHasCopiedCreds(true);
    toast.success('Credentials copied to clipboard!');
    setTimeout(() => setHasCopiedCreds(false), 2000);
  };

  const handleConfirmedDeleteEntity = async () => {
    if (!deleteEntityConfirm.id) return;
    const loadingToast = toast.loading('Deleting record...');
    setDeleteEntityConfirm({ isOpen: false, id: null });
    try {
      await api.delete(`/students/${deleteEntityConfirm.id}`);
      toast.success('Record and access account purged', { id: loadingToast });
      fetchEntities();
    } catch (err) {
      toast.error('Failed to delete', { id: loadingToast });
    }
  };

  const handleConfirmedResetEntity = async () => {
    if (!resetEntityConfirm.entity) return;
    const entity = resetEntityConfirm.entity;
    const loadingToast = toast.loading('Generating secure access...');
    setResetEntityConfirm({ isOpen: false, entity: null });

    try {
      const response = await api.post(`/students/${entity.id}/reset-password`);
      setCredsModal({
        isOpen: true,
        data: {
          full_name: entity.full_name,
          username: response.data.username,
          password: response.data.newPassword
        }
      });
      toast.success('Access keys updated!', { id: loadingToast });
    } catch (err) {
      toast.error('Failed to reset access', { id: loadingToast });
    }
  };

  // CSV Export for locked organization list
  const downloadCSV = () => {
    const listToExport = selectedDepartmentForMembers
      ? entities.filter(e => {
          if (String(e.department_id) === String(selectedDepartmentForMembers.id)) return true;
          if ((selectedDepartmentForMembers.name || '').trim().toLowerCase() === 'main' && (!e.department_id || !e.departments)) return true;
          return false;
        })
      : entities;

    if (listToExport.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Full Name', 'Reference ID', 'Organization', 'Department / Unit', 'Section', 'Gender', 'Status', 'Measurement Status', 'Onboarded Date'];
    const rows = listToExport.map(e => [
      `"${e.full_name}"`,
      `"${e.admission_no}"`,
      `"${org?.name || 'Main Registry'}"`,
      `"${e.departments?.name || (selectedDepartmentForMembers?.name || 'Main')}"`,
      `"${getMemberSection(e) || '—'}"`,
      `"${e.gender || 'Male'}"`,
      `"${e.status || 'Active'}"`,
      `"${e.measurement_status || 'Missing'}"`,
      `"${formatDate(e.created_at)}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const deptTag = selectedDepartmentForMembers ? `_${selectedDepartmentForMembers.name.replace(/\s+/g, '_')}` : '';
    link.setAttribute('download', `entity_directory_${(org?.name || 'Customer').replace(/\s+/g, '_')}${deptTag}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Directory Exported');
  };

  // Bulk Import logic inside Dynamic Details Page
  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const rawData = XLSX.utils.sheet_to_json(ws);

          if (rawData.length === 0) {
            toast.error('The selected file is empty');
            return;
          }

          setBulkData(rawData);
          setBulkFile(selectedFile);
          toast.success(`Loaded ${rawData.length} records from Excel`);
        } catch (err) {
          toast.error('Failed to parse Excel file.');
        }
      };
      reader.readAsBinaryString(selectedFile);
    }
  };

  const handleBulkUploadSubmit = async () => {
    if (bulkData.length === 0) return;

    setIsBulkUploading(true);
    const loadingToast = toast.loading(`Importing ${bulkData.length} records...`);

    try {
      const payload = bulkData.map(item => {
        const findVal = (keys: string[]) => {
          for (const k of keys) {
            if (item[k] !== undefined && item[k] !== null && String(item[k]).trim() !== '') {
              return item[k];
            }
          }
          const itemKeys = Object.keys(item);
          for (const k of keys) {
            const match = itemKeys.find(ik => ik.toLowerCase().trim() === k.toLowerCase().trim());
            if (match && item[match] !== undefined && item[match] !== null && String(item[match]).trim() !== '') {
              return item[match];
            }
          }
          return '';
        };

        const deptRaw = findVal(['Department / Class', 'Department/Class', 'Department', 'Class', 'Grade', 'Standard', 'Section', 'Division', 'Department ID', 'Class ID', 'department_id', 'class_id']);
        const sectionVal = findVal(['Section', 'Division', 'section', 'division']);

        return {
          full_name: findVal(['Full Name', 'Name', 'Student Name', 'Member Name', 'full_name', 'Employee Name']),
          admission_no: String(findVal(['Admission / Employee ID (Optional)', 'Admission / Employee ID', 'Admission No / Roll No', 'Admission No', 'Roll No', 'Employee ID', 'Emp ID', 'Reference ID', 'ID', 'admission_no', 'Reg No', 'Registration No', 'Code']) || ''),
          organization_id: String(orgId),
          department_id: deptRaw && String(deptRaw).trim() !== '' ? String(deptRaw).trim() : (selectedDepartmentForMembers?.name || 'Main'),
          section: sectionVal || '',
          contact_mobile: String(findVal(['Mobile (Optional)', 'Mobile', 'Mobile Number', 'Phone', 'contact_mobile', 'Contact', 'Mobile No', 'Phone Number', 'contact_number']) || ''),
          gender: findVal(['Gender', 'gender', 'Sex']) || 'Male'
        };
      });

      const response = await api.post('/members/bulk-register', { members: payload });
      setBulkResults({ 
        success: response.data.successCount, 
        failed: response.data.errorCount,
        errors: response.data.errors || []
      });
      if (response.data.successCount > 0) {
        toast.success(`Successfully imported ${response.data.successCount} members!`, { id: loadingToast });
      } else {
        toast.error(`Import failed for all ${response.data.errorCount} records. Check error details below.`, { id: loadingToast });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Bulk upload failed', { id: loadingToast });
    } finally {
      setIsBulkUploading(false);
    }
  };

  // Memoized Transaction Datasets for Customer Scoped Sub-Tab Tables
  const customerQuotes = quotations;

  const customerPayments = React.useMemo(() => {
    if (ledgerData?.payments && ledgerData.payments.length > 0) {
      return ledgerData.payments;
    }
    return (ledgerData?.transactions?.filter((t: any) => t.type === 'PAYMENT') || []).map((t: any) => ({
      id: t.raw_id || t.id,
      amount: t.credit,
      payment_method: t.payment_mode || 'Bank Transfer',
      reference_no: t.reference_no,
      order_ref: t.order_ref,
      notes: t.notes,
      paid_at: t.date,
      created_at: t.date
    }));
  }, [ledgerData?.payments, ledgerData?.transactions]);

  const customerOrders = React.useMemo(() => {
    const rawOrders = (ledgerData?.orders && ledgerData.orders.length > 0)
      ? ledgerData.orders
      : (orgDetails?.orders || []);

    return rawOrders.map((ord: any) => {
      const linkedQuote = ord.quotations || quotations.find((q: any) => 
        (ord.quotation_id && String(q.id) === String(ord.quotation_id)) ||
        (ord.quotation_no && q.quotation_no === ord.quotation_no) ||
        (ord.quotations?.id && String(q.id) === String(ord.quotations.id)) ||
        (ord.quotations?.quotation_no && q.quotation_no === ord.quotations.quotation_no) ||
        (Array.isArray(q.orders) && q.orders.some((o: any) => o.id === ord.id || o.order_no === ord.order_no)) ||
        (q.order_no && q.order_no === ord.order_no)
      );

      const expDate = ord.target_delivery_date 
        || ord.delivery_date
        || linkedQuote?.target_delivery_date 
        || linkedQuote?.expected_delivery_date 
        || linkedQuote?.delivery_date
        || ord.expected_delivery_date 
        || ord.expected_date 
        || linkedQuote?.quotation_date 
        || linkedQuote?.created_at 
        || null;

      const quoteVal = linkedQuote?.final_quote_value !== undefined 
        ? parseFloat(String(linkedQuote.final_quote_value))
        : parseFloat(String(ord.total_amount || 0));

      return {
        ...ord,
        quotations: linkedQuote || ord.quotations,
        quotation_id: ord.quotation_id || linkedQuote?.id,
        expected_delivery_date: expDate,
        target_delivery_date: expDate,
        total_amount: quoteVal,
        amount: quoteVal,
        so_amount: quoteVal
      };
    });
  }, [ledgerData?.orders, orgDetails?.orders, quotations]);

  const customerShipments = React.useMemo(() => {
    return deliveryChallans.map((dc: any) => {
      const linkedOrder = customerOrders.find((o: any) => o.id === dc.order_id || o.order_no === dc.orders?.order_no);
      const linkedQuote = dc.orders?.quotations || quotations.find((q: any) => q.id === linkedOrder?.quotation_id || (linkedOrder?.quotations && q.id === linkedOrder.quotations.id));
      const customerName = dc.orders?.quotations?.organizations?.name || org?.name || '—';
      const desc = linkedQuote?.title || linkedOrder?.quotations?.title || dc.notes || 'Uniform Apparel Shipment';
      const sp = linkedQuote?.sales_person?.full_name 
        || linkedQuote?.sales_person?.name 
        || org?.relationship_manager?.full_name 
        || employees.find((e: any) => e.id === (linkedQuote?.sales_person_id || org?.relationship_manager_id))?.full_name 
        || 'Unassigned';

      const effectiveDCNo = dc.dc_no && dc.dc_no.startsWith('DC-') 
        ? dc.dc_no 
        : formatDocumentNumber({ prefix: 'DC', branch: dc.branch_id || org?.branch_id, date: dc.dispatch_date || dc.created_at, seq: dc.id || 1 });
      const effectiveOrderNo = dc.orders?.order_no || linkedOrder?.order_no || (dc.order_id ? formatDocumentNumber({ prefix: 'SO', branch: dc.branch_id || org?.branch_id, date: dc.created_at, seq: dc.order_id }) : '—');

      return {
        id: dc.id,
        date: dc.dispatch_date || dc.created_at,
        dc_no: effectiveDCNo,
        order_no: effectiveOrderNo,
        customer_name: customerName,
        description: desc,
        sales_person: sp,
        order_update: dc.notes || linkedOrder?.latest_update || linkedOrder?.order_update || 'Dispatched for delivery',
        shipment_date: dc.dispatch_date || dc.created_at,
        carrier: dc.transporter_name || dc.carrier || 'Standard Logistics',
        lr_no: dc.lr_no || dc.lorry_receipt_no || dc.tracking_no || dc.vehicle_no || '—',
        transporter_contact: dc.transporter_contact || dc.transporter_phone || dc.driver_phone || '—',
        total_packages: dc.total_packages || 1,
        eway_bill_no: dc.eway_bill_no || dc.eway_bill || dc.e_way_bill || '—',
        status: dc.status || 'Dispatched',
        notes: dc.notes || '—',
        raw: dc
      };
    });
  }, [deliveryChallans, customerOrders, quotations, org, employees]);

  const customerPackages = React.useMemo(() => {
    const list: any[] = [];
    deliveryChallans.forEach((dc: any) => {
      // Create packaging rows only once packaging is done (no awaiting status)
      const dcStatus = dc.status || 'Packed';
      if (dcStatus.toLowerCase().includes('awaiting')) return;

      const count = Math.max(1, parseInt(dc.total_packages, 10) || 1);
      const linkedOrder = customerOrders.find((o: any) => o.id === dc.order_id || o.order_no === dc.orders?.order_no);
      const linkedQuote = dc.orders?.quotations || quotations.find((q: any) => q.id === linkedOrder?.quotation_id || (linkedOrder?.quotations && q.id === linkedOrder.quotations.id));
      const customerName = dc.orders?.quotations?.organizations?.name || org?.name || '—';
      const desc = linkedQuote?.title || linkedOrder?.quotations?.title || dc.notes || 'Uniform Apparel Shipment';
      const sp = linkedQuote?.sales_person?.full_name 
        || linkedQuote?.sales_person?.name 
        || org?.relationship_manager?.full_name 
        || employees.find((e: any) => e.id === (linkedQuote?.sales_person_id || org?.relationship_manager_id))?.full_name 
        || 'Unassigned';

      const effectiveDCNo = dc.dc_no && dc.dc_no.startsWith('DC-') 
        ? dc.dc_no 
        : formatDocumentNumber({ prefix: 'DC', branch: dc.branch_id || org?.branch_id, date: dc.dispatch_date || dc.created_at, seq: dc.id || 1 });
      const basePKNo = effectiveDCNo.replace(/^DC-/, 'PK-');
      const effectiveOrderNo = dc.orders?.order_no || linkedOrder?.order_no || (dc.order_id ? formatDocumentNumber({ prefix: 'SO', branch: dc.branch_id || org?.branch_id, date: dc.created_at, seq: dc.order_id }) : '—');

      if (count <= 6) {
        for (let i = 1; i <= count; i++) {
          list.push({
            id: `PKG-${basePKNo}-${i}`,
            package_no: count === 1 ? basePKNo : `${basePKNo}-BX${String(i).padStart(2, '0')}`,
            order_no: effectiveOrderNo,
            customer_name: customerName,
            description: desc,
            sales_person: sp,
            stage_status: dcStatus,
            order_update: dc.notes || `Packed carton #${i} of ${count}`,
            shipment_date: dc.dispatch_date || dc.created_at,
            carton_label: `Carton ${i} of ${count}`,
            date: dc.dispatch_date || dc.created_at,
            carrier: dc.transporter_name || 'Inland Logistics / Courier',
            vehicle_no: dc.vehicle_no || '—',
            status: dcStatus,
            notes: dc.notes || 'Consolidated uniform garments'
          });
        }
      } else {
        list.push({
          id: `PKG-${basePKNo}-BULK`,
          package_no: `${basePKNo}-BX01~${count}`,
          order_no: effectiveOrderNo,
          customer_name: customerName,
          description: desc,
          sales_person: sp,
          stage_status: dcStatus,
          order_update: dc.notes || `Consolidated bulk dispatch of ${count} cartons`,
          shipment_date: dc.dispatch_date || dc.created_at,
          carton_label: `Bulk Dispatch (${count} Cartons)`,
          date: dc.dispatch_date || dc.created_at,
          carrier: dc.transporter_name || 'Inland Logistics / Courier',
          vehicle_no: dc.vehicle_no || '—',
          status: dcStatus,
          notes: dc.notes || `${count} uniform shipment cartons`
        });
      }
    });

    return list;
  }, [deliveryChallans, customerOrders, quotations, org, employees]);

  const customerInvoices = React.useMemo(() => {
    const rawInvoices = (ledgerData?.invoices && ledgerData.invoices.length > 0)
      ? ledgerData.invoices
      : (ledgerData?.transactions?.filter((t: any) => t.type === 'INVOICE') || []);

    const allOrders = customerOrders || ledgerData?.orders || orgDetails?.orders || [];

    return rawInvoices.map((inv: any) => {
      const linkedOrder = allOrders.find(
        (o: any) => o.id === inv.order_id || (inv.quotation_id && o.quotation_id === inv.quotation_id)
      );
      const linkedQuote = quotations.find((q: any) => 
        (inv.quotation_id && q.id === inv.quotation_id) || 
        (linkedOrder?.quotation_id && q.id === linkedOrder.quotation_id)
      ) || linkedOrder?.quotations;

      const resolvedOrderNo = inv.order_no || linkedOrder?.order_no || inv.order_ref || (inv.sale_type === 'retail' ? 'Retail Direct' : '—');
      const totalAmt = parseFloat(String(inv.total_amount !== undefined ? inv.total_amount : (inv.debit || 0)));

      // Find all payments and advance credits matching this invoice, order, or linked quotation
      const matchingPayments = customerPayments.filter((p: any) => {
        if (p.order_id && inv.order_id && String(p.order_id) === String(inv.order_id)) return true;
        if (linkedQuote?.id && p.quotation_id && String(p.quotation_id) === String(linkedQuote.id)) return true;
        if (inv.quotation_id && p.quotation_id && String(p.quotation_id) === String(inv.quotation_id)) return true;
        if (inv.invoice_no && (p.invoice_no === inv.invoice_no || p.order_ref === inv.invoice_no)) return true;
        if (inv.invoice_no && p.notes && p.notes.includes(inv.invoice_no)) return true;
        return false;
      });

      const paymentsSum = matchingPayments.reduce((acc: number, p: any) => acc + parseFloat(String(p.amount || 0)), 0);
      const quoteCredit = parseFloat(String(linkedQuote?.paid_amount || 0));
      const directPaid = parseFloat(String(inv.paid_amount || 0));
      const totalCredits = Math.max(paymentsSum, quoteCredit, directPaid);

      const paidAmt = Math.min(totalAmt, totalCredits > 0 ? totalCredits : ((inv.status === 'Fully Paid' || inv.status === 'Paid') ? totalAmt : 0));
      const dueAmt = Math.max(0, totalAmt - paidAmt);

      let paymentStatus = inv.payment_status || inv.status || 'Unpaid';
      if (dueAmt <= 0 && totalAmt > 0) {
        paymentStatus = 'Fully Paid';
      } else if (paidAmt > 0) {
        paymentStatus = 'Partially Paid';
      }

      const sp = inv.sales_person?.full_name 
        || inv.sales_person?.name 
        || linkedQuote?.sales_person?.full_name 
        || linkedOrder?.sales_person?.full_name 
        || org?.relationship_manager?.full_name 
        || employees.find((e: any) => e.id === (inv.sales_person_id || linkedQuote?.sales_person_id || org?.relationship_manager_id))?.full_name 
        || 'Unassigned';

      const stageStatus = inv.stage_status || inv.stage || linkedOrder?.stage_status || linkedOrder?.stage || (dueAmt <= 0 ? 'Closed' : 'Active');

      return {
        ...inv,
        date: inv.invoice_date || inv.created_at || inv.date,
        invoice_no: inv.invoice_number || inv.invoice_no || inv.reference_no || formatDocumentNumber({ prefix: 'INV', branch: inv.branch_id || org?.branch_id, date: inv.invoice_date || inv.created_at || inv.date, seq: inv.id || 1 }),
        order_no: resolvedOrderNo,
        customer_name: org?.name || inv.organizations?.name || '—',
        sales_person: sp,
        stage_status: stageStatus,
        total_amount: totalAmt,
        paid_amount: paidAmt,
        existing_credits: paidAmt,
        due_amount: dueAmt,
        remaining_amount: dueAmt,
        payment_status: paymentStatus
      };
    });
  }, [ledgerData?.invoices, ledgerData?.transactions, customerOrders, ledgerData?.orders, orgDetails?.orders, quotations, customerPayments, org, employees]);

  const customerExpenses = React.useMemo(() => {
    const list: any[] = [];

    // 1. Include manually recorded expenses
    (manualExpenses || []).forEach((m: any) => {
      list.push({
        ...m,
        is_manual: true,
        customer_name: m.customer_name || org?.name || '—'
      });
    });

    // 2. Expenses linked to confirmed sales orders
    if (customerOrders && customerOrders.length > 0) {
      customerOrders.forEach((ord: any, ordIdx: number) => {
        const ordVal = parseFloat(ord.total_amount || ord.quotations?.final_quote_value || 0);
        const totalExp = parseFloat(ord.quotations?.estimated_expenses || 0);
        const fabricExp = totalExp > 0 ? (totalExp * 0.65) : (ordVal * 0.45);
        const trimExp = totalExp > 0 ? (totalExp * 0.20) : (ordVal * 0.12);
        const opsExp = totalExp > 0 ? (totalExp * 0.15) : (ordVal * 0.08);

        const baseExpNo = formatDocumentNumber({
          prefix: 'EXP',
          branch: ord.branch_id || org?.branch_id,
          date: ord.order_date || ord.created_at,
          seq: ordIdx + 1
        });
        const custName = ord.quotations?.organizations?.name || org?.name || '—';
        const sp = ord.quotations?.sales_person?.full_name 
          || ord.quotations?.sales_person?.name 
          || ord.sales_person?.full_name 
          || org?.relationship_manager?.full_name 
          || employees.find((e: any) => e.id === (ord.quotations?.sales_person_id || org?.relationship_manager_id))?.full_name 
          || 'Unassigned';

        if (ordVal > 0 || totalExp > 0) {
          list.push({
            id: `EXP-ORD-${ord.id}-01`,
            voucher_no: `${baseExpNo}/01`,
            expense_ref: `${baseExpNo}/01`,
            date: ord.order_date || ord.created_at,
            category: 'Fabric & Raw Materials',
            so_no: ord.order_no,
            order_no: ord.order_no,
            linked_ref: ord.order_no,
            customer_name: custName,
            sales_person: sp,
            description: `Textile & milling procurement for ${ord.order_no} (${ord.quotations?.title || 'Client Uniforms'})`,
            amount: fabricExp,
            status: 'Allocated'
          });
          list.push({
            id: `EXP-ORD-${ord.id}-02`,
            voucher_no: `${baseExpNo}/02`,
            expense_ref: `${baseExpNo}/02`,
            date: ord.order_date || ord.created_at,
            category: 'Trims, Buttons & Labels',
            so_no: ord.order_no,
            order_no: ord.order_no,
            linked_ref: ord.order_no,
            customer_name: custName,
            sales_person: sp,
            description: `Custom branded trims, embroidery & accessories for ${ord.order_no}`,
            amount: trimExp,
            status: 'Allocated'
          });
          list.push({
            id: `EXP-ORD-${ord.id}-03`,
            voucher_no: `${baseExpNo}/03`,
            expense_ref: `${baseExpNo}/03`,
            date: ord.order_date || ord.created_at,
            category: 'Sampling & Pattern Development',
            so_no: ord.order_no,
            order_no: ord.order_no,
            linked_ref: ord.order_no,
            customer_name: custName,
            sales_person: sp,
            description: `CAD sizing, grade digitisation & pre-production sample for ${ord.order_no}`,
            amount: opsExp,
            status: 'Allocated'
          });
        }
      });
    } else {
      // Fallback: If no orders placed yet, link quotations with their corresponding order number
      quotations.forEach((q: any, qIdx: number) => {
        const totalExp = parseFloat(q.estimated_expenses || 0);
        const quoteVal = parseFloat(q.final_quote_value || 0);
        const fabricExp = totalExp > 0 ? (totalExp * 0.65) : (quoteVal * 0.45);
        const trimExp = totalExp > 0 ? (totalExp * 0.20) : (quoteVal * 0.12);
        const opsExp = totalExp > 0 ? (totalExp * 0.15) : (quoteVal * 0.08);

        const matchingOrder = customerOrders?.find((o: any) => o.quotation_id === q.id || o.quotations?.id === q.id);
        const orderNo = matchingOrder?.order_no || (q.order_no ? q.order_no : `ORD-${q.quotation_no?.replace(/^QT-?/i, '') || q.id}`);

        const baseExpNo = formatDocumentNumber({
          prefix: 'EXP',
          branch: q.branch_id || org?.branch_id,
          date: q.quotation_date || q.created_at,
          seq: qIdx + 1
        });
        const custName = q.organizations?.name || org?.name || '—';
        const sp = q.sales_person?.full_name 
          || q.sales_person?.name 
          || org?.relationship_manager?.full_name 
          || employees.find((e: any) => e.id === (q.sales_person_id || org?.relationship_manager_id))?.full_name 
          || 'Unassigned';

        if (quoteVal > 0 || totalExp > 0) {
          list.push({
            id: `EXP-${q.id}-01`,
            voucher_no: `${baseExpNo}/01`,
            expense_ref: `${baseExpNo}/01`,
            date: q.created_at,
            category: 'Fabric & Raw Materials',
            so_no: orderNo,
            order_no: orderNo,
            linked_ref: orderNo,
            customer_name: custName,
            sales_person: sp,
            description: `Textile & milling procurement for ${q.title || 'Client Uniforms'}`,
            amount: fabricExp,
            status: 'Allocated'
          });
          list.push({
            id: `EXP-${q.id}-02`,
            voucher_no: `${baseExpNo}/02`,
            expense_ref: `${baseExpNo}/02`,
            date: q.created_at,
            category: 'Trims, Buttons & Labels',
            so_no: orderNo,
            order_no: orderNo,
            linked_ref: orderNo,
            customer_name: custName,
            sales_person: sp,
            description: `Custom branded trims, embroidery & accessories`,
            amount: trimExp,
            status: 'Allocated'
          });
          list.push({
            id: `EXP-${q.id}-03`,
            voucher_no: `${baseExpNo}/03`,
            expense_ref: `${baseExpNo}/03`,
            date: q.created_at,
            category: 'Sampling & Pattern Development',
            so_no: orderNo,
            order_no: orderNo,
            linked_ref: orderNo,
            customer_name: custName,
            sales_person: sp,
            description: `CAD sizing, grade digitisation & pre-production sample`,
            amount: opsExp,
            status: 'Allocated'
          });
        }
      });
    }
    return list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [customerOrders, quotations, manualExpenses, org?.name]);

  // Memoized Financial Journals (Strictly custom added through the Journal tab - no invoices, payments, or other automatic entries)
  const customerJournals = React.useMemo(() => {
    const list: any[] = [];

    customJournals.forEach((cj: any) => {
      // Strictly skip any non-custom entries (e.g. Invoices, Payments, etc.)
      const cat = (cj.category || '').toLowerCase();
      const idStr = String(cj.id || '');
      if (
        cat === 'sales invoice' ||
        cat === 'customer payment' ||
        cat === 'invoice' ||
        cat === 'payment' ||
        idStr.startsWith('jn-inv-') ||
        idStr.startsWith('jn-pay-')
      ) {
        return;
      }

      const debitVal = parseFloat(String(cj.total_debit || cj.debit || 0));
      const creditVal = parseFloat(String(cj.total_credit || cj.credit || 0));
      const effectiveJvNo = cj.journal_no && cj.journal_no.startsWith('JV-')
        ? cj.journal_no
        : (cj.journal_no && cj.journal_no.startsWith('JN-')
            ? cj.journal_no.replace(/^JN-/, 'JV-')
            : formatDocumentNumber({ prefix: 'JV', branch: org?.branch_id, date: cj.date || cj.created_at, seq: cj.id || 1 }));

      const effectiveDesc = cj.title && cj.notes 
        ? `${cj.title} — ${cj.notes}`
        : (cj.title || cj.notes || cj.narration || (cj.rows ? cj.rows.map((r: any) => r.description).filter(Boolean).join('; ') : 'Manual double-entry voucher'));

      list.push({
        id: cj.id,
        journal_no: effectiveJvNo,
        voucher_no: effectiveJvNo,
        ref: cj.reference_no || effectiveJvNo,
        date: cj.date || cj.created_at,
        customer_name: org?.name || '—',
        category: 'Manual Journal',
        account: cj.account_summary || cj.account || 'Custom Manual Journal',
        offset_account: cj.offset_summary || cj.offset_account || 'General Ledger',
        title: cj.title || `Manual Journal #${effectiveJvNo}`,
        description: effectiveDesc,
        narration: cj.notes || cj.narration || effectiveDesc,
        order_ref: cj.reference_no || 'Manual JV',
        amount: Math.max(debitVal, creditVal),
        debit: debitVal,
        credit: creditVal,
        status: cj.status || 'Posted',
        icon: BookOpen,
        icon_bg: 'bg-purple-50 text-purple-700 border-purple-200'
      });
    });

    // Sorted chronologically (newest to oldest)
    return list.sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeB - timeA;
    });
  }, [customJournals]);

  const customerProFormaInvoices = React.useMemo(() => {
    const allOrders = [
      ...(Array.isArray(customerOrders) ? customerOrders : []),
      ...(Array.isArray(ledgerData?.orders) ? ledgerData.orders : []),
      ...(Array.isArray(orgDetails?.orders) ? orgDetails.orders : [])
    ];

    const list = quotations.map((q: any) => {
      const piNo = q.quotation_no && q.quotation_no.startsWith('QT-')
        ? q.quotation_no.replace(/^QT-/, 'PR-')
        : formatDocumentNumber({ prefix: 'PR', branch: q.branch_id || org?.branch_id, date: q.quotation_date || q.created_at, seq: q.id || 1 });
      
      const linkedOrder =
        (Array.isArray(q.orders) && q.orders.length > 0 ? q.orders[0] : null) ||
        (q.order ? q.order : null) ||
        allOrders.find(
          (o: any) =>
            (o.quotation_id && q.id && String(o.quotation_id) === String(q.id)) ||
            (o.quotations?.id && q.id && String(o.quotations.id) === String(q.id)) ||
            (o.quotations?.quotation_no && q.quotation_no && String(o.quotations.quotation_no).trim().toLowerCase() === String(q.quotation_no).trim().toLowerCase()) ||
            (o.order_no && (q.order_no === o.order_no || q.title?.includes(o.order_no)))
        ) ||
        (q.order_no ? { order_no: q.order_no } : null);

      const resolvedOrderNo = linkedOrder?.order_no || (Array.isArray(q.orders) && q.orders[0]?.order_no) || q.order_no || '—';
      const hasOrder = Boolean(resolvedOrderNo && resolvedOrderNo !== '—');

      let piStatus = 'Active PI';
      if (hasOrder) {
        piStatus = 'Converted to Order';
      } else if (q.status === 'Accepted') {
        piStatus = 'Ready for Order Issue';
      } else if (q.status === 'Rejected') {
        piStatus = 'Cancelled';
      } else if (q.status === 'Sent') {
        piStatus = 'Pending Advance Clearance';
      } else {
        piStatus = 'Draft PI';
      }

      const sp = q.sales_person?.full_name
        || q.sales_person?.name
        || linkedOrder?.sales_person?.full_name
        || org?.relationship_manager?.full_name
        || employees.find((e: any) => e.id === (q.sales_person_id || org?.relationship_manager_id))?.full_name
        || 'Unassigned';

      return {
        id: q.id,
        pi_no: piNo,
        order_no: resolvedOrderNo,
        customer_name: q.organizations?.name || org?.name || '—',
        sales_person: sp,
        date: q.quotation_date || q.created_at,
        validity_days: org?.credit_period_days || 30,
        title: q.title,
        type: q.quotation_type || q.metrics_summary?.quotation_type || 'Commercial Bulk',
        amount: parseFloat(q.final_quote_value || '0'),
        status: piStatus,
        raw: q
      };
    });

    // Also include any customerOrders that might not be mapped to quotations directly
    allOrders.forEach((ord: any) => {
      if (!ord || !ord.order_no) return;
      const alreadyIncluded = list.some(
        (item: any) =>
          (ord.quotation_id && String(item.id) === String(ord.quotation_id)) ||
          item.order_no === ord.order_no
      );
      if (!alreadyIncluded) {
        const linkedQuote = quotations.find((q: any) => q.id === ord.quotation_id) || ord.quotations;
        const sp = ord.sales_person?.full_name
          || ord.sales_person?.name
          || linkedQuote?.sales_person?.full_name
          || org?.relationship_manager?.full_name
          || employees.find((e: any) => e.id === (ord.sales_person_id || linkedQuote?.sales_person_id || org?.relationship_manager_id))?.full_name
          || 'Unassigned';

        list.push({
          id: ord.quotation_id || ord.id,
          pi_no: `PI-${ord.quotation_id || ord.id}`,
          order_no: ord.order_no,
          customer_name: ord.organizations?.name || org?.name || '—',
          sales_person: sp,
          date: ord.order_date || ord.created_at,
          validity_days: org?.credit_period_days || 30,
          title: ord.quotations?.title || `Apparel Manufacturing Order ${ord.order_no}`,
          type: ord.quotations?.quotation_type || 'Commercial Bulk',
          amount: parseFloat(ord.total_amount || ord.quotations?.final_quote_value || '0'),
          status: 'Converted to Order',
          raw: ord.quotations || ord
        });
      }
    });

    return list;
  }, [quotations, customerOrders, ledgerData?.orders, orgDetails?.orders, org, employees]);

  if (isLoadingOrg) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-12 h-12 border-4 border-[#C82A2B]/20 border-t-[#C82A2B] rounded-full animate-spin" />
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Loading organization details...</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-zinc-100">
        <h3 className="text-xl font-bold text-zinc-700">Customer Not Found</h3>
        <Button onClick={() => router.push('/customers')} className="mt-4">
          Back to Customers
        </Button>
      </div>
    );
  }

  const renderStatusCapsule = (state: 'none' | 'partial' | 'full', tooltip: string) => {
    if (state === 'none') {
      return (
        <span className="text-zinc-400 font-bold text-xs" title={`${tooltip}: Not Done`}>
          —
        </span>
      );
    }

    const isFull = state === 'full';

    return (
      <div 
        className="inline-flex items-center justify-center cursor-default select-none" 
        title={`${tooltip}: ${isFull ? 'Completed Fully' : 'Partially Done'}`}
      >
        <div 
          className="w-7 h-3 rounded-full border border-[#C82A2B] bg-white overflow-hidden flex items-stretch shadow-2xs"
          style={{ borderColor: '#C82A2B', backgroundColor: '#ffffff' }}
        >
          <div 
            className={`h-full bg-[#C82A2B] ${isFull ? 'w-full' : 'w-1/2'}`} 
            style={{ backgroundColor: '#C82A2B', width: isFull ? '100%' : '50%' }}
          />
          {!isFull && <div className="w-1/2 h-full bg-white" style={{ width: '50%', backgroundColor: '#ffffff' }} />}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header section with Details & Action Toolbar */}
      <div className="bg-white p-5 md:p-6 rounded-[2rem] shadow-sm border border-zinc-100 space-y-2.5">
        {/* Top Row: Back button + Customer Name on the left, Tab Buttons & 3 Dots on the right */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Left: Back button + Name */}
          <div className="flex items-center gap-3 min-w-0">
            <Button
              onClick={() => router.push(isClientUser ? '/dashboard' : '/customers')}
              variant="secondary"
              className="w-9 h-9 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-center text-zinc-500 hover:bg-[#C82A2B] hover:text-white transition-all shadow-2xs !p-0 shrink-0 cursor-pointer"
            >
              <ArrowLeft size={16} />
            </Button>
            <h1 className="text-xl md:text-2xl font-black italic tracking-tighter text-zinc-900 truncate">
              {org.name}
            </h1>
          </div>

          {/* Right: Tab Switcher Buttons & 3-dots Actions Button on the same line */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <div className="flex bg-zinc-100/90 p-1 rounded-xl border border-zinc-200/60 gap-1 overflow-x-auto">
              {(isClientUser 
                ? (['overview', 'departments', 'ledger'] as const)
                : (['overview', 'departments', 'transactions', 'ledger'] as const)
              ).map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab as any);
                    setEntityView('list');
                    setIsAddingDept(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeTab === tab
                    ? 'bg-[#C82A2B] text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50'
                    }`}
                >
                  {tab === 'transactions' && <CreditCard size={13} className={activeTab === 'transactions' ? 'text-white' : 'text-zinc-400'} />}
                  {tab === 'ledger' && <ReceiptText size={13} className={activeTab === 'ledger' ? 'text-white' : 'text-zinc-400'} />}
                  {tab === 'ledger' ? 'Statement' : tab === 'transactions' ? 'Transactions' : tab}
                </button>
              ))}
            </div>

            {/* Customer Management Actions Dropdown (For Staff) */}
            {!isClientUser && (
              <div className="relative shrink-0" ref={actionsDropdownRef}>
                <Button
                  onClick={() => setIsActionsDropdownOpen(!isActionsDropdownOpen)}
                  variant="none"
                  className="h-8 md:h-9 w-8 md:w-9 p-0 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 transition-all shadow-xs flex items-center justify-center cursor-pointer"
                  title="More actions"
                >
                  <MoreVertical size={16} />
                </Button>

                {isActionsDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-zinc-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsDropdownOpen(false);
                        setIsEditingCustomer(true);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-bold text-zinc-800 hover:bg-[#FFF1F1] hover:text-[#C82A2B] flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Edit2 size={13} className="text-[#C82A2B]" />
                      <span>Edit Profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsDropdownOpen(false);
                        handleResetPassword();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-bold text-zinc-800 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Key size={13} className="text-amber-600" />
                      <span>Reset Password</span>
                    </button>

                    <div className="my-1 border-t border-zinc-100" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsDropdownOpen(false);
                        setDeleteCustomerConfirm({ isOpen: true });
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} className="text-red-500" />
                      <span>Delete Customer</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Second Row: Customer ID, Sector, Onboarding Date & Status Badges */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 pl-0 md:pl-12 pt-0.5 border-t border-zinc-100/80">
          <span className="px-2 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-650 rounded-lg text-[9px] font-black uppercase tracking-wider shrink-0">
            {org.customer_code ? `Code: ${org.customer_code}` : `ID: #${org.id}`}
          </span>
          <span className="text-[10px] font-black text-[#C82A2B] uppercase tracking-widest shrink-0">
            {org.industries?.name || 'School Sector'}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-50 border border-zinc-200/80 text-zinc-600 rounded-lg text-[9px] font-bold shrink-0">
            <Calendar size={11} className="text-[#C82A2B]" />
            <span>Onboarded: {formatDate(org.created_at)}</span>
          </span>
          {Boolean(org.is_b2b || org.gst_number) && (
            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-300 shrink-0">
              B2B
            </span>
          )}
          {org.is_special && (
            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-300 shrink-0">
              ★ Favourite
            </span>
          )}
          {org.is_risk && (
            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-red-50 text-red-700 border border-red-300 shrink-0">
              ⚠ Risk
            </span>
          )}
          {org.is_active === false && (
            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-zinc-100 text-zinc-500 border border-zinc-200 shrink-0">
              Inactive
            </span>
          )}
        </div>
      </div>

      {/* Tab 1: Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Floating Measurement Quick Action Widget on Right Side (Shows on click only) */}
          {isMeasurementDrawerOpen && (
            <div
              className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]"
              onClick={() => setIsMeasurementDrawerOpen(false)}
            />
          )}
          <div
            className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-stretch transition-transform duration-300 ease-out select-none ${
              isMeasurementDrawerOpen ? 'translate-x-0' : 'translate-x-[calc(100%-32px)]'
            }`}
          >
            {/* Small Compact Icon Tab on Right Edge */}
            <button
              type="button"
              onClick={() => setIsMeasurementDrawerOpen(!isMeasurementDrawerOpen)}
              className="relative w-8 h-9 bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-l-xl flex items-center justify-center shadow-[-4px_2px_12px_rgba(200,42,43,0.3)] border-y border-l border-[#C82A2B]/40 cursor-pointer transition-all shrink-0 active:scale-95"
              title="Measurements & Sizing Quick Actions"
            >
              <Ruler size={14} className="text-white" />

              {(orgDetails?.measurements?.pending || 0) > 0 && (
                <span
                  className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-amber-400 text-zinc-900 text-[8px] font-black flex items-center justify-center shadow-xs animate-pulse ring-1 ring-white"
                  title={`${orgDetails?.measurements?.pending} pending measurements`}
                >
                  {orgDetails?.measurements?.pending}
                </span>
              )}
            </button>

            {/* Pop-out Panel */}
            <div className="w-80 bg-white rounded-l-3xl shadow-[-12px_10px_35px_rgba(0,0,0,0.14)] border-y border-l border-zinc-200 p-5 space-y-4 shrink-0 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FFF1F1] text-[#C82A2B] border border-[#C82A2B]/20 flex items-center justify-center">
                    <Ruler size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-zinc-900 tracking-tight">Sizing & Measurements</h4>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Quick Actions</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMeasurementDrawerOpen(false)}
                  className="w-6 h-6 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Quick Action Cards */}
              <div className="space-y-2.5">
                {/* 1. Total Members */}
                <div
                  onClick={() => {
                    setActiveTab('departments');
                    setSelectedDepartmentForMembers(null);
                    setEntityView('list');
                  }}
                  className="p-3 bg-zinc-50 hover:bg-zinc-100/90 rounded-2xl border border-zinc-150 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-700 group-hover:bg-[#C82A2B] group-hover:text-white flex items-center justify-center transition-colors">
                      <Users size={15} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Total Members</p>
                      <p className="text-base font-black text-zinc-900 leading-none mt-0.5">
                        {orgDetails?.measurements?.total || 0}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-white border border-zinc-200 text-zinc-700 group-hover:bg-[#C82A2B] group-hover:text-white group-hover:border-[#C82A2B] text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-2xs">
                    <span>View</span>
                    <ArrowRight size={10} />
                  </span>
                </div>

                {/* 2. Measurements Captured */}
                <div
                  onClick={() => router.push('/measurements/history')}
                  className="p-3 bg-green-50/50 hover:bg-green-50 rounded-2xl border border-green-200/60 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-green-100 text-green-700 group-hover:bg-green-600 group-hover:text-white flex items-center justify-center transition-colors">
                      <Check size={15} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-green-700">Captured</p>
                      <p className="text-base font-black text-green-700 leading-none mt-0.5">
                        {orgDetails?.measurements?.completed || 0}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-white border border-green-200 text-green-700 group-hover:bg-green-600 group-hover:text-white group-hover:border-green-600 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-2xs">
                    <span>History</span>
                    <ArrowRight size={10} />
                  </span>
                </div>

                {/* 3. Pending Measurements */}
                <div
                  onClick={() => router.push('/measurements/entry')}
                  className="p-3 bg-orange-50/50 hover:bg-orange-50 rounded-2xl border border-orange-200/60 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 group-hover:bg-orange-500 group-hover:text-white flex items-center justify-center transition-colors">
                      <Ruler size={15} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-orange-700">Pending</p>
                      <p className="text-base font-black text-orange-600 leading-none mt-0.5">
                        {orgDetails?.measurements?.pending || 0}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-white border border-orange-200 text-orange-700 group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-2xs">
                    <span>Record</span>
                    <ArrowRight size={10} />
                  </span>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={() => router.push('/measurements/entry')}
                className="w-full h-10 rounded-xl bg-[#C82A2B] hover:bg-[#A81D1E] text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-[#C82A2B]/20 transition-all cursor-pointer active:scale-95"
              >
                <Ruler size={14} />
                <span>Record Sizing Now</span>
              </button>
            </div>
          </div>

          {isClientUser && (
            <div className="p-4 bg-[#FFF1F1] rounded-2xl border border-[#C82A2B]/20 flex items-center gap-3">
              <Building2 className="text-[#C82A2B] shrink-0" size={20} />
              <div>
                <p className="text-xs font-bold text-zinc-900">Organization Client Portal</p>
                <p className="text-[11px] text-zinc-500 font-medium">You are viewing your official organization directory and account records.</p>
              </div>
            </div>
          )}

          {/* Statement & Account Balance KPI Cards */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <ReceiptText size={18} className="text-[#C82A2B]" />
              <h3 className="text-lg font-black text-zinc-900 tracking-tight">Statement & Account Summary</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* 1. Total Invoiced */}
              <div
                onClick={() => setActiveTab('ledger')}
                className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-[#C82A2B]/30 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Invoiced / Orders</span>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ArrowUpRight size={18} />
                  </div>
                </div>
                <div>
                  <h4 className="text-2xl font-black italic tracking-tight text-zinc-900">
                    ₹{parseFloat(String(ledgerData?.summary?.total_invoiced || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h4>
                  <p className="text-[10px] font-bold text-zinc-400 mt-1">
                    {ledgerData?.summary?.total_orders || 0} Orders & {ledgerData?.summary?.total_invoices || 0} Invoices Raised
                  </p>
                </div>
              </div>

              {/* 2. Total Paid */}
              <div
                onClick={() => setActiveTab('ledger')}
                className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-[#C82A2B]/30 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Paid (Credits)</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ArrowDownLeft size={18} />
                  </div>
                </div>
                <div>
                  <h4 className="text-2xl font-black italic tracking-tight text-emerald-600">
                    ₹{parseFloat(ledgerData?.summary?.total_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h4>
                  <p className="text-[10px] font-bold text-emerald-700/70 mt-1">
                    {ledgerData?.summary?.total_payments || 0} Payments / Advances Recorded
                  </p>
                </div>
              </div>

              {/* 3. Outstanding Balance / Credit Balance */}
              <div
                onClick={() => setActiveTab('ledger')}
                className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-[#C82A2B]/30 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {(ledgerData?.summary?.outstanding_balance || 0) < 0 ? 'Customer Credit Balance' : 'Net Outstanding Balance'}
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-[#C82A2B]/10 text-[#C82A2B] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <CreditCard size={18} />
                  </div>
                </div>
                <div>
                  <h4 className={`text-2xl font-black italic tracking-tight ${
                    (ledgerData?.summary?.outstanding_balance || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    ₹{Math.abs(parseFloat(ledgerData?.summary?.outstanding_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h4>
                  <p className="text-[10px] font-bold text-zinc-400 mt-1">
                    {(ledgerData?.summary?.outstanding_balance || 0) > 0 
                      ? 'Pending Amount Due from Client' 
                      : (ledgerData?.summary?.outstanding_balance || 0) < 0 
                      ? 'Credit Available (Amount Paid - Invoices)' 
                      : 'Zero Outstanding / Fully Cleared'}
                  </p>
                </div>
              </div>

              {/* 4. Settlement Status */}
              <div
                onClick={() => setActiveTab('ledger')}
                className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-[#C82A2B]/30 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Settlement Status</span>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${
                    ledgerData?.summary?.settlement_status === 'Settled' || ledgerData?.summary?.settlement_status === 'Credit Balance' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {ledgerData?.summary?.settlement_status === 'Settled' || ledgerData?.summary?.settlement_status === 'Credit Balance' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  </div>
                </div>
                <div>
                  <span className={`inline-block px-3 py-1 text-xs font-black uppercase tracking-wider rounded-xl ${
                    ledgerData?.summary?.settlement_status === 'Settled' || ledgerData?.summary?.settlement_status === 'Credit Balance'
                      ? 'bg-emerald-100 text-emerald-800'
                      : ledgerData?.summary?.settlement_status === 'Partially Paid'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {ledgerData?.summary?.settlement_status || 'Checking...'}
                  </span>
                  <p className="text-[10px] font-bold text-zinc-400 mt-2">
                    {ledgerData?.summary?.total_orders || 0} Orders in Pipeline
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Org details metadata card */}
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-zinc-100 space-y-6">
            <h3 className="text-lg font-black text-zinc-900 tracking-tight">Organization Profile</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                <span className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                  <MapPin size={12} /> Address Location
                </span>
                <div className="space-y-1.5">
                  <p className="text-sm font-bold text-zinc-900">
                    {org.address || (org.city || org.state || org.pincode || org.country ? '' : 'Not registered')}
                  </p>
                  {(org.city || org.state || org.pincode || org.country) && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-zinc-600 pt-0.5">
                      {org.city && (
                        <span className="bg-white px-2.5 py-0.5 rounded-lg border border-zinc-200 shadow-2xs">
                          {org.city}
                        </span>
                      )}
                      {org.state && (
                        <span className="bg-white px-2.5 py-0.5 rounded-lg border border-zinc-200 shadow-2xs">
                          {org.state}
                        </span>
                      )}
                      {org.pincode && (
                        <span className="bg-white px-2.5 py-0.5 rounded-lg border border-zinc-200 shadow-2xs text-[#C82A2B]">
                          PIN: {org.pincode}
                        </span>
                      )}
                      {org.country && (
                        <span className="bg-white px-2.5 py-0.5 rounded-lg border border-zinc-200 shadow-2xs text-zinc-500">
                          {org.country}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Person & Contact Info */}
              <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                <span className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                  <User size={12} /> Contact Person & Details
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-zinc-900">
                    {org.contact_person || 'No Contact Person Listed'}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-semibold text-zinc-600">
                    {(org.contact_number || org.phone) && (
                      <a
                        href={`tel:${org.contact_number || org.phone}`}
                        className="inline-flex items-center gap-1.5 font-mono text-zinc-800 hover:text-[#C82A2B] transition-colors"
                      >
                        <Phone size={12} className="text-[#C82A2B]" />
                        <span>{org.contact_number || org.phone}</span>
                      </a>
                    )}
                    {(org.email || org.contact_email) && (
                      <a
                        href={`mailto:${org.email || org.contact_email}`}
                        className="inline-flex items-center gap-1.5 text-zinc-600 hover:text-[#C82A2B] transition-colors"
                      >
                        <Mail size={12} className="text-[#C82A2B]" />
                        <span className="truncate max-w-[200px]">{org.email || org.contact_email}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                <span className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                  <Users size={12} /> Sales Person
                </span>
                <p className="text-sm font-bold text-zinc-900">
                  {org.relationship_manager?.full_name
                    ? `${org.relationship_manager.full_name} (${org.relationship_manager.employee_id})`
                    : 'Unassigned'}
                </p>
              </div>

              {org.assigned_operator && (
                <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <span className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                    <Users size={12} /> Assigned Marketing Executive
                  </span>
                  <p className="text-sm font-bold text-zinc-900">
                    {org.assigned_operator.full_name} ({org.assigned_operator.employee_id})
                  </p>
                </div>
              )}

              {/* GST & B2B Tax Profile Card */}
              <div 
                onClick={() => {
                  if (isClientUser) return;
                  openGstDeliveryModal();
                }}
                className={`p-5 bg-zinc-50 rounded-2xl border border-zinc-100 transition-all group ${
                  !isClientUser ? 'cursor-pointer hover:border-[#C82A2B]/40 hover:bg-[#FFF1F1] hover:shadow-sm' : ''
                }`}
                title={!isClientUser ? "Click to configure GST & Delivery details" : undefined}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-[#C82A2B] transition-colors">
                    <ReceiptText size={12} className="text-zinc-400 group-hover:text-[#C82A2B] transition-colors" /> GST & B2B Tax Profile
                  </span>
                  <div className="flex items-center gap-2">
                    {org.gst_number ? (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        B2B Registered
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-zinc-200/70 text-zinc-600">
                        B2C / No GST
                      </span>
                    )}
                    {!isClientUser && (
                      <span className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-zinc-400 group-hover:text-[#C82A2B] transition-all" title="Edit GST Details">
                        <Edit2 size={12} />
                      </span>
                    )}
                  </div>
                </div>
                {org.gst_number ? (
                  <div className="space-y-1">
                    <p className="text-sm font-black font-mono text-zinc-900 tracking-wide group-hover:text-[#C82A2B] transition-colors">
                      {org.gst_number}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-600 pt-0.5">
                      {org.legal_name && (
                        <span className="text-zinc-600 truncate max-w-[220px]" title={org.legal_name}>
                          Legal: <span className="font-bold text-zinc-900">{org.legal_name}</span>
                        </span>
                      )}
                      {org.pan_number && (
                        <span className="bg-white px-2 py-0.5 rounded border border-zinc-200 text-xs font-mono font-bold text-zinc-700">
                          PAN: {org.pan_number}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-zinc-400">
                      No GST number on file. Quotations default to standard retail pricing.
                    </p>
                    {!isClientUser && (
                      <div className="text-[11px] font-bold text-[#C82A2B] flex items-center gap-1 group-hover:underline">
                        <span>+ Add GSTIN for B2B Pricing</span>
                        <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Delivery & Dispatch Destination Card */}
              <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                    <Truck size={12} /> Delivery Destination
                  </span>
                  {(org.delivery_address || org.delivery_city) && (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-[#FFF1F1] text-[#9E1B1D] border border-[#C82A2B]/20">
                      Custom Dispatch
                    </span>
                  )}
                </div>
                {(org.delivery_address || org.delivery_city || org.delivery_state || org.delivery_pincode) ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-zinc-900">
                      {org.delivery_address || 'Address registered'}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-zinc-600 pt-0.5">
                      {org.delivery_city && (
                        <span className="bg-white px-2 py-0.5 rounded border border-zinc-200">{org.delivery_city}</span>
                      )}
                      {org.delivery_state && (
                        <span className="bg-white px-2 py-0.5 rounded border border-zinc-200">{org.delivery_state}</span>
                      )}
                      {org.delivery_pincode && (
                        <span className="bg-white px-2 py-0.5 rounded border border-zinc-200 text-[#C82A2B] font-mono">
                          PIN: {org.delivery_pincode}
                        </span>
                      )}
                      {org.delivery_country && (
                        <span className="bg-white px-2 py-0.5 rounded border border-zinc-200 text-zinc-500">
                          {org.delivery_country}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-zinc-500">
                      Same as billing location: {org.address ? `${org.address}, ${org.city || ''}` : (org.city || 'Not specified')}
                    </p>
                    {!isClientUser && (
                      <button
                        type="button"
                        onClick={() => {
                          setGstDeliveryForm({
                            gst_number: org?.gst_number || '',
                            pan_number: org?.pan_number || '',
                            legal_name: org?.legal_name || '',
                            delivery_address: org?.delivery_address || '',
                            delivery_city: org?.delivery_city || '',
                            delivery_state: org?.delivery_state || '',
                            delivery_pincode: org?.delivery_pincode || '',
                            delivery_country: org?.delivery_country || 'India'
                          });
                          setIsGstDeliveryModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-[#C82A2B] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        + Set Separate Delivery Address
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Credit Period & Commercial Terms Card */}
              <div className="p-5 bg-[#FFF1F1] rounded-2xl border border-[#C82A2B]/20">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-2 text-[9px] font-black text-[#9E1B1D] uppercase tracking-widest">
                    <CreditCard size={12} /> Credit Period Terms
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#C82A2B] text-white shadow-xs">
                    {org.credit_period_days || 30} Days
                  </span>
                </div>
                <p className="text-sm font-black text-zinc-900">
                  {org.credit_period_days || 30} Days Payment Window
                </p>
                <p className="text-xs text-zinc-500 font-medium mt-1">
                  Invoices are marked as <span className="font-bold text-amber-600">Due</span> on the last day, and <span className="font-bold text-rose-600">Overdue</span> next day onwards.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Departments & Members Tab */}
      {activeTab === 'departments' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Sub-view 1: Adding / Editing Department */}
          {isAddingDept ? (
            <div className="max-w-4xl mx-auto">
              <DynamicForm
                title={editingDept ? "Edit Department" : "Setup New Department"}
                subtitle={editingDept ? `Modify details for ${editingDept.name}` : "Define a new functional unit for this organization"}
                fields={deptFields}
                onSubmit={handleAddOrUpdateDept}
                onCancel={() => {
                  setIsAddingDept(false);
                  setEditingDept(null);
                }}
                submitLabel={editingDept ? "Update Department" : "Create Department"}
                columns={1}
              />
            </div>
          ) : entityView === 'register' ? (
            /* Sub-view 2: Add / Edit Member Profile */
            <div className="max-w-4xl mx-auto">
              <Button
                onClick={() => {
                  setEntityView('list');
                  setEditingEntity(null);
                  setGeneratedEntityCreds(null);
                }}
                variant="secondary"
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors mb-6 bg-transparent border-none shadow-none px-0 cursor-pointer"
              >
                <ArrowLeft size={14} />
                Back to {selectedDepartmentForMembers ? selectedDepartmentForMembers.name : 'Departments'}
              </Button>

              {generatedEntityCreds ? (
                <div className="max-w-2xl mx-auto animate-in zoom-in duration-500">
                  <div className="bg-white rounded-[3rem] border-4 border-[#C82A2B]/10 shadow-2xl overflow-hidden">
                    <div className="bg-[#C82A2B] p-10 text-white text-center">
                      <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <UserCheck size={40} />
                      </div>
                      <h2 className="text-3xl font-black tracking-tight italic">Registration Successful!</h2>
                      <p className="text-[#FFF1F1] font-bold uppercase tracking-widest text-xs mt-2 opacity-90">Access Portal Account Generated</p>
                    </div>

                    <div className="p-10 space-y-8">
                      <div className="space-y-4">
                        <div className="p-6 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Entity Access Portal</span>
                            <LogIn size={16} className="text-[#C82A2B]" />
                          </div>

                          <div className="space-y-4">
                            <div className="flex flex-col">
                              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Login Username</label>
                              <span className="text-lg font-black text-zinc-900 tracking-tight">{generatedEntityCreds.username}</span>
                            </div>
                            <div className="flex flex-col">
                              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Temporary Password</label>
                              <div className="flex items-center gap-3">
                                <Key size={14} className="text-[#C82A2B]" />
                                <span className="text-xl font-black text-[#C82A2B] tracking-[0.2em]">{generatedEntityCreds.password}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          onClick={handleCopyCreds}
                          className={`h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-3 transition-all cursor-pointer ${hasCopiedCreds ? 'bg-green-600 text-white' : 'bg-zinc-900 text-white hover:bg-black'
                            }`}
                        >
                          {hasCopiedCreds ? <Check size={16} /> : <Clipboard size={16} />}
                          Copy Credentials
                        </Button>

                        <Button
                          onClick={() => {
                            setEntityView('list');
                            setEditingEntity(null);
                            setGeneratedEntityCreds(null);
                            fetchEntities();
                          }}
                          variant="outline"
                          className="h-14 rounded-2xl border-2 border-zinc-200 font-black uppercase tracking-widest text-[10px] gap-3 cursor-pointer hover:bg-zinc-100"
                        >
                          Finish & Exit
                          <ArrowRight size={16} />
                        </Button>

                        <Button
                          onClick={() => router.push(`/measurements/entry?studentId=${generatedEntityCreds.studentId}`)}
                          className="h-16 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest text-[11px] gap-3 col-span-2 shadow-xl shadow-orange-500/20 mt-2 transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                          <Ruler size={18} />
                          Capture Sizing Records Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <DynamicForm
                  title={editingEntity ? "Edit Member Profile" : `Register Member${selectedDepartmentForMembers ? ` — ${selectedDepartmentForMembers.name}` : ''}`}
                  subtitle={editingEntity ? `Modify record for ${editingEntity.full_name}` : `Add new entry inside ${org.name}${selectedDepartmentForMembers ? ` (${selectedDepartmentForMembers.name})` : ''}`}
                  fields={entityFields}
                  onSubmit={handleRegisterEntity}
                  onCancel={() => {
                    setEntityView('list');
                    setEditingEntity(null);
                  }}
                  submitLabel={editingEntity ? "Update Profile" : "Register & Create Account"}
                  columns={2}
                />
              )}
            </div>
          ) : entityView === 'bulk' ? (
            /* Sub-view 3: Bulk Upload Roster */
            <div className="max-w-4xl mx-auto space-y-6">
              <Button
                onClick={() => {
                  setEntityView('list');
                  setBulkFile(null);
                  setBulkResults(null);
                }}
                variant="secondary"
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors mb-6 bg-transparent border-none shadow-none px-0 cursor-pointer"
              >
                <ArrowLeft size={14} />
                Back to {selectedDepartmentForMembers ? selectedDepartmentForMembers.name : 'Departments'}
              </Button>

              {bulkResults ? (
                <div className="max-w-xl mx-auto p-10 bg-white rounded-[3rem] shadow-2xl border border-zinc-100 text-center space-y-6 animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500">
                    <UserCheck size={40} />
                  </div>
                  <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Import Summary Completed</h2>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-green-50 rounded-2xl border border-green-100">
                      <p className="text-[10px] font-black text-green-600 uppercase tracking-wider mb-1">Processed</p>
                      <p className="text-2xl font-black text-green-700">{bulkResults.success}</p>
                    </div>
                    <div className="p-5 bg-red-50 rounded-2xl border border-red-100">
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-wider mb-1">Failed</p>
                      <p className="text-2xl font-black text-red-700">{bulkResults.failed}</p>
                    </div>
                  </div>

                  {bulkResults.errors && bulkResults.errors.length > 0 && (
                    <div className="text-left bg-red-50/60 border border-red-100 rounded-2xl p-4 max-h-48 overflow-y-auto space-y-1.5">
                      <p className="text-[10px] font-black uppercase text-red-700 tracking-wider mb-2">Error Details:</p>
                      {bulkResults.errors.map((err: any, idx: number) => (
                        <p key={idx} className="text-xs text-red-600 font-medium">
                          • Row {err.row} ({err.student}): {err.message}
                        </p>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={() => {
                      setEntityView('list');
                      setBulkFile(null);
                      setBulkResults(null);
                      fetchEntities();
                    }}
                    className="w-full h-12 bg-zinc-900 text-white hover:bg-black rounded-xl font-bold uppercase tracking-widest text-[10px] cursor-pointer"
                  >
                    Return to {selectedDepartmentForMembers ? selectedDepartmentForMembers.name : 'Departments'}
                  </Button>
                </div>
              ) : (
                <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-zinc-100 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black text-zinc-900 italic">
                        Import {selectedDepartmentForMembers ? `${selectedDepartmentForMembers.name} Roster` : 'Organization Roster'}
                      </h2>
                      <p className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-wider">Upload list from XLSX template</p>
                    </div>
                    <button
                      onClick={() => {
                        const isEdu = (org?.category || org?.type || org?.industries?.name || '').toLowerCase().includes('school') || (org?.category || org?.type || org?.industries?.name || '').toLowerCase().includes('college') || (org?.category || org?.type || org?.industries?.name || '').toLowerCase().includes('edu');
                        const templateData = [
                          {
                            'Full Name': 'Samuel Jackson',
                            'Department / Class': selectedDepartmentForMembers?.name || (isEdu ? 'Grade 5-A' : 'Main'),
                            'Admission / Employee ID (Optional)': isEdu ? 'ADM-1001' : 'EMP-2026-001',
                            'Mobile (Optional)': '9876543210',
                            'Gender': 'Male'
                          },
                          {
                            'Full Name': 'Alice Cooper',
                            'Department / Class': '',
                            'Admission / Employee ID (Optional)': '',
                            'Mobile (Optional)': '',
                            'Gender': 'Female'
                          }
                        ];
                        const ws = XLSX.utils.json_to_sheet(templateData);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, 'Roster_Import');
                        XLSX.writeFile(wb, `Import_Template_${(org?.name || 'Organization').replace(/\s+/g, '_')}.xlsx`);
                      }}
                      className="flex items-center gap-1.5 text-[9px] font-black uppercase text-[#C82A2B] border-b border-dashed border-[#C82A2B] hover:text-[#9E1B1D] transition-colors cursor-pointer"
                    >
                      <Download size={12} /> Template Sheet
                    </button>
                  </div>

                  {!bulkFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="group cursor-pointer border-4 border-dashed border-zinc-200 bg-zinc-50/80 hover:bg-[#FFF1F1]/30 hover:border-[#C82A2B]/40 rounded-2xl p-16 flex flex-col items-center justify-center text-center transition-all"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".xlsx,.xls"
                        onChange={handleBulkFileChange}
                      />
                      <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center text-[#C82A2B] mb-4 border border-zinc-100">
                        <FileUp size={28} />
                      </div>
                      <h4 className="text-base font-bold text-zinc-900 mb-1">Click or drag Excel registry files here</h4>
                      <p className="text-zinc-400 text-xs">Supports Excel formats (.xlsx / .xls). Records without a department are automatically assigned to {selectedDepartmentForMembers?.name || 'Main'}.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-5 bg-zinc-900 rounded-2xl text-white shadow-sm">
                        <div className="flex items-center gap-3">
                          <FileUp size={20} className="text-[#C82A2B]" />
                          <div>
                            <p className="font-bold text-xs">{bulkFile.name}</p>
                            <p className="text-[9px] uppercase font-bold text-zinc-400">{bulkData.length} records parsed</p>
                          </div>
                        </div>
                        <button onClick={() => { setBulkFile(null); setBulkData([]); }} className="p-1.5 hover:bg-white/10 rounded-lg cursor-pointer">
                          <X size={16} />
                        </button>
                      </div>

                      <Button
                        onClick={handleBulkUploadSubmit}
                        isLoading={isBulkUploading}
                        className="w-full h-14 bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-md shadow-[#C82A2B]/20 cursor-pointer"
                      >
                        Confirm Import of {bulkData.length} Records
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : selectedDepartmentForMembers ? (
            /* Sub-view 4: Students / Members in Clicked Department */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => {
                      setSelectedDepartmentForMembers(null);
                      setEntitySearchQuery('');
                      setEntityGenderFilter('ALL');
                      setEntitySectionFilter('ALL');
                    }}
                    variant="secondary"
                    className="h-10 px-3.5 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-800 hover:text-white rounded-xl font-black uppercase tracking-wider text-[10px] gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
                  >
                    <ArrowLeft size={14} />
                    All Departments
                  </Button>
                  <div className="h-6 w-px bg-zinc-200" />
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#FFF1F1] text-[#C82A2B] border border-[#C82A2B]/20 flex items-center justify-center shrink-0">
                      <Grid size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-lg text-zinc-900 tracking-tight">{selectedDepartmentForMembers.name}</h3>
                        {(selectedDepartmentForMembers.division || selectedDepartmentForMembers.section) && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-[#FFF1F1] text-[#9E1B1D] border border-[#C82A2B]/20">
                            Section: {selectedDepartmentForMembers.division || selectedDepartmentForMembers.section}
                          </span>
                        )}
                        {selectedDepartmentForMembers.grade && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-zinc-100 text-zinc-600 border border-zinc-200">
                            {selectedDepartmentForMembers.grade}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        {entities.filter(e => {
                          if (String(e.department_id) === String(selectedDepartmentForMembers.id)) return true;
                          if ((selectedDepartmentForMembers.name || '').trim().toLowerCase() === 'main' && (!e.department_id || !e.departments)) return true;
                          return false;
                        }).length} Registered Members
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={downloadCSV}
                    variant="secondary"
                    className="h-10 px-3.5 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-800 hover:text-white rounded-xl font-black uppercase tracking-wider text-[9px] gap-1.5 shadow-2xs transition-all shrink-0 cursor-pointer"
                  >
                    <Download size={14} /> Download List
                  </Button>
                  {!isClientUser && (
                    <>
                      <Button
                        onClick={() => {
                          setEditingEntity(null);
                          setGeneratedEntityCreds(null);
                          setEntityView('register');
                        }}
                        className="h-10 px-3.5 bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-xl font-black uppercase tracking-wider text-[9px] gap-1.5 shadow-sm shadow-[#C82A2B]/20 shrink-0 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <UserPlus size={14} /> Add Member
                      </Button>
                      <Button
                        onClick={() => {
                          setBulkFile(null);
                          setBulkResults(null);
                          setEntityView('bulk');
                        }}
                        variant="secondary"
                        className="h-10 px-3.5 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl font-black uppercase tracking-wider text-[9px] gap-1.5 shadow-2xs shrink-0 cursor-pointer"
                      >
                        <FileUp size={14} /> Bulk Upload
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Data Table for Members inside this Department */}
              <DataTable
                title={`Members in ${selectedDepartmentForMembers.name}`}
                subtitle={`Showing roster for ${selectedDepartmentForMembers.name}`}
                headerAction={
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Gender Filter */}
                    <FilterDropdown
                      label="Gender"
                      allLabel="All Genders"
                      allBadge={deptMembers.length}
                      value={entityGenderFilter}
                      onChange={(val) => setEntityGenderFilter(val)}
                      options={[
                        { label: 'Male', value: 'Male', badge: deptMembers.filter(e => (e.gender || 'Male').toLowerCase() === 'male').length },
                        { label: 'Female', value: 'Female', badge: deptMembers.filter(e => (e.gender || '').toLowerCase() === 'female').length },
                        { label: 'Other', value: 'Other', badge: deptMembers.filter(e => (e.gender || '').toLowerCase() === 'other').length },
                      ]}
                    />

                    {/* Section Filter */}
                    <FilterDropdown
                      label="Section"
                      allLabel="All Sections"
                      allBadge={deptMembers.length}
                      value={entitySectionFilter}
                      onChange={(val) => setEntitySectionFilter(val)}
                      options={availableSections.map(sec => ({
                        label: `Section ${sec}`,
                        value: sec,
                        badge: deptMembers.filter(e => getMemberSection(e).toLowerCase().includes(sec.toLowerCase())).length
                      }))}
                    />
                  </div>
                }
                columns={[
                  {
                    header: 'Entity / Member Name',
                    accessor: (e) => (
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={() => setProfileModal({ isOpen: true, member: e })}
                          className="w-9 h-9 rounded-lg bg-zinc-100 hover:bg-[#FFF1F1] border border-zinc-200/60 flex items-center justify-center font-bold text-zinc-700 hover:text-[#C82A2B] text-[10px] cursor-pointer transition-all"
                          title="Click to view profile"
                        >
                          {e.full_name?.charAt(0) || 'M'}
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => setProfileModal({ isOpen: true, member: e })}
                            className="font-bold text-xs text-zinc-900 hover:text-[#C82A2B] hover:underline leading-none text-left border-none bg-transparent p-0 outline-none cursor-pointer block"
                            title="Click to view profile"
                          >
                            {e.full_name}
                          </button>
                          <p className="text-[8px] text-[#C82A2B] font-bold uppercase tracking-[0.1em] mt-1 opacity-85">Ref: #{e.admission_no}</p>
                        </div>
                      </div>
                    ),
                  },
                  {
                    header: 'Gender',
                    accessor: (e) => (
                      <span className="text-xs font-semibold text-zinc-600">{e.gender || 'Male'}</span>
                    )
                  },
                  {
                    header: 'Section',
                    accessor: (e: any) => {
                      const sec = getMemberSection(e);
                      return sec ? (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-[#FFF1F1] text-[#9E1B1D] border border-[#C82A2B]/20">
                          {sec}
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-xs font-medium">—</span>
                      );
                    }
                  },
                  {
                    header: 'Mobile',
                    accessor: (e) => (
                      <span className="text-xs font-mono text-zinc-600">{e.contact_mobile || e.contact_number || '—'}</span>
                    )
                  },
                  {
                    header: 'Status',
                    accessor: (e: any) => (
                      <span className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${e.status === 'Active' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                        }`}>
                        {e.status || 'Active'}
                      </span>
                    ),
                  },
                  {
                    header: 'Measurement status',
                    accessor: (e: any) => {
                      const status = e.measurement_status || 'Missing';
                      const colors: Record<string, string> = {
                        'Approved': 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
                        'Pending': 'bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse',
                        'Missing': 'bg-zinc-100 text-zinc-400 border border-zinc-200'
                      };
                      return (
                        <span className={`text-[8px] font-black uppercase tracking-[0.1em] px-2.5 py-0.5 rounded-lg ${colors[status]}`}>
                          {status === 'Pending' ? 'Under Review' : status}
                        </span>
                      );
                    }
                  },
                  ...(!isClientUser ? [{
                    header: 'Actions',
                    accessor: (e: any) => (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setResetEntityConfirm({ isOpen: true, entity: e })}
                          variant="secondary"
                          className="!p-0 h-8 w-8 flex items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white transition-all shadow-sm border-none cursor-pointer"
                          title="Reset Password"
                        >
                          <Key size={14} />
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingEntity(e);
                            setGeneratedEntityCreds(null);
                            setEntityView('register');
                          }}
                          variant="secondary"
                          className="!p-0 h-8 w-8 flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-800 hover:text-white transition-all shadow-sm border border-zinc-200 cursor-pointer"
                          title="Edit Member"
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          onClick={() => setDeleteEntityConfirm({ isOpen: true, id: e.id })}
                          variant="secondary"
                          className="!p-0 h-8 w-8 flex items-center justify-center rounded-lg bg-error/10 text-error hover:bg-error hover:text-white transition-all shadow-sm border-none cursor-pointer"
                          title="Delete Member"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    )
                  }] : [])
                ]}
                data={filteredDepartmentMembers}
                isLoading={isLoadingEntities}
                onSearch={setEntitySearchQuery}
                searchPlaceholder={`Search members in ${selectedDepartmentForMembers.name}...`}
              />
            </div>
          ) : (
            /* Sub-view 5: Departments List Table */
            <div className="space-y-6">
              <DataTable
                title="Departments & Sections"
                subtitle={`Active segments inside ${org.name}`}
                onRowClick={(d) => {
                  setSelectedDepartmentForMembers(d);
                  setEntityView('list');
                  setEntityGenderFilter('ALL');
                  setEntitySectionFilter('ALL');
                }}
                columns={[
                  {
                    header: 'Created On',
                    accessor: (d) => (
                      <span className="text-xs font-semibold text-zinc-500 whitespace-nowrap">
                        {formatDate(d.created_at)}
                      </span>
                    )
                  },
                  {
                    header: 'Department / Unit',
                    accessor: (d) => (
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-9 h-9 bg-zinc-100 group-hover:bg-[#FFF1F1] rounded-xl flex items-center justify-center text-zinc-600 group-hover:text-[#C82A2B] transition-colors border border-zinc-200/60 shrink-0"
                          title="Click row to view members"
                        >
                          <Grid size={17} />
                        </div>
                        <div>
                          <span className="font-black text-sm tracking-tight text-zinc-900 group-hover:text-[#C82A2B] group-hover:underline transition-colors block text-left">
                            {d.name || 'N/A'}
                          </span>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            {d.grade && (
                              <span className="px-1.5 py-0.5 bg-zinc-50 border border-zinc-200 text-zinc-500 rounded text-[9px] font-bold uppercase tracking-wider">
                                Preset: {d.grade}
                              </span>
                            )}
                            {(d.division || d.section) && (
                              <p className="text-[10px] font-bold text-[#9E1B1D] uppercase tracking-wider">
                                Section: {d.division || d.section}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ),
                  },
                  {
                    header: 'Members / Students',
                    accessor: (d) => {
                      const count = entities.filter(e => {
                        if (String(e.department_id) === String(d.id)) return true;
                        if ((d.name || '').trim().toLowerCase() === 'main' && (!e.department_id || !e.departments)) return true;
                        return false;
                      }).length;

                      return (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 group-hover:bg-[#C82A2B] text-zinc-700 group-hover:text-white font-bold text-xs transition-all shadow-2xs border border-zinc-200 group-hover:border-[#C82A2B]">
                          <Users size={13} />
                          <span>{count} Nos</span>
                          <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      );
                    }
                  },
                  ...(!isClientUser ? [{
                    header: 'Actions',
                    accessor: (d: any) => (
                      <div className="relative flex items-center justify-end" data-prevent-row-click="true" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuDeptId(openMenuDeptId === String(d.id) ? null : String(d.id));
                          }}
                          className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-zinc-800 hover:text-white hover:border-zinc-800 transition-all shadow-sm cursor-pointer"
                          title="Options"
                        >
                          <MoreVertical size={14} />
                        </button>

                        {openMenuDeptId === String(d.id) && (
                          <>
                            <div 
                              className="fixed inset-0 z-30" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuDeptId(null);
                              }} 
                            />
                            <div 
                              className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-zinc-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100 text-left"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuDeptId(null);
                                  setEditingDept(d);
                                  setIsAddingDept(true);
                                }}
                                className="w-full px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Edit2 size={13} className="text-zinc-600" />
                                <span>Edit Department</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuDeptId(null);
                                  setDeptDeleteModal({
                                    isOpen: true,
                                    step: 1,
                                    dept: d,
                                    typedName: '',
                                    isDeleting: false
                                  });
                                }}
                                className="w-full px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Trash2 size={13} className="text-rose-600" />
                                <span>Delete Department</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  }] : [])
                ]}
                data={departments}
                isLoading={false}
                searchPlaceholder="Filter departments..."
                rightAction={!isClientUser ? (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        setEntityView('bulk');
                        setBulkFile(null);
                        setBulkResults(null);
                      }}
                      variant="secondary"
                      className="h-10 px-3.5 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl font-black uppercase tracking-wider text-[10px] shadow-2xs gap-1.5 shrink-0 transition-all cursor-pointer"
                    >
                      <FileUp size={14} />
                      Bulk Upload
                    </Button>
                    <Button
                      onClick={() => setIsAddingDept(true)}
                      className="h-10 px-4 bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-xl font-black uppercase tracking-wider text-[10px] shadow-sm shadow-[#C82A2B]/20 gap-1.5 shrink-0 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Plus size={15} />
                      Setup Department
                    </Button>
                  </div>
                ) : undefined}
              />
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Transactions (Commercial History: 9 Sub-Categories) Tab */}
      {!isClientUser && activeTab === 'transactions' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          

          {/* Sub-tab Switcher: 9 Transaction Categories */}
          <div className="bg-white p-2.5 rounded-2xl border border-zinc-200/80 shadow-2xs overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-2 min-w-max">
              {[
                { id: 'quotes', label: 'Quotes', count: customerQuotes.length, icon: FileText },
                { id: 'customer_payments', label: 'Customer Payments', count: customerPayments.length, icon: CreditCard },
                { id: 'sales_orders', label: 'Sales Orders', count: customerOrders.length, icon: ShoppingBag },
                { id: 'packages', label: 'Packages', count: customerPackages.length, icon: Boxes },
                { id: 'shipments', label: 'Shipments', count: customerShipments.length, icon: Truck },
                { id: 'pro_forma_invoice', label: 'Proforma Invoice', count: customerProFormaInvoices.length, icon: FileSpreadsheet },
                { id: 'invoices', label: 'Invoices', count: customerInvoices.length, icon: ReceiptText },
                { id: 'expenses', label: 'Expenses', count: customerExpenses.length, icon: TrendingDown },
                { id: 'journals', label: 'Journals', count: customerJournals.length, icon: BookOpen },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = transactionSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTransactionSubTab(tab.id as TransactionSubTab)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-zinc-900 text-white shadow-sm'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 bg-zinc-50/60 border border-zinc-200/60'
                    }`}
                  >
                    <Icon size={14} className={isActive ? 'text-[#C82A2B]' : 'text-zinc-400'} />
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-[#C82A2B] text-white'
                          : 'bg-zinc-200/80 text-zinc-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-View 1: Quotes Table */}
          {transactionSubTab === 'quotes' && (
            <div className="bg-white rounded-[2.5rem] border border-zinc-150/50 shadow-sm p-6 animate-in fade-in duration-300">
              <DataTable
                title="Customer Quotes"
                onRowClick={(q: any) => handleOpenQuoteModal(q.id)}
                subtitle={`Formal quotation proposals created for ${org.name}`}
                headerAction={
                  <DateRangeFilter
                    label="Date"
                    value={quoteDateFilter}
                    onChange={setQuoteDateFilter}
                  />
                }
                rightAction={
                  <button
                    type="button"
                    onClick={() => router.push(`/marketing/quotations?action=create&orgId=${org.id}`)}
                    className="h-9 px-3.5 bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm shadow-[#C82A2B]/20 active:scale-95 cursor-pointer"
                  >
                    <Plus size={14} strokeWidth={3} />
                    <span>New Quote</span>
                  </button>
                }
                columns={[
                  {
                    header: 'Date',
                    accessor: (q) => (
                      <span className="text-xs font-semibold text-zinc-600 whitespace-nowrap">
                        {formatDate(q.quotation_date || q.created_at)}
                      </span>
                    )
                  },
                  {
                    header: 'Quotation No.',
                    accessor: (q) => (
                      <div className="font-mono font-bold text-zinc-900 text-xs flex items-center gap-1.5 whitespace-nowrap">
                        <FileText size={14} className="text-[#C82A2B] shrink-0" />
                        <span>{q.quotation_no}</span>
                      </div>
                    )
                  },
                  {
                    header: 'Title / Description',
                    accessor: (q) => (
                      <span className="font-bold text-xs text-zinc-800 block truncate max-w-[260px]" title={q.title || 'Uniform Proposal'}>
                        {q.title || 'Uniform Proposal'}
                      </span>
                    )
                  },
                  {
                    header: 'Sales Person',
                    className: 'min-w-[140px] whitespace-nowrap text-center',
                    accessor: (q) => {
                      const sp = q.sales_person?.full_name 
                        || q.sales_person?.name 
                        || q.organizations?.relationship_manager?.full_name 
                        || org?.relationship_manager?.full_name 
                        || employees.find(e => e.id === (q.sales_person_id || q.organizations?.relationship_manager_id || org?.relationship_manager_id))?.full_name;
                      const empCode = q.sales_person?.employee_id 
                        || q.organizations?.relationship_manager?.employee_id 
                        || org?.relationship_manager?.employee_id
                        || employees.find(e => e.id === (q.sales_person_id || q.organizations?.relationship_manager_id || org?.relationship_manager_id))?.employee_id;
                      return sp ? (
                        <div className="min-w-0 text-center flex flex-col items-center">
                          <p className="text-xs font-bold text-zinc-800 truncate" title={sp}>
                            {sp}
                          </p>
                          {empCode && (
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider truncate">
                              {empCode}
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
                    header: 'Amount',
                    accessor: (q) => (
                      <span className="font-mono font-black text-zinc-900 text-xs whitespace-nowrap">
                        ₹{parseFloat(q.final_quote_value || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    )
                  },
                  {
                    header: 'Status',
                    accessor: (q) => {
                      const statusColors: Record<string, string> = {
                        'Draft': 'bg-zinc-50 text-zinc-600 border-zinc-200',
                        'Pending': 'bg-amber-50 text-amber-700 border-amber-200',
                        'Pending Branch Approval': 'bg-amber-50 text-amber-700 border-amber-200',
                        'Approved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        'Sent': 'bg-blue-50 text-blue-700 border-blue-200',
                        'Accepted': 'bg-green-50 text-green-700 border-green-200',
                        'Rejected': 'bg-rose-50 text-rose-700 border-rose-200'
                      };
                      const cls = statusColors[q.status] || 'bg-zinc-50 text-zinc-600 border-zinc-200';
                      return (
                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider border rounded-lg whitespace-nowrap ${cls}`}>
                          {q.status}
                        </span>
                      );
                    }
                  }
                ]}
                data={customerQuotes.filter(q => matchesDateFilter(q.quotation_date || q.created_at, quoteDateFilter))}
                isLoading={isLoadingOrg}
                searchPlaceholder="Search"
                emptyMessage="No quotations recorded for this customer."
              />
            </div>
          )}

          {/* Sub-View 2: Customer Payments Table */}
          {transactionSubTab === 'customer_payments' && (
            <div className="bg-white rounded-[2.5rem] border border-zinc-150/50 shadow-sm p-6 animate-in fade-in duration-300">
              <DataTable
                title="Customer Payments"
                subtitle={`Payment receipts and credit collections recorded for ${org.name}`}
                headerAction={
                  <DateRangeFilter
                    label="Date"
                    value={paymentDateFilter}
                    onChange={setPaymentDateFilter}
                  />
                }
                rightAction={
                  <button
                    type="button"
                    onClick={() => handleOpenQuickPaymentModal()}
                    className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 active:scale-95 cursor-pointer"
                  >
                    <Plus size={14} strokeWidth={3} />
                    <span>Record Payment</span>
                  </button>
                }
                columns={[
                  {
                    header: 'Date',
                    className: 'w-[110px] whitespace-nowrap',
                    accessor: (p: any) => (
                      <span className="text-zinc-600 font-semibold text-xs whitespace-nowrap">
                        {formatDate(p.paid_at || p.created_at || p.date)}
                      </span>
                    )
                  },
                  {
                    header: 'Voucher No.',
                    className: 'w-[150px] whitespace-nowrap',
                    accessor: (p: any) => (
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <CreditCard size={13} />
                        </div>
                        <span className="font-mono font-bold text-xs text-zinc-900">
                          {p.voucher_no && p.voucher_no.startsWith('CP-')
                            ? p.voucher_no
                            : (p.reference_no && p.reference_no.startsWith('CP-')
                                ? p.reference_no
                                : formatDocumentNumber({
                                    prefix: 'CP',
                                    branch: p.branch_id || org?.branch_id,
                                    date: p.paid_at || p.created_at || p.date,
                                    seq: p.id || 1
                                  }))}
                        </span>
                      </div>
                    )
                  },
                  {
                    header: 'Invoice No.',
                    className: 'w-[140px] whitespace-nowrap',
                    accessor: (p: any) => {
                      const invMatch = customerInvoices.find((i: any) => 
                        (p.order_id && i.id === p.order_id) || 
                        (p.invoice_id && i.id === p.invoice_id) ||
                        (p.order_ref && (i.invoice_no === p.order_ref || i.order_no === p.order_ref)) || 
                        (p.notes && i.invoice_no && p.notes.includes(i.invoice_no))
                      );
                      const invNo = p.invoice_no || p.invoices?.invoice_no || invMatch?.invoice_no || (p.order_ref?.startsWith('INV') ? p.order_ref : null);
                      return invNo ? (
                        <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 whitespace-nowrap">
                          {invNo}
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-xs italic font-medium">—</span>
                      );
                    }
                  },
                  {
                    header: 'Narration/ Notes',
                    className: 'min-w-[180px] max-w-[280px]',
                    accessor: (p: any) => (
                      <span className="text-xs text-zinc-600 font-medium truncate block" title={p.notes || p.narration || ''}>
                        {p.notes || p.narration || p.remarks || 'Payment settlement received'}
                      </span>
                    )
                  },
                  {
                    header: 'Amount Paid',
                    className: 'w-[130px] whitespace-nowrap text-right',
                    accessor: (p: any) => (
                      <span className="font-mono font-black text-emerald-600 text-xs md:text-sm whitespace-nowrap">
                        ₹{parseFloat(String(p.amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    )
                  },
                  {
                    header: 'Status',
                    className: 'w-[110px] whitespace-nowrap text-center',
                    accessor: (p: any) => {
                      const st = p.status || 'Confirmed';
                      const isConfirmed = st.toLowerCase().includes('confirm') || st.toLowerCase().includes('success') || st.toLowerCase().includes('paid');
                      return (
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-lg border whitespace-nowrap ${
                          isConfirmed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isConfirmed ? '✓ Confirmed' : st}
                        </span>
                      );
                    }
                  }
                ]}
                data={customerPayments.filter((p: any) => matchesDateFilter(p.paid_at || p.created_at || p.date, paymentDateFilter))}
                isLoading={isLoadingLedger}
                searchPlaceholder="Search"
                emptyMessage="No payments recorded yet for this customer."
              />
            </div>
          )}

          {/* Sub-View 3: Sales Orders Table */}
          {transactionSubTab === 'sales_orders' && (
            <div className="bg-white rounded-[2.5rem] border border-zinc-150/50 shadow-sm p-6 animate-in fade-in duration-300">
              <DataTable
                title="Sales Orders"
                subtitle={`Confirmed manufacturing & purchase commitments placed for ${org.name}`}
                onRowClick={(o: any) => handleViewOrder(Number(o.id))}
                headerAction={
                  <DateRangeFilter
                    label="Date"
                    value={orderDateFilter}
                    onChange={setOrderDateFilter}
                  />
                }
                columns={[
                  {
                    header: 'Date',
                    className: 'w-[105px] whitespace-nowrap',
                    sortable: true,
                    sortValue: (o: any) => new Date(o.order_date || o.created_at || 0).getTime(),
                    accessor: (o: any) => (
                      <span className="text-zinc-600 font-bold text-xs whitespace-nowrap">
                        {formatDate(o.order_date || o.created_at)}
                      </span>
                    )
                  },
                  {
                    header: 'SO No.',
                    className: 'w-[140px] whitespace-nowrap',
                    accessor: (o: any) => (
                      <div className="font-mono font-black text-[#9E1B1D] flex items-center gap-1.5 whitespace-nowrap">
                        <ShoppingBag size={14} className="text-[#C82A2B] shrink-0" />
                        <span>{o.order_no || `SO-${o.id}`}</span>
                      </div>
                    )
                  },
                  {
                    header: 'Quotation No.',
                    className: 'w-[125px] whitespace-nowrap',
                    accessor: (o: any) => {
                      const quoteNo = o.quotations?.quotation_no || (quotations.find((q: any) => q.id === o.quotation_id)?.quotation_no) || (o.quotation_id ? `QT-${o.quotation_id}` : '—');
                      return (
                        <span className="font-mono text-xs font-bold text-zinc-600 whitespace-nowrap">
                          {quoteNo}
                        </span>
                      );
                    }
                  },
                  {
                    header: 'Sales Person',
                    className: 'min-w-[130px] whitespace-nowrap text-center',
                    accessor: (o: any) => {
                      const linkedQuote = o.quotations || quotations.find((q: any) => q.id === o.quotation_id);
                      const sp = o.sales_person?.full_name 
                        || o.sales_person?.name 
                        || linkedQuote?.sales_person?.full_name 
                        || linkedQuote?.sales_person?.name 
                        || org?.relationship_manager?.full_name 
                        || employees.find((e: any) => e.id === (o.sales_person_id || linkedQuote?.sales_person_id || org?.relationship_manager_id))?.full_name 
                        || 'Unassigned';
                      return (
                        <div className="flex justify-center text-center">
                          <span className="text-xs text-zinc-600 font-semibold whitespace-nowrap">
                            {sp}
                          </span>
                        </div>
                      );
                    }
                  },
                  {
                    header: 'Stage Status',
                    className: 'w-[110px] whitespace-nowrap text-center',
                    accessor: (o: any) => {
                      const st = o.stage_status || o.stage || o.status || 'Placed';
                      const isDelivered = st.toLowerCase().includes('delivered');
                      const isShipped = st.toLowerCase().includes('shipped');
                      const isProd = st.toLowerCase().includes('production') || st.toLowerCase().includes('process');
                      return (
                        <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-lg border whitespace-nowrap ${
                          isDelivered ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          isShipped ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          isProd ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {st}
                        </span>
                      );
                    }
                  },
                  {
                    header: 'Order Update',
                    className: 'min-w-[160px] max-w-[240px]',
                    accessor: (o: any) => (
                      <span className="text-xs text-zinc-600 font-medium truncate block" title={o.latest_update || o.order_update || o.remarks || o.notes || 'Order confirmed & active'}>
                        {o.latest_update || o.order_update || o.remarks || o.notes || 'Order confirmed & active'}
                      </span>
                    )
                  },
                  {
                    header: 'Expected Date',
                    className: 'w-[115px] whitespace-nowrap',
                    accessor: (o: any) => {
                      const quote = o.quotations || quotations.find((q: any) => 
                        (o.quotation_id && String(q.id) === String(o.quotation_id)) ||
                        (o.quotation_no && q.quotation_no === o.quotation_no)
                      );
                      const exp = o.target_delivery_date 
                        || o.delivery_date
                        || quote?.target_delivery_date 
                        || quote?.expected_delivery_date 
                        || quote?.delivery_date
                        || o.expected_delivery_date 
                        || quote?.quotation_date 
                        || quote?.created_at 
                        || o.expected_date;
                      return (
                        <span className="text-zinc-600 font-semibold text-xs whitespace-nowrap">
                          {exp ? formatDate(exp) : '—'}
                        </span>
                      );
                    }
                  },
                  {
                    header: 'Shipment Date',
                    className: 'w-[115px] whitespace-nowrap',
                    accessor: (o: any) => {
                      const dcMatch = deliveryChallans.find((dc: any) => dc.order_id === o.id || dc.orders?.order_no === o.order_no);
                      const shipDate = dcMatch?.dispatch_date || dcMatch?.created_at || o.shipped_at || o.shipment_date;
                      return (
                        <span className="text-zinc-600 font-semibold text-xs whitespace-nowrap">
                          {shipDate ? formatDate(shipDate) : '—'}
                        </span>
                      );
                    }
                  },
                  {
                    header: 'Packed',
                    className: 'w-[85px] whitespace-nowrap text-center',
                    sortable: true,
                    sortValue: (o: any) => {
                      const linkedDCs = deliveryChallans.filter((dc: any) => dc.order_id === o.id || dc.orders?.order_no === o.order_no);
                      const isPartial = 
                        o.packing_status?.toLowerCase().includes('part') ||
                        o.status?.toLowerCase().includes('partially pack') ||
                        o.stage_status?.toLowerCase().includes('partially pack') ||
                        o.stage_status?.toLowerCase() === 'packing' ||
                        linkedDCs.some((dc: any) => (dc.status || '').toLowerCase().includes('part'));
                      const isFull = !isPartial && (
                        o.packing_status?.toLowerCase() === 'packed' ||
                        o.packing_status?.toLowerCase() === 'completed' ||
                        o.status === 'Packed' ||
                        o.status === 'Shipped' ||
                        o.status === 'Delivered' ||
                        o.stage_status?.toLowerCase() === 'packed' ||
                        linkedDCs.some((dc: any) => {
                          const st = (dc.status || '').toLowerCase();
                          return st === 'packed' || st === 'dispatched' || st === 'shipped' || st === 'delivered' || (!st.includes('awaiting') && !st.includes('pending') && st.length > 0);
                        })
                      );
                      return isFull ? 2 : isPartial ? 1 : 0;
                    },
                    accessor: (o: any) => {
                      const linkedDCs = deliveryChallans.filter((dc: any) => dc.order_id === o.id || dc.orders?.order_no === o.order_no);
                      const isPartial = 
                        o.packing_status?.toLowerCase().includes('part') ||
                        o.status?.toLowerCase().includes('partially pack') ||
                        o.stage_status?.toLowerCase().includes('partially pack') ||
                        o.stage_status?.toLowerCase() === 'packing' ||
                        linkedDCs.some((dc: any) => (dc.status || '').toLowerCase().includes('part'));
                      const isFull = !isPartial && (
                        o.packing_status?.toLowerCase() === 'packed' ||
                        o.packing_status?.toLowerCase() === 'completed' ||
                        o.status === 'Packed' ||
                        o.status === 'Shipped' ||
                        o.status === 'Delivered' ||
                        o.stage_status?.toLowerCase() === 'packed' ||
                        linkedDCs.some((dc: any) => {
                          const st = (dc.status || '').toLowerCase();
                          return st === 'packed' || st === 'dispatched' || st === 'shipped' || st === 'delivered' || (!st.includes('awaiting') && !st.includes('pending') && st.length > 0);
                        })
                      );
                      const state: 'none' | 'partial' | 'full' = isFull ? 'full' : isPartial ? 'partial' : 'none';
                      return renderStatusCapsule(state, 'Packing');
                    }
                  },
                  {
                    header: 'Invoiced',
                    className: 'w-[85px] whitespace-nowrap text-center',
                    accessor: (o: any) => {
                      const isInvoiced = customerInvoices.some((inv: any) => inv.order_id === o.id || inv.order_no === o.order_no || inv.order_ref === o.order_no) || o.status === 'Invoiced' || o.invoiced === true;
                      return (
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-lg border whitespace-nowrap ${
                          isInvoiced ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-zinc-50 text-zinc-500 border-zinc-200'
                        }`}>
                          {isInvoiced ? 'Invoiced' : 'Pending'}
                        </span>
                      );
                    }
                  },
                  {
                    header: 'Shipped',
                    className: 'w-[85px] whitespace-nowrap text-center',
                    sortable: true,
                    sortValue: (o: any) => {
                      const linkedDCs = deliveryChallans.filter((dc: any) => dc.order_id === o.id || dc.orders?.order_no === o.order_no);
                      const isPartial = 
                        o.shipping_status?.toLowerCase().includes('part') ||
                        o.dispatch_status?.toLowerCase().includes('part') ||
                        o.status?.toLowerCase().includes('partially ship') ||
                        o.status?.toLowerCase().includes('partially dispatch') ||
                        o.stage_status?.toLowerCase().includes('partially ship') ||
                        linkedDCs.some((dc: any) => (dc.status || '').toLowerCase().includes('part'));
                      const isFull = !isPartial && (
                        o.shipping_status?.toLowerCase() === 'shipped' ||
                        o.shipping_status?.toLowerCase() === 'delivered' ||
                        o.dispatch_status?.toLowerCase() === 'shipped' ||
                        o.dispatch_status?.toLowerCase() === 'dispatched' ||
                        o.status === 'Shipped' ||
                        o.status === 'Delivered' ||
                        o.stage_status?.toLowerCase() === 'shipped' ||
                        o.stage_status?.toLowerCase() === 'delivered' ||
                        linkedDCs.some((dc: any) => {
                          const st = (dc.status || '').toLowerCase();
                          return st.includes('dispatch') || st.includes('shipped') || st.includes('deliver');
                        })
                      );
                      return isFull ? 2 : isPartial ? 1 : 0;
                    },
                    accessor: (o: any) => {
                      const linkedDCs = deliveryChallans.filter((dc: any) => dc.order_id === o.id || dc.orders?.order_no === o.order_no);
                      const isPartial = 
                        o.shipping_status?.toLowerCase().includes('part') ||
                        o.dispatch_status?.toLowerCase().includes('part') ||
                        o.status?.toLowerCase().includes('partially ship') ||
                        o.status?.toLowerCase().includes('partially dispatch') ||
                        o.stage_status?.toLowerCase().includes('partially ship') ||
                        linkedDCs.some((dc: any) => (dc.status || '').toLowerCase().includes('part'));
                      const isFull = !isPartial && (
                        o.shipping_status?.toLowerCase() === 'shipped' ||
                        o.shipping_status?.toLowerCase() === 'delivered' ||
                        o.dispatch_status?.toLowerCase() === 'shipped' ||
                        o.dispatch_status?.toLowerCase() === 'dispatched' ||
                        o.status === 'Shipped' ||
                        o.status === 'Delivered' ||
                        o.stage_status?.toLowerCase() === 'shipped' ||
                        o.stage_status?.toLowerCase() === 'delivered' ||
                        linkedDCs.some((dc: any) => {
                          const st = (dc.status || '').toLowerCase();
                          return st.includes('dispatch') || st.includes('shipped') || st.includes('deliver');
                        })
                      );
                      const state: 'none' | 'partial' | 'full' = isFull ? 'full' : isPartial ? 'partial' : 'none';
                      return renderStatusCapsule(state, 'Shipping');
                    }
                  },
                  {
                    header: 'Payment',
                    className: 'w-[95px] whitespace-nowrap text-center',
                    sortable: true,
                    sortValue: (o: any) => {
                      const quote = o.quotations || quotations.find((q: any) => 
                        (o.quotation_id && String(q.id) === String(o.quotation_id)) ||
                        (o.quotation_no && q.quotation_no === o.quotation_no)
                      );
                      const soVal = parseFloat(String(quote?.final_quote_value !== undefined ? quote.final_quote_value : (o.total_amount || 0)));
                      
                      const matchedPayments = customerPayments.filter((p: any) => {
                        if (p.order_id && o.id && String(p.order_id) === String(o.id)) return true;
                        if (p.order_no && o.order_no && String(p.order_no) === String(o.order_no)) return true;
                        if (p.order_ref && o.order_no && (String(p.order_ref) === String(o.order_no) || String(p.order_ref).includes(String(o.order_no)))) return true;
                        if (p.order_ref && quote?.quotation_no && (String(p.order_ref) === String(quote.quotation_no) || String(p.order_ref).includes(String(quote.quotation_no)))) return true;
                        if (quote?.id && p.quotation_id && String(p.quotation_id) === String(quote.id)) return true;
                        if (o.quotation_id && p.quotation_id && String(p.quotation_id) === String(o.quotation_id)) return true;
                        if (p.quotation_no && quote?.quotation_no && String(p.quotation_no) === String(quote.quotation_no)) return true;
                        if (p.notes && o.order_no && p.notes.includes(o.order_no)) return true;
                        return false;
                      });

                      const paymentsSum = matchedPayments.reduce((acc: number, p: any) => acc + parseFloat(String(p.amount || 0)), 0);
                      const directOrderPaid = parseFloat(String(o.paid_amount || o.advance_paid || o.advance_amount || 0));
                      const quotePaid = parseFloat(String(quote?.paid_amount || quote?.advance_paid || quote?.advance_amount || 0));

                      const orderInvoices = customerInvoices.filter((inv: any) => 
                        (inv.order_id && o.id && String(inv.order_id) === String(o.id)) || 
                        (inv.order_no && o.order_no && String(inv.order_no) === String(o.order_no))
                      );
                      const invoicePaidSum = orderInvoices.reduce((sum: number, inv: any) => sum + parseFloat(String(inv.paid_amount || 0)), 0);

                      const totalPaid = Math.max(paymentsSum, directOrderPaid, quotePaid, invoicePaidSum);

                      const pStatus = (o.payment_status || o.paymentStatus || quote?.payment_status || '').toLowerCase();
                      const oStatus = (o.status || '').toLowerCase();

                      const isPaid = 
                        pStatus === 'paid' || 
                        pStatus === 'fully paid' || 
                        oStatus === 'paid' || 
                        (soVal > 0 && totalPaid >= soVal);

                      const isPartial = !isPaid && (
                        totalPaid > 0 ||
                        pStatus.includes('part') ||
                        pStatus.includes('advance') ||
                        oStatus.includes('partial') ||
                        orderInvoices.some((inv: any) => (inv.payment_status || '').toLowerCase().includes('part'))
                      );

                      return isPaid ? 2 : isPartial ? 1 : 0;
                    },
                    accessor: (o: any) => {
                      const quote = o.quotations || quotations.find((q: any) => 
                        (o.quotation_id && String(q.id) === String(o.quotation_id)) ||
                        (o.quotation_no && q.quotation_no === o.quotation_no)
                      );
                      const soVal = parseFloat(String(quote?.final_quote_value !== undefined ? quote.final_quote_value : (o.total_amount || 0)));
                      
                      const matchedPayments = customerPayments.filter((p: any) => {
                        if (p.order_id && o.id && String(p.order_id) === String(o.id)) return true;
                        if (p.order_no && o.order_no && String(p.order_no) === String(o.order_no)) return true;
                        if (p.order_ref && o.order_no && (String(p.order_ref) === String(o.order_no) || String(p.order_ref).includes(String(o.order_no)))) return true;
                        if (p.order_ref && quote?.quotation_no && (String(p.order_ref) === String(quote.quotation_no) || String(p.order_ref).includes(String(quote.quotation_no)))) return true;
                        if (quote?.id && p.quotation_id && String(p.quotation_id) === String(quote.id)) return true;
                        if (o.quotation_id && p.quotation_id && String(p.quotation_id) === String(o.quotation_id)) return true;
                        if (p.quotation_no && quote?.quotation_no && String(p.quotation_no) === String(quote.quotation_no)) return true;
                        if (p.notes && o.order_no && p.notes.includes(o.order_no)) return true;
                        return false;
                      });

                      const paymentsSum = matchedPayments.reduce((acc: number, p: any) => acc + parseFloat(String(p.amount || 0)), 0);
                      const directOrderPaid = parseFloat(String(o.paid_amount || o.advance_paid || o.advance_amount || 0));
                      const quotePaid = parseFloat(String(quote?.paid_amount || quote?.advance_paid || quote?.advance_amount || 0));

                      const orderInvoices = customerInvoices.filter((inv: any) => 
                        (inv.order_id && o.id && String(inv.order_id) === String(o.id)) || 
                        (inv.order_no && o.order_no && String(inv.order_no) === String(o.order_no))
                      );
                      const invoicePaidSum = orderInvoices.reduce((sum: number, inv: any) => sum + parseFloat(String(inv.paid_amount || 0)), 0);

                      const totalPaid = Math.max(paymentsSum, directOrderPaid, quotePaid, invoicePaidSum);

                      const pStatus = (o.payment_status || o.paymentStatus || quote?.payment_status || '').toLowerCase();
                      const oStatus = (o.status || '').toLowerCase();

                      const isPaid = 
                        pStatus === 'paid' || 
                        pStatus === 'fully paid' || 
                        oStatus === 'paid' || 
                        (soVal > 0 && totalPaid >= soVal);

                      const isPartial = !isPaid && (
                        totalPaid > 0 ||
                        pStatus.includes('part') ||
                        pStatus.includes('advance') ||
                        oStatus.includes('partial') ||
                        orderInvoices.some((inv: any) => (inv.payment_status || '').toLowerCase().includes('part'))
                      );

                      const state: 'none' | 'partial' | 'full' = isPaid ? 'full' : isPartial ? 'partial' : 'none';
                      const label = state === 'full' 
                        ? `Payment: Fully Paid${soVal > 0 ? ` (₹${(totalPaid || soVal).toLocaleString('en-IN')})` : ''}`
                        : state === 'partial' 
                          ? `Payment: Partially Paid${soVal > 0 ? ` (₹${totalPaid.toLocaleString('en-IN')} of ₹${soVal.toLocaleString('en-IN')})` : ''}`
                          : 'Payment: Unpaid';
                      return renderStatusCapsule(state, label);
                    }
                  },
                  {
                    header: 'SO Amount',
                    className: 'w-[125px] whitespace-nowrap text-right',
                    sortable: true,
                    sortValue: (o: any) => {
                      const quote = o.quotations || quotations.find((q: any) => 
                        (o.quotation_id && String(q.id) === String(o.quotation_id)) ||
                        (o.quotation_no && q.quotation_no === o.quotation_no)
                      );
                      return parseFloat(String(quote?.final_quote_value !== undefined ? quote.final_quote_value : (o.total_amount || 0)));
                    },
                    accessor: (o: any) => {
                      const quote = o.quotations || quotations.find((q: any) => 
                        (o.quotation_id && String(q.id) === String(o.quotation_id)) ||
                        (o.quotation_no && q.quotation_no === o.quotation_no)
                      );
                      const val = parseFloat(String(quote?.final_quote_value !== undefined ? quote.final_quote_value : (o.total_amount || 0)));
                      return (
                        <span className="font-mono font-black text-zinc-800 text-xs whitespace-nowrap">
                          {val > 0 ? `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </span>
                      );
                    }
                  },
                  {
                    header: 'Invoiced Amount',
                    className: 'w-[130px] whitespace-nowrap text-right',
                    sortable: true,
                    sortValue: (o: any) => {
                      const orderInvoices = customerInvoices.filter((inv: any) => inv.order_id === o.id || inv.order_no === o.order_no || inv.order_ref === o.order_no);
                      return orderInvoices.reduce((sum: number, inv: any) => sum + parseFloat(String(inv.total_amount || inv.amount || 0)), 0);
                    },
                    accessor: (o: any) => {
                      const orderInvoices = customerInvoices.filter((inv: any) => inv.order_id === o.id || inv.order_no === o.order_no || inv.order_ref === o.order_no);
                      const invoicedVal = orderInvoices.reduce((sum: number, inv: any) => sum + parseFloat(String(inv.total_amount || inv.amount || 0)), 0);
                      return (
                        <span className="font-mono font-black text-zinc-800 text-xs whitespace-nowrap">
                          {invoicedVal > 0 ? `₹${invoicedVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </span>
                      );
                    }
                  }
                ]}
                data={customerOrders.filter((o: any) => matchesDateFilter(o.order_date || o.created_at, orderDateFilter))}
                isLoading={isLoadingOrg}
                searchPlaceholder="Search"
                emptyMessage="No sales orders placed for this customer yet."
              />
            </div>
          )}

          {/* Sub-View 4: Packages Table */}
          {transactionSubTab === 'packages' && (
            <div className="bg-white rounded-[2.5rem] border border-zinc-150/50 shadow-sm p-6 animate-in fade-in duration-300">
              <DataTable
                title="Packaging & Carton Dispatches"
                subtitle={`Carton parcels, packing lists and uniform packaging logs for ${org.name}`}
                headerAction={
                  <DateRangeFilter
                    label="Date"
                    value={packageDateFilter}
                    onChange={setPackageDateFilter}
                  />
                }
                columns={[
                  {
                    header: 'Date',
                    className: 'w-[105px] whitespace-nowrap',
                    sortable: true,
                    sortValue: (pkg: any) => new Date(pkg.date || 0).getTime(),
                    accessor: (pkg: any) => (
                      <span className="text-zinc-600 font-bold text-xs whitespace-nowrap">
                        {formatDate(pkg.date)}
                      </span>
                    )
                  },
                  {
                    header: 'Packing Slip No.',
                    className: 'w-[150px] whitespace-nowrap',
                    accessor: (pkg: any) => (
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                          <Boxes size={13} />
                        </div>
                        <span className="font-mono font-black text-zinc-900 text-xs">
                          {pkg.package_no}
                        </span>
                      </div>
                    )
                  },
                  {
                    header: 'SO No.',
                    className: 'w-[125px] whitespace-nowrap',
                    accessor: (pkg: any) => (
                      <span className="font-mono font-bold text-xs text-[#9E1B1D] whitespace-nowrap">
                        {pkg.order_no}
                      </span>
                    )
                  },
                  {
                    header: 'Description',
                    className: 'min-w-[170px] max-w-[250px]',
                    accessor: (pkg: any) => (
                      <span className="text-xs text-zinc-700 font-medium truncate block" title={pkg.description}>
                        {pkg.description || 'Uniform Apparel Shipment'}
                      </span>
                    )
                  },
                  {
                    header: 'Sales Person',
                    className: 'min-w-[130px] whitespace-nowrap text-center',
                    accessor: (pkg: any) => (
                      <div className="flex justify-center text-center">
                        <span className="text-xs text-zinc-600 font-semibold whitespace-nowrap">
                          {pkg.sales_person || 'Unassigned'}
                        </span>
                      </div>
                    )
                  },
                  {
                    header: 'Stage Status',
                    className: 'w-[110px] whitespace-nowrap text-center',
                    accessor: (pkg: any) => {
                      const st = pkg.stage_status || pkg.status || 'Packed';
                      const isDispatched = st.toLowerCase().includes('dispatch') || st.toLowerCase().includes('deliver');
                      return (
                        <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-lg border whitespace-nowrap ${
                          isDispatched ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {st}
                        </span>
                      );
                    }
                  },
                  {
                    header: 'Order Update',
                    className: 'min-w-[160px] max-w-[240px]',
                    accessor: (pkg: any) => (
                      <span className="text-xs text-zinc-600 font-medium truncate block" title={pkg.order_update}>
                        {pkg.order_update || 'Ready for shipment'}
                      </span>
                    )
                  },
                  {
                    header: 'Shipment Date',
                    className: 'w-[115px] whitespace-nowrap',
                    accessor: (pkg: any) => (
                      <span className="text-zinc-600 font-semibold text-xs whitespace-nowrap">
                        {pkg.shipment_date ? formatDate(pkg.shipment_date) : '—'}
                      </span>
                    )
                  },
                  {
                    header: 'Carton Breakdown',
                    className: 'w-[140px] whitespace-nowrap',
                    accessor: (pkg: any) => (
                      <span className="px-2.5 py-1 text-[10px] font-bold bg-zinc-100 text-zinc-700 rounded-lg border border-zinc-200 whitespace-nowrap">
                        {pkg.carton_label}
                      </span>
                    )
                  }
                ]}
                data={customerPackages.filter((pkg: any) => matchesDateFilter(pkg.date, packageDateFilter))}
                isLoading={isLoadingChallans}
                searchPlaceholder="Search"
                emptyMessage="No packaging consignments logged yet for this customer."
              />
            </div>
          )}

          {/* Sub-View 5: Shipments Table */}
          {transactionSubTab === 'shipments' && (
            <div className="bg-white rounded-[2.5rem] border border-zinc-150/50 shadow-sm p-6 animate-in fade-in duration-300">
              <DataTable
                title="Shipments"
                subtitle={`Official delivery challans (DC) and dispatch consignments generated for ${org.name}`}
                headerAction={
                  <DateRangeFilter
                    label="Date"
                    value={shipmentDateFilter}
                    onChange={setShipmentDateFilter}
                  />
                }
                columns={[
                  {
                    header: 'Date',
                    className: 'w-[105px] whitespace-nowrap',
                    sortable: true,
                    sortValue: (dc: any) => new Date(dc.date || dc.dispatch_date || dc.created_at || 0).getTime(),
                    accessor: (dc: any) => (
                      <span className="text-zinc-600 font-bold text-xs whitespace-nowrap">
                        {formatDate(dc.date || dc.dispatch_date || dc.created_at)}
                      </span>
                    )
                  },
                  {
                    header: 'Delivery Challan No.',
                    className: 'w-[160px] whitespace-nowrap',
                    accessor: (dc: any) => (
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
                          <Truck size={13} />
                        </div>
                        <span className="font-mono font-black text-zinc-900 text-xs">
                          {dc.dc_no}
                        </span>
                      </div>
                    )
                  },
                  {
                    header: 'SO No.',
                    className: 'w-[125px] whitespace-nowrap',
                    accessor: (dc: any) => (
                      <span className="font-mono font-bold text-xs text-[#9E1B1D] whitespace-nowrap">
                        {dc.order_no}
                      </span>
                    )
                  },
                  {
                    header: 'Description',
                    className: 'min-w-[170px] max-w-[250px]',
                    accessor: (dc: any) => (
                      <span className="text-xs text-zinc-700 font-medium truncate block" title={dc.description}>
                        {dc.description || 'Uniform Apparel Shipment'}
                      </span>
                    )
                  },
                  {
                    header: 'Sales Person',
                    className: 'min-w-[130px] whitespace-nowrap text-center',
                    accessor: (dc: any) => (
                      <div className="flex justify-center text-center">
                        <span className="text-xs text-zinc-600 font-semibold whitespace-nowrap">
                          {dc.sales_person || 'Unassigned'}
                        </span>
                      </div>
                    )
                  },
                  {
                    header: 'Order Update',
                    className: 'min-w-[160px] max-w-[240px]',
                    accessor: (dc: any) => (
                      <span className="text-xs text-zinc-600 font-medium truncate block" title={dc.order_update}>
                        {dc.order_update || 'Dispatched for delivery'}
                      </span>
                    )
                  },
                  {
                    header: 'Shipment Date',
                    className: 'w-[115px] whitespace-nowrap',
                    accessor: (dc: any) => (
                      <span className="text-zinc-600 font-semibold text-xs whitespace-nowrap">
                        {dc.shipment_date ? formatDate(dc.shipment_date) : '—'}
                      </span>
                    )
                  },
                  {
                    header: 'Carrier',
                    className: 'min-w-[130px] whitespace-nowrap',
                    accessor: (dc: any) => (
                      <span className="text-zinc-800 font-bold text-xs whitespace-nowrap">
                        {dc.carrier || dc.transporter_name || 'Standard Logistics'}
                      </span>
                    )
                  },
                  {
                    header: 'LR No.',
                    className: 'w-[110px] whitespace-nowrap',
                    accessor: (dc: any) => (
                      <span className="font-mono text-xs text-zinc-600 font-semibold whitespace-nowrap">
                        {dc.lr_no || '—'}
                      </span>
                    )
                  },
                  {
                    header: 'Transporter Contact',
                    className: 'w-[140px] whitespace-nowrap',
                    accessor: (dc: any) => (
                      <span className="text-xs text-zinc-600 font-medium whitespace-nowrap">
                        {dc.transporter_contact || '—'}
                      </span>
                    )
                  },
                  {
                    header: 'No. Of Packages',
                    className: 'w-[120px] whitespace-nowrap text-center',
                    accessor: (dc: any) => (
                      <span className="px-2.5 py-0.5 text-[10px] font-black bg-zinc-100 text-zinc-700 rounded-lg border border-zinc-200 whitespace-nowrap">
                        {dc.total_packages || 1} Box(es)
                      </span>
                    )
                  },
                  {
                    header: 'EWay Bill No.',
                    className: 'w-[130px] whitespace-nowrap',
                    accessor: (dc: any) => (
                      <span className="font-mono text-xs text-zinc-600 font-medium whitespace-nowrap">
                        {dc.eway_bill_no || '—'}
                      </span>
                    )
                  }
                ]}
                data={customerShipments.filter((dc: any) => matchesDateFilter(dc.date || dc.dispatch_date || dc.created_at, shipmentDateFilter))}
                isLoading={isLoadingChallans}
                searchPlaceholder="Search"
                emptyMessage="No shipments or delivery challans logged for this customer."
              />
            </div>
          )}

          {/* Sub-View 6: Proforma Invoice Table */}
          {transactionSubTab === 'pro_forma_invoice' && (
            <div className="bg-white rounded-[2.5rem] border border-zinc-150/50 shadow-sm p-6 animate-in fade-in duration-300">
              <DataTable
                title="Proforma Invoice"
                subtitle={`Advance commercial quotes & proforma billing estimates for ${org.name}`}
                onRowClick={(pi: any) => handleOpenProforma(pi)}
                headerAction={
                  <DateRangeFilter
                    label="Date"
                    value={proformaDateFilter}
                    onChange={setProformaDateFilter}
                  />
                }
                rightAction={
                  !isClientUser && (
                    <Button
                      onClick={() => {
                        setSelectedQuoteIdForProforma(customerQuotes.length > 0 ? String(customerQuotes[0].id) : '');
                        setIsCreateProformaModalOpen(true);
                      }}
                      className="h-9 px-4 rounded-xl bg-[#C82A2B] hover:bg-[#A81D1E] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-[#C82A2B]/20 transition-all cursor-pointer"
                    >
                      <Plus size={15} />
                      <span>Create Proforma</span>
                    </Button>
                  )
                }
                columns={[
                  {
                    header: 'Date',
                    className: 'w-[105px] whitespace-nowrap',
                    sortable: true,
                    sortValue: (pi: any) => new Date(pi.date || 0).getTime(),
                    accessor: (pi: any) => (
                      <span className="text-zinc-600 font-bold text-xs whitespace-nowrap">
                        {formatDate(pi.date)}
                      </span>
                    )
                  },
                  {
                    header: 'Proforma Invoice No.',
                    className: 'w-[160px] whitespace-nowrap',
                    accessor: (pi: any) => (
                      <div className="font-mono font-black text-[#9E1B1D] flex items-center gap-1.5 whitespace-nowrap">
                        <FileSpreadsheet size={14} className="text-[#C82A2B] shrink-0" />
                        <span>{pi.pi_no}</span>
                      </div>
                    )
                  },
                  {
                    header: 'SO No.',
                    className: 'w-[125px] whitespace-nowrap',
                    accessor: (pi: any) => (
                      <span className="font-mono font-bold text-xs text-zinc-800 whitespace-nowrap">
                        {pi.order_no}
                      </span>
                    )
                  },
                  {
                    header: 'Sales Person',
                    className: 'min-w-[130px] whitespace-nowrap text-center',
                    accessor: (pi: any) => (
                      <div className="flex justify-center text-center">
                        <span className="text-xs text-zinc-600 font-semibold whitespace-nowrap">
                          {pi.sales_person || 'Unassigned'}
                        </span>
                      </div>
                    )
                  },
                  {
                    header: 'Stage Status',
                    className: 'w-[130px] whitespace-nowrap text-center',
                    accessor: (pi: any) => {
                      const isOrder = pi.status?.toLowerCase().includes('order');
                      const isReady = pi.status?.toLowerCase().includes('ready') || pi.status?.toLowerCase().includes('accept');
                      return (
                        <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-lg border whitespace-nowrap ${
                          isOrder
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isReady
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {pi.status}
                        </span>
                      );
                    }
                  },
                  {
                    header: 'Amount',
                    className: 'w-[130px] whitespace-nowrap text-right',
                    sortable: true,
                    sortValue: (pi: any) => parseFloat(String(pi.amount || 0)),
                    accessor: (pi: any) => (
                      <div className="text-right">
                        <span className="font-mono font-black text-zinc-900 text-xs whitespace-nowrap">
                          ₹{parseFloat(String(pi.amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )
                  }
                ]}
                data={customerProFormaInvoices.filter((pi: any) => matchesDateFilter(pi.date, proformaDateFilter))}
                isLoading={isLoadingOrg}
                searchPlaceholder="Search"
                emptyMessage="No proforma invoices generated for this customer."
              />
            </div>
          )}

          {/* Sub-View 7: Invoices Table */}
          {transactionSubTab === 'invoices' && (
            <div className="bg-white rounded-[2.5rem] border border-zinc-150/50 shadow-sm p-6 animate-in fade-in duration-300">
              <DataTable
                title="Invoice"
                onRowClick={(inv: any) => {
                  setSelectedTaxInvoice({
                    ...inv,
                    order_no: inv.order_no,
                    customer: {
                      name: org.name,
                      address: org.address,
                      city: org.city,
                      state: org.state,
                      pincode: org.pincode,
                      country: org.country || 'India',
                      gst_number: org.gst_number,
                      contact_person: org.contact_person || (orgDetails?.staff?.[0]?.name),
                      phone: org.phone,
                      email: org.email
                    }
                  });
                  setIsTaxInvoiceModalOpen(true);
                }}
                subtitle={`Commercial tax invoices and retail cash registers billed to ${org.name}`}
                headerAction={
                  <DateRangeFilter
                    label="Date"
                    value={invoiceDateFilter}
                    onChange={setInvoiceDateFilter}
                  />
                }

                columns={[
                  {
                    header: 'Date',
                    className: 'w-[105px] whitespace-nowrap',
                    sortable: true,
                    sortValue: (inv: any) => new Date(inv.date || inv.invoice_date || inv.created_at || 0).getTime(),
                    accessor: (inv: any) => (
                      <span className="text-zinc-600 font-bold text-xs whitespace-nowrap">
                        {formatDate(inv.date || inv.invoice_date || inv.created_at)}
                      </span>
                    )
                  },
                  {
                    header: 'Invoice No.',
                    className: 'w-[140px] whitespace-nowrap',
                    accessor: (inv: any) => (
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <div className="w-6 h-6 rounded-md bg-rose-50 text-[#9E1B1D] border border-rose-200 flex items-center justify-center shrink-0">
                          <ReceiptText size={13} />
                        </div>
                        <span className="font-mono font-black text-[#9E1B1D] text-xs">
                          {inv.invoice_no}
                        </span>
                      </div>
                    )
                  },
                  {
                    header: 'SO No.',
                    className: 'w-[125px] whitespace-nowrap',
                    accessor: (inv: any) => (
                      <span className="font-mono font-bold text-xs text-zinc-800 whitespace-nowrap">
                        {inv.order_no || '—'}
                      </span>
                    )
                  },
                  {
                    header: 'Sales Person',
                    className: 'min-w-[130px] whitespace-nowrap text-center',
                    accessor: (inv: any) => (
                      <div className="flex justify-center text-center">
                        <span className="text-xs text-zinc-600 font-semibold whitespace-nowrap">
                          {inv.sales_person || 'Unassigned'}
                        </span>
                      </div>
                    )
                  },
                  {
                    header: 'Stage Status',
                    className: 'w-[110px] whitespace-nowrap text-center',
                    accessor: (inv: any) => {
                      const st = inv.stage_status || (inv.due_amount <= 0 ? 'Closed' : 'Active');
                      const isClosed = st.toLowerCase().includes('close') || st.toLowerCase().includes('paid');
                      return (
                        <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-lg border whitespace-nowrap ${
                          isClosed
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {st}
                        </span>
                      );
                    }
                  },
                  {
                    header: 'Amount',
                    className: 'w-[125px] whitespace-nowrap text-right',
                    sortable: true,
                    sortValue: (inv: any) => parseFloat(String(inv.total_amount || 0)),
                    accessor: (inv: any) => (
                      <span className="font-mono font-black text-zinc-900 text-xs whitespace-nowrap">
                        ₹{parseFloat(String(inv.total_amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    )
                  },
                  {
                    header: 'Balance Due',
                    className: 'w-[125px] whitespace-nowrap text-right',
                    sortable: true,
                    sortValue: (inv: any) => parseFloat(String(inv.due_amount !== undefined ? inv.due_amount : (parseFloat(String(inv.total_amount || 0)) - parseFloat(String(inv.paid_amount || 0))))),
                    accessor: (inv: any) => {
                      const bal = parseFloat(String(inv.due_amount !== undefined ? inv.due_amount : (parseFloat(String(inv.total_amount || 0)) - parseFloat(String(inv.paid_amount || 0)))));
                      return (
                        <span className={`font-mono font-black text-xs whitespace-nowrap ${bal > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          ₹{Math.max(0, bal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      );
                    }
                  },
                  {
                    header: 'Due Date',
                    className: 'w-[110px] whitespace-nowrap',
                    accessor: (inv: any) => (
                      <span className="text-zinc-500 font-semibold text-xs whitespace-nowrap">
                        {inv.due_date ? formatDate(inv.due_date) : '—'}
                      </span>
                    )
                  },
                  {
                    header: 'Status',
                    className: 'w-[110px] whitespace-nowrap text-center',
                    accessor: (inv: any) => {
                      const st = inv.payment_status || 'Unpaid';
                      const isPaid = st.toLowerCase().includes('paid') && !st.toLowerCase().includes('partial');
                      const isPartial = st.toLowerCase().includes('partial');
                      return (
                        <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-lg border whitespace-nowrap ${
                          isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          isPartial ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {st}
                        </span>
                      );
                    }
                  }
                ]}
                data={customerInvoices.filter((inv: any) => matchesDateFilter(inv.date || inv.invoice_date || inv.created_at, invoiceDateFilter))}
                isLoading={isLoadingLedger}
                searchPlaceholder="Search"
                emptyMessage="No invoices generated yet for this customer."
              />
            </div>
          )}

          {/* Sub-View 7: Expenses Table */}
          {transactionSubTab === 'expenses' && (
            <div className="bg-white rounded-[2.5rem] border border-zinc-150/50 shadow-sm p-6 animate-in fade-in duration-300">
              <DataTable
                title="Customer & Job Expenses"
                subtitle={`Direct commercial costs, materials procurement & development charges for ${org.name}`}
                headerAction={
                  <div className="flex flex-wrap items-center gap-3">
                    <DateRangeFilter
                      label="Date"
                      value={expenseDateFilter}
                      onChange={setExpenseDateFilter}
                    />
                    <Button
                      onClick={() => {
                        setNewExpenseForm({
                          date: new Date().toISOString().slice(0, 10),
                          category: 'Fabric & Raw Materials',
                          amount: '',
                          so_no: customerOrders?.[0]?.order_no || quotations?.[0]?.order_no || '',
                          sales_person: org?.relationship_manager?.full_name || employees?.[0]?.full_name || '',
                          payment_mode: 'Bank Transfer',
                          voucher_no: `EXP-M-${Date.now().toString().slice(-6)}`,
                          description: '',
                          status: 'Paid'
                        });
                        setIsAddExpenseModalOpen(true);
                      }}
                      className="h-10 px-4 rounded-xl bg-[#C82A2B] hover:bg-[#A81D1E] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md shadow-[#C82A2B]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Plus size={15} />
                      <span>Add Expense</span>
                    </Button>
                  </div>
                }
                columns={[
                  {
                    header: 'Date',
                    className: 'w-[105px] whitespace-nowrap',
                    sortable: true,
                    sortValue: (exp: any) => new Date(exp.date || 0).getTime(),
                    accessor: (exp: any) => (
                      <span className="text-zinc-600 font-bold text-xs whitespace-nowrap">
                        {formatDate(exp.date)}
                      </span>
                    )
                  },
                  {
                    header: 'Voucher No.',
                    className: 'w-[160px] whitespace-nowrap',
                    accessor: (exp: any) => (
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border ${
                          exp.is_manual 
                            ? 'bg-amber-50 text-amber-700 border-amber-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          <TrendingDown size={13} />
                        </div>
                        <span className="font-mono font-black text-zinc-900 text-xs">
                          {exp.voucher_no || exp.expense_ref}
                        </span>
                        {exp.is_manual && (
                          <span className="px-1.5 py-0.5 text-[8px] font-black uppercase rounded bg-amber-100 text-amber-800 tracking-wider">
                            Manual
                          </span>
                        )}
                      </div>
                    )
                  },
                  {
                    header: 'SO No.',
                    className: 'w-[125px] whitespace-nowrap',
                    accessor: (exp: any) => (
                      <span className="font-mono font-bold text-xs text-[#C82A2B] whitespace-nowrap">
                        {exp.so_no || exp.order_no || exp.linked_ref || '—'}
                      </span>
                    )
                  },
                  {
                    header: 'Description',
                    className: 'min-w-[180px] max-w-[280px]',
                    accessor: (exp: any) => (
                      <div className="flex flex-col max-w-[280px]">
                        <span 
                          className="text-xs text-zinc-700 font-medium block truncate" 
                          title={exp.description}
                        >
                          {exp.description}
                        </span>
                        {exp.category && (
                          <span className="text-[10px] text-zinc-400 font-semibold truncate mt-0.5">
                            {exp.category} {exp.payment_mode ? `• ${exp.payment_mode}` : ''}
                          </span>
                        )}
                      </div>
                    )
                  },
                  {
                    header: 'Sales Person',
                    className: 'min-w-[130px] whitespace-nowrap text-center',
                    accessor: (exp: any) => (
                      <div className="flex justify-center text-center">
                        <span className="text-xs text-zinc-600 font-semibold whitespace-nowrap">
                          {exp.sales_person || 'Unassigned'}
                        </span>
                      </div>
                    )
                  },
                  {
                    header: 'Amount',
                    className: 'w-[130px] whitespace-nowrap text-right',
                    accessor: (exp: any) => (
                      <span className="font-mono font-black text-zinc-900 text-xs whitespace-nowrap">
                        ₹{parseFloat(String(exp.amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    )
                  },
                  {
                    header: 'Status',
                    className: 'w-[110px] whitespace-nowrap text-center',
                    accessor: (exp: any) => (
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-lg border whitespace-nowrap ${
                        (exp.status || '').toLowerCase().includes('paid')
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : (exp.status || '').toLowerCase().includes('pending')
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        ✓ {exp.status || 'Allocated'}
                      </span>
                    )
                  }
                ]}
                data={customerExpenses.filter((exp: any) => matchesDateFilter(exp.date, expenseDateFilter))}
                isLoading={isLoadingOrg}
                searchPlaceholder="Search"
                emptyMessage="No commercial expenses allocated for this customer yet."
              />
            </div>
          )}

          {/* Sub-View 8: Financial Journals */}
          {transactionSubTab === 'journals' && (() => {
            const debits = customerJournals.reduce((sum, j) => sum + (j.debit || 0), 0);
            const credits = customerJournals.reduce((sum, j) => sum + (j.credit || 0), 0);
            const net = debits - credits;

            return (
              <div className="space-y-5 animate-in fade-in duration-300 relative">
                {/* Floating Journal Summary Quick Action Widget on Right Side (Shows on click only) */}
                {isJournalDrawerOpen && (
                  <div
                    className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]"
                    onClick={() => setIsJournalDrawerOpen(false)}
                  />
                )}
                <div
                  className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-stretch transition-transform duration-300 ease-out select-none ${
                    isJournalDrawerOpen ? 'translate-x-0' : 'translate-x-[calc(100%-46px)]'
                  }`}
                >
                  {/* Protruding Handle on Right Edge */}
                  <button
                    type="button"
                    onClick={() => setIsJournalDrawerOpen(!isJournalDrawerOpen)}
                    className="w-[46px] bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-l-2xl py-4 px-2 flex flex-col items-center justify-center gap-2.5 shadow-[-6px_4px_25px_rgba(200,42,43,0.25)] border-y border-l border-[#C82A2B]/40 cursor-pointer transition-all shrink-0"
                    title="Financial Journal Summary & Balances"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white">
                      <BookOpen size={16} />
                    </div>

                    <span className="[writing-mode:vertical-rl] rotate-180 text-[9px] font-black uppercase tracking-[0.2em] text-white/90 py-1">
                      Totals
                    </span>

                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase ${
                      net > 0 ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                    }`}>
                      {net >= 0 ? 'Dr' : 'Cr'}
                    </span>

                    <ChevronLeft
                      size={14}
                      className={`text-zinc-300 transition-transform duration-300 ${isJournalDrawerOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Pop-out Panel */}
                  <div className="w-80 bg-white rounded-l-3xl shadow-[-12px_10px_35px_rgba(0,0,0,0.14)] border-y border-l border-zinc-200 p-5 space-y-4 shrink-0 text-left">
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#FFF1F1] text-[#C82A2B] border border-[#C82A2B]/20 flex items-center justify-center">
                          <BookOpen size={16} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-zinc-900 tracking-tight">Financial Summary</h4>
                          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Journal Balances</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsJournalDrawerOpen(false)}
                        className="w-6 h-6 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Summary Cards */}
                    <div className="space-y-2.5">
                      {/* 1. Total Debits */}
                      <div className="p-3.5 bg-rose-50/50 hover:bg-rose-50 rounded-2xl border border-rose-150/70 flex items-center justify-between transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                            <ArrowUpRight size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Total Debits</p>
                            <p className="text-base font-black font-mono text-rose-700 leading-none mt-1">
                              ₹{debits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-mono">
                          Dr
                        </span>
                      </div>

                      {/* 2. Total Credits */}
                      <div className="p-3.5 bg-emerald-50/50 hover:bg-emerald-50 rounded-2xl border border-emerald-150/70 flex items-center justify-between transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <ArrowDownLeft size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Total Credits</p>
                            <p className="text-base font-black font-mono text-emerald-700 leading-none mt-1">
                              ₹{credits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-mono">
                          Cr
                        </span>
                      </div>

                      {/* 3. Closing Balance */}
                      <div className="p-3.5 bg-zinc-50 hover:bg-zinc-100/80 rounded-2xl border border-zinc-200 flex items-center justify-between transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-zinc-200 text-zinc-700 flex items-center justify-center">
                            <BookOpen size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Closing Balance</p>
                            <p className={`text-base font-black font-mono leading-none mt-1 ${net > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                              ₹{Math.abs(net).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono ${
                          net >= 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {net >= 0 ? 'Dr' : 'Cr'}
                        </span>
                      </div>
                    </div>

                    {/* Quick Action Button */}
                    <button
                      type="button"
                      onClick={() => setIsAddJournalModalOpen(true)}
                      className="w-full h-10 rounded-xl bg-[#C82A2B] hover:bg-[#A81D1E] text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-[#C82A2B]/20 transition-all cursor-pointer active:scale-95"
                    >
                      <Plus size={14} />
                      <span>New Journal Entry</span>
                    </button>
                  </div>
                </div>

                {/* General Journal Table */}
                <div className="bg-white rounded-[2.5rem] border border-zinc-150/50 shadow-sm p-6">
                <DataTable
                  title="Journals"
                  subtitle={`Custom double-entry journal vouchers added through the journal tab for ${org?.name}`}
                  headerAction={
                    <DateRangeFilter
                      label="Date"
                      value={journalDateFilter}
                      onChange={setJournalDateFilter}
                    />
                  }
                  columns={[
                    {
                      header: 'Date',
                      className: 'w-[110px] whitespace-nowrap',
                      sortValue: (j: any) => (j.date ? new Date(j.date).getTime() : 0),
                      accessor: (j: any) => (
                        <span className="text-zinc-600 font-bold text-xs whitespace-nowrap">
                          {formatDate(j.date)}
                        </span>
                      )
                    },
                    {
                      header: 'Voucher No.',
                      className: 'w-[150px] whitespace-nowrap',
                      sortValue: (j: any) => j.voucher_no || j.journal_no || j.ref,
                      accessor: (j: any) => {
                        const Icon = j.icon || BookOpen;
                        return (
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border ${j.icon_bg || 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                              <Icon size={13} />
                            </div>
                            <span className="font-mono font-black text-zinc-900 text-xs">
                              {j.voucher_no || j.journal_no || j.ref}
                            </span>
                          </div>
                        );
                      }
                    },
                    {
                      header: 'Account',
                      className: 'w-[170px] whitespace-nowrap',
                      sortValue: (j: any) => j.account,
                      accessor: (j: any) => (
                        <div>
                          <span className="font-bold text-xs text-zinc-900 block">
                            {j.account}
                          </span>
                          {j.offset_account && (
                            <span className="text-[10px] text-zinc-400 font-medium block">
                              Offset: {j.offset_account}
                            </span>
                          )}
                        </div>
                      )
                    },
                    {
                      header: 'Description',
                      className: 'min-w-[200px] max-w-[300px]',
                      sortValue: (j: any) => j.description || j.title || j.narration,
                      accessor: (j: any) => (
                        <span className="text-xs text-zinc-700 font-medium block truncate" title={j.description || j.narration || j.title}>
                          {j.description || j.narration || j.title || 'Manual double-entry voucher'}
                        </span>
                      )
                    },
                    {
                      header: 'Amount',
                      className: 'w-[130px] whitespace-nowrap text-right',
                      sortValue: (j: any) => (j.amount || j.debit || j.credit || 0),
                      accessor: (j: any) => (
                        <span className="font-mono font-black text-xs text-zinc-900 whitespace-nowrap">
                          ₹{parseFloat(String(j.amount || j.debit || j.credit || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      )
                    },
                    {
                      header: 'Status',
                      className: 'w-[100px] whitespace-nowrap text-center',
                      sortValue: (j: any) => j.status,
                      accessor: (j: any) => (
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-lg border bg-zinc-50 text-zinc-700 border-zinc-200 whitespace-nowrap">
                          ✓ {j.status || 'Posted'}
                        </span>
                      )
                    }
                  ]}
                  data={customerJournals.filter((j: any) => matchesDateFilter(j.date, journalDateFilter))}
                  isLoading={isLoadingLedger || isLoadingOrg}
                  searchPlaceholder="Search journals..."
                  emptyMessage="No custom journal entries added yet for this customer. Click + Add Journal to record one."
                  rightAction={
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        onClick={() => setIsAddJournalModalOpen(true)}
                        className="h-9 px-4 bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-xl font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5 shadow-sm shadow-[#C82A2B]/20 cursor-pointer transition-all"
                      >
                        <Plus size={14} strokeWidth={2.5} /> Add Journal
                      </Button>
                      
                    </div>
                  }
                />
              </div>
            </div>
          );
        })()}

        </div>
      )}

      {/* Tab 5: Customer Account Statement & Ledger Tab (Phase 1 Option B) */}
      {activeTab === 'ledger' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Header Action Bar */}
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                  <ReceiptText size={20} />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black italic tracking-tight text-zinc-900">
                    Customer Account Statement & Ledger
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C82A2B] opacity-80">
                    Running Debit & Credit Balance Ledger · {org.name} ({org.customer_code || `#${org.id}`})
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">

              <Button
                onClick={fetchLedgerData}
                variant="secondary"
                className="h-11 px-4 rounded-xl border border-zinc-200 text-xs font-black uppercase tracking-wider text-zinc-600 hover:bg-zinc-50 flex items-center gap-2"
                title="Refresh Ledger"
              >
                Refresh
              </Button>
              <Button
                onClick={exportLedgerCSV}
                variant="secondary"
                className="h-11 px-4 rounded-xl border border-zinc-200 text-xs font-black uppercase tracking-wider text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 shadow-sm"
              >
                <FileSpreadsheet size={15} />
                Export CSV
              </Button>
              <Button
                onClick={() => setIsPrintModalOpen(true)}
                className="h-11 px-6 rounded-xl bg-[#C82A2B] hover:bg-[#A81D1E] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#C82A2B]/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Printer size={15} />
                Print Statement
              </Button>
            </div>
          </div>

          {/* 5 Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. Opening Balance */}
            <div className="bg-white p-5 rounded-[2rem] border border-zinc-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Opening Balance</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Wallet size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl font-black italic tracking-tight text-zinc-900">
                  ₹{statementLedgerDetails.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h4>
                <p className="text-[10px] font-bold text-zinc-400 mt-1">
                  Balance Brought Forward
                </p>
              </div>
            </div>

            {/* 2. Total Invoiced */}
            <div className="bg-white p-5 rounded-[2rem] border border-zinc-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Invoiced / Orders</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ArrowUpRight size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl font-black italic tracking-tight text-zinc-900">
                  ₹{statementLedgerDetails.periodDebits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h4>
                <p className="text-[10px] font-bold text-zinc-400 mt-1">
                  {statementLedgerDetails.filteredTransactions.filter((t: any) => t.type === 'INVOICE' || t.type === 'ORDER').length} Period Invoices
                </p>
              </div>
            </div>

            {/* 3. Total Paid */}
            <div className="bg-white p-5 rounded-[2rem] border border-zinc-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Paid (Credits)</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ArrowDownLeft size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl font-black italic tracking-tight text-emerald-600">
                  ₹{statementLedgerDetails.periodCredits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h4>
                <p className="text-[10px] font-bold text-emerald-700/70 mt-1">
                  {statementLedgerDetails.filteredTransactions.filter((t: any) => t.type === 'PAYMENT').length} Period Payments
                </p>
              </div>
            </div>

            {/* 4. Outstanding Balance / Credit Balance */}
            <div className="bg-white p-5 rounded-[2rem] border border-zinc-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  {statementLedgerDetails.closingBalance < 0 ? 'Customer Credit' : 'Net Outstanding'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-[#C82A2B]/10 text-[#C82A2B] flex items-center justify-center">
                  <CreditCard size={16} />
                </div>
              </div>
              <div>
                <h4 className={`text-xl font-black italic tracking-tight ${
                  statementLedgerDetails.closingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}>
                  ₹{Math.abs(statementLedgerDetails.closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h4>
                <p className="text-[10px] font-bold text-zinc-400 mt-1">
                  {statementLedgerDetails.closingBalance > 0 
                    ? 'Pending Amount Due' 
                    : statementLedgerDetails.closingBalance < 0 
                    ? 'Credit Available' 
                    : 'Zero Outstanding'}
                </p>
              </div>
            </div>

            {/* 5. Settlement Status */}
            <div className="bg-white p-5 rounded-[2rem] border border-zinc-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Settlement Status</span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  statementLedgerDetails.closingBalance <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  {statementLedgerDetails.closingBalance <= 0 ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                </div>
              </div>
              <div>
                <span className={`inline-block px-2.5 py-0.5 text-xs font-black uppercase tracking-wider rounded-lg ${
                  statementLedgerDetails.closingBalance <= 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : statementLedgerDetails.periodCredits > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {statementLedgerDetails.closingBalance <= 0 
                    ? (statementLedgerDetails.closingBalance < 0 ? 'Credit Balance' : 'Settled') 
                    : (statementLedgerDetails.periodCredits > 0 ? 'Partially Paid' : 'Unpaid')}
                </span>
                <p className="text-[10px] font-bold text-zinc-400 mt-1.5">
                  Statement Status
                </p>
              </div>
            </div>
          </div>

          {/* Ledger Table Container */}
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
              <div>
                <h4 className="text-base font-black text-zinc-900 tracking-tight">Chronological Ledger Entries</h4>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">Audit breakdown with opening balance, billings, payments and running balances</p>
              </div>

              {/* Filter Section */}
              <div className="flex flex-wrap items-center gap-3">
                <DateRangeFilter
                  label="Date"
                  value={statementDateFilter}
                  onChange={setStatementDateFilter}
                />
                <div className="flex items-center bg-zinc-100 p-1 rounded-xl gap-1">
                  {(['all', 'invoices', 'payments'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setLedgerFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                        ledgerFilter === f
                          ? 'bg-white text-zinc-900 shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      {f === 'all' ? `All (${statementTableData.length})` : f === 'invoices' ? 'Orders & Invoices' : 'Payments Only'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table Component */}
            <DataTable<any>
              columns={[
                {
                  header: 'Date',
                  className: 'w-[105px] whitespace-nowrap',
                  sortable: true,
                  sortValue: (tx: any) => tx.is_opening ? -Infinity : new Date(tx.date || 0).getTime(),
                  accessor: (tx: any) => (
                    <span className={`font-bold text-xs whitespace-nowrap ${tx.is_opening ? 'text-zinc-400 italic' : 'text-zinc-800'}`}>
                      {tx.is_opening ? '—' : formatDate(tx.date)}
                    </span>
                  )
                },
                {
                  header: 'Voucher Type',
                  className: 'w-[160px] whitespace-nowrap',
                  accessor: (tx: any) => {
                    if (tx.is_opening) {
                      return (
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-lg border bg-zinc-100 text-zinc-700 border-zinc-200">
                          OPENING
                        </span>
                      );
                    }
                    return (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-lg border ${
                          tx.type === 'INVOICE'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : tx.type === 'ORDER'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {tx.type}
                        </span>
                        {tx.sale_type && (
                          <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded-md border ${
                            tx.sale_type === 'retail'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-teal-50 text-teal-800 border-teal-200'
                          }`}>
                            {tx.sale_type === 'retail' ? 'Retail' : 'Bulk'}
                          </span>
                        )}
                        <span className="font-mono text-xs font-bold text-zinc-900">{tx.reference_no}</span>
                      </div>
                    );
                  }
                },
                {
                  header: 'Description',
                  className: 'min-w-[200px]',
                  accessor: (tx: any) => {
                    if (tx.is_opening) {
                      return (
                        <span className="text-xs font-bold text-zinc-800 italic">
                          Opening Balance (Brought Forward)
                        </span>
                      );
                    }
                    return (
                      <div className="flex flex-col max-w-[320px]">
                        <span className="text-xs font-semibold text-zinc-700 truncate" title={tx.description}>{tx.description}</span>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {tx.order_ref && (
                            <span className="text-[10px] font-bold text-[#C82A2B] uppercase tracking-wider">{tx.order_ref}</span>
                          )}
                          {tx.type === 'INVOICE' && (
                            <span className="text-[10px] text-zinc-500 font-medium">
                              • Credit: <strong className="text-zinc-700">{tx.credit_period_days || 30}d</strong>
                              {tx.due_date && (
                                <> • Due: <strong className="text-zinc-700">{formatDate(tx.due_date)}</strong></>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }
                },
                {
                  header: 'Amount',
                  className: 'w-[130px] whitespace-nowrap text-right',
                  accessor: (tx: any) => (
                    <span className={`font-mono text-xs font-black ${tx.debit > 0 ? 'text-zinc-900' : 'text-zinc-300'}`}>
                      {tx.debit > 0 ? `₹${parseFloat(String(tx.debit)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </span>
                  )
                },
                {
                  header: 'Payments',
                  className: 'w-[130px] whitespace-nowrap text-right',
                  accessor: (tx: any) => (
                    <span className={`font-mono text-xs font-black ${tx.credit > 0 ? 'text-emerald-600' : 'text-zinc-300'}`}>
                      {tx.credit > 0 ? `₹${parseFloat(String(tx.credit)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </span>
                  )
                },
                {
                  header: 'Balance',
                  className: 'w-[130px] whitespace-nowrap text-right',
                  accessor: (tx: any) => {
                    const bal = tx.period_running_balance ?? tx.running_balance ?? 0;
                    return (
                      <span className={`font-mono text-xs font-black px-2.5 py-1 rounded-lg ${
                        bal > 0
                          ? 'bg-rose-50 text-rose-700 border border-rose-100'
                          : bal === 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-blue-50 text-blue-700 border border-blue-100'
                      }`}>
                        ₹{parseFloat(String(bal)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    );
                  }
                }
              ]}
              data={statementTableData}
              isLoading={isLoadingLedger}
              searchPlaceholder="Search"
            />
          </div>
        </div>
      )}

      {/* Customer Account Statement Print & PDF Modal */}
      {isPrintModalOpen && org && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl p-6 md:p-10 my-8">
            <div className="flex items-center justify-between pb-6 mb-6 border-b border-zinc-200">
              <div className="flex items-center gap-3">
                <ReceiptText className="text-[#C82A2B]" size={24} />
                <div>
                  <h3 className="text-xl font-black text-zinc-900">Print Customer Account Statement</h3>
                  <p className="text-xs text-zinc-500 font-medium">Official statement for {org.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => window.print()}
                  className="h-10 px-5 rounded-xl bg-[#C82A2B] hover:bg-[#A81D1E] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md shadow-[#C82A2B]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Printer size={15} />
                  Print / Save as PDF
                </Button>
                <Button
                  onClick={() => setIsPrintModalOpen(false)}
                  variant="secondary"
                  className="h-10 px-4 rounded-xl border border-zinc-200 text-xs font-black uppercase tracking-wider text-zinc-600"
                >
                  Close
                </Button>
              </div>
            </div>

            {/* Statement Printable Body */}
            <div className="space-y-6 text-zinc-900 font-sans" id="statement-print-area">
              {/* Header */}
              <div className="flex justify-between items-start pb-6 border-b-2 border-zinc-900">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-zinc-950">FORMA APPARELS</h2>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Central Manufacturing & Distribution</p>
                  <p className="text-xs text-zinc-600 mt-2">GSTIN: 32AABCF1234F1Z5</p>
                  <p className="text-xs text-zinc-600">Email: accounts@formaapparels.com | Phone: +91 98460 12345</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest rounded-md">
                    CUSTOMER STATEMENT
                  </span>
                  <p className="text-xs font-mono font-bold text-zinc-700 mt-2">
                    Ref: STM-{org.customer_code || org.id}-{new Date().toISOString().slice(2, 7).replace('-', '')}
                  </p>
                  <p className="text-xs text-zinc-500 font-medium mt-1">
                    Date: {formatDate(new Date())}
                  </p>
                </div>
              </div>

              {/* Client and Summary Grid */}
              <div className="grid grid-cols-3 gap-6 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                <div>
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Statement For (Client)</h4>
                  <p className="text-base font-black text-zinc-900">{org.name}</p>
                  <p className="text-xs text-zinc-600 font-medium mt-0.5">{org.address || 'Address not registered'}</p>
                  <p className="text-xs text-zinc-500 font-mono mt-1">Customer Code: {org.customer_code || `#${org.id}`} · Credit Terms: <strong>{org.credit_period_days || 30} Days</strong></p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Opening Balance</h4>
                  <p className="text-xl font-black text-zinc-800 font-mono">
                    ₹{statementLedgerDetails.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Brought Forward prior to period
                  </p>
                </div>
                <div className="text-right flex flex-col justify-between">
                  <div>
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Net Balance Due</h4>
                    <p className={`text-2xl font-black ${statementLedgerDetails.closingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ₹{Math.abs(statementLedgerDetails.closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Status: {statementLedgerDetails.closingBalance <= 0 ? 'Settled' : 'Payment Due'}
                  </p>
                </div>
              </div>

              {/* Statement Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-zinc-900 text-zinc-600 uppercase text-[9px] font-black tracking-wider">
                      <th className="py-2.5 px-2 text-center">Date</th>
                      <th className="py-2.5 px-2 text-center">Voucher Type</th>
                      <th className="py-2.5 px-2 text-center">Description</th>
                      <th className="py-2.5 px-2 text-center">Amount</th>
                      <th className="py-2.5 px-2 text-center">Payments</th>
                      <th className="py-2.5 px-2 text-center">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {/* Opening Balance Row */}
                    <tr className="bg-zinc-50 font-semibold text-zinc-700">
                      <td className="py-2 px-2 whitespace-nowrap text-center font-bold text-zinc-400">—</td>
                      <td className="py-2 px-2 font-mono font-bold whitespace-nowrap text-center">OB</td>
                      <td className="py-2 px-2 font-bold italic">Opening Balance (Brought Forward)</td>
                      <td className="py-2 px-2 text-right font-mono">
                        {statementLedgerDetails.openingBalance > 0 ? `₹${statementLedgerDetails.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-emerald-700">
                        {statementLedgerDetails.openingBalance < 0 ? `₹${Math.abs(statementLedgerDetails.openingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-black">
                        ₹{statementLedgerDetails.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>

                    {/* Period Transactions (No Time!) */}
                    {statementLedgerDetails.filteredTransactions.map((tx: any) => (
                      <tr key={tx.id} className="text-zinc-800">
                        <td className="py-2 px-2 font-medium whitespace-nowrap text-center">
                          {formatDate(tx.date)}
                        </td>
                        <td className="py-2 px-2 font-mono font-bold whitespace-nowrap text-center">{tx.reference_no}</td>
                        <td className="py-2 px-2 font-medium">
                          <div>{tx.description}</div>
                          {tx.type === 'INVOICE' && (
                            <div className="text-[10px] text-zinc-500 font-mono">
                              Credit: {tx.credit_period_days || 30}d {tx.due_date ? `| Due: ${formatDate(tx.due_date)}` : ''} {tx.due_status && tx.due_status !== 'Paid' ? `(${tx.due_status})` : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right font-mono">
                          {tx.debit > 0 ? `₹${Number(tx.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-emerald-700">
                          {tx.credit > 0 ? `₹${Number(tx.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-black">
                          ₹{Number(tx.period_running_balance ?? tx.running_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-zinc-900 font-bold bg-zinc-50">
                      <td colSpan={3} className="py-2.5 px-2 uppercase text-[10px] tracking-wider">Totals</td>
                      <td className="py-2.5 px-2 text-right font-mono">
                        ₹{(statementLedgerDetails.openingBalance > 0 ? statementLedgerDetails.openingBalance + statementLedgerDetails.periodDebits : statementLedgerDetails.periodDebits).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-emerald-700">
                        ₹{(statementLedgerDetails.openingBalance < 0 ? Math.abs(statementLedgerDetails.openingBalance) + statementLedgerDetails.periodCredits : statementLedgerDetails.periodCredits).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-black">
                        ₹{statementLedgerDetails.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Remittance Information & Signatory */}
              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-zinc-200 text-xs">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Bank Remittance Details</h4>
                  <p className="font-semibold text-zinc-800">Account: Forma Apparels Pvt Ltd</p>
                  <p className="text-zinc-600">Bank: HDFC Bank | A/C: 50200084920192</p>
                  <p className="text-zinc-600">IFSC: HDFC0001248 | UPI: forma@hdfcbank</p>
                </div>
                <div className="text-right flex flex-col justify-end items-end">
                  <div className="w-48 border-b border-zinc-400 pb-1 mb-1" />
                  <p className="text-[10px] font-bold uppercase text-zinc-500">Authorized Signatory / Accounts Desk</p>
                  <p className="text-[9px] text-zinc-400">Computer generated statement</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Manual Customer / Job Expense */}
      {isAddExpenseModalOpen && org && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
          onClick={() => {
            if (!isSubmittingExpense) setIsAddExpenseModalOpen(false);
          }}
        >
          <div 
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl p-6 md:p-8 my-8 border border-zinc-100 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-5 border-b border-zinc-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
                  <TrendingDown size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-zinc-900 tracking-tight">Record Direct Expense</h3>
                  <p className="text-xs text-zinc-500 font-medium">Add manual commercial, material procurement, or job cost for {org.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddExpenseModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-600 rounded-xl hover:bg-zinc-100 transition-colors"
                disabled={isSubmittingExpense}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveNewExpense} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                    Expense Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newExpenseForm.date}
                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, date: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#C82A2B]/20 focus:border-[#C82A2B]"
                  />
                </div>

                {/* Voucher / Ref No. */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                    Voucher / Reference No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EXP-2026-001"
                    value={newExpenseForm.voucher_no}
                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, voucher_no: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-xs font-mono font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#C82A2B]/20 focus:border-[#C82A2B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                    Expense Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newExpenseForm.category}
                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, category: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#C82A2B]/20 focus:border-[#C82A2B] bg-white"
                  >
                    <option value="Fabric & Raw Materials">Fabric & Raw Materials</option>
                    <option value="Trims, Buttons & Labels">Trims, Buttons & Labels</option>
                    <option value="Printing & Embroidery">Printing & Embroidery</option>
                    <option value="Stitching & Tailoring Wages">Stitching & Tailoring Wages</option>
                    <option value="Sampling & Pattern Development">Sampling & Pattern Development</option>
                    <option value="Packaging & Finishing">Packaging & Finishing</option>
                    <option value="Logistics & Delivery">Logistics & Delivery</option>
                    <option value="Job Work & Subcontracting">Job Work & Subcontracting</option>
                    <option value="Vendor Bill / Procurement">Vendor Bill / Procurement</option>
                    <option value="Other Direct Expense">Other Direct Expense</option>
                  </select>
                </div>

                {/* Linked Sales Order / Job No */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                    Linked Order / SO No.
                  </label>
                  <input
                    type="text"
                    list="orders-list-options"
                    placeholder="Select or enter SO / Order No."
                    value={newExpenseForm.so_no}
                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, so_no: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-xs font-mono font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#C82A2B]/20 focus:border-[#C82A2B]"
                  />
                  <datalist id="orders-list-options">
                    {(customerOrders || []).map((o: any) => (
                      <option key={o.id} value={o.order_no}>{o.order_no}</option>
                    ))}
                    {(quotations || []).map((q: any) => (
                      <option key={q.id} value={q.quotation_no}>{q.quotation_no}</option>
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Amount */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={newExpenseForm.amount}
                      onChange={(e) => setNewExpenseForm({ ...newExpenseForm, amount: e.target.value })}
                      className="w-full h-11 pl-8 pr-3.5 rounded-xl border border-zinc-200 text-xs font-mono font-black text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#C82A2B]/20 focus:border-[#C82A2B]"
                    />
                  </div>
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                    Payment Mode
                  </label>
                  <select
                    value={newExpenseForm.payment_mode}
                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, payment_mode: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#C82A2B]/20 focus:border-[#C82A2B] bg-white"
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Company Corporate Card">Company Corporate Card</option>
                    <option value="Vendor Payable / Credit">Vendor Payable / Credit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sales Person / Incurred By */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                    Incurred By / Staff
                  </label>
                  <input
                    type="text"
                    list="staff-list-options"
                    placeholder="Staff name"
                    value={newExpenseForm.sales_person}
                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, sales_person: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#C82A2B]/20 focus:border-[#C82A2B]"
                  />
                  <datalist id="staff-list-options">
                    {(employees || []).map((emp: any) => (
                      <option key={emp.id} value={emp.full_name}>{emp.full_name}</option>
                    ))}
                  </datalist>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                    Expense Status
                  </label>
                  <select
                    value={newExpenseForm.status}
                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, status: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#C82A2B]/20 focus:border-[#C82A2B] bg-white"
                  >
                    <option value="Paid">Paid / Settled</option>
                    <option value="Allocated">Allocated</option>
                    <option value="Pending">Pending Approval / Payment</option>
                  </select>
                </div>
              </div>

              {/* Description / Narration */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1.5">
                  Description / Narration <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Details of expense, vendor name, invoice reference, purpose..."
                  value={newExpenseForm.description}
                  onChange={(e) => setNewExpenseForm({ ...newExpenseForm, description: e.target.value })}
                  className="w-full p-3.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#C82A2B]/20 focus:border-[#C82A2B] resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsAddExpenseModalOpen(false)}
                  disabled={isSubmittingExpense}
                  className="h-11 px-5 rounded-xl border border-zinc-200 text-xs font-black uppercase tracking-wider text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingExpense}
                  className="h-11 px-6 rounded-xl bg-[#C82A2B] hover:bg-[#A81D1E] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#C82A2B]/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isSubmittingExpense ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>{isSubmittingExpense ? 'Recording...' : 'Record Expense'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Double Confirmation Delete Department Modal */}
      {deptDeleteModal.isOpen && deptDeleteModal.dept && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => {
            if (!deptDeleteModal.isDeleting) {
              setDeptDeleteModal({ isOpen: false, step: 1, dept: null, typedName: '', isDeleting: false });
            }
          }}
        >
          <div 
            className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {deptDeleteModal.step === 1 ? (
              /* STEP 1: Initial Warning Confirmation */
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-zinc-900 tracking-tight">
                      Delete Department? (Step 1 of 2)
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5">
                      First confirmation required
                    </p>
                  </div>
                </div>

                <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-amber-900 leading-relaxed">
                    Are you sure you want to delete department <span className="font-black text-zinc-900">&quot;{deptDeleteModal.dept.name}&quot;</span>?
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    This will permanently remove this department group. Linked member assignments will be cleared or unassigned. This action cannot be undone.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setDeptDeleteModal({ isOpen: false, step: 1, dept: null, typedName: '', isDeleting: false })}
                    className="h-10 px-4 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setDeptDeleteModal(prev => ({ ...prev, step: 2 }))}
                    className="h-10 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                  >
                    Proceed to Verification &rarr;
                  </Button>
                </div>
              </div>
            ) : (
              /* STEP 2: Name Verification */
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-[#C82A2B] flex items-center justify-center shrink-0">
                    <ShieldAlert size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-zinc-900 tracking-tight">
                      Confirm Deletion (Step 2 of 2)
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5">
                      Type the department name to permanently delete
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                    Please type{' '}
                    <span className="font-black text-zinc-900 bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200 select-all">
                      {deptDeleteModal.dept.name}
                    </span>{' '}
                    to verify:
                  </p>

                  <div className="space-y-1.5">
                    <input
                      type="text"
                      autoFocus
                      placeholder={`Type "${deptDeleteModal.dept.name}"`}
                      value={deptDeleteModal.typedName}
                      onChange={(e) => setDeptDeleteModal(prev => ({ ...prev, typedName: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && deptDeleteModal.typedName.trim() === deptDeleteModal.dept.name.trim() && !deptDeleteModal.isDeleting) {
                          handleExecuteDepartmentDelete();
                        }
                      }}
                      className="w-full h-11 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:border-[#C82A2B] focus:ring-2 focus:ring-[#C82A2B]/10 outline-none transition-all"
                    />
                    {deptDeleteModal.typedName && deptDeleteModal.typedName.trim() !== deptDeleteModal.dept.name.trim() && (
                      <p className="text-[10px] text-rose-500 font-semibold">
                        Name does not match yet.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setDeptDeleteModal(prev => ({ ...prev, step: 1 }))}
                    className="h-10 px-4 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                  >
                    &larr; Back
                  </Button>
                  <Button
                    type="button"
                    disabled={
                      deptDeleteModal.typedName.trim() !== deptDeleteModal.dept.name.trim() ||
                      deptDeleteModal.isDeleting
                    }
                    onClick={handleExecuteDepartmentDelete}
                    className="h-10 px-5 rounded-xl bg-[#C82A2B] hover:bg-[#A81D1E] disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {deptDeleteModal.isDeleting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} />
                        <span>Permanently Delete</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shared Modals */}

      <ConfirmModal
        isOpen={deleteEntityConfirm.isOpen}
        title="Delete Record?"
        message="This action will permanently remove the profile and revoke portal access. This cannot be undone."
        onConfirm={handleConfirmedDeleteEntity}
        onCancel={() => setDeleteEntityConfirm({ isOpen: false, id: null })}
        confirmLabel="Confirm Deletion"
        variant="danger"
      />

      <ConfirmModal
        isOpen={resetEntityConfirm.isOpen}
        title="Reset Access Keys?"
        message={`Generate new secure credentials for ${resetEntityConfirm.entity?.full_name}? Old keys will expire immediately.`}
        onConfirm={handleConfirmedResetEntity}
        onCancel={() => setResetEntityConfirm({ isOpen: false, entity: null })}
        confirmLabel="Generate Keys"
        variant="warning"
      />

      <CredentialsModal
        isOpen={credsModal.isOpen}
        onClose={() => setCredsModal({ isOpen: false, data: null })}
        data={credsModal.data}
      />

      <MemberProfileModal
        isOpen={profileModal.isOpen}
        onClose={() => setProfileModal({ isOpen: false, member: null })}
        member={profileModal.member}
      />

      {/* Edit Customer Profile Modal */}
      <CustomerFormModal
        isOpen={isEditingCustomer}
        onClose={() => setIsEditingCustomer(false)}
        onSubmit={handleUpdateCustomer}
        editingCustomer={org}
        industries={industries}
      />

      {/* Dedicated GST & Delivery Address Modal */}
      {isGstDeliveryModalOpen && (
        <div className="fixed inset-0 z-[125] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsGstDeliveryModalOpen(false)} />
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-zinc-100 overflow-hidden relative z-10 my-8">
            <div className="relative overflow-hidden bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-6 text-white flex items-center justify-between">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D] absolute top-0 left-0" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Truck size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">GST & Delivery Address Provisions</h3>
                  <p className="text-[11px] text-white/80 font-medium">
                    {org?.name} • {org?.customer_code ? `Code: ${org.customer_code}` : `#${org?.id}`}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => setIsGstDeliveryModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors bg-transparent border-none shadow-none text-white cursor-pointer"
              >
                <X size={20} />
              </Button>
            </div>

            <form onSubmit={handleSaveGstDelivery} className="p-6 md:p-8 space-y-6">
              {/* B2B Explanatory Notice */}
              <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                gstDeliveryForm.gst_number
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-600'
              }`}>
                <CheckCircle2 size={18} className={gstDeliveryForm.gst_number ? 'text-emerald-600 mt-0.5 shrink-0' : 'text-zinc-400 mt-0.5 shrink-0'} />
                <div className="text-xs leading-relaxed">
                  <span className="font-bold">Automatic B2B Commercial Sales:</span>{' '}
                  {gstDeliveryForm.gst_number ? (
                    <span>With a GSTIN on file, sales and quotations for this customer automatically become <strong>B2B</strong> with itemized GST tax breakdown and delivery destination on quotation invoices.</span>
                  ) : (
                    <span>Enter customer GST details below to automatically classify their quotations as <strong>B2B</strong>. Leaving GST blank keeps standard / B2C pricing.</span>
                  )}
                </div>
              </div>

              {/* Section 1: GST Identification */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
                  <ReceiptText size={16} className="text-[#9E1B1D]" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                    1. GST & Commercial Tax Identification
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-700">
                      GSTIN (15 Digits)
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={gstDeliveryForm.gst_number}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase().trim();
                        let updatedPan = gstDeliveryForm.pan_number;
                        if (val.length >= 12 && (!updatedPan || updatedPan.length < 10)) {
                          updatedPan = val.substring(2, 12);
                        }
                        setGstDeliveryForm(prev => ({
                          ...prev,
                          gst_number: val,
                          pan_number: updatedPan
                        }));
                      }}
                      placeholder="e.g. 27AAPFU0939F1ZV"
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-mono font-bold text-zinc-900 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 uppercase"
                    />
                    <p className="text-[10px] text-zinc-400 font-medium">
                      Entering GSTIN automatically sets this client to B2B and extracts the PAN.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-700">
                      Legal Business / Trade Name
                    </label>
                    <input
                      type="text"
                      value={gstDeliveryForm.legal_name}
                      onChange={(e) => setGstDeliveryForm(prev => ({ ...prev, legal_name: e.target.value }))}
                      placeholder={org?.name || 'Legal Company Name'}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-900 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-700">
                      PAN Number (10 Digits)
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={gstDeliveryForm.pan_number}
                      onChange={(e) => setGstDeliveryForm(prev => ({ ...prev, pan_number: e.target.value.toUpperCase().trim() }))}
                      placeholder="e.g. AAPFU0939F"
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-mono font-bold text-zinc-900 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10 uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Delivery Address */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Truck size={16} className="text-[#9E1B1D]" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                      2. Delivery / Dispatch Destination
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setGstDeliveryForm(prev => ({
                        ...prev,
                        delivery_address: org?.address || '',
                        delivery_city: org?.city || '',
                        delivery_state: org?.state || '',
                        delivery_pincode: org?.pincode || '',
                        delivery_country: org?.country || 'India'
                      }));
                      toast.success('Billing address copied to delivery fields');
                    }}
                    className="text-[10px] font-black uppercase text-[#C82A2B] hover:underline bg-[#FFF1F1] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Copy Billing Address
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-700">
                      Street / Campus / Warehouse Delivery Address
                    </label>
                    <input
                      type="text"
                      value={gstDeliveryForm.delivery_address}
                      onChange={(e) => setGstDeliveryForm(prev => ({ ...prev, delivery_address: e.target.value }))}
                      placeholder="e.g. Building 4B, Goods Delivery Gate 2"
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-900 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-700">
                        Delivery City
                      </label>
                      <input
                        type="text"
                        value={gstDeliveryForm.delivery_city}
                        onChange={(e) => setGstDeliveryForm(prev => ({ ...prev, delivery_city: e.target.value }))}
                        placeholder="e.g. Mumbai, Bengaluru"
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-900 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-700">
                        Delivery State
                      </label>
                      <input
                        type="text"
                        value={gstDeliveryForm.delivery_state}
                        onChange={(e) => setGstDeliveryForm(prev => ({ ...prev, delivery_state: e.target.value }))}
                        placeholder="e.g. Maharashtra, Karnataka"
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-900 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-700">
                        Delivery PIN Code
                      </label>
                      <input
                        type="text"
                        value={gstDeliveryForm.delivery_pincode}
                        onChange={(e) => setGstDeliveryForm(prev => ({ ...prev, delivery_pincode: e.target.value }))}
                        placeholder="e.g. 400001"
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-mono font-bold text-zinc-900 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-700">
                        Delivery Country
                      </label>
                      <input
                        type="text"
                        value={gstDeliveryForm.delivery_country}
                        onChange={(e) => setGstDeliveryForm(prev => ({ ...prev, delivery_country: e.target.value }))}
                        placeholder="India"
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-900 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsGstDeliveryModalOpen(false)}
                  disabled={isSavingGstDelivery}
                  className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-zinc-500"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingGstDelivery}
                  className="px-6 py-2.5 rounded-xl bg-[#C82A2B] hover:bg-[#A81D1E] text-white text-xs font-black uppercase tracking-wider shadow-md shadow-[#C82A2B]/20"
                >
                  {isSavingGstDelivery ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteCustomerConfirm.isOpen}
        title="Delete Customer Account?"
        message={`Are you sure you want to permanently delete "${org.name}"? All associated account logs, departments, and linked records will be removed. This action cannot be undone.`}
        onConfirm={handleConfirmedDeleteCustomer}
        onCancel={() => setDeleteCustomerConfirm({ isOpen: false })}
        confirmLabel="Yes, Delete Customer"
        variant="danger"
      />

      {/* Create Invoice Modal (Bulk Against Sales Order vs Manual Retail Sale) */}
      {isInvoiceModalOpen && org && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-300">
          <div className="relative w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl p-6 md:p-8 my-8 border border-zinc-200/80 max-h-[92vh] overflow-y-auto overflow-x-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D] absolute top-0 left-0" />
            {/* Header */}
            <div className="flex items-start justify-between pb-5 border-b border-zinc-150">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-zinc-900 text-white flex items-center justify-center">
                  <ReceiptText size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-zinc-900 italic tracking-tight">Generate Commercial Invoice</h3>
                  <p className="text-xs text-zinc-500 font-medium">
                    {org.name} ({org.customer_code || `#${org.id}`}) · Default Credit Period: <strong className="text-[#9E1B1D]">{org.credit_period_days || 30} Days</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 flex items-center justify-center transition-all cursor-pointer border-none"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sale / Invoice Source Selector (Sales Order vs Quotation vs Retail) */}
            <div className="mt-5 p-1.5 bg-zinc-100 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setInvoiceType('sales_order')}
                className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border-none ${
                  invoiceType === 'sales_order'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 bg-transparent'
                }`}
              >
                <Package size={15} className={invoiceType === 'sales_order' ? 'text-[#9E1B1D]' : 'text-zinc-400'} />
                <span className="truncate">Against Sales Order</span>
              </button>
              <button
                type="button"
                onClick={() => setInvoiceType('quotation')}
                className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border-none ${
                  invoiceType === 'quotation'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 bg-transparent'
                }`}
              >
                <FileText size={15} className={invoiceType === 'quotation' ? 'text-[#9E1B1D]' : 'text-zinc-400'} />
                <span className="truncate">Against Quotation</span>
              </button>
              <button
                type="button"
                onClick={() => setInvoiceType('retail')}
                className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border-none ${
                  invoiceType === 'retail'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 bg-transparent'
                }`}
              >
                <ReceiptText size={15} className={invoiceType === 'retail' ? 'text-[#9E1B1D]' : 'text-zinc-400'} />
                <span className="truncate">Retail (Manual Items)</span>
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-5 mt-5">
              {/* Credit Terms & Dates Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-[#FFF1F1]/50 border border-[#C82A2B]/15">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-600 block mb-1">
                    Invoice Date
                  </label>
                  <DatePicker
                    required
                    value={invoiceDate}
                    onChange={(val) => setInvoiceDate(val)}
                    placeholder="Invoice Date"
                    className="w-full bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-600 block mb-1">
                    Credit Period (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    required
                    value={invoiceCreditPeriod}
                    onChange={(e) => setInvoiceCreditPeriod(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-xs font-black text-zinc-800 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-600 block mb-1">
                    Calculated Due Date
                  </label>
                  <div className="px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-xs font-mono font-black text-zinc-900 flex items-center gap-1.5">
                    <Clock size={13} />
                    {formatDate(getCalculatedDueDate(invoiceDate, invoiceCreditPeriod))}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium -mt-2 px-1">
                * Rule: The credit period extends {invoiceCreditPeriod} days from invoice date. On the last day ({formatDate(getCalculatedDueDate(invoiceDate, invoiceCreditPeriod))}), the invoice is marked as <strong className="text-amber-600">Due</strong>. The next day onwards, it becomes <strong className="text-rose-600">Overdue</strong>.
              </p>

              {/* Mode 1: Against Confirmed Sales Order */}
              {invoiceType === 'sales_order' && (() => {
                const availableOrders = Array.from(
                  new Map([
                    ...(Array.isArray(customerOrders) ? customerOrders : []),
                    ...(Array.isArray(ledgerData?.orders) ? ledgerData.orders : []),
                    ...(Array.isArray(orgDetails?.orders) ? orgDetails.orders : [])
                  ].filter((o: any) => o && o.id).map((o: any) => [o.id, o])).values()
                );

                return (
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-600 block">
                      Select Confirmed Sales Order *
                    </label>
                    {availableOrders.length > 0 ? (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {availableOrders.map((order: any) => {
                          const isSelected = selectedOrderIdForInvoice === order.id;
                          const quote = order.quotations || quotations.find((q: any) => q.id === order.quotation_id);
                          const orderTot = parseFloat(String(quote?.final_quote_value || order.total_amount || 0));
                          const matchingPays = customerPayments.filter((p: any) => 
                            (p.order_id && p.order_id === order.id) || 
                            (quote?.id && p.quotation_id === quote.id)
                          );
                          const orderCredits = Math.max(
                            matchingPays.reduce((s: number, p: any) => s + parseFloat(String(p.amount || 0)), 0),
                            parseFloat(String(quote?.paid_amount || 0))
                          );
                          const orderRemaining = Math.max(0, orderTot - orderCredits);

                          return (
                            <div
                              key={order.id}
                              onClick={() => setSelectedOrderIdForInvoice(order.id)}
                              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? 'bg-[#FFF1F1] border-[#C82A2B] shadow-sm'
                                  : 'bg-white border-zinc-200 hover:border-zinc-300'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSelected ? 'bg-[#C82A2B] border-[#C82A2B] text-white' : 'border-zinc-300'
                                }`}>
                                  {isSelected && <Check size={12} strokeWidth={4} />}
                                </div>
                                <div>
                                  <p className="text-xs font-black text-zinc-900 font-mono">{order.order_no}</p>
                                  <p className="text-[11px] font-semibold text-zinc-500">
                                    {quote?.title || quote?.quotation_no || 'Standard Order'} · Status: <span className="text-[#C82A2B] font-bold">{order.status}</span>
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-mono text-xs font-black text-zinc-900">
                                  ₹{orderTot.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                                {orderCredits > 0 ? (
                                  <p className="text-[10px] text-emerald-700 font-black">
                                    Remaining: ₹{orderRemaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </p>
                                ) : (
                                  <p className="text-[9px] text-zinc-400 font-medium">{formatDate(order.created_at)}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-200 text-center">
                        <p className="text-xs font-bold text-zinc-500">No sales orders placed for this customer yet.</p>
                        <p className="text-[11px] text-zinc-400 mt-1">Switch to "Against Quotation" or "Retail (Manual Items)" above.</p>
                      </div>
                    )}

                    {/* Deduction breakdown for Selected Sales Order */}
                    {(() => {
                      if (!selectedOrderIdForInvoice) return null;
                      const pickedOrder = availableOrders.find((o: any) => o.id === selectedOrderIdForInvoice);
                      if (!pickedOrder) return null;
                      const pickedQuote = pickedOrder.quotations || quotations.find((q: any) => q.id === pickedOrder.quotation_id);
                      const pickedOrderTot = parseFloat(String(pickedQuote?.final_quote_value || pickedOrder.total_amount || 0));
                      const pickedPays = customerPayments.filter((p: any) => 
                        (p.order_id && p.order_id === pickedOrder.id) || 
                        (pickedQuote?.id && p.quotation_id === pickedQuote.id)
                      );
                      const pickedCredits = Math.max(
                        pickedPays.reduce((s: number, p: any) => s + parseFloat(String(p.amount || 0)), 0),
                        parseFloat(String(pickedQuote?.paid_amount || 0))
                      );
                      const pickedRemaining = Math.max(0, pickedOrderTot - pickedCredits);

                      return (
                        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2 mt-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-zinc-600">Sales Order Total ({pickedOrder.order_no}):</span>
                            <span className="font-mono font-bold text-zinc-900">
                              ₹{pickedOrderTot.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          {pickedCredits > 0 && (
                            <div className="flex items-center justify-between text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                              <span className="font-bold flex items-center gap-1.5">
                                <Check size={13} className="text-emerald-600" />
                                Less: Existing Credits / Advance Received:
                              </span>
                              <span className="font-mono font-black text-emerald-700">
                                - ₹{pickedCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                          <div className="pt-2 border-t border-zinc-200 flex items-center justify-between">
                            <div>
                              <span className="text-xs font-black uppercase tracking-wider text-zinc-900 block">
                                Remaining Payment Due:
                              </span>
                              {pickedCredits > 0 && (
                                <span className="text-[10px] text-zinc-400 font-medium">
                                  Existing advance credits will be automatically deducted
                                </span>
                              )}
                            </div>
                            <span className="text-base font-black font-mono text-[#991b1b]">
                              ₹{pickedRemaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

              {/* Mode 2: Against Commercial Quotation */}
              {invoiceType === 'quotation' && (() => {
                const availableOrders = Array.from(
                  new Map([
                    ...(Array.isArray(customerOrders) ? customerOrders : []),
                    ...(Array.isArray(ledgerData?.orders) ? ledgerData.orders : []),
                    ...(Array.isArray(orgDetails?.orders) ? orgDetails.orders : [])
                  ].filter((o: any) => o && o.id).map((o: any) => [o.id, o])).values()
                );

                return (
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-600 block">
                      Select Commercial Quotation *
                    </label>
                    {quotations.length > 0 ? (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {quotations.map((q: any) => {
                          const isSelected = selectedQuotationIdForInvoice === q.id;
                          const quoteTot = parseFloat(String(q.final_quote_value || 0));
                          const matchingPays = customerPayments.filter((p: any) => 
                            (p.quotation_id && String(p.quotation_id) === String(q.id)) ||
                            (p.quote_id && String(p.quote_id) === String(q.id))
                          );
                          const quoteCredits = Math.max(
                            matchingPays.reduce((s: number, p: any) => s + parseFloat(String(p.amount || 0)), 0),
                            parseFloat(String(q.paid_amount || 0))
                          );
                          const quoteRemaining = Math.max(0, quoteTot - quoteCredits);
                          const linkedOrd = availableOrders.find(
                            (o: any) => o.quotation_id === q.id || (o.quotations && o.quotations.quotation_no === q.quotation_no)
                          );

                          return (
                            <div
                              key={q.id}
                              onClick={() => setSelectedQuotationIdForInvoice(q.id)}
                              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? 'bg-[#FFF1F1] border-[#C82A2B] shadow-sm'
                                  : 'bg-white border-zinc-200 hover:border-zinc-300'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSelected ? 'bg-[#C82A2B] border-[#C82A2B] text-white' : 'border-zinc-300'
                                }`}>
                                  {isSelected && <Check size={12} strokeWidth={4} />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-black text-zinc-900 font-mono">{q.quotation_no || `QT-${q.id}`}</p>
                                    {linkedOrd && (
                                      <span className="text-[10px] font-mono font-bold text-[#C82A2B] bg-[#FFF1F1] px-1.5 py-0.5 rounded border border-[#C82A2B]/20">
                                        Order: {linkedOrd.order_no}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] font-semibold text-zinc-500 truncate max-w-sm">
                                    {q.title || 'Apparel Quotation'} · Status: <span className="text-[#C82A2B] font-bold">{q.status}</span>
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-mono text-xs font-black text-zinc-900">
                                  ₹{quoteTot.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                                {quoteCredits > 0 ? (
                                  <p className="text-[10px] text-emerald-700 font-black">
                                    Remaining: ₹{quoteRemaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </p>
                                ) : (
                                  <p className="text-[9px] text-zinc-400 font-medium">{formatDate(q.created_at)}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-200 text-center">
                        <p className="text-xs font-bold text-zinc-500">No quotations found for this customer.</p>
                        <p className="text-[11px] text-zinc-400 mt-1">Switch to "Against Sales Order" or "Retail (Manual Items)" above.</p>
                      </div>
                    )}

                    {/* Deduction breakdown for Selected Quotation */}
                    {(() => {
                      if (!selectedQuotationIdForInvoice) return null;
                      const pickedQuote = quotations.find((q: any) => q.id === selectedQuotationIdForInvoice);
                      if (!pickedQuote) return null;
                      const pickedQuoteTot = parseFloat(String(pickedQuote.final_quote_value || 0));
                      const pickedPays = customerPayments.filter((p: any) => 
                        (p.quotation_id && String(p.quotation_id) === String(pickedQuote.id)) ||
                        (p.quote_id && String(p.quote_id) === String(pickedQuote.id))
                      );
                      const pickedCredits = Math.max(
                        pickedPays.reduce((s: number, p: any) => s + parseFloat(String(p.amount || 0)), 0),
                        parseFloat(String(pickedQuote.paid_amount || 0))
                      );
                      const pickedRemaining = Math.max(0, pickedQuoteTot - pickedCredits);

                      return (
                        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2 mt-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-zinc-600">Quotation Total ({pickedQuote.quotation_no || `QT-${pickedQuote.id}`}):</span>
                            <span className="font-mono font-bold text-zinc-900">
                              ₹{pickedQuoteTot.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          {pickedCredits > 0 && (
                            <div className="flex items-center justify-between text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                              <span className="font-bold flex items-center gap-1.5">
                                <Check size={13} className="text-emerald-600" />
                                Less: Existing Credits / Advance Received:
                              </span>
                              <span className="font-mono font-black text-emerald-700">
                                - ₹{pickedCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                          <div className="pt-2 border-t border-zinc-200 flex items-center justify-between">
                            <div>
                              <span className="text-xs font-black uppercase tracking-wider text-zinc-900 block">
                                Remaining Payment Due:
                              </span>
                              {pickedCredits > 0 && (
                                <span className="text-[10px] text-zinc-400 font-medium">
                                  Existing advance credits will be automatically deducted
                                </span>
                              )}
                            </div>
                            <span className="text-base font-black font-mono text-[#991b1b]">
                              ₹{pickedRemaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

              {/* Retail Manual Items Mode */}
              {invoiceType === 'retail' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-600">
                      Line Items (Retail Sale)
                    </label>
                    <button
                      type="button"
                      onClick={() => setRetailItems([...retailItems, { description: '', quantity: 1, unit_price: 500, total: 500 }])}
                      className="text-[11px] font-bold text-[#C82A2B] hover:underline flex items-center gap-1 cursor-pointer border-none bg-transparent"
                    >
                      <Plus size={13} /> Add Item
                    </button>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {retailItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                        <input
                          type="text"
                          required
                          placeholder="Item Description / Uniform Item"
                          value={item.description}
                          onChange={(e) => {
                            const updated = [...retailItems];
                            updated[idx].description = e.target.value;
                            setRetailItems(updated);
                          }}
                          className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-bold text-zinc-800"
                        />
                        <div className="w-20">
                          <input
                            type="number"
                            min="1"
                            required
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => {
                              const qty = parseInt(e.target.value, 10) || 0;
                              const updated = [...retailItems];
                              updated[idx].quantity = qty;
                              updated[idx].total = qty * updated[idx].unit_price;
                              setRetailItems(updated);
                            }}
                            className="w-full px-2 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-bold text-center"
                          />
                        </div>
                        <div className="w-28">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            placeholder="Rate (₹)"
                            value={item.unit_price}
                            onChange={(e) => {
                              const rate = parseFloat(e.target.value) || 0;
                              const updated = [...retailItems];
                              updated[idx].unit_price = rate;
                              updated[idx].total = updated[idx].quantity * rate;
                              setRetailItems(updated);
                            }}
                            className="w-full px-2 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-bold text-right"
                          />
                        </div>
                        <div className="w-28 text-right font-mono text-xs font-black text-zinc-900 pr-2">
                          ₹{Number(item.quantity * item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        {retailItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setRetailItems(retailItems.filter((_, i) => i !== idx))}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer border-none bg-transparent"
                            title="Remove Item"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Total Invoice Value: </span>
                      <span className="text-base font-black text-zinc-900 font-mono ml-2">
                        ₹{retailItems.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.unit_price || 0)), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-1">
                  Notes / Payment Terms (Optional)
                </label>
                <textarea
                  rows={2}
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder="e.g. Terms of payment, PO reference, dispatch notes..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#C82A2B] focus:ring-4 focus:ring-[#C82A2B]/10"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-150">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  disabled={isSubmittingInvoice}
                  className="h-11 px-5 rounded-xl border border-zinc-200 text-xs font-black uppercase text-zinc-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isSubmittingInvoice ||
                    (invoiceType === 'sales_order' && !selectedOrderIdForInvoice) ||
                    (invoiceType === 'quotation' && !selectedQuotationIdForInvoice)
                  }
                  className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <ReceiptText size={16} />
                  {isSubmittingInvoice ? 'Saving...' : 'Save'}






                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Order Details Modal */}
      {selectedOrder && (() => {
        const items = selectedOrder.items || [];
        const totalUnits = items.reduce((sum: number, it: any) => sum + (parseInt(it.quantity, 10) || 0), 0);
        const orderValue = parseFloat(selectedOrder.quotations?.final_quote_value || selectedOrder.total_amount || 0);

        return (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedOrder(null)} />

            <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-zinc-100 overflow-hidden relative z-10 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-[#C82A2B] to-[#9E1B1D] p-6 sm:p-8 text-white shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                      <ShoppingBag size={24} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">
                        Sales Order Details
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-black italic tracking-tight">
                        {selectedOrder.order_no}
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors bg-transparent border-none text-white cursor-pointer"
                  >
                    <X size={22} />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-white/20 text-white tracking-wider">
                    Status: {selectedOrder.status}
                  </span>
                  {selectedOrder.created_at && (
                    <span className="text-white/80 font-medium">
                      Ordered: <strong>{formatDate(selectedOrder.created_at)}</strong>
                    </span>
                  )}
                  {selectedOrder.target_delivery_date && (
                    <span className="text-white/80 font-medium">
                      Target Delivery: <strong>{formatDate(selectedOrder.target_delivery_date)}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                {/* Order Summary KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-150">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                      Order No
                    </label>
                    <p className="text-sm font-black font-mono text-zinc-900 truncate">
                      {selectedOrder.order_no}
                    </p>
                  </div>

                  <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-150">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                      Total Quantity
                    </label>
                    <p className="text-sm font-black font-mono text-zinc-900">
                      {totalUnits} <span className="text-xs font-semibold text-zinc-500">units</span>
                    </p>
                  </div>

                  <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-150">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                      Total Products
                    </label>
                    <p className="text-sm font-black text-[#C82A2B]">
                      {items.length} {items.length === 1 ? 'Item' : 'Items'}
                    </p>
                  </div>

                  <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-150">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                      Total Value
                    </label>
                    <p className="text-sm font-black font-mono text-emerald-700">
                      ₹{orderValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Linked Quotation Proposal Info */}
                {selectedOrder.quotations && (
                  <div className="p-4 bg-[#FFF1F1] rounded-2xl border border-[#C82A2B]/20 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#C82A2B]">
                        Linked Quotation
                      </span>
                      <p className="text-sm font-bold text-zinc-900">
                        {selectedOrder.quotations.title || 'Quotation Proposal'}
                      </p>
                    </div>
                    {selectedOrder.quotations.quotation_no && (
                      <span className="font-mono font-black text-xs text-[#C82A2B] bg-white px-2.5 py-1 rounded-xl border border-[#C82A2B]/20">
                        {selectedOrder.quotations.quotation_no}
                      </span>
                    )}
                  </div>
                )}

                {/* Order Products & Quantities List (Art number, Item name, Specification, DNS, DNG, Unit Cost, Total Cost) */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500">
                      Products & Specifications
                    </h4>
                    <span className="text-[10px] font-bold text-zinc-400">
                      {items.length} line {items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {items.map((item: any, idx: number) => {
                      const sb = item.size_breakdown || {};

                      // 1. Item Name
                      let itemName = item.manual_item_name || item.product_name || sb.product_name || sb.name || item.product_types?.name || '';
                      if (!itemName && item.item_description) {
                        itemName = item.item_description.split(' - ')[0] || item.item_description;
                      }
                      if (!itemName) {
                        itemName = `Product Item #${idx + 1}`;
                      }
                      itemName = itemName
                        .replace(/\[ProductType:[^\]]*\]/gi, '')
                        .replace(/SAM\s*:\s*[\d.]+/gi, '')
                        .trim();

                      // 2. Art Number
                      const artNumber = item.art_number || sb.art_number || sb.art_no || item.products?.art_number || null;

                      // 3. Design Numbers: DNS and DNG
                      const dnsNumber = item.design_number || sb.design_number || sb.product_design_number || null;
                      const dngNumber = item.group_design_number || item.dng_number || sb.group_design_number || sb.dng_number || sb.clean_design_number || null;

                      // 4. Specification (Strip fabric/SAM details)
                      let specification = item.specification || sb.specification || sb.specifications || item.item_description || sb.sub_details || null;
                      if (specification) {
                        specification = specification
                          .replace(/\[ProductType:[^\]]*\]/gi, '')
                          .replace(/SAM\s*:\s*[\d.]+/gi, '')
                          .replace(/SAM\s+Value\s*:\s*[\d.]+/gi, '')
                          .trim();
                        if (specification.toLowerCase() === itemName.toLowerCase()) {
                          specification = null;
                        }
                      }

                      // 5. Quantity, Unit Cost, and Total Cost
                      const quantity = parseInt(String(item.quantity || 1), 10);
                      const unitCost = parseFloat(String(item.unit_price || sb.computed_unit_cost || 0));
                      const totalCost = parseFloat(String(item.total_price || (quantity * unitCost) || 0));

                      // 6. Sizes Breakdown (Strictly real clothing sizes, excluding all cost, fabric, SAM, and metadata keys)
                      const sizesSource = (sb.sizes && typeof sb.sizes === 'object' && !Array.isArray(sb.sizes))
                        ? sb.sizes
                        : sb;

                      const excludedKeys = new Set([
                        'trims', 'sizes', 'btn', 'thr', 'thread', 'button', 'buttons',
                        'fabric_id', 'fabric_name', 'attachment_fabric1_id', 'attachment_fabric2_id',
                        'button_id', 'button_name', 'button_count', 'button_code',
                        'thread_id', 'thread_name', 'thread_count', 'thread_code',
                        'design_number', 'art_number', 'product_design_number', 'clean_design_number',
                        'group_design_number', 'dng_number', 'group_design',
                        'sam_value', 'main_fabric_sam', 'attachment_fabric1_sam', 'attachment_fabric2_sam',
                        'is_manual', 'is_custom', 'is_set', 'set_name', 'products',
                        'department_id', 'department_name', 'product_id', 'product_name',
                        'main_fabric_meters', 'consumption', 'notes', 'specifications', 'specification',
                        'id', 'uom', 'name', 'count', 'trim_id', 'category', 'unit_price',
                        'computed_unit_cost', 'labor_cost_per_item', 'fabric_cost_per_item', 'accessories_cost_per_item',
                        'main_fabric_rate', 'attachment_fabric1_rate', 'attachment_fabric2_rate',
                        'attachment_fabric1_meters', 'attachment_fabric2_meters', 'class_name'
                      ]);

                      const cleanSizes = Object.entries(sizesSource).filter(([key, val]) => {
                        if (excludedKeys.has(key)) return false;
                        if (val === null || val === undefined) return false;
                        if (typeof val === 'object') return false;
                        if (typeof val === 'string' && val.trim() === '') return false;
                        const kLower = key.toLowerCase();
                        if (kLower.includes('cost') || kLower.includes('sam') || kLower.includes('fabric') || kLower.includes('rate') || kLower.includes('meter')) {
                          return false;
                        }
                        return true;
                      });

                      return (
                        <div
                          key={item.id || idx}
                          className="p-5 bg-zinc-50 hover:bg-zinc-100/60 border border-zinc-200 rounded-3xl transition-all space-y-4"
                        >
                          {/* Title & Design Badges */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-base font-black text-zinc-900 tracking-tight">
                                  {itemName}
                                </h4>
                                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider bg-zinc-200/60 px-2 py-0.5 rounded-md">
                                  Item #{idx + 1}
                                </span>
                              </div>

                              {/* Badges row: Art Number, DNS, DNG */}
                              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                {artNumber && (
                                  <span className="px-2.5 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded-lg text-[10px] font-mono font-black shadow-2xs">
                                    Art #: {artNumber}
                                  </span>
                                )}
                                {dnsNumber && (
                                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg text-[10px] font-mono font-black shadow-2xs">
                                    DNS: {dnsNumber}
                                  </span>
                                )}
                                {dngNumber && (
                                  <span className="px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-lg text-[10px] font-mono font-black shadow-2xs">
                                    DNG: {dngNumber}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Total Cost in Header */}
                            <div className="text-left sm:text-right shrink-0">
                              <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block mb-0.5">
                                Item Total
                              </label>
                              <span className="text-base font-mono font-black text-emerald-700">
                                ₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>

                          {/* Specification (if present and meaningful) */}
                          {specification && (
                            <div className="p-3 bg-white rounded-xl border border-zinc-200/80 text-xs">
                              <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block mb-0.5">
                                Specification
                              </span>
                              <p className="font-semibold text-zinc-700 leading-relaxed">
                                {specification}
                              </p>
                            </div>
                          )}

                          {/* Financials & Quantity Grid */}
                          <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-zinc-200/60 text-xs">
                            <div className="p-2.5 bg-white rounded-xl border border-zinc-200">
                              <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block mb-0.5">
                                Quantity
                              </span>
                              <span className="font-mono font-black text-zinc-900 text-sm">
                                {quantity} <span className="text-[11px] font-semibold text-zinc-500">units</span>
                              </span>
                            </div>

                            <div className="p-2.5 bg-white rounded-xl border border-zinc-200">
                              <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block mb-0.5">
                                Unit Cost
                              </span>
                              <span className="font-mono font-black text-zinc-900 text-sm">
                                ₹{unitCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>

                            <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200/60">
                              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 block mb-0.5">
                                Total Cost
                              </span>
                              <span className="font-mono font-black text-emerald-700 text-sm">
                                ₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>

                          {/* Size Breakdown (Only if actual clothing sizes exist) */}
                          {cleanSizes.length > 0 && (
                            <div className="pt-2 border-t border-zinc-200/60 flex flex-wrap items-center gap-1.5">
                              <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 mr-1">
                                Sizes:
                              </span>
                              {cleanSizes.map(([size, qty]) => (
                                <span
                                  key={size}
                                  className="px-2.5 py-0.5 bg-white border border-zinc-200 text-zinc-700 rounded-lg text-[10px] font-bold shadow-2xs"
                                >
                                  {size}: <span className="font-mono text-zinc-900">{String(qty)}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {items.length === 0 && (
                      <div className="p-8 bg-zinc-50 rounded-2xl border border-zinc-200 text-center">
                        <p className="text-xs font-bold text-zinc-400">No items listed for this order.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Notes */}
                {selectedOrder.order_notes && (
                  <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl">
                    <label className="text-[9px] font-black text-amber-800 uppercase tracking-widest block mb-1">
                      Order Notes
                    </label>
                    <p className="text-xs font-medium text-amber-900 leading-relaxed whitespace-pre-wrap">
                      {selectedOrder.order_notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-zinc-150 flex items-center justify-end bg-zinc-50/50 shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setSelectedOrder(null)}
                  className="h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-wider text-zinc-600 border-zinc-200"
                >
                  Close Order View
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Real Pro Forma Invoice Template Modal */}
      <ProFormaInvoiceModal
        isOpen={isProFormaModalOpen}
        onClose={() => setIsProFormaModalOpen(false)}
        data={selectedProForma}
      />

      {/* Real GST Tax Invoice Template Modal */}
      <TaxInvoiceModal
        isOpen={isTaxInvoiceModalOpen}
        onClose={() => setIsTaxInvoiceModalOpen(false)}
        data={selectedTaxInvoice}
        defaultCustomer={org}
      />

      {/* View-Only Quotation Details Modal */}
      {selectedQuoteForModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelectedQuoteForModal(null)}
          />

          <div className="bg-white w-full max-w-6xl rounded-[2.5rem] shadow-2xl border border-zinc-150 overflow-hidden relative z-10 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#C82A2B] to-[#9E1B1D] px-8 py-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <FileText size={22} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xl font-black italic tracking-tight">{selectedQuoteForModal.quotation_no}</h3>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white">
                      View Only
                    </span>
                  </div>
                  <p className="text-xs text-white/80 font-medium mt-0.5">
                    {selectedQuoteForModal.title || 'Quotation Proposal'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedQuoteForModal(null)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors bg-transparent border-none text-white cursor-pointer"
                title="Close Modal"
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar bg-zinc-50/50">
              <QuotationDetails
                selectedQuotation={selectedQuoteForModal}
                fabricsList={[]}
                onBack={() => setSelectedQuoteForModal(null)}
                readOnly={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Custom Journal Creation Modal */}
      {/* Quick Customer Payment Modal (Quotation or Invoice Target) */}
      {isQuickPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden relative z-10 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <CreditCard size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Record Quick Payment</h3>
                  <p className="text-xs text-white/80 font-medium">
                    Payment receipt & settlement for {org.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickPaymentModalOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-white cursor-pointer"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitQuickPayment} className="p-6 overflow-y-auto space-y-4 text-xs font-semibold">
              {/* Account Quick Summary Card */}
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-150 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                    Customer Account
                  </span>
                  <p className="text-xs font-black text-zinc-900 mt-0.5">{org.name}</p>
                  <p className="text-[10px] font-mono text-zinc-500">{org.customer_code || `CUST-${org.id}`}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                    Available Records
                  </span>
                  <p className="text-xs font-black text-emerald-700 mt-0.5">
                    {customerQuotes.length} Quotes • {customerInvoices.length} Invoices
                  </p>
                </div>
              </div>

              {/* Target Selector Switcher: Quotation vs Invoice */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-700 flex items-center justify-between">
                  <span>Allocate Payment Against <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-zinc-400 font-normal">Choose document type</span>
                </label>
                <div className="grid grid-cols-2 gap-2 bg-zinc-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleTargetTypeChange('quotation')}
                    className={`h-9 px-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentTargetType === 'quotation'
                        ? 'bg-white text-emerald-800 shadow-sm border border-emerald-200'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    <FileText size={13} />
                    Quotation ({customerQuotes.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTargetTypeChange('invoice')}
                    className={`h-9 px-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentTargetType === 'invoice'
                        ? 'bg-white text-emerald-800 shadow-sm border border-emerald-200'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    <ReceiptText size={13} />
                    Invoice ({customerInvoices.length})
                  </button>
                </div>
              </div>

              {/* Dynamic Target Selection Dropdown */}
              {paymentTargetType === 'quotation' ? (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-700 flex items-center justify-between">
                    <span>Select Existing Quotation <span className="text-red-500">*</span></span>
                    {paymentQuoteId && (
                      <span className="text-[10px] text-emerald-700 font-bold">
                        Quote #{customerQuotes.find((q: any) => String(q.id) === paymentQuoteId)?.quotation_no}
                      </span>
                    )}
                  </label>
                  {customerQuotes.length > 0 ? (
                    <Select
                      placeholder="Select Quotation to Settle..."
                      value={paymentQuoteId}
                      onChange={handleQuoteSelectionChange}
                      required
                      options={customerQuotes.map((q: any) => {
                        const total = parseFloat(q.final_quote_value || '0');
                        const paid = parseFloat(q.paid_amount || '0');
                        const due = Math.max(0, total - paid);
                        return {
                          value: String(q.id),
                          label: `${q.quotation_no} — Total: ₹${total.toLocaleString('en-IN')} (Due: ₹${due.toLocaleString('en-IN')}) • [${q.status || 'Draft'}]`
                        };
                      })}
                    />
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] flex items-center justify-between">
                      <span>No quotations found for this customer.</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsQuickPaymentModalOpen(false);
                          router.push(`/marketing/quotations?action=create&orgId=${org.id}`);
                        }}
                        className="px-2.5 py-1 bg-[#C82A2B] text-white rounded-lg text-[10px] font-black uppercase hover:bg-[#A81D1E] cursor-pointer"
                      >
                        + Create Quote
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-700 flex items-center justify-between">
                    <span>Select Existing Invoice <span className="text-red-500">*</span></span>
                    {paymentInvoiceId && (
                      <span className="text-[10px] text-emerald-700 font-bold">
                        Invoice #{customerInvoices.find((i: any) => String(i.id) === paymentInvoiceId)?.invoice_no}
                      </span>
                    )}
                  </label>
                  {customerInvoices.length > 0 ? (
                    <Select
                      placeholder="Select Invoice to Settle..."
                      value={paymentInvoiceId}
                      onChange={handleInvoiceSelectionChange}
                      required
                      options={customerInvoices.map((inv: any) => {
                        const total = parseFloat(String(inv.total_amount || 0));
                        const paid = parseFloat(String(inv.paid_amount || 0));
                        const due = Math.max(0, total - paid);
                        const orderSuffix = inv.order_no && inv.order_no !== '—' ? ` • Order: ${inv.order_no}` : '';
                        return {
                          value: String(inv.id),
                          label: `${inv.invoice_no} — Total: ₹${total.toLocaleString('en-IN')} (Due: ₹${due.toLocaleString('en-IN')})${orderSuffix} • [${inv.payment_status || 'Unpaid'}]`
                        };
                      })}
                    />
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] flex items-center justify-between">
                      <span>No commercial invoices found for this customer.</span>
                      <span className="text-[10px] text-amber-600 font-medium">Invoices generate upon order confirmation or billing.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Amount & Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-700">
                    Payment Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-11 pl-8 pr-3.5 bg-white border border-zinc-200 rounded-xl text-xs font-mono font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-700">
                    Method <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                    required
                    options={[
                      { value: 'Bank Transfer', label: 'Bank Transfer / NEFT / RTGS' },
                      { value: 'Cash', label: 'Cash' },
                      { value: 'UPI', label: 'UPI / QR Code' },
                      { value: 'Cheque', label: 'Cheque / Demand Draft' },
                      { value: 'Card', label: 'Credit Card / Debit Card' }
                    ]}
                  />
                </div>
              </div>

              {/* Reference No & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-700">
                    Reference / Transaction / UTR No
                  </label>
                  <input
                    type="text"
                    value={paymentReferenceNo}
                    onChange={(e) => setPaymentReferenceNo(e.target.value)}
                    placeholder="e.g. UTR19847294, CHQ-8291"
                    className="w-full h-11 px-3.5 bg-white border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-700">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    required
                    value={paymentDate}
                    onChange={(val) => setPaymentDate(val)}
                    placeholder="Payment Date"
                    className="w-full bg-white"
                  />
                </div>
              </div>

              {/* Notes / Narration */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-700">
                  Narration / Notes
                </label>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Advance settlement payment received for uniform order..."
                  className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsQuickPaymentModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-600 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmittingPayment ||
                    (paymentTargetType === 'quotation' && (!paymentQuoteId || customerQuotes.length === 0)) ||
                    (paymentTargetType === 'invoice' && (!paymentInvoiceId || customerInvoices.length === 0))
                  }
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm shadow-emerald-600/20 cursor-pointer"
                >
                  {isSubmittingPayment ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CustomJournalModal
        isOpen={isAddJournalModalOpen}
        onClose={() => setIsAddJournalModalOpen(false)}
        onSave={handleSaveCustomJournal}
        customerName={org?.name}
        customerId={org?.id}
      />

            {/* Create Proforma Invoice Modal */}
      {isCreateProformaModalOpen && org && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-white rounded-[2rem] shadow-2xl p-6 md:p-8 my-8 border border-zinc-200/80 max-h-[92vh] overflow-y-auto">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D] absolute top-0 left-0" />

            <div className="flex items-start justify-between pb-4 border-b border-zinc-150">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF1F1] text-[#C82A2B] border border-[#C82A2B]/20 flex items-center justify-center">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-zinc-900 italic tracking-tight">Create Proforma Invoice</h3>
                  <p className="text-xs text-zinc-500 font-medium">
                    {org.name} ({org.customer_code || `#${org.id}`})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateProformaModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 flex items-center justify-center transition-all cursor-pointer border-none"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 space-y-6">
              {/* Option 1: Generate from Existing Quotation */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-900">
                    Option 1: From Existing Quotation
                  </span>
                  <span className="text-[10px] text-zinc-500 font-bold">
                    {customerQuotes.length} Available
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  Select an approved or pending proposal to generate its official Proforma Invoice with document numbering and payment terms.
                </p>

                {customerQuotes.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    <Select
                      placeholder="Select Quotation..."
                      value={selectedQuoteIdForProforma}
                      onChange={(val) => setSelectedQuoteIdForProforma(val)}
                      options={customerQuotes.map((q: any) => ({
                        value: String(q.id),
                        label: `${q.quotation_no || 'QT'} — ${q.title || 'Proposal'} (₹${parseFloat(q.final_quote_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })})`
                      }))}
                    />

                    <Button
                      disabled={!selectedQuoteIdForProforma}
                      onClick={() => {
                        const quote = customerQuotes.find((q: any) => String(q.id) === selectedQuoteIdForProforma);
                        if (!quote) return;
                        const matchingPI = customerProFormaInvoices.find((pi: any) => String(pi.id) === String(quote.id)) || {
                          id: quote.id,
                          pi_no: quote.quotation_no ? quote.quotation_no.replace(/^QT-/, 'PR-') : `PR-${quote.id}`,
                          order_no: '—',
                          customer_name: org.name,
                          date: quote.quotation_date || quote.created_at || new Date().toISOString(),
                          validity_days: org.credit_period_days || 30,
                          title: quote.title,
                          type: quote.quotation_type || 'Commercial Bulk',
                          amount: parseFloat(quote.final_quote_value || '0'),
                          status: 'Active PI',
                          raw: quote
                        };
                        setIsCreateProformaModalOpen(false);
                        handleOpenProforma(matchingPI);
                      }}
                      className="w-full h-10 rounded-xl bg-[#C82A2B] hover:bg-[#A81D1E] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-[#C82A2B]/20 cursor-pointer transition-all"
                    >
                      <FileSpreadsheet size={14} />
                      <span>Generate &amp; View Proforma Invoice</span>
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-xl font-medium">
                    No quotations found for this customer. Create a quotation first to generate a proforma invoice.
                  </p>
                )}
              </div>

              {/* Option 2: Create Brand New Quotation / Proforma Proposal */}
              <div className="p-4 rounded-2xl bg-[#FFF1F1]/50 border border-[#C82A2B]/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-900">
                    Option 2: Create New Proposal
                  </span>
                  <span className="px-2 py-0.5 bg-[#C82A2B] text-white rounded-md text-[9px] font-black uppercase tracking-wider">
                    Full Wizard
                  </span>
                </div>
                <p className="text-xs text-zinc-600">
                  Compile a brand new apparel proposal with sizing audit, SAM cost calculations, fabrics, and margin analysis.
                </p>
                <Button
                  onClick={() => {
                    setIsCreateProformaModalOpen(false);
                    router.push(`/marketing/quotations?action=create&orgId=${org.id}`);
                  }}
                  className="w-full h-10 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
                >
                  <Plus size={14} />
                  <span>Launch Quotation &amp; Proforma Wizard</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* First Custom Department Migration / Confirmation Modal */}
      {firstDeptMigrationModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#C82A2B] to-[#9E1B1D] p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <AlertTriangle size={22} className="text-amber-300" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">First Custom Department Setup</h3>
                  <p className="text-xs text-white/80 font-medium">Configure default &quot;Main&quot; department migration</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFirstDeptMigrationModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Member Alert Callout */}
              {firstDeptMigrationModal.memberCount > 0 ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3.5">
                  <AlertCircle size={22} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                        Existing Members Detected
                      </span>
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full text-[10px] font-black">
                        {firstDeptMigrationModal.memberCount} {firstDeptMigrationModal.memberCount === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 font-medium mt-1 leading-relaxed">
                      There {firstDeptMigrationModal.memberCount === 1 ? 'is' : 'are'} currently{' '}
                      <strong>{firstDeptMigrationModal.memberCount} {firstDeptMigrationModal.memberCount === 1 ? 'member' : 'members'}</strong>{' '}
                      in the default <strong>&quot;Main&quot;</strong> department. Since you are creating{' '}
                      <strong>&quot;{firstDeptMigrationModal.newDeptPayload?.name}&quot;</strong>, how would you like to handle existing members and the default &quot;Main&quot; department?
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#FFF1F1] border border-[#C82A2B]/20 flex items-start gap-3.5">
                  <CheckCircle2 size={22} className="text-[#C82A2B] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-900">
                      Default &quot;Main&quot; Department is Empty
                    </span>
                    <p className="text-xs text-zinc-600 font-medium mt-1 leading-relaxed">
                      The placeholder <strong>&quot;Main&quot;</strong> department has 0 members. Would you like to delete &quot;Main&quot; and replace it with your new department <strong>&quot;{firstDeptMigrationModal.newDeptPayload?.name}&quot;</strong>, or keep both?
                    </p>
                  </div>
                </div>
              )}

              {/* Migration Choices */}
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 block">
                  Select Desired Action
                </label>

                {/* Option 1: Migrate & Delete Main (Recommended) */}
                <div
                  onClick={() => setFirstDeptMigrationModal(prev => ({ ...prev, selectedAction: 'migrate_and_delete' }))}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    firstDeptMigrationModal.selectedAction === 'migrate_and_delete'
                      ? 'border-[#C82A2B] bg-[#FFF1F1] shadow-sm'
                      : 'border-zinc-200 hover:border-zinc-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="migrationAction"
                      checked={firstDeptMigrationModal.selectedAction === 'migrate_and_delete'}
                      onChange={() => setFirstDeptMigrationModal(prev => ({ ...prev, selectedAction: 'migrate_and_delete' }))}
                      className="mt-1 accent-[#C82A2B] cursor-pointer"
                    />
                    <div className="flex-1 pr-16">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-zinc-900">
                          {firstDeptMigrationModal.memberCount > 0
                            ? `Move all ${firstDeptMigrationModal.memberCount} members to "${firstDeptMigrationModal.newDeptPayload?.name || 'New'}" & delete "Main"`
                            : `Delete placeholder "Main" and use "${firstDeptMigrationModal.newDeptPayload?.name || 'New'}"`}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 font-medium mt-1 leading-relaxed">
                        {firstDeptMigrationModal.memberCount > 0
                          ? `Existing members in Main will automatically be reassigned to "${firstDeptMigrationModal.newDeptPayload?.name}", and the redundant Main department will be removed.`
                          : `Removes the unused Main department so "${firstDeptMigrationModal.newDeptPayload?.name}" becomes the primary department.`}
                      </p>
                    </div>
                  </div>
                  <span className="absolute top-3.5 right-3.5 px-2 py-0.5 bg-[#C82A2B] text-white rounded-md text-[9px] font-black uppercase tracking-wider">
                    Recommended
                  </span>
                </div>

                {/* Option 2: Keep Both */}
                <div
                  onClick={() => setFirstDeptMigrationModal(prev => ({ ...prev, selectedAction: 'keep_both' }))}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    firstDeptMigrationModal.selectedAction === 'keep_both'
                      ? 'border-[#C82A2B] bg-[#FFF1F1] shadow-sm'
                      : 'border-zinc-200 hover:border-zinc-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="migrationAction"
                      checked={firstDeptMigrationModal.selectedAction === 'keep_both'}
                      onChange={() => setFirstDeptMigrationModal(prev => ({ ...prev, selectedAction: 'keep_both' }))}
                      className="mt-1 accent-[#C82A2B] cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-black text-zinc-900">
                        Keep &quot;Main&quot; alongside &quot;{firstDeptMigrationModal.newDeptPayload?.name || 'New'}&quot;
                      </span>
                      <p className="text-xs text-zinc-500 font-medium mt-1 leading-relaxed">
                        {firstDeptMigrationModal.memberCount > 0
                          ? `Leave "Main" untouched with its ${firstDeptMigrationModal.memberCount} members. "${firstDeptMigrationModal.newDeptPayload?.name}" will be added as a separate department with 0 members.`
                          : `Keep "Main" as a fallback department and add "${firstDeptMigrationModal.newDeptPayload?.name}" alongside it.`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Option 3: Move members but keep Main (only if members exist) */}
                {firstDeptMigrationModal.memberCount > 0 && (
                  <div
                    onClick={() => setFirstDeptMigrationModal(prev => ({ ...prev, selectedAction: 'migrate_and_keep' }))}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      firstDeptMigrationModal.selectedAction === 'migrate_and_keep'
                        ? 'border-[#C82A2B] bg-[#FFF1F1] shadow-sm'
                        : 'border-zinc-200 hover:border-zinc-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="migrationAction"
                        checked={firstDeptMigrationModal.selectedAction === 'migrate_and_keep'}
                        onChange={() => setFirstDeptMigrationModal(prev => ({ ...prev, selectedAction: 'migrate_and_keep' }))}
                        className="mt-1 accent-[#C82A2B] cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-black text-zinc-900">
                          Move members to &quot;{firstDeptMigrationModal.newDeptPayload?.name || 'New'}&quot; but keep empty &quot;Main&quot;
                        </span>
                        <p className="text-xs text-zinc-500 font-medium mt-1 leading-relaxed">
                          Reassign the {firstDeptMigrationModal.memberCount} members to &quot;{firstDeptMigrationModal.newDeptPayload?.name}&quot;, while keeping &quot;Main&quot; as an empty department for future unassigned members.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setFirstDeptMigrationModal(prev => ({ ...prev, isOpen: false }))}
                disabled={firstDeptMigrationModal.isSubmitting}
                className="px-5 h-11 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-200/70 border border-zinc-200 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmMigrationAndCreate}
                disabled={firstDeptMigrationModal.isSubmitting}
                className="px-6 h-11 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#C82A2B] hover:bg-[#A81D1E] text-white shadow-md shadow-[#C82A2B]/20 flex items-center gap-2 cursor-pointer"
              >
                {firstDeptMigrationModal.isSubmitting ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <span>Confirm & Create</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrganizationDetailsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-zinc-400 font-semibold animate-pulse">Loading organization details & ledger...</div>}>
      <OrganizationDetailsPageContent />
    </Suspense>
  );
}
