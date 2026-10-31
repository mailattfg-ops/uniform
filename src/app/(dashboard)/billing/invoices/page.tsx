'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import {
  CreditCard,
  Plus,
  Scan,
  Trash2,
  Eye,
  FileText,
  Search,
  Building2,
  Calendar,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  Receipt,
  ShoppingBag,
  ArrowRight,
  ShieldAlert,
  Layers,
  FileCheck
} from 'lucide-react';
import toast from '@/components/ui/toast';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { FilterDropdown } from '@/components/ui/FilterDropdown';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { DashboardCardGroup } from '@/components/dashboard/DashboardCardGroup';
import TaxInvoiceModal from '@/components/documents/TaxInvoiceModal';

interface InvoiceItem {
  id?: number;
  item_description: string;
  design_number?: string;
  barcode?: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total_price?: number;
}

interface Invoice {
  id: number;
  invoice_no: string;
  order_id?: number | null;
  order_no?: string | null;
  quotation_id?: number | null;
  organization_id?: number | null;
  customer_name: string;
  customer_type: string;
  sale_type?: string;
  is_tax_inclusive: boolean;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  paid_amount?: number;
  payment_status: string;
  credit_period_days?: number;
  invoice_date?: string;
  due_date?: string;
  due_status?: string;
  days_overdue?: number;
  status_message?: string;
  created_at: string;
  invoice_items?: InvoiceItem[];
  orders?: { id: number; order_no: string; status?: string };
  customer?: any;
  organizations?: any;
}

interface SalesOrderOption {
  id: number;
  order_no: string;
  status: string;
  quotation_id?: number;
  quotations?: {
    id: number;
    quotation_no: string;
    title?: string;
    final_quote_value: number;
    organization_id: number;
    is_tax_inclusive?: boolean;
    tax_rate?: number;
    organizations?: {
      id: number;
      name: string;
      credit_period_days?: number;
      gst_number?: string;
      city?: string;
      state?: string;
    };
  };
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<SalesOrderOption[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState<'order' | 'retail'>('order');
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<any | null>(null);
  const [showTaxInvoiceModal, setShowTaxInvoiceModal] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Against Sales Order Form State
  const [selectedOrderId, setSelectedOrderId] = useState<number | ''>('');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [creditPeriodDays, setCreditPeriodDays] = useState<number>(30);
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [orderInvoiceNotes, setOrderInvoiceNotes] = useState<string>('');
  const [isSubmittingOrderInvoice, setIsSubmittingOrderInvoice] = useState(false);

  // Counter Retail Form State
  const [customerName, setCustomerName] = useState('');
  const [customerType, setCustomerType] = useState('Business');
  const [isTaxInclusive, setIsTaxInclusive] = useState(true);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [retailItems, setRetailItems] = useState<InvoiceItem[]>([
    { item_description: 'Standard Uniform Set', design_number: 'DNS-001', barcode: 'BRC-1001', quantity: 1, unit_price: 1500, tax_rate: 5 }
  ]);
  const [taxMasters, setTaxMasters] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmittingRetail, setIsSubmittingRetail] = useState(false);

