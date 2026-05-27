'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Barcode } from '@/components/ui/Barcode';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  TrendingUp,
  Package,
  Printer,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  Calendar,
  X,
  Sliders,
  FileText,
  User,
  ShoppingBag,
  ListTodo
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
  organizations?: { name: string };
  final_quote_value: number;
  paid_amount: number;
  payment_status: string;
  status: string;
}

interface QuotationItem {
  id: number;
  product_type_id: number;
  product_types?: { name: string };
  product_type_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: number;
  quotation_id: number;
  order_no: string;
  barcode: string;
  status: string; // Placed, In Production, Shipped, Delivered
  order_notes: string;
  created_at: string;
  updated_at: string;
  quotations?: {
    id: number;
    quotation_no: string;
    title: string;
    final_quote_value: number;
    paid_amount: number;
    organizations: { name: string };
  };
}

interface PrintOrderDetails extends Order {
  items: QuotationItem[];
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

export default function OrderPlacementPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'awaiting' | 'active'>('awaiting');

  // Modal State for Placing Order
  const [isPlaceOrderModalOpen, setIsPlaceOrderModalOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [orderNotes, setOrderNotes] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Print Label State
  const [isPrintLabelOpen, setIsPrintLabelOpen] = useState(false);
  const [printOrder, setPrintOrder] = useState<PrintOrderDetails | null>(null);
  const [isLoadingPrintDetails, setIsLoadingPrintDetails] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

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

  // Filter: Quotations that are paid but don't have an order placed yet
  const awaitingOrders = React.useMemo(() => {
    return quotations.filter(q => !orders.some(o => o.quotation_id === q.id));
  }, [quotations, orders]);

  const handleOpenPlaceOrder = (quote: Quotation) => {
    setSelectedQuotation(quote);
    setOrderNotes('');
    setIsPlaceOrderModalOpen(true);
  };

  const handlePlaceOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuotation) return;

    setIsPlacingOrder(true);
    try {
      await api.post('/orders', {
        quotation_id: selectedQuotation.id,
        order_notes: orderNotes
      });

      toast.success(`Order created successfully! Unique barcode registered.`);
      setIsPlaceOrderModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error('Failed to create order: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      await api.put(`/orders/${orderId}`, { status: newStatus });
      toast.success('Order status updated successfully!');
      fetchData();
    } catch (err: any) {
      toast.error('Failed to update status: ' + (err.response?.data?.error || err.message));
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
      setIsPrintLabelOpen(false);
    } finally {
      setIsLoadingPrintDetails(false);
    }
  };

