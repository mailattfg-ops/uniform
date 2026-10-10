'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { formatDate } from '@/lib/formatters';
import { Barcode } from '@/components/ui/Barcode';
import {
  Package,
  Plus,
  Clock,
  CheckCircle2,
  X,
  Send,
  ShieldAlert,
  ShieldCheck,
  PauseCircle,
  AlertCircle,
  AlertTriangle,
  Check,
  RefreshCw,
  Layers,
  Sliders,
  TrendingUp,
  Mail,
  Printer
} from 'lucide-react';

interface Organization {
  id: number;
  name: string;
  address?: string;
  email?: string;
  phone?: string;
}

interface Quotation {
  id: number;
  quotation_no: string;
  title: string;
  organization_id: number;
  organizations?: { name: string; address?: string };
  final_quote_value: number;
  paid_amount: number;
  payment_status: string;
  status: string;
  expected_delivery_date?: string | null;
  items?: QuotationItem[];
}

interface QuotationItem {
  id: number;
  product_type_id: number;
  product_types?: { name: string };
  product_type_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name?: string;
  main_fabric?: string;
  attachment_fabrics?: string;
}

interface Order {
  id: number;
  quotation_id: number;
  order_no: string;
  barcode: string;
  status: string; // 'Draft' | 'Held at Branch' | 'Approval Pending' | 'Corporate Accepted' | 'Corporate Rejected' | 'Corporate Hold' | 'Placed' | 'In Production' | 'Shipped' | 'Delivered' | 'Cancelled'
  corporate_action?: string; // 'Pending' | 'Accept' | 'Reject' | 'Hold'
  corporate_reason?: string;
  total_amount?: number;
  paid_amount?: number;
  submitted_to_corporate_at?: string;
  corporate_action_at?: string;
  corporate_action_by?: number;
  order_notes: string;
  created_at: string;
  updated_at: string;
  items?: QuotationItem[];
  quotations?: {
    id: number;
    quotation_no: string;
    title: string;
    final_quote_value: number;
    paid_amount: number;
    expected_delivery_date: string | null;
    organizations: Organization;
  };
}

interface PrintOrderDetails extends Order {
  items: QuotationItem[];
}