  // Fetch all invoices
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/invoices');
      setInvoices(res.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  // Fetch sales orders for order-based invoicing
  const fetchSalesOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await api.get('/orders');
      const orderList = Array.isArray(res.data) ? res.data : [];
      setOrders(orderList);
    } catch (err: any) {
      console.warn('Could not load sales orders:', err.message);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch tax masters
  const fetchTaxMasters = async () => {
    try {
      const res = await api.get('/taxes');
      setTaxMasters(res.data || []);
    } catch (err) {
      setTaxMasters([
        { id: 1, name: 'GST 5%', rate: 5 },
        { id: 2, name: 'GST 12%', rate: 12 },
        { id: 3, name: 'GST 18%', rate: 18 },
        { id: 4, name: '0% Exempt', rate: 0 }
      ]);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchSalesOrders();
    fetchTaxMasters();
  }, []);

  // Selected order details
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find(o => o.id === Number(selectedOrderId)) || null;
  }, [selectedOrderId, orders]);

  // When selected order changes, auto-populate credit period
  useEffect(() => {
    if (selectedOrder) {
      const orgCreditPeriod = selectedOrder.quotations?.organizations?.credit_period_days;
      if (orgCreditPeriod) {
        setCreditPeriodDays(Number(orgCreditPeriod));
      } else {
        setCreditPeriodDays(30);
      }
      setOrderInvoiceNotes(`Tax invoice for Sales Order ${selectedOrder.order_no}`);
    }
  }, [selectedOrder]);

  // Filtered orders for selector
  const filteredOrders = useMemo(() => {
    if (!orderSearchTerm.trim()) return orders;
    const term = orderSearchTerm.toLowerCase();
    return orders.filter(o => {
      const orderNo = (o.order_no || '').toLowerCase();
      const orgName = (o.quotations?.organizations?.name || '').toLowerCase();
      const qNo = (o.quotations?.quotation_no || '').toLowerCase();
      return orderNo.includes(term) || orgName.includes(term) || qNo.includes(term);
    });
  }, [orders, orderSearchTerm]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // Search
      const search = searchTerm.toLowerCase();
      const matchSearch =
        !search ||
        (inv.invoice_no || '').toLowerCase().includes(search) ||
        (inv.customer_name || '').toLowerCase().includes(search) ||
        (inv.order_no || inv.orders?.order_no || '').toLowerCase().includes(search);

      // Status
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'OVERDUE' && inv.due_status === 'Overdue') ||
        (statusFilter === 'PAID' && (inv.payment_status === 'Fully Paid' || inv.payment_status === 'Paid')) ||
        (statusFilter === 'UNPAID' && inv.payment_status === 'Unpaid') ||
        (statusFilter === 'PARTIAL' && inv.payment_status === 'Partially Paid');

      // Type
      const matchType =
        typeFilter === 'ALL' ||
        (typeFilter === 'BULK' && (inv.sale_type === 'bulk' || inv.order_id || inv.orders?.order_no)) ||
        (typeFilter === 'RETAIL' && (inv.sale_type === 'retail' || (!inv.order_id && !inv.orders?.order_no)));

      return matchSearch && matchStatus && matchType;
    });
  }, [invoices, searchTerm, statusFilter, typeFilter]);

  // Dashboard Summary Metrics
  const stats = useMemo(() => {
    const totalInvoices = invoices.length;
    const bulkInvoices = invoices.filter(i => i.sale_type === 'bulk' || i.order_id || i.orders?.order_no).length;
    const retailInvoices = invoices.filter(i => i.sale_type === 'retail' || (!i.order_id && !i.orders?.order_no)).length;
    const totalValue = invoices.reduce((s, i) => s + parseFloat(String(i.total_amount || 0)), 0);
    const totalPaid = invoices.reduce((s, i) => s + parseFloat(String(i.paid_amount || (i.payment_status === 'Fully Paid' ? i.total_amount : 0))), 0);
    const overdueInvoices = invoices.filter(i => i.due_status === 'Overdue');
    const overdueCount = overdueInvoices.length;
    const overdueAmount = overdueInvoices.reduce((s, i) => {
      const bal = Math.max(0, parseFloat(String(i.total_amount || 0)) - parseFloat(String(i.paid_amount || 0)));
      return s + bal;
    }, 0);
    const receivables = Math.max(0, totalValue - totalPaid);

    return {
      totalInvoices,
      bulkInvoices,
      retailInvoices,
      totalValue,
      totalPaid,
      receivables,
      overdueCount,
      overdueAmount
    };
  }, [invoices]);

  // Handle barcode item add
  const handleAddItemByBarcode = async () => {
    if (!barcodeInput.trim()) return;
    const code = barcodeInput.trim();
    setIsScanning(true);
    try {
      const res = await api.get('/inventory/lookup', { params: { code } });
      const info = res.data;
      const defaultRate = taxMasters.find(t => t.is_default)?.rate ?? 5;

      setRetailItems([
        ...retailItems,
        {
          item_description: info.item_description || `Scanned Item (${code})`,
          design_number: info.design_number || code,
          barcode: info.barcode || code,
          quantity: 1,
          unit_price: info.unit_price || 850,
          tax_rate: info.tax_rate !== undefined ? info.tax_rate : defaultRate
        }
      ]);
      toast.success(info.found ? `Added: ${info.item_description}` : `Added barcode item: ${code}`);
      setBarcodeInput('');
    } catch {
      setRetailItems([
        ...retailItems,
        {
          item_description: `Scanned Item (${code})`,
          design_number: code,
          barcode: code,
          quantity: 1,
          unit_price: 850,
          tax_rate: 5
        }
      ]);
      setBarcodeInput('');
    } finally {
      setIsScanning(false);
    }
  };

  // Submit Invoice Against Sales Order
  const handleCreateOrderInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      toast.error('Please select a confirmed Sales Order.');
      return;
    }

    setIsSubmittingOrderInvoice(true);
    const loadingToast = toast.loading('Generating official GST Tax Invoice from Sales Order...');
    try {
      const res = await api.post('/invoices/from-order', {
        order_id: Number(selectedOrderId),
        credit_period_days: creditPeriodDays,
        invoice_date: invoiceDate,
        notes: orderInvoiceNotes
      });

      toast.success('Official GST Tax Invoice generated successfully!', { id: loadingToast });
      setShowCreateModal(false);
      setSelectedOrderId('');
      setOrderInvoiceNotes('');
      fetchInvoices();

      // Immediately open the generated GST Tax Invoice for preview & printing
      if (res.data) {
        setSelectedInvoiceForModal(res.data);
        setShowTaxInvoiceModal(true);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create invoice from sales order', { id: loadingToast });
    } finally {
      setIsSubmittingOrderInvoice(false);
    }
  };

  // Submit Retail Counter Sale
  const handleCreateRetailInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error('Please enter customer name');
      return;
    }
    if (retailItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    setIsSubmittingRetail(true);
    const loadingToast = toast.loading('Creating retail counter invoice...');
    try {
      const res = await api.post('/invoices', {
        customer_name: customerName,
        customer_type: customerType,
        sale_type: 'retail',
        is_tax_inclusive: isTaxInclusive,
        items: retailItems
      });

      toast.success('Retail invoice created successfully!', { id: loadingToast });
      setShowCreateModal(false);
      setCustomerName('');
      setRetailItems([
        { item_description: 'Standard Uniform Set', design_number: 'DNS-001', barcode: 'BRC-1001', quantity: 1, unit_price: 1500, tax_rate: 5 }
      ]);
      fetchInvoices();

      if (res.data) {
        setSelectedInvoiceForModal(res.data);
        setShowTaxInvoiceModal(true);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create invoice', { id: loadingToast });
    } finally {
      setIsSubmittingRetail(false);
    }
  };

  // Delete invoice
  const handleDeleteInvoice = async (id: number) => {
    if (!confirm('Are you sure you want to delete this invoice? This action is restricted to Branch Managers.')) return;
    try {
      await api.delete(`/invoices/${id}`);
      toast.success('Invoice deleted successfully');
      fetchInvoices();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Delete restricted to Branch Manager');
    }
  };

  // Open invoice in Tax Invoice Modal
  const openTaxInvoice = (inv: Invoice) => {
    setSelectedInvoiceForModal(inv);
    setShowTaxInvoiceModal(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* ── 1. HEADER ──────────────────────────────────────────────────────── */}
      <DashboardHeader
        title="Customer Invoices"
        subtitle="Official GST tax invoices generated against confirmed sales orders, retail counter sales, and commercial receivables."
        icon={Receipt}
        badge="BILLING & INVOICING"
        category={null}
        onRefresh={fetchInvoices}
        isRefreshing={loading}
      />

      {/* ── 2. OVERDUE RECEIVABLES ALERT BANNER (IF APPLICABLE) ─────────────── */}
      {stats.overdueCount > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-[2rem] p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
              <AlertTriangle size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-rose-600 text-white">
                  Payment Overdue
                </span>
                <h3 className="text-base font-black text-rose-950">
                  {stats.overdueCount} Invoice{stats.overdueCount > 1 ? 's' : ''} Past Due Date
                </h3>
              </div>
              <p className="text-xs font-semibold text-rose-800 mt-1">
                Outstanding overdue amount:{' '}
                <span className="font-mono font-black text-rose-950">
                  {formatCurrency(stats.overdueAmount)}
                </span>{' '}
                requires commercial follow-up.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setStatusFilter('OVERDUE');
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider shadow-sm transition shrink-0"
          >
            Filter Overdue
          </button>
        </div>
      )}

      {/* ── 3. SUMMARY STAT CARDS ───────────────────────────────────────────── */}
      <DashboardCardGroup
        title="Invoicing & Receivables Telemetry"
        description="Comprehensive summary of sales order tax invoices, retail sales, and collection balances."
        targetHref="/marketing/order-placement"
        targetLabel="Manage Orders"
        columns="4"
        badge="Commercial Accounts"
      >
        <DashboardStatCard
          label="Total Invoices"
          value={loading ? '—' : stats.totalInvoices}
          subValue={`${stats.bulkInvoices} Sales Order • ${stats.retailInvoices} Counter`}
          icon={Receipt}
          variant="default"
        />
        <DashboardStatCard
          label="Sales Order Invoices"
          value={loading ? '—' : stats.bulkInvoices}
          subValue="Institutional orders billed"
          icon={ShoppingBag}
          variant="indigo"
          badge="GST Invoices"
        />
        <DashboardStatCard
          label="Total Invoiced Value"
          value={loading ? '—' : formatCurrency(stats.totalValue)}
          subValue={`Collected: ${formatCurrency(stats.totalPaid)}`}
          icon={DollarSign}
          variant="emerald"
        />
        <DashboardStatCard
          label="Outstanding Receivables"
          value={loading ? '—' : formatCurrency(stats.receivables)}
          subValue={stats.overdueCount > 0 ? `${stats.overdueCount} overdue past credit date` : 'All within credit terms'}
          icon={Clock}
          variant={stats.overdueCount > 0 ? 'rose' : 'amber'}
          badge={stats.overdueCount > 0 ? 'Overdue Alert' : 'Active Balance'}
        />
      </DashboardCardGroup>

      {/* ── 4. ACTION BAR & CONTROLS ────────────────────────────────────────── */}
      <div className="bg-white rounded-[2rem] border border-[#fce4d4] p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Status Filter */}
            <FilterDropdown
              label="Status"
              allLabel="All Statuses"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { label: '🚨 Payment Overdue', value: 'OVERDUE' },
                { label: 'Unpaid Balance', value: 'UNPAID' },
                { label: 'Partially Paid', value: 'PARTIAL' },
                { label: 'Fully Settled', value: 'PAID' }
              ]}
            />

            {/* Type Filter */}
            <FilterDropdown
              label="Sale Type"
              allLabel="All Sale Types"
              value={typeFilter}
              onChange={(val) => setTypeFilter(val)}
              options={[
                { label: 'Against Sales Order (Bulk)', value: 'BULK' },
                { label: 'Counter / OTC Sale', value: 'RETAIL' }
              ]}
            />

            <div className="relative min-w-[240px] flex-1 max-w-md ml-auto">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input
                type="text"
                placeholder="Search invoice no, customer, sales order..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold focus:outline-none focus:border-[#2d8d9b] bg-zinc-50/50"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                setCreateMode('order');
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#C82A2B] hover:bg-[#A81D1E] shadow-lg shadow-[#C82A2B]/20 text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <FileCheck size={16} />
              <span>Invoice Against Sales Order</span>
            </button>

            <button
              onClick={() => {
                setCreateMode('retail');
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 text-xs font-black uppercase tracking-wider shadow-xs transition cursor-pointer"
            >
              <Plus size={16} />
              <span>Counter Sale</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 5. INVOICES REGISTER TABLE ──────────────────────────────────────── */}
      <div className="bg-white rounded-[2rem] border border-[#fce4d4] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-[#3a525d] tracking-tight">Invoices Register</h3>
            <p className="text-xs font-semibold text-zinc-500 mt-0.5">
              Showing {filteredInvoices.length} of {invoices.length} invoices. Click an invoice number to view & print the official GST Tax Invoice.
            </p>
          </div>
          <span className="text-[11px] font-mono text-zinc-400 bg-zinc-50 px-3 py-1 rounded-lg border border-zinc-200 self-start sm:self-auto">
            Scheme: YY/MM/INV-XXXX
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#3a525d]/5 text-[#3a525d] font-black uppercase text-[10px] tracking-wider border-b border-zinc-200">
              <tr>
                <th className="px-5 py-3.5">Invoice No</th>
                <th className="px-5 py-3.5">Sales Order</th>
                <th className="px-5 py-3.5">Customer / Organization</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Invoice Date</th>
                <th className="px-5 py-3.5">Due Date</th>
                <th className="px-5 py-3.5 text-right">Total Amount</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {filteredInvoices.map(inv => {
                const linkedOrderNo = inv.order_no || inv.orders?.order_no;
                const isOverdue = inv.due_status === 'Overdue';

                return (
                  <tr key={inv.id} className="hover:bg-zinc-50/70 transition">
                    {/* Invoice No */}
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => openTaxInvoice(inv)}
                        className="font-mono font-black text-[#991b1b] hover:underline cursor-pointer border-none bg-transparent p-0 text-left text-xs flex items-center gap-1.5"
                        title="Click to view & print official GST Tax Invoice"
                      >
                        <FileText size={14} />
                        <span>{inv.invoice_no}</span>
                      </button>
                    </td>

                    {/* Sales Order Reference */}
                    <td className="px-5 py-4">
                      {linkedOrderNo ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 font-mono text-[11px] font-bold">
                          <ShoppingBag size={12} className="text-indigo-600" />
                          {linkedOrderNo}
                        </span>
                      ) : (
                        <span className="text-zinc-400 font-mono text-[11px]">— Retail</span>
                      )}
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4">
                      <p className="font-bold text-zinc-900 text-xs">{inv.customer_name}</p>
                      {inv.organizations?.gst_number && (
                        <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                          GST: {inv.organizations.gst_number}
                        </p>
                      )}
                    </td>

                    {/* Sale Type */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          inv.sale_type === 'bulk' || linkedOrderNo
                            ? 'bg-purple-100 text-purple-900'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {inv.sale_type === 'bulk' || linkedOrderNo ? 'Bulk Order' : 'Counter Sale'}
                      </span>
                    </td>

                    {/* Invoice Date */}
                    <td className="px-5 py-4 text-zinc-600 font-medium">
                      {formatDate(inv.invoice_date || inv.created_at)}
                    </td>

                    {/* Due Date & Overdue Tag */}
                    <td className="px-5 py-4">
                      {inv.due_date ? (
                        <div>
                          <p className={`font-mono text-xs ${isOverdue ? 'font-black text-rose-600' : inv.due_status === 'Due' ? 'font-black text-amber-600' : 'text-zinc-700'}`}>
                            {formatDate(inv.due_date)}
                          </p>
                          {isOverdue && (
                            <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[9px] font-black uppercase tracking-wide bg-rose-600 text-white">
                              {inv.days_overdue}d Overdue
                            </span>
                          )}
                          {inv.due_status === 'Due' && inv.payment_status !== 'Fully Paid' && inv.payment_status !== 'Paid' && (
                            <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[9px] font-black uppercase tracking-wide bg-amber-500 text-white">
                              Due Today
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>

                    {/* Total Amount */}
                    <td className="px-5 py-4 text-right">
                      <p className="font-mono font-black text-zinc-900 text-xs">
                        {formatCurrency(inv.total_amount)}
                      </p>
                      <span className="text-[10px] text-zinc-400">
                        {inv.is_tax_inclusive ? 'Tax Inclusive' : '+ GST Tax'}
                      </span>
                    </td>

                    {/* Payment Status */}
                    <td className="px-5 py-4 text-center">
                      <StatusBadge status={isOverdue ? 'Overdue' : inv.payment_status} size="sm" />
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openTaxInvoice(inv)}
                          className="p-2 text-[#991b1b] hover:text-[#7f1d1d] hover:bg-rose-50 rounded-xl transition cursor-pointer"
                          title="View & Print Official GST Tax Invoice"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(inv.id)}
                          className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                          title="Delete Invoice (Branch Manager Only)"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredInvoices.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-zinc-400">
                    <Receipt size={32} className="mx-auto mb-2 text-zinc-300" />
                    <p className="font-semibold text-sm">No invoices found matching your criteria.</p>
                    <p className="text-xs text-zinc-400 mt-1">Generate an invoice against a sales order or perform a counter sale.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 6. CREATE INVOICE MODAL (DUAL MODE) ─────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto border border-zinc-200 relative overflow-x-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D] absolute top-0 left-0" />
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div>
                <h3 className="text-xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
                  <FileText className="text-[#C82A2B]" size={22} />
                  <span>Generate Customer Invoice</span>
                </h3>
                <p className="text-xs font-semibold text-zinc-500 mt-0.5">
                  Select an existing sales order for an official GST Tax Invoice, or bill a counter OTC retail customer.
                </p>
              </div>

              {/* Mode Tabs */}
              <div className="flex bg-zinc-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCreateMode('order')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    createMode === 'order'
                      ? 'bg-[#C82A2B] text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Against Sales Order
                </button>
                <button
                  type="button"
                  onClick={() => setCreateMode('retail')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    createMode === 'retail'
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Counter Sale
                </button>
              </div>
            </div>

            {/* TAB 1: AGAINST SALES ORDER */}
            {createMode === 'order' && (
              <form onSubmit={handleCreateOrderInvoice} className="space-y-5">
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                  <ShoppingBag size={18} className="text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-black">Sales Order Tax Invoice:</strong> This will create an official GST Tax Invoice directly against the selected sales order, pulling confirmed order quantities, agreed quotation rates, and institutional credit terms.
                  </div>
                </div>

                {/* Sales Order Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-700">
                    Select Confirmed Sales Order *
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
                    <input
                      type="text"
                      placeholder="Type to filter sales orders by # or customer..."
                      value={orderSearchTerm}
                      onChange={e => setOrderSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 text-xs font-medium mb-2 bg-zinc-50"
                    />
                  </div>

                  <select
                    required
                    value={selectedOrderId}
                    onChange={e => setSelectedOrderId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-xs font-bold bg-white text-zinc-800"
                    size={5}
                  >
                    <option value="" disabled>-- Select Confirmed Sales Order --</option>
                    {filteredOrders.map(o => {
                      const orgName = o.quotations?.organizations?.name || 'Client';
                      const val = o.quotations?.final_quote_value || 0;
                      return (
                        <option key={o.id} value={o.id} className="py-1 px-2">
                          {o.order_no} · {orgName} ({formatCurrency(val)}) — [{o.status}]
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Selected Order Summary Card */}
                {selectedOrder && (
                  <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-3 animate-in fade-in duration-200 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-indigo-950 uppercase tracking-wider text-[11px]">
                        Order Profile: {selectedOrder.order_no}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-600 text-white">
                        {selectedOrder.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-zinc-700">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 block uppercase">Client Organization</span>
                        <span className="font-bold text-zinc-900">
                          {selectedOrder.quotations?.organizations?.name || 'Bulk Client'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 block uppercase">Quoted Value</span>
                        <span className="font-mono font-black text-zinc-900">
                          {formatCurrency(selectedOrder.quotations?.final_quote_value || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 block uppercase">GST Mode</span>
                        <span className="font-bold text-zinc-900">
                          {selectedOrder.quotations?.is_tax_inclusive ? 'Tax Inclusive' : `Tax Exclusive (${selectedOrder.quotations?.tax_rate || 5}%)`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Invoice Date & Credit Period */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-zinc-700 mb-1.5">
                      Invoice Issue Date
                    </label>
                    <input
                      type="date"
                      required
                      value={invoiceDate}
                      onChange={e => setInvoiceDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-xs font-semibold bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-zinc-700 mb-1.5">
                      Credit Period (Days)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="365"
                      value={creditPeriodDays}
                      onChange={e => setCreditPeriodDays(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-xs font-semibold bg-white"
                      placeholder="e.g. 30"
                    />
                    <p className="text-[10px] font-medium text-zinc-400 mt-1">
                      Due date will be automatically set to {creditPeriodDays} days from the invoice issue date.
                    </p>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-700 mb-1.5">
                    Invoice Notes / Commercial Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={orderInvoiceNotes}
                    onChange={e => setOrderInvoiceNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-zinc-200 rounded-xl text-xs font-medium bg-white"
                    placeholder="Enter any billing remarks or terms..."
                  />
                </div>

                {/* Modal Footer Actions */}
                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 text-zinc-600 hover:bg-zinc-100 rounded-xl text-xs font-bold uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingOrderInvoice || !selectedOrderId}
                    className="px-6 py-2.5 bg-[#991b1b] hover:bg-[#7f1d1d] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    <FileCheck size={16} />
                    <span>{isSubmittingOrderInvoice ? 'Generating GST Invoice...' : 'Generate GST Tax Invoice'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: COUNTER / RETAIL SALE */}
            {createMode === 'retail' && (
              <form onSubmit={handleCreateRetailInvoice} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-zinc-700 mb-1">
                      Customer Name / Walk-In *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Individual / Student Counter Sale"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2 border rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-zinc-700 mb-1">
                      Customer Category
                    </label>
                    <select
                      value={customerType}
                      onChange={e => setCustomerType(e.target.value)}
                      className="w-full px-3.5 py-2 border rounded-xl text-xs font-bold bg-white"
                    >
                      <option value="Individual">Individual Counter Customer</option>
                      <option value="Business">Institution / Organization</option>
                    </select>
                  </div>
                </div>

                {/* Tax Inclusive Toggle */}
                <div className="flex items-center gap-3 p-3 bg-zinc-50 border rounded-xl">
                  <input
                    type="checkbox"
                    id="taxToggle"
                    checked={isTaxInclusive}
                    onChange={e => setIsTaxInclusive(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                  <label htmlFor="taxToggle" className="text-xs font-bold text-zinc-700 cursor-pointer">
                    Tax Inclusive Billing (Tax already included in line unit prices)
                  </label>
                </div>

                {/* Barcode Scanner Entry */}
                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2">
                  <label className="block text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Scan className="w-4 h-4 text-indigo-600" />
                    Instant Barcode Entry (Scan or Type Barcode)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Scan or type barcode string (e.g. BRC-1001)..."
                      value={barcodeInput}
                      onChange={e => setBarcodeInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddItemByBarcode();
                        }
                      }}
                      className="flex-1 px-3 py-1.5 bg-white border rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddItemByBarcode}
                      disabled={isScanning}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Add Barcode
                    </button>
                  </div>
                </div>

                {/* Line Items List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black uppercase tracking-wider text-zinc-700">
                      Line Items
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setRetailItems([
                          ...retailItems,
                          {
                            item_description: 'Custom Apparel Item',
                            design_number: 'CUSTOM',
                            barcode: '',
                            quantity: 1,
                            unit_price: 500,
                            tax_rate: 5
                          }
                        ])
                      }
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div className="grid grid-cols-12 gap-2 text-[10px] font-black uppercase text-zinc-500 px-2">
                    <span className="col-span-5">Description</span>
                    <span className="col-span-2">Qty</span>
                    <span className="col-span-2">Price (₹)</span>
                    <span className="col-span-2">Tax Slab</span>
                    <span className="col-span-1 text-right">Total</span>
                  </div>

                  {retailItems.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-zinc-50 p-2 rounded-xl text-xs">
                      <input
                        type="text"
                        placeholder="Item description"
                        value={it.item_description}
                        onChange={e => {
                          const n = [...retailItems];
                          n[idx].item_description = e.target.value;
                          setRetailItems(n);
                        }}
                        className="col-span-5 px-2 py-1 border rounded bg-white text-xs"
                      />
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={e => {
                          const n = [...retailItems];
                          n[idx].quantity = Math.max(1, Number(e.target.value));
                          setRetailItems(n);
                        }}
                        className="col-span-2 px-2 py-1 border rounded bg-white text-center text-xs"
                      />
                      <input
                        type="number"
                        min="0"
                        value={it.unit_price}
                        onChange={e => {
                          const n = [...retailItems];
                          n[idx].unit_price = Number(e.target.value);
                          setRetailItems(n);
                        }}
                        className="col-span-2 px-2 py-1 border rounded bg-white text-right text-xs"
                      />
                      <select
                        value={it.tax_rate}
                        onChange={e => {
                          const n = [...retailItems];
                          n[idx].tax_rate = Number(e.target.value);
                          setRetailItems(n);
                        }}
                        className="col-span-2 px-1.5 py-1 border rounded bg-white text-xs"
                      >
                        {taxMasters.map(t => (
                          <option key={t.id} value={t.rate}>
                            {t.rate}% {t.name?.split('-')[0]}
                          </option>
                        ))}
                      </select>
                      <div className="col-span-1 flex items-center justify-end">
                        {retailItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setRetailItems(retailItems.filter((_, i) => i !== idx))}
                            className="text-zinc-400 hover:text-red-500 font-bold px-1"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Estimated Total */}
                  <div className="p-3 bg-zinc-100 rounded-xl space-y-1 text-xs text-zinc-700">
                    <div className="flex justify-between font-bold text-sm text-zinc-900">
                      <span>Total Amount:</span>
                      <span className="font-mono text-emerald-700 font-black">
                        ₹
                        {Math.round(
                          isTaxInclusive
                            ? retailItems.reduce((s, it) => s + it.quantity * it.unit_price, 0)
                            : retailItems.reduce(
                                (s, it) => s + it.quantity * it.unit_price + it.quantity * it.unit_price * (it.tax_rate / 100),
                                0
                              )
                        ).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 text-zinc-600 hover:bg-zinc-100 rounded-xl text-xs font-bold uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRetail}
                    className="px-6 py-2.5 bg-[#C82A2B] hover:bg-[#A81D1E] shadow-lg shadow-[#C82A2B]/20 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingRetail ? 'Generating...' : 'Generate Retail Invoice'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── 7. OFFICIAL GST TAX INVOICE MODAL (SAME STYLE AS PRO FORMA) ───── */}
      <TaxInvoiceModal
        isOpen={showTaxInvoiceModal}
        onClose={() => setShowTaxInvoiceModal(false)}
        data={selectedInvoiceForModal}
      />
    </div>
  );
}
