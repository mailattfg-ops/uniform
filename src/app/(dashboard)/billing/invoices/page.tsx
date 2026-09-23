'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { CreditCard, Plus, Scan, Trash2, Edit3, ShieldAlert, CheckCircle2, FileCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/formatters';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface InvoiceItem {
  item_description: string;
  design_number: string;
  barcode: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

interface Invoice {
  id: number;
  invoice_no: string;
  customer_name: string;
  customer_type: string;
  is_tax_inclusive: boolean;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_status: string;
  created_at: string;
  invoice_items?: InvoiceItem[];
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerType, setCustomerType] = useState('Business');
  const [isTaxInclusive, setIsTaxInclusive] = useState(true);
  const [barcodeInput, setBarcodeInput] = useState('');

  // Line items
  const [items, setItems] = useState<InvoiceItem[]>([
    { item_description: 'Standard Uniform Set', design_number: 'DNS-001', barcode: 'BRC-1001', quantity: 1, unit_price: 1500, tax_rate: 5 }
  ]);

  const [taxMasters, setTaxMasters] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);

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

  const fetchTaxMasters = async () => {
    try {
      const res = await api.get('/taxes');
      setTaxMasters(res.data || []);
    } catch (err) {
      // Graceful fallback
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
    fetchTaxMasters();
  }, []);

  const handleAddItemByBarcode = async () => {
    if (!barcodeInput.trim()) return;
    const code = barcodeInput.trim();
    setIsScanning(true);
    try {
      const res = await api.get('/inventory/lookup', { params: { code } });
      const info = res.data;
      const defaultRate = taxMasters.find(t => t.is_default)?.rate ?? 5;

      setItems([
        ...items,
        {
          item_description: info.item_description || `Scanned Item (${code})`,
          design_number: info.design_number || code,
          barcode: info.barcode || code,
          quantity: 1,
          unit_price: info.unit_price || 850,
          tax_rate: info.tax_rate !== undefined ? info.tax_rate : defaultRate
        }
      ]);
      if (info.found) {
        toast.success(`Found in stock: ${info.item_description} (₹${info.unit_price})`);
      } else {
        toast.success(`Added barcode item: ${code}`);
      }
      setBarcodeInput('');
    } catch (err) {
      setItems([
        ...items,
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

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/invoices', {
        customer_name: customerName,
        customer_type: customerType,
        is_tax_inclusive: isTaxInclusive,
        items
      });
      toast.success('Invoice created successfully!');
      setShowCreateModal(false);
      setCustomerName('');
      fetchInvoices();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create invoice');
    }
  };

  const handleDeleteInvoice = async (id: number) => {
    if (!confirm('Are you sure? Only Branch Managers can delete invoices.')) return;
    try {
      await api.delete(`/invoices/${id}`);
      toast.success('Invoice deleted');
      fetchInvoices();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Delete restricted to Branch Manager');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-emerald-400" />
            Branch Invoicing & Counter Sales
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Document numbering (YY/MM/INV-XXXX), manual customer invoicing, instant counter sales with barcode scanner & manual entry, Branch Manager restricted actions.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition shadow-md"
        >
          <Plus className="w-4 h-4" />
          Create Invoice / Counter Sale
        </button>
      </div>

      {/* Notice Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-900 text-xs font-medium">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
        <span>
          <strong>Role Restriction Enforced:</strong> Invoice edits and deletions are strictly restricted to Branch Managers.
        </span>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-slate-800 flex justify-between items-center">
          <span>Invoices Register</span>
          <span className="text-xs font-mono text-indigo-600">Scheme: YY/MM/INV-XXXX</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/70 text-slate-600 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Invoice No</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Tax Mode</th>
                <th className="px-6 py-3">Total Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-mono font-bold text-indigo-600">{inv.invoice_no}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{inv.customer_name}</td>
                  <td className="px-6 py-4">{inv.customer_type}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      inv.is_tax_inclusive ? 'bg-indigo-50 text-indigo-700' : 'bg-purple-50 text-purple-700'
                    }`}>
                      {inv.is_tax_inclusive ? 'Tax Inclusive' : 'Tax Exclusive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(inv.total_amount)}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={inv.payment_status} size="sm" />
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <button
                      onClick={() => window.print()}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                      title="Print Invoice"
                    >
                      <FileCheck className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteInvoice(inv.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50"
                      title="Delete (Branch Manager Only)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No customer invoices generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900">Generate Branch Customer Invoice</h3>
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Customer Name / School</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. St. Mary's Academy"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Customer Type</label>
                  <select
                    value={customerType}
                    onChange={e => setCustomerType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                  >
                    <option value="Business">Business (Organisation / School)</option>
                    <option value="Individual">Individual Counter Customer</option>
                  </select>
                </div>
              </div>

              {/* Tax Toggle */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 border rounded-xl">
                <input
                  type="checkbox"
                  id="taxToggle"
                  checked={isTaxInclusive}
                  onChange={e => setIsTaxInclusive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="taxToggle" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Tax Inclusive Toggle (Checked = Tax included in unit price)
                </label>
              </div>

              {/* Barcode Scanner / Manual Input */}
              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2">
                <label className="block text-xs font-semibold text-indigo-900 flex items-center gap-1.5">
                  <Scan className="w-4 h-4 text-indigo-600" />
                  Instant Barcode Entry (Scanner or Manual Typing)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Scan or type barcode string (e.g. BRC-1002)..."
                    value={barcodeInput}
                    onChange={e => setBarcodeInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddItemByBarcode(); }}}
                    className="flex-1 px-3 py-1.5 bg-white border rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddItemByBarcode}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg"
                  >
                    Add Barcode
                  </button>
                </div>
              </div>

              {/* Line Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-600">Invoice Items</label>
                  <button
                    type="button"
                    onClick={() => setItems([
                      ...items,
                      { item_description: 'Custom Item', design_number: 'CUSTOM', barcode: '', quantity: 1, unit_price: 500, tax_rate: taxMasters.find(t => t.is_default)?.rate ?? 5 }
                    ])}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase px-2">
                  <span className="col-span-4">Description</span>
                  <span className="col-span-2">Qty</span>
                  <span className="col-span-2">Price (₹)</span>
                  <span className="col-span-2">Tax Slab (M1.2)</span>
                  <span className="col-span-2 text-right">Total</span>
                </div>

                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl text-xs">
                    <input
                      type="text"
                      placeholder="Item name"
                      value={it.item_description}
                      onChange={e => {
                        const newIt = [...items];
                        newIt[idx].item_description = e.target.value;
                        setItems(newIt);
                      }}
                      className="col-span-4 px-2 py-1 border rounded bg-white"
                    />
                    <input
                      type="number"
                      min="1"
                      value={it.quantity}
                      onChange={e => {
                        const newIt = [...items];
                        newIt[idx].quantity = Math.max(1, Number(e.target.value));
                        setItems(newIt);
                      }}
                      className="col-span-2 px-2 py-1 border rounded bg-white text-center"
                    />
                    <input
                      type="number"
                      min="0"
                      value={it.unit_price}
                      onChange={e => {
                        const newIt = [...items];
                        newIt[idx].unit_price = Number(e.target.value);
                        setItems(newIt);
                      }}
                      className="col-span-2 px-2 py-1 border rounded bg-white text-right"
                    />
                    <select
                      value={it.tax_rate}
                      onChange={e => {
                        const newIt = [...items];
                        newIt[idx].tax_rate = Number(e.target.value);
                        setItems(newIt);
                      }}
                      className="col-span-2 px-1.5 py-1 border rounded bg-white text-xs"
                    >
                      {taxMasters.map(t => (
                        <option key={t.id} value={t.rate}>{t.rate}% {t.name.split('-')[0]}</option>
                      ))}
                    </select>
                    <div className="col-span-2 flex items-center justify-end gap-1.5">
                      <span className="font-bold text-slate-800 text-xs">
                        ₹{(it.quantity * it.unit_price).toLocaleString()}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setItems(items.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-red-500 font-bold px-1"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Subtotal & Tax Calculation Summary */}
                <div className="p-3 bg-slate-100/80 rounded-xl space-y-1 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span>Tax Exclusive Subtotal:</span>
                    <span className="font-mono font-semibold">
                      ₹{items.reduce((s, it) => s + it.quantity * it.unit_price, 0).toLocaleString()}
                    </span>
                  </div>
                  {!isTaxInclusive && (
                    <div className="flex justify-between text-indigo-700">
                      <span>Calculated GST Tax:</span>
                      <span className="font-mono font-semibold">
                        ₹{items.reduce((s, it) => s + (it.quantity * it.unit_price * (it.tax_rate / 100)), 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm text-slate-900 border-t pt-1">
                    <span>Estimated Total Payable:</span>
                    <span className="font-mono text-emerald-700">
                      ₹{Math.round(
                        isTaxInclusive
                          ? items.reduce((s, it) => s + it.quantity * it.unit_price, 0)
                          : items.reduce((s, it) => s + it.quantity * it.unit_price + (it.quantity * it.unit_price * (it.tax_rate / 100)), 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-md"
                >
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