export default function OrderPlacementPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'awaiting' | 'all' | 'held' | 'pending' | 'active'>('awaiting');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modal State for Placing Order
  const [isPlaceOrderModalOpen, setIsPlaceOrderModalOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [orderNotes, setOrderNotes] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Corporate Action Modal State
  const [isCorporateModalOpen, setIsCorporateModalOpen] = useState(false);
  const [corporateOrder, setCorporateOrder] = useState<Order | null>(null);
  const [corporateDecision, setCorporateDecision] = useState<'Accept' | 'Reject' | 'Hold'>('Accept');
  const [corporateReason, setCorporateReason] = useState('');
  const [isSubmittingCorporate, setIsSubmittingCorporate] = useState(false);
  const [materialFeasibility, setMaterialFeasibility] = useState<any>(null);
  const [isLoadingFeasibility, setIsLoadingFeasibility] = useState(false);
  const [autoGeneratePO, setAutoGeneratePO] = useState(true);

  // Print Label State
  const [isPrintLabelOpen, setIsPrintLabelOpen] = useState(false);
  const [printOrder, setPrintOrder] = useState<PrintOrderDetails | null>(null);
  const [isLoadingPrintDetails, setIsLoadingPrintDetails] = useState(false);

  // Customer Notification State (PRD M5.7 & Section 5.2)
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notifyOrder, setNotifyOrder] = useState<Order | null>(null);
  const [notifyChannel, setNotifyChannel] = useState<'email' | 'link'>('email');
  const [customNotifyMsg, setCustomNotifyMsg] = useState('');
  const [isSendingNotify, setIsSendingNotify] = useState(false);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {}
    }
    fetchData();
  }, []);

  const isCorporateApprover =
    currentUser?.role === 'Admin' ||
    currentUser?.role === 'Super Admin' ||
    currentUser?.role === 'SuperAdmin' ||
    currentUser?.role === 'Corporate' ||
    currentUser?.permissions?.includes('corporate_approver') ||
    currentUser?.permissions?.includes('manage_system');

  const isBranchRole =
    currentUser?.role === 'Branch Manager' ||
    currentUser?.role === 'Branch Staff' ||
    Boolean(currentUser?.branchId);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [quotesRes, ordersRes] = await Promise.all([
        api.get('/quotations'),
        api.get('/orders')
      ]);

      const paidQuotes = quotesRes.data.filter(
        (q: Quotation) => q.status === 'Approved' && parseFloat(q.paid_amount as any) > 0
      );
      setQuotations(paidQuotes);
      setOrders(ordersRes.data || []);
    } catch (err: any) {
      toast.error('Failed to load workflow data: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  // Filter: Quotations awaiting placement (strictly exclude quotes with existing orders)
  const awaitingOrders = React.useMemo(() => {
    return quotations.filter(q => {
      const hasOrder = Boolean(
        (q as any).orders?.id ||
        (Array.isArray((q as any).orders) && (q as any).orders.length > 0) ||
        orders.some(o => o.quotation_id === q.id)
      );
      return !hasOrder;
    });
  }, [quotations, orders]);

  // Tabbed datasets
  const heldOrders = React.useMemo(() => {
    return orders.filter(o => o.status === 'Held at Branch' || o.status === 'Draft' || o.status === 'Corporate Rejected');
  }, [orders]);

  const pendingOrders = React.useMemo(() => {
    return orders.filter(o => o.status === 'Approval Pending' || o.status === 'Corporate Hold');
  }, [orders]);

  const activeProductionOrders = React.useMemo(() => {
    return orders.filter(o =>
      ['Corporate Accepted', 'Placed', 'In Production', 'Shipped', 'Delivered'].includes(o.status)
    );
  }, [orders]);

  const displayedOrders = React.useMemo(() => {
    switch (activeTab) {
      case 'held':
        return heldOrders;
      case 'pending':
        return pendingOrders;
      case 'active':
        return activeProductionOrders;
      default:
        return orders;
    }
  }, [activeTab, orders, heldOrders, pendingOrders, activeProductionOrders]);

  const handleOpenPlaceOrder = async (quote: Quotation) => {
    setSelectedQuotation(quote);
    setOrderNotes('');
    setIsPlaceOrderModalOpen(true);
    try {
      const res = await api.get(`/quotations/${quote.id}`);
      if (res.data) {
        setSelectedQuotation(res.data);
      }
    } catch (e) {
      console.error('Failed to load full quotation items:', e);
    }
  };

  const handlePlaceOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuotation) return;

    setIsPlacingOrder(true);
    try {
      await api.post('/orders', {
        quotation_id: selectedQuotation.id,
        order_notes: orderNotes,
        status: 'Held at Branch' // PRD M5.5 initial status
      });

      toast.success('Order created in "Held at Branch" status for re-confirmation.');
      setIsPlaceOrderModalOpen(false);
      fetchData();
      setActiveTab('held');
    } catch (err: any) {
      toast.error('Failed to create order: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // PRD M5.7: Branch Manager submits order to Corporate and triggers customer notification
  const handleSubmitToCorporate = async (orderId: number) => {
    try {
      await api.put(`/orders/${orderId}/submit-to-corporate`);
      toast.success('Order submitted to Corporate for approval (Status: Approval Pending)!');
      const targetOrder = orders.find(o => o.id === orderId);
      if (targetOrder) {
        handleOpenNotifyModal(targetOrder);
      }
      fetchData();
    } catch (err: any) {
      toast.error('Submission failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleOpenNotifyModal = (order: Order) => {
    setNotifyOrder(order);
    setNotifyChannel('email');
    setCustomNotifyMsg('Your Sales Order has been confirmed and submitted to Corporate HQ for processing.');
    setHasCopiedLink(false);
    setIsNotifyModalOpen(true);
  };

  const handleSendNotification = async () => {
    if (!notifyOrder) return;
    setIsSendingNotify(true);
    try {
      const res = await api.post(`/orders/${notifyOrder.id}/notify-customer`, {
        channel: notifyChannel,
        custom_message: customNotifyMsg
      });
      toast.success(res.data.message || 'Customer notified successfully!');
      setIsNotifyModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to dispatch customer notification');
    } finally {
      setIsSendingNotify(false);
    }
  };

  // Open Corporate Action Review Modal
  const handleOpenCorporateModal = async (order: Order) => {
    setCorporateOrder(order);
    setCorporateDecision('Accept');
    setCorporateReason('');
    setAutoGeneratePO(true);
    setIsCorporateModalOpen(true);
    setMaterialFeasibility(null);
    setIsLoadingFeasibility(true);
    try {
      const [feasibilityRes, orderRes] = await Promise.all([
        api.get(`/orders/${order.id}/material-feasibility`),
        api.get(`/orders/${order.id}`)
      ]);
      setMaterialFeasibility(feasibilityRes.data);
      if (orderRes.data) {
        setCorporateOrder(orderRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load material feasibility or order details:', err);
    } finally {
      setIsLoadingFeasibility(false);
    }
  };

  // Execute Corporate Triage Decision
  const handleCorporateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!corporateOrder) return;

    if ((corporateDecision === 'Reject' || corporateDecision === 'Hold') && !corporateReason.trim()) {
      toast.error(`Please provide a reason when selecting ${corporateDecision}.`);
      return;
    }

    setIsSubmittingCorporate(true);
    try {
      const res = await api.put(`/orders/${corporateOrder.id}/corporate-action`, {
        action: corporateDecision,
        reason: corporateReason.trim(),
        auto_generate_po: autoGeneratePO
      });

      if (res.data?.auto_po) {
        toast.success(`Corporate Accepted! Auto-PO ${res.data.auto_po.po_number} generated for material shortages.`);
      } else {
        toast.success(`Corporate action applied: ${corporateDecision}!`);
      }
      setIsCorporateModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error('Corporate review failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmittingCorporate(false);
    }
  };

  const handleOpenPrintDialog = async (order: Order) => {
    setIsPrintLabelOpen(true);
    setIsLoadingPrintDetails(true);
    try {
      const response = await api.get(`/orders/${order.id}`);
      setPrintOrder(response.data);
    } catch (err: any) {
      toast.error('Failed to load printing label details: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsLoadingPrintDetails(false);
    }
  };

  const triggerBrowserPrint = () => {
    const printContent = document.getElementById('print-label-container');
    if (!printContent) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      toast.error('Could not open printer document');
      return;
    }

    let headHtml = '';
    const styleSheets = document.querySelectorAll('link[rel="stylesheet"], style');
    styleSheets.forEach(sheet => {
      headHtml += sheet.outerHTML;
    });

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Print Label</title>
          ${headHtml}
          <style>
            @page { size: 4in 3in; margin: 0; }
            body {
              margin: 0;
              padding: 0.1in;
              box-sizing: border-box;
              width: 4in;
              height: 3in;
              background-color: white;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          </style>
        </head>
        <body>
          <div style="width: 3.8in; height: 2.8in; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
                setTimeout(() => {
                  window.frameElement.remove();
                }, 500);
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();
  };

  // Helper to render PRD compliant status badges
  const renderStatusBadge = (status: string, reason?: string) => {
    switch (status) {
      case 'Held at Branch':
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-50 text-amber-800 border border-amber-200">
            <PauseCircle size={12} className="text-amber-600" />
            Held at Branch
          </span>
        );
      case 'Approval Pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-purple-50 text-purple-800 border border-purple-200 animate-pulse">
            <Clock size={12} className="text-purple-600" />
            Approval Pending
          </span>
        );
      case 'Corporate Accepted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck size={12} className="text-emerald-600" />
            Corporate Accepted
          </span>
        );
      case 'Corporate Rejected':
        return (
          <div className="flex flex-col items-start gap-0.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-rose-50 text-rose-800 border border-rose-200">
              <ShieldAlert size={12} className="text-rose-600" />
              Corporate Rejected
            </span>
            {reason && (
              <span className="text-[10px] text-rose-600 font-semibold italic max-w-[160px] truncate" title={reason}>
                Reason: {reason}
              </span>
            )}
          </div>
        );
      case 'Corporate Hold':
        return (
          <div className="flex flex-col items-start gap-0.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-yellow-50 text-yellow-800 border border-yellow-200">
              <AlertCircle size={12} className="text-yellow-600" />
              Corporate Hold
            </span>
            {reason && (
              <span className="text-[10px] text-yellow-700 font-semibold italic max-w-[160px] truncate" title={reason}>
                Reason: {reason}
              </span>
            )}
          </div>
        );
      case 'Placed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-blue-50 text-blue-800 border border-blue-200">
            <Package size={12} className="text-blue-600" />
            Placed
          </span>
        );
      case 'In Production':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-indigo-50 text-indigo-800 border border-indigo-200">
            <Sliders size={12} className="text-indigo-600" />
            In Production
          </span>
        );
      case 'Shipped':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-cyan-50 text-cyan-800 border border-cyan-200">
            <TrendingUp size={12} className="text-cyan-600" />
            Shipped
          </span>
        );
      case 'Delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={12} className="text-emerald-600" />
            Delivered
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700">
            {status}
          </span>
        );
    }
  };

  const awaitingColumns: Column<Quotation>[] = [
    {
      header: 'Quote No',
      className: 'whitespace-nowrap',
      accessor: (item) => (
        <span className="font-mono font-bold text-zinc-900 text-xs">{item.quotation_no}</span>
      )
    },
    {
      header: 'Fulfillment Client',
      className: 'min-w-[160px] max-w-[220px]',
      accessor: (item) => (
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-zinc-800 text-xs md:text-sm truncate" title={item.title}>{item.title}</span>
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5 truncate" title={item.organizations?.name || 'Unknown Client'}>
            {item.organizations?.name || 'Unknown Client'}
          </span>
        </div>
      )
    },
    {
      header: 'Ledger Value',
      className: 'whitespace-nowrap',
      accessor: (item) => (
        <span className="font-black text-[#2d8d9b] text-xs md:text-sm font-mono">
          ₹{parseFloat(item.final_quote_value as any || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Ledger Paid',
      className: 'whitespace-nowrap',
      accessor: (item) => (
        <span className="font-bold text-emerald-600 text-xs md:text-sm font-mono">
          ₹{parseFloat(item.paid_amount as any || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Action Status',
      className: 'whitespace-nowrap',
      accessor: (item) => {
        const isPaid = item.payment_status === 'Paid';
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border tracking-wider ${
            isPaid
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/40'
              : 'bg-amber-50 text-amber-700 border-amber-200/40'
          }`}>
            {isPaid ? <CheckCircle2 size={11} className="text-emerald-600" /> : <Clock size={11} className="text-amber-600" />}
            {isPaid ? 'Paid & Settled' : 'Partially Paid'}
          </span>
        );
      }
    },
    {
      header: 'Placement Action',
      className: 'whitespace-nowrap text-right',
      accessor: (item) => (
        <Button
          variant="primary"
          size="sm"
          onClick={() => handleOpenPlaceOrder(item)}
          className="rounded-lg flex items-center gap-1 bg-[#2d8d9b] text-[10px] font-black tracking-wider h-7 px-2.5 ml-auto"
        >
          <Plus size={11} strokeWidth={3} />
          Convert to SO
        </Button>
      )
    }
  ];

  const orderColumns: Column<Order>[] = [
    {
      header: 'Order No',
      className: 'whitespace-nowrap',
      accessor: (item) => (
        <div className="flex flex-col">
          <span className="font-mono font-bold text-zinc-900 text-xs">{item.order_no}</span>
          <span className="text-[9px] text-zinc-400 font-medium">ID: #{item.id}</span>
        </div>
      )
    },
    {
      header: 'Origin & Client',
      className: 'min-w-[160px] max-w-[220px]',
      accessor: (item) => (
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-zinc-800 text-xs md:text-sm truncate" title={item.quotations?.title || 'Quotation Order'}>
            {item.quotations?.title || 'Quotation Order'}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5 truncate">
            <span className="text-[9px] text-zinc-500 font-black uppercase tracking-wider truncate">
              {item.quotations?.organizations?.name || 'Customer'}
            </span>
            <span className="text-[9px] text-zinc-300 font-bold">|</span>
            <span className="font-mono text-[9px] text-[#2d8d9b] font-bold shrink-0">
              {item.quotations?.quotation_no}
            </span>
          </div>
        </div>
      )
    },
    {
      header: 'Barcode Index',
      className: 'whitespace-nowrap',
      accessor: (item) => (
        <div className="w-28 bg-zinc-50 rounded-md border border-zinc-100 p-0.5 flex justify-center">
          <Barcode value={item.barcode} height={18} showText={true} barWidth={0.9} className="p-0 shadow-none bg-transparent" />
        </div>
      )
    },
    {
      header: 'Approval Status',
      className: 'whitespace-nowrap',
      accessor: (item) => renderStatusBadge(item.status, item.corporate_reason)
    },
    {
      header: 'Workflow Actions',
      className: 'whitespace-nowrap text-right',
      accessor: (item) => {
        const canSubmit = item.status === 'Held at Branch' || item.status === 'Draft' || item.status === 'Corporate Rejected';
        const canCorporateReview = item.status === 'Approval Pending' || item.status === 'Corporate Hold';

        return (
          <div className="flex items-center justify-end gap-1.5">
            {/* Branch Manager: Submit to Corporate */}
            {canSubmit && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSubmitToCorporate(item.id)}
                className="rounded-lg flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-[10px] font-black tracking-wider shadow-sm h-7 px-2"
              >
                <Send size={11} />
                {item.status === 'Corporate Rejected' ? 'Resubmit' : 'Submit'}
              </Button>
            )}

            {/* Corporate Approver Review */}
            {canCorporateReview && isCorporateApprover && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenCorporateModal(item)}
                className="rounded-lg flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-[10px] font-black tracking-wider shadow-sm h-7 px-2"
              >
                <ShieldCheck size={11} />
                Triage
              </Button>
            )}

            {/* Read-only notification for branch user when in pending state */}
            {canCorporateReview && !isCorporateApprover && (
              <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200 whitespace-nowrap">
                Pending Sign-off
              </span>
            )}

            {/* Print Label */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenPrintDialog(item)}
              className="rounded-lg flex items-center gap-1 border-[#fce4d4] text-[10px] font-black tracking-wider h-7 px-2"
              title="Print Industrial Label Tag"
            >
              <Printer size={11} />
              Label
            </Button>

            {/* PRD M5.7 Customer Notification Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenNotifyModal(item)}
              className="rounded-lg flex items-center gap-1 text-[10px] font-black tracking-wider text-teal-700 bg-teal-50 hover:bg-teal-100 border-teal-200 h-7 px-2"
              title="Notify Customer of SO (PRD M5.7)"
            >
              <Mail size={11} />
              Notify
            </Button>

            {/* Direct shortcut to Job Cards for active orders */}
            {(item.status === 'Corporate Accepted' || item.status === 'In Production') && (
              <Link
                href="/factory/job-cards"
                className="rounded-lg flex items-center gap-1 text-[10px] font-black tracking-wider text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 h-7 px-2 transition shadow-2xs whitespace-nowrap"
                title="Go to Factory Job Cards & PO Handler"
              >
                <Layers size={11} />
                Job Cards
              </Link>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Top Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
        <div className="relative">
          <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">
            Order Placement &amp; Corporate Approval
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">
            Branch Confirmation &gt; Corporate Triage Pipeline
          </p>
        </div>
        <button
          onClick={fetchData}
          className="h-14 px-8 bg-white border border-zinc-200/80 hover:border-[#2d8d9b]/30 rounded-[1.2rem] text-xs font-black uppercase tracking-wider text-[#3a525d] hover:text-[#2d8d9b] transition-all shadow-sm flex items-center gap-2.5 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 text-[#2d8d9b] ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Pipeline
        </button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="solid" className="p-6 rounded-3xl border border-zinc-100 flex items-center gap-4 bg-white shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b]">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Awaiting Placement</p>
            <p className="text-xl font-black text-amber-600 mt-0.5">
              {awaitingOrders.length} Quotations
            </p>
          </div>
        </Card>

        <Card variant="solid" className="p-6 rounded-3xl border border-zinc-100 flex items-center gap-4 bg-white shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-100/50 flex items-center justify-center text-amber-600">
            <PauseCircle size={24} />
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Held at Branch</p>
            <p className="text-xl font-black text-amber-600 mt-0.5">
              {heldOrders.length} Orders
            </p>
          </div>
        </Card>

        <Card variant="solid" className="p-6 rounded-3xl border border-zinc-100 flex items-center gap-4 bg-white shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-purple-100/50 flex items-center justify-center text-purple-600">
            <ShieldAlert size={24} />
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Approval Pending</p>
            <p className="text-xl font-black text-purple-600 mt-0.5">
              {pendingOrders.length} Orders
            </p>
          </div>
        </Card>

        <Card variant="solid" className="p-6 rounded-3xl border border-zinc-100 flex items-center gap-4 bg-white shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100/50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Corporate Approved / Active</p>
            <p className="text-xl font-black text-emerald-600 mt-0.5">
              {activeProductionOrders.length} Orders
            </p>
          </div>
        </Card>
      </div>

      {/* Tab Selectors with Sleek Pill Design */}
      <div className="flex bg-zinc-100/80 p-1.5 rounded-2xl border border-zinc-200/50 flex-wrap gap-1 w-fit">
        <button
          onClick={() => setActiveTab('awaiting')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'awaiting'
              ? 'bg-[#3a525d] text-white shadow-md'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <span>Awaiting Placement</span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono ${
            activeTab === 'awaiting' ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
          }`}>
            {awaitingOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('held')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'held'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'text-zinc-500 hover:text-amber-700 hover:bg-amber-50'
          }`}
        >
          <span>Branch Verification</span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono ${
            activeTab === 'held' ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
          }`}>
            {heldOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'pending'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-zinc-500 hover:text-purple-700 hover:bg-purple-50'
          }`}
        >
          <span>Corporate Approval Queue</span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono ${
            activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
          }`}>
            {pendingOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('active')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'active'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-zinc-500 hover:text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          <span>Active Production</span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono ${
            activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
          }`}>
            {activeProductionOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'all'
              ? 'bg-[#3a525d] text-white shadow-md'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <span>All Orders</span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono ${
            activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
          }`}>
            {orders.length}
          </span>
        </button>
      </div>

      {/* Data Table */}
      {activeTab === 'awaiting' ? (
        <DataTable
          columns={awaitingColumns}
          data={awaitingOrders}
          title="Quotations Awaiting Sales Order Conversion"
          subtitle="Approved client quotations with registered payments ready to be placed in branch hold"
          isLoading={isLoading}
          searchPlaceholder="Search quotation number, client..."
        />
      ) : (
        <DataTable
          columns={orderColumns}
          data={displayedOrders}
          title={
            activeTab === 'held' ? 'Orders Held at Branch (Awaiting Corporate Submission)' :
            activeTab === 'pending' ? 'Corporate Triage Queue (Approval Pending / Corporate Hold)' :
            activeTab === 'active' ? 'Active Production & Fulfillment Orders' :
            'Complete Sales Orders Registry'
          }
          subtitle="Real-time multi-tier order tracking with industrial barcode IDs and corporate decision audit"
          isLoading={isLoading}
          searchPlaceholder="Search order number, barcode, client..."
        />
      )}

      {/* 1. Modal Dialog: Create Order / Place Order */}
      {isPlaceOrderModalOpen && selectedQuotation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <Card variant="solid" className="w-full max-w-lg p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200 rounded-[2.5rem] border border-[#fce4d4]">
            <div className="flex items-center justify-between mb-6 border-b border-[#fce4d4]/60 pb-4">
              <div>
                <h3 className="text-xl font-black italic tracking-tight text-[#3a525d]">Convert to Sales Order</h3>
                <p className="text-[10px] text-[#2d8d9b] font-black uppercase tracking-wider mt-0.5">
                  Quotation {selectedQuotation.quotation_no} &gt; Branch Re-confirmation
                </p>
              </div>
              <button
                onClick={() => setIsPlaceOrderModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors flex items-center justify-center text-zinc-500"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handlePlaceOrderSubmit} className="space-y-5">
              <div className="space-y-3 bg-[#fce4d4]/10 rounded-2xl p-4 border border-[#fce4d4]/40">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500 font-bold uppercase">Client Profile</span>
                  <span className="font-black text-[#3a525d]">{selectedQuotation.organizations?.name}</span>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-zinc-100">
                  <span className="text-zinc-500 font-bold uppercase">Contract Value</span>
                  <span className="font-black text-[#2d8d9b]">₹{parseFloat(selectedQuotation.final_quote_value as any).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-zinc-100">
                  <span className="text-zinc-500 font-bold uppercase">Payment Status</span>
                  <span className="font-black text-emerald-600">
                    SETTLED (₹{parseFloat(selectedQuotation.paid_amount as any || 0).toFixed(2)} Collected)
                  </span>
                </div>
              </div>

              {/* Garment Line Items & Products Breakdown */}
              {selectedQuotation.items && selectedQuotation.items.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#8b6b5a]">
                    Quotation Products &amp; Quantities ({selectedQuotation.items.length} items)
                  </span>
                  <div className="max-h-36 overflow-y-auto rounded-2xl border border-[#fce4d4] bg-white p-1">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#fce4d4]/30 text-[#3a525d] font-black text-[10px] uppercase border-b border-[#fce4d4]/60">
                        <tr>
                          <th className="py-2 px-3">Product / Garment</th>
                          <th className="py-2 px-2 text-right">Qty</th>
                          <th className="py-2 px-2 text-right">Unit Price</th>
                          <th className="py-2 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#fce4d4]/30 text-slate-800 text-[11px]">
                        {selectedQuotation.items.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-[#fce4d4]/10">
                            <td className="py-1.5 px-3 font-bold text-[#3a525d]">
                              {item.product_types?.name || item.product_type_name || 'Garment Item'}
                            </td>
                            <td className="py-1.5 px-2 text-right font-black text-zinc-700">{item.quantity} pcs</td>
                            <td className="py-1.5 px-2 text-right font-mono text-zinc-600">₹{parseFloat(item.unit_price || 0).toFixed(2)}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-[#2d8d9b]">₹{parseFloat(item.total_price || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* PRD Notice */}
              <div className="bg-amber-50 border border-amber-200/70 rounded-2xl p-4 text-xs text-amber-800 leading-relaxed font-semibold flex items-start gap-2.5">
                <PauseCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Order will be initialized in <strong>&quot;Held at Branch&quot;</strong> status. The Branch Manager can verify specifications before transmitting to Corporate for production sign-off.
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-black tracking-widest uppercase text-[#8b6b5a] mb-1.5">
                  Order &amp; Fulfillment Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Special customer remarks, alteration deadlines, custom tags..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full bg-white border border-[#fce4d4] rounded-2xl p-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-[#fce4d4]/50 transition-all text-foreground shadow-sm"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-[#fce4d4]/60">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsPlaceOrderModalOpen(false)}
                  className="flex-1 rounded-2xl h-12"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isPlacingOrder}
                  className="flex-1 rounded-2xl h-12 bg-amber-600 hover:bg-amber-500 text-white font-bold"
                >
                  Confirm &amp; Hold at Branch
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 2. Modal Dialog: Corporate Triage Action (Accept / Reject / Hold) */}
      {isCorporateModalOpen && corporateOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <Card variant="solid" className="w-full max-w-lg p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200 rounded-[2.5rem] border border-purple-200">
            <div className="flex items-center justify-between mb-6 border-b border-purple-100 pb-4">
              <div>
                <h3 className="text-xl font-black italic tracking-tight text-slate-900">Corporate Order Triage</h3>
                <p className="text-[10px] text-purple-600 font-black uppercase tracking-wider mt-0.5">
                  Order {corporateOrder.order_no} &gt; Corporate Approval Review
                </p>
              </div>
              <button
                onClick={() => setIsCorporateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors flex items-center justify-center text-zinc-500"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCorporateSubmit} className="space-y-5">
              <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Client Name:</span>
                  <strong className="text-slate-800">{corporateOrder.quotations?.organizations?.name || 'Customer'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Quotation Ref:</span>
                  <span className="font-mono font-bold text-purple-700">{corporateOrder.quotations?.quotation_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Order Valuation:</span>
                  <strong className="text-slate-900 font-mono">₹{parseFloat(corporateOrder.quotations?.final_quote_value as any || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </div>
                {corporateOrder.submitted_to_corporate_at && (
                  <div className="flex justify-between text-[11px] pt-1 border-t border-purple-100 text-slate-400">
                    <span>Submitted by Branch:</span>
                    <span>{new Date(corporateOrder.submitted_to_corporate_at).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Garment Specifications & Products in this Order */}
              {((materialFeasibility?.products && materialFeasibility.products.length > 0) || (corporateOrder.items && corporateOrder.items.length > 0)) && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Sales Order Products &amp; Garments ({(materialFeasibility?.products || corporateOrder.items).length} items)
                  </span>
                  <div className="max-h-36 overflow-y-auto rounded-2xl border border-purple-100 bg-white shadow-xs p-1">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-purple-50/80 text-purple-900 font-black text-[10px] uppercase border-b border-purple-100">
                        <tr>
                          <th className="py-2 px-3">Product</th>
                          <th className="py-2 px-2">Main Fabric</th>
                          <th className="py-2 px-2">Attachments</th>
                          <th className="py-2 px-3 text-right">Order Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-50 text-slate-800 text-[11px]">
                        {(materialFeasibility?.products || corporateOrder.items || []).map((p: any, idx: number) => {
                          const prodName = p.product_name || p.product_types?.name || p.product_type_name || 'Garment Item';
                          const mainFab = p.main_fabric || 'Standard';
                          const attFab = p.attachment_fabrics || 'None';
                          const qty = p.quantity || 1;
                          return (
                            <tr key={idx} className="hover:bg-purple-50/30">
                              <td className="py-1.5 px-3 font-bold text-slate-900">{prodName}</td>
                              <td className="py-1.5 px-2 text-slate-600 font-medium truncate max-w-[120px]">{mainFab}</td>
                              <td className="py-1.5 px-2 text-slate-500 font-medium truncate max-w-[100px]">{attFab}</td>
                              <td className="py-1.5 px-3 text-right font-black text-purple-900">{qty} pcs</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  Corporate Decision
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setCorporateDecision('Accept')}
                    className={`py-3 px-2 rounded-xl text-xs font-black uppercase flex flex-col items-center gap-1.5 transition border ${
                      corporateDecision === 'Accept'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Check size={16} />
                    Accept Order
                  </button>

                  <button
                    type="button"
                    onClick={() => setCorporateDecision('Hold')}
                    className={`py-3 px-2 rounded-xl text-xs font-black uppercase flex flex-col items-center gap-1.5 transition border ${
                      corporateDecision === 'Hold'
                        ? 'bg-yellow-500 text-slate-950 border-yellow-500 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <PauseCircle size={16} />
                    Place on Hold
                  </button>

                  <button
                    type="button"
                    onClick={() => setCorporateDecision('Reject')}
                    className={`py-3 px-2 rounded-xl text-xs font-black uppercase flex flex-col items-center gap-1.5 transition border ${
                      corporateDecision === 'Reject'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <X size={16} />
                    Reject Order
                  </button>
                </div>
              </div>

              {(corporateDecision === 'Reject' || corporateDecision === 'Hold') && (
                <div>
                  <label className="block text-xs font-bold text-rose-700 mb-1.5 uppercase tracking-wider">
                    Decision Reason / Instructions (Mandatory)
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder={`Specify why this order is being ${corporateDecision === 'Reject' ? 'rejected' : 'held'}... (e.g. credit limit, insufficient fabric, incorrect styling)`}
                    value={corporateReason}
                    onChange={(e) => setCorporateReason(e.target.value)}
                    className="w-full bg-white border border-rose-200 rounded-xl p-3 text-xs font-medium outline-none focus:ring-2 focus:ring-rose-400 text-slate-900"
                  />
                </div>
              )}

              {corporateDecision === 'Accept' && (
                <div className="space-y-3">
                  {isLoadingFeasibility ? (
                    <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#1B365D] border-t-transparent" />
                      <span className="text-xs font-bold text-zinc-500">Checking raw materials inventory (Fabrics & Trims)...</span>
                    </div>
                  ) : materialFeasibility && materialFeasibility.is_sufficient ? (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2.5">
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-bold">All Required Fabrics & Trims are In Stock!</p>
                        <p className="text-[11px] text-emerald-700 font-normal">Warehouse inventory is sufficient to fulfill this order. Approving will reserve the required stock.</p>
                      </div>
                    </div>
                  ) : materialFeasibility && !materialFeasibility.is_sufficient ? (
                    <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                          <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                            Raw Material Deficit ({materialFeasibility.shortage_items_count} item{materialFeasibility.shortage_items_count > 1 ? 's' : ''} short)
                          </span>
                        </div>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                          PO Required
                        </span>
                      </div>

                      <p className="text-xs text-amber-800 font-medium">
                        Current warehouse stock cannot cover the entire order requirement. Extra materials will be ordered:
                      </p>

                      <div className="max-h-44 overflow-y-auto rounded-xl border border-amber-200 bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-amber-100/70 text-amber-900 font-black text-[10px] uppercase border-b border-amber-200">
                            <tr>
                              <th className="py-2 px-3">Material</th>
                              <th className="py-2 px-2">Type</th>
                              <th className="py-2 px-2">Required</th>
                              <th className="py-2 px-2">In Stock</th>
                              <th className="py-2 px-3 text-right font-black text-rose-700">Auto-PO Qty</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-100 text-slate-800 text-[11px]">
                            {materialFeasibility.shortages.map((s: any, idx: number) => (
                              <tr key={idx} className="hover:bg-amber-50/50">
                                <td className="py-1.5 px-3 font-bold text-slate-900">
                                  {s.name} {s.code ? <span className="font-mono text-[10px] text-slate-500 font-normal">({s.code})</span> : null}
                                </td>
                                <td className="py-1.5 px-2 uppercase text-[9px] font-bold text-slate-500">
                                  {s.type}
                                </td>
                                <td className="py-1.5 px-2 font-medium">{s.required} {s.unit}</td>
                                <td className="py-1.5 px-2 text-amber-700 font-medium">{s.available} {s.unit}</td>
                                <td className="py-1.5 px-3 text-right font-black text-rose-700 bg-rose-50/60">
                                  +{s.reorder_quantity} {s.unit}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none text-xs font-bold text-amber-950">
                        <input 
                          type="checkbox" 
                          checked={autoGeneratePO} 
                          onChange={(e) => setAutoGeneratePO(e.target.checked)} 
                          className="w-4 h-4 rounded border-amber-300 text-[#1B365D] focus:ring-[#1B365D]"
                        />
                        <span>Auto-generate Purchase Order (PO) with rounded integer amounts on Accept</span>
                      </label>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-purple-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsCorporateModalOpen(false)}
                  className="flex-1 rounded-2xl h-12"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmittingCorporate}
                  className={`flex-1 rounded-2xl h-12 font-bold text-white ${
                    corporateDecision === 'Accept' ? 'bg-emerald-600 hover:bg-emerald-500' :
                    corporateDecision === 'Hold' ? 'bg-yellow-600 hover:bg-yellow-500' :
                    'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  Submit {corporateDecision}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 3. Modal Dialog: Printing Label tag preview */}
      {isPrintLabelOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 no-print-view">
          <Card variant="solid" className="w-full max-w-lg p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200 rounded-[2.5rem] border border-[#fce4d4] flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-4 border-b border-[#fce4d4]/60 pb-3 shrink-0">
              <div>
                <h3 className="text-xl font-black italic tracking-tight text-[#3a525d]">Label Tag Exporter</h3>
                <p className="text-[10px] text-[#2d8d9b] font-black uppercase tracking-wider mt-0.5">
                  Print Tag Preview (4in x 3in size aligned)
                </p>
              </div>
              <button
                onClick={() => setIsPrintLabelOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors flex items-center justify-center text-zinc-500"
              >
                <X size={16} />
              </button>
            </div>

            {isLoadingPrintDetails ? (
              <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#2d8d9b] border-t-transparent" />
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Compiling specifications...</span>
              </div>
            ) : printOrder ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto pr-2 no-scrollbar py-2">
                  <div className="border border-dashed border-[#8b6b5a]/30 rounded-3xl p-4 bg-white shadow-inner flex flex-col items-center justify-center">
                    <span className="text-[9px] font-black tracking-widest text-zinc-300 uppercase mb-2">Print Area Boundary</span>

                    <div id="print-label-container" className="w-[3.8in] h-[2.8in] border border-zinc-900 p-2 bg-white text-zinc-900 box-sizing-border-box flex flex-col justify-between select-none">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-widest leading-none text-[#2d8d9b]">FORMA APPARELS</span>
                          <span className="text-[6px] text-zinc-500 font-bold mt-0.5">ORDER FULFILLMENT LABEL</span>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="font-mono text-[9px] font-black leading-none">{printOrder.order_no}</span>
                          <span className="text-[6px] text-zinc-400 font-bold uppercase mt-0.5">Status: {printOrder.status}</span>
                        </div>
                      </div>

                      <div className="border-t border-b border-zinc-200 py-1 flex justify-between gap-2">
                        <div className="flex flex-col flex-1">
                          <span className="text-[5px] text-zinc-400 font-bold uppercase leading-none">Customer Profile</span>
                          <span className="text-[8px] font-black text-zinc-800 leading-tight mt-0.5 truncate max-w-[140px]">{printOrder.quotations?.organizations?.name}</span>
                          <span className="text-[6px] text-zinc-500 leading-none mt-0.5 truncate max-w-[140px]">{printOrder.quotations?.organizations?.address || 'No address added'}</span>
                        </div>
                        <div className="flex flex-col text-right shrink-0">
                          <span className="text-[5px] text-zinc-400 font-bold uppercase leading-none">Expected Delivery</span>
                          <span className="text-[8px] font-black text-zinc-800 leading-none mt-0.5">
                            {formatDate(printOrder.quotations?.expected_delivery_date)}
                          </span>
                          <span className="text-[6px] font-mono text-[#2d8d9b] font-bold mt-0.5">Quote: {printOrder.quotations?.quotation_no}</span>
                        </div>
                      </div>

                      <div className="flex-1 overflow-hidden py-1">
                        <span className="text-[5px] text-zinc-400 font-bold uppercase leading-none block mb-0.5">Fulfillment Items</span>
                        <div className="max-h-[0.7in] overflow-hidden">
                          <table className="w-full text-left text-[6px]">
                            <thead>
                              <tr className="border-b border-zinc-100 font-black text-zinc-500 uppercase">
                                <th className="pb-0.5">Product Category</th>
                                <th className="text-right pb-0.5">Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {printOrder.items?.slice(0, 3).map((item) => (
                                <tr key={item.id} className="font-bold border-b border-zinc-50/50">
                                  <td className="py-0.5 truncate max-w-[150px]">{item.product_types?.name || item.product_type_name || 'Item'}</td>
                                  <td className="text-right py-0.5">{item.quantity}</td>
                                </tr>
                              ))}
                              {printOrder.items?.length > 3 && (
                                <tr className="font-bold italic text-zinc-400 text-[5px]">
                                  <td colSpan={2} className="py-0.5">+ {printOrder.items.length - 3} additional product types</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-center border-t border-zinc-100 pt-1">
                        <Barcode value={printOrder.barcode} height={25} showText={true} barWidth={1.2} className="p-0 shadow-none bg-transparent" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-[#fce4d4]/60 mt-4 shrink-0">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsPrintLabelOpen(false)}
                    className="flex-1 rounded-2xl h-12"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={triggerBrowserPrint}
                    className="flex-1 rounded-2xl h-12 bg-[#2d8d9b] flex items-center justify-center gap-2"
                  >
                    <Printer size={16} />
                    Send to Printer
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      )}

      {/* PRD M5.7 & Section 5.2 Customer Notification Modal */}
      {isNotifyModalOpen && notifyOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-6 bg-white rounded-3xl shadow-2xl border-zinc-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <Mail size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">Notify Client of Sales Order</h3>
                  <p className="text-[11px] text-zinc-400 font-semibold">PRD M5.7 • Section 5.2 Customer Dispatch</p>
                </div>
              </div>
              <button
                onClick={() => setIsNotifyModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:bg-zinc-100"
              >
                <X size={16} />
              </button>
            </div>

            {/* Order & Client Info */}
            <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500 font-medium">Sales Order No:</span>
                <span className="font-mono font-bold text-zinc-900">{notifyOrder.order_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-medium">Customer / School:</span>
                <span className="font-bold text-zinc-900">{notifyOrder.quotations?.organizations?.name || 'Valued Client'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-medium">Contract Value:</span>
                <span className="font-bold text-emerald-700 font-mono">₹{(notifyOrder.total_amount || notifyOrder.quotations?.final_quote_value || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-medium">Client Contact:</span>
                <span className="font-medium text-zinc-700">{notifyOrder.quotations?.organizations?.email || 'customer@client.com'}</span>
              </div>
            </div>

            {/* Notification Channel */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700">Dispatch Channel</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer font-semibold transition ${
                  notifyChannel === 'email' ? 'border-teal-500 bg-teal-50/50 text-teal-900' : 'border-zinc-200 text-zinc-600'
                }`}>
                  <input
                    type="radio"
                    name="notifyChan"
                    value="email"
                    checked={notifyChannel === 'email'}
                    onChange={() => setNotifyChannel('email')}
                    className="text-teal-600"
                  />
                  <span>Email Dispatch</span>
                </label>
                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer font-semibold transition ${
                  notifyChannel === 'link' ? 'border-teal-500 bg-teal-50/50 text-teal-900' : 'border-zinc-200 text-zinc-600'
                }`}>
                  <input
                    type="radio"
                    name="notifyChan"
                    value="link"
                    checked={notifyChannel === 'link'}
                    onChange={() => setNotifyChannel('link')}
                    className="text-teal-600"
                  />
                  <span>Manual Link Share</span>
                </label>
              </div>
            </div>

            {/* Custom Remarks */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700">Notification Message</label>
              <textarea
                rows={2}
                value={customNotifyMsg}
                onChange={e => setCustomNotifyMsg(e.target.value)}
                placeholder="Message displayed on client confirmation..."
                className="w-full px-3 py-2 border rounded-xl text-xs text-zinc-800"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setIsNotifyModalOpen(false)}
                className="flex-1 rounded-xl h-11 text-xs font-bold"
              >
                Close
              </Button>
              <Button
                variant="primary"
                isLoading={isSendingNotify}
                onClick={handleSendNotification}
                className="flex-1 rounded-xl h-11 bg-teal-600 hover:bg-teal-500 text-xs font-bold flex items-center justify-center gap-2 text-white shadow-md shadow-teal-600/20"
              >
                <Send size={14} />
                Confirm &amp; Log Notice
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
