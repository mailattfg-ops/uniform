'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
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
  Receipt,
  FileCheck,
  Eye,
  Layers,
  Target,
  MessageSquarePlus,
  AlertTriangle
} from 'lucide-react';
import { DynamicForm, FormField } from '@/components/ui/DynamicForm';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CredentialsModal } from '@/components/ui/CredentialsModal';
import { CustomerFormModal } from '@/components/entities/CustomerFormModal';
import { Select } from '@/components/ui/Select';
import { MemberProfileModal } from '@/components/entities/MemberProfileModal';
import * as XLSX from 'xlsx';
import { formatDate } from '@/lib/formatters';
import ProFormaInvoiceModal from '@/components/documents/ProFormaInvoiceModal';
import TaxInvoiceModal from '@/components/documents/TaxInvoiceModal';
import QuotationDetails from '@/app/(dashboard)/marketing/quotations/_components/QuotationDetails';
import CustomJournalModal from '@/components/finance/CustomJournalModal';

interface Organization {
  id: number;
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
          className="flex-1 h-11 bg-white border border-[#fce4d4] rounded-xl px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-[#2d8d9b]/20 text-[#3a525d]"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-5 h-11 rounded-xl bg-[#2d8d9b] hover:bg-[#3a525d] text-white font-black uppercase tracking-wider text-[10px] flex items-center justify-center transition-all active:scale-95 shadow-md shadow-[#2d8d9b]/20 cursor-pointer border-none outline-none"
        >
          Add
        </button>
      </div>

      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2 p-3 bg-zinc-50/50 rounded-2xl border border-zinc-150/50 min-h-12 items-center">
          {items.map((item, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] shadow-sm animate-in zoom-in-95 duration-200"
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
  const [customJournals, setCustomJournals] = useState<any[]>([]);

  const fetchCustomJournals = async () => {
    if (!orgId) return;
    try {
      const res = await api.get(`/organizations/${orgId}/journals`);
      if (res.data?.journals && res.data.journals.length > 0) {
        setCustomJournals(res.data.journals);
        return;
      }
    } catch (e) {
      console.warn('Backend journals table not yet populated, falling back to local store');
    }
    // Fallback to localStorage
    try {
      const saved = localStorage.getItem(`custom_journals_${orgId}`);
      if (saved) {
        setCustomJournals(JSON.parse(saved));
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchCustomJournals();
  }, [orgId]);

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
  const [industries, setIndustries] = useState<any[]>([]);
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
  const [invoiceType, setInvoiceType] = useState<'bulk' | 'retail'>('bulk');
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
  const [selectedOrderIdForInvoice, setSelectedOrderIdForInvoice] = useState<number | null>(null);
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

  const [deleteDeptConfirm, setDeleteDeptConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null
  });

  // Entity directory states inside tab
  const [entities, setEntities] = useState<any[]>([]);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('');
  const [entitySearchQuery, setEntitySearchQuery] = useState('');
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
      const [orgsRes, detailsRes, quotesRes, indRes] = await Promise.all([
        api.get('/organizations').catch(() => ({ data: [] })),
        api.get(`/organizations/${orgId}/details`),
        api.get('/quotations').catch(() => ({ data: [] })),
        api.get('/industries').catch(() => ({ data: [] }))
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

  useEffect(() => {
    if (orgId && (activeTab === 'ledger' || activeTab === 'transactions' || activeTab === 'overview')) {
      fetchLedgerData();
      fetchChallans();
      fetchLeadHistory();
    }
  }, [orgId, activeTab, org?.name]);

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

    if (invoiceType === 'bulk') {
      if (!selectedOrderIdForInvoice) {
        toast.error('Please select a confirmed sales order');
        return;
      }
      setIsSubmittingInvoice(true);
      const loadingToast = toast.loading('Generating bulk order invoice...');
      try {
        await api.post('/invoices/from-order', {
          order_id: selectedOrderIdForInvoice,
          credit_period_days: invoiceCreditPeriod,
          invoice_date: invoiceDate,
          notes: invoiceNotes
        });
        toast.success('Bulk order invoice created successfully!', { id: loadingToast });
        setIsInvoiceModalOpen(false);
        fetchLedgerData();
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to create bulk invoice', { id: loadingToast });
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
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to create retail invoice', { id: loadingToast });
      } finally {
        setIsSubmittingInvoice(false);
      }
    }
  };

  const exportLedgerCSV = () => {
    if (!ledgerData || !ledgerData.transactions || ledgerData.transactions.length === 0) {
      toast.error('No ledger entries available to export');
      return;
    }

    const headers = ['Date', 'Type', 'Reference No', 'Description', 'Order Ref', 'Debit (INR)', 'Credit (INR)', 'Running Balance (INR)', 'Status'];
    const rows = ledgerData.transactions.map((tx: any) => [
      `"${formatDate(tx.date)}"`,
      `"${tx.type}"`,
      `"${tx.reference_no}"`,
      `"${tx.description}"`,
      `"${tx.order_ref}"`,
      tx.debit || 0,
      tx.credit || 0,
      tx.running_balance || 0,
      `"${tx.status}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `customer_ledger_${(org?.name || 'client').replace(/\\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Account Ledger Exported');
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

  const handleConfirmedDeleteDept = async () => {
    if (!deleteDeptConfirm.id) return;

    const loadingToast = toast.loading('Removing department...');
    const id = deleteDeptConfirm.id;
    setDeleteDeptConfirm({ isOpen: false, id: null });

    try {
      await api.delete(`/departments/${id}`);
      toast.success('Department removed!', { id: loadingToast });

      const detailsRes = await api.get(`/organizations/${orgId}/details`);
      setOrgDetails(detailsRes.data);
      setDepartments(detailsRes.data.departments || []);
    } catch (err) {
      toast.error('Failed to delete department', { id: loadingToast });
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
      school_id: String(orgId)
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

    const headers = ['Full Name', 'Reference ID', 'Organization', 'Department / Section', 'Status', 'Measurement Status', 'Onboarded Date'];
    const rows = listToExport.map(e => [
      `"${e.full_name}"`,
      `"${e.admission_no}"`,
      `"${org?.name || 'Main Registry'}"`,
      `"${e.departments?.name || (selectedDepartmentForMembers?.name || 'Main')}"`,
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

        return {
          full_name: findVal(['Full Name', 'Name', 'Student Name', 'Member Name', 'full_name', 'Employee Name']),
          admission_no: String(findVal(['Admission / Employee ID (Optional)', 'Admission / Employee ID', 'Admission No / Roll No', 'Admission No', 'Roll No', 'Employee ID', 'Emp ID', 'Reference ID', 'ID', 'admission_no', 'Reg No', 'Registration No', 'Code']) || ''),
          organization_id: String(orgId),
          department_id: deptRaw && String(deptRaw).trim() !== '' ? String(deptRaw).trim() : (selectedDepartmentForMembers?.name || 'Main'),
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
    return ledgerData?.payments || [];
  }, [ledgerData?.payments]);

  const customerOrders = React.useMemo(() => {
    if (ledgerData?.orders && ledgerData.orders.length > 0) {
      return ledgerData.orders;
    }
    return orgDetails?.orders || [];
  }, [ledgerData?.orders, orgDetails?.orders]);

  const customerShipments = React.useMemo(() => {
    return deliveryChallans.map((dc: any) => ({
      id: dc.id,
      dc_no: dc.dc_no,
      order_id: dc.order_id,
      order_no: dc.orders?.order_no || `ORD-${dc.order_id}`,
      quotation_no: dc.orders?.quotations?.quotation_no || '—',
      dispatch_date: dc.dispatch_date || dc.created_at,
      transporter_name: dc.transporter_name || 'Standard Logistics',
      vehicle_no: dc.vehicle_no || '—',
      total_packages: dc.total_packages || 1,
      status: dc.status || 'Dispatched',
      notes: dc.notes || '—'
    }));
  }, [deliveryChallans]);

  const customerPackages = React.useMemo(() => {
    const list: any[] = [];
    deliveryChallans.forEach((dc: any) => {
      // Create packaging rows only once packaging is done (no awaiting status)
      const dcStatus = dc.status || 'Packed';
      if (dcStatus.toLowerCase().includes('awaiting')) return;

      const count = Math.max(1, parseInt(dc.total_packages, 10) || 1);
      if (count <= 6) {
        for (let i = 1; i <= count; i++) {
          list.push({
            id: `PKG-${dc.dc_no || dc.id}-${i}`,
            package_no: `PKG-${dc.dc_no || dc.id}-BX${String(i).padStart(2, '0')}`,
            order_no: dc.orders?.order_no || `ORD-${dc.order_id}`,
            challan_no: dc.dc_no,
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
          id: `PKG-${dc.dc_no || dc.id}-BULK`,
          package_no: `PKG-${dc.dc_no || dc.id}-BX01~${count}`,
          order_no: dc.orders?.order_no || `ORD-${dc.order_id}`,
          challan_no: dc.dc_no,
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
  }, [deliveryChallans]);

  const customerInvoices = React.useMemo(() => {
    const rawInvoices = (ledgerData?.invoices && ledgerData.invoices.length > 0)
      ? ledgerData.invoices
      : (ledgerData?.transactions?.filter((t: any) => t.type === 'INVOICE') || []);

    const allOrders = customerOrders || ledgerData?.orders || orgDetails?.orders || [];

    return rawInvoices.map((inv: any) => {
      const linkedOrder = allOrders.find(
        (o: any) => o.id === inv.order_id || (inv.quotation_id && o.quotation_id === inv.quotation_id)
      );
      const resolvedOrderNo = inv.order_no || linkedOrder?.order_no || inv.order_ref || (inv.sale_type === 'retail' ? 'Retail Direct' : '—');
      return {
        ...inv,
        invoice_no: inv.invoice_no || inv.reference_no,
        order_no: resolvedOrderNo,
        total_amount: inv.total_amount !== undefined ? inv.total_amount : inv.debit,
        paid_amount: inv.paid_amount !== undefined ? inv.paid_amount : (inv.status === 'Paid' ? inv.debit : 0),
        payment_status: inv.payment_status || inv.status
      };
    });
  }, [ledgerData?.invoices, ledgerData?.transactions, customerOrders, ledgerData?.orders, orgDetails?.orders]);

  const customerExpenses = React.useMemo(() => {
    const list: any[] = [];

    // Primary: Expenses linked to confirmed sales orders
    if (customerOrders && customerOrders.length > 0) {
      customerOrders.forEach((ord: any) => {
        const ordVal = parseFloat(ord.total_amount || ord.quotations?.final_quote_value || 0);
        const totalExp = parseFloat(ord.quotations?.estimated_expenses || 0);
        const fabricExp = totalExp > 0 ? (totalExp * 0.65) : (ordVal * 0.45);
        const trimExp = totalExp > 0 ? (totalExp * 0.20) : (ordVal * 0.12);
        const opsExp = totalExp > 0 ? (totalExp * 0.15) : (ordVal * 0.08);

        if (ordVal > 0 || totalExp > 0) {
          list.push({
            id: `EXP-ORD-${ord.id}-01`,
            expense_ref: `EXP-${ord.order_no}-FAB`,
            date: ord.order_date || ord.created_at,
            category: 'Fabric & Raw Materials',
            order_no: ord.order_no,
            linked_ref: ord.order_no,
            description: `Textile & milling procurement for ${ord.order_no} (${ord.quotations?.title || 'Client Uniforms'})`,
            amount: fabricExp,
            status: 'Allocated'
          });
          list.push({
            id: `EXP-ORD-${ord.id}-02`,
            expense_ref: `EXP-${ord.order_no}-TRM`,
            date: ord.order_date || ord.created_at,
            category: 'Trims, Buttons & Labels',
            order_no: ord.order_no,
            linked_ref: ord.order_no,
            description: `Custom branded trims, embroidery & accessories for ${ord.order_no}`,
            amount: trimExp,
            status: 'Allocated'
          });
          list.push({
            id: `EXP-ORD-${ord.id}-03`,
            expense_ref: `EXP-${ord.order_no}-DEV`,
            date: ord.order_date || ord.created_at,
            category: 'Sampling & Pattern Development',
            order_no: ord.order_no,
            linked_ref: ord.order_no,
            description: `CAD sizing, grade digitisation & pre-production sample for ${ord.order_no}`,
            amount: opsExp,
            status: 'Allocated'
          });
        }
      });
    } else {
      // Fallback: If no orders placed yet, link quotations with their corresponding order number
      quotations.forEach((q: any) => {
        const totalExp = parseFloat(q.estimated_expenses || 0);
        const quoteVal = parseFloat(q.final_quote_value || 0);
        const fabricExp = totalExp > 0 ? (totalExp * 0.65) : (quoteVal * 0.45);
        const trimExp = totalExp > 0 ? (totalExp * 0.20) : (quoteVal * 0.12);
        const opsExp = totalExp > 0 ? (totalExp * 0.15) : (quoteVal * 0.08);

        const matchingOrder = customerOrders?.find((o: any) => o.quotation_id === q.id || o.quotations?.id === q.id);
        const orderNo = matchingOrder?.order_no || (q.order_no ? q.order_no : `ORD-${q.quotation_no?.replace(/^QT-?/i, '') || q.id}`);

        if (quoteVal > 0 || totalExp > 0) {
          list.push({
            id: `EXP-${q.id}-01`,
            expense_ref: `EXP-${orderNo}-FAB`,
            date: q.created_at,
            category: 'Fabric & Raw Materials',
            order_no: orderNo,
            linked_ref: orderNo,
            description: `Textile & milling procurement for ${q.title || 'Client Uniforms'}`,
            amount: fabricExp,
            status: 'Allocated'
          });
          list.push({
            id: `EXP-${q.id}-02`,
            expense_ref: `EXP-${orderNo}-TRM`,
            date: q.created_at,
            category: 'Trims, Buttons & Labels',
            order_no: orderNo,
            linked_ref: orderNo,
            description: `Custom branded trims, embroidery & accessories`,
            amount: trimExp,
            status: 'Allocated'
          });
          list.push({
            id: `EXP-${q.id}-03`,
            expense_ref: `EXP-${orderNo}-DEV`,
            date: q.created_at,
            category: 'Sampling & Pattern Development',
            order_no: orderNo,
            linked_ref: orderNo,
            description: `CAD sizing, grade digitisation & pre-production sample`,
            amount: opsExp,
            status: 'Allocated'
          });
        }
      });
    }
    return list;
  }, [customerOrders, quotations]);

  // Memoized Financial Journals (Invoices, Payments & Adjustment JVs only - no contact/CRM logs)
  const customerJournals = React.useMemo(() => {
    const list: any[] = [];
    const seenRefs = new Set<string>();

    // 1. Sales Invoices (Debits to Accounts Receivable)
    customerInvoices.forEach((inv: any) => {
      const amount = parseFloat(inv.total_amount || 0);
      const ref = inv.invoice_no || `INV-${inv.id}`;
      seenRefs.add(ref);

      const linkedOrder = customerOrders.find((o: any) => o.id === inv.order_id);
      const orderRef = linkedOrder?.order_no || inv.order_no || 'Direct Billing';

      list.push({
        id: `JN-INV-${inv.id}`,
        journal_no: `JN-${ref}`,
        ref: ref,
        date: inv.invoice_date || inv.created_at,
        category: 'Sales Invoice',
        account: 'Accounts Receivable (Dr)',
        offset_account: 'Sales Revenue (Cr)',
        title: `Sales Invoice #${ref}`,
        narration: inv.notes || (inv.sale_type === 'retail' ? 'Retail counter tax invoice' : `Commercial invoice billed for ${orderRef}`),
        order_ref: orderRef,
        debit: amount,
        credit: 0,
        status: inv.payment_status?.toLowerCase() === 'paid' ? 'Paid & Posted' : 'Posted',
        icon: ReceiptText,
        icon_bg: 'bg-blue-50 text-blue-750 border-blue-200'
      });
    });

    // 2. Customer Payments (Credits to Accounts Receivable / Debits to Bank or Cash)
    customerPayments.forEach((pay: any) => {
      const amount = parseFloat(pay.amount || 0);
      const ref = pay.reference_no || pay.payment_number || `REC-${pay.id}`;
      seenRefs.add(ref);

      const quoteMatch = quotations.find((q: any) => q.id === pay.quotation_id);
      const linkedOrder = customerOrders.find((o: any) => o.quotation_id === pay.quotation_id);
      const orderRef = linkedOrder?.order_no || quoteMatch?.quotation_no || (pay.notes?.includes('ORD') ? pay.notes : 'Account Settlement');

      list.push({
        id: `JN-PAY-${pay.id}`,
        journal_no: `JN-${ref}`,
        ref: ref,
        date: pay.payment_date || pay.paid_at || pay.created_at,
        category: 'Customer Payment',
        account: `${pay.payment_method || pay.payment_mode || 'Bank Account'} (Dr)`,
        offset_account: 'Accounts Receivable (Cr)',
        title: `Payment Receipt #${ref}`,
        narration: pay.notes || `Settlement received via ${pay.payment_method || 'Bank Transfer'}${orderRef ? ` for ${orderRef}` : ''}`,
        order_ref: orderRef,
        debit: 0,
        credit: amount,
        status: 'Posted',
        icon: CreditCard,
        icon_bg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      });
    });

    // 3. Standalone Accounting Ledger Entries & Journal Vouchers (from ledgerData.transactions)
    if (ledgerData?.transactions) {
      ledgerData.transactions.forEach((tx: any, idx: number) => {
        if (tx.reference_no && seenRefs.has(tx.reference_no)) return;

        const isDebit = Boolean(tx.debit && tx.debit > 0);
        const ref = tx.reference_no || `JV-${tx.type || 'ADJ'}-${tx.raw_id || idx + 1}`;
        const amount = isDebit ? parseFloat(tx.debit) : parseFloat(tx.credit || 0);
        const txType = (tx.type || '').toUpperCase();

        const isInvoiceType = txType === 'INVOICE';
        const isPaymentType = txType === 'PAYMENT';

        let category = 'Manual Journal';
        let account = 'Accounts Adjustment';
        let offsetAccount = 'General Ledger';

        if (isInvoiceType) {
          category = 'Sales Invoice';
          account = 'Accounts Receivable (Dr)';
          offsetAccount = 'Sales Revenue (Cr)';
        } else if (isPaymentType) {
          category = 'Customer Payment';
          account = `${tx.payment_mode || 'Bank'} (Dr)`;
          offsetAccount = 'Accounts Receivable (Cr)';
        }

        list.push({
          id: `JN-TX-${tx.id || idx}`,
          journal_no: `JN-${ref}`,
          ref: ref,
          date: tx.date,
          category: category,
          account: account,
          offset_account: offsetAccount,
          title: isInvoiceType ? `Sales Invoice #${ref}` : isPaymentType ? `Payment Receipt #${ref}` : `Journal Voucher #${ref}`,
          narration: tx.description || tx.notes || (isDebit ? 'Debit adjustment voucher' : 'Credit adjustment voucher'),
          order_ref: tx.order_ref || '—',
          debit: isDebit ? amount : 0,
          credit: !isDebit ? amount : 0,
          status: 'Posted',
          icon: isInvoiceType ? ReceiptText : isPaymentType ? CreditCard : BookOpen,
          icon_bg: isInvoiceType ? 'bg-blue-50 text-blue-750 border-blue-200' : isPaymentType ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-purple-50 text-purple-700 border-purple-200'
        });
      });
    }

    // 4. Custom Manual Journals created via Custom Journal entry modal
    customJournals.forEach((cj: any) => {
      list.push({
        id: cj.id,
        journal_no: cj.journal_no,
        ref: cj.journal_no,
        date: cj.date,
        category: 'Manual Journal',
        account: cj.account_summary || 'Custom Manual Journal',
        offset_account: cj.offset_summary || 'General Ledger',
        title: cj.title || `Manual Journal #${cj.journal_no}`,
        narration: cj.notes || (cj.rows ? cj.rows.map((r: any) => r.description).filter(Boolean).join('; ') : 'Manual double-entry voucher'),
        order_ref: cj.reference_no || 'Manual JV',
        debit: cj.total_debit,
        credit: cj.total_credit,
        status: 'Posted',
        icon: BookOpen,
        icon_bg: 'bg-purple-50 text-purple-700 border-purple-200'
      });
    });

    // Filter by category if selected
    let filtered = list;
    if (journalCategoryFilter && journalCategoryFilter !== 'ALL') {
      filtered = list.filter(item => item.category === journalCategoryFilter);
    }

    // Sorted chronologically (newest to oldest)
    return filtered.sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeB - timeA;
    });
  }, [
    customerInvoices,
    customerPayments,
    customerOrders,
    quotations,
    ledgerData?.transactions,
    journalCategoryFilter,
    customJournals
  ]);

  const customerProFormaInvoices = React.useMemo(() => {
    return quotations.map((q: any) => {
      const piNo = `PI-${q.quotation_no ? q.quotation_no.replace('QT-', '') : q.id}`;
      const allOrders = customerOrders || ledgerData?.orders || orgDetails?.orders || [];
      const linkedOrder = allOrders.find(
        (o: any) => o.quotation_id === q.id || (o.quotations && o.quotations.quotation_no === q.quotation_no)
      );
      const hasOrder = Boolean(linkedOrder);
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

      return {
        id: q.id,
        pi_no: piNo,
        order_no: linkedOrder?.order_no || '—',
        date: q.created_at,
        validity_days: org?.credit_period_days || 30,
        title: q.title,
        type: q.quotation_type || q.metrics_summary?.quotation_type || 'Commercial Bulk',
        amount: parseFloat(q.final_quote_value || '0'),
        status: piStatus,
        raw: q
      };
    });
  }, [quotations, customerOrders, ledgerData?.orders, orgDetails?.orders, org?.credit_period_days]);

  if (isLoadingOrg) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-12 h-12 border-4 border-[#2d8d9b]/25 border-t-[#2d8d9b] rounded-full animate-spin" />
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header section with Single-Line Navigation, Details & Action Toolbar */}
      <div className="bg-white p-5 md:p-6 rounded-[2rem] shadow-sm border border-zinc-100 space-y-4">
        <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3.5">
          {/* Left: Back button + Name & Meta Details (Code, Industry, Date stamp, Badges) */}
          <div className="flex items-center gap-3 min-w-0">
            <Button
              onClick={() => router.push(isClientUser ? '/dashboard' : '/customers')}
              variant="secondary"
              className="w-9 h-9 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-center text-zinc-500 hover:bg-[#2d8d9b] hover:text-white transition-all shadow-2xs !p-0 shrink-0 cursor-pointer"
            >
              <ArrowLeft size={16} />
            </Button>
            <div className="min-w-0 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h1 className="text-xl md:text-2xl font-black italic tracking-tighter text-[#3a525d] whitespace-nowrap">
                {org.name}
              </h1>
              <span className="px-2 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-650 rounded-lg text-[9px] font-black uppercase tracking-wider shrink-0">
                {org.customer_code ? `Code: ${org.customer_code}` : `ID: #${org.id}`}
              </span>
              <span className="text-[10px] font-black text-[#2d8d9b] uppercase tracking-widest shrink-0">
                {org.industries?.name || 'School Sector'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-50 border border-zinc-200/80 text-zinc-600 rounded-lg text-[9px] font-bold shrink-0">
                <Calendar size={11} className="text-[#2d8d9b]" />
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

          {/* Right: Tab Switcher Buttons & Actions Button on the same line */}
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
                    ? 'bg-[#3a525d] text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50'
                    }`}
                >
                  {tab === 'transactions' && <CreditCard size={13} className={activeTab === 'transactions' ? 'text-[#2d8d9b]' : 'text-zinc-400'} />}
                  {tab === 'ledger' && <ReceiptText size={13} className={activeTab === 'ledger' ? 'text-[#2d8d9b]' : 'text-zinc-400'} />}
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
                  className="h-8 md:h-9 px-3.5 rounded-xl bg-[#3a525d] text-white hover:bg-[#2d8d9b] transition-all shadow-sm text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  title="Customer Account Actions"
                >
                  <span>Actions</span>
                  <ChevronDown size={13} className={`transition-transform duration-200 ${isActionsDropdownOpen ? 'rotate-180' : ''}`} />
                </Button>

                {isActionsDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-zinc-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsDropdownOpen(false);
                        setIsEditingCustomer(true);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-bold text-[#3a525d] hover:bg-[#2d8d9b]/10 hover:text-[#2d8d9b] flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Edit2 size={13} className="text-[#2d8d9b]" />
                      <span>Edit Profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsActionsDropdownOpen(false);
                        handleResetPassword();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-bold text-[#3a525d] hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2.5 transition-colors cursor-pointer"
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
      </div>

      {/* Tab 1: Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Floating Measurement Quick Action Widget on Right Side (Pops out on hover) */}
          <div
            className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-stretch transition-transform duration-300 ease-out select-none ${
              isMeasurementDrawerOpen ? 'translate-x-0' : 'translate-x-[calc(100%-46px)] hover:translate-x-0'
            }`}
            onMouseEnter={() => setIsMeasurementDrawerOpen(true)}
            onMouseLeave={() => setIsMeasurementDrawerOpen(false)}
          >
            {/* Protruding Handle on Right Edge */}
            <button
              type="button"
              onClick={() => setIsMeasurementDrawerOpen(!isMeasurementDrawerOpen)}
              className="w-[46px] bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-l-2xl py-4 px-2 flex flex-col items-center justify-center gap-2.5 shadow-[-6px_4px_25px_rgba(0,0,0,0.18)] border-y border-l border-[#2d8d9b]/40 cursor-pointer transition-all shrink-0"
              title="Measurements & Sizing Quick Actions"
            >
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[#2d8d9b]">
                <Ruler size={16} />
              </div>

              <span className="[writing-mode:vertical-rl] rotate-180 text-[9px] font-black uppercase tracking-[0.2em] text-[#fce4d4] py-1">
                Sizing
              </span>

              {(orgDetails?.measurements?.pending || 0) > 0 ? (
                <span
                  className="w-5 h-5 rounded-full bg-orange-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs animate-pulse"
                  title={`${orgDetails?.measurements?.pending} pending measurements`}
                >
                  {orgDetails?.measurements?.pending}
                </span>
              ) : (
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-black flex items-center justify-center">
                  <Check size={10} />
                </span>
              )}

              <ChevronLeft
                size={14}
                className={`text-zinc-300 transition-transform duration-300 ${isMeasurementDrawerOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Pop-out Panel */}
            <div className="w-80 bg-white rounded-l-3xl shadow-[-12px_10px_35px_rgba(0,0,0,0.14)] border-y border-l border-zinc-200 p-5 space-y-4 shrink-0 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#2d8d9b]/10 text-[#2d8d9b] flex items-center justify-center">
                    <Ruler size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#3a525d] tracking-tight">Sizing & Measurements</h4>
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
                    <div className="w-8 h-8 rounded-xl bg-[#3a525d]/10 text-[#3a525d] group-hover:bg-[#3a525d] group-hover:text-white flex items-center justify-center transition-colors">
                      <Users size={15} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Total Members</p>
                      <p className="text-base font-black text-[#3a525d] leading-none mt-0.5">
                        {orgDetails?.measurements?.total || 0}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-white border border-zinc-200 text-[#3a525d] group-hover:bg-[#3a525d] group-hover:text-white group-hover:border-[#3a525d] text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-2xs">
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
                className="w-full h-10 rounded-xl bg-[#2d8d9b] hover:bg-[#3a525d] text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-[#2d8d9b]/20 transition-all cursor-pointer active:scale-95"
              >
                <Ruler size={14} />
                <span>Record Sizing Now</span>
              </button>
            </div>
          </div>

          {isClientUser && (
            <div className="p-4 bg-[#2d8d9b]/10 rounded-2xl border border-[#2d8d9b]/20 flex items-center gap-3">
              <Building2 className="text-[#2d8d9b] shrink-0" size={20} />
              <div>
                <p className="text-xs font-bold text-[#3a525d]">Organization Client Portal</p>
                <p className="text-[11px] text-zinc-500 font-medium">You are viewing your official organization directory and account records.</p>
              </div>
            </div>
          )}

          {/* Statement & Account Balance KPI Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <ReceiptText size={18} className="text-[#2d8d9b]" />
                <h3 className="text-lg font-black text-[#3a525d] tracking-tight">Statement & Account Summary</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('ledger')}
                className="text-xs font-bold text-[#2d8d9b] hover:text-[#3a525d] flex items-center gap-1 transition-colors cursor-pointer group"
              >
                <span>View Full Statement & Ledger</span>
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* 1. Total Invoiced */}
              <div
                onClick={() => setActiveTab('ledger')}
                className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-[#2d8d9b]/30 cursor-pointer transition-all group"
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
                className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-[#2d8d9b]/30 cursor-pointer transition-all group"
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
                className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-[#2d8d9b]/30 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {(ledgerData?.summary?.outstanding_balance || 0) < 0 ? 'Customer Credit Balance' : 'Net Outstanding Balance'}
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-[#CC9448]/15 text-[#CC9448] flex items-center justify-center group-hover:scale-105 transition-transform">
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
                className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-[#2d8d9b]/30 cursor-pointer transition-all group"
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
            <h3 className="text-lg font-black text-[#3a525d] tracking-tight">Organization Profile</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                <span className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                  <MapPin size={12} /> Address Location
                </span>
                <div className="space-y-1.5">
                  <p className="text-sm font-bold text-[#3a525d]">
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
                        <span className="bg-white px-2.5 py-0.5 rounded-lg border border-zinc-200 shadow-2xs text-[#2d8d9b]">
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
                  <p className="text-sm font-bold text-[#3a525d]">
                    {org.contact_person || 'No Contact Person Listed'}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-semibold text-zinc-600">
                    {(org.contact_number || org.phone) && (
                      <a
                        href={`tel:${org.contact_number || org.phone}`}
                        className="inline-flex items-center gap-1.5 font-mono text-[#3a525d] hover:text-[#2d8d9b] transition-colors"
                      >
                        <Phone size={12} className="text-[#2d8d9b]" />
                        <span>{org.contact_number || org.phone}</span>
                      </a>
                    )}
                    {(org.email || org.contact_email) && (
                      <a
                        href={`mailto:${org.email || org.contact_email}`}
                        className="inline-flex items-center gap-1.5 text-zinc-600 hover:text-[#2d8d9b] transition-colors"
                      >
                        <Mail size={12} className="text-[#2d8d9b]" />
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
                <p className="text-sm font-bold text-[#3a525d]">
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
                  <p className="text-sm font-bold text-[#3a525d]">
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
                  !isClientUser ? 'cursor-pointer hover:border-[#2d8d9b]/40 hover:bg-[#2d8d9b]/5 hover:shadow-sm' : ''
                }`}
                title={!isClientUser ? "Click to configure GST & Delivery details" : undefined}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-[#2d8d9b] transition-colors">
                    <ReceiptText size={12} className="text-zinc-400 group-hover:text-[#2d8d9b] transition-colors" /> GST & B2B Tax Profile
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
                      <span className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-zinc-400 group-hover:text-[#2d8d9b] transition-all" title="Edit GST Details">
                        <Edit2 size={12} />
                      </span>
                    )}
                  </div>
                </div>
                {org.gst_number ? (
                  <div className="space-y-1">
                    <p className="text-sm font-black font-mono text-[#3a525d] tracking-wide group-hover:text-[#2d8d9b] transition-colors">
                      {org.gst_number}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-600 pt-0.5">
                      {org.legal_name && (
                        <span className="text-zinc-600 truncate max-w-[220px]" title={org.legal_name}>
                          Legal: <span className="font-bold text-[#3a525d]">{org.legal_name}</span>
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
                      <div className="text-[11px] font-bold text-[#2d8d9b] flex items-center gap-1 group-hover:underline">
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
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20">
                      Custom Dispatch
                    </span>
                  )}
                </div>
                {(org.delivery_address || org.delivery_city || org.delivery_state || org.delivery_pincode) ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[#3a525d]">
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
                        <span className="bg-white px-2 py-0.5 rounded border border-zinc-200 text-[#2d8d9b] font-mono">
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
                        className="text-[11px] font-bold text-[#2d8d9b] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        + Set Separate Delivery Address
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Credit Period & Commercial Terms Card */}
              <div className="p-5 bg-teal-50/50 rounded-2xl border border-teal-150/60">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-2 text-[9px] font-black text-[#2d8d9b] uppercase tracking-widest">
                    <CreditCard size={12} /> Credit Period Terms
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#2d8d9b] text-white shadow-xs">
                    {org.credit_period_days || 30} Days
                  </span>
                </div>
                <p className="text-sm font-black text-[#3a525d]">
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
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#8b6b5a] hover:text-[#3a525d] transition-colors mb-6 bg-transparent border-none shadow-none px-0 cursor-pointer"
              >
                <ArrowLeft size={14} />
                Back to {selectedDepartmentForMembers ? selectedDepartmentForMembers.name : 'Departments'}
              </Button>

              {generatedEntityCreds ? (
                <div className="max-w-2xl mx-auto animate-in zoom-in duration-500">
                  <div className="bg-white rounded-[3rem] border-4 border-[#2d8d9b]/10 shadow-2xl overflow-hidden">
                    <div className="bg-[#2d8d9b] p-10 text-white text-center">
                      <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <UserCheck size={40} />
                      </div>
                      <h2 className="text-3xl font-black tracking-tight italic">Registration Successful!</h2>
                      <p className="text-[#fce4d4] font-bold uppercase tracking-widest text-xs mt-2 opacity-80">Access Portal Account Generated</p>
                    </div>

                    <div className="p-10 space-y-8">
                      <div className="space-y-4">
                        <div className="p-6 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#8b6b5a]">Entity Access Portal</span>
                            <LogIn size={16} className="text-[#2d8d9b]" />
                          </div>

                          <div className="space-y-4">
                            <div className="flex flex-col">
                              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Login Username</label>
                              <span className="text-lg font-black text-[#3a525d] tracking-tight">{generatedEntityCreds.username}</span>
                            </div>
                            <div className="flex flex-col">
                              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Temporary Password</label>
                              <div className="flex items-center gap-3">
                                <Key size={14} className="text-[#f2994a]" />
                                <span className="text-xl font-black text-[#f2994a] tracking-[0.2em]">{generatedEntityCreds.password}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          onClick={handleCopyCreds}
                          className={`h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-3 transition-all cursor-pointer ${hasCopiedCreds ? 'bg-green-500 text-white' : 'bg-[#3a525d] text-white hover:bg-[#2d8d9b]'
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
                          className="h-14 rounded-2xl border-2 border-[#3a525d]/10 font-black uppercase tracking-widest text-[10px] gap-3 cursor-pointer"
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
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#8b6b5a] hover:text-[#3a525d] transition-colors mb-6 bg-transparent border-none shadow-none px-0 cursor-pointer"
              >
                <ArrowLeft size={14} />
                Back to {selectedDepartmentForMembers ? selectedDepartmentForMembers.name : 'Departments'}
              </Button>

              {bulkResults ? (
                <div className="max-w-xl mx-auto p-10 bg-white rounded-[3rem] shadow-2xl border border-zinc-100 text-center space-y-6 animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500">
                    <UserCheck size={40} />
                  </div>
                  <h2 className="text-2xl font-black text-[#3a525d] tracking-tight">Import Summary Completed</h2>

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
                    className="w-full h-12 bg-[#3a525d] text-white hover:bg-[#2d8d9b] rounded-xl font-bold uppercase tracking-widest text-[10px] cursor-pointer"
                  >
                    Return to {selectedDepartmentForMembers ? selectedDepartmentForMembers.name : 'Departments'}
                  </Button>
                </div>
              ) : (
                <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-zinc-100 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black text-[#3a525d] italic">
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
                      className="flex items-center gap-1.5 text-[9px] font-black uppercase text-[#2d8d9b] border-b border-dashed border-[#2d8d9b] hover:text-[#3a525d] transition-colors cursor-pointer"
                    >
                      <Download size={12} /> Template Sheet
                    </button>
                  </div>

                  {!bulkFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="group cursor-pointer border-4 border-dashed border-[#2d8d9b]/10 bg-[#2d8d9b]/5 rounded-2xl p-16 flex flex-col items-center justify-center text-center transition-all hover:bg-[#2d8d9b]/10"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".xlsx,.xls"
                        onChange={handleBulkFileChange}
                      />
                      <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center text-[#2d8d9b] mb-4">
                        <FileUp size={28} />
                      </div>
                      <h4 className="text-base font-bold text-[#3a525d] mb-1">Click or drag Excel registry files here</h4>
                      <p className="text-zinc-400 text-xs">Supports Excel formats (.xlsx / .xls). Records without a department are automatically assigned to {selectedDepartmentForMembers?.name || 'Main'}.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-5 bg-[#3a525d] rounded-2xl text-white shadow-sm">
                        <div className="flex items-center gap-3">
                          <FileUp size={20} />
                          <div>
                            <p className="font-bold text-xs">{bulkFile.name}</p>
                            <p className="text-[9px] uppercase font-bold opacity-60">{bulkData.length} records parsed</p>
                          </div>
                        </div>
                        <button onClick={() => { setBulkFile(null); setBulkData([]); }} className="p-1.5 hover:bg-white/10 rounded-lg cursor-pointer">
                          <X size={16} />
                        </button>
                      </div>

                      <Button
                        onClick={handleBulkUploadSubmit}
                        isLoading={isBulkUploading}
                        className="w-full h-14 bg-[#f2994a] hover:bg-[#e68a3d] text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-md cursor-pointer"
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#fce4d4]/60">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => {
                      setSelectedDepartmentForMembers(null);
                      setEntitySearchQuery('');
                    }}
                    variant="secondary"
                    className="h-10 px-3.5 bg-white border border-[#fce4d4] text-[#3a525d] hover:bg-[#3a525d] hover:text-white rounded-xl font-black uppercase tracking-wider text-[10px] gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
                  >
                    <ArrowLeft size={14} />
                    All Departments
                  </Button>
                  <div className="h-6 w-px bg-zinc-200" />
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#2d8d9b]/10 text-[#2d8d9b] flex items-center justify-center shrink-0">
                      <Grid size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-lg text-[#3a525d] tracking-tight">{selectedDepartmentForMembers.name}</h3>
                        {(selectedDepartmentForMembers.division || selectedDepartmentForMembers.section) && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20">
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
                    className="h-10 px-3.5 bg-white border border-[#fce4d4] text-[#3a525d] hover:bg-[#3a525d] hover:text-white rounded-xl font-black uppercase tracking-wider text-[9px] gap-1.5 shadow-2xs transition-all shrink-0 cursor-pointer"
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
                        className="h-10 px-3.5 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-xl font-black uppercase tracking-wider text-[9px] gap-1.5 shadow-sm shrink-0 cursor-pointer"
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
                        className="h-10 px-3.5 bg-white border border-[#fce4d4] text-[#3a525d] hover:bg-zinc-50 rounded-xl font-black uppercase tracking-wider text-[9px] gap-1.5 shadow-2xs shrink-0 cursor-pointer"
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
                columns={[
                  {
                    header: 'Entity / Member Name',
                    accessor: (e) => (
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={() => setProfileModal({ isOpen: true, member: e })}
                          className="w-9 h-9 rounded-lg bg-[#3a525d]/5 hover:bg-[#3a525d]/15 border border-[#3a525d]/10 flex items-center justify-center font-bold text-[#3a525d] text-[10px] cursor-pointer transition-all"
                          title="Click to view profile"
                        >
                          {e.full_name.charAt(0)}
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => setProfileModal({ isOpen: true, member: e })}
                            className="font-bold text-xs text-[#3a525d] hover:text-[#2d8d9b] hover:underline leading-none text-left border-none bg-transparent p-0 outline-none cursor-pointer block"
                            title="Click to view profile"
                          >
                            {e.full_name}
                          </button>
                          <p className="text-[8px] text-[#2d8d9b] font-bold uppercase tracking-[0.1em] mt-1 opacity-85">Ref: #{e.admission_no}</p>
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
                          className="!p-0 h-8 w-8 flex items-center justify-center rounded-lg bg-[#2d8d9b]/10 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white transition-all shadow-sm border-none cursor-pointer"
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
                data={entities.filter(e => {
                  if (String(e.department_id) === String(selectedDepartmentForMembers.id)) return true;
                  if ((selectedDepartmentForMembers.name || '').trim().toLowerCase() === 'main' && (!e.department_id || !e.departments)) return true;
                  return false;
                })}
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
                columns={[
                  {
                    header: 'Department / Unit',
                    accessor: (d) => (
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={() => {
                            setSelectedDepartmentForMembers(d);
                            setEntityView('list');
                          }}
                          className="w-9 h-9 bg-[#2d8d9b]/10 hover:bg-[#2d8d9b]/20 rounded-xl flex items-center justify-center text-[#2d8d9b] cursor-pointer transition-colors"
                          title="Click to view students"
                        >
                          <Grid size={17} />
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDepartmentForMembers(d);
                              setEntityView('list');
                            }}
                            className="font-black text-sm tracking-tight text-[#3a525d] hover:text-[#2d8d9b] hover:underline text-left cursor-pointer transition-colors block bg-transparent border-none p-0"
                            title="Click to view students in this department"
                          >
                            {d.name || 'N/A'}
                          </button>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            {d.grade && (
                              <span className="px-1.5 py-0.5 bg-zinc-50 border border-zinc-150 text-zinc-500 rounded text-[9px] font-bold uppercase tracking-wider">
                                Preset: {d.grade}
                              </span>
                            )}
                            {(d.division || d.section) && (
                              <p className="text-[10px] font-black text-[#2d8d9b] uppercase tracking-widest opacity-70">
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
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDepartmentForMembers(d);
                            setEntityView('list');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2d8d9b]/10 hover:bg-[#2d8d9b] text-[#2d8d9b] hover:text-white font-bold text-xs transition-all cursor-pointer group shadow-2xs border border-[#2d8d9b]/20 hover:border-[#2d8d9b]"
                          title="View students in this department"
                        >
                          <Users size={13} />
                          <span>{count} {count === 1 ? 'Student' : 'Students'}</span>
                          <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      );
                    }
                  },
                  {
                    header: 'Created On',
                    accessor: (d) => (
                      <span className="text-xs font-semibold text-zinc-500">
                        {formatDate(d.created_at)}
                      </span>
                    )
                  },
                  ...(!isClientUser ? [{
                    header: 'Actions',
                    accessor: (d: any) => (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => {
                            setSelectedDepartmentForMembers(d);
                            setEntityView('list');
                          }}
                          variant="secondary"
                          className="flex items-center gap-1 h-8 px-2.5 rounded-lg bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20 hover:bg-[#2d8d9b] hover:text-white transition-all shadow-sm text-xs font-bold cursor-pointer"
                          title="Open Students List"
                        >
                          <Users size={12} />
                          <span>View</span>
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingDept(d);
                            setIsAddingDept(true);
                          }}
                          variant="secondary"
                          className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#3a525d]/10 text-[#3a525d] border border-[#3a525d]/20 hover:bg-[#3a525d] hover:text-white transition-all shadow-sm !p-0 cursor-pointer"
                          title="Edit Department"
                        >
                          <Edit2 size={13} />
                        </Button>
                        <Button
                          onClick={() => setDeleteDeptConfirm({ isOpen: true, id: String(d.id) })}
                          variant="secondary"
                          className="flex items-center justify-center w-8 h-8 rounded-lg bg-error/10 text-error border border-error/20 hover:bg-error hover:text-white transition-all shadow-sm !p-0 cursor-pointer"
                          title="Delete Department"
                        >
                          <Trash2 size={13} />
                        </Button>
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
                      className="h-10 px-3.5 bg-white border border-[#fce4d4] text-[#3a525d] hover:bg-zinc-50 rounded-xl font-black uppercase tracking-wider text-[10px] shadow-2xs gap-1.5 shrink-0 transition-all cursor-pointer"
                    >
                      <FileUp size={14} />
                      Bulk Upload
                    </Button>
                    <Button
                      onClick={() => setIsAddingDept(true)}
                      className="h-10 px-4 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-xl font-black uppercase tracking-wider text-[10px] shadow-sm gap-1.5 shrink-0 cursor-pointer"
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
          {/* Header Action Bar */}
          {/* <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-zinc-150/50 shadow-sm">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20 flex items-center justify-center">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#3a525d] italic">Commercial Transactions Hub</h3>
                  <p className="text-xs text-zinc-400 font-bold mt-0.5">
                    Quotes, payments, sales orders, packaging, dispatches, invoices, expenses, journals & pro forma records for {org.name}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                onClick={() => router.push('/marketing/quotations')}
                className="h-11 px-4 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-xl font-black uppercase tracking-wider text-[10px] flex items-center gap-2 shadow-sm shadow-[#3a525d]/10"
              >
                <Plus size={15} /> Create Quote
              </Button>
              <Button
                onClick={() => {
                  setInvoiceCreditPeriod(org.credit_period_days || 30);
                  setSelectedOrderIdForInvoice(null);
                  setIsInvoiceModalOpen(true);
                }}
                className="h-11 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-wider text-[10px] flex items-center gap-2 shadow-sm shadow-emerald-600/20"
              >
                <ReceiptText size={15} /> Create Invoice
              </Button>
              <Button
                onClick={() => router.push('/marketing/order-placement')}
                variant="secondary"
                className="h-11 px-4 bg-white border border-zinc-200 text-[#3a525d] hover:bg-zinc-50 rounded-xl font-black uppercase tracking-wider text-[10px] flex items-center gap-2 shadow-2xs"
              >
                <ShoppingBag size={15} /> Place Order
              </Button>
            </div>
          </div> */}

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
                        ? 'bg-[#3a525d] text-white shadow-sm'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 bg-zinc-50/60 border border-zinc-200/60'
                    }`}
                  >
                    <Icon size={14} className={isActive ? 'text-[#2d8d9b]' : 'text-zinc-400'} />
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-[#2d8d9b] text-white'
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
                subtitle={`Formal quotation proposals created for ${org.name}`}
                columns={[
                  {
                    header: 'QT / Ref No',
                    accessor: (q) => (
                      <button
                        type="button"
                        onClick={() => handleOpenQuoteModal(q.id)}
                        className="font-mono font-black text-[#2d8d9b] hover:underline cursor-pointer border-none bg-transparent p-0 outline-none text-left flex items-center gap-1.5"
                        title="Click to view quotation"
                      >
                        <FileText size={14} className="text-[#2d8d9b] shrink-0" />
                        <span>{q.quotation_no}</span>
                      </button>
                    )
                  },
                  {
                    header: 'Title / Description',
                    accessor: (q) => (
                      <button
                        type="button"
                        onClick={() => handleOpenQuoteModal(q.id)}
                        className="font-bold text-[#3a525d] hover:text-[#2d8d9b] hover:underline cursor-pointer border-none bg-transparent p-0 outline-none text-left block"
                        title="Click to view quotation"
                      >
                        {q.title || 'Uniform Proposal'}
                      </button>
                    )
                  },
                  {
                    header: 'Type',
                    accessor: (q) => {
                      const qType = q.metrics_summary?.quotation_type || q.quotation_type || 'STANDARD';
                      return (
                        <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-zinc-50 border border-zinc-150 rounded-lg text-zinc-650">
                          {qType}
                        </span>
                      );
                    }
                  },
                  {
                    header: 'Status',
                    accessor: (q) => {
                      const statusColors: Record<string, string> = {
                        'Draft': 'bg-zinc-50 text-zinc-500 border-zinc-200',
                        'Sent': 'bg-blue-50 text-blue-750 border-blue-150',
                        'Accepted': 'bg-green-50 text-green-700 border-green-150',
                        'Rejected': 'bg-red-50 text-red-650 border-red-150'
                      };
                      const cls = statusColors[q.status] || 'bg-zinc-50 text-zinc-500 border-zinc-200';
                      return (
                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider border rounded-lg ${cls}`}>
                          {q.status}
                        </span>
                      );
                    }
                  },
                  {
                    header: 'Final Value',
                    accessor: (q) => (
                      <span className="font-mono font-black text-zinc-800">
                        ₹{parseFloat(q.final_quote_value || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    )
                  },
                  {
                    header: 'Date Created',
                    accessor: (q) => (
                      <span className="text-zinc-500 font-bold">
                        {formatDate(q.created_at)}
                      </span>
                    )
                  }
                ]}
                data={customerQuotes}
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
                columns={[
                  {
                    header: 'Receipt / Ref No',
                    accessor: (p: any) => (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <CreditCard size={14} />
                        </div>
                        <span className="font-mono font-black text-zinc-850">
                          {p.reference_no || `PAY-${p.id}`}
                        </span>
                      </div>
                    )
                  },
                  {
                    header: 'Payment Date',
                    accessor: (p: any) => (
                      <span className="text-zinc-600 font-bold">
                        {formatDate(p.paid_at || p.created_at)}
                      </span>
                    )
                  },
                  {
                    header: 'Payment Method',
                    accessor: (p: any) => (
                      <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-zinc-100 text-zinc-700 rounded-lg border border-zinc-200">
                        {p.payment_method || 'Bank Transfer'}
                      </span>
                    )
                  },
                  {
                    header: 'Linked Quote / Ref',
                    accessor: (p: any) => {
                      const quoteMatch = quotations.find((q: any) => q.id === p.quotation_id);
                      return (
                        <span className="font-mono font-bold text-xs text-[#2d8d9b]">
                          {quoteMatch?.quotation_no || (p.quotation_id ? `QT-${p.quotation_id}` : 'Account Credit')}
                        </span>
                      );
                    }
                  },
                  {
                    header: 'Narration / Notes',
                    accessor: (p: any) => (
                      <span className="text-xs text-zinc-500 font-medium max-w-xs truncate block" title={p.notes || ''}>
                        {p.notes || 'Payment settlement received'}
                      </span>
                    )
                  },
                  {
                    header: 'Amount Paid',
                    accessor: (p: any) => (
                      <span className="font-mono font-black text-emerald-600 text-sm">
                        ₹{parseFloat(String(p.amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    )
                  },
                  {
                    header: 'Status',
                    accessor: () => (
                      <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200">
                        ✓ Confirmed
                      </span>
                    )
                  }
                ]}
                data={customerPayments}
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
                columns={[
                  {
                    header: 'Order No',
                    accessor: (o: any) => (
                      <button
                        type="button"
                        onClick={() => handleViewOrder(Number(o.id))}
                        className="font-mono font-black text-[#2d8d9b] hover:underline cursor-pointer border-none bg-transparent p-0 outline-none text-left flex items-center gap-1.5"
                        title="Click to view full order details"
                      >
                        <ShoppingBag size={14} className="text-[#2d8d9b] shrink-0" />
                        <span>{o.order_no}</span>
                      </button>
                    )
                  },
                  {
                    header: 'Order Date',
                    accessor: (o: any) => (
                      <span className="text-zinc-600 font-bold">
                        {formatDate(o.created_at)}
                      </span>
                    )
                  },
                  {
                    header: 'Target Delivery',
                    accessor: (o: any) => (
                      <span className="text-zinc-500 font-semibold text-xs">
                        {o.target_delivery_date ? formatDate(o.target_delivery_date) : 'Standard Lead Time'}
                      </span>
                    )
                  },
                  {
                    header: 'Linked Quote',
                    accessor: (o: any) => (
                      <span className="font-mono text-xs font-bold text-zinc-600">
                        {o.quotations?.quotation_no || (o.quotation_id ? `QT-${o.quotation_id}` : '—')}
                      </span>
                    )
                  },
                  {
                    header: 'Order Value',
                    accessor: (o: any) => (
                      <span className="font-mono font-black text-zinc-800">
                        {o.quotations?.final_quote_value ? `₹${parseFloat(o.quotations.final_quote_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </span>
                    )
                  },
                  {
                    header: 'Order Status',
                    accessor: (o: any) => {
                      const st = o.status || 'Placed';
                      const isDelivered = st === 'Delivered';
                      const isShipped = st === 'Shipped';
                      const isProd = st === 'In Production';
                      return (
                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${
                          isDelivered ? 'bg-green-50 text-green-700 border-green-200' :
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
                    header: 'Actions',
                    accessor: (o: any) => (
                      <Button
                        onClick={() => handleViewOrder(Number(o.id))}
                        variant="secondary"
                        className="h-8 px-3 rounded-lg border border-zinc-200 text-[10px] font-black uppercase text-[#3a525d] hover:bg-[#3a525d] hover:text-white transition-all flex items-center gap-1.5"
                      >
                        <Eye size={12} /> View Order
                      </Button>
                    )
                  }
                ]}
                data={customerOrders}
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
                columns={[
                  {
                    header: 'Package Slip / Ref',
                    accessor: (pkg) => (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center shrink-0">
                          <Boxes size={14} />
                        </div>
                        <span className="font-mono font-black text-zinc-800 text-xs">
                          {pkg.package_no}
                        </span>
                      </div>
                    )
                  },
                  {
                    header: 'Sales Order Ref',
                    accessor: (pkg) => (
                      <span className="font-mono font-bold text-xs text-[#2d8d9b]">
                        {pkg.order_no}
                      </span>
                    )
                  },
                  {
                    header: 'Challan Ref',
                    accessor: (pkg) => (
                      <span className="font-mono text-xs text-zinc-600 font-semibold">
                        {pkg.challan_no}
                      </span>
                    )
                  },
                  {
                    header: 'Carton Breakdown',
                    accessor: (pkg) => (
                      <span className="px-2.5 py-1 text-[10px] font-bold bg-zinc-100 text-zinc-700 rounded-lg border border-zinc-200">
                        {pkg.carton_label}
                      </span>
                    )
                  },
                  {
                    header: 'Date',
                    accessor: (pkg) => (
                      <span className="text-zinc-600 font-semibold text-xs">
                        {formatDate(pkg.date)}
                      </span>
                    )
                  },
                  {
                    header: 'Carrier / Logistics',
                    accessor: (pkg) => (
                      <span className="text-zinc-700 font-bold text-xs">
                        {pkg.carrier}
                      </span>
                    )
                  },
                  {
                    header: 'Status',
                    accessor: (pkg) => {
                      const isDispatched = pkg.status.includes('Dispatched');
                      return (
                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${
                          isDispatched
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-750 border-blue-200'
                        }`}>
                          {pkg.status}
                        </span>
                      );
                    }
                  }
                ]}
                data={customerPackages}
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
                title="Shipments & Delivery Challans"
                subtitle={`Official delivery challans (DC) and dispatch consignments generated for ${org.name}`}
                columns={[
                  {
                    header: 'Challan / DC No',
                    accessor: (dc) => (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                          <Truck size={14} />
                        </div>
                        <span className="font-mono font-black text-zinc-900 text-xs">
                          {dc.dc_no}
                        </span>
                      </div>
                    )
                  },
                  {
                    header: 'Sales Order No',
                    accessor: (dc) => (
                      <span className="font-mono font-bold text-xs text-[#2d8d9b]">
                        {dc.order_no}
                      </span>
                    )
                  },
                  {
                    header: 'Dispatch Date',
                    accessor: (dc) => (
                      <span className="text-zinc-600 font-bold text-xs">
                        {formatDate(dc.dispatch_date)}
                      </span>
                    )
                  },
                  {
                    header: 'Transporter / Carrier',
                    accessor: (dc) => (
                      <span className="text-zinc-800 font-bold text-xs">
                        {dc.transporter_name}
                      </span>
                    )
                  },
                  {
                    header: 'Vehicle / Tracking',
                    accessor: (dc) => (
                      <span className="font-mono text-xs text-zinc-500 font-medium">
                        {dc.vehicle_no || '—'}
                      </span>
                    )
                  },
                  {
                    header: 'Packages',
                    accessor: (dc) => (
                      <span className="px-2.5 py-1 text-[10px] font-black bg-zinc-100 text-zinc-700 rounded-lg border border-zinc-200">
                        {dc.total_packages || 1} Box(es)
                      </span>
                    )
                  },
                  {
                    header: 'Status',
                    accessor: (dc) => {
                      const st = dc.status || 'Dispatched';
                      const isDelivered = st.toLowerCase() === 'delivered';
                      return (
                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${
                          isDelivered
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {st}
                        </span>
                      );
                    }
                  },
                  {
                    header: 'Notes',
                    accessor: (dc) => (
                      <span className="text-xs text-zinc-400 font-medium truncate max-w-xs block" title={dc.notes}>
                        {dc.notes || '—'}
                      </span>
                    )
                  }
                ]}
                data={customerShipments}
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
                title="Proforma Invoices (PI)"
                subtitle={`Advance commercial quotes & proforma billing estimates for ${org.name}`}
                columns={[
                  {
                    header: 'Proforma No (PI)',
                    accessor: (pi) => (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProForma({
                            ...pi,
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
                          setIsProFormaModalOpen(true);
                        }}
                        className="font-mono font-black text-[#991b1b] hover:underline cursor-pointer border-none bg-transparent p-0 outline-none text-left flex items-center gap-1.5"
                        title="Click to view official Proforma Invoice"
                      >
                        <FileSpreadsheet size={14} className="text-[#991b1b] shrink-0" />
                        <span>{pi.pi_no}</span>
                      </button>
                    )
                  },
                  {
                    header: 'Order No',
                    accessor: (pi) => (
                      <span className="font-mono text-xs font-bold text-zinc-800">
                        {pi.order_no || '—'}
                      </span>
                    )
                  },
                  {
                    header: 'Issue Date',
                    accessor: (pi) => (
                      <span className="text-zinc-600 font-bold text-xs">
                        {formatDate(pi.date)}
                      </span>
                    )
                  },
                  {
                    header: 'Validity',
                    accessor: (pi) => (
                      <span className="text-xs font-bold text-zinc-500">
                        {pi.validity_days} Days
                      </span>
                    )
                  },
                  {
                    header: 'Scope / Items',
                    accessor: (pi) => (
                      <span className="text-xs font-bold text-[#3a525d] truncate max-w-sm block" title={pi.title}>
                        {pi.title || 'Institutional Uniforms Specification'}
                      </span>
                    )
                  },
                  {
                    header: 'Proforma Amount',
                    accessor: (pi) => (
                      <span className="font-mono font-black text-zinc-900 text-sm">
                        ₹{parseFloat(String(pi.amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    )
                  },
                  {
                    header: 'Status',
                    accessor: (pi) => {
                      const isOrder = pi.status.includes('Order');
                      return (
                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${
                          isOrder
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {pi.status}
                        </span>
                      );
                    }
                  },
                  {
                    header: 'Actions',
                    accessor: (pi) => (
                      <Button
                        onClick={() => {
                          setSelectedProForma({
                            ...pi,
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
                          setIsProFormaModalOpen(true);
                        }}
                        variant="secondary"
                        className="h-8 px-3 rounded-lg border border-zinc-200 text-[10px] font-black uppercase text-[#991b1b] hover:bg-[#991b1b] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Eye size={12} /> View PI
                      </Button>
                    )
                  }
                ]}
                data={customerProFormaInvoices}
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
                title="Customer Tax Invoices"
                subtitle={`Commercial tax invoices and retail cash registers billed to ${org.name}`}
                columns={[
                  {
                    header: 'Invoice No',
                    accessor: (inv: any) => (
                      <button
                        type="button"
                        onClick={() => {
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
                        className="flex items-center gap-2 hover:opacity-85 transition cursor-pointer text-left border-none bg-transparent p-0 outline-none"
                        title="Click to view official Tax Invoice (GST)"
                      >
                        <div className="w-7 h-7 rounded-lg bg-teal-50 text-[#2d8d9b] border border-teal-100 flex items-center justify-center shrink-0">
                          <ReceiptText size={14} />
                        </div>
                        <span className="font-mono font-black text-[#991b1b] hover:underline text-xs">
                          {inv.invoice_no}
                        </span>
                      </button>
                    )
                  },
                  {
                    header: 'Order No',
                    accessor: (inv: any) => (
                      <span className="font-mono font-bold text-xs text-zinc-800">
                        {inv.order_no || '—'}
                      </span>
                    )
                  },
                  {
                    header: 'Invoice Date',
                    accessor: (inv: any) => (
                      <span className="text-zinc-600 font-bold text-xs">
                        {formatDate(inv.invoice_date || inv.created_at)}
                      </span>
                    )
                  },
                  {
                    header: 'Due Date',
                    accessor: (inv: any) => (
                      <span className="text-zinc-500 font-semibold text-xs">
                        {formatDate(inv.due_date)}
                      </span>
                    )
                  },
                  {
                    header: 'Sale Type',
                    accessor: (inv: any) => (
                      <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-lg border bg-zinc-50 text-zinc-600 border-zinc-200">
                        {inv.sale_type === 'retail' ? 'Retail' : 'Bulk Order'}
                      </span>
                    )
                  },
                  {
                    header: 'Total Amount',
                    accessor: (inv: any) => (
                      <span className="font-mono font-black text-zinc-900 text-xs">
                        ₹{parseFloat(String(inv.total_amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    )
                  },
                  {
                    header: 'Paid Amount',
                    accessor: (inv: any) => (
                      <span className="font-mono font-black text-emerald-600 text-xs">
                        ₹{parseFloat(String(inv.paid_amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    )
                  },
                  {
                    header: 'Balance Due',
                    accessor: (inv: any) => {
                      const bal = parseFloat(String(inv.total_amount || 0)) - parseFloat(String(inv.paid_amount || 0));
                      return (
                        <span className={`font-mono font-black text-xs ${bal > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          ₹{Math.max(0, bal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      );
                    }
                  },
                  {
                    header: 'Payment Status',
                    accessor: (inv: any) => {
                      const st = inv.payment_status || 'Unpaid';
                      const isPaid = st.toLowerCase() === 'paid';
                      const isPartial = st.toLowerCase() === 'partially paid';
                      return (
                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${
                          isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          isPartial ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {st}
                        </span>
                      );
                    }
                  },
                  {
                    header: 'Actions',
                    accessor: (inv: any) => (
                      <Button
                        onClick={() => {
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
                        variant="secondary"
                        className="h-8 px-3 rounded-lg border border-zinc-200 text-[10px] font-black uppercase text-[#991b1b] hover:bg-[#991b1b] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Eye size={12} /> View Invoice
                      </Button>
                    )
                  }
                ]}
                data={customerInvoices}
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
                columns={[
                  {
                    header: 'Expense Ref',
                    className: 'whitespace-nowrap shrink-0',
                    accessor: (exp) => (
                      <span className="font-mono font-black text-zinc-800 text-xs whitespace-nowrap">
                        {exp.expense_ref}
                      </span>
                    )
                  },
                  {
                    header: 'Date',
                    className: 'whitespace-nowrap shrink-0',
                    accessor: (exp) => (
                      <span className="text-zinc-600 font-bold text-xs whitespace-nowrap">
                        {formatDate(exp.date)}
                      </span>
                    )
                  },
                  {
                    header: 'Expense Category',
                    className: 'whitespace-nowrap shrink-0',
                    accessor: (exp) => (
                      <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-zinc-100 text-[#3a525d] rounded-lg border border-zinc-200 whitespace-nowrap">
                        {exp.category}
                      </span>
                    )
                  },
                  {
                    header: 'Order No',
                    className: 'whitespace-nowrap shrink-0',
                    accessor: (exp) => (
                      <span className="font-mono font-bold text-xs text-[#2d8d9b] whitespace-nowrap">
                        {exp.order_no || exp.linked_ref}
                      </span>
                    )
                  },
                  {
                    header: 'Description',
                    className: 'w-full min-w-[200px]',
                    accessor: (exp) => (
                      <span 
                        className="text-xs text-zinc-600 font-medium block truncate" 
                        title={exp.description}
                      >
                        {exp.description}
                      </span>
                    )
                  },
                  {
                    header: 'Allocated Cost',
                    className: 'whitespace-nowrap text-right shrink-0',
                    accessor: (exp) => (
                      <span className="font-mono font-black text-zinc-900 text-xs whitespace-nowrap">
                        ₹{parseFloat(String(exp.amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    )
                  },
                  {
                    header: 'Status',
                    className: 'whitespace-nowrap text-center shrink-0',
                    accessor: () => (
                      <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200 whitespace-nowrap">
                        ✓ Allocated
                      </span>
                    )
                  }
                ]}
                data={customerExpenses}
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
                {/* Floating Journal Summary Quick Action Widget on Right Side (Pops out on hover) */}
                <div
                  className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-stretch transition-transform duration-300 ease-out select-none ${
                    isJournalDrawerOpen ? 'translate-x-0' : 'translate-x-[calc(100%-46px)] hover:translate-x-0'
                  }`}
                  onMouseEnter={() => setIsJournalDrawerOpen(true)}
                  onMouseLeave={() => setIsJournalDrawerOpen(false)}
                >
                  {/* Protruding Handle on Right Edge */}
                  <button
                    type="button"
                    onClick={() => setIsJournalDrawerOpen(!isJournalDrawerOpen)}
                    className="w-[46px] bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-l-2xl py-4 px-2 flex flex-col items-center justify-center gap-2.5 shadow-[-6px_4px_25px_rgba(0,0,0,0.18)] border-y border-l border-[#2d8d9b]/40 cursor-pointer transition-all shrink-0"
                    title="Financial Journal Summary & Balances"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[#2d8d9b]">
                      <BookOpen size={16} />
                    </div>

                    <span className="[writing-mode:vertical-rl] rotate-180 text-[9px] font-black uppercase tracking-[0.2em] text-[#fce4d4] py-1">
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
                        <div className="w-8 h-8 rounded-xl bg-[#2d8d9b]/10 text-[#2d8d9b] flex items-center justify-center">
                          <BookOpen size={16} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-[#3a525d] tracking-tight">Financial Summary</h4>
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
                      {/* 1. Total Debits (Billed) */}
                      <div className="p-3.5 bg-rose-50/50 hover:bg-rose-50 rounded-2xl border border-rose-150/70 flex items-center justify-between transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                            <ArrowUpRight size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Total Debits (Billed)</p>
                            <p className="text-base font-black font-mono text-rose-700 leading-none mt-1">
                              ₹{debits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-mono">
                          Dr
                        </span>
                      </div>

                      {/* 2. Total Credits (Paid) */}
                      <div className="p-3.5 bg-emerald-50/50 hover:bg-emerald-50 rounded-2xl border border-emerald-150/70 flex items-center justify-between transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <ArrowDownLeft size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Total Credits (Paid)</p>
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
                      className="w-full h-10 rounded-xl bg-[#2d8d9b] hover:bg-[#3a525d] text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-[#2d8d9b]/20 transition-all cursor-pointer active:scale-95"
                    >
                      <Plus size={14} />
                      <span>New Journal Entry</span>
                    </button>
                  </div>
                </div>

                {/* General Journal Table */}
                <div className="bg-white rounded-[2.5rem] border border-zinc-150/50 shadow-sm p-6">
                <DataTable
                  title="General Journal"
                  subtitle={`Financial double-entry vouchers, debits (invoices), credits (receipts) & adjustments for ${org?.name}`}
                  columns={[
                    {
                      header: 'Date',
                      className: 'w-[120px] whitespace-nowrap',
                      sortValue: (j: any) => (j.date ? new Date(j.date).getTime() : 0),
                      accessor: (j: any) => (
                        <span className="text-zinc-800 font-bold text-xs">
                          {formatDate(j.date)}
                        </span>
                      )
                    },
                    {
                      header: 'Journal / Ref #',
                      className: 'w-[150px] whitespace-nowrap',
                      sortValue: (j: any) => j.journal_no || j.ref,
                      accessor: (j: any) => {
                        const Icon = j.icon || BookOpen;
                        return (
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${j.icon_bg || 'bg-zinc-50 text-zinc-600 border-zinc-200'}`}>
                              <Icon size={14} />
                            </div>
                            <span className="font-mono font-black text-zinc-900 text-xs block">
                              {j.journal_no || j.ref}
                            </span>
                          </div>
                        );
                      }
                    },
                    {
                      header: 'Journal Type',
                      className: 'w-[140px] whitespace-nowrap',
                      sortValue: (j: any) => j.category,
                      accessor: (j: any) => {
                        const isInvoice = j.category === 'Sales Invoice';
                        const isPayment = j.category === 'Customer Payment';
                        return (
                          <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${
                            isInvoice ? 'bg-blue-50 text-blue-750 border-blue-200' :
                            isPayment ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            'bg-purple-50 text-purple-700 border-purple-200'
                          }`}>
                            {j.category}
                          </span>
                        );
                      }
                    },
                    {
                      header: 'Account / Ledger',
                      className: 'w-[190px] whitespace-nowrap',
                      sortValue: (j: any) => j.account,
                      accessor: (j: any) => (
                        <div>
                          <span className="font-bold text-xs text-[#3a525d] block">
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
                      header: 'Narration / Memo',
                      className: 'min-w-[220px]',
                      sortValue: (j: any) => j.title || j.narration,
                      accessor: (j: any) => (
                        <div className="space-y-0.5">
                          {j.title && (
                            <span className="text-xs font-bold text-zinc-900 block truncate" title={j.title}>
                              {j.title}
                            </span>
                          )}
                          <p className="text-xs text-zinc-600 font-medium line-clamp-2" title={j.narration}>
                            {j.narration}
                          </p>
                          {j.order_ref && j.order_ref !== '—' && (
                            <span className="inline-block text-[9px] font-mono font-bold text-[#2d8d9b] bg-[#2d8d9b]/10 px-1.5 py-0.2 rounded">
                              {j.category === 'Manual Journal' ? `Ref: ${j.order_ref}` : `Order: ${j.order_ref}`}
                            </span>
                          )}
                        </div>
                      )
                    },
                    {
                      header: 'Debit (₹)',
                      className: 'w-[125px] whitespace-nowrap text-right',
                      sortValue: (j: any) => (j.debit || 0),
                      accessor: (j: any) => {
                        if (!j.debit || j.debit <= 0) {
                          return <span className="text-zinc-300 font-bold text-xs">—</span>;
                        }
                        return (
                          <span className="font-mono font-black text-xs text-zinc-900">
                            ₹{parseFloat(String(j.debit)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        );
                      }
                    },
                    {
                      header: 'Credit (₹)',
                      className: 'w-[125px] whitespace-nowrap text-right',
                      sortValue: (j: any) => (j.credit || 0),
                      accessor: (j: any) => {
                        if (!j.credit || j.credit <= 0) {
                          return <span className="text-zinc-300 font-bold text-xs">—</span>;
                        }
                        return (
                          <span className="font-mono font-black text-xs text-emerald-700">
                            ₹{parseFloat(String(j.credit)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        );
                      }
                    },
                    {
                      header: 'Status',
                      className: 'w-[100px] whitespace-nowrap text-center',
                      sortValue: (j: any) => j.status,
                      accessor: (j: any) => (
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-lg border bg-zinc-50 text-zinc-700 border-zinc-200">
                          ✓ {j.status || 'Posted'}
                        </span>
                      )
                    }
                  ]}
                  data={customerJournals}
                  isLoading={isLoadingLedger || isLoadingOrg}
                  searchPlaceholder="Search journals..."
                  emptyMessage="No financial journal entries recorded yet for this customer."
                  headerAction={
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={journalCategoryFilter}
                        onChange={(e) => setJournalCategoryFilter(e.target.value)}
                        className="h-10 px-3 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-[#3a525d] outline-none focus:ring-2 focus:ring-[#2d8d9b]/30 transition-all cursor-pointer shadow-2xs"
                      >
                        <option value="ALL">All Financial Journals ({customerJournals.length})</option>
                        <option value="Sales Invoice">Sales Invoices (Debits)</option>
                        <option value="Customer Payment">Customer Payments (Credits)</option>
                        <option value="Manual Journal">Manual Adjustments (JVs)</option>
                      </select>
                    </div>
                  }
                  rightAction={
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        onClick={() => setIsAddJournalModalOpen(true)}
                        className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer transition-all"
                      >
                        <Plus size={14} strokeWidth={2.5} /> Add Journal
                      </Button>
                      <Button
                        onClick={() => setActiveTab('ledger')}
                        className="h-9 px-3.5 bg-[#2d8d9b] hover:bg-[#236e7a] text-white rounded-xl font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5 shadow-sm"
                      >
                        <ReceiptText size={14} /> Customer Statement
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
                  <h3 className="text-xl md:text-2xl font-black italic tracking-tight text-[#3a525d]">
                    Customer Account Statement & Ledger
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2d8d9b] opacity-80">
                    Running Debit & Credit Balance Ledger · {org.name} ({org.customer_code || `#${org.id}`})
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {!isClientUser && (
                <Button
                  onClick={() => {
                    setInvoiceCreditPeriod(org.credit_period_days || 30);
                    setSelectedOrderIdForInvoice(null);
                    setIsInvoiceModalOpen(true);
                  }}
                  className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all"
                >
                  <Plus size={16} />
                  Create Invoice
                </Button>
              )}
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
                className="h-11 px-4 rounded-xl border border-zinc-200 text-xs font-black uppercase tracking-wider text-[#3a525d] hover:bg-zinc-50 flex items-center gap-2 shadow-sm"
              >
                <FileSpreadsheet size={15} />
                Export CSV
              </Button>
              <Button
                onClick={() => setIsPrintModalOpen(true)}
                className="h-11 px-6 rounded-xl bg-[#2d8d9b] hover:bg-[#236e7a] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#2d8d9b]/25 transition-all"
              >
                <Printer size={15} />
                Print Statement
              </Button>
            </div>
          </div>

          {/* 4 Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 1. Total Invoiced */}
            <div className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Invoiced / Orders</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
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
            <div className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Paid (Credits)</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
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
            <div className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  {(ledgerData?.summary?.outstanding_balance || 0) < 0 ? 'Customer Credit Balance' : 'Net Outstanding Balance'}
                </span>
                <div className="w-9 h-9 rounded-xl bg-[#CC9448]/15 text-[#CC9448] flex items-center justify-center">
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
            <div className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Settlement Status</span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
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

          {/* Ledger Table Container */}
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
              <div>
                <h4 className="text-base font-black text-[#3a525d] tracking-tight">Chronological Ledger Entries</h4>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">Audit breakdown of all billings, advance receipts, and balances</p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center bg-zinc-100 p-1 rounded-xl gap-1">
                {(['all', 'invoices', 'payments'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setLedgerFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      ledgerFilter === f
                        ? 'bg-white text-[#3a525d] shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    {f === 'all' ? `All (${ledgerData?.transactions?.length || 0})` : f === 'invoices' ? 'Orders & Invoices' : 'Payments Only'}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Component */}
            <DataTable<LedgerTransaction>
              columns={[
                {
                  header: 'Transaction Date',
                  accessor: (tx: LedgerTransaction) => (
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-zinc-800">
                        {formatDate(tx.date)}
                      </span>
                      <span className="text-[9px] text-zinc-400 font-medium">
                        {tx.date ? new Date(tx.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  )
                },
                {
                  header: 'Type & Reference',
                  accessor: (tx: LedgerTransaction) => (
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
                  )
                },
                {
                  header: 'Description & Terms',
                  accessor: (tx: LedgerTransaction) => (
                    <div className="flex flex-col max-w-[280px]">
                      <span className="text-xs font-semibold text-zinc-700 truncate">{tx.description}</span>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-bold text-[#2d8d9b] uppercase tracking-wider">{tx.order_ref}</span>
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
                  )
                },
                {
                  header: 'Debit (+)',
                  accessor: (tx: LedgerTransaction) => (
                    <span className={`font-mono text-xs font-black ${tx.debit > 0 ? 'text-zinc-900' : 'text-zinc-300'}`}>
                      {tx.debit > 0 ? `₹${parseFloat(String(tx.debit)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </span>
                  )
                },
                {
                  header: 'Credit (-)',
                  accessor: (tx: LedgerTransaction) => (
                    <span className={`font-mono text-xs font-black ${tx.credit > 0 ? 'text-emerald-600' : 'text-zinc-300'}`}>
                      {tx.credit > 0 ? `₹${parseFloat(String(tx.credit)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </span>
                  )
                },
                {
                  header: 'Running Balance',
                  accessor: (tx: LedgerTransaction) => (
                    <div className="flex items-center gap-1.5">
                      <span className={`font-mono text-xs font-black px-2.5 py-1 rounded-lg ${
                        tx.running_balance > 0
                          ? 'bg-rose-50 text-rose-700 border border-rose-100'
                          : tx.running_balance === 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-blue-50 text-blue-700 border border-blue-100'
                      }`}>
                        ₹{parseFloat(String(tx.running_balance)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )
                },
                {
                  header: 'Status & Due Aging',
                  accessor: (tx: LedgerTransaction) => {
                    if (tx.type === 'INVOICE') {
                      if (tx.status === 'Fully Paid' || tx.status === 'Paid' || tx.due_status === 'Paid') {
                        return (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200">
                            ✓ Paid
                          </span>
                        );
                      }
                      if (tx.due_status === 'Due' || tx.is_due_today) {
                        return (
                          <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border bg-amber-100 text-amber-900 border-amber-300 animate-pulse flex items-center gap-1">
                            <span>⚠️</span> Due Today (Last Day)
                          </span>
                        );
                      }
                      if (tx.due_status === 'Overdue' || tx.is_overdue) {
                        return (
                          <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border bg-rose-100 text-rose-900 border-rose-300 flex items-center gap-1 font-mono">
                            <span>🚨</span> {tx.due_label || 'Overdue'}
                          </span>
                        );
                      }
                      return (
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-lg border bg-blue-50 text-blue-700 border-blue-200">
                          {tx.due_label || 'Active Credit'}
                        </span>
                      );
                    }
                    return (
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-lg border ${
                        tx.status === 'Fully Paid' || tx.status === 'Received' || tx.status === 'Settled'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : tx.status === 'Partially Paid'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {tx.status}
                      </span>
                    );
                  }
                }
              ]}
              data={(ledgerData?.transactions || []).filter((tx: any) => {
                if (ledgerFilter === 'invoices') return tx.type === 'INVOICE' || tx.type === 'ORDER';
                if (ledgerFilter === 'payments') return tx.type === 'PAYMENT';
                return true;
              })}
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
                <ReceiptText className="text-[#2d8d9b]" size={24} />
                <div>
                  <h3 className="text-xl font-black text-zinc-900">Print Customer Account Statement</h3>
                  <p className="text-xs text-zinc-500 font-medium">Official statement for {org.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => window.print()}
                  className="h-10 px-5 rounded-xl bg-[#2d8d9b] hover:bg-[#236e7a] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2"
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
              <div className="grid grid-cols-2 gap-6 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                <div>
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Statement For (Client)</h4>
                  <p className="text-base font-black text-zinc-900">{org.name}</p>
                  <p className="text-xs text-zinc-600 font-medium mt-0.5">{org.address || 'Address not registered'}</p>
                  <p className="text-xs text-zinc-500 font-mono mt-1">Customer Code: {org.customer_code || `#${org.id}`} · Credit Terms: <strong>{org.credit_period_days || 30} Days</strong></p>
                </div>
                <div className="text-right flex flex-col justify-between">
                  <div>
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Net Balance Due</h4>
                    <p className={`text-2xl font-black ${(ledgerData?.summary?.outstanding_balance || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ₹{parseFloat(ledgerData?.summary?.outstanding_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Status: {ledgerData?.summary?.settlement_status || 'Settled'}
                  </p>
                </div>
              </div>

              {/* Statement Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-zinc-900 text-zinc-600 uppercase text-[9px] font-black tracking-wider">
                      <th className="py-2.5 px-2">Date</th>
                      <th className="py-2.5 px-2">Type / Ref</th>
                      <th className="py-2.5 px-2">Description</th>
                      <th className="py-2.5 px-2 text-right">Debit (+)</th>
                      <th className="py-2.5 px-2 text-right">Credit (-)</th>
                      <th className="py-2.5 px-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {(ledgerData?.transactions || []).map((tx: any) => (
                      <tr key={tx.id} className="text-zinc-800">
                        <td className="py-2 px-2 font-medium whitespace-nowrap">
                          {formatDate(tx.date)}
                        </td>
                        <td className="py-2 px-2 font-mono font-bold whitespace-nowrap">{tx.reference_no}</td>
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
                          ₹{Number(tx.running_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-zinc-900 font-bold bg-zinc-50">
                      <td colSpan={3} className="py-2.5 px-2 uppercase text-[10px] tracking-wider">Totals</td>
                      <td className="py-2.5 px-2 text-right font-mono">
                        ₹{Number(ledgerData?.summary?.total_invoiced || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-emerald-700">
                        ₹{Number(ledgerData?.summary?.total_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-black">
                        ₹{Number(ledgerData?.summary?.outstanding_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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


      {/* Shared Modals */}
      <ConfirmModal
        isOpen={deleteDeptConfirm.isOpen}
        title="Delete Department?"
        message="This will permanently remove this department group. This action cannot be undone."
        onConfirm={handleConfirmedDeleteDept}
        onCancel={() => setDeleteDeptConfirm({ isOpen: false, id: null })}
        confirmLabel="Yes, Delete Department"
        variant="danger"
      />

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
            <div className="bg-gradient-to-r from-[#2d8d9b] to-[#3a525d] p-6 text-white flex items-center justify-between">
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
                  <ReceiptText size={16} className="text-[#2d8d9b]" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#3a525d]">
                    1. GST & Commercial Tax Identification
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
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
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-mono font-bold text-[#3a525d] focus:outline-none focus:border-[#2d8d9b] uppercase"
                    />
                    <p className="text-[10px] text-zinc-400 font-medium">
                      Entering GSTIN automatically sets this client to B2B and extracts the PAN.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                      Legal Business / Trade Name
                    </label>
                    <input
                      type="text"
                      value={gstDeliveryForm.legal_name}
                      onChange={(e) => setGstDeliveryForm(prev => ({ ...prev, legal_name: e.target.value }))}
                      placeholder={org?.name || 'Legal Company Name'}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-[#3a525d] focus:outline-none focus:border-[#2d8d9b]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                      PAN Number (10 Digits)
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={gstDeliveryForm.pan_number}
                      onChange={(e) => setGstDeliveryForm(prev => ({ ...prev, pan_number: e.target.value.toUpperCase().trim() }))}
                      placeholder="e.g. AAPFU0939F"
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-mono font-bold text-[#3a525d] focus:outline-none focus:border-[#2d8d9b] uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Delivery Address */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Truck size={16} className="text-[#2d8d9b]" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#3a525d]">
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
                    className="text-[10px] font-black uppercase text-[#2d8d9b] hover:underline bg-[#2d8d9b]/10 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Copy Billing Address
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                      Street / Campus / Warehouse Delivery Address
                    </label>
                    <input
                      type="text"
                      value={gstDeliveryForm.delivery_address}
                      onChange={(e) => setGstDeliveryForm(prev => ({ ...prev, delivery_address: e.target.value }))}
                      placeholder="e.g. Building 4B, Goods Delivery Gate 2"
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-[#3a525d] focus:outline-none focus:border-[#2d8d9b]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                        Delivery City
                      </label>
                      <input
                        type="text"
                        value={gstDeliveryForm.delivery_city}
                        onChange={(e) => setGstDeliveryForm(prev => ({ ...prev, delivery_city: e.target.value }))}
                        placeholder="e.g. Mumbai, Bengaluru"
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-[#3a525d] focus:outline-none focus:border-[#2d8d9b]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                        Delivery State
                      </label>
                      <input
                        type="text"
                        value={gstDeliveryForm.delivery_state}
                        onChange={(e) => setGstDeliveryForm(prev => ({ ...prev, delivery_state: e.target.value }))}
                        placeholder="e.g. Maharashtra, Karnataka"
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-[#3a525d] focus:outline-none focus:border-[#2d8d9b]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                        Delivery PIN Code
                      </label>
                      <input
                        type="text"
                        value={gstDeliveryForm.delivery_pincode}
                        onChange={(e) => setGstDeliveryForm(prev => ({ ...prev, delivery_pincode: e.target.value }))}
                        placeholder="e.g. 400001"
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-mono font-bold text-[#3a525d] focus:outline-none focus:border-[#2d8d9b]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">
                        Delivery Country
                      </label>
                      <input
                        type="text"
                        value={gstDeliveryForm.delivery_country}
                        onChange={(e) => setGstDeliveryForm(prev => ({ ...prev, delivery_country: e.target.value }))}
                        placeholder="India"
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-[#3a525d] focus:outline-none focus:border-[#2d8d9b]"
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
                  className="px-6 py-2.5 rounded-xl bg-[#2d8d9b] hover:bg-[#3a525d] text-white text-xs font-black uppercase tracking-wider shadow-md"
                >
                  {isSavingGstDelivery ? 'Saving...' : 'Save GST & Delivery Details'}
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
          <div className="relative w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl p-6 md:p-8 my-8 border border-zinc-100 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-5 border-b border-zinc-150">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#2d8d9b]/10 text-[#2d8d9b] flex items-center justify-center">
                  <ReceiptText size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-zinc-900 italic tracking-tight">Generate Commercial Invoice</h3>
                  <p className="text-xs text-zinc-500 font-medium">
                    {org.name} ({org.customer_code || `#${org.id}`}) · Default Credit Period: <strong className="text-[#2d8d9b]">{org.credit_period_days || 30} Days</strong>
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

            {/* Sale Type Selector (Bulk Order vs Retail Sale) */}
            <div className="mt-5 p-1.5 bg-zinc-100 rounded-2xl flex gap-1">
              <button
                type="button"
                onClick={() => setInvoiceType('bulk')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border-none ${
                  invoiceType === 'bulk'
                    ? 'bg-white text-[#3a525d] shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 bg-transparent'
                }`}
              >
                <Package size={16} className={invoiceType === 'bulk' ? 'text-[#2d8d9b]' : 'text-zinc-400'} />
                Bulk Order (From Sales Order)
              </button>
              <button
                type="button"
                onClick={() => setInvoiceType('retail')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border-none ${
                  invoiceType === 'retail'
                    ? 'bg-white text-[#3a525d] shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 bg-transparent'
                }`}
              >
                <ReceiptText size={16} className={invoiceType === 'retail' ? 'text-[#2d8d9b]' : 'text-zinc-400'} />
                Retail Sale (Manual Invoicing)
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-5 mt-5">
              {/* Credit Terms & Dates Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-teal-50/40 border border-teal-100">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-600 block mb-1">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 focus:outline-none focus:border-[#2d8d9b]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#2d8d9b] block mb-1">
                    Credit Period (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    required
                    value={invoiceCreditPeriod}
                    onChange={(e) => setInvoiceCreditPeriod(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2.5 rounded-xl border border-teal-300 bg-white text-xs font-black text-zinc-800 focus:outline-none focus:border-[#2d8d9b]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-600 block mb-1">
                    Calculated Due Date
                  </label>
                  <div className="px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-xs font-mono font-black text-[#2d8d9b] flex items-center gap-1.5">
                    <Clock size={13} />
                    {formatDate(getCalculatedDueDate(invoiceDate, invoiceCreditPeriod))}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium -mt-2 px-1">
                * Rule: The credit period extends {invoiceCreditPeriod} days from invoice date. On the last day ({formatDate(getCalculatedDueDate(invoiceDate, invoiceCreditPeriod))}), the invoice is marked as <strong className="text-amber-600">Due</strong>. The next day onwards, it becomes <strong className="text-rose-600">Overdue</strong>.
              </p>

              {/* Bulk Order Selection Mode */}
              {invoiceType === 'bulk' && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-600 block">
                    Select Confirmed Sales Order *
                  </label>
                  {(orgDetails?.orders || []).length > 0 ? (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {(orgDetails?.orders || []).map((order: any) => {
                        const isSelected = selectedOrderIdForInvoice === order.id;
                        const quote = order.quotations;
                        return (
                          <div
                            key={order.id}
                            onClick={() => setSelectedOrderIdForInvoice(order.id)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-[#2d8d9b]/10 border-[#2d8d9b] shadow-sm'
                                : 'bg-white border-zinc-200 hover:border-zinc-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                isSelected ? 'bg-[#2d8d9b] border-[#2d8d9b] text-white' : 'border-zinc-300'
                              }`}>
                                {isSelected && <Check size={12} strokeWidth={4} />}
                              </div>
                              <div>
                                <p className="text-xs font-black text-zinc-900 font-mono">{order.order_no}</p>
                                <p className="text-[11px] font-semibold text-zinc-500">
                                  {quote?.title || quote?.quotation_no || 'Standard Order'} · Status: <span className="text-[#2d8d9b] font-bold">{order.status}</span>
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono text-xs font-black text-zinc-900">
                                ₹{parseFloat(quote?.final_quote_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              <p className="text-[9px] text-zinc-400 font-medium">{formatDate(order.created_at)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-200 text-center">
                      <p className="text-xs font-bold text-zinc-500">No sales orders found for this customer.</p>
                      <p className="text-[11px] text-zinc-400 mt-1">Switch to "Retail Sale (Manual Invoicing)" above to generate a direct manual invoice.</p>
                    </div>
                  )}
                </div>
              )}

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
                      className="text-[11px] font-bold text-[#2d8d9b] hover:underline flex items-center gap-1 cursor-pointer border-none bg-transparent"
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
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#2d8d9b]"
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
                  disabled={isSubmittingInvoice || (invoiceType === 'bulk' && !selectedOrderIdForInvoice)}
                  className="h-11 px-6 rounded-xl bg-[#2d8d9b] hover:bg-[#236e7a] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#2d8d9b]/25"
                >
                  {isSubmittingInvoice ? 'Generating...' : invoiceType === 'bulk' ? 'Generate Bulk Invoice' : 'Generate Retail Invoice'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedOrder(null)} />

          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-zinc-100 overflow-hidden relative animate-in zoom-in-95 duration-300 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="bg-[#2d8d9b] p-8 text-white">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Package size={24} />
                </div>
                <Button variant="secondary" onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors bg-transparent border-none shadow-none text-white">
                  <X size={20} />
                </Button>
              </div>
              <h3 className="text-2xl font-black italic">{selectedOrder.order_no}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                  Status: {selectedOrder.status}
                </p>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                  Barcode: {selectedOrder.barcode}
                </p>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {/* Order Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Quotation Title</label>
                  <p className="text-sm font-semibold text-[#3a525d]">{selectedOrder.quotations?.title || 'Untitled Quotation'}</p>
                </div>
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Total Value</label>
                  <p className="text-sm font-semibold text-[#3a525d]">₹{parseFloat(selectedOrder.quotations?.final_quote_value || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-3">Order Items</h4>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item: any) => (
                    <div key={item.id} className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-[#3a525d]">{item.product_types?.name || 'Item'}</p>
                        <p className="text-xs font-medium text-zinc-450 mt-1">Quantity: {item.quantity} units</p>
                      </div>
                      {item.size_breakdown && Object.keys(item.size_breakdown).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 justify-end max-w-[200px]">
                          {Object.entries(item.size_breakdown).map(([size, qty]: any) => (
                            <span key={size} className="px-2 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-650 rounded-lg text-[10px] font-bold">
                              {size}: {qty}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {(!selectedOrder.items || selectedOrder.items.length === 0) && (
                    <p className="text-xs font-medium text-zinc-400">No items listed for this order.</p>
                  )}
                </div>
              </div>

              {/* Order Notes */}
              {selectedOrder.order_notes && (
                <div className="p-5 bg-yellow-50/50 border border-yellow-100 rounded-2xl">
                  <label className="text-[9px] font-black text-yellow-800/60 uppercase tracking-widest block mb-2">Order Notes</label>
                  <p className="text-xs font-semibold text-yellow-900 leading-relaxed whitespace-pre-wrap">{selectedOrder.order_notes}</p>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-zinc-100">
                <Button variant="outline" onClick={() => setSelectedOrder(null)} className="h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest text-zinc-450">
                  Close Order Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            <div className="bg-gradient-to-r from-[#2d8d9b] to-[#3a525d] px-8 py-5 text-white flex items-center justify-between shrink-0">
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
      <CustomJournalModal
        isOpen={isAddJournalModalOpen}
        onClose={() => setIsAddJournalModalOpen(false)}
        onSave={handleSaveCustomJournal}
        customerName={org?.name}
        customerId={org?.id}
      />

      {/* First Custom Department Migration / Confirmation Modal */}
      {firstDeptMigrationModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#2d8d9b] to-[#3a525d] p-6 text-white flex items-center justify-between">
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
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-start gap-3.5">
                  <CheckCircle2 size={22} className="text-[#2d8d9b] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-[#3a525d]">
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
                      ? 'border-[#2d8d9b] bg-[#2d8d9b]/5 shadow-sm'
                      : 'border-zinc-200 hover:border-zinc-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="migrationAction"
                      checked={firstDeptMigrationModal.selectedAction === 'migrate_and_delete'}
                      onChange={() => setFirstDeptMigrationModal(prev => ({ ...prev, selectedAction: 'migrate_and_delete' }))}
                      className="mt-1 accent-[#2d8d9b] cursor-pointer"
                    />
                    <div className="flex-1 pr-16">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-[#3a525d]">
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
                  <span className="absolute top-3.5 right-3.5 px-2 py-0.5 bg-[#2d8d9b] text-white rounded-md text-[9px] font-black uppercase tracking-wider">
                    Recommended
                  </span>
                </div>

                {/* Option 2: Keep Both */}
                <div
                  onClick={() => setFirstDeptMigrationModal(prev => ({ ...prev, selectedAction: 'keep_both' }))}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    firstDeptMigrationModal.selectedAction === 'keep_both'
                      ? 'border-[#2d8d9b] bg-[#2d8d9b]/5 shadow-sm'
                      : 'border-zinc-200 hover:border-zinc-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="migrationAction"
                      checked={firstDeptMigrationModal.selectedAction === 'keep_both'}
                      onChange={() => setFirstDeptMigrationModal(prev => ({ ...prev, selectedAction: 'keep_both' }))}
                      className="mt-1 accent-[#2d8d9b] cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-black text-[#3a525d]">
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
                        ? 'border-[#2d8d9b] bg-[#2d8d9b]/5 shadow-sm'
                        : 'border-zinc-200 hover:border-zinc-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="migrationAction"
                        checked={firstDeptMigrationModal.selectedAction === 'migrate_and_keep'}
                        onChange={() => setFirstDeptMigrationModal(prev => ({ ...prev, selectedAction: 'migrate_and_keep' }))}
                        className="mt-1 accent-[#2d8d9b] cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-black text-[#3a525d]">
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
                className="px-6 h-11 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#2d8d9b] hover:bg-[#3a525d] text-white shadow-md flex items-center gap-2 cursor-pointer"
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
