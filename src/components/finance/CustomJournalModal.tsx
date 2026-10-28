'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import toast from '@/components/ui/toast';

interface JournalRow {
  id: string;
  account: string;
  description: string;
  contact: string;
  debit: string;
  credit: string;
}

interface CustomJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (journal: any) => void;
  customerName?: string;
  customerId?: string | number;
}

export default function CustomJournalModal({
  isOpen,
  onClose,
  onSave,
  customerName = '',
  customerId = ''
}: CustomJournalModalProps) {
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [journalNo, setJournalNo] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [currency, setCurrency] = useState('INR - Indian Rupee');

  const accountOptions = useMemo(() => {
    const cName = customerName?.trim() || 'Customer';
    return ['Inland Uniforms', cName];
  }, [customerName]);

  const [rows, setRows] = useState<JournalRow[]>([
    {
      id: 'row-1',
      account: 'Inland Uniforms',
      description: '',
      contact: customerName,
      debit: '',
      credit: ''
    },
    {
      id: 'row-2',
      account: customerName || 'Customer',
      description: '',
      contact: customerName,
      debit: '',
      credit: ''
    }
  ]);

  useEffect(() => {
    if (isOpen) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      setJournalNo(`JN-${new Date().getFullYear()}-${randomSuffix}`);
      setJournalDate(new Date().toISOString().split('T')[0]);
      setTitle('');
      setNotes('');
      setReferenceNo('');
      setCurrency('INR - Indian Rupee');
      const cName = customerName?.trim() || 'Customer';
      setRows([
        {
          id: 'row-1',
          account: 'Inland Uniforms',
          description: '',
          contact: cName,
          debit: '',
          credit: ''
        },
        {
          id: 'row-2',
          account: cName,
          description: '',
          contact: cName,
          debit: '',
          credit: ''
        }
      ]);
    }
  }, [isOpen, customerName]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    setRows(prev => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        account: 'Inland Uniforms',
        description: '',
        contact: customerName || 'Customer',
        debit: '',
        credit: ''
      }
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 2) {
      toast.error('A double-entry journal requires at least two account lines.');
      return;
    }
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleRowChange = (id: string, field: keyof JournalRow, value: string) => {
    setRows(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };

        // Double-entry rule: Line cannot have both Debit and Credit
        if (field === 'debit' && value !== '') {
          updated.credit = '';
        } else if (field === 'credit' && value !== '') {
          updated.debit = '';
        }

        return updated;
      })
    );
  };

  const totalDebits = rows.reduce((sum, r) => sum + (parseFloat(r.debit) || 0), 0);
  const totalCredits = rows.reduce((sum, r) => sum + (parseFloat(r.credit) || 0), 0);
  const difference = Math.abs(totalDebits - totalCredits);
  const isBalanced = totalDebits > 0 && difference < 0.01;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Journal Title is mandatory (*)');
      return;
    }

    if (!notes.trim()) {
      toast.error('Notes field is mandatory (*)');
      return;
    }

    if (totalDebits <= 0 || totalCredits <= 0) {
      toast.error('Please enter positive debit and credit amounts.');
      return;
    }

    if (!isBalanced) {
      toast.error(`Journal is not balanced! Difference is ₹${difference.toFixed(2)}. Debits must equal Credits.`);
      return;
    }

    const activeRows = rows.filter(
      r => (parseFloat(r.debit) || 0) > 0 || (parseFloat(r.credit) || 0) > 0
    );

    const hasEmptyAccount = activeRows.some(r => !r.account.trim());
    if (hasEmptyAccount) {
      toast.error('Please select an account for every entry line.');
      return;
    }

    const debitedAccounts = activeRows.filter(r => (parseFloat(r.debit) || 0) > 0).map(r => r.account);
    const creditedAccounts = activeRows.filter(r => (parseFloat(r.credit) || 0) > 0).map(r => r.account);

    const journalEntry = {
      id: `CUSTOM-JN-${Date.now()}`,
      journal_no: journalNo.trim() || `JN-${Date.now().toString().slice(-4)}`,
      reference_no: referenceNo.trim() || undefined,
      title: title.trim(),
      date: journalDate,
      notes: notes.trim(),
      currency,
      rows: activeRows,
      total_debit: totalDebits,
      total_credit: totalCredits,
      account_summary: debitedAccounts[0] ? `${debitedAccounts[0]} (Dr)` : 'Custom Journal',
      offset_summary: creditedAccounts[0] ? `${creditedAccounts[0]} (Cr)` : 'General Ledger',
      created_at: new Date().toISOString()
    };

    onSave(journalEntry);
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-zinc-200/80 overflow-hidden relative z-10 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Top Brand Accent Rail */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#801416] via-[#C82A2B] to-[#9E1B1D]" />

        {/* Top Header */}
        <div className="px-8 py-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black tracking-tight text-zinc-900">New Journal</h2>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FFF1F1] text-[#9E1B1D] border border-[#C82A2B]/15">
              General Finance Voucher
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-200/60 rounded-xl transition-colors text-zinc-500 hover:text-zinc-800 border-none bg-transparent cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          {/* Top Metadata Row: Date, Journal #, Reference # */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                Date<span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={journalDate}
                onChange={e => setJournalDate(e.target.value)}
                required
                className="w-full h-10 px-3.5 bg-white border border-zinc-300 rounded-xl text-xs font-semibold text-zinc-800 outline-none focus:ring-2 focus:ring-[#C82A2B]/15 focus:border-[#C82A2B] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                Journal #<span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={journalNo}
                onChange={e => setJournalNo(e.target.value)}
                required
                placeholder="e.g. JN-2026-0001"
                className="w-full h-10 px-3.5 bg-white border border-zinc-300 rounded-xl text-xs font-mono font-bold text-zinc-800 outline-none focus:ring-2 focus:ring-[#C82A2B]/15 focus:border-[#C82A2B] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                Reference #
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={e => setReferenceNo(e.target.value)}
                placeholder="e.g. REF-0941 or Bank Ref"
                className="w-full h-10 px-3.5 bg-white border border-zinc-300 rounded-xl text-xs font-semibold text-zinc-800 outline-none focus:ring-2 focus:ring-[#C82A2B]/15 focus:border-[#C82A2B] transition-all"
              />
            </div>
          </div>

          {/* Row 2: Title and Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                Journal Title<span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                placeholder="e.g. Uniform Advance Settlement, Material Adjustment, Credit Concession"
                className="w-full h-10 px-3.5 bg-white border border-zinc-300 rounded-xl text-xs font-semibold text-zinc-800 outline-none focus:ring-2 focus:ring-[#C82A2B]/15 focus:border-[#C82A2B] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full h-10 px-3.5 bg-white border border-zinc-300 rounded-xl text-xs font-semibold text-zinc-800 outline-none focus:ring-2 focus:ring-[#C82A2B]/15 focus:border-[#C82A2B] transition-all cursor-pointer"
              >
                <option value="INR - Indian Rupee">INR - Indian Rupee</option>
                <option value="USD - United States Dollar">USD - United States Dollar</option>
                <option value="EUR - Euro">EUR - Euro</option>
                <option value="AED - UAE Dirham">AED - UAE Dirham</option>
              </select>
            </div>
          </div>

          {/* Notes* */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5">
              Notes<span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              required
              placeholder="e.g. Transfer or loan adjustment / customer settlement narration"
              className="w-full p-3 bg-white border border-zinc-300 rounded-xl text-xs font-medium text-zinc-800 outline-none focus:ring-2 focus:ring-[#C82A2B]/15 focus:border-[#C82A2B] transition-all resize-y"
            />
          </div>

          {/* Journal Entries Grid */}
          <div className="border border-zinc-200 rounded-2xl overflow-hidden mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                    <th className="py-3 px-4 w-[30%]">Account</th>
                    <th className="py-3 px-4 w-[24%]">Description</th>
                    <th className="py-3 px-4 w-[20%]">Contact (INR)</th>
                    <th className="py-3 px-4 w-[13%] text-right">Debits</th>
                    <th className="py-3 px-4 w-[13%] text-right">Credits</th>
                    <th className="py-3 px-3 w-[40px] text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50/50 transition-colors">
                      {/* Account Dropdown */}
                      <td className="py-2.5 px-4 align-top">
                        <select
                          value={row.account}
                          onChange={e => handleRowChange(row.id, 'account', e.target.value)}
                          className="w-full h-9 px-2.5 bg-white border border-zinc-250 rounded-lg text-xs font-semibold text-zinc-800 outline-none focus:border-[#C82A2B] transition-all cursor-pointer"
                        >
                          {accountOptions.map(acc => (
                            <option key={acc} value={acc}>
                              {acc}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Description Textarea */}
                      <td className="py-2.5 px-4 align-top">
                        <textarea
                          rows={1}
                          value={row.description}
                          onChange={e => handleRowChange(row.id, 'description', e.target.value)}
                          placeholder="Description"
                          className="w-full p-2 bg-white border border-zinc-250 rounded-lg text-xs text-zinc-700 outline-none focus:border-[#C82A2B] transition-all resize-y min-h-[36px]"
                        />
                      </td>

                      {/* Contact Selector */}
                      <td className="py-2.5 px-4 align-top">
                        <select
                          value={row.contact}
                          onChange={e => handleRowChange(row.id, 'contact', e.target.value)}
                          className="w-full h-9 px-2.5 bg-white border border-zinc-250 rounded-lg text-xs font-medium text-zinc-700 outline-none focus:border-[#C82A2B] transition-all cursor-pointer"
                        >
                          {customerName && <option value={customerName}>{customerName}</option>}
                          <option value="Inland Uniforms">Inland Uniforms</option>
                        </select>
                      </td>

                      {/* Debits Input */}
                      <td className="py-2.5 px-4 align-top">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.debit}
                          onChange={e => handleRowChange(row.id, 'debit', e.target.value)}
                          placeholder="0.00"
                          className="w-full h-9 px-2.5 text-right font-mono font-bold bg-white border border-zinc-250 rounded-lg text-xs text-zinc-900 outline-none focus:border-[#C82A2B] transition-all"
                        />
                      </td>

                      {/* Credits Input */}
                      <td className="py-2.5 px-4 align-top">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.credit}
                          onChange={e => handleRowChange(row.id, 'credit', e.target.value)}
                          placeholder="0.00"
                          className="w-full h-9 px-2.5 text-right font-mono font-bold bg-white border border-zinc-250 rounded-lg text-xs text-emerald-700 outline-none focus:border-[#C82A2B] transition-all"
                        />
                      </td>

                      {/* Delete Row Button */}
                      <td className="py-2.5 px-2 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors border-none bg-transparent cursor-pointer"
                          title="Remove row"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* + Add New Row Button */}
            <div className="p-3 bg-zinc-50/50 border-t border-zinc-200">
              <Button
                type="button"
                onClick={handleAddRow}
                variant="secondary"
                className="h-8 px-3 rounded-lg text-xs font-bold text-[#C82A2B] hover:text-white hover:bg-[#C82A2B] border border-[#C82A2B]/30 bg-white flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
              >
                <Plus size={14} /> Add New Row
              </Button>
            </div>
          </div>

          {/* Bottom Totals Panel */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
            <div className="text-xs text-zinc-400">
              <span className="font-semibold text-zinc-600">Note:</span> Total debits must equal total credits before saving.
            </div>

            <div className="w-full sm:w-[380px] bg-zinc-50/80 border border-zinc-200 rounded-2xl p-5 space-y-2.5">
              <div className="flex justify-between items-center text-xs font-semibold text-zinc-600">
                <span>Sub Total</span>
                <div className="flex items-center gap-6 font-mono text-zinc-800">
                  <span>{totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  <span>{totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm font-black text-zinc-900 border-t border-zinc-200 pt-2">
                <span>Total (₹)</span>
                <div className="flex items-center gap-6 font-mono">
                  <span>{totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  <span className="text-emerald-700">{totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs pt-1 border-t border-zinc-200">
                <span className="font-bold text-zinc-700">Difference</span>
                <span className={`font-mono font-black ${isBalanced ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isBalanced ? (
                    <span className="flex items-center gap-1 text-emerald-600 text-[11px]">
                      <CheckCircle2 size={13} /> Balanced (₹0.00)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-600 text-[11px]">
                      <AlertCircle size={13} /> ₹{difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-zinc-200">
            <Button
              type="submit"
              disabled={!isBalanced}
              className="h-10 px-8 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-[#C82A2B] hover:bg-[#A81D1E] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#C82A2B]/20 transition-all cursor-pointer"
            >
              Save
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="h-10 px-6 rounded-xl font-bold text-xs uppercase tracking-wider text-zinc-600 border border-zinc-300 hover:bg-zinc-100 bg-white transition-all cursor-pointer"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
