'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { X, CreditCard, Calendar, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import toast from '@/components/ui/toast';
import api from '@/lib/api';
import { Quotation } from '../page';

interface RecordAdvancePaymentModalProps {
  quotation: Quotation | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RecordAdvancePaymentModal: React.FC<RecordAdvancePaymentModalProps> = ({
  quotation,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [referenceNo, setReferenceNo] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finalValue = parseFloat(String(quotation?.final_quote_value || 0));
  const paidAmount = parseFloat(String(quotation?.paid_amount || 0));
  const remainingBalance = Math.max(0, finalValue - paidAmount);

  useEffect(() => {
    if (quotation) {
      // Default to 50% advance or remaining balance
      const defaultAdvance = remainingBalance > 0 ? (remainingBalance >= finalValue * 0.5 ? (finalValue * 0.5).toFixed(2) : remainingBalance.toFixed(2)) : '0.00';
      setPaymentAmount(defaultAdvance);
      setPaymentMethod('Bank Transfer');
      setReferenceNo('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentNotes(`Advance payment for Quotation #${quotation.quotation_no}`);
    }
  }, [quotation, finalValue, remainingBalance]);

  if (!isOpen || !quotation) return null;

  const handleApplyPreset = (percent: number) => {
    const calc = Math.min(remainingBalance, (finalValue * percent) / 100);
    setPaymentAmount(calc.toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (amount > remainingBalance + 0.01) {
      if (!confirm(`Warning: The entered amount (₹${amount.toLocaleString('en-IN')}) exceeds the remaining balance (₹${remainingBalance.toLocaleString('en-IN')}). Do you wish to proceed?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Recording advance payment...');

    try {
      await api.post('/payments', {
        quotation_id: quotation.id,
        amount,
        payment_method: paymentMethod,
        reference_no: referenceNo.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
        paid_at: new Date(paymentDate).toISOString()
      });

      toast.success(`Advance payment of ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} recorded successfully!`, { id: toastId });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to record advance payment', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <Card variant="solid" className="w-full max-w-lg p-6 md:p-8 animate-in zoom-in-95 duration-200 rounded-[2.5rem] border border-zinc-200 max-h-[92vh] flex flex-col relative overflow-hidden bg-white shadow-2xl">
        {/* Brand Accent Rail */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-[#2d8d9b] absolute top-0 left-0 right-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-5 border-b border-zinc-100 pb-4 shrink-0 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CreditCard size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900 tracking-tight">Record Advance Payment</h3>
              <p className="text-[11px] text-zinc-500 font-medium">
                Quote: <span className="font-mono font-bold text-[#C82A2B]">#{quotation.quotation_no}</span>
                <span className="mx-1.5 text-zinc-300">•</span>
                <span className="text-zinc-700 font-bold truncate">{quotation.organizations?.name || 'Customer'}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors flex items-center justify-center text-zinc-500 shrink-0 cursor-pointer"
            title="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden space-y-4">
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {/* Financial Status Summary Cards */}
            <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80">
              <div className="space-y-0.5">
                <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider block">Quote Value</span>
                <span className="text-xs font-mono font-black text-zinc-900 block truncate">
                  ₹{finalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-black uppercase text-emerald-600 tracking-wider block">Paid Till Date</span>
                <span className="text-xs font-mono font-bold text-emerald-700 block truncate">
                  ₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-black uppercase text-amber-600 tracking-wider block">Remaining</span>
                <span className="text-xs font-mono font-bold text-amber-700 block truncate">
                  ₹{remainingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Quick Percentage Presets */}
            {remainingBalance > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">
                  Quick Advance Amount
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(30)}
                    className="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50 text-zinc-700 hover:text-emerald-800 transition-all cursor-pointer"
                  >
                    30% (₹{((finalValue * 30) / 100).toLocaleString('en-IN')})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(50)}
                    className="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50 text-zinc-700 hover:text-emerald-800 transition-all cursor-pointer"
                  >
                    50% (₹{((finalValue * 50) / 100).toLocaleString('en-IN')})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(remainingBalance.toFixed(2))}
                    className="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50 text-zinc-700 hover:text-emerald-800 transition-all cursor-pointer"
                  >
                    Full Balance
                  </button>
                </div>
              </div>
            )}

            {/* Payment Amount */}
            <div className="space-y-1">
              <label className="block text-[10px] font-black tracking-widest uppercase text-zinc-700">
                Advance Payment Amount (₹) *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="rounded-xl font-mono font-bold text-sm"
              />
            </div>

            {/* Method & Ref No */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-black tracking-widest uppercase text-zinc-700">
                  Payment Method *
                </label>
                <Select
                  value={paymentMethod}
                  onChange={(val) => setPaymentMethod(val)}
                  options={[
                    { value: 'Bank Transfer', label: 'Bank Transfer' },
                    { value: 'UPI', label: 'UPI / GPay / PhonePe' },
                    { value: 'Cash', label: 'Cash' },
                    { value: 'Card', label: 'Credit/Debit Card' },
                    { value: 'Cheque', label: 'Cheque' }
                  ]}
                  className="rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black tracking-widest uppercase text-zinc-700">
                  Txn / UTR / Cheque Ref
                </label>
                <Input
                  type="text"
                  placeholder="e.g. UTR-928471"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Payment Date */}
            <div className="space-y-1">
              <label className="block text-[10px] font-black tracking-widest uppercase text-zinc-700">
                Payment Date *
              </label>
              <div className="relative">
                <Input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="rounded-xl text-xs pl-9"
                />
                <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="block text-[10px] font-black tracking-widest uppercase text-zinc-700">
                Remarks / Notes
              </label>
              <textarea
                rows={2}
                placeholder="Bank code, branch, depositor name, etc."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-xl p-3 text-xs font-medium outline-hidden focus:ring-2 focus:border-emerald-600 focus:ring-emerald-500/20 transition-all text-zinc-900 resize-none placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-zinc-100 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 py-2.5 text-[10px] font-black uppercase rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 text-[10px] font-black uppercase text-white rounded-xl bg-[#C82A2B] hover:bg-[#A81D1E] shadow-lg shadow-[#C82A2B]/20 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={13} />
              <span>{isSubmitting ? 'Recording...' : 'Record Payment'}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
