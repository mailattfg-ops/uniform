'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  TrendingUp,
  CreditCard,
  History,
  Plus,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowLeft,
  Calendar,
  X,
  FileText
} from 'lucide-react';

interface Quotation {
  id: number;
  quotation_no: string;
  title: string;
  organization_id: number;
  organizations?: { name: string };
  final_quote_value: number;
  paid_amount: number;
  payment_status: string; // Pending, Partially Paid, Paid
  status: string; // Approved, Draft, Sent, etc.
  created_at: string;
}

interface Payment {
  id: number;
  quotation_id: number;
  amount: number;
  payment_method: string;
  reference_no: string;
  notes: string;
  paid_at: string;
  created_at: string;
}

export default function InitialPaymentPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'awaiting' | 'completed'>('awaiting');

  // Modal / Drawer state for recording payment
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paidAtDate, setPaidAtDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Modal / Drawer state for viewing payment history
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/quotations');
      // Filter for approved quotations
      const approved = response.data.filter((q: Quotation) => q.status === 'Approved');
      setQuotations(approved);
    } catch (err: any) {
      toast.error('Failed to load approved quotations: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPaymentModal = (quote: Quotation) => {
    setSelectedQuotation(quote);
    const remaining = quote.final_quote_value - (quote.paid_amount || 0);
    setPaymentAmount(remaining > 0 ? remaining.toFixed(2) : '');
    setPaymentMethod('Cash');
    setReferenceNo('');
    setPaymentNotes('');
    setPaidAtDate(new Date().toISOString().split('T')[0]);
    setIsPaymentModalOpen(true);
  };

  const handleOpenHistoryModal = async (quote: Quotation) => {
    setSelectedQuotation(quote);
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);
    try {
      const response = await api.get(`/payments/quotation/${quote.id}`);
      setPaymentHistory(response.data || []);
    } catch (err: any) {
      toast.error('Failed to load payment history: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuotation) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount greater than zero.');
      return;
    }

    const remaining = selectedQuotation.final_quote_value - (selectedQuotation.paid_amount || 0);
    if (amount > remaining + 0.01) {
      if (!confirm(`Warning: The entered amount ($${amount}) exceeds the remaining balance ($${remaining.toFixed(2)}). Do you wish to proceed?`)) {
        return;
      }
    }

    setIsSubmittingPayment(true);
    try {
      await api.post('/payments', {
        quotation_id: selectedQuotation.id,
        amount,
        payment_method: paymentMethod,
        reference_no: referenceNo,
        notes: paymentNotes,
        paid_at: new Date(paidAtDate).toISOString()
      });

      toast.success('Payment recorded successfully!');
      setIsPaymentModalOpen(false);
      fetchQuotations();
    } catch (err: any) {
      toast.error('Failed to record payment: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Math Statistics
  const stats = React.useMemo(() => {
    const totalApprovedVal = quotations.reduce((sum, q) => sum + parseFloat(q.final_quote_value as any || 0), 0);
    const totalCollectedVal = quotations.reduce((sum, q) => sum + parseFloat(q.paid_amount as any || 0), 0);
    const totalOutstandingVal = Math.max(0, totalApprovedVal - totalCollectedVal);
    const fullyPaidQuotes = quotations.filter(q => q.payment_status === 'Paid').length;
    const partialPaidQuotes = quotations.filter(q => q.payment_status === 'Partially Paid').length;

    return {
      totalApprovedVal,
      totalCollectedVal,
      totalOutstandingVal,
      fullyPaidQuotes,
      partialPaidQuotes,
    };
  }, [quotations]);

  // Filter lists based on tab
  const displayedQuotations = React.useMemo(() => {
    if (activeSubTab === 'awaiting') {
      return quotations.filter(q => q.payment_status !== 'Paid');
    } else {
      return quotations.filter(q => q.payment_status === 'Paid');
    }
  }, [quotations, activeSubTab]);

  const columns: Column<Quotation>[] = [
    {
      header: 'Quote No',
      accessor: (item) => (
        <span className="font-mono font-bold text-zinc-900">{item.quotation_no}</span>
      )
    },
    {
      header: 'Title & Client',
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
      header: 'Quotation Value',
      accessor: (item) => (
        <span className="font-black text-[#2d8d9b] text-base">
          ${parseFloat(item.final_quote_value as any || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Collected',
      accessor: (item) => (
        <span className="font-bold text-emerald-600 text-sm">
          ${parseFloat(item.paid_amount as any || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Remaining',
      accessor: (item) => {
        const remaining = Math.max(0, item.final_quote_value - (item.paid_amount || 0));
        return (
          <span className={`font-black text-sm ${remaining > 0 ? 'text-amber-600' : 'text-zinc-400'}`}>
            ${remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      }
    },
    {
      header: 'Payment Status',
      accessor: (item) => {
        const stat = item.payment_status || 'Pending';
        const styles = {
          'Paid': 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
          'Partially Paid': 'bg-amber-50 text-amber-700 border-amber-200/50',
          'Pending': 'bg-rose-50 text-rose-700 border-rose-200/50'
        }[stat] || 'bg-zinc-50 text-zinc-700 border-zinc-200/50';

        const icon = {
          'Paid': <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
          'Partially Paid': <Clock className="w-3.5 h-3.5 text-amber-600" />,
          'Pending': <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
        }[stat] || <AlertTriangle className="w-3.5 h-3.5 text-zinc-600" />;

        return (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider ${styles}`}>
            {icon}
            {stat}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      accessor: (item) => {
        const isPaid = item.payment_status === 'Paid';
        return (
          <div className="flex gap-2">
            {!isPaid && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenPaymentModal(item)}
                className="rounded-xl flex items-center gap-1 text-[10px] font-black tracking-wider bg-[#2d8d9b]"
              >
                <Plus size={12} strokeWidth={3} />
                Record Payment
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenHistoryModal(item)}
              className="rounded-xl flex items-center gap-1 text-[10px] font-black tracking-wider border-[#fce4d4]"
            >
              <History size={12} />
              History
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="p-4 md:p-8 space-y-8 bg-zinc-50/50 min-h-screen">
      {/* Top Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic tracking-tight text-[#3a525d]">Initial Payment Collection</h1>
          <p className="text-xs text-[#2d8d9b] font-black uppercase tracking-[0.2em] mt-1">
            Fulfillment Pipeline &gt; Payment Registries
          </p>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="solid" className="p-6 flex items-center gap-4 bg-gradient-to-br from-white to-[#fce4d4]/10">
          <div className="w-12 h-12 rounded-2xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b]">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Total Contract Value</p>
            <p className="text-xl font-black text-[#3a525d] mt-0.5">
              ${stats.totalApprovedVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </Card>

        <Card variant="solid" className="p-6 flex items-center gap-4 bg-gradient-to-br from-white to-emerald-50/10">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100/50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Collected Revenue</p>
            <p className="text-xl font-black text-emerald-600 mt-0.5">
              ${stats.totalCollectedVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </Card>

        <Card variant="solid" className="p-6 flex items-center gap-4 bg-gradient-to-br from-white to-amber-50/10">
          <div className="w-12 h-12 rounded-2xl bg-amber-100/50 flex items-center justify-center text-amber-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Outstanding Balance</p>
            <p className="text-xl font-black text-amber-600 mt-0.5">
              ${stats.totalOutstandingVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </Card>

        <Card variant="solid" className="p-6 flex items-center gap-4 bg-gradient-to-br from-white to-blue-50/10">
          <div className="w-12 h-12 rounded-2xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b]">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Fulfillment Statuses</p>
            <p className="text-base font-black text-[#3a525d] mt-0.5">
              {stats.fullyPaidQuotes} Paid / {stats.partialPaidQuotes} Partial
            </p>
          </div>
        </Card>
      </div>

      {/* Tab Selectors */}
      <div className="flex gap-2 border-b border-zinc-200 pb-px">
        <button
          onClick={() => setActiveSubTab('awaiting')}
          className={`pb-4 px-6 font-black text-xs uppercase tracking-wider border-b-2 transition-colors ${activeSubTab === 'awaiting'
              ? 'border-[#2d8d9b] text-[#2d8d9b]'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
        >
          Awaiting Payment ({quotations.filter(q => q.payment_status !== 'Paid').length})
        </button>
        <button
          onClick={() => setActiveSubTab('completed')}
          className={`pb-4 px-6 font-black text-xs uppercase tracking-wider border-b-2 transition-colors ${activeSubTab === 'completed'
              ? 'border-[#2d8d9b] text-[#2d8d9b]'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
        >
          Paid & Completed ({quotations.filter(q => q.payment_status === 'Paid').length})
        </button>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={displayedQuotations}
        title={activeSubTab === 'awaiting' ? 'Quotations Awaiting Payment' : 'Paid & Settled Quotations'}
        subtitle="Tracking deposit entries and ledger transitions in real time"
        isLoading={isLoading}
        searchPlaceholder="Filter by quotation no, customer, title..."
      />

      {/* 1. Record Payment Modal Dialog */}
      {isPaymentModalOpen && selectedQuotation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <Card variant="solid" className="w-full max-w-lg p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200 rounded-[2.5rem] border border-[#fce4d4] max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-6 border-b border-[#fce4d4]/60 pb-4 shrink-0">
              <div>
                <h3 className="text-xl font-black italic tracking-tight text-[#3a525d]">Record Payment</h3>
                <p className="text-[10px] text-[#2d8d9b] font-black uppercase tracking-wider mt-0.5">
                  Quote: {selectedQuotation.quotation_no} - {selectedQuotation.title}
                </p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors flex items-center justify-center text-zinc-500 shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto pr-2 space-y-5 py-2 no-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black tracking-widest uppercase text-zinc-400 mb-1.5">
                      Quotation Final Value
                    </label>
                    <div className="bg-zinc-50 rounded-2xl py-3.5 px-4 font-mono font-black text-[#3a525d] border border-zinc-100 text-sm">
                      ${parseFloat(selectedQuotation.final_quote_value as any || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black tracking-widest uppercase text-zinc-400 mb-1.5">
                      Paid Till Date
                    </label>
                    <div className="bg-zinc-50 rounded-2xl py-3.5 px-4 font-mono font-bold text-emerald-600 border border-zinc-100 text-sm">
                      ${parseFloat(selectedQuotation.paid_amount as any || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black tracking-widest uppercase text-zinc-400 mb-1.5">
                      Remaining Balance
                    </label>
                    <div className="bg-zinc-50 rounded-2xl py-3.5 px-4 font-mono font-bold text-amber-600 border border-zinc-100 text-sm">
                      ${Math.max(0, selectedQuotation.final_quote_value - (selectedQuotation.paid_amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black tracking-widest uppercase text-[#8b6b5a] mb-1.5">
                    Payment Amount (₹) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="rounded-2xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black tracking-widest uppercase text-[#8b6b5a] mb-1.5">
                      Payment Method *
                    </label>
                    <Select
                      value={paymentMethod}
                      onChange={(val) => setPaymentMethod(val)}
                      options={[
                        { value: 'Cash', label: 'Cash' },
                        { value: 'Bank Transfer', label: 'Bank Transfer' },
                        { value: 'Card', label: 'Credit/Debit Card' },
                        { value: 'Cheque', label: 'Cheque' }
                      ]}
                      className="rounded-2xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black tracking-widest uppercase text-[#8b6b5a] mb-1.5">
                      Transaction Ref / Cheque No
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. TXN-192847"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      className="rounded-2xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black tracking-widest uppercase text-[#8b6b5a] mb-1.5">
                    Payment Date *
                  </label>
                  <div className="relative">
                    <Input
                      type="date"
                      required
                      value={paidAtDate}
                      onChange={(e) => setPaidAtDate(e.target.value)}
                      className="rounded-2xl pl-10"
                    />
                    <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black tracking-widest uppercase text-[#8b6b5a] mb-1.5">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Record bank codes, depositor identity, etc."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full bg-white border border-[#fce4d4] rounded-2xl p-4 text-xs font-bold outline-none focus:ring-4 focus:ring-[#fce4d4]/50 transition-all text-foreground shadow-sm"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-[#fce4d4]/60 mt-4 shrink-0">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 rounded-2xl h-12"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmittingPayment}
                  className="flex-1 rounded-2xl h-12 bg-[#2d8d9b]"
                >
                  Record Payment
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 2. View Payment History Modal Dialog */}
      {isHistoryModalOpen && selectedQuotation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <Card variant="solid" className="w-full max-w-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200 rounded-[2.5rem] border border-[#fce4d4] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-6 border-b border-[#fce4d4]/60 pb-4 shrink-0">
              <div>
                <h3 className="text-xl font-black italic tracking-tight text-[#3a525d]">Payment Transactions</h3>
                <p className="text-[10px] text-[#2d8d9b] font-black uppercase tracking-wider mt-0.5">
                  History for {selectedQuotation.quotation_no} - {selectedQuotation.title}
                </p>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors flex items-center justify-center text-zinc-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar py-2">
              <div className="grid grid-cols-3 gap-4 bg-[#fce4d4]/10 rounded-2xl p-4 border border-[#fce4d4]/40 shrink-0 text-center">
                <div>
                  <span className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest">Quote Value</span>
                  <span className="font-black text-sm text-[#3a525d]">${parseFloat(selectedQuotation.final_quote_value as any || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest font-black">Total Paid</span>
                  <span className="font-black text-sm text-emerald-600">${parseFloat(selectedQuotation.paid_amount as any || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest">Balance</span>
                  <span className="font-black text-sm text-amber-600">${Math.max(0, selectedQuotation.final_quote_value - (selectedQuotation.paid_amount || 0)).toFixed(2)}</span>
                </div>
              </div>

              <h4 className="text-[10px] font-black tracking-widest uppercase text-zinc-400 mt-6 mb-2">Ledger Logs</h4>

              {isLoadingHistory ? (
                <div className="space-y-3 py-6">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-16 bg-zinc-50 border border-zinc-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : paymentHistory.length > 0 ? (
                <div className="space-y-3">
                  {paymentHistory.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 border border-zinc-100 rounded-2xl hover:bg-[#fce4d4]/5 transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <CreditCard size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-zinc-800">${parseFloat(p.amount as any || 0).toFixed(2)}</span>
                            <span className="text-[9px] font-black uppercase bg-zinc-100 px-2 py-0.5 rounded text-zinc-600 tracking-wider">
                              {p.payment_method}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 font-medium mt-1">
                            {p.notes || 'No notes added'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {p.reference_no && (
                          <div className="text-[10px] font-mono font-bold text-zinc-400 uppercase">
                            Ref: {p.reference_no}
                          </div>
                        )}
                        <div className="text-[10px] text-zinc-400 font-bold mt-1 flex items-center gap-1 justify-end">
                          <Calendar size={10} />
                          {new Date(p.paid_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 border border-dashed border-zinc-200 rounded-2xl">
                  <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                  <p className="text-sm font-black italic text-[#3a525d]">No payments recorded yet</p>
                  <p className="text-xs text-zinc-400 font-bold mt-1">
                    Click &quot;Record Payment&quot; to register a deposit line.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#fce4d4]/60 mt-6 shrink-0">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsHistoryModalOpen(false)}
                className="w-full rounded-2xl h-12"
              >
                Close History
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
