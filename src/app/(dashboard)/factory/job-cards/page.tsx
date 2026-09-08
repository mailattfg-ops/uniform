'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { FileText, Check, X, Pause, QrCode, Printer, Plus, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface JobCard {
  id: number;
  job_card_no: string;
  order_id: number;
  item_name: string;
  design_number: string;
  quantity: number;
  status: string;
  po_handler_action: string;
  po_handler_reason: string;
  hold_reason: string;
  created_at: string;
  orders?: {
    order_no: string;
    customer_name: string;
  };
}

export default function JobCardsPage() {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<JobCard | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'Accept' | 'Reject' | 'Hold'>('Accept');
  const [reason, setReason] = useState('');

  // Create Job Card modal
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [itemName, setItemName] = useState('');
  const [designNumber, setDesignNumber] = useState('');
  const [quantity, setQuantity] = useState('1');

  const fetchJobCards = async () => {
    try {
      setLoading(true);
      const res = await api.get('/job-cards');
      setJobCards(res.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to fetch job cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobCards();
  }, []);

  const handlePOAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard) return;

    try {
      await api.put(`/job-cards/${selectedCard.id}/po-handler-action`, {
        action: actionType,
        reason
      });
      toast.success(`Job Card marked as ${actionType}`);
      setShowActionModal(false);
      setReason('');
      fetchJobCards();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  };

  const handleRaiseJobCard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/job-cards/raise', {
        order_id: Number(orderId),
        item_name: itemName,
        design_number: designNumber,
        quantity: Number(quantity)
      });
      toast.success('Job Card raised successfully!');
      setShowRaiseModal(false);
      setItemName('');
      setDesignNumber('');
      fetchJobCards();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to raise job card');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-7 h-7 text-amber-400" />
            Factory Job Cards & PO Handler Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            P1.3 Scope — Per-item job cards, Factory PO Handler actions (Accept/Reject/Hold), and inline barcodes.
          </p>
        </div>
        <button
          onClick={() => setShowRaiseModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition shadow-md"
        >
          <Plus className="w-4 h-4" />
          Raise Job Card
        </button>
      </div>

      {/* Cards list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobCards.map(jc => (
          <div key={jc.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-indigo-300 transition">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono text-xs font-bold text-slate-500">{jc.job_card_no}</span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">{jc.item_name}</h3>
                {jc.design_number && (
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-medium">
                    {jc.design_number}
                  </span>
                )}
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                jc.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800' :
                jc.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                jc.status === 'Hold' ? 'bg-amber-100 text-amber-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {jc.status}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1 text-slate-600">
              <p><span className="font-semibold">Order:</span> {jc.orders?.order_no || `ORD-#${jc.order_id}`}</p>
              <p><span className="font-semibold">Quantity:</span> {jc.quantity} pcs</p>
              <p><span className="font-semibold">PO Action:</span> {jc.po_handler_action}</p>
              {jc.po_handler_reason && (
                <p className="text-rose-600 font-medium"><span className="font-semibold">Reason:</span> {jc.po_handler_reason}</p>
              )}
            </div>

            {/* Inline Barcode Preview */}
            <div className="p-3 border border-dashed border-slate-300 rounded-xl flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2 text-slate-700 font-mono text-xs">
                <QrCode className="w-5 h-5 text-indigo-600" />
                <span>*{jc.job_card_no}*</span>
              </div>
              <button
                onClick={() => window.print()}
                className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" /> Print Label
              </button>
            </div>

            {/* Action buttons for PO Handler */}
            {jc.po_handler_action === 'Pending' && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setSelectedCard(jc); setActionType('Accept'); setShowActionModal(true); }}
                  className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" /> Accept
                </button>
                <button
                  onClick={() => { setSelectedCard(jc); setActionType('Hold'); setShowActionModal(true); }}
                  className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-xs"
                >
                  <Pause className="w-3.5 h-3.5" /> Hold
                </button>
                <button
                  onClick={() => { setSelectedCard(jc); setActionType('Reject'); setShowActionModal(true); }}
                  className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-xs"
                >
                  <X className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {jobCards.length === 0 && !loading && (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-700">No Job Cards Raised</h3>
          <p className="text-slate-500 text-sm">Click "Raise Job Card" to create factory job cards for confirmed sales orders.</p>
        </div>
      )}

      {/* PO Handler Action Modal */}
      {showActionModal && selectedCard && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-slate-900">PO Handler Action: {actionType}</h3>
            <p className="text-xs text-slate-500">Updating status for Job Card <span className="font-mono font-bold text-indigo-600">{selectedCard.job_card_no}</span></p>
            <form onSubmit={handlePOAction} className="space-y-4">
              {(actionType === 'Reject' || actionType === 'Hold') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Reason / Remarks</label>
                  <textarea
                    required
                    placeholder={`Provide reason for marking as ${actionType}...`}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                    rows={3}
                  />
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowActionModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white rounded-xl text-sm font-semibold shadow-md ${
                    actionType === 'Accept' ? 'bg-emerald-600 hover:bg-emerald-500' :
                    actionType === 'Hold' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  Confirm {actionType}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Raise Job Card Modal */}
      {showRaiseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Raise Factory Job Card</h3>
            <form onSubmit={handleRaiseJobCard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Order ID</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 1"
                  value={orderId}
                  onChange={e => setOrderId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Item Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. School Blazer - Navy"
                    value={itemName}
                    onChange={e => setItemName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Design Number</label>
                  <input
                    type="text"
                    placeholder="e.g. DNS-0012"
                    value={designNumber}
                    onChange={e => setDesignNumber(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRaiseModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm shadow-md"
                >
                  Raise Job Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