  const triggerBrowserPrint = () => {
    const printContent = document.getElementById('print-label-container');
    if (!printContent) {
      toast.error('Print container not found');
      return;
    }

    // Create temporary hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
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

    // Capture stylesheet references to keep Tailwind classes working inside the iframe
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
            @page {
              size: 4in 3in;
              margin: 0;
            }
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

  // Counter Mathematics
  const counters = React.useMemo(() => {
    const totalPlaced = orders.length;
    const inProduction = orders.filter(o => o.status === 'In Production').length;
    const awaitingPlacement = awaitingOrders.length;
    const completed = orders.filter(o => o.status === 'Delivered').length;

    return {
      totalPlaced,
      inProduction,
      awaitingPlacement,
      completed
    };
  }, [orders, awaitingOrders]);

  const awaitingColumns: Column<Quotation>[] = [
    {
      header: 'Quote No',
      accessor: (item) => (
        <span className="font-mono font-bold text-zinc-900">{item.quotation_no}</span>
      )
    },
    {
      header: 'Fulfillment Client',
      accessor: (item) => (
        <div className="flex flex-col">
          <span className="font-bold text-zinc-800 text-sm">{item.title}</span>
          <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
            {item.organizations?.name || 'Unknown Client'}
          </span>
        </div>
      )
    },
    {
      header: 'Ledger Value',
      accessor: (item) => (
        <span className="font-black text-[#2d8d9b] text-base">
          ${parseFloat(item.final_quote_value as any || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Ledger Paid',
      accessor: (item) => (
        <span className="font-bold text-emerald-600 text-sm">
          ${parseFloat(item.paid_amount as any || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Action status',
      accessor: (item) => {
        const isPaid = item.payment_status === 'Paid';
        return (
          <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black uppercase border tracking-wider ${
            isPaid 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/40' 
              : 'bg-amber-50 text-amber-700 border-amber-200/40'
          }`}>
            {isPaid ? <CheckCircle2 size={12} className="text-emerald-600" /> : <Clock size={12} className="text-amber-600" />}
            {isPaid ? 'Paid & Settled' : 'Partially Paid'}
          </span>
        );
      }
    },
    {
      header: 'Placement Action',
      accessor: (item) => (
        <Button
          variant="primary"
          size="sm"
          onClick={() => handleOpenPlaceOrder(item)}
          className="rounded-xl flex items-center gap-1.5 bg-[#2d8d9b] text-[10px] font-black tracking-wider"
        >
          <Plus size={12} strokeWidth={3} />
          Place Order
        </Button>
      )
    }
  ];

  const activeColumns: Column<Order>[] = [
    {
      header: 'Order No',
      accessor: (item) => (
        <span className="font-mono font-bold text-zinc-900">{item.order_no}</span>
      )
    },
    {
      header: 'Origin & Client',
      accessor: (item) => (
        <div className="flex flex-col">
          <span className="font-bold text-zinc-800 text-sm">
            {item.quotations?.title || 'Original Quotation'}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">
              {item.quotations?.organizations?.name || 'Unknown Client'}
            </span>
            <span className="text-[10px] text-zinc-300 font-bold">|</span>
            <span className="font-mono text-[10px] text-[#2d8d9b] font-bold">
              {item.quotations?.quotation_no}
            </span>
          </div>
        </div>
      )
    },
    {
      header: 'Barcode Index',
      accessor: (item) => (
        <div className="w-48 bg-zinc-50 rounded-lg border border-zinc-100 p-1">
          <Barcode value={item.barcode} height={30} showText={true} barWidth={1.5} className="p-0 shadow-none bg-transparent" />
        </div>
      )
    },
    {
      header: 'Order Status',
      accessor: (item) => (
        <div className="w-44 select-container">
          <Select
            value={item.status}
            onChange={(val) => handleStatusChange(item.id, val)}
            options={[
              { value: 'Placed', label: '🛒 Placed' },
              { value: 'In Production', label: '⚙️ In Production' },
              { value: 'Shipped', label: '🚚 Shipped' },
              { value: 'Delivered', label: '✅ Delivered' }
            ]}
            className="rounded-xl border-[#fce4d4] py-2 px-3 text-xs font-bold text-[#3a525d] shadow-sm bg-white"
          />
        </div>
      )
    },
    {
      header: 'Placed Date',
      accessor: (item) => (
        <div className="text-zinc-500 text-xs font-bold flex items-center gap-1.5">
          <Calendar size={12} className="text-zinc-400" />
          {new Date(item.created_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </div>
      )
    },
    {
      header: 'Label Export',
      accessor: (item) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleOpenPrintDialog(item)}
          className="rounded-xl flex items-center gap-1.5 border-[#fce4d4] text-[10px] font-black tracking-wider"
        >
          <Printer size={12} />
          Print Label
        </Button>
      )
    }
  ];

  return (
    <div className="p-4 md:p-8 space-y-8 bg-zinc-50/50 min-h-screen">

      {/* Top Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic tracking-tight text-[#3a525d]">Order Placement Registry</h1>
          <p className="text-xs text-[#2d8d9b] font-black uppercase tracking-[0.2em] mt-1">
            Fulfillment Pipeline &gt; Production Logistics
          </p>
        </div>
      </div>

      {/* Stats Counter Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="solid" className="p-6 flex items-center gap-4 bg-gradient-to-br from-white to-[#fce4d4]/10">
          <div className="w-12 h-12 rounded-2xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b]">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Awaiting Order Creation</p>
            <p className="text-xl font-black text-amber-600 mt-0.5">
              {counters.awaitingPlacement} Quotations
            </p>
          </div>
        </Card>

        <Card variant="solid" className="p-6 flex items-center gap-4 bg-gradient-to-br from-white to-blue-50/10">
          <div className="w-12 h-12 rounded-2xl bg-blue-100/50 flex items-center justify-center text-blue-600">
            <Package size={24} />
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Total Active Orders</p>
            <p className="text-xl font-black text-zinc-800 mt-0.5">
              {counters.totalPlaced} Orders
            </p>
          </div>
        </Card>

        <Card variant="solid" className="p-6 flex items-center gap-4 bg-gradient-to-br from-white to-amber-50/10">
          <div className="w-12 h-12 rounded-2xl bg-amber-100/50 flex items-center justify-center text-amber-600">
            <Sliders size={24} />
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">In Production Flow</p>
            <p className="text-xl font-black text-amber-600 mt-0.5">
              {counters.inProduction} Orders
            </p>
          </div>
        </Card>

        <Card variant="solid" className="p-6 flex items-center gap-4 bg-gradient-to-br from-white to-emerald-50/10">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100/50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Fulfillment Completed</p>
            <p className="text-xl font-black text-emerald-600 mt-0.5">
              {counters.completed} Delivered
            </p>
          </div>
        </Card>
      </div>

      {/* Tab Selectors */}
      <div className="flex gap-2 border-b border-zinc-200 pb-px">
        <button
          onClick={() => setActiveTab('awaiting')}
          className={`pb-4 px-6 font-black text-xs uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === 'awaiting'
              ? 'border-[#2d8d9b] text-[#2d8d9b]'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Awaiting Placement ({counters.awaitingPlacement})
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-4 px-6 font-black text-xs uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === 'active'
              ? 'border-[#2d8d9b] text-[#2d8d9b]'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Active Production Orders ({counters.totalPlaced})
        </button>
      </div>

      {/* Data Table */}
      {activeTab === 'awaiting' ? (
        <DataTable
          columns={awaitingColumns}
          data={awaitingOrders}
          title="Quotations Awaiting Placement"
          subtitle="All approved contracts with registered payments ready for manufacturing initialization"
          isLoading={isLoading}
          searchPlaceholder="Search quotation number, client..."
        />
      ) : (
        <DataTable
          columns={activeColumns}
          data={orders}
          title="Fulfillment Production Registry"
          subtitle="Active manufacturing orders with embedded vector barcode identifiers and tracker maps"
          isLoading={isLoading}
          searchPlaceholder="Search order number, barcode, quotation..."
        />
      )}

      {/* 1. Modal Dialog: Create Order / Place Order */}
      {isPlaceOrderModalOpen && selectedQuotation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <Card variant="solid" className="w-full max-w-lg p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200 rounded-[2.5rem] border border-[#fce4d4]">
            <div className="flex items-center justify-between mb-6 border-b border-[#fce4d4]/60 pb-4">
              <div>
                <h3 className="text-xl font-black italic tracking-tight text-[#3a525d]">Place Production Order</h3>
                <p className="text-[10px] text-[#2d8d9b] font-black uppercase tracking-wider mt-0.5">
                  Initializes tracking pipeline for Quotation {selectedQuotation.quotation_no}
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
                  <span className="font-black text-[#2d8d9b]">${parseFloat(selectedQuotation.final_quote_value as any).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-zinc-100">
                  <span className="text-zinc-500 font-bold uppercase">Payment Status</span>
                  <span className={`font-black ${
                    selectedQuotation.payment_status === 'Paid' 
                      ? 'text-emerald-600' 
                      : 'text-amber-600'
                  }`}>
                    {selectedQuotation.payment_status === 'Paid' 
                      ? 'FULLY SETTLED (PAID)' 
                      : `PARTIALLY PAID ($${parseFloat(selectedQuotation.paid_amount as any || 0).toFixed(2)} Collected)`}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black tracking-widest uppercase text-[#8b6b5a] mb-1.5">
                  Production & Logistics Notes
                </label>
                <textarea
                  rows={4}
                  placeholder="Record custom shipping instructions, cutting room mandates, design annotations, etc."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full bg-white border border-[#fce4d4] rounded-2xl p-4 text-xs font-bold outline-none focus:ring-4 focus:ring-[#fce4d4]/50 transition-all text-foreground shadow-sm"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200/50 rounded-2xl p-4 text-xs text-blue-700 leading-relaxed font-bold flex items-start gap-2.5">
                <Package size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Placing this order automatically assigns a custom manufacturing index number (`ORD-[Quote No]-[Random]`) and stores a high-resolution Vector Barcode code sequence inside the registry for industrial scanner reading.
                </span>
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
                  className="flex-1 rounded-2xl h-12 bg-[#2d8d9b]"
                >
                  Confirm & Place Order
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 2. Modal Dialog: Printing Label tag preview */}
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
                {/* Visual preview box on screen */}
                <div className="flex-1 overflow-y-auto pr-2 no-scrollbar py-2">
                  <div className="border border-dashed border-[#8b6b5a]/30 rounded-3xl p-4 bg-white shadow-inner flex flex-col items-center justify-center">
                    <span className="text-[9px] font-black tracking-widest text-zinc-300 uppercase mb-2">Print Area Boundary</span>
                    
                    {/* The Actual printed node layout */}
                    <div id="print-label-container" className="w-[3.8in] h-[2.8in] border border-zinc-900 p-2 bg-white text-zinc-900 box-sizing-border-box flex flex-col justify-between select-none">
                      
                      {/* Label Tag Header */}
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

                      {/* Client Info Mapping */}
                      <div className="border-t border-b border-zinc-200 py-1 flex justify-between gap-2">
                        <div className="flex flex-col flex-1">
                          <span className="text-[5px] text-zinc-400 font-bold uppercase leading-none">Customer Profile</span>
                          <span className="text-[8px] font-black text-zinc-800 leading-tight mt-0.5 truncate max-w-[140px]">{printOrder.quotations?.organizations?.name}</span>
                          <span className="text-[6px] text-zinc-500 leading-none mt-0.5 truncate max-w-[140px]">{printOrder.quotations?.organizations?.address || 'No address added'}</span>
                        </div>
                        <div className="flex flex-col text-right shrink-0">
                          <span className="text-[5px] text-zinc-400 font-bold uppercase leading-none">Expected Delivery</span>
                          <span className="text-[8px] font-black text-zinc-800 leading-none mt-0.5">
                            {printOrder.quotations?.expected_delivery_date ? new Date(printOrder.quotations.expected_delivery_date).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : 'N/A'}
                          </span>
                          <span className="text-[6px] font-mono text-[#2d8d9b] font-bold mt-0.5">Quote: {printOrder.quotations?.quotation_no}</span>
                        </div>
                      </div>

                      {/* Items breakdown mini table */}
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

                      {/* Unique Vector Barcode Element */}
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
    </div>
  );
}
